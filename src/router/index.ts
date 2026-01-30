import { createRouter, createWebHistory } from 'vue-router'
import HomePage from '@/pages/HomePage.vue'
import SellerPage from '@/pages/SellerPage.vue'
import ProductPage from '@/pages/ProductPage.vue'
import CartPage from '@/pages/CartPage.vue'
import AdminProductNewPage from '@/pages/AdminProductNewPage.vue'
import AdminProductEditPage from '@/pages/AdminProductEditPage.vue'
import AdminOrdersPage from '@/pages/AdminOrdersPage.vue'
import AdminOrderDetailPage from '@/pages/AdminOrderDetailPage.vue'
import OrdersPage from '@/pages/OrdersPage.vue'
import OrderDetailPage from '@/pages/OrderDetailPage.vue'
import AdminLoginPage from '@/pages/AdminLoginPage.vue'

const routes = [
  {
    path: '/',
    name: 'home',
    component: HomePage,
  },
  {
    path: '/sellers/:sellerId',
    name: 'seller',
    component: SellerPage,
  },
  {
    path: '/products/:productId',
    name: 'product',
    component: ProductPage,
  },
  {
    path: '/cart',
    name: 'cart',
    component: CartPage,
  },
  {
    path: '/orders',
    name: 'orders',
    component: OrdersPage,
  },
  {
    path: '/orders/:orderId',
    name: 'order-detail',
    component: OrderDetailPage,
  },
  {
    path: '/admin/login',
    name: 'admin-login',
    component: AdminLoginPage,
  },
  {
    path: '/admin/products/new',
    name: 'admin-product-new',
    component: AdminProductNewPage,
    meta: { requiresAdmin: true },
  },
  {
    path: '/admin/products/:productId/edit',
    name: 'admin-product-edit',
    component: AdminProductEditPage,
    meta: { requiresAdmin: true },
  },
  {
    path: '/admin/orders',
    name: 'admin-orders',
    component: AdminOrdersPage,
    meta: { requiresAdmin: true },
  },
  {
    path: '/admin/orders/:orderId',
    name: 'admin-order-detail',
    component: AdminOrderDetailPage,
    meta: { requiresAdmin: true },
  },
]

// 创建路由实例
const router = createRouter({
  history: createWebHistory(),
  routes,
})

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
