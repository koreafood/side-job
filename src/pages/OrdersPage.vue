<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/lib/api'
import type { PublicOrderDetail } from '@/lib/types'

const router = useRouter()

const status = ref<'idle' | 'loading' | 'error' | 'ready'>('idle')
const error = ref<string | null>(null)
const inputOrderId = ref('')

type Row = { id: string; detail?: PublicOrderDetail; error?: string }
const rows = ref<Row[]>([])

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

function readMyOrders(): string[] {
  try {
    const raw = localStorage.getItem('myOrders')
    const parsed = raw ? (JSON.parse(raw) as unknown) : []
    if (!Array.isArray(parsed)) return []
    return parsed.filter((it): it is string => typeof it === 'string')
  } catch {
    return []
  }
}

function writeMyOrders(ids: string[]) {
  localStorage.setItem('myOrders', JSON.stringify(ids))
}

const ids = computed(() => rows.value.map((r) => r.id))

async function load() {
  status.value = 'loading'
  error.value = null
  const list = readMyOrders()
  rows.value = list.map((id) => ({ id }))

  await Promise.all(
    rows.value.map(async (r) => {
      try {
        r.detail = await api.getPublicOrder(r.id)
      } catch (e) {
        r.error = e instanceof Error ? e.message : '조회 실패'
      }
    }),
  )

  status.value = 'ready'
}

function add() {
  const id = inputOrderId.value.trim()
  if (!id) return
  if (ids.value.includes(id)) {
    inputOrderId.value = ''
    return
  }
  const next = [id, ...ids.value]
  writeMyOrders(next)
  inputOrderId.value = ''
  void load()
}

function remove(id: string) {
  const next = ids.value.filter((it) => it !== id)
  writeMyOrders(next)
  void load()
}

function go(id: string) {
  router.push({ name: 'order-detail', params: { orderId: id } })
}

onMounted(() => {
  void load()
})
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-lg font-semibold">내 주문</h1>
      <p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">주문상세 번호를 클릭하면 제작 단계를 볼 수 있어요.</p>
    </div>

    <div class="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
      <div class="text-sm font-semibold">주문상세 번호 추가</div>
      <div class="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          v-model="inputOrderId"
          type="text"
          class="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-500/30 transition focus:ring-4 dark:border-zinc-800 dark:bg-zinc-950"
          placeholder="예) ord_xxx"
          @keydown.enter.prevent="add"
        />
        <button
          type="button"
          class="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          @click="add"
        >
          추가
        </button>
      </div>
      <div class="mt-2 text-xs text-zinc-500 dark:text-zinc-400">데모용: 이 브라우저에 저장된 주문만 보여요.</div>
    </div>

    <div v-if="status === 'error'" class="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
      {{ error }}
    </div>

    <div v-if="status === 'loading'" class="h-[240px] animate-pulse rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950" />

    <div v-else-if="rows.length === 0" class="rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
      저장된 주문이 없어요.
    </div>

    <div v-else class="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div class="overflow-x-auto">
        <table class="w-full min-w-[720px] text-sm">
          <thead class="border-b border-zinc-200 bg-zinc-50 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300">
            <tr>
              <th class="px-4 py-3 text-left font-semibold">주문상세 번호</th>
              <th class="px-4 py-3 text-left font-semibold">주문일시</th>
              <th class="px-4 py-3 text-right font-semibold">총액</th>
              <th class="px-4 py-3 text-left font-semibold">상태</th>
              <th class="px-4 py-3 text-right font-semibold">액션</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-zinc-200 dark:divide-zinc-800">
            <tr v-for="r in rows" :key="r.id" class="transition hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
              <td class="px-4 py-3 font-semibold">
                <button type="button" class="underline decoration-zinc-300 underline-offset-2" @click="go(r.id)">
                  {{ r.id }}
                </button>
                <div v-if="r.error" class="mt-1 text-xs text-rose-600">{{ r.error }}</div>
              </td>
              <td class="px-4 py-3 text-zinc-700 dark:text-zinc-200">
                {{ r.detail ? formatDate(r.detail.orderedAt) : '-' }}
              </td>
              <td class="px-4 py-3 text-right font-semibold">
                {{ r.detail ? money(r.detail.totalJpy) : '-' }}
              </td>
              <td class="px-4 py-3">
                {{ r.detail ? label(r.detail.orderStatus) : '-' }}
              </td>
              <td class="px-4 py-3 text-right">
                <button
                  type="button"
                  class="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                  @click="remove(r.id)"
                >
                  제거
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

