"""
파일 역할: 초기 데이터 시딩 (Seeding)

주요 기능:
1. 데이터베이스가 비어있는 경우 초기 데이터 삽입
2. 기본 판매자, 상품, 리뷰, 이미지 데이터 생성

의존성:
- api.models: 데이터베이스 모델 (Seller, Product 등)
- sqlmodel: 세션 및 쿼리 실행
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from api.models import Product, ProductImage, Review, Seller


SELLER_ID = "seller_90_tailor"
PRODUCT_ID = "product_wrap_skirt_001"

# 초기 데이터용 이미지 URL (AI 생성 이미지)
SELLER_AVATAR = "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=flat%20lay%20illustration%20of%20sewing%20tools%2C%20scissors%2C%20pincushion%2C%20measuring%20tape%2C%20clean%20minimal%2C%20pastel%20blue%20background%2C%20soft%20shadows%2C%20modern%2C%20high%20detail%2C%202d%20illustration&image_size=square"

PRODUCT_IMG_1 = "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=handmade%20wrap%20skirt%20laid%20flat%2C%20gray%20fabric%20with%20black%20animal%20silhouette%20pattern%2C%20studio%20lighting%2C%20minimal%20background%2C%20high%20detail%20photo&image_size=square_hd"
PRODUCT_IMG_2 = "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=close%20up%20of%20gray%20fabric%20with%20black%20animal%20silhouette%20pattern%2C%20textile%20texture%2C%20studio%20lighting%2C%20high%20detail%20photo&image_size=square_hd"
PRODUCT_IMG_3 = "https://coresg-normal.trae.ai/api/ide/v1/text_to_image?prompt=handmade%20wrap%20skirt%20folded%2C%20gray%20fabric%20with%20black%20animal%20silhouette%20pattern%2C%20minimal%20background%2C%20studio%20lighting%2C%20high%20detail%20photo&image_size=square_hd"
DEFAULT_SMARTSTORE_URL = "https://smartstore.naver.com/lalashopkr/products/5286642948"


def seed_if_empty(session: Session) -> None:
    """
    초기 데이터 적재 함수
    판매자 데이터가 없는 경우, 기본 판매자/상품/리뷰 데이터를 생성합니다.
    
    Args:
        session: 데이터베이스 세션
    """
    seller_exists = session.get(Seller, SELLER_ID) is not None
    product_exists = session.get(Product, PRODUCT_ID) is not None
    if seller_exists and product_exists:
        return

    seller = None
    if not seller_exists:
        seller = Seller(
            id=SELLER_ID,
            name="주니의 바느질",
            bio="안녕하세요.\주니의 바느질입니다.\n\n젊은 시절부터 손바느질과 미싱으로 많은 작품을 만들어 왔어요.\n해마다 무늬를 바꿔서 자수작품을 내고 있으니, 마음에 드는 무늬가 있으면 구경해 주세요.",
            avatar_url=SELLER_AVATAR,
            rating_avg=5.0,
            rating_count=2,
        )

    product = None
    if not product_exists:
        seller_name = seller.name if seller is not None else "주니의 바느질"
        product = Product(
            id=PRODUCT_ID,
            seller_id=SELLER_ID,
            seller_name=seller_name,
            name="오쿠치의 랩 스커트",
            description="핸드메이드 랩 스커트입니다.\n\n가벼운 착용감과 탄탄한 마감으로 데일리로 입기 좋아요.\n무늬는 해마다 조금씩 바뀝니다.",
            smartstore_url=DEFAULT_SMARTSTORE_URL,
            packaging_fee=0,
            base_price=2000,
            add_price=1500,
            created_at=datetime.utcnow(),
        )

    images = []
    image_exists = (
        session.exec(
            select(ProductImage.id).where(ProductImage.product_id == PRODUCT_ID).limit(1)
        ).first()
        is not None
    )
    if not image_exists:
        images = [
            ProductImage(id="img_1", product_id=PRODUCT_ID, url=PRODUCT_IMG_1, sort=1),
            ProductImage(id="img_2", product_id=PRODUCT_ID, url=PRODUCT_IMG_2, sort=2),
            ProductImage(id="img_3", product_id=PRODUCT_ID, url=PRODUCT_IMG_3, sort=3),
        ]

    reviews = []
    review_exists = (
        session.exec(select(Review.id).where(Review.product_id == PRODUCT_ID).limit(1)).first()
        is not None
    )
    if not review_exists:
        reviews = [
            Review(
                id="rev_1",
                product_id=PRODUCT_ID,
                author_name="구매자A",
                rating=5,
                body="천의 질감이 정말 좋아서 입었더니 친구가 예쁘다고 칭찬해 줬어요.\n마음에 드는 치마예요. 신상품도 기다릴게요!",
            ),
            Review(
                id="rev_2",
                product_id=PRODUCT_ID,
                author_name="구매자B",
                rating=5,
                body="매번 무늬가 참 예뻐요! 핸드메이드에서 느껴지는 따뜻함이 정말 마음에 들어요.",
            ),
        ]

    try:
        if seller is not None:
            session.add(seller)
        if product is not None:
            session.add(product)
        for it in images:
            session.add(it)
        for it in reviews:
            session.add(it)
        session.commit()
    except IntegrityError:
        session.rollback()
