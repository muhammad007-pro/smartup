"""
SQLAlchemy modellari — REJA 1.md 2-bo'lim sxemasiga asosan.

UUID o'rniga String(36) ishlatildi: SQLite UUID turini bilmaydi,
String(36) esa PostgreSQL va SQLite ikkalasida ham ishlaydi.
UUIDlar Python tomonida str(uuid.uuid4()) bilan generatsiya qilinadi.
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    String, Text, Integer, Boolean, Float,
    ForeignKey, DateTime, Index,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Foydalanuvchilar (admin | agent | seller)
# ---------------------------------------------------------------------------
class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    full_name: Mapped[str] = mapped_column(Text, nullable=False)
    phone: Mapped[str] = mapped_column(String(20), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[str] = mapped_column(String(10), nullable=False)  # admin|agent|seller
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    stock: Mapped[list["Stock"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    points: Mapped[list["Point"]] = relationship(back_populates="agent")
    sales: Mapped[list["Sale"]] = relationship(back_populates="seller")
    issues_received: Mapped[list["Issue"]] = relationship(back_populates="to_user")
    logs: Mapped[list["ActivityLog"]] = relationship(back_populates="user")


# ---------------------------------------------------------------------------
# Har hodimning simkarta zaxirasi
# ---------------------------------------------------------------------------
class Stock(Base):
    __tablename__ = "stock"

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    operator: Mapped[str] = mapped_column(String(20), primary_key=True)
    qty: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    user: Mapped["User"] = relationship(back_populates="stock")


# ---------------------------------------------------------------------------
# Tochkalar (agent ochgan do'konlar)
# ---------------------------------------------------------------------------
class Point(Base):
    __tablename__ = "points"
    __table_args__ = (
        Index('ix_points_agent_id', 'agent_id'),
        Index('ix_points_is_archived', 'is_archived'),
        Index('ix_points_created_at', 'created_at'),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    agent_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    location: Mapped[str] = mapped_column(Text, nullable=False)
    lat: Mapped[float | None] = mapped_column(Float)
    lng: Mapped[float | None] = mapped_column(Float)
    photo_outside: Mapped[str | None] = mapped_column(Text)
    photo_inside: Mapped[str | None] = mapped_column(Text)
    photo_ad: Mapped[str | None] = mapped_column(Text)
    phone: Mapped[str | None] = mapped_column(String(20))
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, onupdate=_now)

    agent: Mapped["User"] = relationship(back_populates="points")
    point_stock: Mapped[list["PointStock"]] = relationship(
        back_populates="point", cascade="all, delete-orphan"
    )
    sales: Mapped[list["Sale"]] = relationship(back_populates="point")


# ---------------------------------------------------------------------------
# Tochkadagi simkarta qoldig'i
# ---------------------------------------------------------------------------
class PointStock(Base):
    __tablename__ = "point_stock"

    point_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("points.id", ondelete="CASCADE"), primary_key=True
    )
    operator: Mapped[str] = mapped_column(String(20), primary_key=True)
    qty: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    point: Mapped["Point"] = relationship(back_populates="point_stock")


# ---------------------------------------------------------------------------
# Tochka tashriflari — agent borib SIM qo'shganda 3 rasm bilan (isbot)
# Ochilishdagi dastlabki 3 rasm ALOHIDA (Point.photo_*), bu yerga kirmaydi.
# Har tochkada faqat oxirgi 3 tashrif saqlanadi (eskisi avtomatik o'chadi).
# ---------------------------------------------------------------------------
class PointVisit(Base):
    __tablename__ = "point_visits"
    __table_args__ = (
        Index('ix_point_visits_point_created', 'point_id', 'created_at'),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    point_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("points.id", ondelete="CASCADE"), nullable=False
    )
    agent_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)

    # Cloudinary URL'lari
    photo_outside: Mapped[str | None] = mapped_column(Text)
    photo_inside: Mapped[str | None] = mapped_column(Text)
    photo_ad: Mapped[str | None] = mapped_column(Text)

    # Cloudinary public_id'lari — rasmni o'chirish uchun kerak
    photo_outside_id: Mapped[str | None] = mapped_column(Text)
    photo_inside_id: Mapped[str | None] = mapped_column(Text)
    photo_ad_id: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    agent: Mapped["User"] = relationship("User")


# ---------------------------------------------------------------------------
# Sotuvlar
# ---------------------------------------------------------------------------
class Sale(Base):
    __tablename__ = "sales"
    __table_args__ = (
        Index('ix_sales_seller_created', 'seller_id', 'created_at'),
        Index('ix_sales_point_id', 'point_id'),
        Index('ix_sales_created_at', 'created_at'),
        Index('ix_sales_operator', 'operator'),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    seller_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    operator: Mapped[str] = mapped_column(String(20), nullable=False)
    source: Mapped[str] = mapped_column(String(10), nullable=False)   # point | office
    point_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("points.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    seller: Mapped["User"] = relationship(back_populates="sales")
    point: Mapped["Point | None"] = relationship(back_populates="sales")


# ---------------------------------------------------------------------------
# Ombordan hodimga berilgan simkartalar tarixi
# ---------------------------------------------------------------------------
class Issue(Base):
    __tablename__ = "issues"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    to_user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    operator: Mapped[str] = mapped_column(String(20), nullable=False)
    qty: Mapped[int] = mapped_column(Integer, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    to_user: Mapped["User"] = relationship(back_populates="issues_received")


# ---------------------------------------------------------------------------
# Harakatlar tarixi (audit log)
# ---------------------------------------------------------------------------
class ActivityLog(Base):
    __tablename__ = "activity_log"
    __table_args__ = (
        Index('ix_activity_log_created_at', 'created_at'),
        Index('ix_activity_log_user_id', 'user_id'),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    user: Mapped["User"] = relationship(back_populates="logs")


# ---------------------------------------------------------------------------
# Admin bildirishnomalari
# ---------------------------------------------------------------------------
class Notification(Base):
    __tablename__ = "notifications"
    __table_args__ = (
        Index('ix_notifications_created_at', 'created_at'),
        Index('ix_notifications_is_read', 'is_read'),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    type: Mapped[str] = mapped_column(String(30), nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    actor_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    point_id: Mapped[str | None] = mapped_column(String(36), ForeignKey("points.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    actor: Mapped["User"] = relationship("User", foreign_keys=[actor_id])
