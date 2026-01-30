<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { api } from '@/lib/api'
import type { Seller } from '@/lib/types'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'

const router = useRouter()

const status = ref<'idle' | 'loading' | 'submitting' | 'error' | 'ready'>('idle')
const error = ref<string | null>(null)
const sellers = ref<Seller[]>([])

type LocalImage = { file: File; previewUrl: string }
const localImages = ref<LocalImage[]>([])

const form = reactive({
  sellerId: '',
  name: '',
  description: '',
  detailsHtml: '',
  priceJpy: 2000,
})

const canSubmit = computed(() => {
  if (!form.sellerId.trim()) return false
  if (!form.name.trim()) return false
  if (!String(form.priceJpy).trim()) return false
  const price = Number(form.priceJpy)
  if (!Number.isFinite(price) || price < 0) return false
  const hasAnyImage = localImages.value.length > 0
  return hasAnyImage
})

function onPickFiles(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue
    const previewUrl = URL.createObjectURL(file)
    localImages.value.push({ file, previewUrl })
  }
  input.value = ''
}

function removeLocalImage(index: number) {
  const it = localImages.value[index]
  if (!it) return
  URL.revokeObjectURL(it.previewUrl)
  localImages.value.splice(index, 1)
}

const editor = useEditor({
  extensions: [StarterKit, Image],
  content: '',
  onUpdate: ({ editor }) => {
    form.detailsHtml = editor.getHTML()
  },
})

function setInitialDetails(html: string) {
  form.detailsHtml = html
  editor?.value?.chain().setContent(html || '').run()
}

const detailImgInput = ref<HTMLInputElement | null>(null)

async function onPickDetailImages(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue
    const res = await api.uploadAdminImage(file)
    editor?.value?.chain().focus().setImage({ src: res.url }).run()
  }
  input.value = ''
}

function triggerDetailImage() {
  detailImgInput.value?.click()
}

async function loadSellers() {
  status.value = 'loading'
  error.value = null
  try {
    sellers.value = await api.listSellers()
    if (!form.sellerId && sellers.value.length > 0) {
      form.sellerId = sellers.value[0].id
    }
    setInitialDetails('')
    status.value = 'ready'
  } catch (e) {
    status.value = 'error'
    error.value = e instanceof Error ? e.message : '판매자 목록을 불러오지 못했어요.'
  }
}

async function submit() {
  if (!canSubmit.value) return
  status.value = 'submitting'
  error.value = null
  try {
    const uploaded = [] as string[]
    for (const it of localImages.value) {
      const res = await api.uploadAdminImage(it.file)
      uploaded.push(res.url)
    }

    const images = uploaded.map((url, i) => ({ url, sort: i + 1 }))

    const created = await api.createAdminProduct({
      sellerId: form.sellerId,
      name: form.name.trim(),
      description: form.description.trim(),
      detailsHtml: form.detailsHtml,
      priceJpy: Number(form.priceJpy),
      images,
    })

    await router.push({ name: 'product', params: { productId: created.id } })
  } catch (e) {
    status.value = 'ready'
    error.value = e instanceof Error ? e.message : '상품 등록에 실패했어요.'
  }
}

onMounted(() => {
  void loadSellers()
})

onUnmounted(() => {
  for (const it of localImages.value) URL.revokeObjectURL(it.previewUrl)
})
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-lg font-semibold">상품 등록</h1>
      <p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
        내 컴퓨터에서 사진을 업로드해 등록할 수 있어요.
      </p>
    </div>

    <div v-if="status === 'error'" class="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
      {{ error }}
    </div>

    <form
      v-else
      class="grid gap-6 lg:grid-cols-[1fr_360px]"
      @submit.prevent="submit"
    >
      <section class="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="space-y-1">
            <div class="text-sm font-medium">판매자</div>
            <select
              v-model="form.sellerId"
              class="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-500/30 transition focus:ring-4 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <option v-for="s in sellers" :key="s.id" :value="s.id">{{ s.name }}</option>
            </select>
          </label>

          <label class="space-y-1">
            <div class="text-sm font-medium">가격(JPY)</div>
            <input
              v-model.number="form.priceJpy"
              type="number"
              min="0"
              step="1"
              class="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-500/30 transition focus:ring-4 dark:border-zinc-800 dark:bg-zinc-950"
            />
          </label>
        </div>

        <label class="space-y-1">
          <div class="text-sm font-medium">상품명</div>
          <input
            v-model="form.name"
            type="text"
            class="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-500/30 transition focus:ring-4 dark:border-zinc-800 dark:bg-zinc-950"
            placeholder="예) 오쿠치의 랩 스커트"
          />
        </label>

        <label class="space-y-1">
          <div class="text-sm font-medium">설명</div>
          <textarea
            v-model="form.description"
            rows="6"
            class="w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-500/30 transition focus:ring-4 dark:border-zinc-800 dark:bg-zinc-950"
            placeholder="상품 설명을 입력해 주세요"
          />
        </label>

        <div class="space-y-2">
          <div class="text-sm font-medium">상세정보(리치 텍스트)</div>
          <div class="rounded-2xl border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div class="mb-2 flex flex-wrap gap-2">
              <button
                type="button"
                class="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                @click="editor?.chain().focus().toggleBold().run()"
              >
                Bold
              </button>
              <button
                type="button"
                class="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                @click="editor?.chain().focus().toggleItalic().run()"
              >
                Italic
              </button>
              <button
                type="button"
                class="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                @click="editor?.chain().focus().toggleBulletList().run()"
              >
                • List
              </button>
              <button
                type="button"
                class="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                @click="editor?.chain().focus().setParagraph().run()"
              >
                Paragraph
              </button>
              <button
                type="button"
                class="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs font-semibold transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
                @click="triggerDetailImage"
              >
                Image
              </button>
              <input
                ref="detailImgInput"
                type="file"
                accept="image/*"
                multiple
                class="sr-only"
                @change="onPickDetailImages"
              />
            </div>
            <EditorContent :editor="editor" />
          </div>
        </div>

        <div class="space-y-2">
          <div class="text-sm font-medium">내 컴퓨터 사진</div>
          <input
            type="file"
            accept="image/*"
            multiple
            class="block w-full text-sm"
            @change="onPickFiles"
          />
          <div v-if="localImages.length" class="mt-2 grid grid-cols-3 gap-2">
            <div
              v-for="(it, idx) in localImages"
              :key="it.previewUrl"
              class="relative aspect-square overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <img :src="it.previewUrl" alt="" class="h-full w-full object-cover" />
              <button
                type="button"
                class="absolute right-2 top-2 rounded-lg bg-black/60 px-2 py-1 text-xs font-semibold text-white"
                @click="removeLocalImage(idx)"
              >
                삭제
              </button>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            class="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            :disabled="!canSubmit || status === 'submitting'"
          >
            {{ status === 'submitting' ? '등록 중…' : '상품 등록' }}
          </button>
        </div>
      </section>

      <aside class="space-y-4">
        <div class="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <div class="text-sm font-medium">미리보기</div>
          <div class="mt-3 grid grid-cols-3 gap-2">
            <div
              v-for="it in localImages"
              :key="`local_prev_${it.previewUrl}`"
              class="aspect-square overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <img :src="it.previewUrl" alt="" class="h-full w-full object-cover" />
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
          등록 후 상품 상세 페이지로 이동해요.
        </div>
      </aside>
    </form>
  </div>
</template>
