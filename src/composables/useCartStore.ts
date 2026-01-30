/**
 * 장바구니 상태 관리 모듈
 * - 역할: 장바구니 데이터 조회, 추가, 수량 변경, 삭제, 주문 생성 등 장바구니 관련 전역 상태 및 로직 관리
 * - 주요 함수: refresh(), add(), setQty(), remove(), checkout()
 * - 의존성: vue, @/lib/api.ts, @/lib/types.ts
 */
import { computed, reactive } from 'vue'
import { api } from '@/lib/api'
import type { Cart } from '@/lib/types'

/** 장바구니 로딩 상태 타입 */
type CartStatus = 'idle' | 'loading' | 'ready' | 'error'

/**
 * 장바구니 전역 상태 (Reactive)
 * - status: 현재 로딩 상태
 * - cart: 장바구니 데이터 객체 (null일 경우 비어있음)
 * - error: 에러 메시지
 */
const state = reactive<{
  status: CartStatus
  cart: Cart | null
  error: string | null
}>({
  status: 'idle',
  cart: null,
  error: null,
})

/**
 * 장바구니 조회/갱신 함수
 * - 목적: 서버에서 최신 장바구니 정보를 가져와 상태를 업데이트합니다.
 * - 입력: 없음
 * - 출력: 없음
 * - 예외 처리: API 호출 실패 시 상태를 'error'로 변경하고 에러 메시지를 저장합니다.
 * - 비즈니스 로직:
 *   1. 상태를 'loading'으로 변경
 *   2. API `getCart()` 호출
 *   3. 성공 시 'ready' 상태 및 데이터 갱신
 */
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

/**
 * 장바구니 상품 추가 함수
 * - 목적: 특정 상품을 장바구니에 추가합니다.
 * - 입력:
 *   - productId (string): 추가할 상품 ID
 *   - qty (number): 수량 (기본값 1)
 * - 출력: 없음
 * - 예외 처리: API 호출 실패 시 에러 상태 및 메시지 설정
 * - 비즈니스 로직: API `addToCart()` 호출하여 상품 추가 후 상태 갱신
 */
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

/**
 * 장바구니 상품 수량 변경 함수
 * - 목적: 장바구니에 담긴 특정 아이템의 수량을 변경합니다.
 * - 입력:
 *   - itemId (string): 장바구니 아이템 ID (상품 ID 아님)
 *   - qty (number): 변경할 수량
 * - 출력: 없음
 * - 예외 처리: 실패 시 에러 메시지 설정
 * - 비즈니스 로직: API `updateCartItemQty()` 호출하여 수량 업데이트
 */
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

/**
 * 장바구니 상품 삭제 함수
 * - 목적: 장바구니에서 특정 아이템을 제거합니다.
 * - 입력: itemId (string) - 삭제할 장바구니 아이템 ID
 * - 출력: 없음
 * - 예외 처리: 실패 시 에러 메시지 설정
 * - 비즈니스 로직: API `removeCartItem()` 호출하여 아이템 삭제
 */
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

/**
 * 주문 생성(결제) 함수
 * - 목적: 현재 장바구니 내용을 바탕으로 주문을 생성합니다.
 * - 입력:
 *   - customerName, customerPhone: 주문자 정보
 *   - shippingAddress, recipientName, shippingMemo: 배송 정보
 * - 출력: 생성된 주문 객체 (Order) 또는 null (실패 시)
 * - 예외 처리: 주문 생성 실패 시 에러 상태 설정 및 null 반환
 * - 비즈니스 로직:
 *   1. API `createOrder()` 호출
 *   2. 성공 시 장바구니 비우기(refresh 호출로 처리됨 - 서버가 장바구니 비움)
 *   3. 생성된 주문 정보 반환
 */
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

/**
 * useCartStore
 * - 목적: 장바구니 기능을 컴포넌트에서 쉽게 사용하기 위한 Composable
 * - 반환값:
 *   - state: 장바구니 상태 객체
 *   - itemCount: 총 아이템 수량 (Computed)
 *   - totalJpy: 총 결제 금액 (Computed)
 *   - refresh, add, setQty, remove, checkout: 액션 함수들
 */
export function useCartStore() {
  /** 총 아이템 수량 계산 */
  const itemCount = computed(() => state.cart?.items.reduce((acc, it) => acc + it.qty, 0) ?? 0)
  
  /** 총 결제 금액 계산 */
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
