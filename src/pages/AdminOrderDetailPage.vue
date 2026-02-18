<script setup lang="ts">
/**
 * 파일 역할: 관리자용 주문 상세 페이지
 *
 * 주요 기능:
 * 1. 주문 상세 정보 조회 (주문자, 배송지, 상품 등)
 * 2. 주문 상태 변경 (결제완료, 배송중 등)
 * 3. 제작 과정(Production Steps) 관리 (Admin 전용)
 * 4. 주문 변경 이력 조회
 *
 * 의존성:
 * - api: 백엔드 API 호출 (getAdminOrder, changeAdminOrderStatus)
 * - AdminOrderDetail, AdminOrderStatus: 타입 정의
 * - ProductionStepsAdmin: 제작 단계 관리 컴포넌트
 */

import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/lib/api'
import type { AdminOrderDetail, AdminOrderStatus } from '@/lib/types'
import ProductionStepsAdmin from '@/components/ProductionStepsAdmin.vue'

const route = useRoute()
const router = useRouter()

const orderId = computed(() => String(route.params.orderId))

// 로딩/저장/에러 상태 관리
const status = ref<'idle' | 'loading' | 'saving' | 'error' | 'ready'>('idle')
const error = ref<string | null>(null)
const order = ref<AdminOrderDetail | null>(null)

// 상태 변경 폼 데이터
const form = reactive({
  nextStatus: '' as '' | AdminOrderStatus, // 변경할 다음 상태
  reason: '', // 변경 사유
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
 * 현재 상태에서 변경 가능한 다음 상태 목록 반환
 * @param current 현재 주문 상태
 * @returns 변경 가능한 상태 목록 배열
 */
function allowedNext(current: AdminOrderStatus): AdminOrderStatus[] {
  const table: Record<AdminOrderStatus, AdminOrderStatus[]> = {
    pending: ['paid', 'cancelled'],
    paid: ['preparing', 'cancelled', 'refunded'],
    preparing: ['shipped', 'cancelled'],
    shipped: ['delivered'],
    delivered: [],
    cancelled: [],
    refunded: [],
  }
  return table[current] ?? []
}

/**
 * 주문 상세 정보 로드
 */
async function load() {
  status.value = 'loading'
  error.value = null
  try {
    order.value = await api.getAdminOrder(orderId.value)
    form.nextStatus = ''
    form.reason = ''
    status.value = 'ready'
  } catch (e) {
    status.value = 'error'
    error.value = e instanceof Error ? e.message : '주문을 불러오지 못했어요.'
  }
}

/**
 * 주문 상태 변경 저장
 */
async function saveStatus() {
  if (!order.value) return
  if (!form.nextStatus) return
  status.value = 'saving'
  error.value = null
  try {
    order.value = await api.changeAdminOrderStatus(order.value.id, {
      nextStatus: form.nextStatus,
      reason: form.reason,
    })
    form.nextStatus = ''
    form.reason = ''
    status.value = 'ready'
  } catch (e) {
    status.value = 'ready'
    error.value = e instanceof Error ? e.message : '상태 변경에 실패했어요.'
  }
}

/**
 * 제작 단계 업데이트 핸들러
 * 자식 컴포넌트(ProductionStepsAdmin)에서 변경 사항 발생 시 호출됨
 * @param next 업데이트된 제작 단계 배열
 */
function updateSteps(next: AdminOrderDetail['productionSteps']) {
  if (!order.value) return
  order.value.productionSteps = next
}

onMounted(() => {
  void load()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-end justify-between gap-4">
      <div>
        <h1 class="text-lg font-semibold">
          주문 상세
        </h1>
        <p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          주문 정보 확인과 상태 변경을 할 수 있어요.
        </p>
      </div>

      <button
        type="button"
        class="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
        @click="router.push({ name: 'admin-orders' })"
      >
        목록으로
      </button>
    </div>

    <div
      v-if="status === 'error'"
      class="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
    >
      {{ error }}
    </div>

    <div
      v-else-if="status === 'loading'"
      class="grid gap-6 lg:grid-cols-[1fr_360px]"
    >
      <div class="h-[520px] animate-pulse rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950" />
      <div class="h-[520px] animate-pulse rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950" />
    </div>

    <div
      v-else-if="order"
      class="grid gap-6 lg:grid-cols-[1fr_360px]"
    >
      <section class="space-y-4">
        <div class="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div class="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                주문번호
              </div>
              <div class="mt-1 text-lg font-semibold tracking-tight">
                {{ order.orderNo }}
              </div>
              <div class="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                {{ formatDate(order.orderedAt) }}
              </div>
            </div>
            <div class="text-right">
              <div class="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                총액
              </div>
              <div class="mt-1 text-xl font-semibold">
                {{ money(order.totalJpy) }}<span class="ml-0.5 text-[0.75em]">원</span>
              </div>
            </div>
          </div>

          <div class="mt-4 grid gap-2 sm:grid-cols-3">
            <div class="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900/40">
              <div class="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                주문상태
              </div>
              <div class="mt-1 font-semibold">
                {{ label(order.orderStatus) }}
              </div>
            </div>
            <div class="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900/40">
              <div class="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                결제
              </div>
              <div class="mt-1 font-semibold">
                {{ label(order.paymentStatus) }}
              </div>
            </div>
            <div class="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900/40">
              <div class="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                배송
              </div>
              <div class="mt-1 font-semibold">
                {{ label(order.shippingStatus) }}
              </div>
            </div>
          </div>
        </div>

        <div class="grid gap-4 lg:grid-cols-2">
          <div class="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <div class="text-sm font-semibold">
              고객 정보
            </div>
            <div class="mt-3 space-y-2 text-sm text-zinc-700 dark:text-zinc-200">
              <div class="flex items-center justify-between gap-3">
                <div class="text-zinc-500 dark:text-zinc-400">
                  주문자
                </div>
                <div class="font-medium">
                  {{ order.customerName }}
                </div>
              </div>
              <div class="flex items-center justify-between gap-3">
                <div class="text-zinc-500 dark:text-zinc-400">
                  연락처
                </div>
                <div class="font-medium">
                  {{ order.customerPhone }}
                </div>
              </div>
            </div>
          </div>

          <div class="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <div class="text-sm font-semibold">
              배송 정보
            </div>
            <div class="mt-3 space-y-2 text-sm text-zinc-700 dark:text-zinc-200">
              <div class="flex items-center justify-between gap-3">
                <div class="text-zinc-500 dark:text-zinc-400">
                  수령자
                </div>
                <div class="font-medium">
                  {{ order.recipientName }}
                </div>
              </div>
              <div class="flex items-center justify-between gap-3">
                <div class="text-zinc-500 dark:text-zinc-400">
                  연락처
                </div>
                <div class="font-medium">
                  {{ order.recipientPhone }}
                </div>
              </div>
              <div class="pt-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                주소
              </div>
              <div class="whitespace-pre-wrap text-sm">
                {{ order.shippingAddress1 }}
              </div>
              <div
                v-if="order.shippingAddress2"
                class="whitespace-pre-wrap text-sm"
              >
                {{ order.shippingAddress2 }}
              </div>
              <div
                v-if="order.shippingMemo"
                class="pt-2"
              >
                <div class="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                  메모
                </div>
                <div class="whitespace-pre-wrap text-sm">
                  {{ order.shippingMemo }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div class="border-b border-zinc-200 p-5 text-sm font-semibold dark:border-zinc-800">
            상품
          </div>
          <div class="overflow-x-auto">
            <table class="w-full min-w-[680px] text-sm">
              <thead class="border-b border-zinc-200 bg-zinc-50 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300">
                <tr>
                  <th class="px-4 py-3 text-left font-semibold">
                    상품명
                  </th>
                  <th class="px-4 py-3 text-right font-semibold">
                    단가
                  </th>
                  <th class="px-4 py-3 text-right font-semibold">
                    수량
                  </th>
                  <th class="px-4 py-3 text-right font-semibold">
                    소계
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-zinc-200 dark:divide-zinc-800">
                <tr
                  v-for="it in order.items"
                  :key="it.id"
                >
                  <td class="px-4 py-3 font-medium text-zinc-900 dark:text-zinc-100">
                    {{ it.productName }}
                  </td>
                  <td class="px-4 py-3 text-right">
                    {{ money(it.unitPriceJpy) }}<span class="ml-0.5 text-[0.75em]">원</span>
                  </td>
                  <td class="px-4 py-3 text-right">
                    {{ it.qty }}
                  </td>
                  <td class="px-4 py-3 text-right font-semibold">
                    {{ money(it.lineTotalJpy) }}<span class="ml-0.5 text-[0.75em]">원</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <ProductionStepsAdmin
          :order-id="order.id"
          :steps="order.productionSteps"
          @update:steps="updateSteps"
        />
      </section>

      <aside class="space-y-4">
        <div class="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <div class="text-sm font-semibold">
            상태 변경
          </div>
          <div class="mt-3 space-y-3">
            <label class="space-y-1">
              <div class="text-xs font-semibold text-zinc-500 dark:text-zinc-400">다음 상태</div>
              <select
                v-model="form.nextStatus"
                class="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-500/30 transition focus:ring-4 dark:border-zinc-800 dark:bg-zinc-950"
              >
                <option value="">선택</option>
                <option
                  v-for="s in allowedNext(order.orderStatus)"
                  :key="s"
                  :value="s"
                >{{ label(s) }}</option>
              </select>
            </label>

            <label class="space-y-1">
              <div class="text-xs font-semibold text-zinc-500 dark:text-zinc-400">사유(선택)</div>
              <input
                v-model="form.reason"
                type="text"
                class="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-500/30 transition focus:ring-4 dark:border-zinc-800 dark:bg-zinc-950"
                placeholder="예) 고객 요청"
              >
            </label>

            <button
              type="button"
              class="inline-flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              :disabled="!form.nextStatus || status === 'saving'"
              @click="saveStatus"
            >
              {{ status === 'saving' ? '저장 중…' : '저장' }}
            </button>

            <div
              v-if="error"
              class="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200"
            >
              {{ error }}
            </div>
          </div>
        </div>

        <div class="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div class="border-b border-zinc-200 p-5 text-sm font-semibold dark:border-zinc-800">
            변경 이력
          </div>
          <div
            v-if="order.history.length === 0"
            class="p-5 text-sm text-zinc-600 dark:text-zinc-300"
          >
            이력이 없어요.
          </div>
          <div
            v-else
            class="max-h-[420px] overflow-auto"
          >
            <table class="w-full text-sm">
              <thead class="border-b border-zinc-200 bg-zinc-50 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300">
                <tr>
                  <th class="px-4 py-3 text-left font-semibold">
                    일시
                  </th>
                  <th class="px-4 py-3 text-left font-semibold">
                    변경
                  </th>
                </tr>
              </thead>
              <tbody class="divide-y divide-zinc-200 dark:divide-zinc-800">
                <tr
                  v-for="h in order.history"
                  :key="h.id"
                >
                  <td class="px-4 py-3 text-xs text-zinc-600 dark:text-zinc-300">
                    {{ formatDate(h.changedAt) }}
                  </td>
                  <td class="px-4 py-3">
                    <div class="text-sm font-semibold">
                      {{ label(h.prevStatus) }} → {{ label(h.nextStatus) }}
                    </div>
                    <div class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                      {{ h.changedBy }} · {{ h.reason || '사유 없음' }}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>
