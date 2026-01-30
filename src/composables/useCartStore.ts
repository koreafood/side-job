import { computed, reactive } from 'vue'
import { api } from '@/lib/api'
import type { Cart } from '@/lib/types'

type CartStatus = 'idle' | 'loading' | 'ready' | 'error'

const state = reactive<{
  status: CartStatus
  cart: Cart | null
  error: string | null
}>({
  status: 'idle',
  cart: null,
  error: null,
})

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
  try {
    state.cart = await api.addToCart(productId, qty)
    state.status = 'ready'
  } catch (e) {
    state.status = 'error'
    state.error = e instanceof Error ? e.message : '장바구니 담기에 실패했어요.'
  }
}

async function setQty(itemId: string, qty: number) {
  state.error = null
  try {
    state.cart = await api.updateCartItemQty(itemId, qty)
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
