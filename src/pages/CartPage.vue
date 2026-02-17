<script setup lang="ts">
/**
 * 장바구니 페이지
 * - 역할: 사용자가 담은 상품 목록을 확인하고 주문(Checkout)을 진행하는 페이지
 * - 주요 기능:
 *   - 장바구니 아이템 목록 표시 (수량 조절, 삭제)
 *   - 주문자 정보 입력 폼 (이름, 연락처, 주소 등)
 *   - 유효성 검사 및 주문 생성 요청
 *   - 주문 완료 시 주문번호 표시
 * - 의존성: vue, vue-router, useCartStore
 */
import { computed, onMounted, reactive, ref } from 'vue'
import { useCartStore } from '@/composables/useCartStore'
import { useRouter } from 'vue-router'

const cart = useCartStore()
const orderMessage = ref<string | null>(null)
const orderId = ref<string | null>(null)
const formError = ref<string | null>(null)
const router = useRouter()

/** 주문자 및 배송 정보 입력 폼 상태 */
const form = reactive({
  customerName: '',
  customerPhone: '',
  shippingAddress: '',
  shippingAddress2: '',
  recipientName: '',
  shippingMemo: '',
})

/** 장바구니 아이템 목록 (Computed) */
const items = computed(() => cart.state.cart?.items ?? [])

const totalProductAmount = computed(() =>
  items.value.reduce((acc, it) => {
    if (it.qty <= 0) return acc
    const base = it.product.basePrice
    const add = it.product.addPrice
    const packaging = it.product.packagingFee
    const lineTotal =
      it.qty === 1 ? base + packaging : base + (it.qty - 1) * add + packaging
    return acc + lineTotal
  }, 0),
)

const configuredFee = Number(import.meta.env?.VITE_DELIVERY_FEE ?? 3200)
const defaultFee = Number.isFinite(configuredFee) ? configuredFee : 3200
const deliveryFee = computed(() => (totalProductAmount.value >= 60000 ? 0 : defaultFee))
const grandTotal = computed(() => totalProductAmount.value + deliveryFee.value)

function money(v: number) {
  return v.toLocaleString()
}

function openAddressSearch() {
  formError.value = null
  if (!window.daum?.Postcode) {
    formError.value = '주소 검색을 불러오지 못했어요.'
    return
  }
  new window.daum.Postcode({
    oncomplete: (data) => {
      form.shippingAddress = data.address
      form.shippingAddress2 = ''
    },
  }).open()
}

/**
 * 주문 생성 함수
 * - 목적: 입력된 정보를 검증하고 주문을 생성
 * - 로직:
 *   1. 필수 입력값 검증
 *   2. cart.checkout() 호출
 *   3. 완료 메시지 표시
 */
async function placeOrder() {
  orderMessage.value = null
  orderId.value = null
  formError.value = null

  if (form.customerName.trim().length < 2) {
    formError.value = '주문자는 2자 이상 입력해 주세요.'
    return
  }
  const phone = form.customerPhone.trim()
  if (!/^\d{3}-\d{4}-\d{4}$/.test(phone)) {
    formError.value = '연락처는 ###-####-#### 형식으로 입력해 주세요.'
    return
  }
  if (!form.shippingAddress.trim()) {
    formError.value = '배송주소를 입력해 주세요.'
    return
  }
  if (!form.recipientName.trim()) {
    formError.value = '수령자를 입력해 주세요.'
    return
  }

  const order = await cart.checkout({
    customerName: form.customerName,
    customerPhone: form.customerPhone,
    shippingAddress: form.shippingAddress,
    shippingAddress2: form.shippingAddress2,
    recipientName: form.recipientName,
    shippingMemo: form.shippingMemo,
  })
  if (order) {
    orderMessage.value = `주문이 생성됐어요. 주문번호: ${order.orderNo} (총액 ${money(order.totalJpy)}원)`
    orderId.value = order.id
  }
}

onMounted(() => {
  if (cart.state.status === 'idle') void cart.refresh()
})
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-lg font-semibold">장바구니</h1>
      <p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">담은 상품을 확인하고 주문을 생성할 수 있어요.</p>
    </div>

    <div v-if="cart.state.error" class="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
      {{ cart.state.error }}
    </div>

    <div v-if="orderMessage" class="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
      <div>{{ orderMessage }}</div>
      <button
        v-if="orderId"
        type="button"
        class="mt-2 inline-flex items-center rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
        @click="router.push({ name: 'order-detail', params: { orderId } })"
      >
        주문 상세 보기
      </button>
    </div>

    <div v-if="cart.state.status === 'loading'" class="h-[260px] animate-pulse rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950" />

    <div v-else class="grid gap-6 lg:grid-cols-[1fr_320px]">
      <section class="space-y-3">
        <div
          v-for="it in items"
          :key="it.id"
          class="flex gap-4 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <img
            :src="it.product.images[0]?.url"
            :alt="it.product.name"
            class="h-20 w-20 rounded-xl object-cover"
            loading="lazy"
          />
          <div class="min-w-0 flex-1">
            <button
              type="button"
              class="line-clamp-1 text-left text-sm font-semibold hover:underline"
              @click="$router.push({ name: 'product', params: { productId: it.product.id } })"
            >
              {{ it.product.name }}
            </button>
            <div class="mt-1 text-sm font-semibold">
              {{ money(it.product.basePrice) }}<span class="ml-0.5 text-[0.75em]">원</span>
            </div>
            <div class="mt-2 space-y-1 text-xs text-zinc-600 dark:text-zinc-300">
              <div>기본가격: {{ money(it.product.basePrice) }}원</div>
              <div>추가가격: {{ money(it.product.addPrice) }}원</div>
              <div>포장비: {{ money(it.product.packagingFee) }}원</div>
              <div class="text-zinc-500 dark:text-zinc-400">
                계산:
                {{
                  it.qty === 1
                    ? `${money(it.product.basePrice)} + ${money(it.product.packagingFee)}`
                    : `${money(it.product.basePrice)} + (${it.qty - 1} × ${money(it.product.addPrice)}) + ${money(
                        it.product.packagingFee,
                      )}`
                }}
                =
                {{
                  money(
                    it.qty === 1
                      ? it.product.basePrice + it.product.packagingFee
                      : it.product.basePrice + (it.qty - 1) * it.product.addPrice + it.product.packagingFee,
                  )
                }}원
              </div>
            </div>
            <div class="mt-3 flex items-center gap-2">
              <button
                type="button"
                class="h-9 w-9 rounded-xl border border-zinc-200 text-sm font-semibold transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                @click="cart.setQty(it.id, Math.max(1, it.qty - 1))"
              >
                -
              </button>
              <div class="w-10 text-center text-sm font-semibold">{{ it.qty }}</div>
              <button
                type="button"
                class="h-9 w-9 rounded-xl border border-zinc-200 text-sm font-semibold transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                @click="cart.setQty(it.id, it.qty + 1)"
              >
                +
              </button>
              <button
                type="button"
                class="ml-auto rounded-xl border border-zinc-200 px-3 py-2 text-xs font-semibold transition hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
                @click="cart.remove(it.id)"
              >
                삭제
              </button>
            </div>
          </div>
        </div>

        <div
          v-if="items.length === 0"
          class="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
        >
          장바구니가 비어 있어요.
        </div>
      </section>

      <aside class="space-y-3">
        <div class="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <div class="text-sm font-semibold">주문 정보</div>
          <div class="mt-4 grid gap-3">
            <label class="space-y-1">
              <div class="text-xs font-semibold text-zinc-600 dark:text-zinc-300">주문자</div>
              <input
                v-model="form.customerName"
                type="text"
                class="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-500/30 transition focus:ring-4 dark:border-zinc-800 dark:bg-zinc-950"
              />
            </label>

            <label class="space-y-1">
              <div class="text-xs font-semibold text-zinc-600 dark:text-zinc-300">연락처</div>
              <input
                v-model="form.customerPhone"
                type="tel"
                class="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-500/30 transition focus:ring-4 dark:border-zinc-800 dark:bg-zinc-950"
                placeholder="예) 010-1234-5678"
              />
            </label>

            <label class="space-y-1">
              <div class="text-xs font-semibold text-zinc-600 dark:text-zinc-300">배송주소</div>
              <div class="flex gap-2">
                <input
                  v-model="form.shippingAddress"
                  type="text"
                  readonly
                  class="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-500/30 transition focus:ring-4 dark:border-zinc-800 dark:bg-zinc-950"
                />
                <button
                  type="button"
                  class="whitespace-nowrap rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                  @click="openAddressSearch"
                >
                  주소검색
                </button>
              </div>
            </label>

            <label class="space-y-1">
              <div class="text-xs font-semibold text-zinc-600 dark:text-zinc-300">배송상세주소</div>
              <input
                v-model="form.shippingAddress2"
                type="text"
                class="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-500/30 transition focus:ring-4 dark:border-zinc-800 dark:bg-zinc-950"
                placeholder="예) 101동 1004호"
              />
            </label>

            <label class="space-y-1">
              <div class="text-xs font-semibold text-zinc-600 dark:text-zinc-300">수령자</div>
              <div class="flex gap-2">
                <input
                  v-model="form.recipientName"
                  type="text"
                  class="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-500/30 transition focus:ring-4 dark:border-zinc-800 dark:bg-zinc-950"
                />
                <button
                  type="button"
                  class="whitespace-nowrap rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                  @click="form.recipientName = form.customerName"
                >
                  주문자복사
                </button>
              </div>
            </label>

            <label class="space-y-1">
              <div class="text-xs font-semibold text-zinc-600 dark:text-zinc-300">배송메모</div>
              <input
                v-model="form.shippingMemo"
                type="text"
                class="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-500/30 transition focus:ring-4 dark:border-zinc-800 dark:bg-zinc-950"
                placeholder="(선택)"
              />
            </label>
          </div>

          <div
            v-if="formError"
            class="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200"
          >
            {{ formError }}
          </div>
        </div>

        <div class="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <div class="flex items-center justify-between">
            <div class="text-sm font-semibold">상품 합계</div>
            <div class="text-sm font-semibold">
              {{ money(totalProductAmount) }}<span class="ml-0.5 text-[0.75em]">원</span>
            </div>
          </div>
          <div class="mt-2 flex items-center justify-between text-sm">
            <div class="font-semibold text-zinc-600 dark:text-zinc-300">배송비</div>
            <div class="font-semibold">
              {{ money(deliveryFee) }}<span class="ml-0.5 text-[0.75em]">원</span>
            </div>
          </div>
          <div class="mt-3 flex items-center justify-between border-t border-zinc-200 pt-3 text-lg font-semibold dark:border-zinc-800">
            <div>총액</div>
            <div>
              {{ money(grandTotal) }}<span class="ml-0.5 text-[0.75em]">원</span>
            </div>
          </div>
          <button
            type="button"
            class="mt-4 inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="items.length === 0"
            @click="placeOrder"
          >
            주문하기
          </button>
        </div>
      </aside>
    </div>
  </div>
</template>
