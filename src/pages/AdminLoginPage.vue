<script setup lang="ts">
// 관리자 로그인 페이지: 비밀번호 검증과 친화적인 오류 메시지 처리
// Vue의 반응형 상태를 만들기 위해 ref를 사용
import { ref } from 'vue'
// 페이지 이동을 위해 Vue Router 훅 사용
import { useRouter } from 'vue-router'
// 관리자 인증/상태 관리를 위한 커스텀 컴포저블
import { useAdminStore } from '@/composables/useAdminStore'
// API 호출 실패를 표현하는 커스텀 오류 타입
import { ApiError } from '@/lib/api'

// 라우터 인스턴스 획득
const router = useRouter()
// 관리자 스토어 인스턴스 획득
const admin = useAdminStore()
// 입력 비밀번호 상태
const password = ref('')
// 화면 상태: idle(대기), error(오류), submitting(전송 중)
const status = ref<'idle' | 'error' | 'submitting'>('idle')
// 오류 메시지 상태: 문자열 또는 null
const error = ref<string | null>(null)

// 로그인 제출 처리: 입력 검증, API 호출, 라우팅, 오류 처리
async function submit() {
  // 비밀번호 공백만 있는 경우 즉시 종료
  if (!password.value.trim()) return
  // 전송 중 상태로 전환
  status.value = 'submitting'
  // 이전 오류 메시지 초기화
  error.value = null
  try {
    // 관리자 로그인 시도
    await admin.login(password.value)
    // 로그인 후 관리자 권한 여부를 재확인
    if (!admin.isAdmin.value) {
      // 관리자 권한이 아니면 명시적 오류 발생
      throw new Error('비밀번호가 올바르지 않아요.')
    }
    // 성공 시 홈으로 이동
    await router.push({ name: 'home' })
  } catch (e) {
    // 오류 발생 시 상태를 error로 설정
    status.value = 'error'
    // APIError인 경우 응답 본문/상태에 따라 친화적인 메시지 선택
    if (e instanceof ApiError) {
      const b = e.body as any
      // 서버가 { detail: string } 형태로 설명을 제공하면 이를 사용
      const msg =
        b && typeof b === 'object' && typeof b.detail === 'string'
          ? b.detail
          // 401은 인증 실패로 간주하여 비밀번호 오류 메시지 노출
          : e.status === 401
            ? '비밀번호가 올바르지 않아요.'
            // 기타 상태는 일반적인 실패 메시지 제공
            : '로그인에 실패했어요.'
      // 최종 오류 메시지 반영
      error.value = msg
    } else {
      // 일반 Error 또는 알 수 없는 오류를 문자열로 변환하여 반영
      error.value = e instanceof Error ? e.message : '로그인에 실패했어요.'
    }
  }
}
</script>

<template>
  <!-- 페이지 컨테이너: 가운데 정렬, 최대 너비 및 수직 간격 지정 -->
  <div class="mx-auto max-w-md space-y-6">
    <!-- 헤더 블록: 제목과 안내 텍스트 -->
    <div>
      <!-- 페이지 제목 -->
      <h1 class="text-lg font-semibold">관리자 로그인</h1>
      <!-- 안내 문구: 관리자 기능 범위 설명 -->
      <p class="mt-1 text-sm text-zinc-500 dark:text-zinc-400">관리자만 상품 등록/수정/주문관리를 사용할 수 있어요.</p>
    </div>

    <!-- 오류 메시지 박스: 오류 상태일 때만 표시 -->
    <div v-if="status === 'error'" class="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
      <!-- 계산된 오류 메시지 출력 -->
      {{ error }}
    </div>

    <!-- 로그인 폼: submit 이벤트를 가로채고 JS 핸들러로 처리 -->
    <form class="space-y-4" @submit.prevent="submit">
      <!-- 비밀번호 입력 레이블과 필드 그룹 -->
      <label class="space-y-1">
        <!-- 입력 필드 레이블 텍스트 -->
        <div class="text-sm font-medium">비밀번호</div>
        <!-- 비밀번호 입력 필드: v-model로 password 상태와 양방향 바인딩 -->
        <!-- 시각 스타일(클래스)과 플레이스홀더는 아래 속성으로 지정 -->
        <input
          v-model="password"
          type="password"
          class="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none ring-emerald-500/30 transition focus:ring-4 dark:border-zinc-800 dark:bg-zinc-950"
          placeholder="비밀번호를 입력해 주세요"
        />
      </label>
      <!-- 제출 버튼 래퍼: 상단 패딩으로 간격 확보 -->
      <div class="pt-2">
        <!-- 제출 버튼: 전송 중에는 비활성화 -->
        <button
          type="submit"
          class="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
          :disabled="status === 'submitting'"
        >
          <!-- 버튼 라벨 -->
          로그인
        </button>
      </div>
    </form>
  </div>
</template>
