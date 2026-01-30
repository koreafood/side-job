/**
 * 공통 타입 정의 모듈
 * - 역할: 프론트엔드 전반에서 사용되는 데이터 인터페이스 및 타입 정의
 * - 주요 타입: Product, Order, Cart, Review, Seller 등
 * - 의존성: 없음
 */

/**
 * 판매자 정보 타입
 */
export type Seller = {
  id: string
  name: string
  bio: string
  avatarUrl: string
  ratingAvg: number
  ratingCount: number
}

/**
 * 상품 이미지 정보 타입
 */
export type ProductImage = {
  id: string
  url: string
  sort: number // 정렬 순서
}

/**
 * 상품 정보 타입
 */
export type Product = {
  id: string
  sellerId: string
  sellerName: string
  name: string
  description: string
  detailsHtml: string
  priceJpy: number
  images: ProductImage[]
  published: boolean
}

/**
 * 관리자 세션 정보 타입
 */
export type AdminSession = {
  isAdmin: boolean
}

/**
 * 리뷰 정보 타입
 */
export type Review = {
  id: string
  productId: string
  authorName: string
  rating: number
  body: string
  createdAt: string
}

/**
 * 장바구니 아이템 타입
 */
export type CartItem = {
  id: string
  product: Product
  qty: number
}

/**
 * 장바구니 타입
 */
export type Cart = {
  id: string
  items: CartItem[]
}

/**
 * 주문 기본 정보 타입
 */
export type Order = {
  id: string
  totalJpy: number
  createdAt: string
}

/**
 * 제작 과정 사진 타입
 */
export type ProductionStepPhoto = {
  id: string
  url: string
  sort: number
}

/**
 * 제작 과정 단계 타입
 */
export type ProductionStep = {
  id: string
  stepIndex: number
  memo: string
  createdAt: string
  updatedAt: string
  photos: ProductionStepPhoto[]
}

/**
 * 관리자 주문 상태 Enum
 */
export type AdminOrderStatus =
  | 'pending' // 주문 대기
  | 'paid' // 결제 완료
  | 'preparing' // 준비 중
  | 'shipped' // 배송 중
  | 'delivered' // 배송 완료
  | 'cancelled' // 취소됨
  | 'refunded' // 환불됨

/**
 * 관리자 결제 상태 Enum
 */
export type AdminPaymentStatus = 'unpaid' | 'paid' | 'refunded'

/**
 * 관리자 배송 상태 Enum
 */
export type AdminShippingStatus = 'none' | 'preparing' | 'shipped' | 'delivered'

/**
 * 관리자 주문 요약 정보 타입 (목록용)
 */
export type AdminOrderSummary = {
  id: string
  orderNo: string
  orderedAt: string
  customerName: string
  customerPhone: string
  totalJpy: number
  orderStatus: AdminOrderStatus
  paymentStatus: AdminPaymentStatus
  shippingStatus: AdminShippingStatus
}

/**
 * 관리자 주문 목록 응답 타입 (페이지네이션 포함)
 */
export type AdminOrderList = {
  items: AdminOrderSummary[]
  total: number
  page: number
  pageSize: number
}

/**
 * 관리자 주문 상품 아이템 타입
 */
export type AdminOrderItem = {
  id: string
  productId: string
  productName: string
  unitPriceJpy: number
  qty: number
  lineTotalJpy: number
}

/**
 * 관리자 주문 이력 타입
 */
export type AdminOrderHistory = {
  id: string
  prevStatus: AdminOrderStatus
  nextStatus: AdminOrderStatus
  reason: string
  changedBy: string
  changedAt: string
}

/**
 * 관리자 주문 상세 정보 타입
 */
export type AdminOrderDetail = {
  id: string
  orderNo: string
  orderedAt: string
  customerName: string
  customerPhone: string
  recipientName: string
  recipientPhone: string
  shippingAddress1: string
  shippingAddress2: string
  shippingMemo: string
  totalJpy: number
  orderStatus: AdminOrderStatus
  paymentStatus: AdminPaymentStatus
  shippingStatus: AdminShippingStatus
  items: AdminOrderItem[]
  history: AdminOrderHistory[]
  productionSteps: ProductionStep[]
}

/**
 * 공개 주문 상세 정보 타입 (고객 조회용)
 */
export type PublicOrderDetail = {
  id: string
  orderNo: string
  orderedAt: string
  totalJpy: number
  orderStatus: AdminOrderStatus
  productionSteps: ProductionStep[]
}

/**
 * 상품별 주문 요약 정보 타입
 */
export type ProductOrderSummary = {
  id: string
  orderNo: string
  orderedAt: string
  totalJpy: number
  orderStatus: AdminOrderStatus
}
