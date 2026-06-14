"""
Auth router — /auth/login va /auth/me endpointlari.

/auth/login  → telefon + parol → JWT token (7 kun)
/auth/me     → token orqali o'z profilini olish
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from ..database import get_db
from ..models import User
from ..schemas import LoginRequest, TokenResponse, UserResponse
from ..auth import verify_password, create_access_token
from ..deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=TokenResponse, summary="Kirish")
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Telefon raqam va parol bilan kirish.
    Muvaffaqiyatli bo'lsa JWT access token qaytaradi.
    """
    result = await db.execute(select(User).where(User.phone == body.phone))
    user = result.scalar_one_or_none()

    # Xavfsizlik: foydalanuvchi topilmasa ham "noto'g'ri parol" deymiz
    # (username enumeration hujumining oldini olish)
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Telefon yoki parol noto'g'ri",
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Akkaunt faol emas. Admin bilan bog'laning",
        )

    token = create_access_token(user.id, user.role)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserResponse, summary="O'z profilim")
async def me(current_user: User = Depends(get_current_user)):
    """Tokendan aniqlangan foydalanuvchi ma'lumotlarini qaytaradi."""
    return current_user
