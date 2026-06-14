"""
Umumiy yordamchi funksiyalar.

haversine_meters: GPS koordinatalar orasidagi masofani metrda hisoblaydi.
write_log:        Activity log ga yozadi (commit router tomonidan qilinadi).
"""
import math
from sqlalchemy.ext.asyncio import AsyncSession
from .models import ActivityLog

OPERATORS = ["beeline", "ucell", "uzmobile", "mobiuz", "oq"]
GPS_LIMIT_METERS = 100  # tochkadan ruxsat etilgan maksimal masofa


def haversine_meters(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """
    Ikki GPS nuqta orasidagi masofani metrda hisoblash.
    Yer sharini R=6371 km deb oladi (Haversine formulasi).
    """
    R = 6_371_000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlam = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlam / 2) ** 2
    return 2 * R * math.asin(math.sqrt(a))


async def write_log(db: AsyncSession, user_id: str, event_type: str, text: str) -> None:
    """
    Activity log jadvaliga yozuv qo'shish.
    Commit router ichida bajariladi — bu funksiya faqat session ga qo'shadi.
    """
    db.add(ActivityLog(user_id=user_id, type=event_type, text=text))
