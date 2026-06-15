import { defineComponent } from 'vue'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
import { createMemoryHistory, createRouter, type Router } from 'vue-router'
import ContentItemListPage from '@/pages/content/ContentItemListPage.vue'
import ContentItemVersionsPage from '@/pages/content/ContentItemVersionsPage.vue'
import { useAuthStore } from '@/stores/auth'

export const ElSelectStub = defineComponent({
  name: 'ElSelect',
  props: {
    modelValue: { type: [String, Number], default: '' },
    disabled: { type: Boolean, default: false },
  },
  emits: ['update:modelValue', 'change'],
  template: '<input class="el-select-stub" :value="modelValue" :disabled="disabled" @input="$emit(\'update:modelValue\', $event.target.value); $emit(\'change\', $event.target.value)" />',
})

export function setupAuth(permissions: string[]): Pinia {
  const pinia = createPinia()
  setActivePinia(pinia)
  const auth = useAuthStore()
  auth.token = 'tok'
  auth.userInfo = { id: 'u1', username: 'editor', realName: null, status: 'active' }
  auth.permissions = permissions
  sessionStorage.setItem('admin_access_token', 'tok')
  return pinia
}

const listStubs = {
  ElSelect: ElSelectStub,
  ElOption: true,
  teleport: true,
}

export async function mountItemListPage(permissions: string[]): Promise<VueWrapper> {
  const pinia = setupAuth(permissions)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/', component: { template: '<div />' } }],
  })
  const wrapper = mount(ContentItemListPage, {
    global: { plugins: [pinia, router], stubs: listStubs },
  })
  await flushPromises()
  return wrapper
}

export async function mountVersionsPage(
  itemId: string,
  permissions: string[],
): Promise<{ wrapper: VueWrapper; router: Router }> {
  const pinia = setupAuth(permissions)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/content/items', name: 'content-items', component: { template: '<div />' } },
      { path: '/content/items/:id/versions', name: 'content-item-versions', component: ContentItemVersionsPage },
    ],
  })
  await router.push(`/content/items/${itemId}/versions`)
  await router.isReady()
  const wrapper = mount(ContentItemVersionsPage, {
    global: { plugins: [pinia, router], stubs: { teleport: true } },
  })
  await flushPromises()
  return { wrapper, router }
}

export function findButtonByText(wrapper: VueWrapper, text: string) {
  return wrapper.findAll('button').find((b) => b.text().trim() === text)
}
