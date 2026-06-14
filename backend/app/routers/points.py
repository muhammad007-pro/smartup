"""
Tochkalar (do'konlar) boshqaruvi.

GET   /points      — barcha tochkalar + stock (hammaga)
POST  /points      — yangi tochka ochish (agent)
PATCH /points/{id} — tochkani yangilash (agent, GPS qulfi bilan)

MUHIM QOIDALAR (REJA 1.md 3.3):
- POST: agent zaxirasida yetarli simkarta bo'lishi shart
- PATCH: server Haversine formulasi bilan GPS tekshiradi (> 100 m → 403)
- Agent simkartani faqat qo'sha oladi (minus qilolmaydi)
- Hamma tekshiruv server tomonda — mobil ilovaga ishonilmaydi
"""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..models import User, Stock, Point, PointStock
from ..schemas import (
    PointCreate, PointUpdate, PointResponse, PointWithStock, StockEntry,
)
from ..deps import get_current_user, require_role
from ..utils import haversine_meters, write_log, GPS_LIMIT_METERS

router = APIRouter(prefix="/points", tags=["points"])


def _point_to_schema(p: Point) -> PointWithStock:
    return PointWithStock(
        id=p.id,
        agent_id=p.agent_id,
        name=p.name,
        location=p.location,
        lat=p.lat,
        lng=p.lng,
        photo_outside=p.photo_outside,
        photo_inside=p.photo_inside,
        photo_ad=p.photo_ad,
        created_at=p.created_at,
        updated_at=p.updated_at,
        point_stock=[StockEntry(operator=ps.operator, qty=ps.qty) for ps in p.point_stock],
    )


@router.get("", response_model=list[PointWithStock])
async def list_points(
    db: AsyncSession = Depends(get_db),
    _user: User = Depends(get_current_user),
):
    """Barcha tochkalar (GPS koordinatalar va stock bilan). Hamma rol ko'ra oladi."""
    result = await db.execute(
        select(Point)
        .options(selectinload(Point.point_stock))
        .order_by(Point.created_at.desc())
    )
    points = result.scalars().all()
    return [_point_to_schema(p) for p in points]


@router.post("", response_model=PointResponse, status_code=status.HTTP_201_CREATED)
async def create_point(
    body: PointCreate,
    db: AsyncSession = Depends(get_db),
    agent: User = Depends(require_role("agent")),
):
    """
    Yangi tochka ochish.
    1. Agent zaxirasida yetarli simkarta borligini tekshiradi.
    2. Atomik tranzaksiya: tochka yaratiladi, agent stock dan minus, point_stock ga plus.
    3. Activity log yoziladi.
    """
    # Birinchi: barcha kerakli stock mavjudligini tekshirish
    for entry in body.stock:
        if entry.qty <= 0:
            raise HTTPException(status_code=400, detail=f"{entry.operator}: miqdor 0 dan katta bo'lishi kerak")

        stock_result = await db.execute(
            select(Stock).where(Stock.user_id == agent.id, Stock.operator == entry.operator)
        )
        s = stock_result.scalar_one_or_none()
        available = s.qty if s else 0
        if available < entry.qty:
            raise HTTPException(
                status_code=400,
                detail=f"{entry.operator}: yetarli simkarta yo'q (kerak {entry.qty}, mavjud {available})",
            )

    # Tochkani yaratish
    point = Point(
        agent_id=agent.id,
        name=body.name,
        location=body.location,
        lat=body.lat,
        lng=body.lng,
    )
    db.add(point)
    await db.flush()   # point.id tayyor bo'lsin

    # Stock transfer (agent → point)
    for entry in body.stock:
        # Agent zaxirasidan ayirish
        stock_result = await db.execute(
            select(Stock).where(Stock.user_id == agent.id, Stock.operator == entry.operator)
        )
        agent_stock = stock_result.scalar_one()
        agent_stock.qty -= entry.qty

        # Tochka zaxirasiga qo'shish
        db.add(PointStock(point_id=point.id, operator=entry.operator, qty=entry.qty))

    summary = ", ".join(f"{e.operator}:{e.qty}" for e in body.stock) if body.stock else "stock yo'q"
    await write_log(
        db, agent.id, "point_open",
        f"Yangi tochka: '{body.name}' ({body.location}) | {summary}",
    )

    await db.commit()
    await db.refresh(point)
    return point


@router.patch("/{point_id}", response_model=PointResponse)
async def update_point(
    point_id: str,
    body: PointUpdate,
    db: AsyncSession = Depends(get_db),
    agent: User = Depends(require_role("agent")),
):
    """
    Tochkani yangilash — GPS qulfi bilan.

    Server agentning hozirgi joylashuvini (current_lat/lng) tochka
    koordinatasi bilan taqqoslaydi. Masofa > 100 m bo'lsa 403 qaytariladi.
    Simkartalar faqat QOSHILADI (agent minus qilolmaydi).
    """
    # Tochkani topish
    result = await db.execute(select(Point).where(Point.id == point_id))
    point = result.scalar_one_or_none()
    if not point:
        raise HTTPException(status_code=404, detail="Tochka topilmadi")
    if point.agent_id != agent.id:
        raise HTTPException(status_code=403, detail="Bu sizning tochkangiz emas")

    # GPS qulfi: server masofani hisoblaydi
    if point.lat is not None and point.lng is not None:
        dist = haversine_meters(body.current_lat, body.current_lng, point.lat, point.lng)
        if dist > GPS_LIMIT_METERS:
            raise HTTPException(
                status_code=403,
                detail=f"Juda uzoqdasiz ({dist:.0f} m). Tochkadan {GPS_LIMIT_METERS} m ichida bo'lishingiz kerak",
            )

    # Avval barcha stock yetarliligini tekshirish
    for entry in body.stock:
        if entry.qty <= 0:
            raise HTTPException(status_code=400, detail=f"{entry.operator}: miqdor 0 dan katta bo'lishi kerak")

        stock_result = await db.execute(
            select(Stock).where(Stock.user_id == agent.id, Stock.operator == entry.operator)
        )
        s = stock_result.scalar_one_or_none()
        available = s.qty if s else 0
        if available < entry.qty:
            raise HTTPException(
                status_code=400,
                detail=f"{entry.operator}: yetarli simkarta yo'q (kerak {entry.qty}, mavjud {available})",
            )

    # Stock transferi
    for entry in body.stock:
        # Agent zaxirasidan ayirish
        stock_result = await db.execute(
            select(Stock).where(Stock.user_id == agent.id, Stock.operator == entry.operator)
        )
        agent_stock = stock_result.scalar_one()
        agent_stock.qty -= entry.qty

        # Tochkadagi qoldiqqa qo'shish (upsert)
        ps_result = await db.execute(
            select(PointStock).where(
                PointStock.point_id == point_id,
                PointStock.operator == entry.operator,
            )
        )
        ps = ps_result.scalar_one_or_none()
        if ps:
            ps.qty += entry.qty
        else:
            db.add(PointStock(point_id=point_id, operator=entry.operator, qty=entry.qty))

    # Metadata yangilash
    if body.name is not None:
        point.name = body.name
    if body.location is not None:
        point.location = body.location
    point.updated_at = datetime.now(timezone.utc)

    summary = ", ".join(f"{e.operator}:+{e.qty}" for e in body.stock) if body.stock else "stock o'zgarishsiz"
    await write_log(
        db, agent.id, "point_update",
        f"Tochka yangilandi: '{point.name}' | {summary}",
    )

    await db.commit()
    await db.refresh(point)
    return point
