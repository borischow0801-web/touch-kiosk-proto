import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { HomeConfigPublishService } from '../src/home-config/home-config-publish.service';
import { HomeConfig } from '../src/database/entities/home-config.entity';
import { HomeConfigVersion } from '../src/database/entities/home-config-version.entity';
import { HomeModule } from '../src/database/entities/home-module.entity';
import { PublishRecord } from '../src/database/entities/publish-record.entity';

const SA_USER_ID = 'user-super-001';
const CONFIG_ID = 'home-config-001';
const VERSION_ID = 'version-001';
const VERSION_ID_2 = 'version-002';
const PUBLISHED_VERSION_ID = 'version-pub-001';
const MODULE_ID = 'module-001';

function makeConfig(overrides: Partial<HomeConfig> = {}): HomeConfig {
  return {
    id: CONFIG_ID,
    configName: 'default',
    status: 'draft',
    currentVersionId: null,
    createdBy: SA_USER_ID,
    updatedBy: SA_USER_ID,
    createdAt: new Date('2024-06-01'),
    updatedAt: new Date('2024-06-01'),
    deletedAt: null,
    ...overrides,
  } as HomeConfig;
}

function makeVersion(overrides: Partial<HomeConfigVersion> = {}): HomeConfigVersion {
  return {
    id: VERSION_ID,
    homeConfigId: CONFIG_ID,
    versionNo: 1,
    title: '首页标题',
    subtitle: '副标题',
    topBannerJson: null,
    themeJson: null,
    status: 'draft',
    changeRemark: null,
    createdBy: SA_USER_ID,
    createdAt: new Date('2024-06-01'),
    ...overrides,
  } as HomeConfigVersion;
}

function makeModule(overrides: Partial<HomeModule> = {}): HomeModule {
  return {
    id: MODULE_ID,
    homeConfigVersionId: PUBLISHED_VERSION_ID,
    moduleCode: 'guide_dept',
    moduleName: '按部门查',
    moduleType: 'card',
    icon: null,
    color: null,
    layoutType: null,
    isVisible: 1,
    sortOrder: 1,
    targetType: 'route',
    targetValue: '/guide/depts',
    createdAt: new Date('2024-06-01'),
    updatedAt: new Date('2024-06-01'),
    deletedAt: null,
    ...overrides,
  } as HomeModule;
}

function createMockTxManager() {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    save: jest.fn().mockImplementation(async (_entity: unknown, obj: unknown) => obj),
    lockConfig: null as HomeConfig | null,
    pendingCount: 0,
    drafts: [] as HomeConfigVersion[],
    pendingVersions: [] as HomeConfigVersion[],
    allVersions: [] as HomeConfigVersion[],
    modules: [] as HomeModule[],
  };
}

function setupDefaultMocks(mockTx: ReturnType<typeof createMockTxManager>): void {
  mockTx.count.mockImplementation(async (entity: unknown, opts?: { where?: { status?: string } }) => {
    if ((entity as { name: string }).name !== 'HomeConfigVersion') return 0;
    if (opts?.where?.status === 'pending') return mockTx.pendingCount;
    return 0;
  });

  mockTx.find.mockImplementation(async (
    entity: unknown,
    opts?: {
      where?: { status?: string; homeConfigId?: string; homeConfigVersionId?: string };
      take?: number;
      order?: Record<string, string>;
    },
  ) => {
    const name = (entity as { name: string }).name;
    if (name === 'HomeConfigVersion') {
      let rows = mockTx.allVersions.length > 0
        ? mockTx.allVersions
        : [...mockTx.drafts, ...mockTx.pendingVersions];
      if (opts?.where?.status === 'draft') rows = mockTx.drafts;
      else if (opts?.where?.status === 'pending') rows = mockTx.pendingVersions;
      const sorted = [...rows].sort((a, b) => b.versionNo - a.versionNo);
      return opts?.take ? sorted.slice(0, opts.take) : sorted;
    }
    if (name === 'HomeModule') {
      const versionId = opts?.where?.homeConfigVersionId;
      return mockTx.modules.filter((m) => !versionId || m.homeConfigVersionId === versionId);
    }
    return [];
  });

  mockTx.findOne.mockImplementation(async (
    entity: unknown,
    opts?: { where?: { id?: string; homeConfigId?: string; currentVersionId?: string } },
  ) => {
    const name = (entity as { name: string }).name;
    if (name === 'HomeConfig' && opts?.where?.id === CONFIG_ID) {
      return mockTx.lockConfig;
    }
    if (name === 'HomeConfigVersion' && opts?.where?.id) {
      const all = mockTx.allVersions.length > 0
        ? mockTx.allVersions
        : [...mockTx.drafts, ...mockTx.pendingVersions];
      return all.find((v) => v.id === opts.where!.id) ?? null;
    }
    return null;
  });
}

describe('HomeConfigPublishService — unit', () => {
  let service: HomeConfigPublishService;
  const mockConfigRepo = { findOne: jest.fn() };
  const mockVersionRepo = { find: jest.fn(), findOne: jest.fn() };
  const mockRecordRepo = { find: jest.fn() };
  const mockDataSource = { transaction: jest.fn() };
  let mockTx: ReturnType<typeof createMockTxManager>;

  beforeEach(async () => {
    jest.resetAllMocks();
    mockTx = createMockTxManager();
    mockDataSource.transaction.mockImplementation(
      (cb: (manager: EntityManager) => Promise<unknown>) => {
        const manager = {
          findOne: mockTx.findOne,
          find: mockTx.find,
          count: mockTx.count,
          create: mockTx.create,
          save: mockTx.save,
        };
        return cb(manager as unknown as EntityManager);
      },
    );
    setupDefaultMocks(mockTx);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HomeConfigPublishService,
        { provide: getRepositoryToken(HomeConfig), useValue: mockConfigRepo },
        { provide: getRepositoryToken(HomeConfigVersion), useValue: mockVersionRepo },
        { provide: getRepositoryToken(PublishRecord), useValue: mockRecordRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();
    service = module.get(HomeConfigPublishService);

    mockTx.create.mockImplementation((entity: unknown, data: Record<string, unknown>) => data);
  });

  it('submit: 首次无发布版本 draft → pending，主表 pending', async () => {
    mockTx.lockConfig = makeConfig({ status: 'draft', currentVersionId: null });
    mockTx.pendingCount = 0;
    mockTx.drafts = [makeVersion({ status: 'draft' })];

    const result = await service.submit(CONFIG_ID, SA_USER_ID);

    expect(result.versionStatus).toBe('pending');
    expect(result.itemStatus).toBe('pending');
    expect(mockTx.create).toHaveBeenCalledWith(
      PublishRecord,
      expect.objectContaining({
        bizType: 'home_config',
        action: 'submit',
        fromStatus: 'draft',
        toStatus: 'pending',
      }),
    );
  });

  it('submit: 已有 currentVersionId 时主表保持 published', async () => {
    mockTx.lockConfig = makeConfig({
      status: 'published',
      currentVersionId: PUBLISHED_VERSION_ID,
    });
    mockTx.pendingCount = 0;
    mockTx.drafts = [makeVersion({ id: VERSION_ID_2, versionNo: 2, status: 'draft' })];

    const result = await service.submit(CONFIG_ID, SA_USER_ID);

    expect(result.versionStatus).toBe('pending');
    expect(result.itemStatus).toBe('published');
    expect(result.currentVersionId).toBe(PUBLISHED_VERSION_ID);
  });

  it('submit: withdrawn 主表保持 withdrawn', async () => {
    mockTx.lockConfig = makeConfig({ status: 'withdrawn', currentVersionId: null });
    mockTx.pendingCount = 0;
    mockTx.drafts = [makeVersion({ status: 'draft' })];

    const result = await service.submit(CONFIG_ID, SA_USER_ID);

    expect(result.itemStatus).toBe('withdrawn');
  });

  it('approve: pending → published 并更新 currentVersionId', async () => {
    mockTx.lockConfig = makeConfig({ status: 'pending', currentVersionId: null });
    mockTx.pendingVersions = [makeVersion({ status: 'pending' })];

    const result = await service.approve(CONFIG_ID, SA_USER_ID);

    expect(result.versionStatus).toBe('published');
    expect(result.itemStatus).toBe('published');
    expect(result.currentVersionId).toBe(VERSION_ID);
    expect(mockTx.create).toHaveBeenCalledWith(
      PublishRecord,
      expect.objectContaining({ action: 'approve', bizType: 'home_config' }),
    );
  });

  it('reject: 无 currentVersionId 时主表 rejected', async () => {
    mockTx.lockConfig = makeConfig({ status: 'pending', currentVersionId: null });
    mockTx.pendingVersions = [makeVersion({ status: 'pending' })];

    const result = await service.reject(CONFIG_ID, SA_USER_ID);

    expect(result.versionStatus).toBe('rejected');
    expect(result.itemStatus).toBe('rejected');
  });

  it('reject: 已有 currentVersionId 时主表保持 published', async () => {
    mockTx.lockConfig = makeConfig({
      status: 'published',
      currentVersionId: PUBLISHED_VERSION_ID,
    });
    mockTx.pendingVersions = [
      makeVersion({ id: VERSION_ID_2, versionNo: 2, status: 'pending' }),
    ];

    const result = await service.reject(CONFIG_ID, SA_USER_ID);

    expect(result.itemStatus).toBe('published');
    expect(result.currentVersionId).toBe(PUBLISHED_VERSION_ID);
  });

  it('directPublish: draft → published 并更新 currentVersionId', async () => {
    mockTx.lockConfig = makeConfig({ status: 'draft', currentVersionId: null });
    mockTx.pendingCount = 0;
    mockTx.drafts = [makeVersion({ status: 'draft' })];

    const result = await service.directPublish(CONFIG_ID, SA_USER_ID);

    expect(result.versionStatus).toBe('published');
    expect(result.currentVersionId).toBe(VERSION_ID);
    expect(mockTx.create).toHaveBeenCalledWith(
      PublishRecord,
      expect.objectContaining({ action: 'direct_publish', bizType: 'home_config' }),
    );
  });

  it('directPublish: 存在 pending 返回 409', async () => {
    mockTx.lockConfig = makeConfig({ status: 'published', currentVersionId: PUBLISHED_VERSION_ID });
    mockTx.pendingCount = 1;
    mockTx.pendingVersions = [makeVersion({ id: VERSION_ID_2, versionNo: 2, status: 'pending' })];
    mockTx.drafts = [makeVersion({ id: VERSION_ID, versionNo: 3, status: 'draft' })];

    await expect(service.directPublish(CONFIG_ID, SA_USER_ID)).rejects.toThrow(
      '已存在待审核版本，无法提交或直接发布',
    );
  });

  it('withdraw: published → withdrawn 并清空 currentVersionId', async () => {
    mockTx.lockConfig = makeConfig({
      status: 'published',
      currentVersionId: PUBLISHED_VERSION_ID,
    });
    mockTx.findOne.mockImplementation(async (entity: unknown, opts?: { where?: { id?: string } }) => {
      if ((entity as { name: string }).name === 'HomeConfig') return mockTx.lockConfig;
      if (opts?.where?.id === PUBLISHED_VERSION_ID) {
        return makeVersion({ id: PUBLISHED_VERSION_ID, status: 'published' });
      }
      return null;
    });

    const result = await service.withdraw(CONFIG_ID, SA_USER_ID);

    expect(result.itemStatus).toBe('withdrawn');
    expect(result.versionStatus).toBe('withdrawn');
    expect(result.currentVersionId).toBeNull();
    expect(mockTx.create).toHaveBeenCalledWith(
      PublishRecord,
      expect.objectContaining({ action: 'withdraw', bizType: 'home_config' }),
    );
  });

  it('rollback: 复制历史版本和模块为新 draft，不改变 currentVersionId', async () => {
    mockTx.lockConfig = makeConfig({
      status: 'published',
      currentVersionId: PUBLISHED_VERSION_ID,
    });
    mockTx.drafts = [];
    mockTx.pendingVersions = [];
    mockTx.allVersions = [
      makeVersion({ id: PUBLISHED_VERSION_ID, versionNo: 1, status: 'published' }),
    ];
    mockTx.modules = [makeModule({ homeConfigVersionId: PUBLISHED_VERSION_ID })];
    mockTx.findOne.mockImplementation(async (entity: unknown, opts?: { where?: { id?: string } }) => {
      if ((entity as { name: string }).name === 'HomeConfig') return mockTx.lockConfig;
      if (opts?.where?.id === PUBLISHED_VERSION_ID) {
        return makeVersion({ id: PUBLISHED_VERSION_ID, versionNo: 1, status: 'published' });
      }
      return null;
    });
    mockTx.create.mockImplementation((entity: unknown, data: Record<string, unknown>) => {
      if (entity === HomeConfigVersion) return { id: VERSION_ID_2, ...data };
      if (entity === HomeModule) return { id: 'module-copy-001', ...data };
      return data;
    });

    const result = await service.rollback(CONFIG_ID, SA_USER_ID, PUBLISHED_VERSION_ID);

    expect(result.versionStatus).toBe('draft');
    expect(result.versionNo).toBe(2);
    expect(result.currentVersionId).toBe(PUBLISHED_VERSION_ID);
    expect(result.itemStatus).toBe('published');
    expect(mockTx.create).toHaveBeenCalledWith(
      HomeModule,
      expect.objectContaining({ moduleCode: 'guide_dept', homeConfigVersionId: VERSION_ID_2 }),
    );
    expect(mockTx.create).toHaveBeenCalledWith(
      PublishRecord,
      expect.objectContaining({ action: 'rollback', bizType: 'home_config' }),
    );
  });

  it('rollback: 已有 draft 返回 409', async () => {
    mockTx.lockConfig = makeConfig({ status: 'published', currentVersionId: PUBLISHED_VERSION_ID });
    mockTx.drafts = [makeVersion({ status: 'draft' })];
    mockTx.pendingCount = 0;

    await expect(service.rollback(CONFIG_ID, SA_USER_ID, PUBLISHED_VERSION_ID)).rejects.toThrow(
      '已存在 draft 版本，无法回滚',
    );
  });

  it('rollback: 已有 pending 返回 409', async () => {
    mockTx.lockConfig = makeConfig({ status: 'published', currentVersionId: PUBLISHED_VERSION_ID });
    mockTx.drafts = [];
    mockTx.pendingCount = 1;
    mockTx.pendingVersions = [makeVersion({ status: 'pending' })];

    await expect(service.rollback(CONFIG_ID, SA_USER_ID, PUBLISHED_VERSION_ID)).rejects.toThrow(
      '已存在待审核版本，无法提交或直接发布',
    );
  });

  it('approve 时历史 published 版本不被自动改为 withdrawn', async () => {
    const oldPublished = makeVersion({
      id: PUBLISHED_VERSION_ID,
      versionNo: 1,
      status: 'published',
    });
    mockTx.lockConfig = makeConfig({
      status: 'published',
      currentVersionId: PUBLISHED_VERSION_ID,
    });
    mockTx.pendingVersions = [
      makeVersion({ id: VERSION_ID_2, versionNo: 2, status: 'pending' }),
    ];
    mockTx.allVersions = [oldPublished, ...mockTx.pendingVersions];

    await service.approve(CONFIG_ID, SA_USER_ID);

    const saveCalls = mockTx.save.mock.calls;
    const versionSaves = saveCalls.filter(([entity]) => entity === HomeConfigVersion);
    const oldVersionSave = versionSaves.find(([, obj]) => (obj as HomeConfigVersion).id === PUBLISHED_VERSION_ID);
    expect(oldVersionSave).toBeUndefined();
  });

  it('每个发布操作写 publish_record', async () => {
    mockTx.lockConfig = makeConfig({ status: 'draft', currentVersionId: null });
    mockTx.pendingCount = 0;
    mockTx.drafts = [makeVersion({ status: 'draft' })];

    await service.submit(CONFIG_ID, SA_USER_ID);

    expect(mockTx.create).toHaveBeenCalledWith(
      PublishRecord,
      expect.objectContaining({
        bizType: 'home_config',
        bizId: CONFIG_ID,
        versionId: VERSION_ID,
        operatorId: SA_USER_ID,
      }),
    );
  });

  it('配置不存在返回 404', async () => {
    mockTx.lockConfig = null;
    await expect(service.submit('missing', SA_USER_ID)).rejects.toThrow('首页配置不存在');
  });
});
