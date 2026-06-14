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
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from ..database import get_db
from ..models import User, Stock, Point, PointStock, Sale
from ..schemas import SalePointRequest, SaleOfficeRequest, SaleResponse
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


@router.get("/me", response_model=list[SaleResponse])
async def my_sales(
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """O'zim amalga oshirgan oxirgi sotuvlar (default: 50 ta)."""
    result = await db.execute(
        select(Sale)
        .where(Sale.seller_id == current_user.id)
        .order_by(Sale.created_at.desc())
        .limit(limit)
    )
    return result.scalars().all()
