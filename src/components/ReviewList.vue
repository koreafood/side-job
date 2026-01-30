<script setup lang="ts">
/**
 * 리뷰 목록 컴포넌트
 * - 역할: 등록된 리뷰 목록을 표시
 * - 주요 기능: 작성자, 작성일, 평점, 내용 표시
 * - 의존성: vue, @/lib/types.ts, RatingStars.vue
 */
import type { Review } from '@/lib/types'
import RatingStars from '@/components/RatingStars.vue'

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
      <div class="mt-1">
        <RatingStars :value="r.rating" size="sm" />
      </div>
      <p class="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-700 dark:text-zinc-200">
        {{ r.body }}
      </p>
    </div>
  </div>
</template>
