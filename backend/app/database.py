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

if not _raw_url:
    # Local test: SQLite fayl (backend/ papkasida simkarta.db yaratiladi)
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
