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

describe('表单 dirty 全字段', () => {
  let mock: MockAdapter

  beforeEach(() => {
    mock = new MockAdapter(http)
    mockEditItemApis(mock)
  })

  afterEach(() => {
    mock.restore()
    vi.restoreAllMocks()
  })

  async function expectLeaveGuardAfterEdit(edit: (formPage: ReturnType<typeof findFormPage>) => Promise<void>): Promise<void> {
    const confirmSpy = vi.spyOn(ElMessageBox, 'confirm').mockRejectedValue(new Error('cancel'))
    const { wrapper, router } = await mountContentFormApp()
    const formPage = findFormPage(wrapper)
    await edit(formPage)
    await flushPromises()
    await router.push({ name: 'content-items' })
    await flushPromises()
    expect(confirmSpy).toHaveBeenCalled()
    expect(router.currentRoute.value.name).toBe('content-item-edit')
    await teardownContentFormApp(wrapper, router)
    vi.restoreAllMocks()
  }

  it('修改 subtitle 触发守卫', async () => {
    await expectLeaveGuardAfterEdit(async (formPage) => {
      const inputs = formPage.findAll('input:not([type="checkbox"])')
      await inputs[2].setValue('新副标题')
    })
  })

  it('修改 categoryId 触发守卫', async () => {
    mock.restore()
    mock = new MockAdapter(http)
    mock.onGet('/content/categories').reply(200, {
      code: 0,
      message: '成功',
      data: {
        list: [{ id: 'cat-2', parentId: null, categoryName: '分类B', contentType: 'notice', sortOrder: 0, status: 'active', createdAt: '2024-01-01' }],
        total: 1,
        page: 1,
        pageSize: 100,
      },
      timestamp: 1,
      requestId: 'cats',
    })
    mock.onGet('/content/items/i1').reply(200, {
      code: 0,
      message: '成功',
      data: {
        id: 'i1',
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
    mock.onGet('/content/items/i1/versions').reply(200, {
      code: 0,
      message: '成功',
      data: [{ id: 'v1', contentId: 'i1', versionNo: 1, title: '原标题', summary: '原摘要', status: 'draft', changeRemark: null, createdBy: null, createdAt: '' }],
      timestamp: 1,
      requestId: 'vers',
    })
    mock.onGet('/content/versions/v1').reply(200, {
      code: 0,
      message: '成功',
      data: { id: 'v1', contentId: 'i1', versionNo: 1, title: '原标题', summary: '原摘要', status: 'draft', changeRemark: null, createdBy: null, createdAt: '', body: '原正文', extraJson: null },
      timestamp: 1,
      requestId: 'vd',
    })

    await expectLeaveGuardAfterEdit(async (formPage) => {
      const selects = formPage.findAll('.el-select-stub')
      await selects[1].setValue('cat-2')
    })
  })

  it('修改 sortOrder 触发守卫', async () => {
    await expectLeaveGuardAfterEdit(async (formPage) => {
      await formPage.find('.el-input-number-stub').setValue('99')
    })
  })

  it('修改 changeRemark 触发守卫', async () => {
    await expectLeaveGuardAfterEdit(async (formPage) => {
      const changeInput = formPage.findAll('input').find((i) => {
        const el = i.element as HTMLInputElement
        return el.maxLength === 255 && el.value === ''
      })
      await changeInput!.setValue('备注')
    })
  })

  it('修改 isTop 触发守卫', async () => {
    await expectLeaveGuardAfterEdit(async (formPage) => {
      await formPage.findAll('.el-switch-stub')[0].setValue(true)
    })
  })

  it('修改 sourceUrl 触发守卫', async () => {
    await expectLeaveGuardAfterEdit(async (formPage) => {
      const urlInput = formPage.findAll('input').find((i) => (i.element as HTMLInputElement).value === 'http://old')!
      await urlInput.setValue('http://new')
    })
  })

  it('修改 title 触发守卫', async () => {
    await expectLeaveGuardAfterEdit(async (formPage) => {
      const titleInput = formPage.findAll('input').find((i) => (i.element as HTMLInputElement).value === '原标题')!
      await titleInput.setValue('新标题')
    })
  })

  it('修改 summary 触发守卫', async () => {
    await expectLeaveGuardAfterEdit(async (formPage) => {
      await formPage.find('textarea[rows="2"]').setValue('新摘要')
    })
  })

  it('修改 body 触发守卫', async () => {
    await expectLeaveGuardAfterEdit(async (formPage) => {
      await formPage.find('textarea[rows="10"]').setValue('新正文')
    })
  })

  it('修改 isRecommend 触发守卫', async () => {
    await expectLeaveGuardAfterEdit(async (formPage) => {
      await formPage.findAll('.el-switch-stub')[1].setValue(true)
    })
  })

  it('修改 sourceType 触发守卫', async () => {
    await expectLeaveGuardAfterEdit(async (formPage) => {
      const sourceTypeInput = formPage.findAll('input').find((i) => (i.element as HTMLInputElement).value === 'gov')!
      await sourceTypeInput.setValue('manual')
    })
  })
})
