<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/lib/api'
import ProductCard from '@/components/ProductCard.vue'
import type { Product } from '@/lib/types'

const route = useRoute()
const status = ref<'idle' | 'loading' | 'error' | 'ready'>('idle')
const error = ref<string | null>(null)
const products = ref<Product[]>([])

const q = computed(() => (typeof route.query.q === 'string' ? route.query.q : ''))

async function load() {
  status.value = 'loading'
  error.value = null
  try {
    products.value = await api.listProducts(q.value.trim() || undefined)
    status.value = 'ready'
  } catch (e) {
    status.value = 'error'
    error.value = e instanceof Error ? e.message : '상품 목록을 불러오지 못했어요.'
  }
}

watch(q, () => {
  void load()
})

onMounted(() => {
  void load()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-end justify-between gap-4">
      <div>
        <h1 class="text-lg font-semibold">핸드메이드 상품</h1>
        <p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          {{ q ? `“${q}” 검색 결과` : '오늘의 추천 상품을 둘러보세요.' }}
        </p>
      </div>
    </div>

    <div v-if="status === 'error'" class="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
      {{ error }}
    </div>

    <div v-if="status === 'loading'" class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="i in 6"
        :key="i"
        class="h-[260px] animate-pulse rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
      />
    </div>

    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <ProductCard v-for="p in products" :key="p.id" :product="p" />
    </div>
  </div>
</template>
