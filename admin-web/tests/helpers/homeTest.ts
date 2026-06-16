import { defineComponent } from 'vue'
import type { VueWrapper } from '@vue/test-utils'
import { createPinia, setActivePinia, type Pinia } from 'pinia'
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

export function findButtonByText(wrapper: VueWrapper, text: string) {
  return wrapper.findAll('button').find((b) => b.text().trim() === text)
}
