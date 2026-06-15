import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'

export function setupGuideAuth(pinia: ReturnType<typeof createPinia>, permissions: string[]): void {
  setActivePinia(pinia)
  const auth = useAuthStore()
  auth.token = 'tok'
  auth.userInfo = { id: 'u1', username: 'editor', realName: null, status: 'active' }
  auth.permissions = permissions
  sessionStorage.setItem('admin_access_token', 'tok')
}

export const SAMPLE_DEPT = {
  id: 'd1',
  deptName: '市场监管局',
  deptCode: 'SCJGJ',
  displayName: '市监局',
  icon: null,
  floorText: '1楼',
  areaText: 'A区',
  isVisible: 1,
  sortOrder: 0,
  status: 'active',
  createdAt: '2024-06-01T00:00:00.000Z',
}

export const SAMPLE_THEME = {
  id: 't1',
  themeName: '开办企业',
  themeCode: 'KBQY',
  platformParamJson: '{"type":"kbqy"}',
  icon: null,
  isVisible: 1,
  sortOrder: 0,
  createdAt: '2024-06-01T00:00:00.000Z',
}

export const POLICY_ID_A = '11111111-1111-4111-8111-111111111111'
export const FAQ_ID_A = '33333333-3333-4333-8333-333333333333'

export const SAMPLE_ITEM = {
  id: 'i1',
  platformItemId: 'PLAT-001',
  itemName: '营业执照',
  displayName: '办执照',
  deptCode: 'SCJGJ',
  themeCode: 'KBQY',
  isHot: 1,
  isRecommend: 0,
  isVisible: 1,
  sortOrder: 0,
  relatedPolicyIds: [POLICY_ID_A],
  relatedFaqIds: [FAQ_ID_A],
  createdAt: '2024-06-01T00:00:00.000Z',
}
