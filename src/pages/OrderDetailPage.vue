<script setup lang="ts">
/**
 * 주문 상세 페이지 (공개용)
 * - 역할: 주문 번호를 통해 비회원도 접근 가능한 주문 상세 내역 및 제작 과정 조회 페이지
 * - 주요 기능:
 *   - 주문 상세 정보(상품, 금액, 배송지 등) 표시
 *   - 제작 단계 타임라인(ProductionStepsTimeline) 표시
 * - 의존성: vue, vue-router, @/lib/api.ts
 */
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/lib/api'
import type { PublicOrderDetail } from '@/lib/types'
import ProductionStepsTimeline from '@/components/ProductionStepsTimeline.vue'

const route = useRoute()
const router = useRouter()

const orderId = computed(() => String(route.params.orderId))

const status = ref<'idle' | 'loading' | 'error' | 'ready'>('idle')
const error = ref<string | null>(null)
const order = ref<PublicOrderDetail | null>(null)

function money(v: number) {
  return `¥${v.toLocaleString()}`
}

function formatDate(s: string) {
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleString()
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
  }
  return map[v] ?? v
}

/**
 * 주문 정보 로드
 * - API: getPublicOrder
 */
async function load() {
  status.value = 'loading'
  error.value = null
  try {
    order.value = await api.getPublicOrder(orderId.value)
    status.value = 'ready'
  } catch (e) {
    status.value = 'error'
    error.value = e instanceof Error ? e.message : '주문을 불러오지 못했어요.'
  }
}

onMounted(() => {
  void load()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-end justify-between gap-4">
      <div>
        <h1 class="text-lg font-semibold">주문 상세</h1>
        <p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">제작 단계를 확인할 수 있어요.</p>
      </div>

      <button
        type="button"
        class="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
        @click="router.push({ name: 'orders' })"
      >
        주문 목록
      </button>
    </div>

    <div v-if="status === 'error'" class="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
      {{ error }}
    </div>

    <div v-else-if="status === 'loading'" class="h-[360px] animate-pulse rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950" />

    <div v-else-if="order" class="space-y-4">
      <div class="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div class="text-xs font-semibold text-zinc-500 dark:text-zinc-400">주문상세 번호</div>
            <div class="mt-1 text-lg font-semibold tracking-tight">{{ order.orderNo }}</div>
            <div class="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{{ formatDate(order.orderedAt) }}</div>
          </div>
          <div class="text-right">
            <div class="text-xs font-semibold text-zinc-500 dark:text-zinc-400">상태</div>
            <div class="mt-1 text-sm font-semibold">{{ label(order.orderStatus) }}</div>
            <div class="mt-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">총액</div>
            <div class="mt-1 text-xl font-semibold">{{ money(order.totalJpy) }}</div>
          </div>
        </div>
      </div>

      <ProductionStepsTimeline :steps="order.productionSteps" />
    </div>

    <div v-else class="rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
      주문 정보가 없어요.
    </div>
  </div>
</template>

