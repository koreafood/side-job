<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ClipboardList, Package, Plus, Search, ShoppingCart } from 'lucide-vue-next'
import { useCartStore } from '@/composables/useCartStore'

const route = useRoute()
const router = useRouter()
const cart = useCartStore()

const q = ref<string>(typeof route.query.q === 'string' ? route.query.q : '')

watch(
  () => route.query.q,
  (next) => {
    q.value = typeof next === 'string' ? next : ''
  },
)

const isHome = computed(() => route.name === 'home')

function submitSearch() {
  const query = q.value.trim()
  router.push({ name: 'home', query: query ? { q: query } : {} })
}

onMounted(() => {
  void cart.refresh()
})
</script>

<template>
  <header class="sticky top-0 z-20 border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/70">
    <div class="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3">
      <button
        type="button"
        class="text-lg font-semibold tracking-tight"
        @click="$router.push({ name: 'home' })"
      >
        LaLaLa
      </button>

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

      <button
        type="button"
        class="relative inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
        @click="$router.push({ name: 'cart' })"
      >
        <ShoppingCart class="h-4 w-4" />
        <span class="hidden sm:inline">장바구니</span>
        <span
          v-if="cart.itemCount.value > 0"
          class="absolute -right-2 -top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1 text-xs font-semibold text-white"
        >
          {{ cart.itemCount.value }}
        </span>
      </button>

      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
        @click="$router.push({ name: 'orders' })"
      >
        <Package class="h-4 w-4" />
        <span class="hidden sm:inline">내 주문</span>
      </button>

      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
        @click="$router.push({ name: 'admin-product-new' })"
      >
        <Plus class="h-4 w-4" />
        <span class="hidden sm:inline">상품 등록</span>
      </button>

      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
        @click="$router.push({ name: 'admin-orders' })"
      >
        <ClipboardList class="h-4 w-4" />
        <span class="hidden sm:inline">주문 관리</span>
      </button>
    </div>
  </header>
</template>
