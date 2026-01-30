<script setup lang="ts">
/**
 * 헤더 컴포넌트
 * - 역할: 애플리케이션의 상단 네비게이션 바, 로고, 검색, 장바구니/내 주문 링크, 관리자 메뉴 버튼 제공
 * - 주요 기능:
 *   - 검색어 입력 및 검색 실행
 *   - 장바구니 아이템 개수 뱃지 표시
 *   - 관리자 로그인 상태에 따른 '상품 등록', '주문 관리' 버튼 노출
 * - 의존성: vue, vue-router, useCartStore, useAdminStore
 */
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ClipboardList, Package, Plus, Search, ShoppingCart } from 'lucide-vue-next'
import { useCartStore } from '@/composables/useCartStore'
import { useAdminStore } from '@/composables/useAdminStore'

const route = useRoute()
const router = useRouter()
const cart = useCartStore()
const admin = useAdminStore()

/** 현재 검색어 상태 */
const q = ref<string>(typeof route.query.q === 'string' ? route.query.q : '')

/**
 * URL 쿼리 파라미터 감지
 * - 목적: URL의 q 파라미터가 변경되면 검색 입력창의 값도 동기화합니다.
 */
watch(
  () => route.query.q,
  (next) => {
    q.value = typeof next === 'string' ? next : ''
  },
)

/** 홈 화면 여부 확인 (검색창 placeholder 변경용) */
const isHome = computed(() => route.name === 'home')

/**
 * 검색 제출 함수
 * - 목적: 사용자가 입력한 검색어로 홈 화면으로 이동하여 검색 결과를 보여줍니다.
 * - 입력: q.value (검색어)
 * - 출력: 없음 (라우팅 이동)
 * - 비즈니스 로직: 검색어가 있으면 query 파라미터에 포함, 없으면 파라미터 제거하여 홈으로 이동
 */
function submitSearch() {
  const query = q.value.trim()
  router.push({ name: 'home', query: query ? { q: query } : {} })
}

/**
 * 컴포넌트 마운트 시 초기화
 * - 장바구니 정보 최신화
 * - 관리자 세션 상태 확인
 */
onMounted(() => {
  void cart.refresh()
  // 관리자 로그인 상태를 초기 동기화
  void admin.refresh()
})
</script>

<template>
  <header class="sticky top-0 z-20 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/70">
    <div class="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3">
      <!-- 로고 -->
      <button
        type="button"
        class="text-lg font-semibold tracking-tight"
        @click="$router.push({ name: 'home' })"
      >
        라라원단
      </button>

      <!-- 검색창 -->
      <div class="flex flex-1 items-center gap-2">
        <div class="relative w-full">
          <Search class="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <input
            v-model="q"
            type="search"
            class="w-full rounded-xl border border-zinc-200 bg-white px-9 py-2 text-sm outline-none ring-emerald-500/30 transition focus:ring-4 dark:border-zinc-800 dark:bg-zinc-950"
            :placeholder="isHome ? '상품을 검색해 보세요' : '검색은 홈에서 할 수 있어요'"
            @keydown.enter.prevent="submitSearch"
          />
        </div>
      </div>

      <!-- 장바구니 버튼 -->
      <button
        type="button"
        class="relative inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
        @click="$router.push({ name: 'cart' })"
      >
        <ShoppingCart class="h-4 w-4" />
        <span class="hidden sm:inline">장바구니</span>
        <!-- 뱃지: 아이템 개수 -->
        <span
          v-if="cart.itemCount.value > 0"
          class="absolute -right-2 -top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1 text-xs font-semibold text-white"
        >
          {{ cart.itemCount.value }}
        </span>
      </button>

      <!-- 내 주문 버튼 -->
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
        @click="$router.push({ name: 'orders' })"
      >
        <Package class="h-4 w-4" />
        <span class="hidden sm:inline">내 주문</span>
      </button>

      <!-- 관리자용: 상품목록 버튼 (로그인 시만 노출) -->
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
        @click="$router.push({ name: 'admin-products' })"
        v-if="admin.isAdmin.value"
      >
        <Plus class="h-4 w-4" />
        <span class="hidden sm:inline">상품목록</span>
      </button>

      <!-- 관리자용: 주문 관리 버튼 (로그인 시만 노출) -->
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
        @click="$router.push({ name: 'admin-orders' })"
        v-if="admin.isAdmin.value"
      >
        <ClipboardList class="h-4 w-4" />
        <span class="hidden sm:inline">주문 관리</span>
      </button>
    </div>
  </header>
</template>
