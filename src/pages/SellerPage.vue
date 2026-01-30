<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '@/lib/api'
import type { Product, Seller } from '@/lib/types'
import SellerCard from '@/components/SellerCard.vue'
import ProductCard from '@/components/ProductCard.vue'

const route = useRoute()
const sellerId = String(route.params.sellerId)

const status = ref<'loading' | 'error' | 'ready'>('loading')
const error = ref<string | null>(null)
const seller = ref<Seller | null>(null)
const latest = ref<Product[]>([])

onMounted(async () => {
  status.value = 'loading'
  error.value = null
  try {
    seller.value = await api.getSeller(sellerId)
    latest.value = await api.listSellerProducts(sellerId, 3)
    status.value = 'ready'
  } catch (e) {
    status.value = 'error'
    error.value = e instanceof Error ? e.message : '판매자 정보를 불러오지 못했어요.'
  }
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-lg font-semibold">판매자 프로필</h1>
        <p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">스크린샷 스타일의 프로필 화면</p>
      </div>
    </div>

    <div v-if="status === 'error'" class="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
      {{ error }}
    </div>

    <div v-else-if="status === 'loading'" class="grid gap-4 lg:grid-cols-[320px_1fr_320px]">
      <div class="h-[220px] animate-pulse rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950" />
      <div class="h-[220px] animate-pulse rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950" />
      <div class="h-[220px] animate-pulse rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950" />
    </div>

    <div v-else class="grid gap-4 lg:grid-cols-[320px_1fr_320px]">
      <div>
        <SellerCard v-if="seller" :seller="seller" />
      </div>

      <section
        class="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
      >
        <h2 class="text-sm font-semibold">{{ seller?.name }}의 프로필</h2>
        <p class="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-700 dark:text-zinc-200">
          {{ seller?.bio }}
        </p>
      </section>

      <aside class="space-y-3">
        <div class="text-sm font-semibold text-zinc-700 dark:text-zinc-200">최신 상품 페이지</div>
        <ProductCard v-if="latest[0]" :product="latest[0]" />
        <div v-else class="rounded-2xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
          아직 등록된 상품이 없어요.
        </div>
      </aside>
    </div>
  </div>
</template>

