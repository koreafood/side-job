from __future__ import annotations

from datetime import datetime
import os
from pathlib import Path
from uuid import uuid4

from fastapi import Cookie, Depends, FastAPI, File, HTTPException, Response, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session, select
from sqlalchemy import func, or_

from api.db import get_session, get_session_dep, init_db
from api.models import (
    Cart,
    CartItem,
    Order,
    OrderItem,
    OrderStatusHistory,
    Product,
    ProductImage,
    ProductionStep,
    ProductionStepPhoto,
    Review,
    Seller,
)
from api.schemas import (
    CartItemAddIn,
    CartItemQtyIn,
    CartOut,
    AdminOrderDetailOut,
    AdminOrderListOut,
    AdminOrderStatusChangeIn,
    AdminOrderSummaryOut,
    ProductionStepCreateIn,
    ProductionStepMoveIn,
    ProductionStepOut,
    ProductionStepPhotoAddIn,
    ProductionStepPhotoMoveIn,
    ProductionStepPhotoOut,
    ProductionStepUpdateIn,
    PublicOrderOut,
    ProductOrderSummaryOut,
    OrderOut,
    OrderCreateIn,
    ProductCreateIn,
    ProductUpdateIn,
    ProductImageOut,
    ProductOut,
    ReviewCreateIn,
    ReviewOut,
    SellerOut,
    UploadOut,
)
from api.seed import seed_if_empty

app = FastAPI()

if os.getenv("VERCEL") == "1":
    UPLOAD_DIR = Path("/tmp") / "uploads"
else:
    UPLOAD_DIR = Path(__file__).resolve().parent / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://traesidejob88w8.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"] ,
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    init_db()
    with get_session() as session:
        seed_if_empty(session)


def _seller_out(s: Seller) -> SellerOut:
    return SellerOut(
        id=s.id,
        name=s.name,
        bio=s.bio,
        avatarUrl=s.avatar_url,
        ratingAvg=s.rating_avg,
        ratingCount=s.rating_count,
    )


def _product_images(session: Session, product_id: str) -> list[ProductImageOut]:
    rows = session.exec(
        select(ProductImage).where(ProductImage.product_id == product_id).order_by(ProductImage.sort)
    ).all()
    return [ProductImageOut(id=r.id, url=r.url, sort=r.sort) for r in rows]


def _product_out(session: Session, p: Product) -> ProductOut:
    return ProductOut(
        id=p.id,
        sellerId=p.seller_id,
        sellerName=p.seller_name,
        name=p.name,
        description=p.description,
        priceJpy=p.price_jpy,
        images=_product_images(session, p.id),
    )


def _ensure_cart(session: Session, response: Response, cart_id: str | None) -> Cart:
    if cart_id:
        cart = session.get(Cart, cart_id)
        if cart is not None:
            return cart

    new_id = f"cart_{uuid4().hex}"
    cart = Cart(id=new_id)
    session.add(cart)
    session.commit()
    response.set_cookie(
        key="cart_id",
        value=new_id,
        max_age=60 * 60 * 24 * 30,
        httponly=True,
        samesite="lax",
        secure=os.getenv("VERCEL") == "1",
    )
    return cart


def _cart_out(session: Session, cart: Cart) -> CartOut:
    items = session.exec(select(CartItem).where(CartItem.cart_id == cart.id)).all()
    product_ids = [it.product_id for it in items]
    products = session.exec(select(Product).where(Product.id.in_(product_ids))).all() if product_ids else []
    product_map = {p.id: p for p in products}

    out_items = []
    for it in items:
        p = product_map.get(it.product_id)
        if p is None:
            continue
        out_items.append(
            {
                "id": it.id,
                "product": _product_out(session, p).model_dump(),
                "qty": it.qty,
            }
        )

    return CartOut(id=cart.id, items=out_items)


@app.get("/api/health")
def health() -> dict:
    return {"ok": True}


def _order_status_to_payment(status: str) -> str:
    if status in ("refunded",):
        return "refunded"
    if status in ("paid", "preparing", "shipped", "delivered"):
        return "paid"
    return "unpaid"


def _order_status_to_shipping(status: str) -> str:
    if status in ("preparing",):
        return "preparing"
    if status in ("shipped",):
        return "shipped"
    if status in ("delivered",):
        return "delivered"
    return "none"


def _ensure_order_defaults(o: Order) -> None:
    if not getattr(o, "order_no", ""):
        o.order_no = o.id
    if not getattr(o, "customer_name", ""):
        o.customer_name = "(미입력)"
    if not getattr(o, "customer_phone", ""):
        o.customer_phone = "(미입력)"
    if not getattr(o, "recipient_name", ""):
        o.recipient_name = o.customer_name
    if not getattr(o, "recipient_phone", ""):
        o.recipient_phone = o.customer_phone
    if not getattr(o, "shipping_address1", ""):
        o.shipping_address1 = "(미입력)"
    if not getattr(o, "order_status", ""):
        o.order_status = "pending"
    if not getattr(o, "payment_status", ""):
        o.payment_status = _order_status_to_payment(o.order_status)
    if not getattr(o, "shipping_status", ""):
        o.shipping_status = _order_status_to_shipping(o.order_status)
    if not getattr(o, "ordered_at", None):
        o.ordered_at = o.created_at
    if not getattr(o, "updated_at", None):
        o.updated_at = o.created_at


def _admin_order_summary(o: Order) -> AdminOrderSummaryOut:
    _ensure_order_defaults(o)
    return AdminOrderSummaryOut(
        id=o.id,
        orderNo=o.order_no,
        orderedAt=o.ordered_at,
        customerName=o.customer_name,
        customerPhone=o.customer_phone,
        totalJpy=o.total_jpy,
        orderStatus=o.order_status,
        paymentStatus=o.payment_status,
        shippingStatus=o.shipping_status,
    )


def _allowed_next_statuses(current: str) -> list[str]:
    table: dict[str, list[str]] = {
        "pending": ["paid", "cancelled"],
        "paid": ["preparing", "cancelled", "refunded"],
        "preparing": ["shipped", "cancelled"],
        "shipped": ["delivered"],
        "delivered": [],
        "cancelled": [],
        "refunded": [],
    }
    return table.get(current, [])


def _production_step_photos(session: Session, step_id: str) -> list[ProductionStepPhotoOut]:
    rows = session.exec(
        select(ProductionStepPhoto)
        .where(ProductionStepPhoto.step_id == step_id)
        .order_by(ProductionStepPhoto.sort.asc())
    ).all()
    return [ProductionStepPhotoOut(id=r.id, url=r.url, sort=r.sort) for r in rows]


def _production_steps(session: Session, order_id: str) -> list[ProductionStepOut]:
    rows = session.exec(
        select(ProductionStep)
        .where(ProductionStep.order_id == order_id)
        .order_by(ProductionStep.step_index.asc())
    ).all()
    return [
        ProductionStepOut(
            id=r.id,
            stepIndex=r.step_index,
            memo=r.memo,
            createdAt=r.created_at,
            updatedAt=r.updated_at,
            photos=_production_step_photos(session, r.id),
        )
        for r in rows
    ]


@app.post("/api/admin/uploads", response_model=UploadOut)
def upload_admin_image(file: UploadFile = File(...)) -> UploadOut:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="이미지 파일만 업로드할 수 있어요.")

    ext = ""
    if file.filename and "." in file.filename:
        ext = "." + file.filename.rsplit(".", 1)[-1].lower()
        if len(ext) > 10:
            ext = ""

    safe_name = f"up_{uuid4().hex}{ext}"
    dst = UPLOAD_DIR / safe_name

    data = file.file.read()
    if not data:
        raise HTTPException(status_code=400, detail="빈 파일은 업로드할 수 없어요.")
    if len(data) > 8 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="이미지 용량은 8MB 이하만 가능해요.")

    dst.write_bytes(data)
    return UploadOut(url=f"/uploads/{safe_name}", filename=safe_name, contentType=file.content_type)


@app.get("/api/sellers/{seller_id}", response_model=SellerOut)
def get_seller(seller_id: str, session: Session = Depends(get_session_dep)) -> SellerOut:
    seller = session.get(Seller, seller_id)
    if seller is None:
        raise HTTPException(status_code=404, detail="판매자를 찾을 수 없어요.")
    return _seller_out(seller)


@app.get("/api/sellers", response_model=list[SellerOut])
def list_sellers(session: Session = Depends(get_session_dep)) -> list[SellerOut]:
    rows = session.exec(select(Seller).order_by(Seller.name.asc())).all()
    return [_seller_out(s) for s in rows]


@app.get("/api/sellers/{seller_id}/products", response_model=list[ProductOut])
def list_seller_products(
    seller_id: str,
    limit: int = 6,
    session: Session = Depends(get_session_dep),
) -> list[ProductOut]:
    rows = session.exec(
        select(Product)
        .where(Product.seller_id == seller_id)
        .order_by(Product.created_at.desc())
        .limit(max(1, min(50, limit)))
    ).all()
    return [_product_out(session, p) for p in rows]


@app.get("/api/products", response_model=list[ProductOut])
def list_products(query: str | None = None, session: Session = Depends(get_session_dep)) -> list[ProductOut]:
    stmt = select(Product).order_by(Product.created_at.desc())
    if query and query.strip():
        q = f"%{query.strip()}%"
        stmt = stmt.where(Product.name.like(q))
    rows = session.exec(stmt).all()
    return [_product_out(session, p) for p in rows]


@app.get("/api/products/{product_id}", response_model=ProductOut)
def get_product(product_id: str, session: Session = Depends(get_session_dep)) -> ProductOut:
    p = session.get(Product, product_id)
    if p is None:
        raise HTTPException(status_code=404, detail="상품을 찾을 수 없어요.")
    return _product_out(session, p)


@app.post("/api/admin/products", response_model=ProductOut)
def create_admin_product(body: ProductCreateIn, session: Session = Depends(get_session_dep)) -> ProductOut:
    seller = session.get(Seller, body.sellerId)
    if seller is None:
        raise HTTPException(status_code=404, detail="판매자를 찾을 수 없어요.")

    product_id = f"product_{uuid4().hex}"
    p = Product(
        id=product_id,
        seller_id=seller.id,
        seller_name=seller.name,
        name=body.name,
        description=body.description,
        price_jpy=body.priceJpy,
    )
    session.add(p)

    images = sorted(body.images, key=lambda it: it.sort)
    for i, it in enumerate(images, start=1):
        session.add(
            ProductImage(
                id=f"img_{uuid4().hex}",
                product_id=product_id,
                url=it.url,
                sort=i,
            )
        )

    session.commit()
    session.refresh(p)
    return _product_out(session, p)


@app.put("/api/admin/products/{product_id}", response_model=ProductOut)
def update_admin_product(
    product_id: str, body: ProductUpdateIn, session: Session = Depends(get_session_dep)
) -> ProductOut:
    p = session.get(Product, product_id)
    if p is None:
        raise HTTPException(status_code=404, detail="상품을 찾을 수 없어요.")

    seller = session.get(Seller, body.sellerId)
    if seller is None:
        raise HTTPException(status_code=404, detail="판매자를 찾을 수 없어요.")

    p.seller_id = seller.id
    p.seller_name = seller.name
    p.name = body.name
    p.description = body.description
    p.price_jpy = body.priceJpy
    session.add(p)

    existing_imgs = session.exec(select(ProductImage).where(ProductImage.product_id == product_id)).all()
    for img in existing_imgs:
        session.delete(img)

    images = sorted(body.images, key=lambda it: it.sort)
    for i, it in enumerate(images, start=1):
        session.add(
            ProductImage(
                id=f"img_{uuid4().hex}",
                product_id=product_id,
                url=it.url,
                sort=i,
            )
        )

    session.commit()
    session.refresh(p)
    return _product_out(session, p)


@app.delete("/api/admin/products/{product_id}")
def delete_admin_product(product_id: str, session: Session = Depends(get_session_dep)) -> Response:
    p = session.get(Product, product_id)
    if p is None:
        raise HTTPException(status_code=404, detail="상품을 찾을 수 없어요.")

    imgs = session.exec(select(ProductImage).where(ProductImage.product_id == product_id)).all()
    for img in imgs:
        session.delete(img)

    reviews = session.exec(select(Review).where(Review.product_id == product_id)).all()
    for r in reviews:
        session.delete(r)

    cart_items = session.exec(select(CartItem).where(CartItem.product_id == product_id)).all()
    for it in cart_items:
        session.delete(it)

    session.delete(p)
    session.commit()
    return Response(status_code=204)


@app.get("/api/products/{product_id}/reviews", response_model=list[ReviewOut])
def list_reviews(product_id: str, session: Session = Depends(get_session_dep)) -> list[ReviewOut]:
    rows = session.exec(
        select(Review).where(Review.product_id == product_id).order_by(Review.created_at.desc())
    ).all()
    return [
        ReviewOut(
            id=r.id,
            productId=r.product_id,
            authorName=r.author_name,
            rating=r.rating,
            body=r.body,
            createdAt=r.created_at,
        )
        for r in rows
    ]


@app.post("/api/products/{product_id}/reviews", response_model=ReviewOut)
def create_review(
    product_id: str,
    body: ReviewCreateIn,
    session: Session = Depends(get_session_dep),
) -> ReviewOut:
    if session.get(Product, product_id) is None:
        raise HTTPException(status_code=404, detail="상품을 찾을 수 없어요.")

    r = Review(
        id=f"rev_{uuid4().hex}",
        product_id=product_id,
        author_name=body.authorName,
        rating=body.rating,
        body=body.body,
    )
    session.add(r)
    session.commit()
    session.refresh(r)
    return ReviewOut(
        id=r.id,
        productId=r.product_id,
        authorName=r.author_name,
        rating=r.rating,
        body=r.body,
        createdAt=r.created_at,
    )


@app.get("/api/cart", response_model=CartOut)
def get_cart(
    response: Response,
    cart_id: str | None = Cookie(default=None),
    session: Session = Depends(get_session_dep),
) -> CartOut:
    cart = _ensure_cart(session, response, cart_id)
    return _cart_out(session, cart)


@app.post("/api/cart/items", response_model=CartOut)
def add_cart_item(
    input: CartItemAddIn,
    response: Response,
    cart_id: str | None = Cookie(default=None),
    session: Session = Depends(get_session_dep),
) -> CartOut:
    p = session.get(Product, input.productId)
    if p is None:
        raise HTTPException(status_code=404, detail="상품을 찾을 수 없어요.")

    cart = _ensure_cart(session, response, cart_id)
    existing = session.exec(
        select(CartItem).where(
            (CartItem.cart_id == cart.id) & (CartItem.product_id == input.productId)
        )
    ).first()

    if existing is None:
        item = CartItem(
            id=f"ci_{uuid4().hex}",
            cart_id=cart.id,
            product_id=input.productId,
            qty=input.qty,
        )
        session.add(item)
    else:
        existing.qty = min(99, existing.qty + input.qty)
        session.add(existing)

    session.commit()
    return _cart_out(session, cart)


@app.patch("/api/cart/items/{item_id}", response_model=CartOut)
def update_cart_item_qty(
    item_id: str,
    input: CartItemQtyIn,
    response: Response,
    cart_id: str | None = Cookie(default=None),
    session: Session = Depends(get_session_dep),
) -> CartOut:
    cart = _ensure_cart(session, response, cart_id)
    item = session.get(CartItem, item_id)
    if item is None or item.cart_id != cart.id:
        raise HTTPException(status_code=404, detail="장바구니 항목을 찾을 수 없어요.")
    item.qty = input.qty
    session.add(item)
    session.commit()
    return _cart_out(session, cart)


@app.delete("/api/cart/items/{item_id}", response_model=CartOut)
def delete_cart_item(
    item_id: str,
    response: Response,
    cart_id: str | None = Cookie(default=None),
    session: Session = Depends(get_session_dep),
) -> CartOut:
    cart = _ensure_cart(session, response, cart_id)
    item = session.get(CartItem, item_id)
    if item is None or item.cart_id != cart.id:
        raise HTTPException(status_code=404, detail="장바구니 항목을 찾을 수 없어요.")
    session.delete(item)
    session.commit()
    return _cart_out(session, cart)


@app.post("/api/orders", response_model=OrderOut)
def create_order(
    body: OrderCreateIn,
    response: Response,
    cart_id: str | None = Cookie(default=None),
    session: Session = Depends(get_session_dep),
) -> OrderOut:
    cart = _ensure_cart(session, response, cart_id)
    items = session.exec(select(CartItem).where(CartItem.cart_id == cart.id)).all()
    if len(items) == 0:
        raise HTTPException(status_code=400, detail="장바구니가 비어 있어요.")

    product_ids = [it.product_id for it in items]
    products = session.exec(select(Product).where(Product.id.in_(product_ids))).all()
    product_map = {p.id: p for p in products}

    total = 0
    order_items: list[OrderItem] = []
    for it in items:
        p = product_map.get(it.product_id)
        if p is None:
            continue
        total += it.qty * p.price_jpy
        order_items.append(
            OrderItem(
                id=f"oi_{uuid4().hex}",
                order_id="",
                product_id=p.id,
                product_name=p.name,
                unit_price_jpy=p.price_jpy,
                qty=it.qty,
            )
        )

    now = datetime.utcnow()
    order_id = f"ord_{uuid4().hex}"
    order = Order(
        id=order_id,
        order_no=order_id,
        ordered_at=now,
        customer_name=body.customerName.strip(),
        customer_phone=body.customerPhone.strip(),
        recipient_name=body.recipientName.strip(),
        recipient_phone=body.customerPhone.strip(),
        shipping_address1=body.shippingAddress.strip(),
        shipping_address2="",
        shipping_memo=body.shippingMemo.strip(),
        order_status="pending",
        payment_status="unpaid",
        shipping_status="none",
        total_jpy=total,
        created_at=now,
        updated_at=now,
    )
    session.add(order)
    session.commit()

    for oi in order_items:
        oi.order_id = order_id
        session.add(oi)

    for it in items:
        session.delete(it)
    session.commit()
    session.refresh(order)

    return OrderOut(id=order.id, totalJpy=order.total_jpy, createdAt=order.created_at)


@app.get("/api/admin/orders", response_model=AdminOrderListOut)
def admin_list_orders(
    q: str | None = None,
    fromDate: str | None = None,
    toDate: str | None = None,
    orderStatus: str | None = None,
    paymentStatus: str | None = None,
    shippingStatus: str | None = None,
    page: int = 1,
    pageSize: int = 20,
    session: Session = Depends(get_session_dep),
) -> AdminOrderListOut:
    p = max(1, page)
    ps = max(1, min(100, pageSize))

    stmt = select(Order)

    if q and q.strip():
        kw = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                Order.id.like(kw),
                Order.order_no.like(kw),
                Order.customer_name.like(kw),
                Order.customer_phone.like(kw),
                Order.recipient_name.like(kw),
                Order.recipient_phone.like(kw),
            )
        )

    if orderStatus and orderStatus.strip():
        stmt = stmt.where(Order.order_status == orderStatus.strip())
    if paymentStatus and paymentStatus.strip():
        stmt = stmt.where(Order.payment_status == paymentStatus.strip())
    if shippingStatus and shippingStatus.strip():
        stmt = stmt.where(Order.shipping_status == shippingStatus.strip())

    def _parse_date(v: str) -> datetime:
        if "T" in v:
            return datetime.fromisoformat(v)
        return datetime.fromisoformat(f"{v}T00:00:00")

    if fromDate and fromDate.strip():
        try:
            dt = _parse_date(fromDate.strip())
        except ValueError:
            raise HTTPException(status_code=400, detail="fromDate 형식이 올바르지 않아요.")
        stmt = stmt.where(Order.ordered_at >= dt)
    if toDate and toDate.strip():
        try:
            dt = _parse_date(toDate.strip())
        except ValueError:
            raise HTTPException(status_code=400, detail="toDate 형식이 올바르지 않아요.")
        if "T" not in toDate.strip():
            dt = dt.replace(hour=23, minute=59, second=59, microsecond=999999)
        stmt = stmt.where(Order.ordered_at <= dt)

    stmt = stmt.order_by(Order.ordered_at.desc())
    total = session.exec(select(func.count()).select_from(stmt.subquery())).one()
    rows = session.exec(stmt.offset((p - 1) * ps).limit(ps)).all()
    return AdminOrderListOut(items=[_admin_order_summary(o) for o in rows], total=total, page=p, pageSize=ps)


@app.get("/api/admin/orders/{order_id}", response_model=AdminOrderDetailOut)
def admin_get_order(order_id: str, session: Session = Depends(get_session_dep)) -> AdminOrderDetailOut:
    o = session.get(Order, order_id)
    if o is None:
        raise HTTPException(status_code=404, detail="주문을 찾을 수 없어요.")
    _ensure_order_defaults(o)

    items = session.exec(select(OrderItem).where(OrderItem.order_id == order_id)).all()
    history = session.exec(
        select(OrderStatusHistory)
        .where(OrderStatusHistory.order_id == order_id)
        .order_by(OrderStatusHistory.changed_at.desc())
    ).all()

    return AdminOrderDetailOut(
        id=o.id,
        orderNo=o.order_no,
        orderedAt=o.ordered_at,
        customerName=o.customer_name,
        customerPhone=o.customer_phone,
        recipientName=o.recipient_name,
        recipientPhone=o.recipient_phone,
        shippingAddress1=o.shipping_address1,
        shippingAddress2=o.shipping_address2,
        shippingMemo=o.shipping_memo,
        totalJpy=o.total_jpy,
        orderStatus=o.order_status,
        paymentStatus=o.payment_status,
        shippingStatus=o.shipping_status,
        items=[
            {
                "id": it.id,
                "productId": it.product_id,
                "productName": it.product_name,
                "unitPriceJpy": it.unit_price_jpy,
                "qty": it.qty,
                "lineTotalJpy": it.unit_price_jpy * it.qty,
            }
            for it in items
        ],
        history=[
            {
                "id": h.id,
                "prevStatus": h.prev_status,
                "nextStatus": h.next_status,
                "reason": h.reason,
                "changedBy": h.changed_by,
                "changedAt": h.changed_at,
            }
            for h in history
        ],
        productionSteps=_production_steps(session, order_id),
    )


@app.post("/api/admin/orders/{order_id}/status", response_model=AdminOrderDetailOut)
def admin_change_order_status(
    order_id: str,
    body: AdminOrderStatusChangeIn,
    session: Session = Depends(get_session_dep),
) -> AdminOrderDetailOut:
    o = session.get(Order, order_id)
    if o is None:
        raise HTTPException(status_code=404, detail="주문을 찾을 수 없어요.")
    _ensure_order_defaults(o)

    next_status = body.nextStatus.strip()
    allowed = _allowed_next_statuses(o.order_status)
    if next_status not in allowed:
        raise HTTPException(status_code=400, detail="현재 상태에서 변경할 수 없는 상태예요.")

    prev = o.order_status
    o.order_status = next_status
    o.payment_status = _order_status_to_payment(next_status)
    o.shipping_status = _order_status_to_shipping(next_status)
    o.updated_at = datetime.utcnow()
    session.add(o)
    session.add(
        OrderStatusHistory(
            id=f"osh_{uuid4().hex}",
            order_id=order_id,
            prev_status=prev,
            next_status=next_status,
            reason=body.reason.strip(),
            changed_by="admin",
            changed_at=datetime.utcnow(),
        )
    )
    session.commit()
    return admin_get_order(order_id, session)


@app.get("/api/orders/{order_id}", response_model=PublicOrderOut)
def public_get_order(order_id: str, session: Session = Depends(get_session_dep)) -> PublicOrderOut:
    o = session.get(Order, order_id)
    if o is None:
        raise HTTPException(status_code=404, detail="주문을 찾을 수 없어요.")
    _ensure_order_defaults(o)
    return PublicOrderOut(
        id=o.id,
        orderNo=o.order_no,
        orderedAt=o.ordered_at,
        totalJpy=o.total_jpy,
        orderStatus=o.order_status,
        productionSteps=_production_steps(session, order_id),
    )


@app.get("/api/products/{product_id}/orders", response_model=list[ProductOrderSummaryOut])
def list_product_orders(
    product_id: str,
    limit: int = 20,
    session: Session = Depends(get_session_dep),
) -> list[ProductOrderSummaryOut]:
    lim = max(1, min(100, limit))
    order_ids = session.exec(
        select(OrderItem.order_id)
        .where(OrderItem.product_id == product_id)
        .distinct()
    ).all()
    if not order_ids:
        return []

    rows = session.exec(
        select(Order)
        .where(Order.id.in_(order_ids))
        .order_by(Order.ordered_at.desc())
        .limit(lim)
    ).all()
    for o in rows:
        _ensure_order_defaults(o)
    return [
        ProductOrderSummaryOut(
            id=o.id,
            orderNo=o.order_no,
            orderedAt=o.ordered_at,
            totalJpy=o.total_jpy,
            orderStatus=o.order_status,
        )
        for o in rows
    ]


@app.get("/api/orders/{order_id}/production-steps", response_model=list[ProductionStepOut])
def public_list_production_steps(order_id: str, session: Session = Depends(get_session_dep)) -> list[ProductionStepOut]:
    o = session.get(Order, order_id)
    if o is None:
        raise HTTPException(status_code=404, detail="주문을 찾을 수 없어요.")
    return _production_steps(session, order_id)


@app.post("/api/admin/orders/{order_id}/production-steps", response_model=list[ProductionStepOut])
def admin_create_production_step(
    order_id: str,
    body: ProductionStepCreateIn,
    session: Session = Depends(get_session_dep),
) -> list[ProductionStepOut]:
    o = session.get(Order, order_id)
    if o is None:
        raise HTTPException(status_code=404, detail="주문을 찾을 수 없어요.")

    last = session.exec(
        select(func.max(ProductionStep.step_index)).where(ProductionStep.order_id == order_id)
    ).one()
    next_idx = int(last or 0) + 1
    step = ProductionStep(
        id=f"ps_{uuid4().hex}",
        order_id=order_id,
        step_index=next_idx,
        memo=body.memo.strip(),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    session.add(step)
    session.commit()
    return _production_steps(session, order_id)


@app.put("/api/admin/production-steps/{step_id}", response_model=list[ProductionStepOut])
def admin_update_production_step(
    step_id: str,
    body: ProductionStepUpdateIn,
    session: Session = Depends(get_session_dep),
) -> list[ProductionStepOut]:
    step = session.get(ProductionStep, step_id)
    if step is None:
        raise HTTPException(status_code=404, detail="단계를 찾을 수 없어요.")
    step.memo = body.memo.strip()
    step.updated_at = datetime.utcnow()
    session.add(step)
    session.commit()
    return _production_steps(session, step.order_id)


@app.post("/api/admin/production-steps/{step_id}/move", response_model=list[ProductionStepOut])
def admin_move_production_step(
    step_id: str,
    body: ProductionStepMoveIn,
    session: Session = Depends(get_session_dep),
) -> list[ProductionStepOut]:
    step = session.get(ProductionStep, step_id)
    if step is None:
        raise HTTPException(status_code=404, detail="단계를 찾을 수 없어요.")
    direction = body.direction.strip()
    if direction not in ("up", "down"):
        raise HTTPException(status_code=400, detail="direction 값이 올바르지 않아요.")

    if direction == "up":
        other = session.exec(
            select(ProductionStep)
            .where(ProductionStep.order_id == step.order_id)
            .where(ProductionStep.step_index == step.step_index - 1)
        ).first()
    else:
        other = session.exec(
            select(ProductionStep)
            .where(ProductionStep.order_id == step.order_id)
            .where(ProductionStep.step_index == step.step_index + 1)
        ).first()

    if other is None:
        return _production_steps(session, step.order_id)

    step.step_index, other.step_index = other.step_index, step.step_index
    step.updated_at = datetime.utcnow()
    other.updated_at = datetime.utcnow()
    session.add(step)
    session.add(other)
    session.commit()
    return _production_steps(session, step.order_id)


@app.delete("/api/admin/production-steps/{step_id}", response_model=list[ProductionStepOut])
def admin_delete_production_step(step_id: str, session: Session = Depends(get_session_dep)) -> list[ProductionStepOut]:
    step = session.get(ProductionStep, step_id)
    if step is None:
        raise HTTPException(status_code=404, detail="단계를 찾을 수 없어요.")

    photos = session.exec(select(ProductionStepPhoto).where(ProductionStepPhoto.step_id == step_id)).all()
    for p in photos:
        session.delete(p)

    order_id = step.order_id
    deleted_idx = step.step_index
    session.delete(step)

    rest = session.exec(
        select(ProductionStep)
        .where(ProductionStep.order_id == order_id)
        .where(ProductionStep.step_index > deleted_idx)
        .order_by(ProductionStep.step_index.asc())
    ).all()
    for r in rest:
        r.step_index -= 1
        r.updated_at = datetime.utcnow()
        session.add(r)

    session.commit()
    return _production_steps(session, order_id)


@app.post("/api/admin/production-steps/{step_id}/photos", response_model=list[ProductionStepOut])
def admin_add_step_photo(
    step_id: str,
    body: ProductionStepPhotoAddIn,
    session: Session = Depends(get_session_dep),
) -> list[ProductionStepOut]:
    step = session.get(ProductionStep, step_id)
    if step is None:
        raise HTTPException(status_code=404, detail="단계를 찾을 수 없어요.")

    last = session.exec(
        select(func.max(ProductionStepPhoto.sort)).where(ProductionStepPhoto.step_id == step_id)
    ).one()
    next_sort = int(last or 0) + 1
    photo = ProductionStepPhoto(
        id=f"psp_{uuid4().hex}",
        step_id=step_id,
        url=body.url.strip(),
        sort=next_sort,
        created_at=datetime.utcnow(),
    )
    session.add(photo)
    step.updated_at = datetime.utcnow()
    session.add(step)
    session.commit()
    return _production_steps(session, step.order_id)


@app.post("/api/admin/production-step-photos/{photo_id}/move", response_model=list[ProductionStepOut])
def admin_move_step_photo(
    photo_id: str,
    body: ProductionStepPhotoMoveIn,
    session: Session = Depends(get_session_dep),
) -> list[ProductionStepOut]:
    photo = session.get(ProductionStepPhoto, photo_id)
    if photo is None:
        raise HTTPException(status_code=404, detail="사진을 찾을 수 없어요.")
    direction = body.direction.strip()
    if direction not in ("up", "down"):
        raise HTTPException(status_code=400, detail="direction 값이 올바르지 않아요.")

    if direction == "up":
        other = session.exec(
            select(ProductionStepPhoto)
            .where(ProductionStepPhoto.step_id == photo.step_id)
            .where(ProductionStepPhoto.sort == photo.sort - 1)
        ).first()
    else:
        other = session.exec(
            select(ProductionStepPhoto)
            .where(ProductionStepPhoto.step_id == photo.step_id)
            .where(ProductionStepPhoto.sort == photo.sort + 1)
        ).first()

    if other is None:
        step = session.get(ProductionStep, photo.step_id)
        if step is None:
            raise HTTPException(status_code=404, detail="단계를 찾을 수 없어요.")
        return _production_steps(session, step.order_id)

    photo.sort, other.sort = other.sort, photo.sort
    session.add(photo)
    session.add(other)
    step = session.get(ProductionStep, photo.step_id)
    if step is not None:
        step.updated_at = datetime.utcnow()
        session.add(step)
    session.commit()
    if step is None:
        raise HTTPException(status_code=404, detail="단계를 찾을 수 없어요.")
    return _production_steps(session, step.order_id)


@app.delete("/api/admin/production-step-photos/{photo_id}", response_model=list[ProductionStepOut])
def admin_delete_step_photo(photo_id: str, session: Session = Depends(get_session_dep)) -> list[ProductionStepOut]:
    photo = session.get(ProductionStepPhoto, photo_id)
    if photo is None:
        raise HTTPException(status_code=404, detail="사진을 찾을 수 없어요.")
    step = session.get(ProductionStep, photo.step_id)
    if step is None:
        raise HTTPException(status_code=404, detail="단계를 찾을 수 없어요.")
    step.updated_at = datetime.utcnow()
    session.add(step)
    step_id = step.id

    deleted_sort = photo.sort
    session.delete(photo)
    rest = session.exec(
        select(ProductionStepPhoto)
        .where(ProductionStepPhoto.step_id == step_id)
        .where(ProductionStepPhoto.sort > deleted_sort)
        .order_by(ProductionStepPhoto.sort.asc())
    ).all()
    for p in rest:
        p.sort -= 1
        session.add(p)
    session.commit()
    return _production_steps(session, step.order_id)
