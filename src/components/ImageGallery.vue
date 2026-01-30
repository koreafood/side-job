<script setup lang="ts">
import type { ProductImage } from '@/lib/types'
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  images: ProductImage[]
  alt: string
}>()

const sorted = computed(() => [...props.images].sort((a, b) => a.sort - b.sort))
const selectedId = ref<string | null>(sorted.value[0]?.id ?? null)

watch(
  () => sorted.value[0]?.id,
  (next) => {
    selectedId.value = next ?? null
  },
)

const selected = computed(() => sorted.value.find((it) => it.id === selectedId.value) ?? sorted.value[0])
</script>

<template>
  <div class="grid gap-3 md:grid-cols-[1fr_96px]">
    <div class="overflow-hidden rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <div class="aspect-square w-full bg-zinc-100 dark:bg-zinc-900">
        <img
          v-if="selected"
          :src="selected.url"
          :alt="alt"
          class="h-full w-full object-cover"
        />
      </div>
    </div>

    <div class="flex gap-2 overflow-x-auto md:flex-col md:overflow-y-auto">
      <button
        v-for="img in sorted"
        :key="img.id"
        type="button"
        class="shrink-0 overflow-hidden rounded-xl border transition"
        :class="
          img.id === selectedId
            ? 'border-emerald-500 ring-4 ring-emerald-500/20'
            : 'border-zinc-200 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700'
        "
        @click="selectedId = img.id"
      >
        <img :src="img.url" :alt="alt" class="h-20 w-20 object-cover md:h-24 md:w-24" loading="lazy" />
      </button>
    </div>
  </div>
</template>

