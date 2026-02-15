# 데이터베이스 스키마 문서

이 문서는 `api/models.py`와 `api/db.py`를 기반으로 DB 구조와 관계를 정리한 문서입니다. 초보자도 이해할 수 있도록 테이블 의미와 컬럼 설명을 자세히 작성했습니다.

## 1. 데이터베이스 개요

- DB 종류: SQLite
- 파일 경로
  - 로컬: `api/app.db`
  - Vercel: `/tmp/app.db`
- ORM: SQLModel

## 2. 관계 요약

- Seller 1:N Product  
- Product 1:N ProductImage  
- Product 1:N Review  
- Cart 1:N CartItem  
- Order 1:N OrderItem  
- Order 1:N OrderStatusHistory  
- Order 1:N ProductionStep  
- ProductionStep 1:N ProductionStepPhoto

## 3. 테이블 상세

### 3.1 Seller

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | str | 판매자 고유 ID |
| name | str | 판매자 이름 |
| bio | str | 소개글 |
| avatar_url | str | 프로필 이미지 URL |
| rating_avg | float | 평균 평점 |
| rating_count | int | 평점 개수 |

### 3.2 Product

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | str | 상품 ID |
| seller_id | str | 판매자 ID |
| seller_name | str | 판매자 이름(역정규화) |
| name | str | 상품명 |
| description | str | 간단 설명 |
| details_html | str | 상세 설명 HTML |
| price_jpy | int | 가격(엔화) |
| published | bool | 전시 여부 |
| created_at | datetime | 생성 시각 |

### 3.3 ProductImage

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | str | 이미지 ID |
| product_id | str | 상품 ID |
| url | str | 이미지 URL |
| sort | int | 정렬 순서 |

### 3.4 Review

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | str | 리뷰 ID |
| product_id | str | 상품 ID |
| author_name | str | 작성자 이름 |
| rating | int | 평점 (1~5) |
| body | str | 리뷰 내용 |
| created_at | datetime | 작성 시각 |

### 3.5 Cart

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | str | 장바구니 ID |
| created_at | datetime | 생성 시각 |

### 3.6 CartItem

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | str | 장바구니 아이템 ID |
| cart_id | str | 장바구니 ID |
| product_id | str | 상품 ID |
| qty | int | 수량 |

### 3.7 Order

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | str | 주문 ID |
| order_no | str | 주문번호 (연도_연속번호) |
| ordered_at | datetime | 주문 일시 |
| customer_name | str | 주문자 이름 |
| customer_phone | str | 주문자 연락처 |
| recipient_name | str | 수령자 이름 |
| recipient_phone | str | 수령자 연락처 |
| shipping_address1 | str | 기본 주소 |
| shipping_address2 | str | 상세 주소 |
| shipping_memo | str | 배송 메모 |
| order_status | str | 주문 상태 |
| payment_status | str | 결제 상태 |
| shipping_status | str | 배송 상태 |
| total_jpy | int | 총 주문 금액 |
| created_at | datetime | 생성 시각 |
| updated_at | datetime | 수정 시각 |

상태 값 예시:

- order_status: pending, paid, preparing, shipped, delivered, cancelled, refunded  
- payment_status: unpaid, paid, refunded  
- shipping_status: none, preparing, shipped, delivered

### 3.8 OrderItem

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | str | 주문 아이템 ID |
| order_id | str | 주문 ID |
| product_id | str | 상품 ID |
| product_name | str | 상품명 스냅샷 |
| unit_price_jpy | int | 단가 스냅샷 |
| qty | int | 수량 |

### 3.9 OrderStatusHistory

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | str | 상태 변경 이력 ID |
| order_id | str | 주문 ID |
| prev_status | str | 이전 상태 |
| next_status | str | 변경 상태 |
| reason | str | 변경 사유 |
| changed_by | str | 변경자 (현재 admin 고정) |
| changed_at | datetime | 변경 시각 |

### 3.10 ProductionStep

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | str | 단계 ID |
| order_id | str | 주문 ID |
| step_index | int | 단계 순서 |
| memo | str | 단계 메모 |
| created_at | datetime | 생성 시각 |
| updated_at | datetime | 수정 시각 |

### 3.11 ProductionStepPhoto

| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | str | 사진 ID |
| step_id | str | 제작 단계 ID |
| url | str | 사진 URL |
| sort | int | 정렬 순서 |
| created_at | datetime | 생성 시각 |

## 4. 인덱스 및 제약

- 모든 테이블은 기본키(primary key)만 명시적으로 존재
- 별도의 인덱스나 외래키 제약은 코드에서 정의되어 있지 않음  
  (SQLModel 단순 선언 구조)

## 5. 마이그레이션 정책

이 프로젝트는 전용 마이그레이션 도구를 사용하지 않습니다.

- `init_db()`가 실행될 때
  - 없는 테이블을 생성 (`SQLModel.metadata.create_all`)
  - 기존 테이블에 필요한 컬럼이 없으면 `ALTER TABLE`로 추가

현재 자동 보완되는 컬럼:

- `order` 테이블: order_no, ordered_at, customer_name, customer_phone, recipient_name, recipient_phone, shipping_address1, shipping_address2, shipping_memo, order_status, payment_status, shipping_status, updated_at
- `product` 테이블: details_html, published

## 6. 데이터 생성/갱신 흐름 요약

- 주문 생성 시:
  - cart → order + order_items 로 저장
  - order_no는 연도별 주문 수를 기반으로 자동 생성
- 주문 상태 변경 시:
  - order_status, payment_status, shipping_status 갱신
  - OrderStatusHistory 기록 추가
- 제작 단계 관리:
  - ProductionStep/Photo는 관리자 화면에서 추가/정렬/삭제
