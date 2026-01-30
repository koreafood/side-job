export type Seller = {
  id: string
  name: string
  bio: string
  avatarUrl: string
  ratingAvg: number
  ratingCount: number
}

export type ProductImage = {
  id: string
  url: string
  sort: number
}

export type Product = {
  id: string
  sellerId: string
  sellerName: string
  name: string
  description: string
  detailsHtml: string
  priceJpy: number
  images: ProductImage[]
}

export type Review = {
  id: string
  productId: string
  authorName: string
  rating: number
  body: string
  createdAt: string
}

export type CartItem = {
  id: string
  product: Product
  qty: number
}

export type Cart = {
  id: string
  items: CartItem[]
}

export type Order = {
  id: string
  totalJpy: number
  createdAt: string
}

export type ProductionStepPhoto = {
  id: string
  url: string
  sort: number
}

export type ProductionStep = {
  id: string
  stepIndex: number
  memo: string
  createdAt: string
  updatedAt: string
  photos: ProductionStepPhoto[]
}

export type AdminOrderStatus =
  | 'pending'
  | 'paid'
  | 'preparing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded'

export type AdminPaymentStatus = 'unpaid' | 'paid' | 'refunded'
export type AdminShippingStatus = 'none' | 'preparing' | 'shipped' | 'delivered'

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

export type AdminOrderList = {
  items: AdminOrderSummary[]
  total: number
  page: number
  pageSize: number
}

export type AdminOrderItem = {
  id: string
  productId: string
  productName: string
  unitPriceJpy: number
  qty: number
  lineTotalJpy: number
}

export type AdminOrderHistory = {
  id: string
  prevStatus: AdminOrderStatus
  nextStatus: AdminOrderStatus
  reason: string
  changedBy: string
  changedAt: string
}

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

export type PublicOrderDetail = {
  id: string
  orderNo: string
  orderedAt: string
  totalJpy: number
  orderStatus: AdminOrderStatus
  productionSteps: ProductionStep[]
}

export type ProductOrderSummary = {
  id: string
  orderNo: string
  orderedAt: string
  totalJpy: number
  orderStatus: AdminOrderStatus
}
