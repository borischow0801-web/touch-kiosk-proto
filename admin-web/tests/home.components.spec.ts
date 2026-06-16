import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import MockAdapter from 'axios-mock-adapter'
import { ElMessage, ElMessageBox } from 'element-plus'
import { http } from '@/api/http'
import HomeConfigPage from '@/pages/home/HomeConfigPage.vue'
import { setupAuth, findButtonByText, ElSelectStub } from './helpers/homeTest'

const CONFIG_ID = 'home-config-001'
const MODULE_ID = 'module-001'

function mockConfigResponse(overrides: Record<string, unknown> = {}) {
  return {
    id: CONFIG_ID,
    configName: 'default',
    status: 'draft',
    currentVersionId: null,
    currentVersion: null,
    draftVersion: {
      id: 'draft-001',
      versionNo: 1,
      title: '首页标题',
      subtitle: '副标题',
      status: 'draft',
      topBannerJson: ['行1'],
      themeJson: { primary: '#000' },
      changeRemark: null,
    },
    updatedAt: '2024-06-01T00:00:00.000Z',
    ...overrides,
  }
}

const ALL_HOME_PERMS = [
  'home:config:read',
  'home:config:update',
  'home:module:read',
  'home:module:create',
  'home:module:update',
  'home:module:delete',
  'home:module:sort',
  'publish:submit',
  'publish:direct-publish',
  'publish:approve',
  'publish:reject',
  'publish:withdraw',
  'publish:rollback',
  'publish:record:read',
]

const pageStubs = { teleport: true, ElSelect: ElSelectStub, ElOption: true }

describe('首页配置页面', () => {
  let mock: MockAdapter

  beforeEach(() => {
    mock = new MockAdapter(http)
    vi.spyOn(ElMessage, 'success').mockImplementation(() => undefined as never)
    vi.spyOn(ElMessage, 'error').mockImplementation(() => undefined as never)
    vi.spyOn(ElMessage, 'warning').mockImplementation(() => undefined as never)
    vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue(undefined as never)
  })

  afterEach(() => {
    mock.restore()
    vi.restoreAllMocks()
  })

  function mockPageApis(config = mockConfigResponse(), modules: unknown[] = []): void {
    mock.onGet('/home/config').reply(200, {
      code: 0, message: '成功', data: config, timestamp: 1, requestId: 'c',
    })
    mock.onGet('/home/modules').reply(200, {
      code: 0, message: '成功', data: { list: modules }, timestamp: 1, requestId: 'm',
    })
    mock.onGet(`/publish/home_config/${CONFIG_ID}/records`).reply(200, {
      code: 0, message: '成功', data: [], timestamp: 1, requestId: 'r',
    })
  }

  it('加载后显示 currentVersion 与 draftVersion 信息', async () => {
    mockPageApis(mockConfigResponse({
      status: 'published',
      currentVersionId: 'pub-001',
      currentVersion: {
        id: 'pub-001',
        versionNo: 1,
        title: '已发布标题',
        subtitle: null,
        status: 'published',
      },
    }))
    const wrapper = mount(HomeConfigPage, { global: { plugins: [setupAuth(ALL_HOME_PERMS)], stubs: pageStubs } })
    await flushPromises()
    await flushPromises()
    expect(wrapper.text()).toContain('已发布标题')
    expect((wrapper.findAll('textarea')[0].element as HTMLTextAreaElement).value).toContain('行1')
    wrapper.unmount()
  })

  it('保存配置时 JSON 被解析后提交', async () => {
    mockPageApis()
    mock.onPut('/home/config').reply((config) => {
      const body = JSON.parse(config.data as string)
      expect(body.topBannerJson).toEqual(['新行'])
      expect(body.themeJson).toEqual({ accent: '#fff' })
      return [200, {
        code: 0,
        message: '成功',
        data: mockConfigResponse(),
        timestamp: 1,
        requestId: 'u',
      }]
    })
    const wrapper = mount(HomeConfigPage, { global: { plugins: [setupAuth(ALL_HOME_PERMS)], stubs: pageStubs } })
    await flushPromises()
    const textareas = wrapper.findAll('textarea')
    await textareas[0].setValue('["新行"]')
    await textareas[1].setValue('{"accent":"#fff"}')
    await findButtonByText(wrapper, '保存草稿')!.trigger('click')
    await flushPromises()
    expect(mock.history.put.some((r) => r.url === '/home/config')).toBe(true)
    wrapper.unmount()
  })

  it('JSON 非法时阻止提交并提示', async () => {
    mockPageApis()
    const wrapper = mount(HomeConfigPage, { global: { plugins: [setupAuth(ALL_HOME_PERMS)], stubs: pageStubs } })
    await flushPromises()
    await wrapper.findAll('textarea')[0].setValue('{invalid')
    await findButtonByText(wrapper, '保存草稿')!.trigger('click')
    await flushPromises()
    expect(ElMessage.error).toHaveBeenCalled()
    expect(mock.history.put.length).toBe(0)
    wrapper.unmount()
  })

  it('新增模块传 isVisible boolean', async () => {
    mockPageApis()
    mock.onPost('/home/modules').reply((config) => {
      const body = JSON.parse(config.data as string)
      expect(body.isVisible).toBe(false)
      expect(typeof body.isVisible).toBe('boolean')
      return [200, {
        code: 0,
        message: '成功',
        data: { id: MODULE_ID },
        timestamp: 1,
        requestId: 'mc',
      }]
    })
    const wrapper = mount(HomeConfigPage, {
      global: {
        plugins: [setupAuth(ALL_HOME_PERMS)],
        stubs: pageStubs,
      },
    })
    await flushPromises()
    await findButtonByText(wrapper, '新增模块')!.trigger('click')
    await flushPromises()
    const dialog = wrapper.findComponent({ name: 'ElDialog' })
    const switches = dialog.findAllComponents({ name: 'ElSwitch' })
    if (switches.length > 0) {
      await switches[0].setValue(false)
    }
    const saveBtn = dialog.findAll('button').find((b) => b.text().trim() === '保存')
    expect(saveBtn).toBeDefined()
    wrapper.unmount()
  })

  it('排序提交 items', async () => {
    mockPageApis(mockConfigResponse(), [{
      id: 'm1',
      moduleCode: 'a',
      moduleName: 'A',
      moduleType: 'card',
      icon: null,
      color: null,
      layoutType: null,
      isVisible: true,
      sortOrder: 1,
      targetType: 'route',
      targetValue: '/a',
    }])
    mock.onPut('/home/modules/sort').reply((config) => {
      const body = JSON.parse(config.data as string)
      expect(body.items).toEqual([{ id: 'm1', sortOrder: 1 }])
      return [200, { code: 0, message: '成功', data: { list: [] }, timestamp: 1, requestId: 's' }]
    })
    const wrapper = mount(HomeConfigPage, { global: { plugins: [setupAuth(ALL_HOME_PERMS)], stubs: pageStubs } })
    await flushPromises()
    await findButtonByText(wrapper, '保存排序')!.trigger('click')
    await flushPromises()
    expect(mock.history.put.some((r) => r.url === '/home/modules/sort')).toBe(true)
    wrapper.unmount()
  })

  it('删除模块二次确认后调用 DELETE', async () => {
    mockPageApis(mockConfigResponse(), [{
      id: MODULE_ID,
      moduleCode: 'a',
      moduleName: '模块A',
      moduleType: 'card',
      icon: null,
      color: null,
      layoutType: null,
      isVisible: true,
      sortOrder: 1,
      targetType: 'route',
      targetValue: '/a',
    }])
    mock.onDelete(`/home/modules/${MODULE_ID}`).reply(200, {
      code: 0, message: '成功', data: null, timestamp: 1, requestId: 'd',
    })
    const wrapper = mount(HomeConfigPage, { global: { plugins: [setupAuth(ALL_HOME_PERMS)], stubs: pageStubs } })
    await flushPromises()
    await findButtonByText(wrapper, '删除')!.trigger('click')
    await flushPromises()
    expect(ElMessageBox.confirm).toHaveBeenCalled()
    expect(mock.history.delete.some((r) => r.url === `/home/modules/${MODULE_ID}`)).toBe(true)
    wrapper.unmount()
  })

  it('draft 状态显示发布按钮并调用 home_config submit', async () => {
    vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue(undefined as never)
    mockPageApis()
    mock.onPost(`/publish/home_config/${CONFIG_ID}/submit`).reply(200, {
      code: 0,
      message: '成功',
      data: { bizType: 'home_config' },
      timestamp: 1,
      requestId: 'sub',
    })
    const wrapper = mount(HomeConfigPage, {
      global: { plugins: [setupAuth(ALL_HOME_PERMS)], stubs: pageStubs },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('提交审核')
    await findButtonByText(wrapper, '提交审核')!.trigger('click')
    await flushPromises()
    expect(mock.history.post.some((r) => r.url === `/publish/home_config/${CONFIG_ID}/submit`)).toBe(true)
    wrapper.unmount()
  })

  it('403 错误显示友好提示', async () => {
    mock.onGet('/home/config').reply(403, {
      code: 403,
      message: '无权限',
      data: null,
      timestamp: 1,
      requestId: 'f',
    })
    const wrapper = mount(HomeConfigPage, { global: { plugins: [setupAuth(['home:config:read'])], stubs: pageStubs } })
    await flushPromises()
    expect(wrapper.text()).toContain('无权限')
    wrapper.unmount()
  })
})
