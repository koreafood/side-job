"""
파일 역할: 데이터베이스 연결 및 초기화

주요 기능:
1. SQLite 데이터베이스 엔진 생성
2. 데이터베이스 초기화 및 마이그레이션 (init_db)
3. 세션 관리 (get_session, get_session_dep)

의존성:
- sqlmodel: ORM 및 데이터베이스 모델링
- sqlalchemy: 데이터베이스 엔진 및 연결 풀링
"""
from __future__ import annotations

import os
from contextlib import contextmanager
from pathlib import Path

from sqlmodel import Session, SQLModel, create_engine
from sqlalchemy.pool import StaticPool
from sqlalchemy import text

# 데이터베이스 파일 경로 설정
# Vercel 환경에서는 /tmp/app.db 사용 (읽기 전용 파일 시스템 제약 우회)
# 로컬 환경에서는 현재 파일 위치의 app.db 사용
if os.getenv("VERCEL") == "1":
    DB_PATH = Path("/tmp") / "app.db"
else:
    DB_PATH = Path(__file__).resolve().parent / "app.db"

# SQLite 엔진 생성
# check_same_thread=False: 단일 스레드 제한 해제 (FastAPI의 비동기 처리를 위해 필요)
# poolclass=StaticPool: 메모리 내 단일 연결 유지 (SQLite 특성상 필요할 수 있음)
engine = create_engine(
    f"sqlite:///{DB_PATH}",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)


def init_db() -> None:
    """
    데이터베이스 초기화 함수
    1. SQLModel 메타데이터를 기반으로 테이블 생성
    2. 기존 테이블에 새로운 컬럼이 없는 경우 마이그레이션(ALTER TABLE) 수행
       - order 테이블: 주문 정보 관련 컬럼 추가
       - product 테이블: 상세 설명 HTML 컬럼 추가
    """
    SQLModel.metadata.create_all(engine)

    with engine.begin() as conn:
        # 'order' 테이블 스키마 검사 및 마이그레이션
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

        # 'product' 테이블 스키마 검사 및 마이그레이션
        pcols = conn.exec_driver_sql("PRAGMA table_info('product')").fetchall()
        pexisting = {row[1] for row in pcols}
        palters: list[str] = []
        if "price_jpy" in pexisting:
            try:
                conn.execute(text('ALTER TABLE "product" DROP COLUMN price_jpy'))
            except Exception:
                pass
        if "details_html" not in pexisting:
            palters.append("ALTER TABLE \"product\" ADD COLUMN details_html TEXT")
        if "published" not in pexisting:
            palters.append("ALTER TABLE \"product\" ADD COLUMN published INTEGER DEFAULT 1")
        if "packaging_fee" not in pexisting:
            palters.append("ALTER TABLE \"product\" ADD COLUMN packaging_fee INTEGER DEFAULT 0")
        if "base_price" not in pexisting:
            palters.append("ALTER TABLE \"product\" ADD COLUMN base_price INTEGER DEFAULT 0")
        if "add_price" not in pexisting:
            palters.append("ALTER TABLE \"product\" ADD COLUMN add_price INTEGER DEFAULT 0")
        for stmt in palters:
            conn.execute(text(stmt))

@contextmanager
def get_session():
    """
    동기식 DB 세션 컨텍스트 매니저
    일반 함수나 스크립트에서 사용
    """
    with Session(engine) as session:
        yield session


def get_session_dep():
    """
    FastAPI 의존성 주입용 DB 세션 제너레이터
    요청별로 세션을 생성하고 종료 시 자동으로 닫음
    """
    with Session(engine) as session:
        yield session
