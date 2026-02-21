"""
파일 역할: 데이터베이스 모델 정의

주요 기능:
1. 판매자, 상품, 주문, 리뷰 등 핵심 도메인 모델 정의
2. SQLModel을 사용한 테이블 스키마 및 타입 정의
3. 데이터 관계 및 필드 속성 설정

의존성:
- sqlmodel: ORM 및 데이터베이스 모델링
"""
from __future__ import annotations

from datetime import datetime

from sqlmodel import Field, SQLModel


class Seller(SQLModel, table=True):
    """
    판매자(Seller) 모델
    상품을 판매하는 주체입니다.
    """
    id: str = Field(primary_key=True) # 고유 ID
    name: str # 판매자 이름
    bio: str # 소개글
    avatar_url: str # 프로필 이미지 URL
    rating_avg: float # 평균 평점
    rating_count: int # 평점 개수


class Product(SQLModel, table=True):
    """
    상품(Product) 모델
    판매자가 등록한 상품 정보입니다.
    """
    id: str = Field(primary_key=True) # 상품 ID
    seller_id: str # 판매자 ID
    seller_name: str # 판매자 이름 (역정규화, 편의성 위함)
    name: str # 상품명
    description: str # 간단 설명
    details_html: str = "" # 상세 설명 (HTML 형식, Tiptap 에디터 작성)
    smartstore_url: str = "https://smartstore.naver.com/lalashopkr/products/5286642948"
    packaging_fee: int = 0 # 포장비
    base_price: int = 0 # 기본가격
    add_price: int = 0 # 추가가격
    published: bool = True # 전시 여부 (공개 여부)
    created_at: datetime = Field(default_factory=datetime.utcnow) # 생성일시


class ProductImage(SQLModel, table=True):
    """
    상품 이미지(ProductImage) 모델
    하나의 상품에 연결된 여러 이미지입니다.
    """
    id: str = Field(primary_key=True) # 이미지 ID
    product_id: str # 상품 ID
    url: str # 이미지 URL
    sort: int # 정렬 순서


class Review(SQLModel, table=True):
    """
    리뷰(Review) 모델
    상품에 대한 구매자의 리뷰입니다.
    """
    id: str = Field(primary_key=True) # 리뷰 ID
    product_id: str # 상품 ID
    author_name: str # 작성자 이름
    rating: int # 평점 (1~5)
    body: str # 리뷰 내용
    created_at: datetime = Field(default_factory=datetime.utcnow) # 작성일시


class ReviewPhoto(SQLModel, table=True):
    """
    리뷰 사진(ReviewPhoto) 모델
    리뷰에 첨부된 사진입니다.
    """
    id: str = Field(primary_key=True) # 사진 ID
    review_id: str # 리뷰 ID
    url: str # 사진 URL
    sort: int # 정렬 순서
    created_at: datetime = Field(default_factory=datetime.utcnow) # 생성일시


class Cart(SQLModel, table=True):
    """
    장바구니(Cart) 모델
    사용자의 임시 장바구니 세션입니다.
    """
    id: str = Field(primary_key=True) # 장바구니 ID (UUID)
    created_at: datetime = Field(default_factory=datetime.utcnow) # 생성일시


class CartItem(SQLModel, table=True):
    """
    장바구니 아이템(CartItem) 모델
    장바구니에 담긴 개별 상품 정보입니다.
    """
    id: str = Field(primary_key=True) # 아이템 ID
    cart_id: str # 장바구니 ID
    product_id: str # 상품 ID
    qty: int # 수량


class Order(SQLModel, table=True):
    """
    주문(Order) 모델
    사용자가 결제한 주문 내역입니다.
    """
    id: str = Field(primary_key=True) # 주문 ID (UUID)
    order_no: str = "" # 주문 번호 (YYYYMMDD_SERIAL 형식)
    ordered_at: datetime = Field(default_factory=datetime.utcnow) # 주문 일시

    customer_name: str = "" # 주문자 이름
    customer_phone: str = "" # 주문자 연락처
    recipient_name: str = "" # 수령자 이름
    recipient_phone: str = "" # 수령자 연락처
    shipping_address1: str = "" # 기본 주소
    shipping_address2: str = "" # 상세 주소
    shipping_memo: str = "" # 배송 메모

    order_status: str = "pending" # 주문 상태 (pending, paid, preparing, shipped, delivered, cancelled, refunded)
    payment_status: str = "unpaid" # 결제 상태 (unpaid, paid, refunded)
    shipping_status: str = "none" # 배송 상태 (none, preparing, shipped, delivered)
    total_jpy: int # 총 주문 금액 (엔화)
    created_at: datetime = Field(default_factory=datetime.utcnow) # 레코드 생성일시
    updated_at: datetime = Field(default_factory=datetime.utcnow) # 레코드 수정일시


class OrderItem(SQLModel, table=True):
    """
    주문 아이템(OrderItem) 모델
    주문에 포함된 개별 상품 정보입니다.
    """
    id: str = Field(primary_key=True) # 아이템 ID
    order_id: str # 주문 ID
    product_id: str # 상품 ID
    product_name: str # 상품명 (주문 시점의 이름 스냅샷)
    unit_price_jpy: int # 단가 (주문 시점의 가격 스냅샷)
    qty: int # 수량


class OrderStatusHistory(SQLModel, table=True):
    """
    주문 상태 변경 이력(OrderStatusHistory) 모델
    주문 상태가 변경될 때마다 기록됩니다.
    """
    id: str = Field(primary_key=True) # 이력 ID
    order_id: str # 주문 ID
    prev_status: str # 이전 상태
    next_status: str # 변경된 상태
    reason: str = "" # 변경 사유
    changed_by: str = "admin" # 변경자 (현재는 admin 고정)
    changed_at: datetime = Field(default_factory=datetime.utcnow) # 변경 일시


class ProductionStep(SQLModel, table=True):
    """
    제작 단계(ProductionStep) 모델
    주문별 제작 과정을 관리합니다. (Admin 전용)
    """
    id: str = Field(primary_key=True) # 단계 ID
    order_id: str # 주문 ID
    step_index: int # 단계 순서
    memo: str = "" # 단계 설명/메모
    created_at: datetime = Field(default_factory=datetime.utcnow) # 생성일시
    updated_at: datetime = Field(default_factory=datetime.utcnow) # 수정일시


class ProductionStepPhoto(SQLModel, table=True):
    """
    제작 단계 사진(ProductionStepPhoto) 모델
    특정 제작 단계에 첨부된 사진입니다.
    """
    id: str = Field(primary_key=True) # 사진 ID
    step_id: str # 제작 단계 ID
    url: str # 사진 URL
    sort: int # 정렬 순서
    created_at: datetime = Field(default_factory=datetime.utcnow) # 생성일시
