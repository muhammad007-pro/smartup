"""
Analitika va reyting endpoint'lari (admin uchun).

GET /analytics/ratings — sotuvchilar, agentlar, tochkalar reytingi
"""
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from ..database import get_db
from ..models import User, Point, Sale
from ..schemas import RatingEntry, RatingsResponse
from ..deps import require_role

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/ratings", response_model=RatingsResponse)
async def get_ratings(
    date_from: str | None = None,
    date_to: str | None = None,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_role("admin", "seller")),
):
    """
    Sotuvchilar, agentlar va tochkalar reytingi.
    Sana filtri: date_from / date_to (YYYY-MM-DD).
    Hammasi 'eng ko'p sotuv soni' bo'yicha kamayish tartibida.
    """
    def apply_date(q, col):
        if date_from:
            q = q.where(col >= datetime.fromisoformat(date_from).replace(tzinfo=timezone.utc))
        if date_to:
            q = q.where(col < datetime.fromisoformat(date_to).replace(tzinfo=timezone.utc) + timedelta(days=1))
        return q

    # --- Sotuvchilar reytingi ---
    sellers_q = (
        select(User.id, User.full_name, func.count(Sale.id).label("cnt"))
        .join(Sale, Sale.seller_id == User.id)
        .where(User.role == "seller")
        .group_by(User.id, User.full_name)
        .order_by(func.count(Sale.id).desc())
        .limit(20)
    )
    sellers_q = apply_date(sellers_q, Sale.created_at)
    sellers_rows = (await db.execute(sellers_q)).all()

    # --- Agentlar reytingi (agent ochiln tochkalardagi jami sotuvlar) ---
    agents_q = (
        select(User.id, User.full_name, func.count(Sale.id).label("cnt"))
        .join(Point, Point.agent_id == User.id)
        .join(Sale, Sale.point_id == Point.id)
        .where(User.role == "agent")
        .group_by(User.id, User.full_name)
        .order_by(func.count(Sale.id).desc())
        .limit(20)
    )
    agents_q = apply_date(agents_q, Sale.created_at)
    agents_rows = (await db.execute(agents_q)).all()

    # --- Tochkalar reytingi ---
    points_q = (
        select(Point.id, Point.name, func.count(Sale.id).label("cnt"))
        .join(Sale, Sale.point_id == Point.id)
        .where(Point.is_archived == False)  # noqa: E712
        .group_by(Point.id, Point.name)
        .order_by(func.count(Sale.id).desc())
        .limit(20)
    )
    points_q = apply_date(points_q, Sale.created_at)
    points_rows = (await db.execute(points_q)).all()

    return RatingsResponse(
        sellers=[RatingEntry(id=r.id, name=r.full_name, count=r.cnt) for r in sellers_rows],
        agents=[RatingEntry(id=r.id, name=r.full_name, count=r.cnt) for r in agents_rows],
        points=[RatingEntry(id=r.id, name=r.name, count=r.cnt) for r in points_rows],
    )
