<script setup lang="ts">
/**
 * 리뷰 목록 컴포넌트
 * - 역할: 등록된 리뷰 목록을 표시
 * - 주요 기능: 작성자, 작성일, 평점, 내용 표시
 * - 의존성: vue, @/lib/types.ts, RatingStars.vue
 */
import type { Review } from '@/lib/types'

defineProps<{
  reviews: Review[]
}>()

/**
 * 날짜 포맷 함수
 * - 목적: ISO 날짜 문자열을 사용자 친화적인 로컬 날짜 문자열로 변환
 * - 입력: iso (string)
 * - 출력: string (예: '2023. 10. 27.')
 */
function formatDate(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString()
}
</script>

<template>
  <div class="space-y-3">
    <div
      v-for="r in reviews"
      :key="r.id"
      class="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div class="flex items-center justify-between gap-3">
        <div class="text-sm font-semibold">{{ r.authorName }}</div>
        <div class="text-xs text-zinc-500 dark:text-zinc-400">{{ formatDate(r.createdAt) }}</div>
      </div>
      <p class="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700 dark:text-zinc-200">
        {{ r.body }}
      </p>
      <div v-if="r.photos?.length" class="mt-3 grid grid-cols-3 gap-2">
        <div
          v-for="p in r.photos"
          :key="p.id"
          class="aspect-square overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <img :src="p.url" alt="" class="h-full w-full object-cover" />
        </div>
      </div>
    </div>
  </div>
</template>
