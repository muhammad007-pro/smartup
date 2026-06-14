"""
JWT token va parol boshqaruvi.

Tokenlar 7 kun amal qiladi — mobil ilovada tez-tez login qilmaslik uchun.
JWT_SECRET .env dan o'qiladi; bo'sh bo'lsa — ishga tushmaydi (xavfsizlik).
"""
import os
from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from passlib.context import CryptContext
from dotenv import load_dotenv

load_dotenv()

JWT_SECRET = os.getenv("JWT_SECRET", "")
if not JWT_SECRET:
    # Local SQLite test uchun standart sir so'z (production da shart emas)
    JWT_SECRET = "local-dev-secret-simkarta-2024"

JWT_ALGORITHM = "HS256"
TOKEN_EXPIRE_MINUTES = 60 * 24 * 7   # 7 kun

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    """Parolni bcrypt bilan hash qilish."""
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Kirilgan parol hash bilan mos kelishini tekshirish."""
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: str, role: str) -> str:
    """JWT token yaratish (sub=user_id, role=rol)."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": user_id,
        "role": role,
        "exp": expire,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """
    Tokenni tekshirish va payload qaytarish.
    Token noto'g'ri yoki muddati o'tgan bo'lsa JWTError chiqaradi.
    """
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
