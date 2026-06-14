"""
Birinchi admin foydalanuvchini yaratish uchun bir martalik script.

Ishlatish:
    cd backend
    python create_admin.py

Keyin bu script yana kerak bo'lmaydi — admin paneldan yangi hodimlar qo'shiladi.
"""
import asyncio
from app.database import AsyncSessionLocal, engine, Base
from app.models import User, Stock
from app.auth import hash_password

OPERATORS = ["beeline", "ucell", "uzmobile", "mobiuz", "oq"]

# --- O'zgartirishingiz mumkin ---
ADMIN_FULL_NAME = "Bosh Admin"
ADMIN_PHONE    = "+998900000000"
ADMIN_PASSWORD = "admin123"          # birinchi kirishdan keyin o'zgartiring!
# --------------------------------


async def main():
    # Jadvallar mavjud bo'lmasa yaratish
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # Avval bor-yo'qligini tekshirish
        from sqlalchemy import select
        existing = await db.execute(select(User).where(User.phone == ADMIN_PHONE))
        if existing.scalar_one_or_none():
            print(f"Admin allaqachon mavjud: {ADMIN_PHONE}")
            return

        admin = User(
            full_name=ADMIN_FULL_NAME,
            phone=ADMIN_PHONE,
            password_hash=hash_password(ADMIN_PASSWORD),
            role="admin",
        )
        db.add(admin)
        await db.flush()   # id generatsiya bo'lishi uchun

        # Admin uchun bo'sh stock qatorlari yaratish
        for op in OPERATORS:
            db.add(Stock(user_id=admin.id, operator=op, qty=0))

        await db.commit()
        print(f"Admin yaratildi!")
        print(f"  Telefon : {ADMIN_PHONE}")
        print(f"  Parol   : {ADMIN_PASSWORD}  (birinchi kirishdan keyin o'zgartiring)")
        print(f"  ID      : {admin.id}")


if __name__ == "__main__":
    asyncio.run(main())
