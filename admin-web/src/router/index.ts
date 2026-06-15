import { createRouter, createWebHistory, type Router, type RouteRecordRaw } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { safeRedirectPath } from './redirect'

const AdminLayout = () => import('@/layouts/AdminLayout.vue')
const LoginView = () => import('@/pages/LoginView.vue')
const DashboardView = () => import('@/pages/DashboardView.vue')
const NotFoundView = () => import('@/pages/NotFoundView.vue')
const ForbiddenView = () => import('@/pages/ForbiddenView.vue')
const ContentCategoryPage = () => import('@/pages/content/ContentCategoryPage.vue')
const ContentItemListPage = () => import('@/pages/content/ContentItemListPage.vue')
const ContentItemFormPage = () => import('@/pages/content/ContentItemFormPage.vue')
const ContentItemVersionsPage = () => import('@/pages/content/ContentItemVersionsPage.vue')
const GuideDeptPage = () => import('@/pages/guide/GuideDeptPage.vue')
const GuideThemePage = () => import('@/pages/guide/GuideThemePage.vue')
const GuideItemConfigPage = () => import('@/pages/guide/GuideItemConfigPage.vue')

export const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { public: true, title: '登录' },
  },
  {
    path: '/',
    component: AdminLayout,
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/dashboard' },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: DashboardView,
        meta: { title: '工作台' },
      },
      {
        path: 'forbidden',
        name: 'forbidden',
        component: ForbiddenView,
        meta: { title: '无权限' },
      },
      {
        path: 'content/categories',
        name: 'content-categories',
        component: ContentCategoryPage,
        meta: { title: '内容分类', permission: 'content:category:read' },
      },
      {
        path: 'content/items',
        name: 'content-items',
        component: ContentItemListPage,
        meta: { title: '内容列表', permission: 'content:item:read' },
      },
      {
        path: 'content/items/create',
        name: 'content-item-create',
        component: ContentItemFormPage,
        meta: { title: '新建内容', permission: 'content:item:create' },
      },
      {
        path: 'content/items/:id/edit',
        name: 'content-item-edit',
        component: ContentItemFormPage,
        meta: { title: '编辑内容', permission: 'content:item:update' },
      },
      {
        path: 'content/items/:id/versions',
        name: 'content-item-versions',
        component: ContentItemVersionsPage,
        meta: { title: '版本记录', permission: 'content:version:read' },
      },
      {
        path: 'guide/depts',
        name: 'guide-depts',
        component: GuideDeptPage,
        meta: { title: '部门映射', permission: 'guide:dept:read' },
      },
      {
        path: 'guide/themes',
        name: 'guide-themes',
        component: GuideThemePage,
        meta: { title: '主题映射', permission: 'guide:theme:read' },
      },
      {
        path: 'guide/item-configs',
        name: 'guide-item-configs',
        component: GuideItemConfigPage,
        meta: { title: '事项展示配置', permission: 'guide:item:read' },
      },
      {
        path: ':pathMatch(.*)*',
        name: 'not-found',
        component: NotFoundView,
        meta: { title: '页面不存在' },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

const guardedRouters = new WeakSet<Router>()

function bindUnauthorizedForRouter(target: Router): void {
  const auth = useAuthStore()
  auth.bindUnauthorizedHandler(() => {
    const current = target.currentRoute.value
    if (current.path === '/login') return
    const redirect = safeRedirectPath(current.fullPath)
    const loginFull = `/login?redirect=${encodeURIComponent(redirect)}`
    if (current.fullPath === loginFull) return
    void target.replace({ path: '/login', query: { redirect } })
  })
}

function resolveRoutePermission(meta: RouteRecordRaw['meta']): string | null {
  if (!meta || typeof meta !== 'object') return null
  const perm = (meta as { permission?: string }).permission
  return typeof perm === 'string' ? perm : null
}

export function registerAuthGuard(target: Router): void {
  if (guardedRouters.has(target)) return
  guardedRouters.add(target)
  bindUnauthorizedForRouter(target)

  target.beforeEach(async (to, from, next) => {
    const auth = useAuthStore()
    const isPublic = Boolean(to.meta.public)

    if (isPublic) {
      if (to.path === '/login' && auth.token) {
        const ok = await auth.ensureSession()
        if (ok) {
          const redirect = safeRedirectPath(to.query.redirect)
          if (from.path === redirect) return next(false)
          return next(redirect)
        }
      }
      return next()
    }

    if (!auth.token) {
      if (to.path === '/login') return next()
      const redirect = safeRedirectPath(to.fullPath, '/dashboard')
      if (from.fullPath === `/login?redirect=${encodeURIComponent(redirect)}`) return next(false)
      return next({ path: '/login', query: { redirect } })
    }

    const sessionOk = await auth.ensureSession()
    if (!sessionOk) {
      if (to.path === '/login') return next()
      const redirect = safeRedirectPath(to.fullPath, '/dashboard')
      if (from.fullPath === `/login?redirect=${encodeURIComponent(redirect)}`) return next(false)
      return next({ path: '/login', query: { redirect } })
    }

    const requiredPerm = resolveRoutePermission(to.meta)
    if (requiredPerm && !auth.hasPermission(requiredPerm)) {
      if (to.name === 'forbidden') return next()
      return next({ name: 'forbidden' })
    }

    return next()
  })
}

export function setupRouterGuards(): void {
  registerAuthGuard(router)
}

export default router
