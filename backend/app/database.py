"""
Ma'lumotlar bazasiga ulanish.

Agar .env da DATABASE_URL bo'lsa — PostgreSQL (asyncpg) ishlatiladi.
Agar bo'lmasa — local test uchun SQLite (aiosqlite) avtomatik tanlanadi.
Railway deploy qilinganda DATABASE_URL avtomatik inject qilinadi.
"""
import os
from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

load_dotenv()

_raw_url = os.getenv("DATABASE_URL", "")

# Railway muhitida ekanini aniqlash (Railway bu o'zgaruvchilarni avtomatik beradi)
_on_railway = bool(os.getenv("RAILWAY_ENVIRONMENT") or os.getenv("RAILWAY_PROJECT_ID"))

if not _raw_url:
    if _on_railway:
        # XAVFSIZLIK QULFI: Railway'da DATABASE_URL bo'lmasa, jimgina SQLite'ga
        # O'TMAYMIZ — aks holda ma'lumot konteyner bilan har deploy'da yo'qoladi.
        # Buning o'rniga ataylab xato beramiz (loglarda ko'rinadi).
        raise RuntimeError(
            "DATABASE_URL o'rnatilmagan! Railway'da Postgres ulanmagan. "
            "SQLite'ga jim o'tish o'chirib qo'yilgan (ma'lumot yo'qolishining oldini olish uchun). "
            "Railway -> smartup xizmati -> Variables ga DATABASE_URL qo'shing."
        )
    # Faqat lokal dev: SQLite fayl (backend/ papkasida simkarta.db yaratiladi)
    DATABASE_URL = "sqlite+aiosqlite:///./simkarta.db"
    IS_SQLITE = True
elif _raw_url.startswith("postgres://"):
    # Railway eski format: postgres:// → postgresql+asyncpg://
    DATABASE_URL = _raw_url.replace("postgres://", "postgresql+asyncpg://", 1)
    IS_SQLITE = False
elif _raw_url.startswith("postgresql://"):
    # Standart format: postgresql:// → postgresql+asyncpg://
    DATABASE_URL = _raw_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    IS_SQLITE = False
else:
    DATABASE_URL = _raw_url
    IS_SQLITE = False

# SQLite uchun check_same_thread=False kerak, PostgreSQL uchun shart emas
_connect_args = {"check_same_thread": False} if IS_SQLITE else {}

engine = create_async_engine(
    DATABASE_URL,
    echo=False,          # True qilsangiz SQL loglarni ko'rasiz (debug)
    connect_args=_connect_args,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    pass


async def get_db():
    """FastAPI dependency — har request uchun alohida session beradi."""
    async with AsyncSessionLocal() as session:
        yield session
