<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/lib/api'
import type { AdminOrderList, AdminOrderStatus, AdminPaymentStatus, AdminShippingStatus } from '@/lib/types'

const router = useRouter()

const status = ref<'idle' | 'loading' | 'error' | 'ready'>('idle')
const error = ref<string | null>(null)

const filters = reactive({
  q: '',
  fromDate: '',
  toDate: '',
  orderStatus: '' as '' | AdminOrderStatus,
  paymentStatus: '' as '' | AdminPaymentStatus,
  shippingStatus: '' as '' | AdminShippingStatus,
})

const page = ref(1)
const pageSize = ref(20)
const data = ref<AdminOrderList | null>(null)

const totalPages = computed(() => {
  if (!data.value) return 1
  return Math.max(1, Math.ceil(data.value.total / data.value.pageSize))
})

function money(v: number) {
  return `¥${v.toLocaleString()}`
}

function formatDate(s: string) {
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleString()
}

function badgeClass(kind: 'order' | 'payment' | 'shipping', v: string) {
  if (kind === 'order') {
    if (v === 'pending') return 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100'
    if (v === 'paid') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
    if (v === 'preparing') return 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
    if (v === 'shipped') return 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200'
    if (v === 'delivered') return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200'
    if (v === 'cancelled') return 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200'
    if (v === 'refunded') return 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200'
  }
  if (kind === 'payment') {
    if (v === 'paid') return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200'
    if (v === 'refunded') return 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200'
    return 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100'
  }
  if (v === 'delivered') return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-200'
  if (v === 'shipped') return 'bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-200'
  if (v === 'preparing') return 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200'
  return 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-100'
}

function label(v: string) {
  const map: Record<string, string> = {
    pending: '결제 대기',
    paid: '결제 완료',
    preparing: '상품 준비',
    shipped: '배송중',
    delivered: '배송 완료',
    cancelled: '취소',
    refunded: '환불',
    unpaid: '미결제',
    none: '미배송',
  }
  return map[v] ?? v
}

async function load() {
  status.value = 'loading'
  error.value = null
  try {
    data.value = await api.listAdminOrders({
      q: filters.q.trim() || undefined,
      fromDate: filters.fromDate || undefined,
      toDate: filters.toDate || undefined,
      orderStatus: filters.orderStatus || undefined,
      paymentStatus: filters.paymentStatus || undefined,
      shippingStatus: filters.shippingStatus || undefined,
      page: page.value,
      pageSize: pageSize.value,
    })
    status.value = 'ready'
  } catch (e) {
    status.value = 'error'
    error.value = e instanceof Error ? e.message : '주문 목록을 불러오지 못했어요.'
  }
}

function reset() {
  filters.q = ''
  filters.fromDate = ''
  filters.toDate = ''
  filters.orderStatus = ''
  filters.paymentStatus = ''
  filters.shippingStatus = ''
  page.value = 1
  void load()
}

function goDetail(orderId: string) {
  router.push({ name: 'admin-order-detail', params: { orderId } })
}

function prevPage() {
  page.value = Math.max(1, page.value - 1)
  void load()
}

function nextPage() {
  page.value = Math.min(totalPages.value, page.value + 1)
  void load()
}

onMounted(() => {
  void load()
})
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-lg font-semibold">주문 목록</h1>
      <p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">검색/필터로 주문을 찾고 상태를 확인할 수 있어요.</p>
    </div>

    <div v-if="status === 'error'" class="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
      {{ error }}
    </div>

    <section class="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div class="grid gap-3 lg:grid-cols-[1.2fr_0.7fr_0.7fr_0.6fr_0.6fr_0.6fr_auto]">
        <label class="space-y-1">
          <div class="text-sm font-medium">검색</div>
          <input
            v-model="filters.q"
            type="search"
            class="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-500/30 transition focus:ring-4 dark:border-zinc-800 dark:bg-zinc-950"
            placeholder="주문번호/이름/연락처"
            @keydown.enter.prevent="page = 1; load()"
          />
        </label>

        <label class="space-y-1">
          <div class="text-sm font-medium">시작일</div>
          <input
            v-model="filters.fromDate"
            type="date"
            class="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-500/30 transition focus:ring-4 dark:border-zinc-800 dark:bg-zinc-950"
          />
        </label>

        <label class="space-y-1">
          <div class="text-sm font-medium">종료일</div>
          <input
            v-model="filters.toDate"
            type="date"
            class="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-500/30 transition focus:ring-4 dark:border-zinc-800 dark:bg-zinc-950"
          />
        </label>

        <label class="space-y-1">
          <div class="text-sm font-medium">주문상태</div>
          <select
            v-model="filters.orderStatus"
            class="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-500/30 transition focus:ring-4 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <option value="">전체</option>
            <option value="pending">결제 대기</option>
            <option value="paid">결제 완료</option>
            <option value="preparing">상품 준비</option>
            <option value="shipped">배송중</option>
            <option value="delivered">배송 완료</option>
            <option value="cancelled">취소</option>
            <option value="refunded">환불</option>
          </select>
        </label>

        <label class="space-y-1">
          <div class="text-sm font-medium">결제</div>
          <select
            v-model="filters.paymentStatus"
            class="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-500/30 transition focus:ring-4 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <option value="">전체</option>
            <option value="unpaid">미결제</option>
            <option value="paid">결제</option>
            <option value="refunded">환불</option>
          </select>
        </label>

        <label class="space-y-1">
          <div class="text-sm font-medium">배송</div>
          <select
            v-model="filters.shippingStatus"
            class="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-500/30 transition focus:ring-4 dark:border-zinc-800 dark:bg-zinc-950"
          >
            <option value="">전체</option>
            <option value="none">미배송</option>
            <option value="preparing">준비</option>
            <option value="shipped">배송중</option>
            <option value="delivered">완료</option>
          </select>
        </label>

        <div class="flex items-end gap-2">
          <button
            type="button"
            class="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            :disabled="status === 'loading'"
            @click="page = 1; load()"
          >
            검색
          </button>
          <button
            type="button"
            class="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
            :disabled="status === 'loading'"
            @click="reset"
          >
            초기화
          </button>
        </div>
      </div>
    </section>

    <section class="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div v-if="status === 'loading'" class="h-[280px] animate-pulse" />

      <div v-else-if="data && data.items.length === 0" class="p-6 text-sm text-zinc-600 dark:text-zinc-300">
        조건에 맞는 주문이 없습니다.
      </div>

      <div v-else class="overflow-x-auto">
        <table class="w-full min-w-[920px] text-sm">
          <thead class="border-b border-zinc-200 bg-zinc-50 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300">
            <tr>
              <th class="px-4 py-3 text-left font-semibold">주문번호</th>
              <th class="px-4 py-3 text-left font-semibold">주문일시</th>
              <th class="px-4 py-3 text-left font-semibold">주문자</th>
              <th class="px-4 py-3 text-right font-semibold">총액</th>
              <th class="px-4 py-3 text-left font-semibold">주문상태</th>
              <th class="px-4 py-3 text-left font-semibold">결제</th>
              <th class="px-4 py-3 text-left font-semibold">배송</th>
              <th class="px-4 py-3 text-right font-semibold">액션</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-200 dark:divide-zinc-800">
            <tr
              v-for="o in data?.items"
              :key="o.id"
              class="transition hover:bg-zinc-50 dark:hover:bg-zinc-900/40"
            >
              <td class="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100">{{ o.orderNo }}</td>
              <td class="px-4 py-3 text-zinc-700 dark:text-zinc-200">{{ formatDate(o.orderedAt) }}</td>
              <td class="px-4 py-3 text-zinc-700 dark:text-zinc-200">
                <div class="font-medium">{{ o.customerName }}</div>
                <div class="text-xs text-zinc-500 dark:text-zinc-400">{{ o.customerPhone }}</div>
              </td>
              <td class="px-4 py-3 text-right font-semibold">{{ money(o.totalJpy) }}</td>
              <td class="px-4 py-3">
                <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold" :class="badgeClass('order', o.orderStatus)">
                  {{ label(o.orderStatus) }}
                </span>
              </td>
              <td class="px-4 py-3">
                <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold" :class="badgeClass('payment', o.paymentStatus)">
                  {{ label(o.paymentStatus) }}
                </span>
              </td>
              <td class="px-4 py-3">
                <span class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold" :class="badgeClass('shipping', o.shippingStatus)">
                  {{ label(o.shippingStatus) }}
                </span>
              </td>
              <td class="px-4 py-3 text-right">
                <button
                  type="button"
                  class="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                  @click="goDetail(o.id)"
                >
                  상세
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div v-if="data" class="flex items-center justify-between gap-3">
      <div class="text-sm text-zinc-600 dark:text-zinc-300">
        총 {{ data.total.toLocaleString() }}건 · {{ data.page }}/{{ totalPages }} 페이지
      </div>

      <div class="flex items-center gap-2">
        <select
          v-model.number="pageSize"
          class="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none dark:border-zinc-800 dark:bg-zinc-950"
          @change="page = 1; load()"
        >
          <option :value="20">20</option>
          <option :value="50">50</option>
          <option :value="100">100</option>
        </select>
        <button
          type="button"
          class="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
          :disabled="page <= 1 || status === 'loading'"
          @click="prevPage"
        >
          이전
        </button>
        <button
          type="button"
          class="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
          :disabled="page >= totalPages || status === 'loading'"
          @click="nextPage"
        >
          다음
        </button>
      </div>
    </div>
  </div>
</template>

