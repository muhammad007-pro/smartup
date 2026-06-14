"""
FastAPI dependency injection — har endpoint uchun umumiy bog'liqliklar.

get_current_user: Authorization header dan token o'qib, foydalanuvchini qaytaradi.
require_role:     Ruxsatsiz rollarga 403 qaytaradi. Misol:
                  Depends(require_role("admin"))
                  Depends(require_role("admin", "agent"))
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from .database import get_db
from .models import User
from .auth import decode_token

_bearer = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(_bearer),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Bearer tokendan foydalanuvchini aniqlash.
    Token noto'g'ri, foydalanuvchi topilmagan yoki faol bo'lmagan — 401.
    """
    try:
        payload = decode_token(credentials.credentials)
        user_id: str = payload["sub"]
    except (JWTError, KeyError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token noto'g'ri yoki muddati o'tgan",
        )

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Foydalanuvchi topilmadi")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Akkaunt o'chirilgan")

    return user


def require_role(*roles: str):
    """
    Faqat ko'rsatilgan rollarga ruxsat beruvchi dependency factory.

    Misol:
        @router.get("/admin-only")
        async def view(user: User = Depends(require_role("admin"))):
            ...
    """
    async def _check(user: User = Depends(get_current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Bu amal uchun ruxsat yo'q. Kerakli rol: {', '.join(roles)}",
            )
        return user
    return _check
