# 프로젝트 파일 구조 분석 (README L38-74 기반)

아래 내용은 README.md의 디렉토리 구조 섹션과 현재 src 내 Vue 파일 목록을 기반으로 재구성한 파일/디렉토리 설명입니다. 실제 구현 세부사항은 해당 파일의 코드에 따라 달라질 수 있으며, 여기서는 코드 주석과 파일 역할을 기준으로 기능 설명과 의존성 관계를 기술합니다.

```
/
├── api/
│   ├── main.py
│   ├── models.py
│   ├── schemas.py
│   ├── db.py
│   ├── seed.py
│   └── uploads/
├── src/
│   ├── components/
│   │   ├── AppHeader.vue
│   │   ├── Empty.vue
│   │   ├── ImageGallery.vue
│   │   ├── ProductCard.vue
│   │   ├── ProductionStepsAdmin.vue
│   │   ├── ProductionStepsTimeline.vue
│   │   ├── RatingStars.vue
│   │   ├── ReviewForm.vue
│   │   ├── ReviewList.vue
│   │   └── SellerCard.vue
│   ├── composables/
│   │   ├── useCartStore.ts
│   │   ├── useAdminStore.ts
│   │   └── useTheme.ts
│   ├── lib/
│   │   ├── api.ts
│   │   └── types.ts
│   ├── pages/
│   │   ├── CartPage.vue
│   │   ├── HomePage.vue
│   │   ├── OrderDetailPage.vue
│   │   ├── OrdersPage.vue
│   │   ├── ProductPage.vue
│   │   ├── SellerPage.vue
│   │   ├── AdminLoginPage.vue
│   │   ├── AdminOrderDetailPage.vue
│   │   ├── AdminOrdersPage.vue
│   │   ├── AdminProductEditPage.vue
│   │   ├── AdminProductNewPage.vue
│   │   └── AdminProductsPage.vue
│   ├── router/
│   ├── App.vue
│   └── main.ts
├── requirements.txt
├── package.json
└── vite.config.ts
```

## 1. Backend (FastAPI)

### /api/
- 역할: FastAPI 기반 백엔드 애플리케이션의 핵심 로직과 데이터 계층을 구성하는 디렉토리
- 주요 의존성: FastAPI, SQLModel, Pydantic
- 의존성 관계: API 엔트리포인트(main.py) → 모델(models.py) 및 스키마(schemas.py) → DB 설정(db.py)

#### /api/main.py
- 용도: 백엔드 애플리케이션의 메인 엔트리포인트
- 주요 기능: FastAPI 앱 초기화 및 라우팅 진입점 역할
- 의존성: models.py의 데이터 모델, schemas.py의 요청/응답 스키마, db.py의 DB 연결 설정과 연동되는 구조로 구성됨

#### /api/models.py
- 용도: 데이터베이스 모델 정의
- 주요 기능: SQLModel 기반의 엔티티 및 테이블 구조 정의
- 의존성: DB 계층(db.py)과 연결되며, schemas.py와 함께 API 입출력 구조를 맞춤

#### /api/schemas.py
- 용도: API 요청/응답 스키마 정의
- 주요 기능: Pydantic 기반의 데이터 검증 및 직렬화 구조 제공
- 의존성: models.py의 데이터 구조를 참조하거나 매핑하는 형태로 사용

#### /api/db.py
- 용도: 데이터베이스 연결 및 초기화 설정
- 주요 기능: DB 연결 구성, 세션/엔진 초기화
- 의존성: models.py와 결합되어 DB 스키마 및 데이터 접근 계층을 형성

#### /api/seed.py
- 용도: 초기 데이터 시딩 로직
- 주요 기능: 개발/테스트를 위한 기본 데이터 입력 작업 수행
- 의존성: models.py를 통해 정의된 테이블 구조 및 db.py의 DB 연결 설정에 의존

#### /api/uploads/
- 용도: 업로드된 이미지 파일 저장소
- 주요 기능: 백엔드에서 처리된 이미지 파일의 물리적 보관 위치
- 의존성: 이미지 업로드 API 또는 관련 서비스 로직과 연계

## 2. Frontend (Vue 3)

### /src/
- 역할: Vue 3 기반 프론트엔드 애플리케이션의 핵심 소스 디렉토리
- 주요 의존성: Vue 3, Vue Router, Vite
- 의존성 관계: main.ts → App.vue → router/ 및 pages/·components/·composables/·lib/로 분기

#### /src/components/
- 용도: 재사용 가능한 UI 컴포넌트 모음
- 주요 기능: 페이지나 레이아웃에서 반복적으로 사용되는 UI 구성 요소 제공
- 의존성: 각 페이지(pages/) 및 App.vue에서 조합 사용

##### /src/components/AppHeader.vue
- 용도: 상단 네비게이션 바 구성
- 주요 기능: 전역 헤더 UI 제공
- 의존성: vue, vue-router, useCartStore, useAdminStore, lucide-vue-next

##### /src/components/Empty.vue
- 용도: 플레이스홀더/테스트용 빈 컴포넌트
- 주요 기능: 단순 빈 UI 렌더링
- 의존성: 없음

##### /src/components/ImageGallery.vue
- 용도: 상품 이미지 갤러리 표시
- 주요 기능: 썸네일 목록과 선택된 메인 이미지 표시
- 의존성: vue, lib/types.ts

##### /src/components/ProductCard.vue
- 용도: 상품 요약 카드 UI
- 주요 기능: 상품 목록에서 요약 정보를 시각화
- 의존성: vue, vue-router, lib/types.ts

##### /src/components/ProductionStepsAdmin.vue
- 용도: 제작 단계 관리(관리자용)
- 주요 기능: 단계 추가/수정/삭제, 순서 변경, 사진 업로드/삭제
- 의존성: vue, lib/api.ts, lib/types.ts, lucide-vue-next

##### /src/components/ProductionStepsTimeline.vue
- 용도: 제작 단계 타임라인 표시(사용자용)
- 주요 기능: 단계 메모/사진 표시, 사진 확대 모달
- 의존성: vue, lib/types.ts

##### /src/components/RatingStars.vue
- 용도: 별점 표시 컴포넌트
- 주요 기능: 평점 정보를 시각적 별점으로 표시
- 의존성: vue, lucide-vue-next

##### /src/components/ReviewForm.vue
- 용도: 리뷰 작성 폼
- 주요 기능: 입력 검증, 리뷰 생성 API 호출, 작성 완료 이벤트 emit
- 의존성: vue, lib/api.ts, lib/types.ts

##### /src/components/ReviewList.vue
- 용도: 리뷰 목록 표시
- 주요 기능: 작성자/작성일/평점/내용 렌더링
- 의존성: vue, lib/types.ts, RatingStars.vue

##### /src/components/SellerCard.vue
- 용도: 판매자 정보 카드 UI
- 주요 기능: 판매자 프로필/평점 표시, 간략 모드 지원
- 의존성: vue, lib/types.ts, RatingStars.vue

#### /src/composables/
- 용도: 전역 상태 관리 및 공통 로직 캡슐화
- 주요 기능: Vue Composables 패턴을 사용한 상태/로직 공유
- 의존성: 페이지 및 컴포넌트에서 상태를 주입받아 사용

##### /src/composables/useCartStore.ts
- 용도: 장바구니 상태 및 로직 관리
- 주요 기능: 장바구니 항목 추가/삭제, 수량 변경 등 상태 관리
- 의존성: pages/CartPage.vue 및 Product 관련 UI와 연계

##### /src/composables/useAdminStore.ts
- 용도: 관리자 인증 상태 관리
- 주요 기능: 관리자 로그인/권한 관련 상태 유지
- 의존성: Admin*.vue 페이지와 라우팅 가드에서 사용될 수 있음

##### /src/composables/useTheme.ts
- 용도: 다크 모드 테마 관리
- 주요 기능: 테마 전환 및 상태 유지
- 의존성: App.vue 또는 전역 레이아웃에서 적용

#### /src/lib/
- 용도: 공통 유틸리티와 타입 정의
- 주요 기능: API 호출 모듈 및 타입스크립트 인터페이스 제공
- 의존성: components/, pages/, composables/에서 범용적으로 사용

##### /src/lib/api.ts
- 용도: 백엔드 API 호출 함수 모음
- 주요 기능: HTTP 요청 래핑 및 API 엔드포인트 호출
- 의존성: 백엔드(api/)의 엔드포인트 구조와 계약에 의존

##### /src/lib/types.ts
- 용도: TypeScript 인터페이스 정의
- 주요 기능: 프론트 전역에서 공유되는 타입 정의
- 의존성: API 응답 모델 및 UI 데이터 구조 전반에 연계

#### /src/pages/
- 용도: 라우트 단위의 페이지 컴포넌트 모음
- 주요 기능: 화면별 UI 및 데이터 로딩 로직 구현
- 의존성: router/에서 라우트로 연결되며, components/·composables/·lib/ 사용

##### /src/pages/HomePage.vue
- 용도: 메인/상품 목록 페이지
- 주요 기능: 상품 목록 표시, 상품 카드 구성
- 의존성: ProductCard.vue, api.ts

##### /src/pages/ProductPage.vue
- 용도: 상품 상세 페이지
 - 주요 기능: 상품 상세/판매자/리뷰/주문 이력 로드, 장바구니 추가, 관리자 수정/삭제
 - 의존성: ImageGallery.vue, SellerCard.vue, ReviewList.vue, ReviewForm.vue, useCartStore, useAdminStore, api.ts, types.ts

##### /src/pages/CartPage.vue
- 용도: 장바구니/주문결제 페이지
 - 주요 기능: 장바구니 아이템 관리, 주문자 정보 입력, 주문 생성 및 로컬 저장
 - 의존성: useCartStore.ts, vue-router

##### /src/pages/OrdersPage.vue
- 용도: 내 주문 목록 페이지
- 주요 기능: 로컬 스토리지 기반 주문 목록 조회, 주문 ID 추가/삭제
- 의존성: api.ts, vue-router

##### /src/pages/OrderDetailPage.vue
- 용도: 주문 상세 페이지(공개용)
- 주요 기능: 주문 상세 정보 표시, 제작 단계 타임라인, 리뷰 작성
- 의존성: ProductionStepsTimeline.vue, ReviewForm.vue, api.ts, vue-router

##### /src/pages/SellerPage.vue
- 용도: 판매자 프로필 페이지
- 주요 기능: 판매자 정보 및 최신 상품 표시
- 의존성: SellerCard.vue, ProductCard.vue, api.ts

##### /src/pages/AdminLoginPage.vue
- 용도: 관리자 로그인 페이지
- 주요 기능: 비밀번호 인증, 오류 메시지 처리, 로그인 후 이동
- 의존성: useAdminStore.ts, api.ts(ApiError), vue-router

##### /src/pages/AdminProductsPage.vue
- 용도: 관리자 상품 목록 페이지
- 주요 기능: 전시여부 필터 조회, 상품 수정/등록 이동
- 의존성: api.ts, vue-router

##### /src/pages/AdminProductNewPage.vue
- 용도: 관리자 상품 등록 페이지
- 주요 기능: 상품 정보 입력, 이미지 업로드, Tiptap 상세 설명 작성, 등록 API 호출
- 의존성: api.ts, vue-router, @tiptap/vue-3, @tiptap/starter-kit, @tiptap/extension-image

##### /src/pages/AdminProductEditPage.vue
- 용도: 관리자 상품 수정 페이지
- 주요 기능: 상품 로드/수정, 이미지 관리, Tiptap 상세 설명 편집, 상품 삭제
- 의존성: api.ts, vue-router, @tiptap/vue-3, @tiptap/starter-kit, @tiptap/extension-image

##### /src/pages/AdminOrdersPage.vue
- 용도: 관리자 주문 목록 페이지
- 주요 기능: 주문 검색/필터링, 페이지네이션, 상태 배지 표시, 상세 이동
- 의존성: api.ts, vue-router, lib/types.ts

##### /src/pages/AdminOrderDetailPage.vue
- 용도: 관리자 주문 상세 페이지
- 주요 기능: 주문 상세 조회, 상태 변경, 제작 단계 관리, 변경 이력 표시
- 의존성: ProductionStepsAdmin.vue, api.ts, vue-router, lib/types.ts

#### /src/router/
- 용도: Vue Router 설정
- 주요 기능: 라우팅 경로 정의 및 페이지 연결
- 의존성: pages/의 각 페이지 컴포넌트와 연결

#### /src/App.vue
- 용도: 루트 컴포넌트
- 주요 기능: 전역 레이아웃 구성 및 공통 UI 배치
- 의존성: AppHeader.vue 및 router-view 구성요소와 연결

#### /src/main.ts
- 용도: 앱 진입점
- 주요 기능: Vue 애플리케이션 초기화 및 마운트
- 의존성: App.vue 및 router/ 설정을 초기화하여 연결

## 3. 프로젝트 루트 파일

### /requirements.txt
- 용도: Python 의존성 목록
- 주요 기능: 백엔드(FastAPI, SQLModel, Pydantic 등) 환경 구성
- 의존성: api/ 디렉토리의 실행 환경에 필요

### /package.json
- 용도: Node.js 의존성 및 스크립트 정의
- 주요 기능: 프론트엔드(Vue 3, Vite 등) 의존성 및 빌드/개발 스크립트 관리
- 의존성: src/ 디렉토리의 실행 및 빌드 환경에 필요

### /vite.config.ts
- 용도: Vite 빌드 설정
- 주요 기능: 개발 서버 및 번들링 설정
- 의존성: src/ 기반 프론트엔드 빌드 파이프라인에 필요
