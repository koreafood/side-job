from __future__ import annotations

from datetime import datetime

from sqlmodel import Field, SQLModel


class Seller(SQLModel, table=True):
    id: str = Field(primary_key=True)
    name: str
    bio: str
    avatar_url: str
    rating_avg: float
    rating_count: int


class Product(SQLModel, table=True):
    id: str = Field(primary_key=True)
    seller_id: str
    seller_name: str
    name: str
    description: str
    details_html: str = ""
    price_jpy: int
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ProductImage(SQLModel, table=True):
    id: str = Field(primary_key=True)
    product_id: str
    url: str
    sort: int


class Review(SQLModel, table=True):
    id: str = Field(primary_key=True)
    product_id: str
    author_name: str
    rating: int
    body: str
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Cart(SQLModel, table=True):
    id: str = Field(primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class CartItem(SQLModel, table=True):
    id: str = Field(primary_key=True)
    cart_id: str
    product_id: str
    qty: int


class Order(SQLModel, table=True):
    id: str = Field(primary_key=True)
    order_no: str = ""
    ordered_at: datetime = Field(default_factory=datetime.utcnow)

    customer_name: str = ""
    customer_phone: str = ""
    recipient_name: str = ""
    recipient_phone: str = ""
    shipping_address1: str = ""
    shipping_address2: str = ""
    shipping_memo: str = ""

    order_status: str = "pending"
    payment_status: str = "unpaid"
    shipping_status: str = "none"
    total_jpy: int
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class OrderItem(SQLModel, table=True):
    id: str = Field(primary_key=True)
    order_id: str
    product_id: str
    product_name: str
    unit_price_jpy: int
    qty: int


class OrderStatusHistory(SQLModel, table=True):
    id: str = Field(primary_key=True)
    order_id: str
    prev_status: str
    next_status: str
    reason: str = ""
    changed_by: str = "admin"
    changed_at: datetime = Field(default_factory=datetime.utcnow)


class ProductionStep(SQLModel, table=True):
    id: str = Field(primary_key=True)
    order_id: str
    step_index: int
    memo: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ProductionStepPhoto(SQLModel, table=True):
    id: str = Field(primary_key=True)
    step_id: str
    url: str
    sort: int
    created_at: datetime = Field(default_factory=datetime.utcnow)
