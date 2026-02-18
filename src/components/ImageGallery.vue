<script setup lang="ts">
/**
 * 이미지 갤러리 컴포넌트
 * - 역할: 상품 상세 페이지 등에서 여러 이미지를 썸네일과 함께 보여줌
 * - 주요 기능: 이미지 선택 시 메인 이미지 변경
 * - 의존성: vue, @/lib/types.ts
 */
import type { ProductImage } from '@/lib/types'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  images: ProductImage[]
  alt: string
}>()

/**
 * 정렬된 이미지 목록
 * - sort 필드를 기준으로 오름차순 정렬
 */
const sorted = computed(() => [...props.images].sort((a, b) => a.sort - b.sort))

/** 현재 선택된 이미지 ID */
const selectedId = ref<string | null>(sorted.value[0]?.id ?? null)

/**
 * 이미지 목록 변경 감지
 * - 목적: 이미지가 새로 로드되면 첫 번째 이미지를 선택 상태로 설정
 */
watch(
  () => sorted.value[0]?.id,
  (next) => {
    selectedId.value = next ?? null
  },
)

/** 현재 선택된 이미지 객체 */
const selected = computed(() => sorted.value.find((it) => it.id === selectedId.value) ?? sorted.value[0])
</script>

<template>
  <div class="grid  min-w-0 gap-3 md:grid-cols-[1fr_96px]">
    <!-- 메인 이미지 영역 -->
    <div class="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border ">
      <img
        v-if="selected"
        :src="selected.url"
        :alt="alt"
        class="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
      >
    </div>

    <!-- 썸네일 목록 영역 -->
    <div class="flex min-w-0 gap-2 overflow-x-auto md:flex-col md:overflow-y-auto">
      <button
        v-for="img in sorted"
        :key="img.id"
        type="button"
        class="shrink-0 overflow-hidden rounded-xl border transition"
        :class="
          img.id === selectedId
            ? 'border-emerald-500 ring-4 ring-emerald-500/20'
            : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700'
        "
        @click="selectedId = img.id"
      >
        <img
          :src="img.url"
          :alt="alt"
          class="h-20 w-20 object-cover md:h-24 md:w-24"
          loading="lazy"
        >
      </button>
    </div>
  </div>
</template>
