import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { createPinia } from 'pinia'
import MockAdapter from 'axios-mock-adapter'
import { ElMessage, ElMessageBox } from 'element-plus'
import { http } from '@/api/http'
import GuideDeptPage from '@/pages/guide/GuideDeptPage.vue'
import GuideThemePage from '@/pages/guide/GuideThemePage.vue'
import GuideItemConfigPage from '@/pages/guide/GuideItemConfigPage.vue'
import RelatedIdEditor from '@/components/guide/RelatedIdEditor.vue'
import {
  POLICY_ID_A,
  SAMPLE_DEPT,
  SAMPLE_ITEM,
  SAMPLE_THEME,
  setupGuideAuth,
} from './helpers/guideTest'
import { ElInputNumberStub, ElSelectStub } from './helpers/contentFormTest'

async function stubDialogFormValid(wrapper: VueWrapper): Promise<void> {
  await flushPromises()
  const forms = wrapper.findAllComponents({ name: 'ElForm' })
  const form = forms[forms.length - 1]
  if (form?.exists()) {
    form.vm.validate = vi.fn().mockResolvedValue(true)
  }
}

describe('办事指南管理组件', () => {
  let mock: MockAdapter

  beforeEach(() => {
    mock = new MockAdapter(http)
    vi.spyOn(ElMessage, 'success').mockImplementation(() => undefined as never)
    vi.spyOn(ElMessage, 'error').mockImplementation(() => undefined as never)
  })

  afterEach(() => {
    mock.restore()
    vi.restoreAllMocks()
  })

  const mountOpts = (pinia: ReturnType<typeof createPinia>) => ({
    global: {
      plugins: [pinia],
      stubs: {
        ElInputNumber: ElInputNumberStub,
        ElSelect: ElSelectStub,
        ElOption: true,
      },
    },
  })

  it('编辑部门时 deptCode 只读', async () => {
    const pinia = createPinia()
    setupGuideAuth(pinia, ['guide:dept:read', 'guide:dept:update'])

    mock.onGet('/guide/depts').reply(200, {
      code: 0,
      message: '成功',
      data: { list: [SAMPLE_DEPT], total: 1, page: 1, pageSize: 20 },
      timestamp: 1,
      requestId: 'list',
    })

    const wrapper = mount(GuideDeptPage, mountOpts(pinia))
    await flushPromises()

    const vm = wrapper.vm as unknown as {
      openEdit: (row: typeof SAMPLE_DEPT) => void
      dialogMode: string
      form: { deptCode: string }
    }
    vm.openEdit(SAMPLE_DEPT)
    await flushPromises()

    expect(vm.dialogMode).toBe('edit')
    expect(vm.form.deptCode).toBe('SCJGJ')
    const disabledInputs = wrapper.findAll('input[disabled]')
    expect(disabledInputs.some((el) => (el.element as HTMLInputElement).value === 'SCJGJ')).toBe(true)
    wrapper.unmount()
  })

  it('部门删除需二次确认且 409 显示后端文案', async () => {
    const pinia = createPinia()
    setupGuideAuth(pinia, ['guide:dept:read', 'guide:dept:delete'])

    mock.onGet('/guide/depts').reply(200, {
      code: 0,
      message: '成功',
      data: { list: [SAMPLE_DEPT], total: 1, page: 1, pageSize: 20 },
      timestamp: 1,
      requestId: 'list',
    })
    mock.onDelete('/guide/depts/d1').reply(409, {
      code: 409,
      message: '部门编码 "SCJGJ" 已存在',
      data: null,
      timestamp: 1,
      requestId: 'del',
    })

    vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue(undefined as never)

    const wrapper = mount(GuideDeptPage, mountOpts(pinia))
    await flushPromises()

    const vm = wrapper.vm as unknown as {
      onDelete: (row: typeof SAMPLE_DEPT) => Promise<void>
    }
    await vm.onDelete(SAMPLE_DEPT)
    await flushPromises()

    expect(ElMessageBox.confirm).toHaveBeenCalled()
    expect(ElMessage.error).toHaveBeenCalledWith('部门编码 "SCJGJ" 已存在')
    wrapper.unmount()
  })

  it('主题 platformParamJson 非法 JSON 阻止提交', async () => {
    const pinia = createPinia()
    setupGuideAuth(pinia, ['guide:theme:read', 'guide:theme:create'])

    mock.onGet('/guide/themes').reply(200, {
      code: 0,
      message: '成功',
      data: { list: [], total: 0, page: 1, pageSize: 20 },
      timestamp: 1,
      requestId: 'list',
    })

    const wrapper = mount(GuideThemePage, mountOpts(pinia))
    await flushPromises()

    const vm = wrapper.vm as unknown as {
      openCreate: () => void
      onSubmit: () => Promise<void>
      form: { themeCode: string; themeName: string; platformParamJson: string }
      submitting: boolean
    }
    vm.openCreate()
    vm.form.themeCode = 'KBQY'
    vm.form.themeName = '开办企业'
    vm.form.platformParamJson = '{invalid'
    await vm.onSubmit()
    await flushPromises()

    expect(mock.history.post.length).toBe(0)
    wrapper.unmount()
  })

  it('事项编辑未修改关联 ID 时 PUT 不含 relatedPolicyIds', async () => {
    const pinia = createPinia()
    setupGuideAuth(pinia, ['guide:item:read', 'guide:item:update'])

    mock.onGet('/guide/item-configs').reply(200, {
      code: 0,
      message: '成功',
      data: { list: [SAMPLE_ITEM], total: 1, page: 1, pageSize: 20 },
      timestamp: 1,
      requestId: 'list',
    })

    let putBody: Record<string, unknown> = {}
    mock.onPut('/guide/item-configs/i1').reply((config) => {
      putBody = JSON.parse(config.data as string)
      return [200, {
        code: 0,
        message: '成功',
        data: SAMPLE_ITEM,
        timestamp: 1,
        requestId: 'put',
      }]
    })

    const wrapper = mount(GuideItemConfigPage, mountOpts(pinia))
    await flushPromises()

    const vm = wrapper.vm as unknown as {
      openEdit: (row: typeof SAMPLE_ITEM) => void
      onSubmit: () => Promise<void>
      form: { displayName: string; relatedPolicyIds: string[] }
      relatedPolicyIdsTouched: boolean
    }
    vm.openEdit(SAMPLE_ITEM)
    expect(vm.relatedPolicyIdsTouched).toBe(false)
    vm.form.displayName = '新展示名'
    await stubDialogFormValid(wrapper)
    await vm.onSubmit()
    await flushPromises()

    expect(putBody.displayName).toBe('新展示名')
    expect(putBody).not.toHaveProperty('relatedPolicyIds')
    expect(putBody).not.toHaveProperty('relatedFaqIds')
    wrapper.unmount()
  })

  it('事项创建以 string[] 提交关联 ID', async () => {
    const pinia = createPinia()
    setupGuideAuth(pinia, ['guide:item:read', 'guide:item:create'])

    mock.onGet('/guide/item-configs').reply(200, {
      code: 0,
      message: '成功',
      data: { list: [], total: 0, page: 1, pageSize: 20 },
      timestamp: 1,
      requestId: 'list',
    })

    let postBody: Record<string, unknown> = {}
    mock.onPost('/guide/item-configs').reply((config) => {
      postBody = JSON.parse(config.data as string)
      return [200, {
        code: 0,
        message: '成功',
        data: { ...SAMPLE_ITEM, id: 'i-new' },
        timestamp: 1,
        requestId: 'post',
      }]
    })

    const wrapper = mount(GuideItemConfigPage, mountOpts(pinia))
    await flushPromises()

    const vm = wrapper.vm as unknown as {
      openCreate: () => void
      onSubmit: () => Promise<void>
      form: {
        platformItemId: string
        itemName: string
        displayName: string
        relatedPolicyIds: string[]
        relatedFaqIds: string[]
      }
    }
    vm.openCreate()
    vm.form.platformItemId = 'PLAT-NEW'
    vm.form.itemName = '事项'
    vm.form.displayName = '展示'
    vm.form.relatedPolicyIds = [POLICY_ID_A]
    vm.form.relatedFaqIds = []
    await stubDialogFormValid(wrapper)
    await vm.onSubmit()
    await flushPromises()

    expect(postBody.relatedPolicyIds).toEqual([POLICY_ID_A])
    expect(postBody.relatedFaqIds).toEqual([])
    expect(Array.isArray(postBody.relatedPolicyIds)).toBe(true)
    wrapper.unmount()
  })

  it('事项编辑 platformItemId 只读', async () => {
    const pinia = createPinia()
    setupGuideAuth(pinia, ['guide:item:read', 'guide:item:update'])

    mock.onGet('/guide/item-configs').reply(200, {
      code: 0,
      message: '成功',
      data: { list: [SAMPLE_ITEM], total: 1, page: 1, pageSize: 20 },
      timestamp: 1,
      requestId: 'list',
    })

    const wrapper = mount(GuideItemConfigPage, mountOpts(pinia))
    await flushPromises()

    const vm = wrapper.vm as unknown as {
      openEdit: (row: typeof SAMPLE_ITEM) => void
      dialogMode: string
      form: { platformItemId: string }
    }
    vm.openEdit(SAMPLE_ITEM)
    await flushPromises()

    expect(vm.dialogMode).toBe('edit')
    expect(vm.form.platformItemId).toBe('PLAT-001')
    const disabledInputs = wrapper.findAll('input[disabled]')
    expect(disabledInputs.some((el) => (el.element as HTMLInputElement).value === 'PLAT-001')).toBe(true)
    wrapper.unmount()
  })

  it('连续点击保存只发起一次 PUT', async () => {
    const pinia = createPinia()
    setupGuideAuth(pinia, ['guide:item:read', 'guide:item:update'])

    mock.onGet('/guide/item-configs').reply(200, {
      code: 0,
      message: '成功',
      data: { list: [SAMPLE_ITEM], total: 1, page: 1, pageSize: 20 },
      timestamp: 1,
      requestId: 'list',
    })

    let putCount = 0
    mock.onPut('/guide/item-configs/i1').reply(() => {
      putCount += 1
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve([200, {
            code: 0,
            message: '成功',
            data: SAMPLE_ITEM,
            timestamp: 1,
            requestId: 'put',
          }])
        }, 80)
      })
    })

    const wrapper = mount(GuideItemConfigPage, mountOpts(pinia))
    await flushPromises()

    const vm = wrapper.vm as unknown as {
      openEdit: (row: typeof SAMPLE_ITEM) => void
      onSubmit: () => Promise<void>
      form: { displayName: string }
    }
    vm.openEdit(SAMPLE_ITEM)
    vm.form.displayName = '更新名'
    await stubDialogFormValid(wrapper)
    const first = vm.onSubmit()
    void vm.onSubmit()
    await first
    await flushPromises()
    await new Promise((r) => setTimeout(r, 120))

    expect(putCount).toBe(1)
    wrapper.unmount()
  })

  it('弹窗重新打开不残留上次数据', async () => {
    const pinia = createPinia()
    setupGuideAuth(pinia, ['guide:item:read', 'guide:item:create', 'guide:item:update'])

    mock.onGet('/guide/item-configs').reply(200, {
      code: 0,
      message: '成功',
      data: { list: [SAMPLE_ITEM], total: 1, page: 1, pageSize: 20 },
      timestamp: 1,
      requestId: 'list',
    })

    const wrapper = mount(GuideItemConfigPage, mountOpts(pinia))
    await flushPromises()

    const vm = wrapper.vm as unknown as {
      openEdit: (row: typeof SAMPLE_ITEM) => void
      openCreate: () => void
      dialogVisible: boolean
      form: { platformItemId: string; relatedPolicyIds: string[] }
    }
    vm.openEdit(SAMPLE_ITEM)
    expect(vm.form.platformItemId).toBe('PLAT-001')
    vm.dialogVisible = false
    await flushPromises()
    vm.openCreate()
    expect(vm.form.platformItemId).toBe('')
    expect(vm.form.relatedPolicyIds).toEqual([])
    wrapper.unmount()
  })

  it('RelatedIdEditor 以标签列表管理 ID', async () => {
    const wrapper = mount(RelatedIdEditor, {
      props: { modelValue: [] },
    })

    const vm = wrapper.vm as unknown as {
      draftId: string
      addDraft: () => void
    }
    vm.draftId = POLICY_ID_A
    vm.addDraft()
    await flushPromises()

    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual([POLICY_ID_A])
    wrapper.unmount()
  })
})
