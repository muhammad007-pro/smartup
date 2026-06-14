"""
SimKarta FastAPI ilovasi — kirish nuqtasi.

Startup da baza jadvallarini avtomatik yaratadi.
Har bosqichda yangi router import qilinib qo'shiladi.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from .database import engine, Base, IS_SQLITE
from .routers import auth, users, stock, points, sales, admin, upload, analytics, notifications, export


# Admin ma'lumotlari — har deploy'da sinxronlashtiriladi
ADMIN = {"full_name": "Bosh Admin", "phone": "+998902301646", "password": "A1414"}

SEED_USERS = [
    {"full_name": "Dilshod aka", "phone": "+998900000001", "password": "1234", "role": "agent"},
    {"full_name": "Rahmonali",   "phone": "+998900000002", "password": "1234", "role": "seller"},
]


@asynccontextmanager
async def lifespan(app: FastAPI):
    from sqlalchemy import select
    from .database import AsyncSessionLocal
    from .models import User, Stock
    from .auth import hash_password
    from .utils import OPERATORS

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # Admin: har doim telefon va parolni yangilab qo'yamiz
        result = await db.execute(select(User).where(User.role == "admin"))
        admin_user = result.scalar_one_or_none()
        if admin_user:
            admin_user.phone = ADMIN["phone"]
            admin_user.password_hash = hash_password(ADMIN["password"])
        else:
            admin_user = User(
                full_name=ADMIN["full_name"],
                phone=ADMIN["phone"],
                password_hash=hash_password(ADMIN["password"]),
                role="admin",
            )
            db.add(admin_user)
            await db.flush()
            for op in OPERATORS:
                db.add(Stock(user_id=admin_user.id, operator=op, qty=0))

        # Demo xodimlar: faqat mavjud bo'lmasa yaratiladi
        for u in SEED_USERS:
            exists = await db.execute(select(User).where(User.phone == u["phone"]))
            if exists.scalar_one_or_none():
                continue
            user = User(
                full_name=u["full_name"],
                phone=u["phone"],
                password_hash=hash_password(u["password"]),
                role=u["role"],
            )
            db.add(user)
            await db.flush()
            for op in OPERATORS:
                db.add(Stock(user_id=user.id, operator=op, qty=0))

        await db.commit()

    yield
    await engine.dispose()


app = FastAPI(
    title="SimKarta API",
    version="0.2.0",
    description="Simkarta tarqatish va sotuvni boshqarish tizimi",
    lifespan=lifespan,
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(stock.router)
app.include_router(points.router)
app.include_router(sales.router)
app.include_router(admin.router)
app.include_router(upload.router)
app.include_router(analytics.router)
app.include_router(notifications.router)
app.include_router(export.router)


@app.get("/", tags=["health"])
async def root():
    db_type = "SQLite (local)" if IS_SQLITE else "PostgreSQL (Railway)"
    return {"status": "ok", "app": "SimKarta API v0.2", "database": db_type}
