<script setup lang="ts">
/**
 * 리뷰 목록 컴포넌트
 * - 역할: 등록된 리뷰 목록을 표시
 * - 주요 기능: 작성자, 작성일, 평점, 내용 표시
 * - 의존성: vue, @/lib/types.ts, RatingStars.vue
 */
import { ref } from 'vue'
import { api, ApiError } from '@/lib/api'
import type { Review } from '@/lib/types'

const props = defineProps<{
  reviews: Review[]
  allowDelete?: boolean
  orderId?: string
}>()
const emit = defineEmits<{ deleted: [reviewId: string] }>()

const deleteTargetId = ref<string | null>(null)
const deleteName = ref('')
const deletePhoneLast4 = ref('')
const deleteStatus = ref<'idle' | 'saving' | 'error'>('idle')
const deleteError = ref<string | null>(null)

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

function openDelete(reviewId: string) {
  deleteTargetId.value = reviewId
  deleteName.value = ''
  deletePhoneLast4.value = ''
  deleteStatus.value = 'idle'
  deleteError.value = null
}

async function confirmDelete(review: Review) {
  if (!props.orderId) {
    deleteStatus.value = 'error'
    deleteError.value = '주문 정보를 찾을 수 없어요.'
    return
  }
  const name = deleteName.value.trim()
  const digits = deletePhoneLast4.value.replace(/\D+/g, '')
  if (!name || digits.length < 4) {
    deleteStatus.value = 'error'
    deleteError.value = '주문자명과 전화번호 마지막 4자리를 입력해 주세요.'
    return
  }
  deleteStatus.value = 'saving'
  deleteError.value = null
  try {
    await api.deleteReview(review.productId, review.id, {
      authorName: name,
      orderId: props.orderId,
      phoneLast4: digits,
    })
    emit('deleted', review.id)
    deleteTargetId.value = null
    deleteStatus.value = 'idle'
  } catch (e) {
    deleteStatus.value = 'error'
    if (e instanceof ApiError) {
      const body = e.body as { detail?: unknown } | undefined
      if (body && typeof body.detail === 'string') {
        deleteError.value = body.detail
        return
      }
    }
    deleteError.value = e instanceof Error ? e.message : '리뷰 삭제에 실패했어요.'
  }
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
        <div class="flex items-center gap-2">
          <div class="text-xs text-zinc-500 dark:text-zinc-400">{{ formatDate(r.createdAt) }}</div>
          <button
            v-if="props.allowDelete"
            type="button"
            class="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[11px] font-semibold text-zinc-600 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
            @click="openDelete(r.id)"
          >
            삭제
          </button>
        </div>
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
      <div
        v-if="props.allowDelete && deleteTargetId === r.id"
        class="mt-3 rounded-xl border border-zinc-200 bg-white p-3 text-xs dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div class="space-y-2">
          <input
            v-model="deleteName"
            class="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs outline-none ring-emerald-500/30 focus:ring-4 dark:border-zinc-800 dark:bg-zinc-950"
            placeholder="주문자명"
          />
          <input
            v-model="deletePhoneLast4"
            maxlength="4"
            class="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs outline-none ring-emerald-500/30 focus:ring-4 dark:border-zinc-800 dark:bg-zinc-950"
            placeholder="전화번호 마지막 4자리"
          />
        </div>
        <div class="mt-3 flex items-center gap-2">
          <div v-if="deleteError" class="text-xs font-semibold text-rose-600">{{ deleteError }}</div>
          <button
            type="button"
            class="ml-auto inline-flex items-center justify-center rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="deleteStatus === 'saving'"
            @click="confirmDelete(r)"
          >
            {{ deleteStatus === 'saving' ? '삭제 중...' : '리뷰 삭제' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
