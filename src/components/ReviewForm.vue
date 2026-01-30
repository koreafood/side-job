<script setup lang="ts">
import { ref } from 'vue'
import { api } from '@/lib/api'
import type { Review } from '@/lib/types'

const props = defineProps<{ productId: string }>()
const emit = defineEmits<{ created: [review: Review] }>()

const authorName = ref('')
const rating = ref(5)
const body = ref('')
const status = ref<'idle' | 'saving' | 'error'>('idle')
const error = ref<string | null>(null)

async function submit() {
  const name = authorName.value.trim()
  const text = body.value.trim()
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
    })
    emit('created', created)
    authorName.value = ''
    rating.value = 5
    body.value = ''
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
      <div class="space-y-1">
        <div class="text-xs font-semibold text-zinc-600 dark:text-zinc-300">닉네임</div>
        <input
          v-model="authorName"
          class="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-500/30 focus:ring-4 dark:border-zinc-800 dark:bg-zinc-950"
          placeholder="예) 민지"
        />
      </div>
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
    <div class="space-y-1">
      <div class="text-xs font-semibold text-zinc-600 dark:text-zinc-300">리뷰</div>
      <textarea
        v-model="body"
        rows="4"
        class="w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm leading-6 outline-none ring-emerald-500/30 focus:ring-4 dark:border-zinc-800 dark:bg-zinc-950"
        placeholder="상품이 어땠는지 적어 주세요"
      />
    </div>
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

