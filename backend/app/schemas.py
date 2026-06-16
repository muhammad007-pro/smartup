"""
Pydantic sxemalari — API request/response formatlarini belgilaydi.
"""
from datetime import datetime
from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------
class LoginRequest(BaseModel):
    phone: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserResponse"


# ---------------------------------------------------------------------------
# Foydalanuvchi
# ---------------------------------------------------------------------------
class UserResponse(BaseModel):
    id: str
    full_name: str
    phone: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserCreate(BaseModel):
    full_name: str
    phone: str
    password: str
    role: str   # agent | seller


class UserUpdate(BaseModel):
    full_name: str | None = None
    phone: str | None = None
    password: str | None = None
    is_active: bool | None = None


class UserWithStock(BaseModel):
    id: str
    full_name: str
    phone: str
    role: str
    is_active: bool
    stock: list["StockEntry"]


# ---------------------------------------------------------------------------
# Zaxira (stock)
# ---------------------------------------------------------------------------
class StockEntry(BaseModel):
    operator: str
    qty: int

    model_config = {"from_attributes": True}


class StockResponse(BaseModel):
    user_id: str
    items: list[StockEntry]


class IssueRequest(BaseModel):
    to_user_id: str
    operator: str
    qty: int


class IssueResponse(BaseModel):
    id: str
    to_user_id: str
    operator: str
    qty: int
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Tochka
# ---------------------------------------------------------------------------
class PointCreate(BaseModel):
    name: str
    location: str
    lat: float
    lng: float
    phone: str | None = None
    stock: list[StockEntry] = []


class PointUpdate(BaseModel):
    current_lat: float
    current_lng: float
    stock: list[StockEntry] = []
    name: str | None = None
    location: str | None = None
    phone: str | None = None


class PointResponse(BaseModel):
    id: str
    agent_id: str
    name: str
    location: str
    lat: float | None
    lng: float | None
    phone: str | None = None
    photo_outside: str | None
    photo_inside: str | None
    photo_ad: str | None
    is_archived: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SaleDetailResponse(BaseModel):
    id: str
    seller_id: str
    seller_name: str | None = None
    operator: str
    source: str
    point_id: str | None
    point_name: str | None = None
    created_at: datetime


class PagedSalesResponse(BaseModel):
    items: list[SaleDetailResponse]
    total: int
    has_more: bool


class PointDetailResponse(BaseModel):
    id: str
    agent_id: str
    agent_name: str | None = None
    name: str
    location: str
    lat: float | None
    lng: float | None
    phone: str | None = None
    is_archived: bool
    point_stock: list[StockEntry]
    sales: list[SaleDetailResponse]
    total_sales: int


class RatingEntry(BaseModel):
    id: str
    name: str
    count: int


class RatingsResponse(BaseModel):
    sellers: list[RatingEntry]
    agents: list[RatingEntry]
    points: list[RatingEntry]


class PointWithStock(BaseModel):
    id: str
    agent_id: str
    agent_name: str | None = None
    agent_phone: str | None = None
    name: str
    location: str
    lat: float | None
    lng: float | None
    phone: str | None = None
    photo_outside: str | None
    photo_inside: str | None
    photo_ad: str | None
    is_archived: bool = False
    created_at: datetime
    updated_at: datetime
    point_stock: list[StockEntry]
    total_sales: int = 0


class StockReduceRequest(BaseModel):
    to_user_id: str
    operator: str
    qty: int


class StockReduceResponse(BaseModel):
    user_id: str
    operator: str
    qty_removed: int
    qty_remaining: int


# ---------------------------------------------------------------------------
# Sotuv
# ---------------------------------------------------------------------------
class SalePointRequest(BaseModel):
    point_id: str
    operator: str


class SaleOfficeRequest(BaseModel):
    operator: str


class SaleResponse(BaseModel):
    id: str
    seller_id: str
    operator: str
    source: str
    point_id: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Admin
# ---------------------------------------------------------------------------
class SalesByDayEntry(BaseModel):
    date: str
    count: int


class LowStockAlert(BaseModel):
    operator: str
    total_qty: int
    threshold: int


class DashboardResponse(BaseModel):
    total_users: int
    total_points: int
    total_sales: int
    sales_today: int
    stock_by_operator: dict[str, int]
    sales_by_day: list[SalesByDayEntry] = []
    sales_by_operator: dict[str, int] = {}
    low_stock_alerts: list[LowStockAlert] = []


class LogEntry(BaseModel):
    id: str
    user_id: str
    user_name: str
    type: str
    text: str
    created_at: datetime


# ---------------------------------------------------------------------------
# Bildirishnoma
# ---------------------------------------------------------------------------
class NotificationResponse(BaseModel):
    id: str
    type: str
    title: str
    body: str
    is_read: bool
    actor_id: str
    actor_name: str | None = None
    point_id: str | None
    created_at: datetime
