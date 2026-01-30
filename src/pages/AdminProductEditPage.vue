<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/lib/api'
import type { Product, Seller } from '@/lib/types'

const route = useRoute()
const router = useRouter()

const productId = computed(() => String(route.params.productId))

const status = ref<'idle' | 'loading' | 'submitting' | 'error' | 'ready'>('idle')
const error = ref<string | null>(null)
const sellers = ref<Seller[]>([])
const original = ref<Product | null>(null)

type LocalImage = { file: File; previewUrl: string }
const localImages = ref<LocalImage[]>([])

const existingImageUrls = ref<string[]>([])

const form = reactive({
  sellerId: '',
  name: '',
  description: '',
  priceJpy: 0,
})

const canSubmit = computed(() => {
  if (!form.sellerId.trim()) return false
  if (!form.name.trim()) return false
  const price = Number(form.priceJpy)
  if (!Number.isFinite(price) || price < 0) return false
  const hasAnyImage = existingImageUrls.value.length > 0 || localImages.value.length > 0
  return hasAnyImage
})

function removeExistingImage(index: number) {
  existingImageUrls.value.splice(index, 1)
}

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
    form.priceJpy = p.priceJpy
    existingImageUrls.value = p.images.map((it) => it.url)
    status.value = 'ready'
  } catch (e) {
    status.value = 'error'
    error.value = e instanceof Error ? e.message : '상품을 불러오지 못했어요.'
  }
}

async function submit() {
  if (!canSubmit.value) return
  status.value = 'submitting'
  error.value = null
  try {
    const urlImages = existingImageUrls.value.map((it) => it.trim()).filter(Boolean)
    const uploaded = [] as string[]
    for (const it of localImages.value) {
      const res = await api.uploadAdminImage(it.file)
      uploaded.push(res.url)
    }

    const images = [...uploaded, ...urlImages].map((url, i) => ({ url, sort: i + 1 }))
    const updated = await api.updateAdminProduct(productId.value, {
      sellerId: form.sellerId,
      name: form.name.trim(),
      description: form.description.trim(),
      priceJpy: Number(form.priceJpy),
      images,
    })
    await router.push({ name: 'product', params: { productId: updated.id } })
  } catch (e) {
    status.value = 'ready'
    error.value = e instanceof Error ? e.message : '상품 수정에 실패했어요.'
  }
}

async function removeProduct() {
  const ok = window.confirm('정말로 이 상품을 삭제할까요?')
  if (!ok) return
  status.value = 'submitting'
  error.value = null
  try {
    await api.deleteAdminProduct(productId.value)
    await router.push({ name: 'home' })
  } catch (e) {
    status.value = 'ready'
    error.value = e instanceof Error ? e.message : '상품 삭제에 실패했어요.'
  }
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
        <h1 class="text-lg font-semibold">상품 수정</h1>
        <p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">사진을 추가하면 기존 URL과 함께 저장돼요.</p>
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
          />
        </label>

        <label class="space-y-1">
          <div class="text-sm font-medium">설명</div>
          <textarea
            v-model="form.description"
            rows="6"
            class="w-full resize-none rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-500/30 transition focus:ring-4 dark:border-zinc-800 dark:bg-zinc-950"
          />
        </label>

        <div class="space-y-2">
          <div class="text-sm font-medium">내 컴퓨터 사진 추가</div>
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

        <div class="space-y-2">
          <div class="text-sm font-medium">기존 사진</div>
          <div v-if="existingImageUrls.length" class="grid grid-cols-3 gap-2">
            <div
              v-for="(url, idx) in existingImageUrls"
              :key="`exist_${url}_${idx}`"
              class="relative aspect-square overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <img :src="url" alt="" class="h-full w-full object-cover" />
              <button
                type="button"
                class="absolute right-2 top-2 rounded-lg bg-black/60 px-2 py-1 text-xs font-semibold text-white"
                @click="removeExistingImage(idx)"
              >
                삭제
              </button>
            </div>
          </div>
          <div v-else class="text-sm text-zinc-500 dark:text-zinc-400">기존 사진이 없어요.</div>
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
          <div class="text-sm font-medium">미리보기</div>
          <div class="mt-3 grid grid-cols-3 gap-2">
            <div
              v-for="it in localImages"
              :key="`local_prev_${it.previewUrl}`"
              class="aspect-square overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <img :src="it.previewUrl" alt="" class="h-full w-full object-cover" />
            </div>
            <div
              v-for="(url, idx) in existingImageUrls"
              :key="`prev_${idx}_${url}`"
              class="aspect-square overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <img :src="url" alt="" class="h-full w-full object-cover" />
            </div>
          </div>
        </div>

        <div class="rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
          <div v-if="original" class="font-semibold">현재 상품</div>
          <div v-if="original" class="mt-2 text-xs">ID: {{ original.id }}</div>
        </div>
      </aside>
    </form>
  </div>
</template>
