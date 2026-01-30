<script setup lang="ts">
import AppHeader from '@/components/AppHeader.vue'
</script>

<template>
  <div class="min-h-dvh bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
    <AppHeader />
    <main class="mx-auto w-full max-w-6xl px-4 pb-12 pt-6">
      <router-view />
    </main>
  </div>
</template>
