import { vi } from 'vitest'
import { defineComponent } from 'vue'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import MockAdapter from 'axios-mock-adapter'
import { ElMessageBox } from 'element-plus'
import { http } from '@/api/http'
import { useAuthStore } from '@/stores/auth'
import ContentItemFormPage from '@/pages/content/ContentItemFormPage.vue'

export const ElSelectStub = defineComponent({
  name: 'ElSelect',
  props: {
    modelValue: { type: [String, Number], default: '' },
    disabled: { type: Boolean, default: false },
  },
  emits: ['update:modelValue', 'change'],
  template: '<input class="el-select-stub" :value="modelValue" :disabled="disabled" @input="$emit(\'update:modelValue\', $event.target.value); $emit(\'change\', $event.target.value)" />',
})

export const ElInputNumberStub = defineComponent({
  name: 'ElInputNumber',
  props: { modelValue: { type: Number, default: 0 } },
  emits: ['update:modelValue'],
  template: '<input class="el-input-number-stub" :value="modelValue" @input="$emit(\'update:modelValue\', Number($event.target.value))" />',
})

export const ElSwitchStub = defineComponent({
  name: 'ElSwitch',
  props: { modelValue: { type: [Number, Boolean], default: 0 } },
  emits: ['update:modelValue'],
  template: '<input type="checkbox" class="el-switch-stub" :checked="!!modelValue" @change="$emit(\'update:modelValue\', $event.target.checked ? 1 : 0)" />',
})

const ListStub = defineComponent({ template: '<div class="content-list-stub">列表</div>' })

export function setupAuth(pinia: Pinia, permissions: string[]): void {
  setActivePinia(pinia)
  const auth = useAuthStore()
  auth.token = 'tok'
  auth.userInfo = { id: 'u1', username: 'editor', realName: null, status: 'active' }
  auth.permissions = permissions
  sessionStorage.setItem('admin_access_token', 'tok')
}

export function mockEditItemApis(mock: MockAdapter, itemId = 'i1'): void {
  mock.onGet('/content/categories').reply(200, {
    code: 0,
    message: '成功',
    data: { list: [], total: 0, page: 1, pageSize: 100 },
    timestamp: 1,
    requestId: 'c1',
  })
  mock.onGet(`/content/items/${itemId}`).reply(200, {
    code: 0,
    message: '成功',
    data: {
      id: itemId,
      contentType: 'notice',
      title: '原标题',
      subtitle: '原副标题',
      summary: '原摘要',
      categoryId: 'cat-1',
      currentVersionId: 'v1',
      status: 'draft',
      isTop: 0,
      isRecommend: 0,
      sortOrder: 3,
      createdAt: '2024-01-01',
      publishAt: null,
      sourceType: 'gov',
      sourceUrl: 'http://old',
      createdBy: 'u1',
      updatedBy: 'u1',
    },
    timestamp: 1,
    requestId: 'i1',
  })
  mock.onGet(`/content/items/${itemId}/versions`).reply(200, {
    code: 0,
    message: '成功',
    data: [{
      id: 'v1',
      contentId: itemId,
      versionNo: 1,
      title: '原标题',
      summary: '原摘要',
      status: 'draft',
      changeRemark: null,
      createdBy: null,
      createdAt: '',
    }],
    timestamp: 1,
    requestId: 'vers',
  })
  mock.onGet('/content/versions/v1').reply(200, {
    code: 0,
    message: '成功',
    data: {
      id: 'v1',
      contentId: itemId,
      versionNo: 1,
      title: '原标题',
      summary: '原摘要',
      status: 'draft',
      changeRemark: null,
      createdBy: null,
      createdAt: '',
      body: '原正文',
      extraJson: null,
    },
    timestamp: 1,
    requestId: 'vd',
  })
}

export async function mountContentFormApp(
  itemId = 'i1',
  permissions = ['content:item:update', 'content:version:read'],
): Promise<{ wrapper: VueWrapper; router: Router; pinia: Pinia }> {
  const pinia = createPinia()
  setupAuth(pinia, permissions)

  const router = createRouter({
    history: createMemoryHistory('/content/items'),
    routes: [
      { path: '/', redirect: { name: 'content-items' } },
      { path: '/content/items', name: 'content-items', component: ListStub },
      { path: '/content/items/:id/edit', name: 'content-item-edit', component: ContentItemFormPage },
    ],
  })

  const App = defineComponent({ template: '<router-view />' })

  const wrapper = mount(App, {
    global: {
      plugins: [pinia, router],
      stubs: {
        ElSelect: ElSelectStub,
        ElOption: true,
        ElInputNumber: ElInputNumberStub,
        ElSwitch: ElSwitchStub,
      },
    },
  })

  await router.push(`/content/items/${itemId}/edit`)
  await router.isReady()
  await flushPromises()

  return { wrapper, router, pinia }
}

export function findFormPage(wrapper: VueWrapper): VueWrapper {
  return wrapper.findComponent(ContentItemFormPage)
}

/** 卸载前导航到已注册列表路由，避免 router-view 销毁时出现空路径警告 */
export async function teardownContentFormApp(wrapper: VueWrapper, router: Router): Promise<void> {
  if (router.currentRoute.value.name !== 'content-items') {
    vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue(undefined as never)
    await router.replace({ name: 'content-items' })
    await flushPromises()
  }
  wrapper.unmount()
}
