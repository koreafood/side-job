/**
 * 관리자 인증 상태 관리 모듈
 * - 역할: 관리자 로그인 상태 확인, 로그인/로그아웃 처리, 상태 전역 관리
 * - 주요 함수: refresh(), login()
 * - 의존성: vue, @/lib/api.ts
 */
import { ref } from 'vue'
import { api } from '@/lib/api'

/**
 * 관리자 로그인 상태 (Reactive)
 * true: 관리자 로그인 상태
 * false: 비로그인 상태
 */
const isAdmin = ref<boolean>(false)

/**
 * 관리자 세션 상태 갱신 함수
 * - 목적: 서버에 현재 관리자 세션이 유효한지 확인하고, 로컬 상태를 동기화합니다.
 * - 입력: 없음
 * - 출력: 없음 (비동기적으로 isAdmin 상태 업데이트)
 * - 예외 처리:
 *   - API 호출 실패 시 (네트워크 오류 등): 로컬 스토리지('isAdmin') 값을 확인하여 임시로 상태를 복구합니다.
 *   - 로컬 스토리지 값이 '1'이면 관리자로 간주합니다.
 * - 비즈니스 로직:
 *   1. API `getAdminSession()` 호출
 *   2. 성공 시 `isAdmin` 상태 업데이트 및 로컬 스토리지 동기화
 *   3. 실패 시 로컬 스토리지 값으로 폴백 처리
 */
async function refresh() {
  try {
    const s = await api.getAdminSession()
    isAdmin.value = !!s.isAdmin
    if (isAdmin.value) localStorage.setItem('isAdmin', '1')
    else localStorage.removeItem('isAdmin')
  } catch {
    const ls = localStorage.getItem('isAdmin')
    isAdmin.value = ls === '1'
  }
}

/**
 * 관리자 로그인 함수
 * - 목적: 비밀번호를 제출하여 관리자 로그인을 수행하고 세션을 생성합니다.
 * - 입력: password (string) - 사용자가 입력한 관리자 비밀번호
 * - 출력: 없음 (비동기적으로 isAdmin 상태 업데이트)
 * - 예외 처리:
 *   - API 호출 실패 시 (비밀번호 불일치 등): 에러가 그대로 전파되어 호출부에서 처리해야 합니다.
 * - 비즈니스 로직:
 *   1. API `loginAdmin(password)` 호출
 *   2. 성공 시 `isAdmin` 상태를 true로 설정
 *   3. 로컬 스토리지에 'isAdmin' 플래그 저장
 */
async function login(password: string) {
  const s = await api.loginAdmin(password)
  isAdmin.value = !!s.isAdmin
  if (isAdmin.value) localStorage.setItem('isAdmin', '1')
}

/**
 * useAdminStore
 * - 목적: 컴포넌트에서 관리자 상태를 쉽게 사용하기 위한 Composable 함수
 * - 반환값:
 *   - isAdmin: 관리자 여부 (Ref<boolean>)
 *   - refresh: 세션 갱신 함수
 *   - login: 로그인 함수
 */
export function useAdminStore() {
  return {
    isAdmin,
    refresh,
    login,
  }
}
