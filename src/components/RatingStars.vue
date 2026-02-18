<script setup lang="ts">
/**
 * 별점 표시 컴포넌트
 * - 역할: 상품 평점이나 리뷰 평점을 별 모양 아이콘으로 시각화하여 표시
 * - 주요 기능:
 *   - 평점(0~5)에 따른 별 채움 상태 표시
 *   - 리뷰 개수(count) 선택적 표시
 *   - 크기 조절 (sm, md)
 * - 의존성: lucide-vue-next, vue
 */
import { Star } from 'lucide-vue-next'
import { computed } from 'vue'

const props = defineProps<{
  value: number
  count?: number
  size?: 'sm' | 'md'
}>()

/**
 * 별 아이콘 크기 스타일 클래스 (Computed)
 * - size prop에 따라 tailwindcss 클래스 결정
 */
const sizeClass = computed(() => (props.size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'))

/**
 * 채워진 별 개수 계산 (Computed)
 * - 0~5 사이의 정수로 반올림하여 클램핑
 */
const filled = computed(() => Math.max(0, Math.min(5, Math.round(props.value))))
</script>

<template>
  <div class="inline-flex items-center gap-1">
    <Star
      v-for="idx in 5"
      :key="idx"
      :class="[
        sizeClass,
        idx <= filled ? 'fill-amber-400 text-amber-400' : 'text-zinc-300 dark:text-zinc-700',
      ]"
    />
    <span
      v-if="typeof count === 'number'"
      class="ml-1 text-xs text-zinc-500 dark:text-zinc-400"
    >
      ({{ count }})
    </span>
  </div>
</template>

