import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia } from 'pinia'
import MockAdapter from 'axios-mock-adapter'
import { ElMessage, ElMessageBox } from 'element-plus'
import { http } from '@/api/http'
import ContentCategoryPage from '@/pages/content/ContentCategoryPage.vue'
import {
  ElSelectStub,
  findFormPage,
  mockEditItemApis,
  mountContentFormApp,
  setupAuth,
  teardownContentFormApp,
} from './helpers/contentFormTest'

describe('内容管理组件', () => {
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

  const categoryMountOpts = (pinia: ReturnType<typeof createPinia>) => ({
    global: {
      plugins: [pinia],
      stubs: { ElSelect: ElSelectStub, ElOption: true },
    },
  })

  it('编辑时加载最新版本并回显正文', async () => {
    mockEditItemApis(mock)
    mock.onGet('/content/versions/v1').reply(200, {
      code: 0,
      message: '成功',
      data: {
        id: 'v1',
        contentId: 'i1',
        versionNo: 1,
        title: '原标题',
        summary: '原摘要',
        status: 'draft',
        changeRemark: null,
        createdBy: null,
        createdAt: '',
        body: '最新正文内容',
        extraJson: null,
      },
      timestamp: 1,
      requestId: 'vd',
    })

    const { wrapper, router } = await mountContentFormApp()
    const formPage = findFormPage(wrapper)
    const bodyTextarea = formPage.find('textarea[rows="10"]')
    expect((bodyTextarea.element as HTMLTextAreaElement).value).toBe('最新正文内容')
    expect(mock.history.get.some((r) => r.url === '/content/versions/v1')).toBe(true)
    await teardownContentFormApp(wrapper, router)
  })

  it('无 version:read 时显示提示并禁用正文', async () => {
    mock.onGet('/content/categories').reply(200, {
      code: 0,
      message: '成功',
      data: { list: [], total: 0, page: 1, pageSize: 100 },
      timestamp: 1,
      requestId: 'c1',
    })
    mock.onGet('/content/items/i1').reply(200, {
      code: 0,
      message: '成功',
      data: {
        id: 'i1',
        contentType: 'notice',
        title: '主表标题',
        subtitle: null,
        summary: '主表摘要',
        categoryId: null,
        currentVersionId: 'v1',
        status: 'draft',
        isTop: 0,
        isRecommend: 0,
        sortOrder: 0,
        createdAt: '2024-01-01',
        publishAt: null,
        sourceType: null,
        sourceUrl: null,
        createdBy: 'u1',
        updatedBy: 'u1',
      },
      timestamp: 1,
      requestId: 'i1',
    })

    const { wrapper, router } = await mountContentFormApp('i1', ['content:item:update'])
    const formPage = findFormPage(wrapper)
    expect(formPage.text()).toContain('无版本查看权限，版本内容保持不变')
    const bodyTextarea = formPage.find('textarea[rows="10"]')
    expect((bodyTextarea.element as HTMLTextAreaElement).disabled).toBe(true)
    expect((bodyTextarea.element as HTMLTextAreaElement).value).toBe('')
    expect(mock.history.get.some((r) => r.url?.includes('/versions'))).toBe(false)
    await teardownContentFormApp(wrapper, router)
  })

  it('保存时清空 body 进入 PUT body', async () => {
    mockEditItemApis(mock)
    let putBody: Record<string, unknown> = {}
    mock.onPut('/content/items/i1').reply((config) => {
      putBody = JSON.parse(config.data as string)
      return [200, {
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
        requestId: 'put',
      }]
    })

    const { wrapper, router } = await mountContentFormApp()
    const formPage = findFormPage(wrapper)
    await formPage.find('textarea[rows="10"]').setValue('')
    await formPage.findAll('button').find((b) => b.text() === '保存')!.trigger('click')
    await flushPromises()

    expect(putBody.body).toBe('')
    expect(putBody).not.toHaveProperty('status')
    await teardownContentFormApp(wrapper, router)
  })

  it('连续点击两次保存只发起一次 PUT', async () => {
    mockEditItemApis(mock)
    let putCount = 0
    mock.onPut('/content/items/i1').reply(() => {
      putCount += 1
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve([200, {
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
            requestId: 'put',
          }])
        }, 100)
      })
    })

    const { wrapper, router } = await mountContentFormApp()
    const formPage = findFormPage(wrapper)
    const saveBtn = formPage.findAll('button').find((b) => b.text() === '保存')!
    await saveBtn.trigger('click')
    await saveBtn.trigger('click')
    await flushPromises()
    await new Promise((r) => setTimeout(r, 150))

    expect(putCount).toBe(1)
    await teardownContentFormApp(wrapper, router)
  })

  it('编辑分类时父分类不可修改', async () => {
    const pinia = createPinia()
    setupAuth(pinia, ['content:category:read', 'content:category:update'])

    mock.onGet('/content/categories').reply(200, {
      code: 0,
      message: '成功',
      data: {
        list: [
          { id: 'p1', parentId: null, categoryName: '父级', contentType: 'faq', sortOrder: 0, status: 'active', createdAt: '2024-01-01' },
          { id: 'c1', parentId: 'p1', categoryName: '子级', contentType: 'faq', sortOrder: 0, status: 'active', createdAt: '2024-01-01' },
        ],
        total: 2,
        page: 1,
        pageSize: 100,
      },
      timestamp: 1,
      requestId: 'list',
    })

    const wrapper = mount(ContentCategoryPage, categoryMountOpts(pinia))
    await flushPromises()

    const vm = wrapper.vm as unknown as {
      openEdit: (row: { id: string; parentId: string | null; categoryName: string; contentType: string; sortOrder: number; status: string; createdAt: string }) => void
      dialogMode: string
      form: { parentId: string; categoryName: string }
    }
    vm.openEdit({
      id: 'c1',
      parentId: 'p1',
      categoryName: '子级',
      contentType: 'faq',
      sortOrder: 0,
      status: 'active',
      createdAt: '2024-01-01',
    })
    await flushPromises()

    expect(vm.dialogMode).toBe('edit')
    expect(vm.form.parentId).toBe('p1')
    expect(vm.form.categoryName).toBe('子级')
    wrapper.unmount()
  })

  it('分类删除 409 显示后端文案', async () => {
    const pinia = createPinia()
    setupAuth(pinia, ['content:category:read', 'content:category:delete'])

    mock.onGet('/content/categories').reply(200, {
      code: 0,
      message: '成功',
      data: {
        list: [{ id: 'c1', parentId: null, categoryName: '待删', contentType: 'faq', sortOrder: 0, status: 'active', createdAt: '2024-01-01' }],
        total: 1,
        page: 1,
        pageSize: 100,
      },
      timestamp: 1,
      requestId: 'list',
    })
    mock.onDelete('/content/categories/c1').reply(409, {
      code: 409,
      message: '该分类下仍有内容，不允许删除',
      data: null,
      timestamp: 1,
      requestId: 'del',
    })

    vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue(undefined as never)

    const wrapper = mount(ContentCategoryPage, categoryMountOpts(pinia))
    await flushPromises()

    const vm = wrapper.vm as unknown as {
      onDelete: (row: { id: string; parentId: null; categoryName: string; contentType: string; sortOrder: number; status: string; createdAt: string }) => Promise<void>
    }
    await vm.onDelete({
      id: 'c1',
      parentId: null,
      categoryName: '待删',
      contentType: 'faq',
      sortOrder: 0,
      status: 'active',
      createdAt: '2024-01-01',
    })
    await flushPromises()

    expect(ElMessage.error).toHaveBeenCalledWith('该分类下仍有内容，不允许删除')
    wrapper.unmount()
  })
})
