<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { api } from '@/lib/api'
import type { Product, ProductOrderSummary, Review, Seller } from '@/lib/types'
import ImageGallery from '@/components/ImageGallery.vue'
import SellerCard from '@/components/SellerCard.vue'
import ReviewList from '@/components/ReviewList.vue'
import ReviewForm from '@/components/ReviewForm.vue'
import { useCartStore } from '@/composables/useCartStore'
import { ShoppingCart } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const cart = useCartStore()
const productId = computed(() => String(route.params.productId))

const status = ref<'loading' | 'error' | 'ready'>('loading')
const error = ref<string | null>(null)
const product = ref<Product | null>(null)
const seller = ref<Seller | null>(null)
const reviews = ref<Review[]>([])
const productOrders = ref<ProductOrderSummary[]>([])

async function load() {
  status.value = 'loading'
  error.value = null
  try {
    const p = await api.getProduct(productId.value)
    product.value = p
    seller.value = await api.getSeller(p.sellerId)
    reviews.value = await api.listReviews(p.id)
    productOrders.value = await api.listProductOrders(p.id)
    status.value = 'ready'
  } catch (e) {
    status.value = 'error'
    error.value = e instanceof Error ? e.message : '상품을 불러오지 못했어요.'
  }
}

function formatDateYmd(s: string) {
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function label(v: string) {
  const map: Record<string, string> = {
    pending: '결제 대기',
    paid: '결제 완료',
    preparing: '상품 준비',
    shipped: '배송중',
    delivered: '배송 완료',
    cancelled: '취소',
    refunded: '환불',
  }
  return map[v] ?? v
}

function goOrder(orderId: string) {
  router.push({ name: 'order-detail', params: { orderId } })
}

async function addToCart() {
  if (!product.value) return
  await cart.add(product.value.id, 1)
}

function goEdit() {
  if (!product.value) return
  router.push({ name: 'admin-product-edit', params: { productId: product.value.id } })
}

async function removeProduct() {
  if (!product.value) return
  const ok = window.confirm('정말로 이 상품을 삭제할까요?')
  if (!ok) return
  try {
    await api.deleteAdminProduct(product.value.id)
    await router.push({ name: 'home' })
  } catch (e) {
    status.value = 'error'
    error.value = e instanceof Error ? e.message : '상품 삭제에 실패했어요.'
  }
}

function onReviewCreated(r: Review) {
  reviews.value = [r, ...reviews.value]
}

onMounted(() => {
  void load()
})
</script>

<template>
  <div class="space-y-6">
    <div v-if="status === 'error'" class="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
      {{ error }}
    </div>

    <div v-else-if="status === 'loading'" class="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div class="h-[520px] animate-pulse rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950" />
      <div class="h-[520px] animate-pulse rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950" />
    </div>

    <div v-else-if="product" class="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section class="space-y-4">
        <div class="text-sm font-semibold text-zinc-600 dark:text-zinc-300">최신 상품 페이지</div>
        <h1 class="text-xl font-semibold tracking-tight">{{ product.name }}</h1>
        <ImageGallery :images="product.images" :alt="product.name" />

        <div class="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <div class="text-sm font-semibold">구매자 리뷰</div>
          <div class="mt-4">
            <ReviewList :reviews="reviews" />
          </div>
          <div class="mt-5 border-t border-zinc-200 pt-5 dark:border-zinc-800">
            <ReviewForm
              :product-id="product.id"
              @created="onReviewCreated"
            />
          </div>
        </div>

        <div class="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <div class="text-sm font-semibold">이 상품과 연결된 주문</div>
          <p class="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            주문상세 번호를 클릭하면 제작 단계를 볼 수 있어요.
          </p>

          <div v-if="productOrders.length === 0" class="mt-4 text-sm text-zinc-600 dark:text-zinc-300">
            연결된 주문이 없어요.
          </div>

          <div v-else class="mt-4 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
            <div class="overflow-x-auto">
              <table class="w-full min-w-[640px] text-sm">
                <thead class="border-b border-zinc-200 bg-zinc-50 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300">
                  <tr>
                    <th class="px-4 py-3 text-left font-semibold">주문상세 번호</th>
                    <th class="px-4 py-3 text-left font-semibold">주문일시</th>
                    <th class="px-4 py-3 text-left font-semibold">상태</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-zinc-200 dark:divide-zinc-800">
                  <tr
                    v-for="o in productOrders"
                    :key="o.id"
                    class="transition hover:bg-zinc-50 dark:hover:bg-zinc-900/40"
                  >
                    <td class="px-4 py-3 font-semibold">
                      <button
                        type="button"
                        class="underline decoration-zinc-300 underline-offset-2"
                        @click="goOrder(o.id)"
                      >
                        {{ o.id }}
                      </button>
                    </td>
                    <td class="px-4 py-3 text-zinc-700 dark:text-zinc-200">
                      {{ formatDateYmd(o.orderedAt) }}
                    </td>
                    <td class="px-4 py-3">
                      {{ label(o.orderStatus) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <aside class="space-y-4">
        <div class="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <div class="text-2xl font-semibold">¥{{ product.priceJpy.toLocaleString() }}</div>
          <p class="mt-2 text-xs text-zinc-500 dark:text-zinc-400">데모: 배송/결제는 생략돼요.</p>

          <div class="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              class="inline-flex w-full items-center justify-center rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm font-semibold transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
              @click="goEdit"
            >
              수정
            </button>
            <button
              type="button"
              class="inline-flex w-full items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/40 dark:bg-rose-950/40 dark:text-rose-200 dark:hover:bg-rose-950/60"
              @click="removeProduct"
            >
              삭제
            </button>
          </div>

          <button
            type="button"
            class="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
            @click="addToCart"
          >
            <ShoppingCart class="h-4 w-4" />
            카트에 담기
          </button>
          <div v-if="cart.state.error" class="mt-3 text-xs font-semibold text-rose-600">
            {{ cart.state.error }}
          </div>
        </div>

        <button
          v-if="seller"
          type="button"
          class="w-full text-left"
          @click="$router.push({ name: 'seller', params: { sellerId: seller.id } })"
        >
          <SellerCard :seller="seller" compact />
        </button>

        <div class="rounded-2xl border border-zinc-200 bg-white p-5 text-sm text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
          <div class="text-sm font-semibold">설명</div>
          <p class="mt-2 whitespace-pre-wrap leading-6">{{ product.description }}</p>
        </div>
      </aside>
    </div>
  </div>
</template>
