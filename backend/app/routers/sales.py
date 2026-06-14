"""
Sotuvlar — tochkadan yoki offisdan.

POST /sales/point  — tochkadagi qoldiqdan sotish (seller)
POST /sales/office — o'z zaxirasidan (offisda) sotish (seller)
GET  /sales/me     — o'zim amalga oshirgan sotuvlar

MUHIM (REJA 1.md 3.3):
- Tochkadan sotishda point_stock dan ayiriladi
- Offisda sotishda seller.stock dan ayiriladi
- Yetarli simkarta yo'q bo'lsa → 400
"""
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..models import User, Stock, Point, PointStock, Sale
from ..schemas import SalePointRequest, SaleOfficeRequest, SaleResponse, SaleDetailResponse
from ..deps import get_current_user, require_role
from ..utils import OPERATORS, write_log

router = APIRouter(prefix="/sales", tags=["sales"])


@router.post("/point", response_model=SaleResponse, status_code=status.HTTP_201_CREATED)
async def sell_from_point(
    body: SalePointRequest,
    db: AsyncSession = Depends(get_db),
    seller: User = Depends(require_role("seller", "agent")),
):
    """
    Tochkadagi qoldiqdan bir dona simkarta sotish.
    point_stock.qty >= 1 bo'lishi shart.
    """
    if body.operator not in OPERATORS:
        raise HTTPException(status_code=400, detail=f"Noto'g'ri operator. Mumkinlar: {OPERATORS}")

    # Tochka mavjudligini tekshirish
    point_result = await db.execute(select(Point).where(Point.id == body.point_id))
    point = point_result.scalar_one_or_none()
    if not point:
        raise HTTPException(status_code=404, detail="Tochka topilmadi")

    # Tochkadagi qoldiq tekshirish
    ps_result = await db.execute(
        select(PointStock).where(
            PointStock.point_id == body.point_id,
            PointStock.operator == body.operator,
        )
    )
    ps = ps_result.scalar_one_or_none()
    if not ps or ps.qty < 1:
        raise HTTPException(
            status_code=400,
            detail=f"Tochkada {body.operator} simkartasi yo'q",
        )

    # Sotish: tochka qoldiqdan ayirish
    ps.qty -= 1

    sale = Sale(
        seller_id=seller.id,
        operator=body.operator,
        source="point",
        point_id=body.point_id,
    )
    db.add(sale)

    await write_log(
        db, seller.id, "sale",
        f"Tochkadan sotildi: {body.operator} | tochka: '{point.name}'",
    )

    await db.commit()
    await db.refresh(sale)
    return sale


@router.post("/office", response_model=SaleResponse, status_code=status.HTTP_201_CREATED)
async def sell_from_office(
    body: SaleOfficeRequest,
    db: AsyncSession = Depends(get_db),
    seller: User = Depends(require_role("seller", "agent")),
):
    """
    Sotuvchining o'z zaxirasidan (offisda) bir dona simkarta sotish.
    seller.stock[operator].qty >= 1 bo'lishi shart.
    """
    if body.operator not in OPERATORS:
        raise HTTPException(status_code=400, detail=f"Noto'g'ri operator. Mumkinlar: {OPERATORS}")

    # Sotuvchi zaxirasini tekshirish
    stock_result = await db.execute(
        select(Stock).where(Stock.user_id == seller.id, Stock.operator == body.operator)
    )
    s = stock_result.scalar_one_or_none()
    if not s or s.qty < 1:
        raise HTTPException(
            status_code=400,
            detail=f"Sizning zaxirangizda {body.operator} simkartasi yo'q",
        )

    # Sotish: zaxiradan ayirish
    s.qty -= 1

    sale = Sale(
        seller_id=seller.id,
        operator=body.operator,
        source="office",
        point_id=None,
    )
    db.add(sale)

    await write_log(
        db, seller.id, "sale",
        f"Offisda sotildi: {body.operator}",
    )

    await db.commit()
    await db.refresh(sale)
    return sale


@router.get("/me", response_model=list[SaleDetailResponse])
async def my_sales(
    limit: int = Query(default=200, le=500),
    date_from: str | None = None,
    date_to: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """O'zim amalga oshirgan sotuvlar (tochka nomi bilan). Sana filtri: date_from/date_to."""
    q = (
        select(Sale, Point.name)
        .outerjoin(Point, Sale.point_id == Point.id)
        .where(Sale.seller_id == current_user.id)
    )
    if date_from:
        q = q.where(Sale.created_at >= datetime.fromisoformat(date_from).replace(tzinfo=timezone.utc))
    if date_to:
        q = q.where(Sale.created_at < datetime.fromisoformat(date_to).replace(tzinfo=timezone.utc) + timedelta(days=1))
    q = q.order_by(Sale.created_at.desc()).limit(limit)
    rows = (await db.execute(q)).all()
    return [
        SaleDetailResponse(
            id=s.id, seller_id=s.seller_id, seller_name=None,
            operator=s.operator, source=s.source,
            point_id=s.point_id, point_name=point_name,
            created_at=s.created_at,
        )
        for s, point_name in rows
    ]


@router.get("", response_model=list[SaleDetailResponse])
async def all_sales(
    limit: int = Query(default=500, le=2000),
    date_from: str | None = None,
    date_to: str | None = None,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_role("admin")),
):
    """Barcha sotuvlar (admin uchun), sana filtri bilan."""
    q = (
        select(Sale, User.full_name, Point.name)
        .join(User, Sale.seller_id == User.id)
        .outerjoin(Point, Sale.point_id == Point.id)
    )
    if date_from:
        q = q.where(Sale.created_at >= datetime.fromisoformat(date_from).replace(tzinfo=timezone.utc))
    if date_to:
        q = q.where(Sale.created_at < datetime.fromisoformat(date_to).replace(tzinfo=timezone.utc) + timedelta(days=1))
    q = q.order_by(Sale.created_at.desc()).limit(limit)

    rows = (await db.execute(q)).all()
    return [
        SaleDetailResponse(
            id=s.id, seller_id=s.seller_id, seller_name=seller_name,
            operator=s.operator, source=s.source,
            point_id=s.point_id, point_name=point_name,
            created_at=s.created_at,
        )
        for s, seller_name, point_name in rows
    ]
