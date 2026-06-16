import 'reflect-metadata';
import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { HomeConfig } from '../src/database/entities/home-config.entity';
import { HomeConfigVersion } from '../src/database/entities/home-config-version.entity';
import { HomeModule } from '../src/database/entities/home-module.entity';
import { HomeConfigService } from '../src/home-config/home-config.service';

const USER_ID = 'user-001';
const CONFIG_ID = 'config-001';
const DRAFT_ID = 'version-draft-001';
const PUBLISHED_ID = 'version-published-001';
const PENDING_ID = 'version-pending-001';
const MODULE_ID = 'module-001';
const MODULE_ID_2 = 'module-002';
const WITHDRAWN_EMPTY_ID = 'version-withdrawn-empty-002';
const PUBLISHED_WITH_MODULES_ID = 'version-published-with-modules-001';
const CURRENT_EMPTY_ID = 'version-current-empty';
const OLDER_WITH_MODULES_ID = 'version-older-with-modules';

function makeConfig(overrides: Partial<HomeConfig> = {}): HomeConfig {
  return {
    id: CONFIG_ID,
    configName: 'default',
    status: 'draft',
    currentVersionId: null,
    createdBy: USER_ID,
    updatedBy: USER_ID,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
    ...overrides,
  } as HomeConfig;
}

function makeVersion(overrides: Partial<HomeConfigVersion> = {}): HomeConfigVersion {
  return {
    id: DRAFT_ID,
    homeConfigId: CONFIG_ID,
    versionNo: 1,
    title: '首页标题',
    subtitle: '副标题',
    topBannerJson: '["line1"]',
    themeJson: '{"primary":"#fff"}',
    status: 'draft',
    changeRemark: null,
    createdBy: USER_ID,
    createdAt: new Date('2024-01-01'),
    ...overrides,
  } as HomeConfigVersion;
}

function makeModule(overrides: Partial<HomeModule> = {}): HomeModule {
  return {
    id: MODULE_ID,
    homeConfigVersionId: DRAFT_ID,
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
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    deletedAt: null,
    ...overrides,
  } as HomeModule;
}

class InMemoryStore {
  config: HomeConfig | null = null;
  versions = new Map<string, HomeConfigVersion>();
  modules = new Map<string, HomeModule>();

  reset(): void {
    this.config = null;
    this.versions.clear();
    this.modules.clear();
  }
}

function entityName(entity: unknown): string {
  return typeof entity === 'function' ? entity.name : (entity as { name: string }).name;
}

function createTxManager(store: InMemoryStore, idSeq = { n: 0 }) {
  const nextId = (prefix: string) => `${prefix}-${++idSeq.n}`;

  return {
    findOne: jest.fn(async (entity: unknown, options?: { where?: Record<string, unknown> }) => {
      const where = options?.where ?? {};
      const name = entityName(entity);
      if (name === 'HomeConfig') {
        if (store.config && (!where['configName'] || store.config.configName === where['configName'])) {
          if (where['id'] && store.config.id !== where['id']) return null;
          return store.config;
        }
        return null;
      }
      if (name === 'HomeConfigVersion' && where['id']) {
        return store.versions.get(where['id'] as string) ?? null;
      }
      if (name === 'HomeConfigVersion') {
        for (const v of store.versions.values()) {
          if (where['homeConfigId'] && v.homeConfigId !== where['homeConfigId']) continue;
          if (where['status'] && v.status !== where['status']) continue;
          return v;
        }
        return null;
      }
      if (name === 'HomeModule' && where['id']) {
        const mod = store.modules.get(where['id'] as string);
        return mod?.deletedAt ? null : mod ?? null;
      }
      return null;
    }),
    find: jest.fn(async (entity: unknown, options?: { where?: Record<string, unknown>; order?: unknown; take?: number }) => {
      const where = options?.where ?? {};
      const name = entityName(entity);
      if (name === 'HomeConfigVersion') {
        let rows = [...store.versions.values()].filter((v) => {
          if (where['homeConfigId'] && v.homeConfigId !== where['homeConfigId']) return false;
          if (where['status'] && v.status !== where['status']) return false;
          return true;
        });
        rows.sort((a, b) => b.versionNo - a.versionNo);
        if (options?.take) rows = rows.slice(0, options.take);
        return rows;
      }
      if (name === 'HomeModule') {
        const rows = [...store.modules.values()].filter((m) => {
          if (m.deletedAt) return false;
          if (where['homeConfigVersionId'] && m.homeConfigVersionId !== where['homeConfigVersionId']) {
            return false;
          }
          return true;
        });
        rows.sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.getTime() - b.createdAt.getTime());
        return rows;
      }
      return [];
    }),
    create: jest.fn((entity: unknown, data: Record<string, unknown>) => {
      const name = entityName(entity);
      if (name === 'HomeConfig') return { id: CONFIG_ID, ...data };
      if (name === 'HomeConfigVersion') return { id: nextId('version'), ...data };
      if (name === 'HomeModule') return { id: nextId('module'), ...data };
      return data;
    }),
    save: jest.fn(async (entity: unknown, row: Record<string, unknown> | Record<string, unknown>[]) => {
      const name = entityName(entity);
      const rows = Array.isArray(row) ? row : [row];
      const saved: unknown[] = [];
      for (const item of rows) {
        if (name === 'HomeConfig') {
          store.config = item as unknown as HomeConfig;
          saved.push(store.config);
        } else if (name === 'HomeConfigVersion') {
          const version = item as unknown as HomeConfigVersion;
          store.versions.set(version.id, version);
          saved.push(version);
        } else if (name === 'HomeModule') {
          const mod = item as unknown as HomeModule;
          store.modules.set(mod.id, mod);
          saved.push(mod);
        } else {
          saved.push(item);
        }
      }
      return Array.isArray(row) ? saved : saved[0];
    }),
    softDelete: jest.fn(async (entity: unknown, id: string) => {
      if (entityName(entity) === 'HomeModule') {
        const mod = store.modules.get(id);
        if (mod) mod.deletedAt = new Date();
      }
    }),
    count: jest.fn(async (entity: unknown, options?: { where?: Record<string, unknown> }) => {
      const where = options?.where ?? {};
      if (entityName(entity) === 'HomeModule') {
        return [...store.modules.values()].filter((m) => {
          if (m.deletedAt) return false;
          if (where['homeConfigVersionId'] && m.homeConfigVersionId !== where['homeConfigVersionId']) {
            return false;
          }
          return true;
        }).length;
      }
      return 0;
    }),
  };
}

describe('HomeConfigService — unit', () => {
  let service: HomeConfigService;
  const store = new InMemoryStore();
  let txManager: ReturnType<typeof createTxManager>;
  const mockConfigRepo = { findOne: jest.fn() };
  const mockVersionRepo = { find: jest.fn(), findOne: jest.fn() };
  const mockModuleRepo = { find: jest.fn() };
  const mockDataSource = { transaction: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    store.reset();
    txManager = createTxManager(store);

    mockConfigRepo.findOne.mockImplementation(async () => store.config);
    mockVersionRepo.find.mockImplementation(async (opts) => {
      const homeConfigId = opts?.where?.homeConfigId;
      const status = opts?.where?.status;
      let rows = [...store.versions.values()].filter((v) => {
        if (homeConfigId && v.homeConfigId !== homeConfigId) return false;
        if (status && v.status !== status) return false;
        return true;
      });
      rows.sort((a, b) => b.versionNo - a.versionNo);
      if (opts?.take) rows = rows.slice(0, opts.take);
      return rows;
    });
    mockModuleRepo.find.mockImplementation(async (opts) => {
      const versionId = opts?.where?.homeConfigVersionId;
      const rows = [...store.modules.values()].filter(
        (m) => !m.deletedAt && (!versionId || m.homeConfigVersionId === versionId),
      );
      rows.sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.getTime() - b.createdAt.getTime());
      return rows;
    });
    mockDataSource.transaction.mockImplementation(
      (cb: (manager: EntityManager) => Promise<unknown>) => cb(txManager as unknown as EntityManager),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HomeConfigService,
        { provide: getRepositoryToken(HomeConfig), useValue: mockConfigRepo },
        { provide: getRepositoryToken(HomeConfigVersion), useValue: mockVersionRepo },
        { provide: getRepositoryToken(HomeModule), useValue: mockModuleRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();
    service = module.get(HomeConfigService);
  });

  describe('getAdminConfig()', () => {
    it('无主表时返回可识别空状态，不自动创建', async () => {
      mockConfigRepo.findOne.mockResolvedValueOnce(null);
      const result = await service.getAdminConfig();
      expect(result.id).toBeNull();
      expect(result.configName).toBe('default');
      expect(result.draftVersion).toBeNull();
      expect(result).not.toHaveProperty('createdBy');
    });
  });

  describe('updateAdminConfig()', () => {
    const dto = {
      title: '新标题',
      subtitle: '新副标题',
      topBannerJson: ['a'],
      themeJson: { color: '#000' },
      changeRemark: '备注',
    };

    it('首次 PUT 创建主表和 versionNo=1 draft', async () => {
      mockConfigRepo.findOne.mockResolvedValue(null);
      const result = await service.updateAdminConfig(dto, USER_ID);
      expect(store.config?.status).toBe('draft');
      expect(store.config?.configName).toBe('default');
      expect(store.versions.size).toBe(1);
      const draft = [...store.versions.values()][0];
      expect(draft.versionNo).toBe(1);
      expect(draft.status).toBe('draft');
      expect(draft.title).toBe('新标题');
      expect(result.draftVersion?.title).toBe('新标题');
      expect(result).not.toHaveProperty('createdBy');
    });

    it('已有 draft 时 PUT 只更新 draft', async () => {
      store.config = makeConfig();
      store.versions.set(DRAFT_ID, makeVersion());
      const result = await service.updateAdminConfig({ ...dto, title: '更新后' }, USER_ID);
      expect(store.versions.size).toBe(1);
      expect(store.versions.get(DRAFT_ID)?.title).toBe('更新后');
      expect(result.draftVersion?.title).toBe('更新后');
    });

    it('已有 published currentVersion 时 PUT 复制版本和模块为新 draft，主表保持 published', async () => {
      store.config = makeConfig({
        status: 'published',
        currentVersionId: PUBLISHED_ID,
      });
      store.versions.set(PUBLISHED_ID, makeVersion({
        id: PUBLISHED_ID,
        status: 'published',
        versionNo: 1,
      }));
      store.modules.set(MODULE_ID, makeModule({ homeConfigVersionId: PUBLISHED_ID }));

      const result = await service.updateAdminConfig(dto, USER_ID);
      expect(store.config?.status).toBe('published');
      expect(store.config?.currentVersionId).toBe(PUBLISHED_ID);
      expect(store.versions.size).toBe(2);
      const drafts = [...store.versions.values()].filter((v) => v.status === 'draft');
      expect(drafts).toHaveLength(1);
      expect(drafts[0].versionNo).toBe(2);
      const copiedModules = [...store.modules.values()].filter(
        (m) => m.homeConfigVersionId === drafts[0].id,
      );
      expect(copiedModules).toHaveLength(1);
      expect(result.draftVersion?.versionNo).toBe(2);
    });

    it('pending 存在时 PUT 返回 409', async () => {
      store.config = makeConfig({ status: 'published', currentVersionId: PUBLISHED_ID });
      store.versions.set(PENDING_ID, makeVersion({ id: PENDING_ID, status: 'pending', versionNo: 2 }));
      await expect(service.updateAdminConfig(dto, USER_ID)).rejects.toMatchObject({ status: 409 });
    });

    it('withdrawn 状态下 PUT 创建 draft 但主表保持 withdrawn', async () => {
      store.config = makeConfig({
        status: 'withdrawn',
        currentVersionId: null,
      });
      store.versions.set(PUBLISHED_ID, makeVersion({
        id: PUBLISHED_ID,
        status: 'withdrawn',
        versionNo: 1,
      }));
      store.modules.set(MODULE_ID, makeModule({ homeConfigVersionId: PUBLISHED_ID }));

      await service.updateAdminConfig(dto, USER_ID);
      expect(store.config?.status).toBe('withdrawn');
      const draft = [...store.versions.values()].find((v) => v.status === 'draft');
      expect(draft).toBeDefined();
      const copiedModules = [...store.modules.values()].filter((m) => m.homeConfigVersionId === draft?.id);
      expect(copiedModules).toHaveLength(1);
      expect(copiedModules[0]?.moduleCode).toBe('guide_dept');
    });

    it('最新 withdrawn 无模块时，从更早有模块的 published/withdrawn 版本复制', async () => {
      store.config = makeConfig({ status: 'withdrawn', currentVersionId: null });
      store.versions.set(WITHDRAWN_EMPTY_ID, makeVersion({
        id: WITHDRAWN_EMPTY_ID,
        status: 'withdrawn',
        versionNo: 2,
      }));
      store.versions.set(PUBLISHED_WITH_MODULES_ID, makeVersion({
        id: PUBLISHED_WITH_MODULES_ID,
        status: 'published',
        versionNo: 1,
      }));
      store.modules.set(MODULE_ID, makeModule({ homeConfigVersionId: PUBLISHED_WITH_MODULES_ID }));

      await service.updateAdminConfig(dto, USER_ID);
      const draft = [...store.versions.values()].find((v) => v.status === 'draft');
      const copiedModules = [...store.modules.values()].filter((m) => m.homeConfigVersionId === draft?.id);
      expect(copiedModules).toHaveLength(1);
      expect(copiedModules[0]?.moduleCode).toBe('guide_dept');
    });

    it('所有 published/withdrawn 候选版本都无模块时，仍创建空 draft 不报错', async () => {
      store.config = makeConfig({ status: 'withdrawn', currentVersionId: null });
      store.versions.set(WITHDRAWN_EMPTY_ID, makeVersion({
        id: WITHDRAWN_EMPTY_ID,
        status: 'withdrawn',
        versionNo: 2,
      }));
      store.versions.set(PUBLISHED_WITH_MODULES_ID, makeVersion({
        id: PUBLISHED_WITH_MODULES_ID,
        status: 'withdrawn',
        versionNo: 1,
      }));

      await expect(service.updateAdminConfig(dto, USER_ID)).resolves.toBeDefined();
      const draft = [...store.versions.values()].find((v) => v.status === 'draft');
      expect(draft).toBeDefined();
      const copiedModules = [...store.modules.values()].filter((m) => m.homeConfigVersionId === draft?.id);
      expect(copiedModules).toHaveLength(0);
    });

    it('currentVersionId 存在时优先复制 currentVersionId 指向版本（即使更早版本有模块）', async () => {
      store.config = makeConfig({ status: 'published', currentVersionId: CURRENT_EMPTY_ID });
      store.versions.set(CURRENT_EMPTY_ID, makeVersion({
        id: CURRENT_EMPTY_ID,
        status: 'published',
        versionNo: 2,
      }));
      store.versions.set(OLDER_WITH_MODULES_ID, makeVersion({
        id: OLDER_WITH_MODULES_ID,
        status: 'withdrawn',
        versionNo: 1,
      }));
      store.modules.set(MODULE_ID, makeModule({ homeConfigVersionId: OLDER_WITH_MODULES_ID }));

      await service.updateAdminConfig(dto, USER_ID);
      const draft = [...store.versions.values()].find((v) => v.status === 'draft');
      const copiedModules = [...store.modules.values()].filter((m) => m.homeConfigVersionId === draft?.id);
      expect(copiedModules).toHaveLength(0);
      expect(store.config?.currentVersionId).toBe(CURRENT_EMPTY_ID);
    });

    it('不得修改已发布版本正文，PUT 创建新 draft', async () => {
      store.config = makeConfig({ status: 'published', currentVersionId: PUBLISHED_ID });
      store.versions.set(PUBLISHED_ID, makeVersion({
        id: PUBLISHED_ID,
        status: 'published',
        title: '已发布标题',
        versionNo: 1,
      }));

      await service.updateAdminConfig({ ...dto, title: '新草稿标题' }, USER_ID);
      expect(store.versions.get(PUBLISHED_ID)?.title).toBe('已发布标题');
      const draft = [...store.versions.values()].find((v) => v.status === 'draft');
      expect(draft?.title).toBe('新草稿标题');
    });
  });

  describe('module CRUD', () => {
    beforeEach(() => {
      store.config = makeConfig();
      store.versions.set(DRAFT_ID, makeVersion());
    });

    it('模块新增只作用于 draft', async () => {
      const created = await service.createModule({
        moduleCode: 'guide_topic',
        moduleName: '按主题查',
        moduleType: 'card',
        targetType: 'route',
        targetValue: '/guide/topics',
      });
      expect(created.moduleCode).toBe('guide_topic');
      const mod = [...store.modules.values()][0];
      expect(mod.homeConfigVersionId).toBe(DRAFT_ID);
    });

    it('moduleCode 重复返回 409', async () => {
      store.modules.set(MODULE_ID, makeModule());
      await expect(
        service.createModule({
          moduleCode: 'guide_dept',
          moduleName: '重复',
          moduleType: 'card',
          targetType: 'route',
          targetValue: '/x',
        }),
      ).rejects.toMatchObject({ status: 409 });
    });

    it('DELETE 逻辑删除，列表不返回 deleted 模块', async () => {
      store.modules.set(MODULE_ID, makeModule());
      store.modules.set(MODULE_ID_2, makeModule({ id: MODULE_ID_2, moduleCode: 'topic' }));
      await service.removeModule(MODULE_ID);
      const list = await service.listModules();
      expect(list.list).toHaveLength(1);
      expect(list.list[0].id).toBe(MODULE_ID_2);
      expect(list.list[0]).not.toHaveProperty('deletedAt');
    });

    it('模块排序只作用于 draft', async () => {
      store.modules.set(MODULE_ID, makeModule({ sortOrder: 1 }));
      store.modules.set(MODULE_ID_2, makeModule({
        id: MODULE_ID_2,
        moduleCode: 'topic',
        sortOrder: 2,
      }));
      const result = await service.sortModules({
        items: [
          { id: MODULE_ID, sortOrder: 2 },
          { id: MODULE_ID_2, sortOrder: 1 },
        ],
      });
      expect(result.list[0].id).toBe(MODULE_ID_2);
      expect(result.list[1].id).toBe(MODULE_ID);
    });

    it('无 draft 时模块写操作返回 409', async () => {
      store.versions.clear();
      await expect(
        service.createModule({
          moduleCode: 'x',
          moduleName: 'x',
          moduleType: 'card',
          targetType: 'route',
          targetValue: '/x',
        }),
      ).rejects.toMatchObject({ status: 409 });
    });

    it('pending 且无 draft 时模块写操作返回 409', async () => {
      store.versions.clear();
      store.versions.set(PENDING_ID, makeVersion({ id: PENDING_ID, status: 'pending' }));
      await expect(
        service.createModule({
          moduleCode: 'x',
          moduleName: 'x',
          moduleType: 'card',
          targetType: 'route',
          targetValue: '/x',
        }),
      ).rejects.toMatchObject({ status: 409 });
    });

    it('创建模块 isVisible=true 存为 1，响应为 boolean true', async () => {
      const created = await service.createModule({
        moduleCode: 'visible_true',
        moduleName: '可见',
        moduleType: 'card',
        targetType: 'route',
        targetValue: '/x',
        isVisible: true,
      });
      expect(created.isVisible).toBe(true);
      const mod = [...store.modules.values()].find((m) => m.moduleCode === 'visible_true');
      expect(mod?.isVisible).toBe(1);
    });

    it('创建模块 isVisible=false 存为 0，响应为 boolean false', async () => {
      const created = await service.createModule({
        moduleCode: 'visible_false',
        moduleName: '隐藏',
        moduleType: 'card',
        targetType: 'route',
        targetValue: '/x',
        isVisible: false,
      });
      expect(created.isVisible).toBe(false);
      const mod = [...store.modules.values()].find((m) => m.moduleCode === 'visible_false');
      expect(mod?.isVisible).toBe(0);
    });

    it('更新模块 isVisible=false 存为 0', async () => {
      store.modules.set(MODULE_ID, makeModule({ isVisible: 1 }));
      const updated = await service.updateModule(MODULE_ID, { isVisible: false });
      expect(updated.isVisible).toBe(false);
      expect(store.modules.get(MODULE_ID)?.isVisible).toBe(0);
    });

    it('sort 重复 id 返回 400', async () => {
      store.modules.set(MODULE_ID, makeModule());
      await expect(
        service.sortModules({
          items: [
            { id: MODULE_ID, sortOrder: 1 },
            { id: MODULE_ID, sortOrder: 2 },
          ],
        }),
      ).rejects.toMatchObject({ status: 400 });
    });

    it('sort 重复 sortOrder 返回 400', async () => {
      store.modules.set(MODULE_ID, makeModule());
      store.modules.set(MODULE_ID_2, makeModule({ id: MODULE_ID_2, moduleCode: 'topic' }));
      await expect(
        service.sortModules({
          items: [
            { id: MODULE_ID, sortOrder: 1 },
            { id: MODULE_ID_2, sortOrder: 1 },
          ],
        }),
      ).rejects.toMatchObject({ status: 400 });
    });
  });
});
