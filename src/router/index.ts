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
    path: '/admin/products/new',
    name: 'admin-product-new',
    component: AdminProductNewPage,
  },
  {
    path: '/admin/products/:productId/edit',
    name: 'admin-product-edit',
    component: AdminProductEditPage,
  },
  {
    path: '/admin/orders',
    name: 'admin-orders',
    component: AdminOrdersPage,
  },
  {
    path: '/admin/orders/:orderId',
    name: 'admin-order-detail',
    component: AdminOrderDetailPage,
  },
]

// 创建路由实例
const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
