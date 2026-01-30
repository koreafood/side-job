/**
 * 테마 관리 모듈 (다크 모드)
 * - 역할: 애플리케이션의 라이트/다크 테마 상태를 관리하고 DOM에 적용
 * - 주요 기능:
 *   - 시스템 설정 감지 (prefers-color-scheme)
 *   - 로컬 스토리지에 사용자 선호 테마 저장
 *   - 테마 토글 및 적용
 * - 의존성: vue
 */
import { ref, watchEffect, onMounted, computed } from 'vue'

type Theme = 'light' | 'dark'

export function useTheme() {
  const theme = ref<Theme>('light')

  /**
   * 초기 테마 결정 함수
   * - 로컬 스토리지 설정을 우선 확인하고, 없으면 시스템 설정을 따름
   */
  const getPreferredTheme = (): Theme => {
    const saved = localStorage.getItem('theme') as Theme | null
    if (saved === 'light' || saved === 'dark') return saved
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  }

  /**
   * 테마 적용 함수
   * - HTML root 요소에 class 추가/제거
   * - 로컬 스토리지에 저장
   */
  const applyTheme = (t: Theme) => {
    document.documentElement.classList.remove('light', 'dark')
    document.documentElement.classList.add(t)
    localStorage.setItem('theme', t)
  }

  /** 테마 전환 함수 */
  const toggleTheme = () => {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }

  onMounted(() => {
    theme.value = getPreferredTheme()
    applyTheme(theme.value)
  })

  watchEffect(() => {
    applyTheme(theme.value)
  })

  return {
    theme,
    toggleTheme,
    isDark: computed(() => theme.value === 'dark'),
  }
}
