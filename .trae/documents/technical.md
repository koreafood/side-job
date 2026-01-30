## 아키텍처
- 프론트엔드: Vite 기반 Vue3 SPA
- 백엔드: FastAPI REST API
- 데이터베이스: SQLite(파일 기반), 백엔드는 SQLModel로 ORM 사용

## 디렉터리 구조(예정)
- `src/`: 프론트엔드 소스
- `api/`: FastAPI 백엔드 소스

## 프론트 라우팅
- `/`: 홈(상품 검색/목록)
- `/sellers/:sellerId`: 판매자 프로필
- `/products/:productId`: 상품 상세
- `/cart`: 장바구니

## API(초안)
- `GET /api/health`
- `GET /api/sellers/{seller_id}`
- `GET /api/sellers/{seller_id}/products?limit=`
- `GET /api/products?query=`
- `GET /api/products/{product_id}`
- `GET /api/products/{product_id}/reviews`
- `POST /api/products/{product_id}/reviews`
- `GET /api/cart` (데모: 익명 cart_id를 쿠키로 관리)
- `POST /api/cart/items` (product_id, qty)
- `PATCH /api/cart/items/{item_id}` (qty)
- `DELETE /api/cart/items/{item_id}`
- `POST /api/orders` (cart_id 기반 주문 생성)

## 상태 관리
- 프론트는 단순 `reactive` 스토어(커스텀 composable)로 장바구니 상태를 보관
- 새로고침 시 백엔드 `GET /api/cart`로 동기화

## 보안/권한
- 데모 범위는 인증 없이 구현(추후 Supabase Auth 또는 JWT로 확장 가능)
- 입력 검증은 Pydantic 모델로 수행

