"""
56 tochkani (va foydalanuvchi/stock/sotuvlarni) backupdan yangi Postgres bazaga
ko'chirish uchun BIR MARTALIK tiklash skripti.

SABAB: smartup xizmati DATABASE_URL'siz ishlаб, ma'lumotni vaqtinchalik
konteyner ichidagi SQLite'ga yozgan. Konteyner almashganda ma'lumot o'chgan.
Bu skript backups/ papkasidagi JSON nusxalardan bazani qayta tiklaydi.

ISHLATISH (yangi Postgres URL bilan, LOKAL kompyuterdan):
    cd backend
    # PowerShell:
    $env:DATABASE_URL="postgresql://user:pass@host:5432/dbname"
    python restore_from_backup.py

MUHIM:
- IDlar va sanalar AYNAN saqlanadi (tochka<->agent<->sotuv bog'lanishi buzilmaydi).
- API parol-hashlarini bermaydi, shuning uchun yangi foydalanuvchilarga
  vaqtinchalik parol (TEMP_PASSWORD) beriladi. Admin keyin paneldan o'zgartiradi.
- Idempotent: qayta ishga tushirilsa, mavjud yozuvlarni qayta yaratmaydi.
- DATABASE_URL o'rnatilmagan bo'lsa, ISHLAMAYDI (SQLite'ga tasodifan yozmaslik uchun).
"""
import asyncio
import json
import os
from datetime import datetime, timezone
from pathlib import Path

from sqlalchemy import select

from app.database import engine, AsyncSessionLocal, Base, IS_SQLITE
from app.models import User, Stock, Point, PointStock, Sale
from app.auth import hash_password

# Yangi foydalanuvchilar uchun vaqtinchalik parol (admin keyin o'zgartiradi)
TEMP_PASSWORD = "1234"

BACKUP_DIR = Path(__file__).parent.parent / "backups"


def _dt(s: str | None) -> datetime:
    """ISO sanani UTC tzinfo bilan qaytaradi."""
    if not s:
        return datetime.now(timezone.utc)
    d = datetime.fromisoformat(s)
    return d.replace(tzinfo=timezone.utc) if d.tzinfo is None else d


def _load(name: str):
    path = BACKUP_DIR / name
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


async def main():
    if not os.getenv("DATABASE_URL") or IS_SQLITE:
        print("XATO: DATABASE_URL o'rnatilmagan (yoki SQLite tanlangan).")
        print("Yangi Postgres URL'ini o'rnating, keyin qayta ishga tushiring:")
        print('  $env:DATABASE_URL="postgresql://user:pass@host:5432/dbname"')
        return

    users_data = _load("stock.json")      # foydalanuvchilar + stock
    points_data = _load("points.json")    # tochkalar + point_stock
    sales_data = _load("sales.json").get("items", [])

    print(f"Yuklangan: {len(users_data)} user, {len(points_data)} tochka, {len(sales_data)} sotuv")

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    created = {"users": 0, "stock": 0, "points": 0, "point_stock": 0, "sales": 0}

    async with AsyncSessionLocal() as db:
        # --- Foydalanuvchilar + stock ---
        for u in users_data:
            exists = await db.get(User, u["id"])
            if exists:
                continue
            db.add(User(
                id=u["id"],
                full_name=u["full_name"],
                phone=u["phone"],
                password_hash=hash_password(TEMP_PASSWORD),
                role=u["role"],
                is_active=u.get("is_active", True),
            ))
            created["users"] += 1
            for s in u.get("stock", []):
                db.add(Stock(user_id=u["id"], operator=s["operator"], qty=s["qty"]))
                created["stock"] += 1
        await db.flush()

        # --- Tochkalar + point_stock ---
        for p in points_data:
            exists = await db.get(Point, p["id"])
            if exists:
                continue
            db.add(Point(
                id=p["id"],
                agent_id=p["agent_id"],
                name=p["name"],
                location=p["location"],
                lat=p.get("lat"),
                lng=p.get("lng"),
                photo_outside=p.get("photo_outside"),
                photo_inside=p.get("photo_inside"),
                photo_ad=p.get("photo_ad"),
                phone=p.get("phone"),
                is_archived=p.get("is_archived", False),
                created_at=_dt(p.get("created_at")),
                updated_at=_dt(p.get("updated_at")),
            ))
            created["points"] += 1
            for ps in p.get("point_stock", []):
                db.add(PointStock(point_id=p["id"], operator=ps["operator"], qty=ps["qty"]))
                created["point_stock"] += 1
        await db.flush()

        # --- Sotuvlar ---
        for s in sales_data:
            exists = await db.get(Sale, s["id"])
            if exists:
                continue
            db.add(Sale(
                id=s["id"],
                seller_id=s["seller_id"],
                operator=s["operator"],
                source=s["source"],
                point_id=s.get("point_id"),
                created_at=_dt(s.get("created_at")),
            ))
            created["sales"] += 1

        await db.commit()

    print("\nTiklash tugadi:")
    for k, v in created.items():
        print(f"  {k}: +{v}")
    print(f"\nYangi foydalanuvchilar paroli: '{TEMP_PASSWORD}' (admin paneldan o'zgartiring)")


if __name__ == "__main__":
    asyncio.run(main())
