import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import MockAdapter from 'axios-mock-adapter'
import { ElMessage, ElMessageBox } from 'element-plus'
import { http } from '@/api/http'
import PublishRecordsDialog from '@/components/publish/PublishRecordsDialog.vue'
import {
  findButtonByText,
  mountItemListPage,
  mountVersionsPage,
} from './helpers/publishTest'

function makeListItem(status: string) {
  return {
    id: 'item-1',
    contentType: 'notice',
    title: '测试内容',
    subtitle: null,
    summary: null,
    categoryId: null,
    currentVersionId: 'v1',
    status,
    isTop: 0,
    isRecommend: 0,
    sortOrder: 0,
    createdAt: '2024-06-01T00:00:00.000Z',
  }
}

function makeVersion(
  id: string,
  versionNo: number,
  status: string,
) {
  return {
    id,
    contentId: 'item-1',
    versionNo,
    title: `标题 v${versionNo}`,
    summary: null,
    status,
    changeRemark: null,
    createdBy: 'u1',
    createdAt: '2024-06-01T00:00:00.000Z',
  }
}

function mockListApis(mock: MockAdapter, status: string): void {
  mock.onGet('/content/categories').reply(200, {
    code: 0, message: '成功', data: { list: [], total: 0, page: 1, pageSize: 100 }, timestamp: 1, requestId: 'c',
  })
  mock.onGet('/content/items').reply(200, {
    code: 0, message: '成功', data: { list: [makeListItem(status)], total: 1, page: 1, pageSize: 20 }, timestamp: 1, requestId: 'l',
  })
}

function mockVersionsApi(mock: MockAdapter, versions: ReturnType<typeof makeVersion>[]): void {
  mock.onGet('/content/items/item-1/versions').reply(200, {
    code: 0, message: '成功', data: versions, timestamp: 1, requestId: 'vers',
  })
}

const ALL_PUBLISH_PERMS = [
  'content:item:read',
  'content:version:read',
  'publish:submit',
  'publish:approve',
  'publish:reject',
  'publish:direct-publish',
  'publish:withdraw',
  'publish:rollback',
  'publish:record:read',
]

describe('内容发布组件', () => {
  let mock: MockAdapter

  beforeEach(() => {
    mock = new MockAdapter(http)
    vi.spyOn(ElMessage, 'success').mockImplementation(() => undefined as never)
    vi.spyOn(ElMessage, 'error').mockImplementation(() => undefined as never)
    vi.spyOn(ElMessage, 'warning').mockImplementation(() => undefined as never)
  })

  afterEach(() => {
    mock.restore()
    vi.restoreAllMocks()
  })

  it('draft 列表显示提交审核与直接发布', async () => {
    mockListApis(mock, 'draft')
    const wrapper = await mountItemListPage(['content:item:read', 'publish:submit', 'publish:direct-publish'])
    expect(wrapper.text()).toContain('提交审核')
    expect(wrapper.text()).toContain('直接发布')
    expect(wrapper.text()).not.toContain('审核通过')
    wrapper.unmount()
  })

  it('published 列表仅显示撤回，不显示提交/通过/驳回/直接发布', async () => {
    mockListApis(mock, 'published')
    const wrapper = await mountItemListPage(ALL_PUBLISH_PERMS)
    expect(findButtonByText(wrapper, '撤回')).toBeDefined()
    expect(findButtonByText(wrapper, '提交审核')).toBeUndefined()
    expect(findButtonByText(wrapper, '审核通过')).toBeUndefined()
    expect(findButtonByText(wrapper, '审核驳回')).toBeUndefined()
    expect(findButtonByText(wrapper, '直接发布')).toBeUndefined()
    wrapper.unmount()
  })

  it('withdrawn 列表不显示提交和直接发布', async () => {
    mockListApis(mock, 'withdrawn')
    const wrapper = await mountItemListPage(ALL_PUBLISH_PERMS)
    expect(wrapper.text()).not.toContain('提交审核')
    expect(wrapper.text()).not.toContain('直接发布')
    expect(findButtonByText(wrapper, '撤回')).toBeUndefined()
    wrapper.unmount()
  })

  it('rejected 列表不显示提交审核和直接发布', async () => {
    mockListApis(mock, 'rejected')
    const wrapper = await mountItemListPage(ALL_PUBLISH_PERMS)
    expect(findButtonByText(wrapper, '提交审核')).toBeUndefined()
    expect(findButtonByText(wrapper, '直接发布')).toBeUndefined()
    expect(findButtonByText(wrapper, '发布记录')).toBeDefined()
    wrapper.unmount()
  })

  it('pending 列表显示审核通过与驳回', async () => {
    mockListApis(mock, 'pending')
    const wrapper = await mountItemListPage(['content:item:read', 'publish:approve', 'publish:reject'])
    expect(wrapper.text()).toContain('审核通过')
    expect(wrapper.text()).toContain('审核驳回')
    expect(wrapper.text()).not.toContain('提交审核')
    wrapper.unmount()
  })

  it('无 publish:submit 权限不显示提交审核', async () => {
    mockListApis(mock, 'draft')
    const wrapper = await mountItemListPage(['content:item:read', 'publish:direct-publish'])
    expect(wrapper.text()).not.toContain('提交审核')
    expect(wrapper.text()).toContain('直接发布')
    wrapper.unmount()
  })

  it('无发布权限时不显示任何发布操作按钮', async () => {
    mockListApis(mock, 'draft')
    const wrapper = await mountItemListPage(['content:item:read'])
    expect(wrapper.text()).not.toContain('提交审核')
    expect(wrapper.text()).not.toContain('发布记录')
    wrapper.unmount()
  })

  it('列表提交审核成功后刷新列表', async () => {
    vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue(undefined as never)
    let listCall = 0
    mock.onGet('/content/categories').reply(200, {
      code: 0, message: '成功', data: { list: [], total: 0, page: 1, pageSize: 100 }, timestamp: 1, requestId: 'c',
    })
    mock.onGet('/content/items').reply(() => {
      listCall += 1
      const status = listCall >= 2 ? 'pending' : 'draft'
      return [200, {
        code: 0, message: '成功',
        data: { list: [makeListItem(status)], total: 1, page: 1, pageSize: 20 },
        timestamp: 1, requestId: `l${listCall}`,
      }]
    })
    mock.onPost('/publish/content/item-1/submit').reply(200, {
      code: 0, message: '成功',
      data: {
        bizId: 'item-1', bizType: 'content', itemStatus: 'pending', versionId: 'v1',
        versionStatus: 'pending', versionNo: 1, currentVersionId: null, publishAt: null,
      },
      timestamp: 1, requestId: 'sub',
    })

    const wrapper = await mountItemListPage(['content:item:read', 'publish:submit'])
    await findButtonByText(wrapper, '提交审核')!.trigger('click')
    await flushPromises()
    expect(listCall).toBeGreaterThanOrEqual(2)
    wrapper.unmount()
  })

  it('列表 409 显示后端冲突文案', async () => {
    vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue(undefined as never)
    mockListApis(mock, 'draft')
    mock.onPost('/publish/content/item-1/submit').reply(409, {
      code: 409, message: '已存在待审核版本，无法提交或直接发布', data: null, timestamp: 1, requestId: 'e',
    })
    const wrapper = await mountItemListPage(['content:item:read', 'publish:submit'])
    await findButtonByText(wrapper, '提交审核')!.trigger('click')
    await flushPromises()
    expect(ElMessage.error).toHaveBeenCalledWith('已存在待审核版本，无法提交或直接发布')
    wrapper.unmount()
  })

  it('列表连续点击提交审核只发送一次 POST', async () => {
    vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue(undefined as never)
    let postCount = 0
    mockListApis(mock, 'draft')
    mock.onPost('/publish/content/item-1/submit').reply(() => {
      postCount += 1
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve([200, {
            code: 0, message: '成功',
            data: {
              bizId: 'item-1', bizType: 'content', itemStatus: 'pending', versionId: 'v1',
              versionStatus: 'pending', versionNo: 1, currentVersionId: null, publishAt: null,
            },
            timestamp: 1, requestId: 'sub',
          }])
        }, 80)
      })
    })
    const wrapper = await mountItemListPage(['content:item:read', 'publish:submit'])
    const btn = findButtonByText(wrapper, '提交审核')!
    await btn.trigger('click')
    await btn.trigger('click')
    await flushPromises()
    await new Promise((r) => setTimeout(r, 120))
    expect(postCount).toBe(1)
    wrapper.unmount()
  })

  it('发布记录对话框加载并展示', async () => {
    mock.onGet('/publish/content/item-1/records').reply(200, {
      code: 0, message: '成功',
      data: [{
        id: 'rec-1', bizType: 'content', bizId: 'item-1', versionId: 'v1',
        action: 'submit', fromStatus: 'draft', toStatus: 'pending',
        comment: '请审', operatorId: 'u1', operatedAt: '2024-06-01T00:00:00.000Z',
      }],
      timestamp: 1, requestId: 'rec',
    })
    const wrapper = mount(PublishRecordsDialog, {
      props: { modelValue: true, bizId: 'item-1' },
      global: { stubs: { teleport: true } },
    })
    await flushPromises()
    expect(mock.history.get.some((r) => r.url === '/publish/content/item-1/records')).toBe(true)
    expect(wrapper.text()).toContain('请审')
    wrapper.unmount()
  })

  it('rejected 内容在版本页最新 draft 显示提交和直接发布', async () => {
    mockVersionsApi(mock, [
      makeVersion('v-rej', 1, 'rejected'),
      makeVersion('v-draft', 2, 'draft'),
    ])
    const { wrapper } = await mountVersionsPage('item-1', ['content:version:read', 'publish:submit', 'publish:direct-publish'])
    const draftRow = wrapper.findAll('tr').find((r) => r.text().includes('标题 v2'))!
    expect(draftRow.text()).toContain('提交审核')
    expect(draftRow.text()).toContain('直接发布')
    const rejectedRow = wrapper.findAll('tr').find((r) => r.text().includes('标题 v1'))!
    expect(rejectedRow.text()).not.toContain('提交审核')
    wrapper.unmount()
  })

  it('draft 与 pending 并存时 draft 不显示提交和直接发布', async () => {
    mockVersionsApi(mock, [
      makeVersion('v-draft', 2, 'draft'),
      makeVersion('v-pend', 3, 'pending'),
    ])
    const { wrapper } = await mountVersionsPage('item-1', ALL_PUBLISH_PERMS)
    const draftRow = wrapper.findAll('tr').find((r) => r.text().includes('标题 v2'))!
    expect(draftRow.text()).not.toContain('提交审核')
    expect(draftRow.text()).not.toContain('直接发布')
    const pendingRow = wrapper.findAll('tr').find((r) => r.text().includes('标题 v3'))!
    expect(pendingRow.text()).toContain('审核通过')
    wrapper.unmount()
  })

  it('多个 pending 显示异常提示且无审核按钮', async () => {
    mockVersionsApi(mock, [
      makeVersion('v-p1', 1, 'pending'),
      makeVersion('v-p2', 2, 'pending'),
    ])
    const { wrapper } = await mountVersionsPage('item-1', ['content:version:read', 'publish:approve', 'publish:reject'])
    expect(wrapper.text()).toContain('存在多个待审核版本')
    expect(findButtonByText(wrapper, '审核通过')).toBeUndefined()
    expect(findButtonByText(wrapper, '审核驳回')).toBeUndefined()
    wrapper.unmount()
  })

  it('最新 draft 版本显示提交和直接发布', async () => {
    mockVersionsApi(mock, [
      makeVersion('v1', 1, 'published'),
      makeVersion('v2', 2, 'draft'),
    ])
    const { wrapper } = await mountVersionsPage('item-1', ['content:version:read', 'publish:submit', 'publish:direct-publish'])
    const row2Buttons = wrapper.findAll('tr').filter((r) => r.text().includes('标题 v2'))
    expect(row2Buttons.length).toBeGreaterThan(0)
    expect(row2Buttons[0].text()).toContain('提交审核')
    expect(row2Buttons[0].text()).toContain('直接发布')
    wrapper.unmount()
  })

  it('非最新 draft 版本不显示提交和直接发布', async () => {
    mockVersionsApi(mock, [
      makeVersion('v1', 1, 'draft'),
      makeVersion('v2', 2, 'draft'),
    ])
    const { wrapper } = await mountVersionsPage('item-1', ALL_PUBLISH_PERMS)
    const row1 = wrapper.findAll('tr').find((r) => r.text().includes('标题 v1'))!
    expect(row1.text()).not.toContain('提交审核')
    expect(row1.text()).not.toContain('直接发布')
    const row2 = wrapper.findAll('tr').find((r) => r.text().includes('标题 v2'))!
    expect(row2.text()).toContain('提交审核')
    wrapper.unmount()
  })

  it('pending 版本显示审核通过与驳回', async () => {
    mockVersionsApi(mock, [makeVersion('v-p', 1, 'pending')])
    const { wrapper } = await mountVersionsPage('item-1', ['content:version:read', 'publish:approve', 'publish:reject'])
    expect(wrapper.text()).toContain('审核通过')
    expect(wrapper.text()).toContain('审核驳回')
    wrapper.unmount()
  })

  it('版本提交审核请求携带 versionId', async () => {
    vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue(undefined as never)
    mockVersionsApi(mock, [makeVersion('ver-draft', 2, 'draft')])
    let body: Record<string, unknown> = {}
    mock.onPost('/publish/content/item-1/submit').reply((config) => {
      body = JSON.parse(config.data as string)
      return [200, {
        code: 0, message: '成功',
        data: {
          bizId: 'item-1', bizType: 'content', itemStatus: 'pending', versionId: 'ver-draft',
          versionStatus: 'pending', versionNo: 2, currentVersionId: null, publishAt: null,
        },
        timestamp: 1, requestId: 'sub',
      }]
    })
    const { wrapper } = await mountVersionsPage('item-1', ['content:version:read', 'publish:submit'])
    await findButtonByText(wrapper, '提交审核')!.trigger('click')
    await flushPromises()
    expect(body).toEqual({ versionId: 'ver-draft' })
    wrapper.unmount()
  })

  it('版本审核通过请求携带 versionId 和 comment', async () => {
    mockVersionsApi(mock, [makeVersion('ver-p', 1, 'pending')])
    let body: Record<string, unknown> = {}
    mock.onPost('/publish/content/item-1/approve').reply((config) => {
      body = JSON.parse(config.data as string)
      return [200, {
        code: 0, message: '成功',
        data: {
          bizId: 'item-1', bizType: 'content', itemStatus: 'published', versionId: 'ver-p',
          versionStatus: 'published', versionNo: 1, currentVersionId: 'ver-p', publishAt: '2024-06-01',
        },
        timestamp: 1, requestId: 'ap',
      }]
    })
    const { wrapper } = await mountVersionsPage('item-1', ['content:version:read', 'publish:approve'])
    await findButtonByText(wrapper, '审核通过')!.trigger('click')
    await flushPromises()
    const dialog = wrapper.findComponent({ name: 'PublishCommentDialog' })
    await dialog.find('textarea').setValue('同意发布')
    await findButtonByText(dialog, '确定')!.trigger('click')
    await flushPromises()
    expect(body).toEqual({ versionId: 'ver-p', comment: '同意发布' })
    wrapper.unmount()
  })

  it('版本直接发布请求携带 versionId', async () => {
    vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue(undefined as never)
    mockVersionsApi(mock, [makeVersion('ver-draft', 1, 'draft')])
    let body: Record<string, unknown> = {}
    mock.onPost('/publish/content/item-1/direct-publish').reply((config) => {
      body = JSON.parse(config.data as string)
      return [200, {
        code: 0, message: '成功',
        data: {
          bizId: 'item-1', bizType: 'content', itemStatus: 'published', versionId: 'ver-draft',
          versionStatus: 'published', versionNo: 1, currentVersionId: 'ver-draft', publishAt: '2024-06-01',
        },
        timestamp: 1, requestId: 'dp',
      }]
    })
    const { wrapper } = await mountVersionsPage('item-1', ['content:version:read', 'publish:direct-publish'])
    await findButtonByText(wrapper, '直接发布')!.trigger('click')
    await flushPromises()
    expect(body).toEqual({ versionId: 'ver-draft' })
    wrapper.unmount()
  })

  it('版本审核驳回请求携带 versionId 和 comment', async () => {
    mockVersionsApi(mock, [makeVersion('ver-p', 1, 'pending')])
    let body: Record<string, unknown> = {}
    mock.onPost('/publish/content/item-1/reject').reply((config) => {
      body = JSON.parse(config.data as string)
      return [200, {
        code: 0, message: '成功',
        data: {
          bizId: 'item-1', bizType: 'content', itemStatus: 'rejected', versionId: 'ver-p',
          versionStatus: 'rejected', versionNo: 1, currentVersionId: null, publishAt: null,
        },
        timestamp: 1, requestId: 'rej',
      }]
    })
    const { wrapper } = await mountVersionsPage('item-1', ['content:version:read', 'publish:reject'])
    await findButtonByText(wrapper, '审核驳回')!.trigger('click')
    await flushPromises()
    const dialog = wrapper.findComponent({ name: 'PublishCommentDialog' })
    await dialog.find('textarea').setValue('不合规')
    await findButtonByText(dialog, '确定')!.trigger('click')
    await flushPromises()
    expect(body).toEqual({ versionId: 'ver-p', comment: '不合规' })
    wrapper.unmount()
  })

  it('版本驳回空意见不发送请求', async () => {
    mockVersionsApi(mock, [makeVersion('ver-p', 1, 'pending')])
    const { wrapper } = await mountVersionsPage('item-1', ['content:version:read', 'publish:reject'])
    await findButtonByText(wrapper, '审核驳回')!.trigger('click')
    await flushPromises()
    const dialog = wrapper.findComponent({ name: 'PublishCommentDialog' })
    await findButtonByText(dialog, '确定')!.trigger('click')
    await flushPromises()
    expect(ElMessage.warning).toHaveBeenCalledWith('请填写意见说明')
    expect(mock.history.post.length).toBe(0)
    wrapper.unmount()
  })

  it('版本操作成功后重新加载版本列表', async () => {
    vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue(undefined as never)
    let versionCalls = 0
    mock.onGet('/content/items/item-1/versions').reply(() => {
      versionCalls += 1
      const status = versionCalls >= 2 ? 'pending' : 'draft'
      return [200, {
        code: 0, message: '成功',
        data: [makeVersion('ver-d', 1, status)],
        timestamp: 1, requestId: `v${versionCalls}`,
      }]
    })
    mock.onPost('/publish/content/item-1/submit').reply(200, {
      code: 0, message: '成功',
      data: {
        bizId: 'item-1', bizType: 'content', itemStatus: 'pending', versionId: 'ver-d',
        versionStatus: 'pending', versionNo: 1, currentVersionId: null, publishAt: null,
      },
      timestamp: 1, requestId: 'sub',
    })
    const { wrapper } = await mountVersionsPage('item-1', ['content:version:read', 'publish:submit'])
    await findButtonByText(wrapper, '提交审核')!.trigger('click')
    await flushPromises()
    expect(versionCalls).toBeGreaterThanOrEqual(2)
    wrapper.unmount()
  })

  it('版本 409 显示后端冲突文案', async () => {
    vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue(undefined as never)
    mockVersionsApi(mock, [makeVersion('ver-d', 1, 'draft')])
    mock.onPost('/publish/content/item-1/submit').reply(409, {
      code: 409, message: '已存在待审核版本，无法提交或直接发布', data: null, timestamp: 1, requestId: 'e',
    })
    const { wrapper } = await mountVersionsPage('item-1', ['content:version:read', 'publish:submit'])
    await findButtonByText(wrapper, '提交审核')!.trigger('click')
    await flushPromises()
    expect(ElMessage.error).toHaveBeenCalledWith('已存在待审核版本，无法提交或直接发布')
    wrapper.unmount()
  })

  it('版本 403 显示后端文案', async () => {
    vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue(undefined as never)
    mockVersionsApi(mock, [makeVersion('ver-d', 1, 'draft')])
    mock.onPost('/publish/content/item-1/submit').reply(403, {
      code: 403, message: '无权限', data: null, timestamp: 1, requestId: 'f',
    })
    const { wrapper } = await mountVersionsPage('item-1', ['content:version:read', 'publish:submit'])
    await findButtonByText(wrapper, '提交审核')!.trigger('click')
    await flushPromises()
    expect(ElMessage.error).toHaveBeenCalledWith('无权限')
    wrapper.unmount()
  })

  it('版本直接发布成功后重新加载版本列表', async () => {
    vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue(undefined as never)
    let versionCalls = 0
    mock.onGet('/content/items/item-1/versions').reply(() => {
      versionCalls += 1
      const status = versionCalls >= 2 ? 'published' : 'draft'
      return [200, {
        code: 0, message: '成功',
        data: [makeVersion('ver-d', 1, status)],
        timestamp: 1, requestId: `v${versionCalls}`,
      }]
    })
    mock.onPost('/publish/content/item-1/direct-publish').reply(200, {
      code: 0, message: '成功',
      data: {
        bizId: 'item-1', bizType: 'content', itemStatus: 'published', versionId: 'ver-d',
        versionStatus: 'published', versionNo: 1, currentVersionId: 'ver-d', publishAt: '2024-06-01',
      },
      timestamp: 1, requestId: 'dp',
    })
    const { wrapper } = await mountVersionsPage('item-1', ['content:version:read', 'publish:direct-publish'])
    await findButtonByText(wrapper, '直接发布')!.trigger('click')
    await flushPromises()
    expect(versionCalls).toBeGreaterThanOrEqual(2)
    wrapper.unmount()
  })

  it('版本连续点击只发送一次 POST', async () => {
    vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue(undefined as never)
    let postCount = 0
    mockVersionsApi(mock, [makeVersion('ver-d', 1, 'draft')])
    mock.onPost('/publish/content/item-1/submit').reply(() => {
      postCount += 1
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve([200, {
            code: 0, message: '成功',
            data: {
              bizId: 'item-1', bizType: 'content', itemStatus: 'pending', versionId: 'ver-d',
              versionStatus: 'pending', versionNo: 1, currentVersionId: null, publishAt: null,
            },
            timestamp: 1, requestId: 'sub',
          }])
        }, 80)
      })
    })
    const { wrapper } = await mountVersionsPage('item-1', ['content:version:read', 'publish:submit'])
    const btn = findButtonByText(wrapper, '提交审核')!
    await btn.trigger('click')
    await btn.trigger('click')
    await flushPromises()
    await new Promise((r) => setTimeout(r, 120))
    expect(postCount).toBe(1)
    wrapper.unmount()
  })

  it('无 publish:rollback 权限不显示回滚按钮', async () => {
    mockVersionsApi(mock, [makeVersion('ver-pub', 1, 'published')])
    const { wrapper } = await mountVersionsPage('item-1', ['content:version:read'])
    expect(wrapper.text()).not.toContain('回滚')
    wrapper.unmount()
  })

  it('版本回滚携带 versionId 且提示已创建新草稿', async () => {
    vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue(undefined as never)
    mockVersionsApi(mock, [makeVersion('ver-pub', 1, 'published')])
    let rollbackBody: Record<string, unknown> = {}
    mock.onPost('/publish/content/item-1/rollback').reply((config) => {
      rollbackBody = JSON.parse(config.data as string)
      return [200, {
        code: 0, message: '成功',
        data: {
          bizId: 'item-1', bizType: 'content', itemStatus: 'published', versionId: 'ver-new',
          versionStatus: 'draft', versionNo: 2, currentVersionId: 'ver-pub', publishAt: '2024-06-01T00:00:00.000Z',
        },
        timestamp: 1, requestId: 'rb',
      }]
    })
    const { wrapper } = await mountVersionsPage('item-1', ['content:version:read', 'publish:rollback'])
    await findButtonByText(wrapper, '回滚')!.trigger('click')
    await flushPromises()
    const dialog = wrapper.findComponent({ name: 'PublishCommentDialog' })
    await findButtonByText(dialog, '确定')!.trigger('click')
    await flushPromises()
    expect(rollbackBody.versionId).toBe('ver-pub')
    expect(ElMessage.success).toHaveBeenCalledWith('已创建新的草稿版本')
    wrapper.unmount()
  })
})
