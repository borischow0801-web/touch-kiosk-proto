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
import { CategoriesService } from '../src/content/categories.service';
import { ItemsService } from '../src/content/items.service';
import { RelationsService } from '../src/content/relations.service';
import { ContentCategoriesController } from '../src/admin-api/controllers/content-categories.controller';
import { ContentItemsController } from '../src/admin-api/controllers/content-items.controller';
import { ContentCategory } from '../src/database/entities/content-category.entity';
import { ContentItem } from '../src/database/entities/content-item.entity';
import { ContentVersion } from '../src/database/entities/content-version.entity';
import { ContentRelation } from '../src/database/entities/content-relation.entity';
import { SysUser } from '../src/database/entities/sys-user.entity';
import { SysRole } from '../src/database/entities/sys-role.entity';
import { SysUserRole } from '../src/database/entities/sys-user-role.entity';
import { SysPermission } from '../src/database/entities/sys-permission.entity';
import { SysRolePermission } from '../src/database/entities/sys-role-permission.entity';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

const TEST_JWT_SECRET = 'test-jwt-secret-for-content-spec';

const SA_USER_ID = 'user-super-001';
const EDITOR_USER_ID = 'user-editor-002';
const ROLE_SUPER_ID = 'role-super-001';
const ROLE_EDITOR_ID = 'role-editor-002';
const CAT_ID = 'cat-001';
const ITEM_ID = 'item-001';
const ITEM_TARGET_ID = 'item-002';
const VERSION_ID = 'version-001';
const VERSION_ID_2 = 'version-002';

function makeSaUser(): SysUser {
  return {
    id: SA_USER_ID, username: 'superadmin', passwordHash: '',
    realName: '超级管理员', mobile: null, email: null, status: 'active',
    lastLoginAt: null, createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'), deletedAt: null,
  } as SysUser;
}

function makeEditorUser(): SysUser {
  return {
    id: EDITOR_USER_ID, username: 'editor01', passwordHash: '',
    realName: '编辑员', mobile: null, email: null, status: 'active',
    lastLoginAt: null, createdAt: new Date('2024-01-02'),
    updatedAt: new Date('2024-01-02'), deletedAt: null,
  } as SysUser;
}

function makeSaRole(): SysRole {
  return {
    id: ROLE_SUPER_ID, roleCode: 'SUPER_ADMIN', roleName: '超级管理员',
    description: null, status: 'active',
    createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01'), deletedAt: null,
  } as SysRole;
}

function makeEditorRole(): SysRole {
  return {
    id: ROLE_EDITOR_ID, roleCode: 'CONTENT_EDITOR', roleName: '内容编辑员',
    description: null, status: 'active',
    createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01'), deletedAt: null,
  } as SysRole;
}

function makeSaLink(): SysUserRole {
  return { id: 'ur-001', userId: SA_USER_ID, roleId: ROLE_SUPER_ID, createdAt: new Date() } as SysUserRole;
}

function makeCategory(overrides: Partial<ContentCategory> = {}): ContentCategory {
  return {
    id: CAT_ID,
    parentId: null,
    categoryName: '政策文件',
    contentType: 'policy_file',
    sortOrder: 0,
    status: 'active',
    createdAt: new Date('2024-06-01'),
    updatedAt: new Date('2024-06-01'),
    deletedAt: null,
    ...overrides,
  } as ContentCategory;
}

function makeItem(overrides: Partial<ContentItem> = {}): ContentItem {
  return {
    id: ITEM_ID,
    contentType: 'policy_file',
    title: '测试政策',
    subtitle: null,
    summary: '摘要',
    categoryId: CAT_ID,
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
    title: '测试政策',
    summary: '摘要',
    body: '正文内容',
    extraJson: null,
    status: 'draft',
    changeRemark: '初始版本',
    createdBy: SA_USER_ID,
    createdAt: new Date('2024-06-01'),
    ...overrides,
  } as ContentVersion;
}

function createMockTxManager() {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn().mockImplementation(async (_entity: unknown, obj: unknown) => obj),
    delete: jest.fn().mockResolvedValue(undefined),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    softDelete: jest.fn().mockResolvedValue(undefined),
  };
}

function createItemsCreateTxManager() {
  const mgr = createMockTxManager();
  mgr.create.mockImplementation((Entity: unknown, data: Record<string, unknown>) => {
    if (Entity === ContentItem) return { id: ITEM_ID, currentVersionId: null, ...data };
    if (Entity === ContentVersion) return { id: VERSION_ID, ...data };
    return data;
  });
  return mgr;
}

describe('CategoriesService — unit', () => {
  let service: CategoriesService;

  const mockCategoryRepo = {
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    count: jest.fn(),
    softDelete: jest.fn(),
  };
  const mockItemRepo = { count: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        { provide: getRepositoryToken(ContentCategory), useValue: mockCategoryRepo },
        { provide: getRepositoryToken(ContentItem), useValue: mockItemRepo },
      ],
    }).compile();
    service = module.get<CategoriesService>(CategoriesService);
  });

  describe('list()', () => {
    it('返回分页分类列表', async () => {
      mockCategoryRepo.findAndCount.mockResolvedValueOnce([[makeCategory()], 1]);
      const result = await service.list({ page: 1, pageSize: 20 });
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
      expect(result.list[0].id).toBe(CAT_ID);
    });
  });

  describe('create()', () => {
    it('创建合法分类', async () => {
      const created = makeCategory();
      mockCategoryRepo.create.mockReturnValueOnce(created);
      mockCategoryRepo.save.mockResolvedValueOnce(created);

      const result = await service.create({
        categoryName: '政策文件',
        contentType: 'policy_file',
      });
      expect(result.id).toBe(CAT_ID);
      expect(mockCategoryRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ contentType: 'policy_file', status: 'active' }),
      );
    });

    it('非法 content_type 抛出 BadRequestException', async () => {
      await expect(
        service.create({ categoryName: '非法', contentType: 'invalid_type' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('父子分类 contentType 不一致时抛出 BadRequestException', async () => {
      mockCategoryRepo.findOne.mockResolvedValueOnce(
        makeCategory({ contentType: 'policy_file' }),
      );
      await expect(
        service.create({
          parentId: CAT_ID,
          categoryName: '子分类',
          contentType: 'policy_interpretation',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('update()', () => {
    it('更新分类名称', async () => {
      const cat = makeCategory();
      mockCategoryRepo.findOne.mockResolvedValueOnce(cat);
      mockCategoryRepo.save.mockResolvedValueOnce({ ...cat, categoryName: '新名称' });

      const result = await service.update(CAT_ID, { categoryName: '新名称' });
      expect(result.categoryName).toBe('新名称');
    });
  });

  describe('remove()', () => {
    it('无子分类和内容时软删除', async () => {
      mockCategoryRepo.findOne.mockResolvedValueOnce(makeCategory());
      mockCategoryRepo.count.mockResolvedValueOnce(0);
      mockItemRepo.count.mockResolvedValueOnce(0);
      mockCategoryRepo.softDelete.mockResolvedValueOnce(undefined);

      await service.remove(CAT_ID);
      expect(mockCategoryRepo.softDelete).toHaveBeenCalledWith(CAT_ID);
    });

    it('有子分类时抛出 409', async () => {
      mockCategoryRepo.findOne.mockResolvedValueOnce(makeCategory());
      mockCategoryRepo.count.mockResolvedValueOnce(1);

      await expect(service.remove(CAT_ID)).rejects.toThrow('仍有子分类');
      expect(mockCategoryRepo.softDelete).not.toHaveBeenCalled();
    });

    it('有内容时抛出 409', async () => {
      mockCategoryRepo.findOne.mockResolvedValueOnce(makeCategory());
      mockCategoryRepo.count.mockResolvedValueOnce(0);
      mockItemRepo.count.mockResolvedValueOnce(1);

      await expect(service.remove(CAT_ID)).rejects.toThrow('仍有内容');
      expect(mockCategoryRepo.softDelete).not.toHaveBeenCalled();
    });
  });
});

describe('ItemsService — unit', () => {
  let service: ItemsService;

  const mockItemRepo = {
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    softDelete: jest.fn(),
  };
  const mockVersionRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const mockCategoryRepo = { findOne: jest.fn() };
  const mockDataSource = { transaction: jest.fn() };
  let mockTxManager: ReturnType<typeof createMockTxManager>;

  beforeEach(async () => {
    jest.resetAllMocks();
    mockTxManager = createItemsCreateTxManager();
    mockDataSource.transaction.mockImplementation(
      (cb: (manager: EntityManager) => Promise<unknown>) =>
        cb(mockTxManager as unknown as EntityManager),
    );
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ItemsService,
        { provide: getRepositoryToken(ContentItem), useValue: mockItemRepo },
        { provide: getRepositoryToken(ContentVersion), useValue: mockVersionRepo },
        { provide: getRepositoryToken(ContentCategory), useValue: mockCategoryRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();
    service = module.get<ItemsService>(ItemsService);
  });

  describe('create()', () => {
    it('通过事务创建内容与首版 versionNo=1', async () => {
      const result = await service.create(
        { contentType: 'policy_file', title: '新政策' },
        SA_USER_ID,
      );

      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockTxManager.create).toHaveBeenCalledWith(
        ContentItem,
        expect.objectContaining({ title: '新政策', status: 'draft' }),
      );
      expect(mockTxManager.create).toHaveBeenCalledWith(
        ContentVersion,
        expect.objectContaining({ versionNo: 1, status: 'draft' }),
      );
      expect(mockTxManager.save).toHaveBeenCalledTimes(2);
      expect(result.currentVersionId).toBeNull();
      expect(result.title).toBe('新政策');
    });

    it('非法 content_type 抛出 BadRequestException', async () => {
      await expect(
        service.create({ contentType: 'bad_type', title: 'x' }, SA_USER_ID),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });

    it('分类 contentType 与内容不一致时抛出 BadRequestException', async () => {
      mockCategoryRepo.findOne.mockResolvedValueOnce(
        makeCategory({ contentType: 'policy_interpretation' }),
      );
      await expect(
        service.create(
          { contentType: 'policy_file', title: '冲突', categoryId: CAT_ID },
          SA_USER_ID,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });
  });

  describe('update()', () => {
    it('版本字段变更时追加 versionNo=2，旧版本不被修改', async () => {
      const item = makeItem({ currentVersionId: null });
      const oldVersion = makeVersion({ body: '旧正文', extraJson: '{"k":1}' });
      mockTxManager.findOne.mockResolvedValueOnce(item);
      mockTxManager.find.mockResolvedValueOnce([oldVersion]);
      mockTxManager.create.mockImplementation((Entity: unknown, data: Record<string, unknown>) => {
        if (Entity === ContentVersion) return { id: VERSION_ID_2, ...data };
        return data;
      });

      await service.update(ITEM_ID, { title: '新标题' }, SA_USER_ID);

      expect(mockTxManager.create).toHaveBeenCalledWith(
        ContentVersion,
        expect.objectContaining({
          versionNo: 2,
          title: '新标题',
          body: '旧正文',
          extraJson: '{"k":1}',
        }),
      );
      const versionSaveCalls = mockTxManager.save.mock.calls.filter(
        (call) => call[0] === ContentVersion,
      );
      expect(versionSaveCalls).toHaveLength(1);
      expect(versionSaveCalls[0][1]).toEqual(
        expect.objectContaining({ id: VERSION_ID_2, versionNo: 2 }),
      );
      expect(mockVersionRepo.save).not.toHaveBeenCalled();
    });

    it('已发布内容编辑版本字段时不更新主表 title/summary', async () => {
      mockTxManager.findOne.mockResolvedValueOnce(
        makeItem({
          status: 'published',
          currentVersionId: VERSION_ID,
          title: '已发布标题',
          summary: '已发布摘要',
        }),
      );
      mockTxManager.find.mockResolvedValueOnce([
        makeVersion({ status: 'published', title: '已发布标题' }),
      ]);
      mockTxManager.create.mockImplementation((Entity: unknown, data: Record<string, unknown>) => {
        if (Entity === ContentVersion) return { id: VERSION_ID_2, ...data };
        return data;
      });

      await service.update(ITEM_ID, { title: '新草稿标题', body: '新正文' }, SA_USER_ID);

      const itemSaveCalls = mockTxManager.save.mock.calls.filter((c) => c[0] === ContentItem);
      const savedItem = itemSaveCalls[itemSaveCalls.length - 1][1] as ContentItem;
      expect(savedItem.title).toBe('已发布标题');
      expect(savedItem.summary).toBe('已发布摘要');
    });

    it('仅更新 sortOrder 时不创建新版本', async () => {
      mockTxManager.findOne.mockResolvedValueOnce(makeItem());

      await service.update(ITEM_ID, { sortOrder: 5 }, SA_USER_ID);

      expect(mockTxManager.create).not.toHaveBeenCalledWith(
        ContentVersion,
        expect.anything(),
      );
    });
  });

  describe('remove()', () => {
    it('软删除内容', async () => {
      mockItemRepo.findOne.mockResolvedValueOnce(makeItem());
      mockItemRepo.softDelete.mockResolvedValueOnce(undefined);

      await service.remove(ITEM_ID);
      expect(mockItemRepo.softDelete).toHaveBeenCalledWith(ITEM_ID);
    });
  });
});

describe('RelationsService — unit', () => {
  let service: RelationsService;

  const mockItemRepo = { findOne: jest.fn(), find: jest.fn() };
  const mockRelationRepo = { find: jest.fn() };
  const mockDataSource = { transaction: jest.fn() };
  let mockTxManager: ReturnType<typeof createMockTxManager>;

  beforeEach(async () => {
    jest.resetAllMocks();
    mockTxManager = createMockTxManager();
    mockDataSource.transaction.mockImplementation(
      (cb: (manager: EntityManager) => Promise<unknown>) =>
        cb(mockTxManager as unknown as EntityManager),
    );
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RelationsService,
        { provide: getRepositoryToken(ContentItem), useValue: mockItemRepo },
        { provide: getRepositoryToken(ContentRelation), useValue: mockRelationRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();
    service = module.get<RelationsService>(RelationsService);
  });

  describe('replace()', () => {
    it('自关联被阻止', async () => {
      mockItemRepo.findOne.mockResolvedValue(makeItem());

      await expect(
        service.replace(ITEM_ID, {
          relations: [{ targetId: ITEM_ID, relationType: 'guide_faq' }],
        }),
      ).rejects.toThrow('不允许自关联');
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });

    it('目标内容不存在时抛出 404', async () => {
      mockItemRepo.findOne
        .mockResolvedValueOnce(makeItem())
        .mockResolvedValueOnce(null);

      await expect(
        service.replace(ITEM_ID, {
          relations: [{ targetId: 'missing-item', relationType: 'guide_faq' }],
        }),
      ).rejects.toThrow('内容不存在');
    });

    it('合法关联替换成功', async () => {
      mockItemRepo.findOne.mockImplementation(({ where }: { where: { id: string } }) => {
        if (where.id === ITEM_ID) return Promise.resolve(makeItem());
        if (where.id === ITEM_TARGET_ID) {
          return Promise.resolve(makeItem({ id: ITEM_TARGET_ID, title: '目标内容' }));
        }
        return Promise.resolve(null);
      });
      mockRelationRepo.find.mockResolvedValueOnce([
        {
          id: 'rel-001',
          sourceId: ITEM_ID,
          targetId: ITEM_TARGET_ID,
          relationType: 'guide_faq',
          sortOrder: 0,
          createdAt: new Date(),
        },
      ]);
      mockItemRepo.find.mockResolvedValueOnce([
        makeItem({ id: ITEM_TARGET_ID, title: '目标内容' }),
      ]);

      const result = await service.replace(ITEM_ID, {
        relations: [{ targetId: ITEM_TARGET_ID, relationType: 'guide_faq' }],
      });

      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(result[0].targetTitle).toBe('目标内容');
    });
  });
});

describe('ContentModule — HTTP integration', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const mockUserRepo = { findOne: jest.fn(), find: jest.fn() };
  const mockRoleRepo = { find: jest.fn(), findOne: jest.fn() };
  const mockUserRoleRepo = { find: jest.fn() };
  const mockPermRepo = { find: jest.fn(), findOne: jest.fn() };
  const mockRolePermRepo = { find: jest.fn() };
  const mockCategoryRepo = {
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    count: jest.fn(),
    softDelete: jest.fn(),
  };
  const mockItemRepo = {
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    softDelete: jest.fn(),
    find: jest.fn(),
    count: jest.fn(),
  };
  const mockVersionRepo = { find: jest.fn(), findOne: jest.fn() };
  const mockRelationRepo = { find: jest.fn() };
  const mockDataSource = { transaction: jest.fn() };
  const mockTxManager = createMockTxManager();

  function makeSaToken(): string {
    return jwtService.sign({ sub: SA_USER_ID, username: 'superadmin' });
  }

  function makeEditorToken(): string {
    return jwtService.sign({ sub: EDITOR_USER_ID, username: 'editor01' });
  }

  function setupSaAuth(): void {
    mockUserRepo.findOne.mockResolvedValueOnce(makeSaUser());
    mockUserRoleRepo.find.mockResolvedValueOnce([makeSaLink()]);
    mockRoleRepo.find.mockResolvedValueOnce([makeSaRole()]);
  }

  function setupEditorAuthNoPerms(): void {
    mockUserRepo.findOne.mockResolvedValue(makeEditorUser());
    mockUserRoleRepo.find.mockResolvedValue([
      { userId: EDITOR_USER_ID, roleId: ROLE_EDITOR_ID } as SysUserRole,
    ]);
    mockRoleRepo.find.mockResolvedValue([makeEditorRole()]);
    mockRolePermRepo.find.mockResolvedValue([]);
  }

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({ secret: TEST_JWT_SECRET, signOptions: { expiresIn: '1h' } }),
      ],
      controllers: [ContentCategoriesController, ContentItemsController],
      providers: [
        AuthService,
        JwtAuthGuard,
        PermissionsGuard,
        Reflector,
        CategoriesService,
        ItemsService,
        RelationsService,
        { provide: getRepositoryToken(SysUser), useValue: mockUserRepo },
        { provide: getRepositoryToken(SysRole), useValue: mockRoleRepo },
        { provide: getRepositoryToken(SysUserRole), useValue: mockUserRoleRepo },
        { provide: getRepositoryToken(SysPermission), useValue: mockPermRepo },
        { provide: getRepositoryToken(SysRolePermission), useValue: mockRolePermRepo },
        { provide: getRepositoryToken(ContentCategory), useValue: mockCategoryRepo },
        { provide: getRepositoryToken(ContentItem), useValue: mockItemRepo },
        { provide: getRepositoryToken(ContentVersion), useValue: mockVersionRepo },
        { provide: getRepositoryToken(ContentRelation), useValue: mockRelationRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    jwtService = module.get<JwtService>(JwtService);
    const reflector = module.get<Reflector>(Reflector);
    const authService = module.get<AuthService>(AuthService);

    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalGuards(
      new JwtAuthGuard(jwtService, authService, reflector),
      new PermissionsGuard(reflector, authService),
    );
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    Object.assign(mockTxManager, createMockTxManager());
    mockTxManager.save.mockImplementation(async (_entity: unknown, obj: unknown) => obj);
    mockDataSource.transaction.mockImplementation(
      (cb: (manager: EntityManager) => Promise<unknown>) =>
        cb(mockTxManager as unknown as EntityManager),
    );
  });

  describe('GET /api/admin/content/categories', () => {
    it('无 token 返回 401', async () => {
      const res = await supertest(app.getHttpServer()).get('/api/admin/content/categories');
      expect(res.status).toBe(401);
    });

    it('无权限返回 403', async () => {
      setupEditorAuthNoPerms();
      const res = await supertest(app.getHttpServer())
        .get('/api/admin/content/categories')
        .set('Authorization', `Bearer ${makeEditorToken()}`);
      expect(res.status).toBe(403);
    });

    it('SUPER_ADMIN 返回标准分页结构', async () => {
      setupSaAuth();
      mockCategoryRepo.findAndCount.mockResolvedValueOnce([[makeCategory()], 1]);

      const res = await supertest(app.getHttpServer())
        .get('/api/admin/content/categories?page=1&pageSize=20')
        .set('Authorization', `Bearer ${makeSaToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.list).toHaveLength(1);
      expect(res.body.data.total).toBe(1);
      expect(res.body.data.page).toBe(1);
      expect(res.body.data.pageSize).toBe(20);
    });
  });

  describe('POST /api/admin/content/categories', () => {
    it('非法 content_type 返回 400', async () => {
      setupSaAuth();
      const res = await supertest(app.getHttpServer())
        .post('/api/admin/content/categories')
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({ categoryName: '非法', contentType: 'invalid_type' });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/admin/content/categories/:id', () => {
    it('有子分类时返回 409', async () => {
      setupSaAuth();
      mockCategoryRepo.findOne.mockResolvedValueOnce(makeCategory());
      mockCategoryRepo.count.mockResolvedValueOnce(1);

      const res = await supertest(app.getHttpServer())
        .delete(`/api/admin/content/categories/${CAT_ID}`)
        .set('Authorization', `Bearer ${makeSaToken()}`);

      expect(res.status).toBe(409);
    });

    it('有内容时返回 409', async () => {
      setupSaAuth();
      mockCategoryRepo.findOne.mockResolvedValueOnce(makeCategory());
      mockCategoryRepo.count.mockResolvedValueOnce(0);
      mockItemRepo.count.mockResolvedValueOnce(1);

      const res = await supertest(app.getHttpServer())
        .delete(`/api/admin/content/categories/${CAT_ID}`)
        .set('Authorization', `Bearer ${makeSaToken()}`);

      expect(res.status).toBe(409);
    });
  });

  describe('GET /api/admin/content/items', () => {
    it('无 token 返回 401', async () => {
      const res = await supertest(app.getHttpServer()).get('/api/admin/content/items');
      expect(res.status).toBe(401);
    });

    it('SUPER_ADMIN 返回标准分页结构', async () => {
      setupSaAuth();
      mockItemRepo.findAndCount.mockResolvedValueOnce([[makeItem()], 1]);

      const res = await supertest(app.getHttpServer())
        .get('/api/admin/content/items?page=1&pageSize=10')
        .set('Authorization', `Bearer ${makeSaToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(Array.isArray(res.body.data.list)).toBe(true);
      expect(res.body.data.total).toBe(1);
      expect(res.body.data.page).toBe(1);
      expect(res.body.data.pageSize).toBe(10);
    });
  });

  describe('POST /api/admin/content/items', () => {
    it('非法 content_type 返回 400', async () => {
      setupSaAuth();
      const res = await supertest(app.getHttpServer())
        .post('/api/admin/content/items')
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({ contentType: 'not_allowed', title: 'x' });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/admin/content/items/:id', () => {
    it('请求体含 status 字段被 forbidNonWhitelisted 拒绝', async () => {
      setupSaAuth();
      const res = await supertest(app.getHttpServer())
        .put(`/api/admin/content/items/${ITEM_ID}`)
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({ title: '更新标题', status: 'published' });

      expect(res.status).toBe(400);
    });

    it('SUPER_ADMIN 更新内容成功且 status 保持 draft', async () => {
      setupSaAuth();
      mockTxManager.findOne.mockResolvedValueOnce(makeItem());

      const res = await supertest(app.getHttpServer())
        .put(`/api/admin/content/items/${ITEM_ID}`)
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({ sortOrder: 3 });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.status).toBe('draft');
    });
  });

  describe('PUT /api/admin/content/items/:id/relations', () => {
    it('自关联返回 400', async () => {
      setupSaAuth();
      mockItemRepo.findOne.mockResolvedValue(makeItem());

      const res = await supertest(app.getHttpServer())
        .put(`/api/admin/content/items/${ITEM_ID}/relations`)
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({
          relations: [{ targetId: ITEM_ID, relationType: 'guide_faq' }],
        });

      expect(res.status).toBe(400);
    });

    it('重复 targetId+relationType 返回 400', async () => {
      setupSaAuth();
      const res = await supertest(app.getHttpServer())
        .put(`/api/admin/content/items/${ITEM_ID}/relations`)
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({
          relations: [
            { targetId: ITEM_TARGET_ID, relationType: 'guide_faq' },
            { targetId: ITEM_TARGET_ID, relationType: 'guide_faq' },
          ],
        });

      expect(res.status).toBe(400);
    });

    it('目标不存在返回 404', async () => {
      setupSaAuth();
      mockItemRepo.findOne
        .mockResolvedValueOnce(makeItem())
        .mockResolvedValueOnce(null);

      const res = await supertest(app.getHttpServer())
        .put(`/api/admin/content/items/${ITEM_ID}/relations`)
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({
          relations: [{ targetId: 'missing-target', relationType: 'guide_faq' }],
        });

      expect(res.status).toBe(404);
    });

    it('无权限返回 403', async () => {
      setupEditorAuthNoPerms();
      const res = await supertest(app.getHttpServer())
        .put(`/api/admin/content/items/${ITEM_ID}/relations`)
        .set('Authorization', `Bearer ${makeEditorToken()}`)
        .send({ relations: [] });

      expect(res.status).toBe(403);
    });
  });
});
