"""
Test foydalanuvchilarni bazaga qo'shish uchun bir martalik script.

Ishlatish (Railway DATABASE_URL bilan):
    cd backend
    $env:DATABASE_URL="postgresql+asyncpg://..."   # PowerShell
    python seed.py
"""
import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal, engine, Base
from app.models import User, Stock
from app.auth import hash_password

OPERATORS = ["beeline", "ucell", "uzmobile", "mobiuz", "oq"]

USERS = [
    {"full_name": "Bosh Admin",  "phone": "+998949974770", "password": "1234", "role": "admin"},
    {"full_name": "Dilshod aka", "phone": "+998900000001", "password": "1234", "role": "agent"},
    {"full_name": "Rahmonali",   "phone": "+998900000002", "password": "1234", "role": "seller"},
]


async def main():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        for u in USERS:
            existing = await db.execute(select(User).where(User.phone == u["phone"]))
            if existing.scalar_one_or_none():
                print(f"Allaqachon mavjud: {u['phone']} ({u['role']})")
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

            print(f"Yaratildi: {u['full_name']} | {u['phone']} | {u['role']}")

        await db.commit()
        print("\nSeed tugadi!")


if __name__ == "__main__":
    asyncio.run(main())
