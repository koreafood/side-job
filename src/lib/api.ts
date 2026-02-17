/**
 * 파일 역할: API 클라이언트 모듈
 * 
 * 주요 기능:
 * 1. 백엔드 API와의 통신 담당 (fetch wrapper)
 * 2. API 엔드포인트별 메서드 제공 (상품, 주문, 관리자 기능 등)
 * 3. 공통 에러 핸들링 (ApiError 클래스) 및 타입 처리
 * 
 * 의존성:
 * - @/lib/types.ts: 데이터 타입 정의
 */
import type {
  AdminOrderDetail,
  AdminOrderList,
  Cart,
  Order,
  Product,
  ProductOrderSummary,
  PublicOrderDetail,
  Review,
  Seller,
  ProductionStep,
  AdminSession,
} from '@/lib/types'

/** API 에러 응답 본문 타입 */
type ApiErrorBody = {
  detail?: unknown
}

/**
 * API 호출 에러 클래스
 * - 목적: API 호출 실패 시 상태 코드와 에러 본문을 포함하여 에러를 발생시킴
 */
export class ApiError extends Error {
  status: number
  body: unknown

  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.status = status
    this.body = body
  }
}

/**
 * 공통 API Fetch 헬퍼 함수
 * - 목적: fetch API를 래핑하여 JSON 파싱, 에러 처리, 인증(쿠키) 처리를 자동화
 * - 입력:
 *   - path (string): API 엔드포인트 경로
 *   - init (RequestInit): fetch 옵션 (메서드, 헤더, 바디 등)
 * - 출력: Promise<T> (제네릭 타입 T로 파싱된 응답 데이터)
 * - 예외 처리:
 *   - HTTP 상태 코드가 200-299가 아니면 ApiError 발생
 *   - 네트워크 오류 시 기본 fetch 에러 발생
 * - 비즈니스 로직:
 *   - 쿠키(credentials: 'include') 자동 포함
 *   - FormData가 아닌 경우 Content-Type: application/json 자동 설정
 *   - 204 No Content 처리 (undefined 반환)
 */
async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const isFormData = init?.body instanceof FormData
  const res = await fetch(path, {
    credentials: 'include',
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(init?.headers ?? {}),
    },
    ...init,
  })

  if (!res.ok) {
    let body: ApiErrorBody | string | undefined
    try {
      body = (await res.json()) as ApiErrorBody
    } catch {
      try {
        body = await res.text()
      } catch {
        body = undefined
      }
    }
    throw new ApiError(`API 요청 실패: ${res.status}`, res.status, body)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

/**
 * API 메서드 객체
 * - 각 API 엔드포인트에 대응하는 함수들을 제공
 */
export const api = {
  /** 
   * 서버 상태 확인 
   * - 반환: { ok: true }
   */
  health: () => apiFetch<{ ok: true }>('/api/health'),

  /** 
   * 상품 목록 조회 
   * - 입력: query (검색어)
   * - 반환: Product[]
   */
  listProducts: (query?: string) =>
    apiFetch<Product[]>(`/api/products${query ? `?query=${encodeURIComponent(query)}` : ''}`),

  /** 
   * 관리자 세션 확인 
   * - 반환: AdminSession
   */
  getAdminSession: () => apiFetch<AdminSession>('/api/admin/session'),

  /** 
   * 관리자 로그인 
   * - 입력: password
   * - 반환: AdminSession
   */
  loginAdmin: (password: string) =>
    apiFetch<AdminSession>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),

  /** 
   * 상품 상세 조회 
   * - 입력: id
   * - 반환: Product
   */
  getProduct: (id: string) => apiFetch<Product>(`/api/products/${encodeURIComponent(id)}`),

  /** 
   * 판매자 목록 조회 
   * - 반환: Seller[]
   */
  listSellers: () => apiFetch<Seller[]>('/api/sellers'),

  /** 
   * 판매자 상세 조회 
   * - 입력: id
   * - 반환: Seller
   */
  getSeller: (id: string) => apiFetch<Seller>(`/api/sellers/${encodeURIComponent(id)}`),

  /** 
   * 판매자 상품 목록 조회 
   * - 입력: sellerId, limit
   * - 반환: Product[]
   */
  listSellerProducts: (sellerId: string, limit = 6) =>
    apiFetch<Product[]>(
      `/api/sellers/${encodeURIComponent(sellerId)}/products?limit=${encodeURIComponent(String(limit))}`,
    ),

  /** 
   * (관리자) 상품 생성 
   * - 입력: 상품 정보 객체
   * - 반환: Product
   */
  createAdminProduct: (input: {
    sellerId: string
    name: string
    description: string
    detailsHtml?: string
    packagingFee: number
    basePrice: number
    addPrice: number
    images: { url: string; sort: number }[]
    published?: boolean
  }) =>
    apiFetch<Product>('/api/admin/products', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  /** 
   * (관리자) 상품 수정 
   * - 입력: productId, 수정할 정보
   * - 반환: Product
   */
  updateAdminProduct: (
    productId: string,
    input: {
      sellerId: string
      name: string
      description: string
      detailsHtml?: string
      packagingFee: number
      basePrice: number
      addPrice: number
      images: { url: string; sort: number }[]
      published?: boolean
    },
  ) =>
    apiFetch<Product>(`/api/admin/products/${encodeURIComponent(productId)}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),

  /** 
   * (관리자) 상품 삭제 
   * - 입력: productId
   * - 반환: void
   */
  deleteAdminProduct: (productId: string) =>
    apiFetch<void>(`/api/admin/products/${encodeURIComponent(productId)}`, { method: 'DELETE' }),

  /** 
   * (관리자) 주문 목록 조회 
   * - 입력: 검색 조건 (q, 날짜, 상태, 페이징)
   * - 반환: AdminOrderList
   */
  listAdminOrders: (params: {
    q?: string
    fromDate?: string
    toDate?: string
    orderStatus?: string
    paymentStatus?: string
    shippingStatus?: string
    page?: number
    pageSize?: number
  }) => {
    const sp = new URLSearchParams()
    if (params.q) sp.set('q', params.q)
    if (params.fromDate) sp.set('fromDate', params.fromDate)
    if (params.toDate) sp.set('toDate', params.toDate)
    if (params.orderStatus) sp.set('orderStatus', params.orderStatus)
    if (params.paymentStatus) sp.set('paymentStatus', params.paymentStatus)
    if (params.shippingStatus) sp.set('shippingStatus', params.shippingStatus)
    if (params.page) sp.set('page', String(params.page))
    if (params.pageSize) sp.set('pageSize', String(params.pageSize))
    const qs = sp.toString()
    return apiFetch<AdminOrderList>(`/api/admin/orders${qs ? `?${qs}` : ''}`)
  },

  /** 
   * (관리자) 주문 상세 조회 
   * - 입력: orderId
   * - 반환: AdminOrderDetail
   */
  getAdminOrder: (orderId: string) =>
    apiFetch<AdminOrderDetail>(`/api/admin/orders/${encodeURIComponent(orderId)}`),

  /** 
   * (관리자) 주문 상태 변경 
   * - 입력: orderId, nextStatus, reason
   * - 반환: AdminOrderDetail
   */
  changeAdminOrderStatus: (orderId: string, input: { nextStatus: string; reason?: string }) =>
    apiFetch<AdminOrderDetail>(`/api/admin/orders/${encodeURIComponent(orderId)}/status`, {
      method: 'POST',
      body: JSON.stringify({ nextStatus: input.nextStatus, reason: input.reason ?? '' }),
    }),

  /** 
   * (관리자) 제작 과정 단계 생성 
   * - 입력: orderId, memo
   * - 반환: ProductionStep[]
   */
  createProductionStep: (orderId: string, input: { memo: string }) =>
    apiFetch<ProductionStep[]>(`/api/admin/orders/${encodeURIComponent(orderId)}/production-steps`, {
      method: 'POST',
      body: JSON.stringify({ memo: input.memo }),
    }),

  /** 
   * (관리자) 제작 과정 단계 수정 
   * - 입력: stepId, memo
   * - 반환: ProductionStep[]
   */
  updateProductionStep: (stepId: string, input: { memo: string }) =>
    apiFetch<ProductionStep[]>(`/api/admin/production-steps/${encodeURIComponent(stepId)}`, {
      method: 'PUT',
      body: JSON.stringify({ memo: input.memo }),
    }),

  /** 
   * (관리자) 제작 과정 단계 순서 이동 
   * - 입력: stepId, direction
   * - 반환: ProductionStep[]
   */
  moveProductionStep: (stepId: string, input: { direction: 'up' | 'down' }) =>
    apiFetch<ProductionStep[]>(`/api/admin/production-steps/${encodeURIComponent(stepId)}/move`, {
      method: 'POST',
      body: JSON.stringify({ direction: input.direction }),
    }),

  /** 
   * (관리자) 제작 과정 단계 삭제 
   * - 입력: stepId
   * - 반환: ProductionStep[]
   */
  deleteProductionStep: (stepId: string) =>
    apiFetch<ProductionStep[]>(`/api/admin/production-steps/${encodeURIComponent(stepId)}`, {
      method: 'DELETE',
    }),

  /** 
   * (관리자) 제작 과정 사진 추가 
   * - 입력: stepId, url
   * - 반환: ProductionStep[]
   */
  addProductionStepPhoto: (stepId: string, input: { url: string }) =>
    apiFetch<ProductionStep[]>(`/api/admin/production-steps/${encodeURIComponent(stepId)}/photos`, {
      method: 'POST',
      body: JSON.stringify({ url: input.url }),
    }),

  /** 
   * (관리자) 제작 과정 사진 순서 이동 
   * - 입력: photoId, direction
   * - 반환: ProductionStep[]
   */
  moveProductionStepPhoto: (photoId: string, input: { direction: 'up' | 'down' }) =>
    apiFetch<ProductionStep[]>(`/api/admin/production-step-photos/${encodeURIComponent(photoId)}/move`, {
      method: 'POST',
      body: JSON.stringify({ direction: input.direction }),
    }),

  /** 
   * (관리자) 제작 과정 사진 삭제 
   * - 입력: photoId
   * - 반환: ProductionStep[]
   */
  deleteProductionStepPhoto: (photoId: string) =>
    apiFetch<ProductionStep[]>(`/api/admin/production-step-photos/${encodeURIComponent(photoId)}`, {
      method: 'DELETE',
    }),

  /** 
   * 공개 주문 조회 (고객용) 
   * - 입력: orderId
   * - 반환: PublicOrderDetail
   */
  getPublicOrder: (orderId: string) =>
    apiFetch<PublicOrderDetail>(`/api/orders/${encodeURIComponent(orderId)}`),

  listRecentOrders: () => apiFetch<ProductOrderSummary[]>('/api/orders/recent'),

  /** 
   * 공개 제작 과정 조회 (고객용) 
   * - 입력: orderId
   * - 반환: ProductionStep[]
   */
  listPublicProductionSteps: (orderId: string) =>
    apiFetch<ProductionStep[]>(`/api/orders/${encodeURIComponent(orderId)}/production-steps`),

  /** 
   * 상품별 주문 요약 목록 조회 
   * - 입력: productId
   * - 반환: ProductOrderSummary[]
   */
  listProductOrders: (productId: string) =>
    apiFetch<ProductOrderSummary[]>(`/api/products/${encodeURIComponent(productId)}/orders`),

  /** 
   * (관리자) 이미지 업로드 
   * - 입력: File 객체
   * - 반환: 업로드된 이미지 정보
   */
  uploadAdminImage: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return apiFetch<{ url: string; filename: string; contentType: string }>('/api/admin/uploads', {
      method: 'POST',
      body: fd,
    })
  },

  /** 
   * 리뷰 목록 조회 
   * - 입력: productId
   * - 반환: Review[]
   */
  listReviews: (productId: string) =>
    apiFetch<Review[]>(`/api/products/${encodeURIComponent(productId)}/reviews`),

  /** 
   * 리뷰 작성 
   * - 입력: productId, 리뷰 내용
   * - 반환: Review
   */
  createReview: (
    productId: string,
    input: { authorName: string; rating: number; body: string; orderId: string; phoneLast4: string },
  ) =>
    apiFetch<Review>(`/api/products/${encodeURIComponent(productId)}/reviews`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  /** 
   * 장바구니 조회 
   * - 반환: Cart
   */
  getCart: () => apiFetch<Cart>('/api/cart'),

  /** 
   * 장바구니 추가 
   * - 입력: productId, qty
   * - 반환: Cart
   */
  addToCart: (productId: string, qty: number) =>
    apiFetch<Cart>('/api/cart/items', {
      method: 'POST',
      body: JSON.stringify({ productId, qty }),
    }),

  /** 
   * 장바구니 수량 변경 
   * - 입력: itemId, qty
   * - 반환: Cart
   */
  updateCartItemQty: (itemId: string, qty: number) =>
    apiFetch<Cart>(`/api/cart/items/${encodeURIComponent(itemId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ qty }),
    }),

  /** 
   * 장바구니 삭제 
   * - 입력: itemId
   * - 반환: Cart
   */
  removeCartItem: (itemId: string) =>
    apiFetch<Cart>(`/api/cart/items/${encodeURIComponent(itemId)}`, { method: 'DELETE' }),

  /** 
   * 주문 생성 
   * - 입력: 주문자 및 배송 정보
   * - 반환: Order
   */
  createOrder: (input: {
    customerName: string
    customerPhone: string
    shippingAddress: string
    shippingAddress2?: string
    recipientName: string
    shippingMemo?: string
  }) =>
    apiFetch<Order>('/api/orders', {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  listAdminProducts: (params?: { published?: 'all' | 'true' | 'false' }) => {
    const v = params?.published ?? 'all'
    const qs = new URLSearchParams({ published: v }).toString()
    return apiFetch<Product[]>(`/api/admin/products${qs ? `?${qs}` : ''}`)
  },
}
