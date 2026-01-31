<script setup lang="ts">
/**
 * 리뷰 작성 폼 컴포넌트
 * - 역할: 사용자가 상품에 대한 리뷰(닉네임, 평점, 내용)를 작성하고 제출
 * - 주요 기능: 입력 값 검증, 리뷰 생성 API 호출
 * - 의존성: vue, @/lib/api.ts, @/lib/types.ts
 */
import { ref } from 'vue'
import { api } from '@/lib/api'
import type { Review } from '@/lib/types'

const props = defineProps<{ productId: string; orderId: string }>()
const emit = defineEmits<{ created: [review: Review] }>()

const authorName = ref('')
const rating = ref(5)
const body = ref('')
const phoneLast4 = ref('')
const status = ref<'idle' | 'saving' | 'error'>('idle')
const error = ref<string | null>(null)

/**
 * 리뷰 제출 함수
 * - 목적: 입력된 리뷰 정보를 서버로 전송하여 저장합니다.
 * - 입력: authorName, rating, body (Reactive 상태)
 * - 출력: 없음 (emit으로 상위 컴포넌트에 알림)
 * - 예외 처리:
 *   - 필수 입력값 누락 시 에러 메시지 표시
 *   - API 호출 실패 시 에러 메시지 표시
 * - 비즈니스 로직:
 *   1. 입력값 검증
 *   2. API `createReview` 호출
 *   3. 성공 시 폼 초기화 및 `created` 이벤트 발생
 */
async function submit() {
  const name = authorName.value.trim()
  const text = body.value.trim()
  const digits = phoneLast4.value.replace(/\D+/g, '')
  if (digits.length < 4) {
    status.value = 'error'
    error.value = '전화번호 마지막 4자리를 정확히 입력해 주세요.'
    return
  }
  if (!name || !text) {
    status.value = 'error'
    error.value = '닉네임과 리뷰 내용을 입력해 주세요.'
    return
  }
  status.value = 'saving'
  error.value = null
  try {
    const created = await api.createReview(props.productId, {
      authorName: name,
      rating: rating.value,
      body: text,
      orderId: props.orderId,
      phoneLast4: digits,
    })
    emit('created', created)
    // 폼 초기화
    authorName.value = ''
    rating.value = 5
    body.value = ''
    phoneLast4.value = ''
    status.value = 'idle'
  } catch (e) {
    status.value = 'error'
    error.value = e instanceof Error ? e.message : '리뷰 등록에 실패했어요.'
  }
}
</script>

<template>
  <form class="space-y-3" @submit.prevent="submit">
    <div class="grid gap-3 sm:grid-cols-2">
      <!-- 닉네임 입력 -->
      <div class="space-y-1">
        <div class="text-xs font-semibold text-zinc-600 dark:text-zinc-300">닉네임</div>
        <input
          v-model="authorName"
          class="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-500/30 focus:ring-4 dark:border-zinc-800 dark:bg-zinc-950"
          placeholder="예) 민지"
        />
      </div>
      <!-- 평점 선택 -->
      <div class="space-y-1">
        <div class="text-xs font-semibold text-zinc-600 dark:text-zinc-300">평점</div>
        <select
          v-model.number="rating"
          class="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-500/30 focus:ring-4 dark:border-zinc-800 dark:bg-zinc-950"
        >
          <option v-for="n in 5" :key="n" :value="n">{{ n }}점</option>
        </select>
      </div>
    </div>
    <!-- 리뷰 내용 입력 -->
    <div class="space-y-1">
      <div class="text-xs font-semibold text-zinc-600 dark:text-zinc-300">리뷰</div>
      <textarea
        v-model="body"
        rows="4"
        class="w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm leading-6 outline-none ring-emerald-500/30 focus:ring-4 dark:border-zinc-800 dark:bg-zinc-950"
        placeholder="상품이 어땠는지 적어 주세요"
      />
    </div>
    <div class="space-y-1">
      <div class="text-xs font-semibold text-zinc-600 dark:text-zinc-300">전화번호 인증</div>
      <input
        v-model="phoneLast4"
        maxlength="4"
        class="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-500/30 focus:ring-4 dark:border-zinc-800 dark:bg-zinc-950"
        placeholder="전화번호 마지막 4자리"
      />
    </div>
    
    <!-- 제출 버튼 및 에러 메시지 -->
    <div class="flex items-center justify-between gap-3">
      <div v-if="error" class="text-xs font-semibold text-rose-600">{{ error }}</div>
      <button
        type="submit"
        class="ml-auto inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
        :disabled="status === 'saving'"
      >
        {{ status === 'saving' ? '등록 중...' : '리뷰 등록' }}
      </button>
    </div>
  </form>
</template>
