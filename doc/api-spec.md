# API 명세 (OpenAPI 초안)

이 문서는 현재 백엔드 구현을 기반으로 작성된 API 명세입니다. 초보자도 이해할 수 있도록 요청/응답 구조, 인증 방식, 에러 규칙을 상세히 설명합니다.

## 1. 공통 규칙

### 1.1 Base URL

- 로컬 개발: `http://localhost:8000`
- 프론트에서 호출 시 기본 경로는 `/api/...` 형태를 사용

### 1.2 인증 방식

- 관리자 로그인 성공 시 쿠키 `is_admin=1` 발급
- 프론트는 모든 API 요청에 `credentials: include`로 쿠키 포함
- 서버 측 관리자 API는 현재 별도의 권한 검증이 없음  
  (프론트 라우터 가드가 화면 접근을 제한하는 구조)

### 1.3 응답 형식

- JSON 응답이 기본
- 204 No Content인 경우 응답 본문 없음

### 1.4 에러 규칙

에러 시 HTTP 상태코드와 함께 다음 형태의 응답을 반환합니다.

```json
{ "detail": "에러 메시지" }
```

프론트에서는 `ApiError`로 감싸 처리합니다.

## 2. 데이터 모델 요약

### 2.1 Seller

```json
{
  "id": "seller_1",
  "name": "판매자명",
  "bio": "소개글",
  "avatarUrl": "이미지 URL",
  "ratingAvg": 4.6,
  "ratingCount": 12
}
```

### 2.2 Product

```json
{
  "id": "product_1",
  "sellerId": "seller_1",
  "sellerName": "판매자명",
  "name": "상품명",
  "description": "간단 설명",
  "detailsHtml": "<p>상세 설명</p>",
  "priceJpy": 3000,
  "images": [
    { "id": "img_1", "url": "/uploads/...", "sort": 1 }
  ],
  "published": true
}
```

### 2.3 Review

```json
{
  "id": "rev_1",
  "productId": "product_1",
  "authorName": "홍길동",
  "rating": 5,
  "body": "좋아요",
  "createdAt": "2026-02-16T00:00:00Z"
}
```

### 2.4 Cart

```json
{
  "id": "cart_1",
  "items": [
    {
      "id": "ci_1",
      "product": { "...": "Product" },
      "qty": 2
    }
  ]
}
```

### 2.5 Order (주문 생성 응답)

```json
{
  "id": "ord_xxx",
  "orderNo": "2026_001",
  "totalJpy": 12000,
  "createdAt": "2026-02-16T00:00:00Z"
}
```

### 2.6 AdminOrderDetail (요약)

```json
{
  "id": "ord_xxx",
  "orderNo": "2026_001",
  "orderedAt": "2026-02-16T00:00:00Z",
  "customerName": "홍길동",
  "customerPhone": "010-0000-0000",
  "recipientName": "홍길동",
  "recipientPhone": "010-0000-0000",
  "shippingAddress1": "주소",
  "shippingAddress2": "",
  "shippingMemo": "",
  "totalJpy": 12000,
  "orderStatus": "pending",
  "paymentStatus": "unpaid",
  "shippingStatus": "none",
  "items": [
    { "id": "oi_1", "productId": "product_1", "productName": "상품명", "unitPriceJpy": 3000, "qty": 2, "lineTotalJpy": 6000 }
  ],
  "history": [
    { "id": "osh_1", "prevStatus": "pending", "nextStatus": "paid", "reason": "결제 완료", "changedBy": "admin", "changedAt": "2026-02-16T00:00:00Z" }
  ],
  "productionSteps": [
    { "id": "ps_1", "stepIndex": 1, "memo": "재단", "createdAt": "...", "updatedAt": "...", "photos": [] }
  ]
}
```

## 3. 엔드포인트 상세

### 3.1 공통/헬스체크

#### GET /api/health

- 설명: 서버 상태 확인
- 응답: `{ "ok": true }`

---

### 3.2 판매자

#### GET /api/sellers

- 설명: 판매자 목록 조회
- 응답: `Seller[]`

#### GET /api/sellers/{seller_id}

- 설명: 판매자 상세 조회
- 응답: `Seller`
- 에러:
  - 404: 판매자를 찾을 수 없음

#### GET /api/sellers/{seller_id}/products?limit=6

- 설명: 특정 판매자의 상품 목록
- 쿼리:
  - `limit`: 최대 50까지 제한
- 응답: `Product[]` (published 상품만 반환)

---

### 3.3 상품

#### GET /api/products?query=검색어

- 설명: 상품 목록 조회
- 쿼리:
  - `query`: 상품명 검색어 (선택)
- 응답: `Product[]`

#### GET /api/products/{product_id}

- 설명: 상품 상세 조회
- 조건:
  - `published=false`인 상품은 관리자 쿠키가 없으면 404 처리
- 응답: `Product`
- 에러:
  - 404: 상품 없음

#### GET /api/products/{product_id}/reviews

- 설명: 상품 리뷰 목록
- 응답: `Review[]`

#### POST /api/products/{product_id}/reviews

- 설명: 리뷰 작성
- 요청:

```json
{
  "authorName": "작성자",
  "rating": 5,
  "body": "리뷰 내용",
  "orderId": "ord_xxx",
  "phoneLast4": "1234"
}
```

- 조건:
  - 주문 상태가 `delivered`일 때만 가능
  - 주문 내 상품과 리뷰 대상 상품이 일치해야 함
  - `phoneLast4`가 주문자/수령자 번호와 일치해야 함
- 응답: `Review`

#### GET /api/products/{product_id}/orders?limit=20

- 설명: 특정 상품의 주문 요약 목록
- 응답: `ProductOrderSummary[]`

---

### 3.4 장바구니

#### GET /api/cart

- 설명: 현재 장바구니 조회
- 응답: `Cart`

#### POST /api/cart/items

- 설명: 장바구니 아이템 추가
- 요청:

```json
{ "productId": "product_1", "qty": 1 }
```

- 응답: `Cart`

#### PATCH /api/cart/items/{item_id}

- 설명: 장바구니 아이템 수량 변경
- 요청:

```json
{ "qty": 2 }
```

- 응답: `Cart`

#### DELETE /api/cart/items/{item_id}

- 설명: 장바구니 아이템 삭제
- 응답: `Cart`

---

### 3.5 주문 (공개)

#### POST /api/orders

- 설명: 주문 생성
- 요청:

```json
{
  "customerName": "홍길동",
  "customerPhone": "010-0000-0000",
  "shippingAddress": "주소",
  "recipientName": "수령자",
  "shippingMemo": "문앞"
}
```

- 응답: `Order`

#### GET /api/orders/{order_id}

- 설명: 주문 상세(공개)
- 응답: `PublicOrderOut`

#### GET /api/orders/{order_id}/production-steps

- 설명: 제작 단계 목록(공개)
- 응답: `ProductionStep[]`

---

### 3.6 관리자 인증

#### POST /api/admin/login

- 설명: 관리자 로그인
- 요청:

```json
{ "password": "관리자 비밀번호" }
```

- 응답:

```json
{ "isAdmin": true }
```

- 효과: 쿠키 `is_admin=1` 발급

#### GET /api/admin/session

- 설명: 관리자 세션 확인
- 응답:

```json
{ "isAdmin": true | false }
```

---

### 3.7 관리자 상품

#### GET /api/admin/products?published=all|true|false

- 설명: 관리자 상품 목록
- 응답: `Product[]`

#### POST /api/admin/products

- 설명: 상품 생성
- 요청:

```json
{
  "sellerId": "seller_1",
  "name": "상품명",
  "description": "간단 설명",
  "detailsHtml": "<p>상세</p>",
  "priceJpy": 3000,
  "images": [
    { "url": "/uploads/...", "sort": 1 }
  ],
  "published": true
}
```

- 응답: `Product`

#### PUT /api/admin/products/{product_id}

- 설명: 상품 수정
- 요청 구조는 생성과 동일
- 응답: `Product`

#### DELETE /api/admin/products/{product_id}

- 설명: 상품 삭제
- 응답: 204 No Content

---

### 3.8 관리자 주문

#### GET /api/admin/orders

- 설명: 주문 목록 조회(검색/필터/페이지네이션)
- 쿼리:
  - `q`, `fromDate`, `toDate`
  - `orderStatus`, `paymentStatus`, `shippingStatus`
  - `page`, `pageSize`
- 응답: `AdminOrderList`

#### GET /api/admin/orders/{order_id}

- 설명: 주문 상세 조회
- 응답: `AdminOrderDetail`

#### POST /api/admin/orders/{order_id}/status

- 설명: 주문 상태 변경
- 요청:

```json
{ "nextStatus": "paid", "reason": "결제 완료" }
```

- 응답: `AdminOrderDetail`

---

### 3.9 제작 단계(Production Steps)

#### POST /api/admin/orders/{order_id}/production-steps

- 설명: 제작 단계 추가
- 요청:

```json
{ "memo": "재단 완료" }
```

- 응답: `ProductionStep[]`

#### PUT /api/admin/production-steps/{step_id}

- 설명: 제작 단계 메모 수정
- 요청:

```json
{ "memo": "재단 수정" }
```

- 응답: `ProductionStep[]`

#### POST /api/admin/production-steps/{step_id}/move

- 설명: 제작 단계 순서 변경
- 요청:

```json
{ "direction": "up" }
```

- 응답: `ProductionStep[]`

#### DELETE /api/admin/production-steps/{step_id}

- 설명: 제작 단계 삭제
- 응답: `ProductionStep[]`

#### POST /api/admin/production-steps/{step_id}/photos

- 설명: 제작 단계 사진 추가
- 요청:

```json
{ "url": "/uploads/..." }
```

- 응답: `ProductionStep[]`

#### POST /api/admin/production-step-photos/{photo_id}/move

- 설명: 제작 단계 사진 순서 변경
- 요청:

```json
{ "direction": "down" }
```

- 응답: `ProductionStep[]`

#### DELETE /api/admin/production-step-photos/{photo_id}

- 설명: 제작 단계 사진 삭제
- 응답: `ProductionStep[]`

---

### 3.10 파일 업로드

#### POST /api/admin/uploads

- 설명: 관리자 이미지 업로드
- 요청: `multipart/form-data` (필드: `file`)
- 제한:
  - 이미지 파일만 허용
  - 최대 8MB
- 응답:

```json
{ "url": "/uploads/파일명", "filename": "파일명", "contentType": "image/png" }
```
