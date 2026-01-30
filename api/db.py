from __future__ import annotations

import os
from contextlib import contextmanager
from pathlib import Path

from sqlmodel import Session, SQLModel, create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy import text

if os.getenv("VERCEL") == "1":
    DB_PATH = Path("/tmp") / "app.db"
else:
    DB_PATH = Path(__file__).resolve().parent / "app.db"

engine = create_engine(
    f"sqlite:///{DB_PATH}",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)


def init_db() -> None:
    SQLModel.metadata.create_all(engine)

    with engine.begin() as conn:
        cols = conn.exec_driver_sql("PRAGMA table_info('order')").fetchall()
        existing = {row[1] for row in cols}
        alters: list[str] = []
        if "order_no" not in existing:
            alters.append("ALTER TABLE \"order\" ADD COLUMN order_no TEXT")
        if "ordered_at" not in existing:
            alters.append("ALTER TABLE \"order\" ADD COLUMN ordered_at DATETIME")
        if "customer_name" not in existing:
            alters.append("ALTER TABLE \"order\" ADD COLUMN customer_name TEXT")
        if "customer_phone" not in existing:
            alters.append("ALTER TABLE \"order\" ADD COLUMN customer_phone TEXT")
        if "recipient_name" not in existing:
            alters.append("ALTER TABLE \"order\" ADD COLUMN recipient_name TEXT")
        if "recipient_phone" not in existing:
            alters.append("ALTER TABLE \"order\" ADD COLUMN recipient_phone TEXT")
        if "shipping_address1" not in existing:
            alters.append("ALTER TABLE \"order\" ADD COLUMN shipping_address1 TEXT")
        if "shipping_address2" not in existing:
            alters.append("ALTER TABLE \"order\" ADD COLUMN shipping_address2 TEXT")
        if "shipping_memo" not in existing:
            alters.append("ALTER TABLE \"order\" ADD COLUMN shipping_memo TEXT")
        if "order_status" not in existing:
            alters.append("ALTER TABLE \"order\" ADD COLUMN order_status TEXT")
        if "payment_status" not in existing:
            alters.append("ALTER TABLE \"order\" ADD COLUMN payment_status TEXT")
        if "shipping_status" not in existing:
            alters.append("ALTER TABLE \"order\" ADD COLUMN shipping_status TEXT")
        if "updated_at" not in existing:
            alters.append("ALTER TABLE \"order\" ADD COLUMN updated_at DATETIME")

        for stmt in alters:
            conn.execute(text(stmt))

        pcols = conn.exec_driver_sql("PRAGMA table_info('product')").fetchall()
        pexisting = {row[1] for row in pcols}
        palters: list[str] = []
        if "details_html" not in pexisting:
            palters.append("ALTER TABLE \"product\" ADD COLUMN details_html TEXT")
        for stmt in palters:
            conn.execute(text(stmt))

@contextmanager
def get_session():
    with Session(engine) as session:
        yield session


def get_session_dep():
    with Session(engine) as session:
        yield session
