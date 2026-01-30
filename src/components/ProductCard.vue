<script setup lang="ts">
import type { Product } from '@/lib/types'

defineProps<{
  product: Product
}>()
</script>

<template>
  <button
    type="button"
    class="group w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-950"
    @click="$router.push({ name: 'product', params: { productId: product.id } })"
  >
    <div class="aspect-[4/3] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900">
      <img
        :src="product.images[0]?.url"
        :alt="product.name"
        class="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
        loading="lazy"
      />
    </div>
    <div class="space-y-1 p-4">
      <div class="line-clamp-1 text-sm font-semibold">
        {{ product.name }}
      </div>
      <div class="text-sm font-semibold">¥{{ product.priceJpy.toLocaleString() }}</div>
      <div class="text-xs text-zinc-500 dark:text-zinc-400">판매자: {{ product.sellerName }}</div>
    </div>
  </button>
</template>
