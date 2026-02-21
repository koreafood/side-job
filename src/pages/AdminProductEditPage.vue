<script setup lang="ts">
/**
 * 파일 역할: 관리자용 상품 수정 페이지
 *
 * 주요 기능:
 * 1. 기존 상품 정보 로드 및 수정 (판매자, 상품명, 가격, 설명 등)
 * 2. 이미지 관리 (기존 이미지 삭제/순서변경/대표이미지 지정, 새 이미지 업로드)
 * 3. 리치 텍스트 에디터(Tiptap)를 이용한 상세 설명 수정
 * 4. 상품 삭제 (삭제 확인 모달 포함)
 *
 * 의존성:
 * - api: 백엔드 API 호출 (getProduct, listSellers, updateAdminProduct, deleteAdminProduct, uploadAdminImage)
 * - Tiptap Editor: 리치 텍스트 편집
 * - useRouter: 수정/삭제 후 페이지 이동
 */

import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/lib/api'
import type { Product, Seller } from '@/lib/types'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'

const route = useRoute()
const router = useRouter()
const defaultSmartstoreUrl = 'https://smartstore.naver.com/lalashopkr/products/5286642948'

const productId = computed(() => String(route.params.productId))

// 로딩/제출/에러 상태 관리
const status = ref<'idle' | 'loading' | 'submitting' | 'error' | 'ready'>('idle')
const error = ref<string | null>(null)
const sellers = ref<Seller[]>([])
const original = ref<Product | null>(null)

// 로컬 이미지 미리보기 타입 및 상태
type LocalImage = { file: File; previewUrl: string }
const localImages = ref<LocalImage[]>([])

// 이미지 관리 상태
const existingImageUrls = ref<string[]>([])
const coverUrl = ref<string | null>(null) // 대표 이미지 URL
const confirmDeleteOpen = ref(false) // 삭제 확인 모달 상태

// 상품 수정 폼 데이터
const form = reactive({
  sellerId: '',
  name: '',
  description: '',
  detailsHtml: '',
  smartstoreUrl: defaultSmartstoreUrl,
  packagingFee: 0,
  basePrice: 0,
  addPrice: 0,
  published: true,
})

// 제출 가능 여부 계산
const canSubmit = computed(() => {
  if (!form.sellerId.trim()) return false
  if (!form.name.trim()) return false
  const packaging = Number(form.packagingFee)
  if (!Number.isFinite(packaging) || packaging < 0) return false
  const base = Number(form.basePrice)
  if (!Number.isFinite(base) || base < 0) return false
  const add = Number(form.addPrice)
  if (!Number.isFinite(add) || add < 0) return false
  const hasAnyImage = existingImageUrls.value.length > 0 || localImages.value.length > 0
  return hasAnyImage
})

// Tiptap 에디터 설정
const editor = useEditor({
  extensions: [StarterKit, Image],
  content: '',
  onUpdate: ({ editor }) => {
    form.detailsHtml = editor.getHTML()
  },
})

/**
 * 에디터 내용 설정
 * @param html HTML 문자열
 */
function setEditorContent(html: string) {
  form.detailsHtml = html
  editor?.value?.chain().setContent(html || '').run()
}

const detailImgInput = ref<HTMLInputElement | null>(null)

/**
 * 상세 설명 이미지 선택 핸들러
 * 에디터 내에 삽입할 이미지를 업로드하고 에디터에 추가합니다.
 */
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

/**
 * 상세 설명 이미지 파일 선택창 열기
 */
function triggerDetailImage() {
  detailImgInput.value?.click()
}

/**
 * 기존 이미지 삭제 핸들러
 * @param index 삭제할 기존 이미지 인덱스
 */
function removeExistingImage(index: number) {
  const removed = existingImageUrls.value.splice(index, 1)[0]
  if (removed && coverUrl.value === removed) {
    // 삭제된 이미지가 대표 이미지였다면 첫 번째 이미지를 대표로 설정
    coverUrl.value = existingImageUrls.value[0] ?? null
  }
}

/**
 * 기존 이미지를 대표 이미지로 설정
 * @param index 설정할 이미지 인덱스
 */
function setCoverExisting(index: number) {
  const url = existingImageUrls.value[index]
  if (url) coverUrl.value = url
}

/**
 * 로컬 파일 선택 핸들러 (새 이미지 추가)
 */
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

/**
 * 로컬 이미지 삭제 핸들러
 * @param index 삭제할 로컬 이미지 인덱스
 */
function removeLocalImage(index: number) {
  const it = localImages.value[index]
  if (!it) return
  URL.revokeObjectURL(it.previewUrl)
  localImages.value.splice(index, 1)
}

/**
 * 상품 정보 로드
 * 상품 정보와 판매자 목록을 병렬로 조회합니다.
 */
async function load() {
  status.value = 'loading'
  error.value = null
  try {
    const [p, ss] = await Promise.all([api.getProduct(productId.value), api.listSellers()])
    original.value = p
    sellers.value = ss
    form.sellerId = p.sellerId
    form.name = p.name
    form.description = p.description
    form.detailsHtml = p.detailsHtml || ''
    form.smartstoreUrl = p.smartstoreUrl || defaultSmartstoreUrl
    setEditorContent(form.detailsHtml)
    form.packagingFee = p.packagingFee
    form.basePrice = p.basePrice
    form.addPrice = p.addPrice
    form.published = p.published
    existingImageUrls.value = p.images.map((it) => it.url)
    coverUrl.value = existingImageUrls.value[0] ?? null
    status.value = 'ready'
  } catch (e) {
    status.value = 'error'
    error.value = e instanceof Error ? e.message : '상품을 불러오지 못했어요.'
  }
}

/**
 * 상품 수정 제출
 */
async function submit() {
  if (!canSubmit.value) return
  status.value = 'submitting'
  error.value = null
  try {
    const urlImages = existingImageUrls.value.map((it) => it.trim()).filter(Boolean)
    
    // 1. 새 로컬 이미지 업로드
    const uploaded = [] as string[]
    for (const it of localImages.value) {
      const res = await api.uploadAdminImage(it.file)
      uploaded.push(res.url)
    }

    // 2. 이미지 순서 정렬 (대표 이미지 -> 새 이미지 -> 나머지 기존 이미지)
    const others = coverUrl.value ? urlImages.filter((u) => u !== coverUrl.value) : urlImages
    const ordered = [
      ...(coverUrl.value ? [coverUrl.value] : []),
      ...uploaded,
      ...others,
    ]
    const images = ordered.map((url, i) => ({ url, sort: i + 1 }))

    // 3. 상품 수정 API 호출
    const updated = await api.updateAdminProduct(productId.value, {
      sellerId: form.sellerId,
      name: form.name.trim(),
      description: form.description.trim(),
      detailsHtml: form.detailsHtml,
      smartstoreUrl: form.smartstoreUrl.trim(),
      packagingFee: Number(form.packagingFee),
      basePrice: Number(form.basePrice),
      addPrice: Number(form.addPrice),
      images,
      published: form.published,
    })
    if (updated.published) {
      await router.push({ name: 'product', params: { productId: updated.id } })
    } else {
      await router.push({ name: 'admin-product-edit', params: { productId: updated.id } })
    }
  } catch (e) {
    status.value = 'ready'
    error.value = e instanceof Error ? e.message : '상품 수정에 실패했어요.'
  }
}

/**
 * 상품 삭제 확인 모달 열기
 */
async function removeProduct() {
  confirmDeleteOpen.value = true
}

/**
 * 상품 삭제 실행
 */
async function confirmDelete() {
  status.value = 'submitting'
  error.value = null
  try {
    await api.deleteAdminProduct(productId.value)
    await router.push({ name: 'home' })
  } catch (e) {
    status.value = 'ready'
    error.value = e instanceof Error ? e.message : '상품 삭제에 실패했어요.'
  } finally {
    confirmDeleteOpen.value = false
  }
}

/**
 * 상품 삭제 취소
 */
function cancelDelete() {
  confirmDeleteOpen.value = false
}

onMounted(() => {
  void load()
})

onUnmounted(() => {
  for (const it of localImages.value) URL.revokeObjectURL(it.previewUrl)
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-end justify-between gap-4">
      <div>
        <h1 class="text-lg font-semibold">
          상품 수정
        </h1>
        <p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          사진을 추가하면 기존 URL과 함께 저장돼요.
        </p>
      </div>

      <button
        type="button"
        class="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:opacity-50 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-950/60"
        :disabled="status === 'submitting'"
        @click="removeProduct"
      >
        삭제
      </button>
    </div>

    <div
      v-if="status === 'error'"
      class="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
    >
      {{ error }}
    </div>

    <form
      v-else
      class="grid gap-6 lg:grid-cols-[1fr_360px]"
      @submit.prevent="submit"
    >
      <div
        v-if="confirmDeleteOpen"
        class="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200"
      >
        <div class="font-semibold">
          정말로 이 상품을 삭제할까요?
        </div>
        <div class="mt-3 flex gap-2">
          <button
            type="button"
            class="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
            @click="cancelDelete"
          >
            취소
          </button>
          <button
            type="button"
            class="rounded-xl bg-rose-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-rose-700"
            @click="confirmDelete"
          >
            삭제
          </button>
        </div>
      </div>
      <section class="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <div class="grid gap-4 sm:grid-cols-2">
          <label class="space-y-1">
            <div class="text-sm font-medium">판매자</div>
            <select
              v-model="form.sellerId"
              class="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-500/30 transition focus:ring-4 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <option
                v-for="s in sellers"
                :key="s.id"
                :value="s.id"
              >{{ s.name }}</option>
            </select>
          </label>
        </div>

        <div class="grid gap-4 sm:grid-cols-3">
          <label class="space-y-1">
            <div class="text-sm font-medium">포장비</div>
            <input
              v-model.number="form.packagingFee"
              type="number"
              min="0"
              step="1"
              class="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-500/30 transition focus:ring-4 dark:border-zinc-800 dark:bg-zinc-950"
            >
          </label>
          <label class="space-y-1">
            <div class="text-sm font-medium">기본가격</div>
            <input
              v-model.number="form.basePrice"
              type="number"
              min="0"
              step="1"
              class="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-500/30 transition focus:ring-4 dark:border-zinc-800 dark:bg-zinc-950"
            >
          </label>
          <label class="space-y-1">
            <div class="text-sm font-medium">추가가격</div>
            <input
              v-model.number="form.addPrice"
              type="number"
              min="0"
              step="1"
              class="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-500/30 transition focus:ring-4 dark:border-zinc-800 dark:bg-zinc-950"
            >
          </label>
        </div>

        <label class="space-y-1">
          <div class="text-sm font-medium">상품명</div>
          <input
            v-model="form.name"
            type="text"
            class="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-500/30 transition focus:ring-4 dark:border-zinc-800 dark:bg-zinc-950"
          >
        </label>

        <label class="space-y-1">
          <div class="text-sm font-medium">설명</div>
          <textarea
            v-model="form.description"
            rows="6"
            class="w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-500/30 transition focus:ring-4 dark:border-zinc-800 dark:bg-zinc-950"
          />
        </label>

        <label class="space-y-1">
          <div class="text-sm font-medium">스마트스토어 URL</div>
          <input
            v-model="form.smartstoreUrl"
            type="url"
            class="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-500/30 transition focus:ring-4 dark:border-zinc-800 dark:bg-zinc-950"
            placeholder="https://smartstore.naver.com/..."
          >
        </label>


        <label class="flex items-center gap-2">
          <input
            v-model="form.published"
            type="checkbox"
          >
          <span class="text-sm">전시 여부 (공개)</span>
        </label>

        <div class="space-y-2">
          <div class="text-sm font-medium">
            상세정보(리치 텍스트)
          </div>
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
              >
            </div>
            <EditorContent :editor="editor" />
          </div>
        </div>

        <div class="space-y-2">
          <div class="text-sm font-medium">
            내 컴퓨터 사진 추가
          </div>
          <input
            type="file"
            accept="image/*"
            multiple
            class="block w-full text-sm"
            @change="onPickFiles"
          >
          <div
            v-if="localImages.length"
            class="mt-2 grid grid-cols-3 gap-2"
          >
            <div
              v-for="(it, idx) in localImages"
              :key="it.previewUrl"
              class="relative aspect-square overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <img
                :src="it.previewUrl"
                alt=""
                class="h-full w-full object-cover"
              >
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

        <div class="space-y-2">
          <div class="text-sm font-medium">
            기존 사진
          </div>
          <div
            v-if="existingImageUrls.length"
            class="grid grid-cols-3 gap-2"
          >
            <div
              v-for="(url, idx) in existingImageUrls"
              :key="`exist_${url}_${idx}`"
              class="relative aspect-square overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <img
                :src="url"
                alt=""
                class="h-full w-full object-cover"
              >
              <div
                v-if="coverUrl === url"
                class="absolute left-2 top-2 rounded-lg bg-emerald-600/80 px-2 py-1 text-xs font-semibold text-white"
              >
                대표
              </div>
              <button
                type="button"
                class="absolute right-2 top-2 rounded-lg bg-black/60 px-2 py-1 text-xs font-semibold text-white"
                @click="removeExistingImage(idx)"
              >
                삭제
              </button>
              <button
                type="button"
                class="absolute left-2 bottom-2 rounded-lg bg-white/80 px-2 py-1 text-xs font-semibold text-zinc-900"
                @click="setCoverExisting(idx)"
              >
                대표로 지정
              </button>
            </div>
          </div>
          <div
            v-else
            class="text-sm text-zinc-500 dark:text-zinc-400"
          >
            기존 사진이 없어요.
          </div>
        </div>

        <div class="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            class="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
            :disabled="!canSubmit || status === 'submitting'"
          >
            {{ status === 'submitting' ? '저장 중…' : '변경 저장' }}
          </button>
        </div>

        <div
          v-if="error"
          class="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200"
        >
          {{ error }}
        </div>
      </section>

      <aside class="space-y-4">
        <div class="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <div class="text-sm font-medium">
            미리보기
          </div>
          <div class="mt-3 grid grid-cols-3 gap-2">
            <div
              v-for="it in localImages"
              :key="`local_prev_${it.previewUrl}`"
              class="aspect-square overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <img
                :src="it.previewUrl"
                alt=""
                class="h-full w-full object-cover"
              >
            </div>
            <div
              v-for="(url, idx) in existingImageUrls"
              :key="`prev_${idx}_${url}`"
              class="aspect-square overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <img
                :src="url"
                alt=""
                class="h-full w-full object-cover"
              >
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
          <div
            v-if="original"
            class="font-semibold"
          >
            현재 상품
          </div>
          <div
            v-if="original"
            class="mt-2 text-xs"
          >
            ID: {{ original.id }}
          </div>
        </div>
      </aside>
    </form>
  </div>
</template>
