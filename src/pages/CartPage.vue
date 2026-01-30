<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useCartStore } from '@/composables/useCartStore'
import { useRouter } from 'vue-router'

const cart = useCartStore()
const orderMessage = ref<string | null>(null)
const orderId = ref<string | null>(null)
const formError = ref<string | null>(null)
const router = useRouter()

const form = reactive({
  customerName: '',
  customerPhone: '',
  shippingAddress: '',
  recipientName: '',
  shippingMemo: '',
})

const items = computed(() => cart.state.cart?.items ?? [])

function money(v: number) {
  return `¥${v.toLocaleString()}`
}

async function placeOrder() {
  orderMessage.value = null
  orderId.value = null
  formError.value = null

  if (!form.customerName.trim()) {
    formError.value = '주문자를 입력해 주세요.'
    return
  }
  if (!form.customerPhone.trim()) {
    formError.value = '연락처를 입력해 주세요.'
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
    recipientName: form.recipientName,
    shippingMemo: form.shippingMemo,
  })
  if (order) {
    orderMessage.value = `주문이 생성됐어요. 주문번호: ${order.id} (총액 ${money(order.totalJpy)})`
    orderId.value = order.id
    try {
      const raw = localStorage.getItem('myOrders')
      const parsed = raw ? (JSON.parse(raw) as unknown) : []
      const list = Array.isArray(parsed) ? parsed.filter((it): it is string => typeof it === 'string') : []
      const next = [order.id, ...list.filter((it) => it !== order.id)].slice(0, 50)
      localStorage.setItem('myOrders', JSON.stringify(next))
    } catch {
      void 0
    }
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
            <div class="mt-1 text-sm font-semibold">{{ money(it.product.priceJpy) }}</div>
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
              <input
                v-model="form.shippingAddress"
                type="text"
                class="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-500/30 transition focus:ring-4 dark:border-zinc-800 dark:bg-zinc-950"
              />
            </label>

            <label class="space-y-1">
              <div class="text-xs font-semibold text-zinc-600 dark:text-zinc-300">수령자</div>
              <input
                v-model="form.recipientName"
                type="text"
                class="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-500/30 transition focus:ring-4 dark:border-zinc-800 dark:bg-zinc-950"
              />
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
            <div class="text-sm font-semibold">총액</div>
            <div class="text-lg font-semibold">{{ money(cart.totalJpy.value) }}</div>
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
