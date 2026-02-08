# Side Job Project (LaLaLa Shop)

이 프로젝트는 **Vue 3**와 **FastAPI**를 기반으로 한 핸드메이드 상품 판매 쇼핑몰 애플리케이션입니다.
판매자(관리자)는 상품을 등록하고 주문을 관리하며 제작 과정을 공유할 수 있고, 구매자는 상품을 조회/주문하고 자신의 주문 제작 과정을 타임라인으로 확인할 수 있습니다.

---

## 1. 아키텍처 다이어그램 (Architecture)

전체 시스템은 클라이언트(Frontend)와 서버(Backend), 그리고 데이터베이스(DB)로 구성됩니다.

```mermaid
graph TD
    User[사용자 (구매자)] -->|접속 & 주문| Client[Frontend (Vue 3)]
    Admin[관리자 (판매자)] -->|관리 & 운영| Client

    subgraph "Frontend (Single Page Application)"
        Client -->|Router| PageRoute{Vue Router}
        PageRoute -->|Public| PublicPages[홈/상품/장바구니/주문조회]
        PageRoute -->|Admin (Auth Guard)| AdminPages[관리자 로그인/상품관리/주문관리]
        
        PublicPages & AdminPages -->|API Call| API_Mod[API Module (api.ts)]
        API_Mod -->|State Sync| Stores[Pinia/Composables (Cart/Admin)]
    end

    subgraph "Backend (FastAPI)"
        API_Mod -->|HTTP/REST| FastAPIServer[FastAPI Server (main.py)]
        FastAPIServer -->|Session/Auth| Cookie[Secure Cookie]
        FastAPIServer -->|ORM| SQLModel[SQLModel]
        
        SQLModel -->|CRUD| SQLite[(SQLite Database)]
        FastAPIServer -->|File I/O| LocalStorage[Local File Storage (/uploads)]
    end
```

---

## 2. 디렉토리 구조 (Directory Structure)

```
/
├── api/                        # Backend (FastAPI)
│   ├── main.py                 # 메인 애플리케이션 엔트리포인트
│   ├── models.py               # 데이터베이스 모델 정의 (SQLModel)
│   ├── schemas.py              # API 요청/응답 Pydantic 스키마
│   ├── db.py                   # DB 연결 및 초기화 설정
│   ├── seed.py                 # 초기 데이터 시딩 로직
│   └── uploads/                # 업로드된 이미지 파일 저장소
├── src/                        # Frontend (Vue 3)
│   ├── components/             # 재사용 가능한 UI 컴포넌트
│   │   ├── AppHeader.vue       # 상단 네비게이션 바
│   │   ├── ProductCard.vue     # 상품 요약 카드
│   │   ├── RatingStars.vue     # 별점 표시 컴포넌트
│   │   └── ...
│   ├── composables/            # 전역 상태 관리 (Vue Composables)
│   │   ├── useCartStore.ts     # 장바구니 상태 및 로직
│   │   ├── useAdminStore.ts    # 관리자 인증 상태 로직
│   │   └── useTheme.ts         # 다크 모드 테마 관리
│   ├── lib/                    # 유틸리티 및 타입
│   │   ├── api.ts              # 백엔드 API 호출 함수 모음
│   │   └── types.ts            # TypeScript 인터페이스 정의
│   ├── pages/                  # 페이지 컴포넌트
│   │   ├── HomePage.vue        # 메인/상품 목록
│   │   ├── ProductPage.vue     # 상품 상세
│   │   ├── CartPage.vue        # 장바구니/주문결제
│   │   ├── Admin*.vue          # 관리자 전용 페이지들
│   │   └── ...
│   ├── router/                 # Vue Router 설정
│   ├── App.vue                 # 루트 컴포넌트
│   └── main.ts                 # 앱 진입점
├── requirements.txt            # Python 의존성 목록
├── package.json                # Node.js 의존성 및 스크립트
└── vite.config.ts              # Vite 빌드 설정
```

---

## 3. 데이터베이스 테이블 구조 (DB Tables)

테이블은 [models.py](file:///Users/woozooni/Documents/trae_projects/side_job/api/models.py)에서 SQLModel 기반으로 정의됩니다.

### 3.1. 관계 요약
*   Seller 1:N Product
*   Product 1:N ProductImage, Review
*   Cart 1:N CartItem
*   Order 1:N OrderItem, OrderStatusHistory, ProductionStep
*   ProductionStep 1:N ProductionStepPhoto

### 3.2. 테이블 상세

#### Seller
| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | str | 판매자 ID |
| name | str | 판매자 이름 |
| bio | str | 소개글 |
| avatar_url | str | 프로필 이미지 URL |
| rating_avg | float | 평균 평점 |
| rating_count | int | 평점 개수 |

#### Product
| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | str | 상품 ID |
| seller_id | str | 판매자 ID |
| seller_name | str | 판매자 이름(역정규화) |
| name | str | 상품명 |
| description | str | 간단 설명 |
| details_html | str | 상세 설명(HTML) |
| price_jpy | int | 가격(엔화) |
| published | bool | 전시 여부 |
| created_at | datetime | 생성일시 |

#### ProductImage
| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | str | 이미지 ID |
| product_id | str | 상품 ID |
| url | str | 이미지 URL |
| sort | int | 정렬 순서 |

#### Review
| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | str | 리뷰 ID |
| product_id | str | 상품 ID |
| author_name | str | 작성자 이름 |
| rating | int | 평점(1~5) |
| body | str | 리뷰 내용 |
| created_at | datetime | 작성일시 |

#### Cart
| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | str | 장바구니 ID(UUID) |
| created_at | datetime | 생성일시 |

#### CartItem
| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | str | 아이템 ID |
| cart_id | str | 장바구니 ID |
| product_id | str | 상품 ID |
| qty | int | 수량 |

#### Order
| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | str | 주문 ID(UUID) |
| order_no | str | 주문 번호(YYYYMMDD_SERIAL) |
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
| total_jpy | int | 총 주문 금액(엔화) |
| created_at | datetime | 레코드 생성일시 |
| updated_at | datetime | 레코드 수정일시 |

#### OrderItem
| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | str | 아이템 ID |
| order_id | str | 주문 ID |
| product_id | str | 상품 ID |
| product_name | str | 상품명 스냅샷 |
| unit_price_jpy | int | 단가 스냅샷 |
| qty | int | 수량 |

#### OrderStatusHistory
| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | str | 이력 ID |
| order_id | str | 주문 ID |
| prev_status | str | 이전 상태 |
| next_status | str | 변경 상태 |
| reason | str | 변경 사유 |
| changed_by | str | 변경자 |
| changed_at | datetime | 변경 일시 |

#### ProductionStep
| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | str | 단계 ID |
| order_id | str | 주문 ID |
| step_index | int | 단계 순서 |
| memo | str | 단계 메모 |
| created_at | datetime | 생성일시 |
| updated_at | datetime | 수정일시 |

#### ProductionStepPhoto
| 컬럼 | 타입 | 설명 |
| --- | --- | --- |
| id | str | 사진 ID |
| step_id | str | 제작 단계 ID |
| url | str | 사진 URL |
| sort | int | 정렬 순서 |
| created_at | datetime | 생성일시 |

---

## 4. 모듈 간 상호작용 및 데이터 흐름 (Data Flow)

### 3.1. 상품 구매 프로세스
1.  **상품 목록**: 사용자가 메인 페이지에 접속하면 `HomePage`가 `api.listProducts()`를 호출하여 상품 목록을 가져옵니다.
2.  **장바구니**: `ProductPage`에서 상품을 담으면 `useCartStore`를 통해 백엔드의 장바구니 세션에 아이템이 추가됩니다.
3.  **주문 생성**: `CartPage`에서 배송 정보를 입력하고 주문하면 `api.createOrder()`가 호출되어 `Order` 데이터가 생성되고 장바구니는 비워집니다.
4.  **주문 내역**: 비회원 주문을 지원하기 위해 주문 ID는 브라우저의 `localStorage`에 저장되며, 이를 통해 `OrdersPage`에서 내 주문을 조회할 수 있습니다.

### 3.2. 관리자 운영 프로세스
1.  **관리자 인증**: `AdminLoginPage`에서 비밀번호(`qazwsx12##`)를 입력하면 쿠키 기반의 세션이 생성됩니다. `useAdminStore`가 이를 관리합니다.
2.  **상품 관리**:
    *   **등록**: `AdminProductNewPage`에서 텍스트와 이미지를 입력합니다. 상세 설명은 **Tiptap 에디터**를 통해 HTML로 작성됩니다.
    *   **수정/삭제**: `AdminProductEditPage`에서 기존 정보를 수정하거나 상품을 삭제할 수 있습니다. 삭제 시 안전을 위해 확인 모달이 뜹니다.
3.  **주문 처리 및 제작 공유**:
    *   `AdminOrdersPage`에서 들어온 주문 목록을 확인하고 상태(결제완료, 배송중 등)를 변경합니다.
    *   `AdminOrderDetailPage`에서 **제작 단계(Production Step)**를 추가하고 사진을 업로드하면, 구매자는 자신의 주문 상세 페이지에서 실시간 타임라인으로 제작 과정을 볼 수 있습니다.

---

## 5. 외부 라이브러리 의존성 (Dependencies)

### Backend (Python)
*   **FastAPI**: 비동기 처리를 지원하는 고성능 웹 프레임워크
*   **SQLModel**: Python 객체와 데이터베이스 테이블을 매핑하는 ORM (Pydantic + SQLAlchemy)
*   **Uvicorn**: FastAPI 실행을 위한 ASGI 서버
*   **Python-Multipart**: 파일 업로드 처리를 위한 라이브러리

### Frontend (TypeScript / Vue)
*   **Vue 3**: 사용자 인터페이스 구축을 위한 프레임워크 (Script Setup, Composition API 사용)
*   **Vite**: 빠른 개발 서버 및 빌드 도구
*   **Vue Router**: SPA(Single Page Application) 라우팅
*   **Tailwind CSS**: 유틸리티 클래스 기반 스타일링
*   **Lucide-Vue-Next**: 일관된 UI 아이콘 팩
*   **Tiptap**: 상품 상세 설명을 위한 리치 텍스트(WYSIWYG) 에디터
*   **Vitest**: 유닛 테스트 프레임워크

---

## 6. 빌드 및 실행 방법 (Build & Run)

이 프로젝트는 프론트엔드와 백엔드가 하나의 저장소에 있으며, 개발 편의를 위해 동시에 실행할 수 있습니다.

### 5.1. 사전 요구사항
*   **Node.js** (v18 이상 권장)
*   **Python** (3.9 이상 권장)

### 5.2. 설치 및 실행
1.  **의존성 설치**:
    ```bash
    # Frontend 의존성 설치
    npm install

    # Backend 의존성 설치 (가상환경 권장)
    python -m venv venv
    source venv/bin/activate  # Windows: venv\Scripts\activate
    pip install -r requirements.txt
    ```

2.  **개발 서버 실행**:
    ```bash
    # Frontend와 Backend를 동시에 실행 (concurrently 사용)
    npm run dev
    ```
    *   Frontend: `http://localhost:5173`
    *   Backend API: `http://localhost:8000` (API 문서: `http://localhost:8000/docs`)

### 5.3. 환경 설정
*   기본적으로 별도의 `.env` 파일 없이 동작하도록 설정되어 있습니다.
*   **데이터베이스**: 로컬 실행 시 `api/app.db` (SQLite) 파일이 자동으로 생성됩니다.
*   **관리자 비밀번호**: `api/main.py`에 `qazwsx12##`로 설정되어 있습니다.

---

## 7. 테스트 (Test)
```bash
# Frontend 유닛 테스트 및 API 클라이언트 테스트 실행
npm run test
```
