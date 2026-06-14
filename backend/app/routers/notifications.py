"""
Bildirishnomalar (admin uchun).

GET  /notifications              — barcha bildirishnomalar (admin)
GET  /notifications/unread_count — o'qilmagan soni (admin)
POST /notifications/{id}/read    — o'qilgan deb belgilash (admin)
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from ..database import get_db
from ..models import Notification, User
from ..schemas import NotificationResponse
from ..deps import require_role

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationResponse])
async def list_notifications(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_role("admin")),
):
    result = await db.execute(
        select(Notification, User.full_name)
        .join(User, Notification.actor_id == User.id)
        .order_by(Notification.created_at.desc())
        .limit(100)
    )
    return [
        NotificationResponse(
            id=n.id,
            type=n.type,
            title=n.title,
            body=n.body,
            is_read=n.is_read,
            actor_id=n.actor_id,
            actor_name=name,
            point_id=n.point_id,
            created_at=n.created_at,
        )
        for n, name in result.all()
    ]


@router.get("/unread_count")
async def unread_count(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_role("admin")),
):
    count = await db.scalar(
        select(func.count())
        .select_from(Notification)
        .where(Notification.is_read == False)  # noqa: E712
    ) or 0
    return {"count": count}


@router.post("/{notification_id}/read")
async def mark_read(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_role("admin")),
):
    result = await db.execute(
        select(Notification).where(Notification.id == notification_id)
    )
    notif = result.scalar_one_or_none()
    if notif:
        notif.is_read = True
        await db.commit()
    return {"ok": True}


@router.post("/read_all")
async def mark_all_read(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_role("admin")),
):
    result = await db.execute(
        select(Notification).where(Notification.is_read == False)  # noqa: E712
    )
    for notif in result.scalars().all():
        notif.is_read = True
    await db.commit()
    return {"ok": True}
