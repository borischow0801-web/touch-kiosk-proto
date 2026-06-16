import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Reflector } from '@nestjs/core';
import { DataSource, EntityManager } from 'typeorm';
import supertest = require('supertest');
import { AuthService } from '../src/auth/auth.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../src/auth/guards/permissions.guard';
import { ContentPublishService } from '../src/publish/content-publish.service';
import { HomeConfigPublishService } from '../src/home-config/home-config-publish.service';
import { PublishService } from '../src/publish/publish.service';
import { PublishController } from '../src/admin-api/controllers/publish.controller';
import { ContentItem } from '../src/database/entities/content-item.entity';
import { ContentVersion } from '../src/database/entities/content-version.entity';
import { PublishRecord } from '../src/database/entities/publish-record.entity';
import { SysUser } from '../src/database/entities/sys-user.entity';
import { SysRole } from '../src/database/entities/sys-role.entity';
import { SysUserRole } from '../src/database/entities/sys-user-role.entity';
import { SysPermission } from '../src/database/entities/sys-permission.entity';
import { SysRolePermission } from '../src/database/entities/sys-role-permission.entity';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

const TEST_JWT_SECRET = 'test-jwt-secret-for-publish-spec';
const SA_USER_ID = 'user-super-001';
const EDITOR_USER_ID = 'user-editor-002';
const ITEM_ID = 'item-001';
const VERSION_ID = 'version-001';
const VERSION_ID_2 = 'version-002';
const VERSION_ID_OLD = 'version-old-001';
const PUBLISHED_VERSION_ID = 'version-pub-001';
const CONFIG_ID = 'home-config-001';

function makeItem(overrides: Partial<ContentItem> = {}): ContentItem {
  return {
    id: ITEM_ID,
    contentType: 'policy_file',
    title: '已发布标题',
    subtitle: null,
    summary: '已发布摘要',
    categoryId: null,
    coverFileId: null,
    currentVersionId: null,
    status: 'draft',
    isTop: 0,
    isRecommend: 0,
    sortOrder: 0,
    publishAt: null,
    sourceType: null,
    sourceUrl: null,
    createdBy: SA_USER_ID,
    updatedBy: SA_USER_ID,
    createdAt: new Date('2024-06-01'),
    updatedAt: new Date('2024-06-01'),
    deletedAt: null,
    ...overrides,
  } as ContentItem;
}

function makeVersion(overrides: Partial<ContentVersion> = {}): ContentVersion {
  return {
    id: VERSION_ID,
    contentId: ITEM_ID,
    versionNo: 1,
    title: '版本标题',
    summary: '版本摘要',
    body: '正文',
    extraJson: null,
    status: 'draft',
    changeRemark: null,
    createdBy: SA_USER_ID,
    createdAt: new Date('2024-06-01'),
    ...overrides,
  } as ContentVersion;
}

function createMockTxManager() {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    save: jest.fn().mockImplementation(async (_entity: unknown, obj: unknown) => obj),
    lockItem: null as ContentItem | null,
    pendingCount: 0,
    drafts: [] as ContentVersion[],
    pendingVersions: [] as ContentVersion[],
  };
}

function setupDefaultVersionMocks(mockTx: ReturnType<typeof createMockTxManager>): void {
  mockTx.count.mockImplementation(async (entity: unknown, opts?: { where?: { status?: string } }) => {
    if ((entity as { name: string }).name !== 'ContentVersion') return 0;
    if (opts?.where?.status === 'pending') return mockTx.pendingCount;
    return 0;
  });
  mockTx.find.mockImplementation(async (
    entity: unknown,
    opts?: { where?: { status?: string; contentId?: string }; take?: number },
  ) => {
    if ((entity as { name: string }).name !== 'ContentVersion') return [];
    const all = [...mockTx.drafts, ...mockTx.pendingVersions];
    let rows = all;
    if (opts?.where?.status === 'draft') {
      rows = mockTx.drafts;
    } else if (opts?.where?.status === 'pending') {
      rows = mockTx.pendingVersions;
    }
    const sorted = [...rows].sort((a, b) => b.versionNo - a.versionNo);
    return opts?.take ? sorted.slice(0, opts.take) : sorted;
  });
  mockTx.findOne.mockImplementation(async (entity: unknown, opts?: { where?: { id?: string; contentId?: string } }) => {
    const name = (entity as { name: string }).name;
    if (name === 'ContentItem' && opts?.where?.id === ITEM_ID) {
      return mockTx.lockItem;
    }
    if (name === 'ContentVersion' && opts?.where?.id) {
      const all = [...mockTx.drafts, ...mockTx.pendingVersions];
      return all.find((v) => v.id === opts.where!.id) ?? null;
    }
    return null;
  });
}

describe('ContentPublishService — unit', () => {
  let service: ContentPublishService;
  const mockItemRepo = { findOne: jest.fn() };
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
    setupDefaultVersionMocks(mockTx);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentPublishService,
        { provide: getRepositoryToken(ContentItem), useValue: mockItemRepo },
        { provide: getRepositoryToken(ContentVersion), useValue: mockVersionRepo },
        { provide: getRepositoryToken(PublishRecord), useValue: mockRecordRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();
    service = module.get(ContentPublishService);

    mockTx.create.mockImplementation((entity: unknown, data: Record<string, unknown>) => data);
  });

  it('submit: draft → pending 并写入 publish_record', async () => {
    mockTx.lockItem = makeItem({ status: 'draft' });
    mockTx.pendingCount = 0;
    mockTx.drafts = [makeVersion({ status: 'draft' })];

    const result = await service.submit(ITEM_ID, SA_USER_ID);

    expect(result.versionStatus).toBe('pending');
    expect(result.itemStatus).toBe('pending');
    expect(mockTx.save).toHaveBeenCalled();
    expect(mockTx.create).toHaveBeenCalledWith(
      PublishRecord,
      expect.objectContaining({ action: 'submit', fromStatus: 'draft', toStatus: 'pending' }),
    );
  });

  it('approve: pending → published 并设置 current_version_id', async () => {
    mockTx.lockItem = makeItem({ status: 'pending' });
    mockTx.pendingVersions = [makeVersion({ status: 'pending' })];

    const result = await service.approve(ITEM_ID, SA_USER_ID);

    expect(result.versionStatus).toBe('published');
    expect(result.itemStatus).toBe('published');
    expect(result.currentVersionId).toBe(VERSION_ID);
    expect(result.publishAt).not.toBeNull();
  });

  it('reject: pending → rejected', async () => {
    mockTx.lockItem = makeItem({ status: 'pending' });
    mockTx.pendingVersions = [makeVersion({ status: 'pending' })];

    const result = await service.reject(ITEM_ID, SA_USER_ID, undefined, '驳回原因');

    expect(result.versionStatus).toBe('rejected');
    expect(result.itemStatus).toBe('rejected');
  });

  it('direct-publish: draft → published', async () => {
    mockTx.lockItem = makeItem({ status: 'draft' });
    mockTx.pendingCount = 0;
    mockTx.drafts = [makeVersion({ status: 'draft' })];

    const result = await service.directPublish(ITEM_ID, SA_USER_ID);

    expect(result.versionStatus).toBe('published');
    expect(result.currentVersionId).toBe(VERSION_ID);
  });

  it('withdraw: published → withdrawn', async () => {
    mockTx.lockItem = makeItem({
      status: 'published',
      currentVersionId: PUBLISHED_VERSION_ID,
      publishAt: new Date(),
    });
    mockTx.findOne.mockImplementation(async (entity: unknown, opts?: { where?: { id?: string } }) => {
      if ((entity as { name: string }).name === 'ContentItem') return mockTx.lockItem;
      if (opts?.where?.id === PUBLISHED_VERSION_ID) {
        return makeVersion({ id: PUBLISHED_VERSION_ID, status: 'published' });
      }
      return null;
    });

    const result = await service.withdraw(ITEM_ID, SA_USER_ID);

    expect(result.itemStatus).toBe('withdrawn');
    expect(result.versionStatus).toBe('withdrawn');
  });

  it('rollback: 复制历史版本为新 draft，不改变 current_version_id', async () => {
    mockTx.lockItem = makeItem({
      status: 'published',
      currentVersionId: PUBLISHED_VERSION_ID,
      title: '已发布标题',
    });
    mockTx.findOne.mockImplementation(async (entity: unknown, opts?: { where?: { id?: string } }) => {
      if ((entity as { name: string }).name === 'ContentItem') return mockTx.lockItem;
      if (opts?.where?.id === PUBLISHED_VERSION_ID) {
        return makeVersion({ id: PUBLISHED_VERSION_ID, versionNo: 1, status: 'published', title: '历史标题' });
      }
      return null;
    });
    mockTx.drafts = [];
    mockTx.pendingVersions = [];
    mockTx.find.mockImplementationOnce(async () => [
      makeVersion({ id: PUBLISHED_VERSION_ID, versionNo: 1, status: 'published' }),
    ]);
    mockTx.create.mockImplementation((entity: unknown, data: Record<string, unknown>) => {
      if (entity === ContentVersion) return { id: VERSION_ID_2, ...data };
      return data;
    });

    const result = await service.rollback(ITEM_ID, SA_USER_ID, PUBLISHED_VERSION_ID);

    expect(result.versionStatus).toBe('draft');
    expect(result.versionNo).toBe(2);
    expect(result.currentVersionId).toBe(PUBLISHED_VERSION_ID);
    expect(result.itemStatus).toBe('published');
  });

  it('已发布内容审核新草稿被驳回时 item 保持 published', async () => {
    mockTx.lockItem = makeItem({
      status: 'published',
      currentVersionId: PUBLISHED_VERSION_ID,
      title: '已发布标题',
    });
    mockTx.pendingVersions = [
      makeVersion({ id: VERSION_ID_2, versionNo: 2, status: 'pending', title: '新草稿标题' }),
    ];

    const result = await service.reject(ITEM_ID, SA_USER_ID);

    expect(result.itemStatus).toBe('published');
    expect(result.currentVersionId).toBe(PUBLISHED_VERSION_ID);
  });

  it('重复 submit 返回 409', async () => {
    mockTx.lockItem = makeItem({ status: 'pending' });
    mockTx.pendingCount = 1;
    mockTx.pendingVersions = [makeVersion({ status: 'pending' })];

    await expect(service.submit(ITEM_ID, SA_USER_ID)).rejects.toThrow(
      '已存在待审核版本，无法提交或直接发布',
    );
  });

  it('提交旧 draft 返回 409', async () => {
    mockTx.lockItem = makeItem({ status: 'draft' });
    mockTx.pendingCount = 0;
    mockTx.drafts = [
      makeVersion({ id: VERSION_ID_OLD, versionNo: 1, status: 'draft' }),
      makeVersion({ id: VERSION_ID_2, versionNo: 2, status: 'draft' }),
    ];

    await expect(service.submit(ITEM_ID, SA_USER_ID, VERSION_ID_OLD)).rejects.toThrow(
      '只能操作该内容最新的 draft 版本',
    );
  });

  it('pending 期间 direct-publish 返回 409', async () => {
    mockTx.lockItem = makeItem({ status: 'published', currentVersionId: PUBLISHED_VERSION_ID });
    mockTx.pendingCount = 1;
    mockTx.pendingVersions = [makeVersion({ id: VERSION_ID_2, versionNo: 2, status: 'pending' })];
    mockTx.drafts = [makeVersion({ id: VERSION_ID, versionNo: 3, status: 'draft' })];

    await expect(service.directPublish(ITEM_ID, SA_USER_ID)).rejects.toThrow(
      '已存在待审核版本，无法提交或直接发布',
    );
  });

  it('多 pending 未传 versionId 时 approve 返回 409', async () => {
    mockTx.lockItem = makeItem({ status: 'published', currentVersionId: PUBLISHED_VERSION_ID });
    mockTx.pendingVersions = [
      makeVersion({ id: VERSION_ID, versionNo: 2, status: 'pending' }),
      makeVersion({ id: VERSION_ID_2, versionNo: 3, status: 'pending' }),
    ];

    await expect(service.approve(ITEM_ID, SA_USER_ID)).rejects.toThrow(
      '存在多个待审核版本，数据异常，无法审核',
    );
  });

  it('多 pending + 显式 versionId 时 approve 返回 409', async () => {
    mockTx.lockItem = makeItem({ status: 'published', currentVersionId: PUBLISHED_VERSION_ID });
    mockTx.pendingVersions = [
      makeVersion({ id: VERSION_ID, versionNo: 2, status: 'pending' }),
      makeVersion({ id: VERSION_ID_2, versionNo: 3, status: 'pending' }),
    ];

    await expect(service.approve(ITEM_ID, SA_USER_ID, VERSION_ID)).rejects.toThrow(
      '存在多个待审核版本，数据异常，无法审核',
    );
  });

  it('多 pending + 显式 versionId 时 reject 返回 409', async () => {
    mockTx.lockItem = makeItem({ status: 'published', currentVersionId: PUBLISHED_VERSION_ID });
    mockTx.pendingVersions = [
      makeVersion({ id: VERSION_ID, versionNo: 2, status: 'pending' }),
      makeVersion({ id: VERSION_ID_2, versionNo: 3, status: 'pending' }),
    ];

    await expect(service.reject(ITEM_ID, SA_USER_ID, VERSION_ID_2)).rejects.toThrow(
      '存在多个待审核版本，数据异常，无法审核',
    );
  });

  it('单 pending + 正确显式 versionId 可正常 approve', async () => {
    mockTx.lockItem = makeItem({ status: 'pending' });
    mockTx.pendingVersions = [makeVersion({ id: VERSION_ID, versionNo: 1, status: 'pending' })];

    const result = await service.approve(ITEM_ID, SA_USER_ID, VERSION_ID);

    expect(result.versionStatus).toBe('published');
    expect(result.versionId).toBe(VERSION_ID);
  });

  it('单 pending + 非待审 versionId 时 approve 返回 409', async () => {
    mockTx.lockItem = makeItem({ status: 'draft' });
    mockTx.pendingVersions = [makeVersion({ id: VERSION_ID_2, versionNo: 2, status: 'pending' })];
    mockTx.drafts = [makeVersion({ id: VERSION_ID, versionNo: 1, status: 'draft' })];

    await expect(service.approve(ITEM_ID, SA_USER_ID, VERSION_ID)).rejects.toThrow(
      '指定版本不是当前待审核版本',
    );
  });

  it('无 pending 时 approve 返回 409', async () => {
    mockTx.lockItem = makeItem({ status: 'draft' });
    mockTx.pendingVersions = [];

    await expect(service.approve(ITEM_ID, SA_USER_ID)).rejects.toThrow(
      '没有待审核的 pending 版本',
    );
  });

  it('非法状态 approve 返回 409', async () => {
    mockTx.lockItem = makeItem({ status: 'draft' });
    mockTx.drafts = [makeVersion({ status: 'draft' })];
    mockTx.pendingVersions = [];

    await expect(service.approve(ITEM_ID, SA_USER_ID)).rejects.toThrow(
      '没有待审核的 pending 版本',
    );
  });

  it('publish_record 写入失败时 submit 事务整体回滚', async () => {
    mockTx.lockItem = makeItem({ status: 'draft' });
    mockTx.pendingCount = 0;
    mockTx.drafts = [makeVersion({ status: 'draft' })];
    mockTx.save.mockImplementation(async (entity: unknown, obj: unknown) => {
      if (entity === PublishRecord) {
        throw new Error('publish_record write failed');
      }
      return obj;
    });

    await expect(service.submit(ITEM_ID, SA_USER_ID)).rejects.toThrow('publish_record write failed');
    expect(mockTx.create).toHaveBeenCalledWith(
      PublishRecord,
      expect.objectContaining({ action: 'submit' }),
    );
  });

  it('内容不存在返回 404', async () => {
    mockTx.lockItem = null;
    await expect(service.submit('missing', SA_USER_ID)).rejects.toThrow('内容不存在');
  });

  describe('非法状态流转矩阵', () => {
    it.each([
      {
        name: 'reject 无 pending',
        setup: () => {
          mockTx.lockItem = makeItem({ status: 'draft' });
          mockTx.pendingCount = 0;
          mockTx.pendingVersions = [];
          mockTx.drafts = [makeVersion({ status: 'draft' })];
        },
        run: () => service.reject(ITEM_ID, SA_USER_ID),
        message: '没有待审核的 pending 版本',
      },
      {
        name: 'reject draft 版本',
        setup: () => {
          mockTx.lockItem = makeItem({ status: 'draft' });
          mockTx.pendingCount = 0;
          mockTx.pendingVersions = [];
          mockTx.drafts = [makeVersion({ id: VERSION_ID, status: 'draft' })];
        },
        run: () => service.reject(ITEM_ID, SA_USER_ID, VERSION_ID),
        message: '没有待审核的 pending 版本',
      },
      {
        name: 'withdraw draft 内容',
        setup: () => {
          mockTx.lockItem = makeItem({ status: 'draft' });
          mockTx.pendingCount = 0;
          mockTx.pendingVersions = [];
          mockTx.drafts = [makeVersion({ status: 'draft' })];
        },
        run: () => service.withdraw(ITEM_ID, SA_USER_ID),
        message: '仅 published 状态的内容可撤回',
      },
      {
        name: 'direct-publish pending 版本',
        setup: () => {
          mockTx.lockItem = makeItem({ status: 'draft' });
          mockTx.pendingCount = 1;
          mockTx.pendingVersions = [makeVersion({ id: VERSION_ID_2, versionNo: 2, status: 'pending' })];
          mockTx.drafts = [makeVersion({ status: 'draft' })];
        },
        run: () => service.directPublish(ITEM_ID, SA_USER_ID, VERSION_ID_2),
        message: '已存在待审核版本，无法提交或直接发布',
      },
    ])('$name → 409', async ({ setup, run, message }) => {
      setup();
      await expect(run()).rejects.toThrow(message);
    });
  });
});

describe('PublishService — unit', () => {
  let service: PublishService;
  const mockContentPublish = {
    submit: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
    directPublish: jest.fn(),
    withdraw: jest.fn(),
    rollback: jest.fn(),
    listRecords: jest.fn(),
  };
  const mockHomeConfigPublish = {
    submit: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
    directPublish: jest.fn(),
    withdraw: jest.fn(),
    rollback: jest.fn(),
    listRecords: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublishService,
        { provide: ContentPublishService, useValue: mockContentPublish },
        { provide: HomeConfigPublishService, useValue: mockHomeConfigPublish },
      ],
    }).compile();
    service = module.get(PublishService);
  });

  it('不支持的 bizType 返回 400', async () => {
    await expect(service.submit('guide_config', ITEM_ID, SA_USER_ID)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(mockContentPublish.submit).not.toHaveBeenCalled();
    expect(mockHomeConfigPublish.submit).not.toHaveBeenCalled();
  });

  it('home_config submit 路由到 HomeConfigPublishService', async () => {
    mockHomeConfigPublish.submit.mockResolvedValueOnce({
      bizId: CONFIG_ID,
      bizType: 'home_config',
      itemStatus: 'pending',
      versionStatus: 'pending',
      versionId: VERSION_ID,
      versionNo: 1,
      currentVersionId: null,
      publishAt: null,
    });

    const result = await service.submit('home_config', CONFIG_ID, SA_USER_ID);

    expect(mockHomeConfigPublish.submit).toHaveBeenCalledWith(CONFIG_ID, SA_USER_ID, undefined, undefined);
    expect(mockContentPublish.submit).not.toHaveBeenCalled();
    expect(result.bizType).toBe('home_config');
  });

  it('content submit 仍路由到 ContentPublishService', async () => {
    mockContentPublish.submit.mockResolvedValueOnce({
      bizId: ITEM_ID,
      bizType: 'content',
      itemStatus: 'pending',
      versionStatus: 'pending',
      versionId: VERSION_ID,
      versionNo: 1,
      currentVersionId: null,
      publishAt: null,
    });

    await service.submit('content', ITEM_ID, SA_USER_ID);

    expect(mockContentPublish.submit).toHaveBeenCalledWith(ITEM_ID, SA_USER_ID, undefined, undefined);
    expect(mockHomeConfigPublish.submit).not.toHaveBeenCalled();
  });
});

describe('PublishController — HTTP', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const mockUserRepo = { findOne: jest.fn() };
  const mockRoleRepo = { find: jest.fn() };
  const mockUserRoleRepo = { find: jest.fn() };
  const mockPermRepo = { find: jest.fn() };
  const mockRolePermRepo = { find: jest.fn() };
  const mockPublishService = {
    submit: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
    directPublish: jest.fn(),
    withdraw: jest.fn(),
    rollback: jest.fn(),
    listRecords: jest.fn(),
  };

  function makeSaUser(): SysUser {
    return {
      id: SA_USER_ID, username: 'superadmin', passwordHash: '',
      realName: '超管', mobile: null, email: null, status: 'active',
      lastLoginAt: null, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
    } as SysUser;
  }

  function makeSaToken(): string {
    return jwtService.sign({ sub: SA_USER_ID, username: 'superadmin' });
  }

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: TEST_JWT_SECRET, signOptions: { expiresIn: '1h' } })],
      controllers: [PublishController],
      providers: [
        AuthService,
        JwtAuthGuard,
        PermissionsGuard,
        Reflector,
        { provide: PublishService, useValue: mockPublishService },
        { provide: getRepositoryToken(SysUser), useValue: mockUserRepo },
        { provide: getRepositoryToken(SysRole), useValue: mockRoleRepo },
        { provide: getRepositoryToken(SysUserRole), useValue: mockUserRoleRepo },
        { provide: getRepositoryToken(SysPermission), useValue: mockPermRepo },
        { provide: getRepositoryToken(SysRolePermission), useValue: mockRolePermRepo },
      ],
    }).compile();

    jwtService = module.get(JwtService);
    const reflector = module.get(Reflector);
    const authService = module.get(AuthService);
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalGuards(new JwtAuthGuard(jwtService, authService, reflector), new PermissionsGuard(reflector, authService));
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('无 token 返回 401', async () => {
    const res = await supertest(app.getHttpServer()).post(`/api/admin/publish/content/${ITEM_ID}/submit`);
    expect(res.status).toBe(401);
  });

  it('无权限返回 403', async () => {
    mockUserRepo.findOne.mockResolvedValue({
      ...makeSaUser(),
      id: EDITOR_USER_ID,
      username: 'editor',
    });
    mockUserRoleRepo.find.mockResolvedValue([
      { userId: EDITOR_USER_ID, roleId: 'role-editor' } as SysUserRole,
    ]);
    mockRoleRepo.find.mockResolvedValue([
      { id: 'role-editor', roleCode: 'CONTENT_EDITOR', status: 'active' } as SysRole,
    ]);
    mockRolePermRepo.find.mockResolvedValue([]);
    mockPermRepo.find.mockResolvedValue([]);

    const token = jwtService.sign({ sub: EDITOR_USER_ID, username: 'editor' });
    const res = await supertest(app.getHttpServer())
      .post(`/api/admin/publish/content/${ITEM_ID}/submit`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(403);
  });

  it('SUPER_ADMIN 可调用 submit', async () => {
    mockUserRepo.findOne.mockResolvedValueOnce(makeSaUser());
    mockUserRoleRepo.find.mockResolvedValueOnce([
      { userId: SA_USER_ID, roleId: 'role-sa' } as SysUserRole,
    ]);
    mockRoleRepo.find.mockResolvedValueOnce([
      { id: 'role-sa', roleCode: 'SUPER_ADMIN', status: 'active' } as SysRole,
    ]);
    mockPublishService.submit.mockResolvedValueOnce({
      bizId: ITEM_ID,
      bizType: 'content',
      itemStatus: 'pending',
      versionStatus: 'pending',
      versionId: VERSION_ID,
      versionNo: 1,
      currentVersionId: null,
      publishAt: null,
    });

    const res = await supertest(app.getHttpServer())
      .post(`/api/admin/publish/content/${ITEM_ID}/submit`)
      .set('Authorization', `Bearer ${makeSaToken()}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
  });

  it('home_config submit 可路由到 PublishService', async () => {
    mockUserRepo.findOne.mockResolvedValueOnce(makeSaUser());
    mockUserRoleRepo.find.mockResolvedValueOnce([
      { userId: SA_USER_ID, roleId: 'role-sa' } as SysUserRole,
    ]);
    mockRoleRepo.find.mockResolvedValueOnce([
      { id: 'role-sa', roleCode: 'SUPER_ADMIN', status: 'active' } as SysRole,
    ]);
    mockPublishService.submit.mockResolvedValueOnce({
      bizId: CONFIG_ID,
      bizType: 'home_config',
      itemStatus: 'pending',
      versionStatus: 'pending',
      versionId: VERSION_ID,
      versionNo: 1,
      currentVersionId: null,
      publishAt: null,
    });

    const res = await supertest(app.getHttpServer())
      .post(`/api/admin/publish/home_config/${CONFIG_ID}/submit`)
      .set('Authorization', `Bearer ${makeSaToken()}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(mockPublishService.submit).toHaveBeenCalledWith(
      'home_config',
      CONFIG_ID,
      SA_USER_ID,
      undefined,
      undefined,
    );
  });
});
