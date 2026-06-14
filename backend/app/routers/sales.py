"""
Sotuvlar — tochkadan yoki offisdan.

POST /sales/point  — tochkadagi qoldiqdan sotish
POST /sales/office — o'z zaxirasidan sotish
GET  /sales/me     — o'zim amalga oshirgan sotuvlar (paginated)
GET  /sales        — barcha sotuvlar (admin, paginated)
"""
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from ..database import get_db
from ..models import User, Stock, Point, PointStock, Sale
from ..schemas import (
    SalePointRequest, SaleOfficeRequest, SaleResponse,
    SaleDetailResponse, PagedSalesResponse,
)
from ..deps import get_current_user, require_role
from ..utils import OPERATORS, write_log

router = APIRouter(prefix="/sales", tags=["sales"])

PAGE_SIZE = 25


@router.post("/point", response_model=SaleResponse, status_code=status.HTTP_201_CREATED)
async def sell_from_point(
    body: SalePointRequest,
    db: AsyncSession = Depends(get_db),
    seller: User = Depends(require_role("seller", "agent")),
):
    if body.operator not in OPERATORS:
        raise HTTPException(status_code=400, detail=f"Noto'g'ri operator")

    point_result = await db.execute(select(Point).where(Point.id == body.point_id))
    point = point_result.scalar_one_or_none()
    if not point:
        raise HTTPException(status_code=404, detail="Tochka topilmadi")

    ps_result = await db.execute(
        select(PointStock).where(
            PointStock.point_id == body.point_id,
            PointStock.operator == body.operator,
        )
    )
    ps = ps_result.scalar_one_or_none()
    if not ps or ps.qty < 1:
        raise HTTPException(status_code=400, detail=f"Tochkada {body.operator} simkartasi yo'q")

    ps.qty -= 1
    sale = Sale(seller_id=seller.id, operator=body.operator, source="point", point_id=body.point_id)
    db.add(sale)
    await write_log(db, seller.id, "sale", f"Tochkadan sotildi: {body.operator} | '{point.name}'")
    await db.commit()
    await db.refresh(sale)
    return sale


@router.post("/office", response_model=SaleResponse, status_code=status.HTTP_201_CREATED)
async def sell_from_office(
    body: SaleOfficeRequest,
    db: AsyncSession = Depends(get_db),
    seller: User = Depends(require_role("seller", "agent")),
):
    if body.operator not in OPERATORS:
        raise HTTPException(status_code=400, detail=f"Noto'g'ri operator")

    stock_result = await db.execute(
        select(Stock).where(Stock.user_id == seller.id, Stock.operator == body.operator)
    )
    s = stock_result.scalar_one_or_none()
    if not s or s.qty < 1:
        raise HTTPException(status_code=400, detail=f"Zaxirangizda {body.operator} yo'q")

    s.qty -= 1
    sale = Sale(seller_id=seller.id, operator=body.operator, source="office", point_id=None)
    db.add(sale)
    await write_log(db, seller.id, "sale", f"Offisda sotildi: {body.operator}")
    await db.commit()
    await db.refresh(sale)
    return sale


@router.get("/me", response_model=PagedSalesResponse)
async def my_sales(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=PAGE_SIZE, le=100),
    date_from: str | None = None,
    date_to: str | None = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    base = (
        select(Sale, Point.name)
        .outerjoin(Point, Sale.point_id == Point.id)
        .where(Sale.seller_id == current_user.id)
    )
    if date_from:
        base = base.where(Sale.created_at >= datetime.fromisoformat(date_from).replace(tzinfo=timezone.utc))
    if date_to:
        base = base.where(Sale.created_at < datetime.fromisoformat(date_to).replace(tzinfo=timezone.utc) + timedelta(days=1))

    total = await db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = (await db.execute(base.order_by(Sale.created_at.desc()).offset(skip).limit(limit))).all()

    return PagedSalesResponse(
        items=[
            SaleDetailResponse(
                id=s.id, seller_id=s.seller_id, seller_name=None,
                operator=s.operator, source=s.source,
                point_id=s.point_id, point_name=point_name,
                created_at=s.created_at,
            )
            for s, point_name in rows
        ],
        total=total,
        has_more=(skip + limit) < total,
    )


@router.get("", response_model=PagedSalesResponse)
async def all_sales(
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=PAGE_SIZE, le=100),
    date_from: str | None = None,
    date_to: str | None = None,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_role("admin")),
):
    base = (
        select(Sale, User.full_name, Point.name)
        .join(User, Sale.seller_id == User.id)
        .outerjoin(Point, Sale.point_id == Point.id)
    )
    if date_from:
        base = base.where(Sale.created_at >= datetime.fromisoformat(date_from).replace(tzinfo=timezone.utc))
    if date_to:
        base = base.where(Sale.created_at < datetime.fromisoformat(date_to).replace(tzinfo=timezone.utc) + timedelta(days=1))

    total = await db.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = (await db.execute(base.order_by(Sale.created_at.desc()).offset(skip).limit(limit))).all()

    return PagedSalesResponse(
        items=[
            SaleDetailResponse(
                id=s.id, seller_id=s.seller_id, seller_name=seller_name,
                operator=s.operator, source=s.source,
                point_id=s.point_id, point_name=point_name,
                created_at=s.created_at,
            )
            for s, seller_name, point_name in rows
        ],
        total=total,
        has_more=(skip + limit) < total,
    )
