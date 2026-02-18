<script setup lang="ts">
/**
 * 파일 역할: 관리자용 주문 목록 페이지
 *
 * 주요 기능:
 * 1. 전체 주문 목록 조회 (페이지네이션)
 * 2. 주문 검색 및 필터링 (검색어, 날짜, 주문상태, 결제상태, 배송상태)
 * 3. 주문 상세 페이지 이동
 * 4. 주문 상태별 배지 표시
 *
 * 의존성:
 * - api: 백엔드 API 호출 (listAdminOrders)
 * - AdminOrderList, AdminOrderStatus, etc: 타입 정의
 * - useRouter: 페이지 이동
 */

import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/lib/api'
import type { AdminOrderList, AdminOrderStatus, AdminPaymentStatus, AdminShippingStatus } from '@/lib/types'

const router = useRouter()

// 로딩/에러 상태 관리
const status = ref<'idle' | 'loading' | 'error' | 'ready'>('idle')
const error = ref<string | null>(null)

// 검색 필터 상태
const filters = reactive({
  q: '', // 검색어 (주문번호/이름/연락처)
  fromDate: '', // 시작일
  toDate: '', // 종료일
  orderStatus: '' as '' | AdminOrderStatus, // 주문 상태
  paymentStatus: '' as '' | AdminPaymentStatus, // 결제 상태
  shippingStatus: '' as '' | AdminShippingStatus, // 배송 상태
})

// 페이지네이션 상태
const page = ref(1)
const pageSize = ref(20)
const data = ref<AdminOrderList | null>(null) // 불러온 데이터

// 총 페이지 수 계산
const totalPages = computed(() => {
  if (!data.value) return 1
  return Math.max(1, Math.ceil(data.value.total / data.value.pageSize))
})

/**
 * 금액 포맷팅 함수
 * @param v 금액 (숫자)
 * @returns '1,000' 형식의 문자열
 */
function money(v: number) {
  return v.toLocaleString()
}

/**
 * 날짜 포맷팅 함수
 * @param s 날짜 문자열
 * @returns 로컬 날짜 시간 문자열
 */
function formatDate(s: string) {
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleString()
}

/**
 * 상태 배지 스타일 클래스 반환
 * @param kind 상태 종류 ('order' | 'payment' | 'shipping')
 * @param v 상태 값
 * @returns Tailwind CSS 클래스 문자열
 */
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

/**
 * 상태 라벨 반환 (한글)
 * @param v 상태 코드
 * @returns 한글 라벨
 */
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

/**
 * 주문 목록 로드 함수
 * 필터 조건에 따라 API를 호출하여 데이터를 갱신합니다.
 */
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

/**
 * 필터 초기화 함수
 * 모든 필터 조건을 초기화하고 첫 페이지를 로드합니다.
 */
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

/**
 * 상세 페이지 이동
 * @param orderId 주문 ID
 */
function goDetail(orderId: string) {
  router.push({ name: 'admin-order-detail', params: { orderId } })
}

/**
 * 이전 페이지 이동
 */
function prevPage() {
  page.value = Math.max(1, page.value - 1)
  void load()
}

/**
 * 다음 페이지 이동
 */
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
      <h1 class="text-lg font-semibold">
        주문 목록
      </h1>
      <p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        검색/필터로 주문을 찾고 상태를 확인할 수 있어요.
      </p>
    </div>

    <div
      v-if="status === 'error'"
      class="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
    >
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
          >
        </label>

        <label class="space-y-1">
          <div class="text-sm font-medium">시작일</div>
          <input
            v-model="filters.fromDate"
            type="date"
            class="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-500/30 transition focus:ring-4 dark:border-zinc-800 dark:bg-zinc-950"
          >
        </label>

        <label class="space-y-1">
          <div class="text-sm font-medium">종료일</div>
          <input
            v-model="filters.toDate"
            type="date"
            class="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-500/30 transition focus:ring-4 dark:border-zinc-800 dark:bg-zinc-950"
          >
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
      <div
        v-if="status === 'loading'"
        class="h-[280px] animate-pulse"
      />

      <div
        v-else-if="data && data.items.length === 0"
        class="p-6 text-sm text-zinc-600 dark:text-zinc-300"
      >
        조건에 맞는 주문이 없습니다.
      </div>

      <div
        v-else
        class="overflow-x-auto"
      >
        <table class="w-full min-w-[920px] text-sm">
          <thead class="border-b border-zinc-200 bg-zinc-50 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300">
            <tr>
              <th class="px-4 py-3 text-left font-semibold">
                주문번호
              </th>
              <th class="px-4 py-3 text-left font-semibold">
                주문일시
              </th>
              <th class="px-4 py-3 text-left font-semibold">
                주문자
              </th>
              <th class="px-4 py-3 text-right font-semibold">
                총액
              </th>
              <th class="px-4 py-3 text-left font-semibold">
                주문상태
              </th>
              <th class="px-4 py-3 text-left font-semibold">
                결제
              </th>
              <th class="px-4 py-3 text-left font-semibold">
                배송
              </th>
              <th class="px-4 py-3 text-left font-semibold">
                최종 제작단계
              </th>
              <th class="px-4 py-3 text-right font-semibold">
                액션
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-200 dark:divide-zinc-800">
            <tr
              v-for="o in data?.items"
              :key="o.id"
              class="transition hover:bg-zinc-50 dark:hover:bg-zinc-900/40"
            >
              <td class="px-4 py-3 font-semibold text-zinc-900 dark:text-zinc-100">
                {{ o.orderNo }}
              </td>
              <td class="px-4 py-3 text-zinc-700 dark:text-zinc-200">
                {{ formatDate(o.orderedAt) }}
              </td>
              <td class="px-4 py-3 text-zinc-700 dark:text-zinc-200">
                <div class="font-medium">
                  {{ o.customerName }}
                </div>
                <div class="text-xs text-zinc-500 dark:text-zinc-400">
                  {{ o.customerPhone }}
                </div>
              </td>
              <td class="px-4 py-3 text-right font-semibold">
                {{ money(o.totalJpy) }}<span class="ml-0.5 text-[0.75em]">원</span>
              </td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold"
                  :class="badgeClass('order', o.orderStatus)"
                >
                  {{ label(o.orderStatus) }}
                </span>
              </td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold"
                  :class="badgeClass('payment', o.paymentStatus)"
                >
                  {{ label(o.paymentStatus) }}
                </span>
              </td>
              <td class="px-4 py-3">
                <span
                  class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold"
                  :class="badgeClass('shipping', o.shippingStatus)"
                >
                  {{ label(o.shippingStatus) }}
                </span>
              </td>
              <td class="px-4 py-3 text-zinc-700 dark:text-zinc-200">
                <div
                  v-if="o.lastProductionStepIndex !== null"
                  class="space-y-1"
                >
                  <div class="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                    {{ o.lastProductionStepIndex }}단계
                  </div>
                  <div class="font-medium">
                    {{ o.lastProductionStepMemo || '-' }}
                  </div>
                </div>
                <div
                  v-else
                  class="text-sm text-zinc-500 dark:text-zinc-400"
                >
                  없음
                </div>
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

    <div
      v-if="data"
      class="flex items-center justify-between gap-3"
    >
      <div class="text-sm text-zinc-600 dark:text-zinc-300">
        총 {{ data.total.toLocaleString() }}건 · {{ data.page }}/{{ totalPages }} 페이지
      </div>

      <div class="flex items-center gap-2">
        <select
          v-model.number="pageSize"
          class="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none dark:border-zinc-800 dark:bg-zinc-950"
          @change="page = 1; load()"
        >
          <option :value="20">
            20
          </option>
          <option :value="50">
            50
          </option>
          <option :value="100">
            100
          </option>
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
