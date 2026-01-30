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

type ApiErrorBody = {
  detail?: unknown
}

export class ApiError extends Error {
  status: number
  body: unknown

  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.status = status
    this.body = body
  }
}

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

export const api = {
  health: () => apiFetch<{ ok: true }>('/api/health'),
  listProducts: (query?: string) =>
    apiFetch<Product[]>(`/api/products${query ? `?query=${encodeURIComponent(query)}` : ''}`),
  getAdminSession: () => apiFetch<AdminSession>('/api/admin/session'),
  loginAdmin: (password: string) =>
    apiFetch<AdminSession>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }),
  getProduct: (id: string) => apiFetch<Product>(`/api/products/${encodeURIComponent(id)}`),
  listSellers: () => apiFetch<Seller[]>('/api/sellers'),
  getSeller: (id: string) => apiFetch<Seller>(`/api/sellers/${encodeURIComponent(id)}`),
  listSellerProducts: (sellerId: string, limit = 6) =>
    apiFetch<Product[]>(
      `/api/sellers/${encodeURIComponent(sellerId)}/products?limit=${encodeURIComponent(String(limit))}`,
    ),
  createAdminProduct: (input: {
    sellerId: string
    name: string
    description: string
    detailsHtml?: string
    priceJpy: number
    images: { url: string; sort: number }[]
  }) =>
    apiFetch<Product>('/api/admin/products', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  updateAdminProduct: (
    productId: string,
    input: {
      sellerId: string
      name: string
      description: string
      detailsHtml?: string
      priceJpy: number
      images: { url: string; sort: number }[]
    },
  ) =>
    apiFetch<Product>(`/api/admin/products/${encodeURIComponent(productId)}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  deleteAdminProduct: (productId: string) =>
    apiFetch<void>(`/api/admin/products/${encodeURIComponent(productId)}`, { method: 'DELETE' }),
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
  getAdminOrder: (orderId: string) =>
    apiFetch<AdminOrderDetail>(`/api/admin/orders/${encodeURIComponent(orderId)}`),
  changeAdminOrderStatus: (orderId: string, input: { nextStatus: string; reason?: string }) =>
    apiFetch<AdminOrderDetail>(`/api/admin/orders/${encodeURIComponent(orderId)}/status`, {
      method: 'POST',
      body: JSON.stringify({ nextStatus: input.nextStatus, reason: input.reason ?? '' }),
    }),
  createProductionStep: (orderId: string, input: { memo: string }) =>
    apiFetch<ProductionStep[]>(`/api/admin/orders/${encodeURIComponent(orderId)}/production-steps`, {
      method: 'POST',
      body: JSON.stringify({ memo: input.memo }),
    }),
  updateProductionStep: (stepId: string, input: { memo: string }) =>
    apiFetch<ProductionStep[]>(`/api/admin/production-steps/${encodeURIComponent(stepId)}`, {
      method: 'PUT',
      body: JSON.stringify({ memo: input.memo }),
    }),
  moveProductionStep: (stepId: string, input: { direction: 'up' | 'down' }) =>
    apiFetch<ProductionStep[]>(`/api/admin/production-steps/${encodeURIComponent(stepId)}/move`, {
      method: 'POST',
      body: JSON.stringify({ direction: input.direction }),
    }),
  deleteProductionStep: (stepId: string) =>
    apiFetch<ProductionStep[]>(`/api/admin/production-steps/${encodeURIComponent(stepId)}`, {
      method: 'DELETE',
    }),
  addProductionStepPhoto: (stepId: string, input: { url: string }) =>
    apiFetch<ProductionStep[]>(`/api/admin/production-steps/${encodeURIComponent(stepId)}/photos`, {
      method: 'POST',
      body: JSON.stringify({ url: input.url }),
    }),
  moveProductionStepPhoto: (photoId: string, input: { direction: 'up' | 'down' }) =>
    apiFetch<ProductionStep[]>(`/api/admin/production-step-photos/${encodeURIComponent(photoId)}/move`, {
      method: 'POST',
      body: JSON.stringify({ direction: input.direction }),
    }),
  deleteProductionStepPhoto: (photoId: string) =>
    apiFetch<ProductionStep[]>(`/api/admin/production-step-photos/${encodeURIComponent(photoId)}`, {
      method: 'DELETE',
    }),
  getPublicOrder: (orderId: string) =>
    apiFetch<PublicOrderDetail>(`/api/orders/${encodeURIComponent(orderId)}`),
  listPublicProductionSteps: (orderId: string) =>
    apiFetch<ProductionStep[]>(`/api/orders/${encodeURIComponent(orderId)}/production-steps`),
  listProductOrders: (productId: string) =>
    apiFetch<ProductOrderSummary[]>(`/api/products/${encodeURIComponent(productId)}/orders`),
  uploadAdminImage: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return apiFetch<{ url: string; filename: string; contentType: string }>('/api/admin/uploads', {
      method: 'POST',
      body: fd,
    })
  },
  listReviews: (productId: string) =>
    apiFetch<Review[]>(`/api/products/${encodeURIComponent(productId)}/reviews`),
  createReview: (productId: string, input: { authorName: string; rating: number; body: string }) =>
    apiFetch<Review>(`/api/products/${encodeURIComponent(productId)}/reviews`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  getCart: () => apiFetch<Cart>('/api/cart'),
  addToCart: (productId: string, qty: number) =>
    apiFetch<Cart>('/api/cart/items', {
      method: 'POST',
      body: JSON.stringify({ productId, qty }),
    }),
  updateCartItemQty: (itemId: string, qty: number) =>
    apiFetch<Cart>(`/api/cart/items/${encodeURIComponent(itemId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ qty }),
    }),
  removeCartItem: (itemId: string) =>
    apiFetch<Cart>(`/api/cart/items/${encodeURIComponent(itemId)}`, { method: 'DELETE' }),
  createOrder: (input: {
    customerName: string
    customerPhone: string
    shippingAddress: string
    recipientName: string
    shippingMemo?: string
  }) =>
    apiFetch<Order>('/api/orders', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
}
