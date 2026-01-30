/**
 * 라우터 설정 모듈
 * - 역할: 애플리케이션의 라우팅 경로 정의 및 네비게이션 가드 설정
 * - 주요 기능: 페이지별 컴포넌트 매핑, 관리자 접근 제어(Navigation Guard)
 * - 의존성: vue-router, 각 페이지 컴포넌트
 */
import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '@/pages/HomePage.vue'
import SellerPage from '@/pages/SellerPage.vue'
import ProductPage from '@/pages/ProductPage.vue'
import CartPage from '@/pages/CartPage.vue'
import AdminProductNewPage from '@/pages/AdminProductNewPage.vue'
import AdminProductEditPage from '@/pages/AdminProductEditPage.vue'
import AdminProductsPage from '@/pages/AdminProductsPage.vue'
import AdminOrdersPage from '@/pages/AdminOrdersPage.vue'
import AdminOrderDetailPage from '@/pages/AdminOrderDetailPage.vue'
import OrdersPage from '@/pages/OrdersPage.vue'
import OrderDetailPage from '@/pages/OrderDetailPage.vue'
import AdminLoginPage from '@/pages/AdminLoginPage.vue'

/**
 * 라우트 정의 배열
 * 각 경로는 path, name, component, meta 정보를 포함합니다.
 */
const routes = [
  {
    path: '/',
    name: 'home',
    component: HomePage, // 메인 홈 페이지
  },
  {
    path: '/sellers/:sellerId',
    name: 'seller',
    component: SellerPage, // 판매자 상세 페이지
  },
  {
    path: '/products/:productId',
    name: 'product',
    component: ProductPage, // 상품 상세 페이지
  },
  {
    path: '/cart',
    name: 'cart',
    component: CartPage, // 장바구니 페이지
  },
  {
    path: '/orders',
    name: 'orders',
    component: OrdersPage, // 내 주문 목록 페이지
  },
  {
    path: '/orders/:orderId',
    name: 'order-detail',
    component: OrderDetailPage, // 주문 상세 페이지
  },
  {
    path: '/admin/login',
    name: 'admin-login',
    component: AdminLoginPage, // 관리자 로그인 페이지
  },
  {
    path: '/admin/products/new',
    name: 'admin-product-new',
    component: AdminProductNewPage, // 관리자 상품 등록 페이지
    meta: { requiresAdmin: true }, // 관리자 권한 필요
  },
  {
    path: '/admin/products',
    name: 'admin-products',
    component: AdminProductsPage,
    meta: { requiresAdmin: true },
  },
  {
    path: '/admin/products/:productId/edit',
    name: 'admin-product-edit',
    component: AdminProductEditPage, // 관리자 상품 수정 페이지
    meta: { requiresAdmin: true },
  },
  {
    path: '/admin/product/:productId/edit',
    name: 'admin-product-edit-alias',
    component: AdminProductEditPage,
    meta: { requiresAdmin: true },
  },
  {
    path: '/admin/orders',
    name: 'admin-orders',
    component: AdminOrdersPage, // 관리자 주문 관리 페이지
    meta: { requiresAdmin: true },
  },
  {
    path: '/admin/orders/:orderId',
    name: 'admin-order-detail',
    component: AdminOrderDetailPage, // 관리자 주문 상세 관리 페이지
    meta: { requiresAdmin: true },
  },
]

/**
 * 라우터 인스턴스 생성
 * - history: Web History 모드 사용 (clean URL)
 * - routes: 정의된 라우트 매핑 사용
 */
const router = createRouter({
  history: createWebHistory(),
  routes,
})

/**
 * 전역 네비게이션 가드 (Global Before Guard)
 * - 목적: 관리자 전용 페이지 접근 시 권한 확인
 * - 로직:
 *   1. 이동하려는 라우트의 meta.requiresAdmin 확인
 *   2. 로컬 스토리지의 'isAdmin' 플래그 확인
 *   3. 권한이 필요한데 관리자가 아니면 로그인 페이지로 리다이렉트
 */
router.beforeEach((to, _from, next) => {
  const needAdmin = to.matched.some((r) => (r.meta as any)?.requiresAdmin)
  const isAdmin = localStorage.getItem('isAdmin') === '1'
  if (needAdmin && !isAdmin) {
    next({ name: 'admin-login' })
  } else {
    next()
  }
})

export default router
