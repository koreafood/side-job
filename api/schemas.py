from __future__ import annotations
# API 입출력(pydantic) 모델 정의. 프론트/백엔드 간 데이터 형식을 명확히 합니다.

from datetime import datetime

from pydantic import BaseModel, Field


class SellerOut(BaseModel):
    id: str
    name: str
    bio: str
    avatarUrl: str
    ratingAvg: float
    ratingCount: int


class ProductImageOut(BaseModel):
    id: str
    url: str
    sort: int


class ProductOut(BaseModel):
    id: str
    sellerId: str
    sellerName: str
    name: str
    description: str
    detailsHtml: str
    priceJpy: int
    images: list[ProductImageOut]
    published: bool


class ProductImageCreateIn(BaseModel):
    url: str = Field(min_length=1, max_length=2000)
    sort: int = Field(ge=1, le=50)


class ProductCreateIn(BaseModel):
    sellerId: str = Field(min_length=1, max_length=120)
    name: str = Field(min_length=1, max_length=120)
    description: str = Field(max_length=4000)
    detailsHtml: str = Field(default="", max_length=20000)
    priceJpy: int = Field(ge=0, le=10_000_000)
    images: list[ProductImageCreateIn] = Field(min_length=1, max_length=20)
    published: bool = True


class ProductUpdateIn(ProductCreateIn):
    pass


class UploadOut(BaseModel):
    url: str
    filename: str
    contentType: str


class ReviewOut(BaseModel):
    id: str
    productId: str
    authorName: str
    rating: int
    body: str
    createdAt: datetime


class ReviewCreateIn(BaseModel):
    authorName: str = Field(min_length=1, max_length=40)
    rating: int = Field(ge=1, le=5)
    body: str = Field(min_length=1, max_length=2000)
    orderId: str = Field(min_length=1, max_length=200)
    phoneLast4: str = Field(min_length=1, max_length=20)


class CartItemOut(BaseModel):
    id: str
    product: ProductOut
    qty: int


class CartOut(BaseModel):
    id: str
    items: list[CartItemOut]


class CartItemAddIn(BaseModel):
    productId: str
    qty: int = Field(ge=1, le=99)


class CartItemQtyIn(BaseModel):
    qty: int = Field(ge=1, le=99)


class OrderOut(BaseModel):
    id: str
    orderNo: str
    totalJpy: int
    createdAt: datetime


class OrderCreateIn(BaseModel):
    customerName: str = Field(min_length=1, max_length=120)
    customerPhone: str = Field(min_length=1, max_length=40)
    shippingAddress: str = Field(min_length=1, max_length=400)
    shippingAddress2: str = Field(default="", max_length=400)
    recipientName: str = Field(min_length=1, max_length=120)
    shippingMemo: str = Field(default="", max_length=200)


class AdminOrderSummaryOut(BaseModel):
    id: str
    orderNo: str
    orderedAt: datetime
    customerName: str
    customerPhone: str
    totalJpy: int
    orderStatus: str
    paymentStatus: str
    shippingStatus: str


class AdminOrderListOut(BaseModel):
    items: list[AdminOrderSummaryOut]
    total: int
    page: int
    pageSize: int


class AdminSessionOut(BaseModel):
    isAdmin: bool


class AdminLoginIn(BaseModel):
    password: str = Field(min_length=1, max_length=200)


class AdminOrderItemOut(BaseModel):
    id: str
    productId: str
    productName: str
    unitPriceJpy: int
    qty: int
    lineTotalJpy: int


class AdminOrderHistoryOut(BaseModel):
    id: str
    prevStatus: str
    nextStatus: str
    reason: str
    changedBy: str
    changedAt: datetime


class AdminOrderDetailOut(BaseModel):
    id: str
    orderNo: str
    orderedAt: datetime
    customerName: str
    customerPhone: str
    recipientName: str
    recipientPhone: str
    shippingAddress1: str
    shippingAddress2: str
    shippingMemo: str
    totalJpy: int
    orderStatus: str
    paymentStatus: str
    shippingStatus: str
    items: list[AdminOrderItemOut]
    history: list[AdminOrderHistoryOut]
    productionSteps: list[ProductionStepOut]


class AdminOrderStatusChangeIn(BaseModel):
    nextStatus: str = Field(min_length=1, max_length=40)
    reason: str = Field(default="", max_length=200)


class ProductionStepPhotoOut(BaseModel):
    id: str
    url: str
    sort: int


class ProductionStepOut(BaseModel):
    id: str
    stepIndex: int
    memo: str
    createdAt: datetime
    updatedAt: datetime
    photos: list[ProductionStepPhotoOut]


class ProductionStepCreateIn(BaseModel):
    memo: str = Field(default="", max_length=200)


class ProductionStepUpdateIn(BaseModel):
    memo: str = Field(default="", max_length=200)


class ProductionStepMoveIn(BaseModel):
    direction: str = Field(min_length=2, max_length=10)


class ProductionStepPhotoAddIn(BaseModel):
    url: str = Field(min_length=1, max_length=2000)


class ProductionStepPhotoMoveIn(BaseModel):
    direction: str = Field(min_length=2, max_length=10)


class PublicOrderOut(BaseModel):
    id: str
    orderNo: str
    orderedAt: datetime
    totalJpy: int
    orderStatus: str
    productionSteps: list[ProductionStepOut]
    items: list[PublicOrderItemOut]
    customerMaskedName: str

class PublicOrderItemOut(BaseModel):
    productId: str
    productName: str
    qty: int
    productImageUrl: str


class ProductOrderSummaryOut(BaseModel):
    id: str
    orderNo: str
    orderedAt: datetime
    totalJpy: int
    orderStatus: str
    productImageUrl: str
