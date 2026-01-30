/**
 * 애플리케이션 진입점 (Entry Point)
 * - 역할: Vue 애플리케이션 인스턴스 생성 및 전역 설정
 * - 주요 기능:
 *   - Vue 앱 생성 (createApp)
 *   - 라우터 플러그인 등록 (use router)
 *   - DOM 마운트 (#app)
 *   - 전역 스타일 로드
 * - 의존성: vue, vue-router, App.vue
 */
import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'

// Vue 애플리케이션 인스턴스 생성
const app = createApp(App)

// 라우터 플러그인 사용
app.use(router)

// 애플리케이션을 #app 요소에 마운트
app.mount('#app')
