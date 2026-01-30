<script setup lang="ts">
import { Star } from 'lucide-vue-next'
import { computed } from 'vue'

const props = defineProps<{
  value: number
  count?: number
  size?: 'sm' | 'md'
}>()

const sizeClass = computed(() => (props.size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'))
const filled = computed(() => Math.max(0, Math.min(5, Math.round(props.value))))
</script>

<template>
  <div class="inline-flex items-center gap-1">
    <Star
      v-for="idx in 5"
      :key="idx"
      :class="[
        sizeClass,
        idx <= filled ? 'fill-amber-400 text-amber-400' : 'text-zinc-300 dark:text-zinc-700',
      ]"
    />
    <span v-if="typeof count === 'number'" class="ml-1 text-xs text-zinc-500 dark:text-zinc-400">
      ({{ count }})
    </span>
  </div>
</template>

