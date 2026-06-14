"""
Foydalanuvchilar boshqaruvi — faqat admin uchun.

GET  /users       — barcha hodimlar ro'yxati (zaxira bilan)
POST /users       — yangi hodim qo'shish (5 ta operator uchun bo'sh stock ham yaratiladi)
PATCH /users/{id} — hodim ma'lumotlarini o'zgartirish / faolsizlashtirish
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from ..database import get_db
from ..models import User, Stock
from ..schemas import UserCreate, UserUpdate, UserResponse, UserWithStock, StockEntry
from ..auth import hash_password
from ..deps import require_role
from ..utils import OPERATORS

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserWithStock])
async def list_users(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_role("admin")),
):
    """Barcha hodimlar (admin ko'rinmaydi) — har birining zaxirasi bilan."""
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


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    body: UserCreate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_role("admin")),
):
    """Yangi agent yoki sotuvchi yaratish. Avtomatik bo'sh stock qatorlari ham qo'shiladi."""
    if body.role not in ("agent", "seller"):
        raise HTTPException(status_code=400, detail="Rol faqat 'agent' yoki 'seller' bo'lishi mumkin")

    # Telefon raqam takrorlanmasin
    existing = await db.execute(select(User).where(User.phone == body.phone))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Bu telefon raqam allaqachon ro'yxatdan o'tgan")

    user = User(
        full_name=body.full_name,
        phone=body.phone,
        password_hash=hash_password(body.password),
        role=body.role,
    )
    db.add(user)
    await db.flush()   # user.id generatsiya bo'lsin

    # Har operator uchun bo'sh stock qatori (qty=0)
    for op in OPERATORS:
        db.add(Stock(user_id=user.id, operator=op, qty=0))

    await db.commit()
    await db.refresh(user)
    return user


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    body: UserUpdate,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_role("admin")),
):
    """Hodim ma'lumotlarini o'zgartirish yoki akkauntni o'chirish/yoqish."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="Foydalanuvchi topilmadi")
    if user.role == "admin":
        raise HTTPException(status_code=403, detail="Admin ma'lumotlarini o'zgartirib bo'lmaydi")

    if body.full_name is not None:
        user.full_name = body.full_name
    if body.phone is not None:
        # Yangi telefon boshqa foydalanuvchida yo'qligini tekshirish
        clash = await db.execute(
            select(User).where(User.phone == body.phone, User.id != user_id)
        )
        if clash.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Bu telefon raqam boshqa foydalanuvchida bor")
        user.phone = body.phone
    if body.password is not None:
        user.password_hash = hash_password(body.password)
    if body.is_active is not None:
        user.is_active = body.is_active

    await db.commit()
    await db.refresh(user)
    return user
