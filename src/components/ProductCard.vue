<script setup lang="ts">
/**
 * 상품 카드 컴포넌트
 * - 역할: 상품 목록에서 개별 상품의 요약 정보(이미지, 이름, 가격, 판매자)를 표시
 * - 주요 기능: 클릭 시 해당 상품 상세 페이지로 이동
 * - 의존성: vue, vue-router, @/lib/types.ts
 */
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
    <!-- 상품 썸네일 -->
    <div class="aspect-[4/3] w-full overflow-hidden bg-zinc-100 dark:bg-zinc-900">
      <img
        :src="product.images[0]?.url"
        :alt="product.name"
        class="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
        loading="lazy"
      />
    </div>
    
    <!-- 상품 정보 -->
    <div class="space-y-1 p-4">
      <div class="line-clamp-1 text-sm font-semibold">
        {{ product.name }}
      </div>
      <div class="text-sm font-semibold">
        {{ product.priceJpy.toLocaleString() }}<span class="ml-0.5 text-[0.75em]">원</span>
      </div>
      <div class="text-xs text-zinc-500 dark:text-zinc-400">판매자: {{ product.sellerName }}</div>
    </div>
  </button>
</template>
