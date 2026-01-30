<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminStore } from '@/composables/useAdminStore'
import { ApiError } from '@/lib/api'

const router = useRouter()
const admin = useAdminStore()
const password = ref('')
const status = ref<'idle' | 'error' | 'submitting'>('idle')
const error = ref<string | null>(null)

async function submit() {
  if (!password.value.trim()) return
  status.value = 'submitting'
  error.value = null
  try {
    await admin.login(password.value)
    if (!admin.isAdmin.value) {
      throw new Error('비밀번호가 올바르지 않아요.')
    }
    await router.push({ name: 'home' })
  } catch (e) {
    status.value = 'error'
    if (e instanceof ApiError) {
      const b = e.body as any
      const msg =
        b && typeof b === 'object' && typeof b.detail === 'string'
          ? b.detail
          : e.status === 401
            ? '비밀번호가 올바르지 않아요.'
            : '로그인에 실패했어요.'
      error.value = msg
    } else {
      error.value = e instanceof Error ? e.message : '로그인에 실패했어요.'
    }
  }
}
</script>

<template>
  <div class="mx-auto max-w-md space-y-6">
    <div>
      <h1 class="text-lg font-semibold">관리자 로그인</h1>
      <p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">관리자만 상품 등록/수정/주문관리를 사용할 수 있어요.</p>
    </div>

    <div v-if="status === 'error'" class="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
      {{ error }}
    </div>

    <form class="space-y-4" @submit.prevent="submit">
      <label class="space-y-1">
        <div class="text-sm font-medium">비밀번호</div>
        <input
          v-model="password"
          type="password"
          class="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-500/30 transition focus:ring-4 dark:border-zinc-800 dark:bg-zinc-950"
          placeholder="비밀번호를 입력해 주세요"
        />
      </label>
      <div class="pt-2">
        <button
          type="submit"
          class="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
          :disabled="status === 'submitting'"
        >
          로그인
        </button>
      </div>
    </form>
  </div>
</template>
