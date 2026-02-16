import { computed, reactive } from 'vue'
import { api } from '@/lib/api'
import type { Cart } from '@/lib/types'

type CartStatus = 'idle' | 'loading' | 'ready' | 'error'

const MAX_CART_ITEMS = 5

const state = reactive<{
  status: CartStatus
  cart: Cart | null
  error: string | null
}>({
  status: 'idle',
  cart: null,
  error: null,
})

const getTotalQty = () => state.cart?.items.reduce((acc, it) => acc + it.qty, 0) ?? 0

async function refresh() {
  state.status = 'loading'
  state.error = null
  try {
    state.cart = await api.getCart()
    state.status = 'ready'
  } catch (e) {
    state.status = 'error'
    state.error = e instanceof Error ? e.message : '장바구니를 불러오지 못했어요.'
  }
}

async function add(productId: string, qty = 1) {
  state.error = null
  const remaining = MAX_CART_ITEMS - getTotalQty()
  if (remaining <= 0) {
    state.status = 'ready'
    state.error = '장바구니에는 최대 5개까지만 담을 수 있어요.'
    return
  }
  const nextQty = Math.min(qty, remaining)
  if (nextQty < qty) {
    state.error = '장바구니에는 최대 5개까지만 담을 수 있어요.'
  }
  try {
    state.cart = await api.addToCart(productId, nextQty)
    state.status = 'ready'
  } catch (e) {
    state.status = 'error'
    state.error = e instanceof Error ? e.message : '장바구니 담기에 실패했어요.'
  }
}

async function setQty(itemId: string, qty: number) {
  state.error = null
  const item = state.cart?.items.find((it) => it.id === itemId)
  const baseTotal = getTotalQty() - (item?.qty ?? 0)
  const remaining = MAX_CART_ITEMS - baseTotal
  if (remaining <= 0) {
    state.status = 'ready'
    state.error = '장바구니에는 최대 5개까지만 담을 수 있어요.'
    return
  }
  const nextQty = Math.max(1, Math.min(qty, remaining))
  if (nextQty < qty) {
    state.error = '장바구니에는 최대 5개까지만 담을 수 있어요.'
  }
  if (item && nextQty === item.qty) {
    state.status = 'ready'
    return
  }
  try {
    state.cart = await api.updateCartItemQty(itemId, nextQty)
    state.status = 'ready'
  } catch (e) {
    state.status = 'error'
    state.error = e instanceof Error ? e.message : '수량 변경에 실패했어요.'
  }
}

async function remove(itemId: string) {
  state.error = null
  try {
    state.cart = await api.removeCartItem(itemId)
    state.status = 'ready'
  } catch (e) {
    state.status = 'error'
    state.error = e instanceof Error ? e.message : '삭제에 실패했어요.'
  }
}

async function checkout(input: {
  customerName: string
  customerPhone: string
  shippingAddress: string
  recipientName: string
  shippingMemo?: string
}) {
  state.error = null
  try {
    const order = await api.createOrder(input)
    await refresh()
    return order
  } catch (e) {
    state.status = 'error'
    state.error = e instanceof Error ? e.message : '주문 생성에 실패했어요.'
    return null
  }
}

export function useCartStore() {
  const itemCount = computed(() => state.cart?.items.reduce((acc, it) => acc + it.qty, 0) ?? 0)
  
  const totalJpy = computed(
    () =>
      state.cart?.items.reduce((acc, it) => acc + it.qty * it.product.priceJpy, 0) ?? 0,
  )

  return {
    state,
    itemCount,
    totalJpy,
    refresh,
    add,
    setQty,
    remove,
    checkout,
  }
}
