import { beforeEach, describe, expect, it, vi } from 'vitest'
import { pickLatestVersion, loadItemEditFormData } from '@/utils/itemEditLoader'
import * as itemsApi from '@/api/content/items'

vi.mock('@/api/content/items', () => ({
  fetchItemApi: vi.fn(),
  fetchItemVersionsApi: vi.fn(),
  fetchVersionApi: vi.fn(),
}))

const mockedItem = vi.mocked(itemsApi.fetchItemApi)
const mockedVersions = vi.mocked(itemsApi.fetchItemVersionsApi)
const mockedVersion = vi.mocked(itemsApi.fetchVersionApi)

const itemDetail = {
  id: 'i1',
  contentType: 'policy_file',
  title: '主表标题',
  subtitle: '副标题',
  summary: '主表摘要',
  categoryId: 'cat-1',
  currentVersionId: 'v2',
  status: 'draft',
  isTop: 0,
  isRecommend: 1,
  sortOrder: 5,
  createdAt: '2024-01-01',
  publishAt: null,
  sourceType: 'gov',
  sourceUrl: 'https://example.com',
  createdBy: 'u1',
  updatedBy: 'u1',
}

describe('itemEditLoader', () => {
  beforeEach(() => {
    mockedItem.mockReset()
    mockedVersions.mockReset()
    mockedVersion.mockReset()
  })

  it('pickLatestVersion 选择 versionNo 最大项', () => {
    const latest = pickLatestVersion([
      { id: 'v1', contentId: 'i1', versionNo: 1, title: 'a', summary: null, status: 'draft', changeRemark: null, createdBy: null, createdAt: '' },
      { id: 'v2', contentId: 'i1', versionNo: 3, title: 'c', summary: null, status: 'draft', changeRemark: null, createdBy: null, createdAt: '' },
      { id: 'v3', contentId: 'i1', versionNo: 2, title: 'b', summary: null, status: 'draft', changeRemark: null, createdBy: null, createdAt: '' },
    ])
    expect(latest?.id).toBe('v2')
    expect(latest?.versionNo).toBe(3)
  })

  it('有 version:read 时回显最新版本字段与主表字段', async () => {
    mockedItem.mockResolvedValueOnce(itemDetail)
    mockedVersions.mockResolvedValueOnce([
      { id: 'v1', contentId: 'i1', versionNo: 1, title: '旧', summary: null, status: 'draft', changeRemark: null, createdBy: null, createdAt: '' },
      { id: 'v2', contentId: 'i1', versionNo: 2, title: '版本标题', summary: '版本摘要', status: 'draft', changeRemark: null, createdBy: null, createdAt: '' },
    ])
    mockedVersion.mockResolvedValueOnce({
      id: 'v2',
      contentId: 'i1',
      versionNo: 2,
      title: '版本标题',
      summary: '版本摘要',
      status: 'draft',
      changeRemark: null,
      createdBy: 'u1',
      createdAt: '2024-02-01',
      body: '版本正文',
      extraJson: '{"k":1}',
    })

    const data = await loadItemEditFormData('i1', true)
    expect(data.title).toBe('版本标题')
    expect(data.summary).toBe('版本摘要')
    expect(data.body).toBe('版本正文')
    expect(data.extraJson).toBe('{"k":1}')
    expect(data.categoryId).toBe('cat-1')
    expect(data.sortOrder).toBe(5)
    expect(data.isRecommend).toBe(1)
    expect(data.sourceType).toBe('gov')
    expect(data.subtitle).toBe('副标题')
    expect(data.canEditVersionFields).toBe(true)
    expect(mockedVersion).toHaveBeenCalledWith('v2')
  })

  it('无 version:read 时禁用版本字段且正文为空', async () => {
    mockedItem.mockResolvedValueOnce(itemDetail)

    const data = await loadItemEditFormData('i1', false)
    expect(data.title).toBe('主表标题')
    expect(data.summary).toBe('主表摘要')
    expect(data.body).toBe('')
    expect(data.canEditVersionFields).toBe(false)
    expect(data.versionReadDenied).toBe(true)
    expect(data.categoryId).toBe('cat-1')
    expect(mockedVersions).not.toHaveBeenCalled()
    expect(mockedVersion).not.toHaveBeenCalled()
  })
})
