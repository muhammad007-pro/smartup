"""
Admin paneli — statistika va harakatlar tarixi.

GET /dashboard — umumiy ko'rsatkichlar
GET /logs      — harakatlar tarixi (oxirgi 100 ta)
"""
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, cast, Date

from ..database import get_db
from ..models import User, Stock, Point, Sale, ActivityLog
from ..schemas import DashboardResponse, LogEntry, SalesByDayEntry
from ..deps import require_role
from ..utils import OPERATORS

router = APIRouter(tags=["admin"])


@router.get("/dashboard", response_model=DashboardResponse)
async def dashboard(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_role("admin")),
):
    # Jami hodimlar (admin hisoblanmaydi)
    total_users = await db.scalar(
        select(func.count()).select_from(User).where(User.role != "admin")
    ) or 0

    # Jami tochkalar
    total_points = await db.scalar(select(func.count()).select_from(Point)) or 0

    # Jami sotuvlar
    total_sales = await db.scalar(select(func.count()).select_from(Sale)) or 0

    # Bugungi sotuvlar (UTC kun boshidan)
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    sales_today = await db.scalar(
        select(func.count()).select_from(Sale).where(Sale.created_at >= today_start)
    ) or 0

    # Har operator bo'yicha umumiy zaxira (hamma hodimlar qo'shib)
    op_result = await db.execute(
        select(Stock.operator, func.sum(Stock.qty))
        .group_by(Stock.operator)
    )
    raw = dict(op_result.all())
    stock_by_operator = {op: raw.get(op, 0) for op in OPERATORS}

    # So'ngi 7 kun bo'yicha sotuv dinamikasi
    seven_days_ago = today_start - timedelta(days=6)
    day_res = await db.execute(
        select(cast(Sale.created_at, Date), func.count(Sale.id))
        .where(Sale.created_at >= seven_days_ago)
        .group_by(cast(Sale.created_at, Date))
        .order_by(cast(Sale.created_at, Date))
    )
    day_raw = {str(d): c for d, c in day_res.all()}
    # Barcha 7 kunni to'ldirish (ma'lumot bo'lmasa 0)
    sales_by_day = []
    for i in range(7):
        day = today_start - timedelta(days=6 - i)
        key = day.strftime("%Y-%m-%d")
        sales_by_day.append(SalesByDayEntry(date=key, count=day_raw.get(key, 0)))

    # Operator bo'yicha sotuv soni (grafik uchun)
    op_sales_res = await db.execute(
        select(Sale.operator, func.count(Sale.id))
        .group_by(Sale.operator)
    )
    op_sales_raw = dict(op_sales_res.all())
    sales_by_operator = {op: op_sales_raw.get(op, 0) for op in OPERATORS}

    return DashboardResponse(
        total_users=total_users,
        total_points=total_points,
        total_sales=total_sales,
        sales_today=sales_today,
        stock_by_operator=stock_by_operator,
        sales_by_day=sales_by_day,
        sales_by_operator=sales_by_operator,
    )


@router.get("/logs", response_model=list[LogEntry])
async def activity_logs(
    limit: int = Query(default=100, le=500),
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_role("admin")),
):
    result = await db.execute(
        select(ActivityLog, User.full_name)
        .join(User, ActivityLog.user_id == User.id)
        .order_by(ActivityLog.created_at.desc())
        .limit(limit)
    )
    rows = result.all()
    return [
        LogEntry(
            id=log.id,
            user_id=log.user_id,
            user_name=full_name,
            type=log.type,
            text=log.text,
            created_at=log.created_at,
        )
        for log, full_name in rows
    ]
