import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import MockAdapter from 'axios-mock-adapter'
import { http } from '@/api/http'
import { fetchHomeConfigApi, updateHomeConfigApi } from '@/api/home/config'
import {
  createHomeModuleApi,
  deleteHomeModuleApi,
  fetchHomeModulesApi,
  sortHomeModulesApi,
  updateHomeModuleApi,
} from '@/api/home/modules'
import {
  approveHomeConfigPublishApi,
  directPublishHomeConfigApi,
  fetchHomeConfigPublishRecordsApi,
  rejectHomeConfigPublishApi,
  rollbackHomeConfigPublishApi,
  submitHomeConfigPublishApi,
  withdrawHomeConfigPublishApi,
} from '@/api/publish/homeConfig'

const CONFIG_ID = 'home-config-001'
const MODULE_ID = 'module-001'

describe('首页配置 API（axios-mock-adapter）', () => {
  let mock: MockAdapter

  beforeEach(() => {
    mock = new MockAdapter(http)
  })

  afterEach(() => {
    mock.restore()
  })

  it('GET /home/config', async () => {
    mock.onGet('/home/config').reply(200, {
      code: 0,
      message: '成功',
      data: {
        id: CONFIG_ID,
        configName: 'default',
        status: 'draft',
        currentVersionId: null,
        currentVersion: null,
        draftVersion: null,
        updatedAt: null,
      },
      timestamp: 1,
      requestId: 'h1',
    })
    const data = await fetchHomeConfigApi()
    expect(data.id).toBe(CONFIG_ID)
    expect(mock.history.get[0].url).toBe('/home/config')
  })

  it('PUT /home/config 提交解析后的 JSON 对象', async () => {
    mock.onPut('/home/config').reply((config) => {
      const body = JSON.parse(config.data as string)
      expect(body.title).toBe('首页')
      expect(body.topBannerJson).toEqual(['行1'])
      expect(body.themeJson).toEqual({ primary: '#000' })
      return [200, { code: 0, message: '成功', data: { id: CONFIG_ID }, timestamp: 1, requestId: 'h2' }]
    })
    await updateHomeConfigApi({
      title: '首页',
      topBannerJson: ['行1'],
      themeJson: { primary: '#000' },
    })
  })

  it('GET /home/modules', async () => {
    mock.onGet('/home/modules').reply(200, {
      code: 0,
      message: '成功',
      data: { list: [] },
      timestamp: 1,
      requestId: 'm1',
    })
    await fetchHomeModulesApi()
    expect(mock.history.get[0].url).toBe('/home/modules')
  })

  it('POST /home/modules isVisible 为 boolean', async () => {
    mock.onPost('/home/modules').reply((config) => {
      const body = JSON.parse(config.data as string)
      expect(body.isVisible).toBe(false)
      expect(typeof body.isVisible).toBe('boolean')
      return [200, {
        code: 0,
        message: '成功',
        data: { id: MODULE_ID, isVisible: false },
        timestamp: 1,
        requestId: 'm2',
      }]
    })
    await createHomeModuleApi({
      moduleCode: 'card_a',
      moduleName: '卡片A',
      moduleType: 'card',
      targetType: 'route',
      targetValue: '/a',
      isVisible: false,
    })
  })

  it('PUT /home/modules/sort', async () => {
    mock.onPut('/home/modules/sort').reply((config) => {
      const body = JSON.parse(config.data as string)
      expect(body.items).toEqual([
        { id: 'm1', sortOrder: 1 },
        { id: 'm2', sortOrder: 2 },
      ])
      return [200, { code: 0, message: '成功', data: { list: [] }, timestamp: 1, requestId: 'm3' }]
    })
    await sortHomeModulesApi({
      items: [
        { id: 'm1', sortOrder: 1 },
        { id: 'm2', sortOrder: 2 },
      ],
    })
  })

  it('PUT /home/modules/:id', async () => {
    mock.onPut(`/home/modules/${MODULE_ID}`).reply(200, {
      code: 0,
      message: '成功',
      data: { id: MODULE_ID },
      timestamp: 1,
      requestId: 'm4',
    })
    await updateHomeModuleApi(MODULE_ID, { moduleName: '新名称' })
  })

  it('DELETE /home/modules/:id', async () => {
    mock.onDelete(`/home/modules/${MODULE_ID}`).reply(200, {
      code: 0,
      message: '成功',
      data: null,
      timestamp: 1,
      requestId: 'm5',
    })
    await deleteHomeModuleApi(MODULE_ID)
  })

  describe('发布 home_config', () => {
    it('POST /publish/home_config/:id/submit', async () => {
      mock.onPost(`/publish/home_config/${CONFIG_ID}/submit`).reply(200, {
        code: 0,
        message: '成功',
        data: { bizId: CONFIG_ID, bizType: 'home_config' },
        timestamp: 1,
        requestId: 'p1',
      })
      await submitHomeConfigPublishApi(CONFIG_ID)
      expect(mock.history.post[0].url).toBe(`/publish/home_config/${CONFIG_ID}/submit`)
    })

    it('POST /publish/home_config/:id/approve', async () => {
      mock.onPost(`/publish/home_config/${CONFIG_ID}/approve`).reply(200, {
        code: 0, message: '成功', data: {}, timestamp: 1, requestId: 'p2',
      })
      await approveHomeConfigPublishApi(CONFIG_ID)
    })

    it('POST /publish/home_config/:id/reject', async () => {
      mock.onPost(`/publish/home_config/${CONFIG_ID}/reject`).reply(200, {
        code: 0, message: '成功', data: {}, timestamp: 1, requestId: 'p3',
      })
      await rejectHomeConfigPublishApi(CONFIG_ID, { comment: '驳回' })
    })

    it('POST /publish/home_config/:id/direct-publish', async () => {
      mock.onPost(`/publish/home_config/${CONFIG_ID}/direct-publish`).reply(200, {
        code: 0, message: '成功', data: {}, timestamp: 1, requestId: 'p4',
      })
      await directPublishHomeConfigApi(CONFIG_ID)
    })

    it('POST /publish/home_config/:id/withdraw', async () => {
      mock.onPost(`/publish/home_config/${CONFIG_ID}/withdraw`).reply(200, {
        code: 0, message: '成功', data: {}, timestamp: 1, requestId: 'p5',
      })
      await withdrawHomeConfigPublishApi(CONFIG_ID)
    })

    it('POST /publish/home_config/:id/rollback', async () => {
      mock.onPost(`/publish/home_config/${CONFIG_ID}/rollback`).reply((config) => {
        expect(JSON.parse(config.data as string)).toEqual({ versionId: 'ver-old' })
        return [200, { code: 0, message: '成功', data: {}, timestamp: 1, requestId: 'p6' }]
      })
      await rollbackHomeConfigPublishApi(CONFIG_ID, { versionId: 'ver-old' })
    })

    it('GET /publish/home_config/:id/records', async () => {
      mock.onGet(`/publish/home_config/${CONFIG_ID}/records`).reply(200, {
        code: 0,
        message: '成功',
        data: [{ id: 'r1', action: 'submit', bizType: 'home_config' }],
        timestamp: 1,
        requestId: 'p7',
      })
      const rows = await fetchHomeConfigPublishRecordsApi(CONFIG_ID)
      expect(rows[0].bizType).toBe('home_config')
    })
  })
})
