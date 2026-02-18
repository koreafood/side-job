<script setup lang="ts">
/**
 * 관리자 상품 목록 페이지
 * - 역할: 전시여부 필터로 관리자 상품을 조회하고, 수정/등록으로 이동
 * - 의존성: vue, vue-router, @/lib/api, @/lib/types
 */
import { onMounted, ref } from 'vue'
import { api } from '@/lib/api'
import type { Product } from '@/lib/types'
import { useRouter } from 'vue-router'

const router = useRouter() // 라우터 인스턴스
const items = ref<Product[]>([]) // 목록 데이터
const status = ref<'idle' | 'loading' | 'error' | 'ready'>('idle') // 화면 상태
const error = ref<string | null>(null) // 오류 메시지
const filter = ref<'all' | 'true' | 'false'>('all') // 전시여부 필터
const fallback = 'https://placehold.co/50x50?text=IMG' // 이미지 플레이스홀더
const nf = new Intl.NumberFormat('ko-KR') // 가격 포맷터

/** 목록 로드: 필터에 따라 관리자 상품 목록 조회 */
async function load() {
  status.value = 'loading'
  error.value = null
  try {
    items.value = await api.listAdminProducts({ published: filter.value })
    status.value = 'ready'
  } catch (e) {
    status.value = 'error'
    error.value = e instanceof Error ? e.message : '목록을 불러오지 못했어요.'
  }
}

/** 수정 페이지로 이동 */
function goEdit(id: string) {
  router.push({ path: `/admin/product/${id}/edit` })
}

/** 이미지 로딩 실패 시 플레이스홀더로 대체 */
function onImgError(e: Event) {
  const t = e.target as HTMLImageElement
  t.src = fallback
}

onMounted(() => {
  void load()
})
</script>

<template>
  <div class="space-y-6">
    <!-- 페이지 헤더 및 액션 -->
    <div class="flex items-end justify-between gap-4">
      <div>
        <h1 class="text-lg font-semibold">
          작품 목록
        </h1>
        <p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          전시여부 필터로 목록을 확인하세요.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <!-- 전시여부 필터 -->
        <select
          v-model="filter"
          class="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-500/30 transition focus:ring-4 dark:border-zinc-800 dark:bg-zinc-950"
          @change="load"
        >
          <option value="all">
            전체
          </option>
          <option value="true">
            전시중
          </option>
          <option value="false">
            전시중지
          </option>
        </select>
        <!-- 새로고침 -->
        <button
          type="button"
          class="rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
          @click="load"
        >
          새로고침
        </button>
        <!-- 상품 등록 이동 -->
        <button
          type="button"
          class="rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          @click="$router.push({ name: 'admin-product-new' })"
        >
          작품등록
        </button>
      </div>
    </div>

    <div
      v-if="status === 'error'"
      class="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700"
    >
      {{ error }}
    </div>

    <!-- 목록 테이블 -->
    <div
      v-else
      class="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-zinc-600 dark:text-zinc-300">
            <th class="p-2">
              사진
            </th>
            <th class="p-2">
              상품코드
            </th>
            <th class="p-2">
              상품명
            </th>
            <th class="p-2">
              가격
            </th>
            <th class="p-2">
              전시여부
            </th>
          </tr>
        </thead>
        <tbody>
          <!-- 상품 행 -->
          <tr
            v-for="p in items"
            :key="p.id"
            class="border-t border-zinc-100 dark:border-zinc-800"
          >
            <td class="p-2">
              <img
                :src="(p.images?.[0]?.url) || fallback"
                alt=""
                class="h-[50px] w-[50px] object-cover rounded-md border border-zinc-200 dark:border-zinc-800"
                @error="onImgError"
              >
            </td>
            <td class="p-2">
              <a
                href="#"
                class="text-blue-600 underline"
                @click.prevent="goEdit(p.id)"
              >
                {{ p.id }}
              </a>
            </td>
            <td class="p-2">
              {{ p.name }}
            </td>
            <td class="p-2">
              {{ nf.format(p.basePrice) }}
            </td>
            <td class="p-2">
              <span v-if="p.published">전시중</span>
              <span v-else>전시중지</span>
            </td>
          </tr>
          <!-- 빈 상태 -->
          <tr v-if="items.length === 0">
            <td
              colspan="5"
              class="p-4 text-center text-zinc-500 dark:text-zinc-400"
            >
              표시할 상품이 없어요.
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
