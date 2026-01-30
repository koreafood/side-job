<script setup lang="ts">
import { ref } from 'vue'
import type { ProductionStep } from '@/lib/types'

defineProps<{
  steps: ProductionStep[]
}>()

const openUrl = ref<string | null>(null)

function formatDate(s: string) {
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleString()
}

function close() {
  openUrl.value = null
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-end justify-between gap-3">
      <div>
        <div class="text-sm font-semibold">제작 단계</div>
        <div class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">단계별 메모와 사진을 확인할 수 있어요.</div>
      </div>
    </div>

    <div v-if="steps.length === 0" class="rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
      아직 공유된 단계가 없어요.
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="s in steps"
        :key="s.id"
        class="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div class="flex items-center justify-between gap-3">
          <div class="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Step {{ s.stepIndex }}</div>
          <div class="text-xs text-zinc-500 dark:text-zinc-400">{{ formatDate(s.createdAt) }}</div>
        </div>
        <div class="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
          {{ s.memo || '메모 없음' }}
        </div>

        <div v-if="s.photos.length" class="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
          <button
            v-for="p in s.photos"
            :key="p.id"
            type="button"
            class="aspect-square overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 transition hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900"
            @click="openUrl = p.url"
          >
            <img :src="p.url" alt="" class="h-full w-full object-cover" />
          </button>
        </div>

        <div v-else class="mt-3 text-xs text-zinc-500 dark:text-zinc-400">사진 없음</div>
      </div>
    </div>

    <div
      v-if="openUrl"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
      @click="close"
    >
      <button
        type="button"
        class="max-h-[90vh] max-w-[92vw] overflow-hidden rounded-2xl border border-white/10 bg-black/20"
        @click.stop
      >
        <img :src="openUrl" alt="" class="max-h-[90vh] max-w-[92vw] object-contain" />
      </button>
    </div>
  </div>
</template>
