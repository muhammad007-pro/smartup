"""
Simkarta zaxirasi (ombor) boshqaruvi.

GET  /stock/me    — o'z zaxiram (agent/sotuvchi)
GET  /stock/all   — barcha hodimlarning zaxirasi (admin)
POST /stock/issue — hodimga simkarta berish (admin)
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..models import User, Stock, Issue
from ..schemas import StockEntry, StockResponse, UserWithStock, IssueRequest, IssueResponse, StockReduceRequest, StockReduceResponse
from ..deps import get_current_user, require_role
from ..utils import OPERATORS, write_log

router = APIRouter(prefix="/stock", tags=["stock"])


@router.get("/me", response_model=StockResponse)
async def my_stock(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """O'z simkarta zaxiram (barcha operatorlar bo'yicha)."""
    result = await db.execute(
        select(Stock).where(Stock.user_id == current_user.id).order_by(Stock.operator)
    )
    items = result.scalars().all()
    return StockResponse(
        user_id=current_user.id,
        items=[StockEntry(operator=s.operator, qty=s.qty) for s in items],
    )


@router.get("/all", response_model=list[UserWithStock])
async def all_stock(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_role("admin")),
):
    """Barcha hodimlarning zaxirasi — adminning asosiy ko'rinishi."""
    result = await db.execute(
        select(User)
        .where(User.role != "admin")
        .options(selectinload(User.stock))
        .order_by(User.full_name)
    )
    users = result.scalars().all()
    return [
        UserWithStock(
            id=u.id,
            full_name=u.full_name,
            phone=u.phone,
            role=u.role,
            is_active=u.is_active,
            stock=[StockEntry(operator=s.operator, qty=s.qty) for s in u.stock],
        )
        for u in users
    ]


@router.post("/issue", response_model=IssueResponse, status_code=status.HTTP_201_CREATED)
async def issue_stock(
    body: IssueRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    """
    Admin hodimga simkarta beradi.
    - to_user_id: qaysi hodimga
    - operator: qaysi operator (beeline/ucell/...)
    - qty: nechta

    Hodimning stock jadvalidagi qatori qty qo'shilib yangilanadi.
    Issues jadvaliga tarix yoziladi.
    """
    if body.qty <= 0:
        raise HTTPException(status_code=400, detail="Miqdor 0 dan katta bo'lishi kerak")
    if body.operator not in OPERATORS:
        raise HTTPException(status_code=400, detail=f"Noto'g'ri operator. Mumkinlar: {OPERATORS}")

    # Qabul qiluvchini topish
    to_user_result = await db.execute(select(User).where(User.id == body.to_user_id))
    to_user = to_user_result.scalar_one_or_none()
    if not to_user:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")
    if to_user.role == "admin":
        raise HTTPException(status_code=400, detail="Adminga simkarta berish mumkin emas")
    if not to_user.is_active:
        raise HTTPException(status_code=400, detail="Faol bo'lmagan foydalanuvchiga berish mumkin emas")

    # Stock upsert: qator bor bo'lsa qty qo'shiladi, yo'q bo'lsa yangi qator
    stock_result = await db.execute(
        select(Stock).where(Stock.user_id == body.to_user_id, Stock.operator == body.operator)
    )
    stock = stock_result.scalar_one_or_none()
    if stock:
        stock.qty += body.qty
    else:
        db.add(Stock(user_id=body.to_user_id, operator=body.operator, qty=body.qty))

    # Tarix yozuvi
    issue = Issue(to_user_id=body.to_user_id, operator=body.operator, qty=body.qty)
    db.add(issue)

    await write_log(
        db, admin.id, "issue",
        f"{admin.full_name} berdi {to_user.full_name}ga: {body.operator} x{body.qty}",
    )

    await db.commit()
    await db.refresh(issue)
    return issue


@router.post("/reduce", response_model=StockReduceResponse, status_code=200)
async def reduce_stock(
    body: StockReduceRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(require_role("admin")),
):
    """Admin hodimdan simkarta oladi (kamaytiradi). Faqat admin."""
    if body.qty <= 0:
        raise HTTPException(status_code=400, detail="Miqdor 0 dan katta bo'lishi kerak")
    if body.operator not in OPERATORS:
        raise HTTPException(status_code=400, detail=f"Noto'g'ri operator. Mumkinlar: {OPERATORS}")

    to_user_result = await db.execute(select(User).where(User.id == body.to_user_id))
    to_user = to_user_result.scalar_one_or_none()
    if not to_user:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")

    stock_result = await db.execute(
        select(Stock).where(Stock.user_id == body.to_user_id, Stock.operator == body.operator)
    )
    stock = stock_result.scalar_one_or_none()
    current = stock.qty if stock else 0

    if current < body.qty:
        raise HTTPException(
            status_code=400,
            detail=f"Yetarli emas: {to_user.full_name}da {body.operator} dan {current} ta mavjud",
        )

    stock.qty -= body.qty

    await write_log(
        db, admin.id, "stock_reduce",
        f"{admin.full_name} {to_user.full_name}dan oldi: {body.operator} x{body.qty} (qoldi: {stock.qty})",
    )

    await db.commit()
    return StockReduceResponse(
        user_id=to_user.id,
        operator=body.operator,
        qty_removed=body.qty,
        qty_remaining=stock.qty,
    )
