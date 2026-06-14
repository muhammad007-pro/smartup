"""
Admin paneli — statistika, harakatlar tarixi, backup.
"""
from datetime import datetime, timezone, timedelta
import io, csv, zipfile

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, cast, Date

from ..database import get_db
from ..models import User, Stock, Point, PointStock, Sale, ActivityLog, Issue
from ..schemas import DashboardResponse, LogEntry, SalesByDayEntry, LowStockAlert
from ..deps import require_role
from ..utils import OPERATORS

router = APIRouter(tags=["admin"])

STOCK_THRESHOLD = 10   # ogohlantirish chegarasi (ta)


@router.get("/dashboard", response_model=DashboardResponse)
async def dashboard(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_role("admin")),
):
    total_users = await db.scalar(
        select(func.count()).select_from(User).where(User.role != "admin", User.is_active == True)  # noqa: E712
    ) or 0

    total_points = await db.scalar(
        select(func.count()).select_from(Point).where(Point.is_archived == False)  # noqa: E712
    ) or 0

    total_sales = await db.scalar(select(func.count()).select_from(Sale)) or 0

    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    sales_today = await db.scalar(
        select(func.count()).select_from(Sale).where(Sale.created_at >= today_start)
    ) or 0

    # Umumiy zaxira (operator bo'yicha)
    op_result = await db.execute(
        select(Stock.operator, func.sum(Stock.qty)).group_by(Stock.operator)
    )
    raw = dict(op_result.all())
    stock_by_operator = {op: int(raw.get(op, 0) or 0) for op in OPERATORS}

    # Kam qolgan operatorlar
    low_stock_alerts = [
        LowStockAlert(operator=op, total_qty=stock_by_operator[op], threshold=STOCK_THRESHOLD)
        for op in OPERATORS
        if stock_by_operator[op] < STOCK_THRESHOLD
    ]

    # So'ngi 7 kun sotuv dinamikasi
    seven_days_ago = today_start - timedelta(days=6)
    day_res = await db.execute(
        select(cast(Sale.created_at, Date), func.count(Sale.id))
        .where(Sale.created_at >= seven_days_ago)
        .group_by(cast(Sale.created_at, Date))
        .order_by(cast(Sale.created_at, Date))
    )
    day_raw = {str(d): c for d, c in day_res.all()}
    sales_by_day = [
        SalesByDayEntry(date=(today_start - timedelta(days=6 - i)).strftime("%Y-%m-%d"),
                        count=day_raw.get((today_start - timedelta(days=6 - i)).strftime("%Y-%m-%d"), 0))
        for i in range(7)
    ]

    # Operator bo'yicha sotuv soni
    op_sales_res = await db.execute(
        select(Sale.operator, func.count(Sale.id)).group_by(Sale.operator)
    )
    op_sales_raw = dict(op_sales_res.all())
    sales_by_operator = {op: int(op_sales_raw.get(op, 0) or 0) for op in OPERATORS}

    return DashboardResponse(
        total_users=total_users,
        total_points=total_points,
        total_sales=total_sales,
        sales_today=sales_today,
        stock_by_operator=stock_by_operator,
        sales_by_day=sales_by_day,
        sales_by_operator=sales_by_operator,
        low_stock_alerts=low_stock_alerts,
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
        LogEntry(id=log.id, user_id=log.user_id, user_name=full_name,
                 type=log.type, text=log.text, created_at=log.created_at)
        for log, full_name in rows
    ]


@router.get("/backup")
async def manual_backup(
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(require_role("admin")),
):
    """Barcha ma'lumotlarni CSV zip sifatida yuklab olish."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w', zipfile.ZIP_DEFLATED) as zf:

        # Users
        r = await db.execute(select(User).order_by(User.created_at))
        sio = io.StringIO()
        w = csv.writer(sio)
        w.writerow(['id', 'full_name', 'phone', 'role', 'is_active', 'created_at'])
        for u in r.scalars():
            w.writerow([u.id, u.full_name, u.phone, u.role, u.is_active, u.created_at])
        zf.writestr('users.csv', sio.getvalue())

        # Sales
        r = await db.execute(
            select(Sale, User.full_name, Point.name)
            .join(User, Sale.seller_id == User.id)
            .outerjoin(Point, Sale.point_id == Point.id)
            .order_by(Sale.created_at.desc())
        )
        sio = io.StringIO()
        w = csv.writer(sio)
        w.writerow(['id', 'created_at', 'seller', 'point', 'operator', 'source'])
        for s, seller_name, point_name in r.all():
            w.writerow([s.id, s.created_at, seller_name, point_name or '', s.operator, s.source])
        zf.writestr('sales.csv', sio.getvalue())

        # Points
        r = await db.execute(
            select(Point, User.full_name)
            .join(User, Point.agent_id == User.id)
            .order_by(Point.created_at.desc())
        )
        sio = io.StringIO()
        w = csv.writer(sio)
        w.writerow(['id', 'name', 'location', 'agent', 'is_archived', 'created_at'])
        for p, agent_name in r.all():
            w.writerow([p.id, p.name, p.location, agent_name, p.is_archived, p.created_at])
        zf.writestr('points.csv', sio.getvalue())

        # Stock
        r = await db.execute(
            select(Stock, User.full_name).join(User, Stock.user_id == User.id)
        )
        sio = io.StringIO()
        w = csv.writer(sio)
        w.writerow(['user_id', 'user_name', 'operator', 'qty'])
        for s, name in r.all():
            w.writerow([s.user_id, name, s.operator, s.qty])
        zf.writestr('stock.csv', sio.getvalue())

        # Issues
        r = await db.execute(
            select(Issue, User.full_name).join(User, Issue.to_user_id == User.id)
            .order_by(Issue.created_at.desc())
        )
        sio = io.StringIO()
        w = csv.writer(sio)
        w.writerow(['id', 'created_at', 'to_user', 'operator', 'qty'])
        for iss, name in r.all():
            w.writerow([iss.id, iss.created_at, name, iss.operator, iss.qty])
        zf.writestr('issues.csv', sio.getvalue())

    buf.seek(0)
    filename = f"simkarta_backup_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M')}.zip"
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
