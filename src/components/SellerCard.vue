<script setup lang="ts">
import type { Seller } from '@/lib/types'
import RatingStars from '@/components/RatingStars.vue'

defineProps<{
  seller: Seller
  compact?: boolean
}>()
</script>

<template>
  <div
    class="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
  >
    <div class="flex items-start gap-3">
      <img
        :src="seller.avatarUrl"
        :alt="seller.name"
        class="h-14 w-14 rounded-xl object-cover"
        loading="lazy"
      />
      <div class="min-w-0 flex-1">
        <div class="flex items-center justify-between gap-2">
          <div class="truncate text-sm font-semibold">{{ seller.name }}</div>
          <button
            type="button"
            class="shrink-0 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-zinc-900"
          >
            팔로우
          </button>
        </div>
        <div class="mt-1">
          <RatingStars :value="seller.ratingAvg" :count="seller.ratingCount" size="sm" />
        </div>
        <p v-if="!compact" class="mt-2 line-clamp-3 text-xs leading-5 text-zinc-600 dark:text-zinc-300">
          {{ seller.bio }}
        </p>
      </div>
    </div>
  </div>
</template>

