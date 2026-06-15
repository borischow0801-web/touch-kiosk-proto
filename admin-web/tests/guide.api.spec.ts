import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import MockAdapter from 'axios-mock-adapter'
import { http } from '@/api/http'
import {
  createDeptApi,
  deleteDeptApi,
  fetchDeptsApi,
  updateDeptApi,
} from '@/api/guide/depts'
import {
  createThemeApi,
  deleteThemeApi,
  fetchThemesApi,
  updateThemeApi,
} from '@/api/guide/themes'
import {
  createItemConfigApi,
  deleteItemConfigApi,
  fetchItemConfigsApi,
  updateItemConfigApi,
} from '@/api/guide/itemConfigs'
import { POLICY_ID_A, FAQ_ID_A } from './helpers/guideTest'

describe('办事指南 API（axios-mock-adapter）', () => {
  let mock: MockAdapter

  beforeEach(() => {
    mock = new MockAdapter(http)
  })

  afterEach(() => {
    mock.restore()
  })

  describe('部门映射', () => {
    it('GET /guide/depts 带分页参数', async () => {
      mock.onGet('/guide/depts').reply((config) => {
        expect(config.params).toMatchObject({ page: 1, pageSize: 20 })
        return [200, {
          code: 0,
          message: '成功',
          data: { list: [], total: 0, page: 1, pageSize: 20 },
          timestamp: 1,
          requestId: 'r1',
        }]
      })
      await fetchDeptsApi({ page: 1, pageSize: 20 })
    })

    it('POST /guide/depts', async () => {
      mock.onPost('/guide/depts').reply((config) => {
        const body = JSON.parse(config.data as string)
        expect(body.deptCode).toBe('SCJGJ')
        return [200, { code: 0, message: '成功', data: { id: 'd1' }, timestamp: 1, requestId: 'r2' }]
      })
      await createDeptApi({ deptCode: 'SCJGJ', deptName: '市场监管局', displayName: '市监局' })
    })

    it('PUT /guide/depts/:id 不含 deptCode', async () => {
      mock.onPut('/guide/depts/d1').reply((config) => {
        const body = JSON.parse(config.data as string)
        expect(body).toEqual({ displayName: '新名', status: 'disabled' })
        expect(body).not.toHaveProperty('deptCode')
        return [200, { code: 0, message: '成功', data: { id: 'd1' }, timestamp: 1, requestId: 'r3' }]
      })
      await updateDeptApi('d1', { displayName: '新名', status: 'disabled' })
    })

    it('DELETE 409 返回后端文案', async () => {
      mock.onDelete('/guide/depts/d1').reply(409, {
        code: 409,
        message: '部门编码 "SCJGJ" 已存在',
        data: null,
        timestamp: 1,
        requestId: 'r4',
      })
      await expect(deleteDeptApi('d1')).rejects.toMatchObject({
        message: '部门编码 "SCJGJ" 已存在',
        code: 409,
      })
    })
  })

  describe('主题映射', () => {
    it('GET /guide/themes', async () => {
      mock.onGet('/guide/themes').reply(200, {
        code: 0,
        message: '成功',
        data: { list: [], total: 0, page: 1, pageSize: 20 },
        timestamp: 1,
        requestId: 't1',
      })
      await fetchThemesApi({ page: 1, pageSize: 20 })
      expect(mock.history.get[0].url).toBe('/guide/themes')
    })

    it('POST /guide/themes 提交 platformParamJson 文本', async () => {
      mock.onPost('/guide/themes').reply((config) => {
        const body = JSON.parse(config.data as string)
        expect(body.platformParamJson).toBe('{"k":"v"}')
        return [200, { code: 0, message: '成功', data: { id: 't1' }, timestamp: 1, requestId: 't2' }]
      })
      await createThemeApi({
        themeCode: 'KBQY',
        themeName: '开办企业',
        platformParamJson: '{"k":"v"}',
      })
    })

    it('PUT /guide/themes/:id 不含 themeCode', async () => {
      mock.onPut('/guide/themes/t1').reply((config) => {
        const body = JSON.parse(config.data as string)
        expect(body.themeName).toBe('新主题')
        expect(body).not.toHaveProperty('themeCode')
        return [200, { code: 0, message: '成功', data: { id: 't1' }, timestamp: 1, requestId: 't3' }]
      })
      await updateThemeApi('t1', { themeName: '新主题' })
    })
  })

  describe('事项展示配置', () => {
    it('GET /guide/item-configs 传递筛选参数', async () => {
      mock.onGet('/guide/item-configs').reply((config) => {
        expect(config.params).toMatchObject({
          page: 1,
          pageSize: 10,
          deptCode: 'SCJGJ',
          themeCode: 'KBQY',
          isHot: 1,
          isRecommend: 0,
          isVisible: 1,
        })
        return [200, {
          code: 0,
          message: '成功',
          data: { list: [], total: 0, page: 1, pageSize: 10 },
          timestamp: 1,
          requestId: 'i1',
        }]
      })
      await fetchItemConfigsApi({
        page: 1,
        pageSize: 10,
        deptCode: 'SCJGJ',
        themeCode: 'KBQY',
        isHot: 1,
        isRecommend: 0,
        isVisible: 1,
      })
    })

    it('POST /guide/item-configs 以 string[] 提交关联 ID', async () => {
      mock.onPost('/guide/item-configs').reply((config) => {
        const body = JSON.parse(config.data as string)
        expect(body.relatedPolicyIds).toEqual([POLICY_ID_A])
        expect(body.relatedFaqIds).toEqual([])
        expect(Array.isArray(body.relatedPolicyIds)).toBe(true)
        return [200, { code: 0, message: '成功', data: { id: 'i1' }, timestamp: 1, requestId: 'i2' }]
      })
      await createItemConfigApi({
        platformItemId: 'PLAT-001',
        itemName: '事项',
        displayName: '展示',
        relatedPolicyIds: [POLICY_ID_A],
        relatedFaqIds: [],
      })
    })

    it('PUT /guide/item-configs/:id 未修改关联 ID 时不包含相关字段', async () => {
      mock.onPut('/guide/item-configs/i1').reply((config) => {
        const body = JSON.parse(config.data as string)
        expect(body).toEqual({ displayName: '新展示名' })
        expect(body).not.toHaveProperty('relatedPolicyIds')
        expect(body).not.toHaveProperty('relatedFaqIds')
        return [200, { code: 0, message: '成功', data: { id: 'i1' }, timestamp: 1, requestId: 'i3' }]
      })
      await updateItemConfigApi('i1', { displayName: '新展示名' })
    })

    it('DELETE 404 返回后端文案', async () => {
      mock.onDelete('/guide/item-configs/missing').reply(404, {
        code: 404,
        message: '事项展示配置不存在',
        data: null,
        timestamp: 1,
        requestId: 'i4',
      })
      await expect(deleteItemConfigApi('missing')).rejects.toMatchObject({
        message: '事项展示配置不存在',
        code: 404,
      })
    })
  })
})
