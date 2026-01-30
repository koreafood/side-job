<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import { api } from '@/lib/api'
import type { ProductionStep } from '@/lib/types'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-vue-next'

const props = defineProps<{
  orderId: string
  steps: ProductionStep[]
}>()

const emit = defineEmits<{
  (e: 'update:steps', steps: ProductionStep[]): void
}>()

const status = ref<'idle' | 'saving'>('idle')
const error = ref<string | null>(null)
const newMemo = ref('')

type LocalImage = { file: File; previewUrl: string }
const local = ref<Record<string, LocalImage[]>>({})

function ensureLocal(stepId: string) {
  if (!local.value[stepId]) local.value[stepId] = []
  return local.value[stepId]
}

function localFor(stepId: string) {
  return local.value[stepId] ?? []
}

function onPickFiles(stepId: string, e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  const arr = ensureLocal(stepId)
  for (const f of files) {
    if (!f.type.startsWith('image/')) continue
    const previewUrl = URL.createObjectURL(f)
    arr.push({ file: f, previewUrl })
  }
  input.value = ''
}

function removeLocal(stepId: string, index: number) {
  const arr = ensureLocal(stepId)
  const it = arr[index]
  if (!it) return
  URL.revokeObjectURL(it.previewUrl)
  arr.splice(index, 1)
}

async function addStep() {
  status.value = 'saving'
  error.value = null
  try {
    const steps = await api.createProductionStep(props.orderId, { memo: newMemo.value.trim() })
    emit('update:steps', steps)
    newMemo.value = ''
  } catch (e) {
    error.value = e instanceof Error ? e.message : '단계 추가에 실패했어요.'
  } finally {
    status.value = 'idle'
  }
}

async function saveMemo(stepId: string, memo: string) {
  status.value = 'saving'
  error.value = null
  try {
    const steps = await api.updateProductionStep(stepId, { memo })
    emit('update:steps', steps)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '메모 저장에 실패했어요.'
  } finally {
    status.value = 'idle'
  }
}

function onMemoChange(stepId: string, e: Event) {
  const input = e.target as HTMLInputElement
  void saveMemo(stepId, input.value)
}

async function moveStep(stepId: string, direction: 'up' | 'down') {
  status.value = 'saving'
  error.value = null
  try {
    const steps = await api.moveProductionStep(stepId, { direction })
    emit('update:steps', steps)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '순서 변경에 실패했어요.'
  } finally {
    status.value = 'idle'
  }
}

async function deleteStep(stepId: string) {
  const ok = window.confirm('이 단계를 삭제할까요? (단계 사진도 함께 삭제됩니다)')
  if (!ok) return
  status.value = 'saving'
  error.value = null
  try {
    const steps = await api.deleteProductionStep(stepId)
    emit('update:steps', steps)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '단계 삭제에 실패했어요.'
  } finally {
    status.value = 'idle'
  }
}

async function uploadPhotos(stepId: string) {
  const arr = ensureLocal(stepId)
  if (arr.length === 0) return
  status.value = 'saving'
  error.value = null
  try {
    let steps: ProductionStep[] | null = null
    for (const it of arr) {
      const up = await api.uploadAdminImage(it.file)
      steps = await api.addProductionStepPhoto(stepId, { url: up.url })
    }
    if (steps) emit('update:steps', steps)
    for (const it of arr) URL.revokeObjectURL(it.previewUrl)
    local.value[stepId] = []
  } catch (e) {
    error.value = e instanceof Error ? e.message : '사진 업로드에 실패했어요.'
  } finally {
    status.value = 'idle'
  }
}

async function deletePhoto(photoId: string) {
  const ok = window.confirm('이 사진을 삭제할까요?')
  if (!ok) return
  status.value = 'saving'
  error.value = null
  try {
    const steps = await api.deleteProductionStepPhoto(photoId)
    emit('update:steps', steps)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '사진 삭제에 실패했어요.'
  } finally {
    status.value = 'idle'
  }
}

async function movePhoto(photoId: string, direction: 'up' | 'down') {
  status.value = 'saving'
  error.value = null
  try {
    const steps = await api.moveProductionStepPhoto(photoId, { direction })
    emit('update:steps', steps)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '사진 순서 변경에 실패했어요.'
  } finally {
    status.value = 'idle'
  }
}

function stepKey(s: ProductionStep) {
  return `${s.stepIndex}`
}

function formatDate(s: string) {
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  return d.toLocaleString()
}

onUnmounted(() => {
  for (const arr of Object.values(local.value) as LocalImage[][]) {
    for (const it of arr) URL.revokeObjectURL(it.previewUrl)
  }
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-end justify-between gap-3">
      <div>
        <div class="text-sm font-semibold">제작 단계</div>
        <div class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">단계별 메모와 사진을 추가할 수 있어요.</div>
      </div>
    </div>

    <div class="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          v-model="newMemo"
          type="text"
          class="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-500/30 transition focus:ring-4 dark:border-zinc-800 dark:bg-zinc-950"
          placeholder="새 단계 한줄 메모(선택)"
        />
        <button
          type="button"
          class="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
          :disabled="status === 'saving'"
          @click="addStep"
        >
          <Plus class="h-4 w-4" />
          단계 추가
        </button>
      </div>
    </div>

    <div v-if="error" class="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200">
      {{ error }}
    </div>

    <div v-if="steps.length === 0" class="rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
      아직 등록된 단계가 없어요.
    </div>

    <div v-else class="space-y-3">
      <div
        v-for="(s, idx) in steps"
        :key="s.id"
        class="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
      >
        <div class="flex items-start justify-between gap-3">
          <div>
            <div class="flex items-center gap-3">
              <div class="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Step {{ stepKey(s) }}</div>
              <div class="text-xs text-zinc-500 dark:text-zinc-400">{{ formatDate(s.createdAt) }}</div>
            </div>
            <div class="mt-2">
              <input
                :value="s.memo"
                type="text"
                class="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-500/30 transition focus:ring-4 dark:border-zinc-800 dark:bg-zinc-950"
                placeholder="한줄 메모"
                @change="onMemoChange(s.id, $event)"
              />
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white p-2 text-sm font-semibold transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
              :disabled="idx === 0 || status === 'saving'"
              @click="moveStep(s.id, 'up')"
            >
              <ArrowUp class="h-4 w-4" />
            </button>
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-xl border border-zinc-200 bg-white p-2 text-sm font-semibold transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
              :disabled="idx === steps.length - 1 || status === 'saving'"
              @click="moveStep(s.id, 'down')"
            >
              <ArrowDown class="h-4 w-4" />
            </button>
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 p-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-950/60"
              :disabled="status === 'saving'"
              @click="deleteStep(s.id)"
            >
              <Trash2 class="h-4 w-4" />
            </button>
          </div>
        </div>

        <div class="mt-4 grid gap-4 lg:grid-cols-[1fr_auto]">
          <div class="space-y-3">
            <div class="text-xs font-semibold text-zinc-500 dark:text-zinc-400">사진</div>
            <div class="grid grid-cols-3 gap-2 sm:grid-cols-4">
              <div
                v-for="(p, pIdx) in s.photos"
                :key="p.id"
                class="group relative aspect-square overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <img :src="p.url" alt="" class="h-full w-full object-cover" />
                <div class="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/50 p-1 opacity-0 transition group-hover:opacity-100">
                  <button
                    type="button"
                    class="rounded-lg bg-white/90 px-2 py-1 text-xs font-semibold text-zinc-800 disabled:opacity-50"
                    :disabled="pIdx === 0 || status === 'saving'"
                    @click="movePhoto(p.id, 'up')"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    class="rounded-lg bg-white/90 px-2 py-1 text-xs font-semibold text-zinc-800 disabled:opacity-50"
                    :disabled="pIdx === s.photos.length - 1 || status === 'saving'"
                    @click="movePhoto(p.id, 'down')"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    class="rounded-lg bg-rose-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
                    :disabled="status === 'saving'"
                    @click="deletePhoto(p.id)"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>

            <div v-if="localFor(s.id).length" class="grid grid-cols-3 gap-2 sm:grid-cols-4">
              <div
                v-for="(it, lIdx) in localFor(s.id)"
                :key="it.previewUrl"
                class="relative aspect-square overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
              >
                <img :src="it.previewUrl" alt="" class="h-full w-full object-cover" />
                <button
                  type="button"
                  class="absolute right-2 top-2 rounded-lg bg-black/60 px-2 py-1 text-xs font-semibold text-white"
                  @click="removeLocal(s.id, lIdx)"
                >
                  제거
                </button>
              </div>
            </div>
          </div>

          <div class="flex flex-col gap-2">
            <input
              type="file"
              accept="image/*"
              multiple
              class="block w-full text-sm"
              @change="onPickFiles(s.id, $event)"
            />
            <button
              type="button"
              class="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
              :disabled="status === 'saving' || localFor(s.id).length === 0"
              @click="uploadPhotos(s.id)"
            >
              {{ status === 'saving' ? '업로드 중…' : '선택한 사진 업로드' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
