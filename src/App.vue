<script setup lang="ts">
/**
 * 최상위 앱 컴포넌트 (Root Component)
 * - 역할: 애플리케이션의 기본 레이아웃 구조 정의
 * - 주요 기능:
 *   - 헤더(AppHeader) 포함
 *   - 라우터 뷰(router-view)를 통한 페이지 렌더링
 *   - 다크 모드 배경색 및 기본 스타일 적용
 * - 의존성: vue, vue-router, AppHeader.vue
 */
import AppHeader from '@/components/AppHeader.vue'
</script>

<template>
  <div class="min-h-dvh bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-50">
    <!-- 상단 헤더 (네비게이션, 로고 등) -->
    <AppHeader />
    
    <!-- 메인 콘텐츠 영역 -->
    <main class="mx-auto w-full max-w-6xl px-4 pb-12 pt-6">
      <router-view />
    </main>
  </div>
</template>
