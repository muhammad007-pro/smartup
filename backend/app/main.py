"""
SimKarta FastAPI ilovasi — kirish nuqtasi.

Startup da baza jadvallarini avtomatik yaratadi.
Har bosqichda yangi router import qilinib qo'shiladi.
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from .database import engine, Base, IS_SQLITE
from .routers import auth, users, stock, points, sales, admin


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
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


@app.get("/", tags=["health"])
async def root():
    db_type = "SQLite (local)" if IS_SQLITE else "PostgreSQL (Railway)"
    return {"status": "ok", "app": "SimKarta API v0.2", "database": db_type}
