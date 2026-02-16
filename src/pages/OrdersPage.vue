<script setup lang="ts">
/**
 * 최근 주문 목록 페이지
 * - 역할: 최근 주문 내역을 확인하는 페이지
 * - 주요 기능:
 *   - 내 주문 목록 조회
 * - 의존성: vue, vue-router, @/lib/api.ts
 */
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api, ApiError } from '@/lib/api'
import type { ProductOrderSummary } from '@/lib/types'

const router = useRouter()

const status = ref<'idle' | 'loading' | 'error' | 'ready'>('idle')
const error = ref<string | null>(null)

const rows = ref<ProductOrderSummary[]>([])
const preparingRows = computed(() => rows.value.filter((row) => row.orderStatus === 'preparing'))
const shippingRows = computed(() => rows.value.filter((row) => row.orderStatus === 'shipped'))
const pendingRows = computed(() => rows.value.filter((row) => row.orderStatus === 'pending'))
const paidRows = computed(() => rows.value.filter((row) => row.orderStatus === 'paid'))
const paidWorkingRows = computed(() =>
  paidRows.value.filter((row) => row.lastProductionStepIndex !== null),
)
const paidReadyRows = computed(() =>
  paidRows.value.filter((row) => row.lastProductionStepIndex === null),
)

function formatDate(s: string) {
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleString()
}

function apiErrorMessage(e: unknown, fallback: string) {
  if (e instanceof ApiError) {
    const body = e.body as { detail?: unknown } | undefined
    if (body && typeof body.detail === 'string') return body.detail
    return e.message || fallback
  }
  if (e instanceof Error) return e.message
  return fallback
}

/**
 * 주문 목록 로드 및 상세 정보 조회
 */
async function load() {
  status.value = 'loading'
  error.value = null
  try {
    rows.value = await api.listRecentOrders()
    status.value = 'ready'
  } catch (e) {
    status.value = 'error'
    error.value = apiErrorMessage(e, '조회 실패')
  }
}

function go(orderNo: string) {
  router.push({ name: 'order-detail', params: { orderId: orderNo } })
}

onMounted(() => {
  void load()
})
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-lg font-semibold">제작 여정</h1>
      <p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">주문상세 번호를 클릭하면 제작 단계를 볼 수 있어요.</p>
    </div>

    <div v-if="status === 'error'" class="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
      {{ error }}
    </div>

    <div v-if="status === 'loading'" class="h-[240px] animate-pulse rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950" />

    <div v-else-if="rows.length === 0" class="rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
      주문 내역이 없어요.
    </div>

    <div v-else class="space-y-6">
      <div>
        <div class="text-sm font-semibold text-zinc-700 dark:text-zinc-200">배송중</div>
        <div v-if="shippingRows.length === 0" class="mt-2 rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
          배송중 내역이 없어요.
        </div>
        <div v-else class="mt-2 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div class="overflow-x-auto">
            <table class="w-full min-w-[720px] text-sm">
              <thead class="border-b border-zinc-200 bg-zinc-50 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300">
                <tr>
                  <th class="px-4 py-3 text-left font-semibold">대표</th>
                  <th class="px-4 py-3 text-left font-semibold">주문상세 번호</th>
                  <th class="px-4 py-3 text-left font-semibold">주문일시</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-zinc-200 dark:divide-zinc-800">
                <tr v-for="r in shippingRows" :key="r.id" class="transition hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
                  <td class="px-4 py-3">
                    <div class="h-10 w-10 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
                      <img v-if="r.productImageUrl" :src="r.productImageUrl" class="h-full w-full object-cover" alt="">
                    </div>
                  </td>
                  <td class="px-4 py-3 font-semibold">
                    <button type="button" class="underline decoration-zinc-300 underline-offset-2" @click="go(r.orderNo)">
                      {{ r.orderNo }}
                    </button>
                  </td>
                  <td class="px-4 py-3 text-zinc-700 dark:text-zinc-200">
                    {{ formatDate(r.orderedAt) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div>
        <div class="text-sm font-semibold text-zinc-700 dark:text-zinc-200">상품준비</div>
        <div v-if="preparingRows.length === 0" class="mt-2 rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
          상품준비 내역이 없어요.
        </div>
        <div v-else class="mt-2 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div class="overflow-x-auto">
            <table class="w-full min-w-[720px] text-sm">
              <thead class="border-b border-zinc-200 bg-zinc-50 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300">
                <tr>
                  <th class="px-4 py-3 text-left font-semibold">대표</th>
                  <th class="px-4 py-3 text-left font-semibold">주문상세 번호</th>
                  <th class="px-4 py-3 text-left font-semibold">주문일시</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-zinc-200 dark:divide-zinc-800">
                <tr v-for="r in preparingRows" :key="r.id" class="transition hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
                  <td class="px-4 py-3">
                    <div class="h-10 w-10 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
                      <img v-if="r.productImageUrl" :src="r.productImageUrl" class="h-full w-full object-cover" alt="">
                    </div>
                  </td>
                  <td class="px-4 py-3 font-semibold">
                    <button type="button" class="underline decoration-zinc-300 underline-offset-2" @click="go(r.orderNo)">
                      {{ r.orderNo }}
                    </button>
                  </td>
                  <td class="px-4 py-3 text-zinc-700 dark:text-zinc-200">
                    {{ formatDate(r.orderedAt) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div>
        <div class="text-sm font-semibold text-zinc-700 dark:text-zinc-200">결재완료(제작중)</div>
        <div v-if="paidWorkingRows.length === 0" class="mt-2 rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
          결재완료(제작중) 내역이 없어요.
        </div>
        <div v-else class="mt-2 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div class="overflow-x-auto">
            <table class="w-full min-w-[800px] text-sm">
              <thead class="border-b border-zinc-200 bg-zinc-50 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300">
                <tr>
                  <th class="px-4 py-3 text-left font-semibold">대표</th>
                  <th class="px-4 py-3 text-left font-semibold">주문상세 번호</th>
                  <th class="px-4 py-3 text-left font-semibold">주문일시</th>
                  <th class="px-4 py-3 text-left font-semibold">최종 제작단계</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-zinc-200 dark:divide-zinc-800">
                <tr v-for="r in paidWorkingRows" :key="r.id" class="transition hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
                  <td class="px-4 py-3">
                    <div class="h-10 w-10 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
                      <img v-if="r.productImageUrl" :src="r.productImageUrl" class="h-full w-full object-cover" alt="">
                    </div>
                  </td>
                  <td class="px-4 py-3 font-semibold">
                    <button type="button" class="underline decoration-zinc-300 underline-offset-2" @click="go(r.orderNo)">
                      {{ r.orderNo }}
                    </button>
                  </td>
                  <td class="px-4 py-3 text-zinc-700 dark:text-zinc-200">
                    {{ formatDate(r.orderedAt) }}
                  </td>
                  <td class="px-4 py-3 text-zinc-700 dark:text-zinc-200">
                    <div class="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                      {{ r.lastProductionStepIndex }}단계
                    </div>
                    <div class="font-medium">{{ r.lastProductionStepMemo || '-' }}</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div>
        <div class="text-sm font-semibold text-zinc-700 dark:text-zinc-200">결재완료</div>
        <div v-if="paidReadyRows.length === 0" class="mt-2 rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
          결재완료 내역이 없어요.
        </div>
        <div v-else class="mt-2 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div class="overflow-x-auto">
            <table class="w-full min-w-[720px] text-sm">
              <thead class="border-b border-zinc-200 bg-zinc-50 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300">
                <tr>
                  <th class="px-4 py-3 text-left font-semibold">대표</th>
                  <th class="px-4 py-3 text-left font-semibold">주문상세 번호</th>
                  <th class="px-4 py-3 text-left font-semibold">주문일시</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-zinc-200 dark:divide-zinc-800">
                <tr v-for="r in paidReadyRows" :key="r.id" class="transition hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
                  <td class="px-4 py-3">
                    <div class="h-10 w-10 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
                      <img v-if="r.productImageUrl" :src="r.productImageUrl" class="h-full w-full object-cover" alt="">
                    </div>
                  </td>
                  <td class="px-4 py-3 font-semibold">
                    <button type="button" class="underline decoration-zinc-300 underline-offset-2" @click="go(r.orderNo)">
                      {{ r.orderNo }}
                    </button>
                  </td>
                  <td class="px-4 py-3 text-zinc-700 dark:text-zinc-200">
                    {{ formatDate(r.orderedAt) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div>
        <div class="text-sm font-semibold text-zinc-700 dark:text-zinc-200">결제대기</div>
        <div v-if="pendingRows.length === 0" class="mt-2 rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
          결제대기 내역이 없어요.
        </div>
        <div v-else class="mt-2 overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div class="overflow-x-auto">
            <table class="w-full min-w-[720px] text-sm">
              <thead class="border-b border-zinc-200 bg-zinc-50 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300">
                <tr>
                  <th class="px-4 py-3 text-left font-semibold">대표</th>
                  <th class="px-4 py-3 text-left font-semibold">주문상세 번호</th>
                  <th class="px-4 py-3 text-left font-semibold">주문일시</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-zinc-200 dark:divide-zinc-800">
                <tr v-for="r in pendingRows" :key="r.id" class="transition hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
                  <td class="px-4 py-3">
                    <div class="h-10 w-10 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
                      <img v-if="r.productImageUrl" :src="r.productImageUrl" class="h-full w-full object-cover" alt="">
                    </div>
                  </td>
                  <td class="px-4 py-3 font-semibold">
                    <button type="button" class="underline decoration-zinc-300 underline-offset-2" @click="go(r.orderNo)">
                      {{ r.orderNo }}
                    </button>
                  </td>
                  <td class="px-4 py-3 text-zinc-700 dark:text-zinc-200">
                    {{ formatDate(r.orderedAt) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
