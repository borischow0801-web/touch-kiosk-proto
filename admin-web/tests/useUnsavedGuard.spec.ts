import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import MockAdapter from 'axios-mock-adapter'
import { ElMessageBox } from 'element-plus'
import { http } from '@/api/http'
import {
  findFormPage,
  mockEditItemApis,
  mountContentFormApp,
  teardownContentFormApp,
} from './helpers/contentFormTest'

describe('useUnsavedGuard 路由集成', () => {
  let mock: MockAdapter

  beforeEach(() => {
    mock = new MockAdapter(http)
    mockEditItemApis(mock)
    vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue(undefined as never)
  })

  afterEach(() => {
    mock.restore()
    vi.restoreAllMocks()
  })

  it('未修改时允许离开', async () => {
    const confirmSpy = vi.mocked(ElMessageBox.confirm)
    confirmSpy.mockClear()

    const { wrapper, router } = await mountContentFormApp()
    expect(router.currentRoute.value.name).toBe('content-item-edit')

    await router.push({ name: 'content-items' })
    await flushPromises()

    expect(confirmSpy).not.toHaveBeenCalled()
    expect(router.currentRoute.value.path).toBe('/content/items')
    await teardownContentFormApp(wrapper, router)
  })

  it('修改版本字段与非版本字段后取消确认，停留在编辑页', async () => {
    const confirmSpy = vi
      .spyOn(ElMessageBox, 'confirm')
      .mockRejectedValue(new Error('cancel'))

    const { wrapper, router } = await mountContentFormApp()
    const formPage = findFormPage(wrapper)

    await formPage.find('textarea[rows="10"]').setValue('改动正文')
    await formPage.findAll('input').find((i) => !(i.element as HTMLInputElement).disabled)!.setValue('改动副标题')
    await formPage.find('.el-input-number-stub').setValue('9')
    await flushPromises()

    await router.push({ name: 'content-items' })
    await flushPromises()

    expect(confirmSpy).toHaveBeenCalledWith(
      '有未保存的更改，确定离开？',
      '提示',
      expect.objectContaining({ type: 'warning' }),
    )
    expect(router.currentRoute.value.name).toBe('content-item-edit')
    await teardownContentFormApp(wrapper, router)
  })

  it('修改字段后确认离开，跳转列表页', async () => {
    vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue(undefined as never)

    const { wrapper, router } = await mountContentFormApp()
    const formPage = findFormPage(wrapper)

    await formPage.find('textarea[rows="2"]').setValue('新摘要')
    await formPage.find('.el-switch-stub').setValue(true)
    await flushPromises()

    await router.push({ name: 'content-items' })
    await flushPromises()

    expect(router.currentRoute.value.path).toBe('/content/items')
    await teardownContentFormApp(wrapper, router)
  })

  it('subtitle、sourceType、changeRemark 修改也会触发守卫', async () => {
    const confirmSpy = vi
      .spyOn(ElMessageBox, 'confirm')
      .mockRejectedValue(new Error('cancel'))

    const { wrapper, router } = await mountContentFormApp()
    const formPage = findFormPage(wrapper)

    const inputs = formPage.findAll('input:not([type="checkbox"])')
    await inputs[2].setValue('新副标题')
    await inputs.find((i) => (i.element as HTMLInputElement).value === 'gov')!.setValue('new-src')
    await formPage.find('textarea[rows="2"]').setValue('新摘要')
    await flushPromises()

    await router.push({ name: 'content-items' })
    await flushPromises()

    expect(confirmSpy).toHaveBeenCalled()
    expect(router.currentRoute.value.name).toBe('content-item-edit')
    await teardownContentFormApp(wrapper, router)
  })
})
