import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Reflector } from '@nestjs/core';
import { QueryFailedError } from 'typeorm';
import supertest = require('supertest');
import { AuthService } from '../src/auth/auth.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../src/auth/guards/permissions.guard';
import { ItemConfigService } from '../src/guide-config/item-config.service';
import { GuideItemConfigsController } from '../src/admin-api/controllers/guide-item-configs.controller';
import { GuideItemConfig } from '../src/database/entities/guide-item-config.entity';
import { SysUser } from '../src/database/entities/sys-user.entity';
import { SysRole } from '../src/database/entities/sys-role.entity';
import { SysUserRole } from '../src/database/entities/sys-user-role.entity';
import { SysPermission } from '../src/database/entities/sys-permission.entity';
import { SysRolePermission } from '../src/database/entities/sys-role-permission.entity';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { SEED_GUIDE_ITEM_PERMISSIONS } from '../src/database/migrations/1749914400000-SeedGuideItemPermissions';
import { serializeRelatedIds } from '../src/guide-config/utils/related-ids.util';

const TEST_JWT_SECRET = 'test-jwt-secret-for-guide-item-config-spec';

const SA_USER_ID = 'user-super-001';
const EDITOR_USER_ID = 'user-editor-002';
const ROLE_SUPER_ID = 'role-super-001';
const ROLE_EDITOR_ID = 'role-editor-002';
const ITEM_ID = 'item-config-001';
const PLATFORM_ITEM_ID = 'PLAT-ITEM-001';
const POLICY_ID_A = '11111111-1111-4111-8111-111111111111';
const POLICY_ID_B = '22222222-2222-4222-8222-222222222222';
const FAQ_ID_A = '33333333-3333-4333-8333-333333333333';

const PERM_ITEM_READ = SEED_GUIDE_ITEM_PERMISSIONS[0].id;
const PERM_ITEM_CREATE = SEED_GUIDE_ITEM_PERMISSIONS[1].id;
const PERM_ITEM_UPDATE = SEED_GUIDE_ITEM_PERMISSIONS[2].id;
const PERM_ITEM_DELETE = SEED_GUIDE_ITEM_PERMISSIONS[3].id;

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

function makeItem(overrides: Partial<GuideItemConfig> = {}): GuideItemConfig {
  return {
    id: ITEM_ID,
    platformItemId: PLATFORM_ITEM_ID,
    itemName: '营业执照办理',
    displayName: '办执照',
    deptCode: 'SCJGJ',
    themeCode: 'KBQY',
    isHot: 1,
    isRecommend: 0,
    isVisible: 1,
    sortOrder: 0,
    relatedPolicyIds: serializeRelatedIds([POLICY_ID_B, POLICY_ID_A]),
    relatedFaqIds: serializeRelatedIds([FAQ_ID_A]),
    createdAt: new Date('2024-06-01'),
    updatedAt: new Date('2024-06-01'),
    deletedAt: null,
    ...overrides,
  } as GuideItemConfig;
}

describe('ItemConfigService — unit', () => {
  let service: ItemConfigService;
  const mockRepo = {
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softDelete: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ItemConfigService,
        { provide: getRepositoryToken(GuideItemConfig), useValue: mockRepo },
      ],
    }).compile();
    service = module.get<ItemConfigService>(ItemConfigService);
  });

  it('list() 不暴露 deletedAt 和内部 text 字段', async () => {
    mockRepo.findAndCount.mockResolvedValueOnce([[makeItem()], 1]);
    const result = await service.list({ page: 1, pageSize: 20 });
    expect(result.list[0]).not.toHaveProperty('deletedAt');
    expect(result.list[0]).not.toHaveProperty('updatedAt');
    expect(Array.isArray(result.list[0].relatedPolicyIds)).toBe(true);
    expect(result.list[0].relatedPolicyIds).toEqual([POLICY_ID_A, POLICY_ID_B]);
    expect(result.list[0].relatedFaqIds).toEqual([FAQ_ID_A]);
  });

  it('create() 保存规范化 deptCode/themeCode 和大写编码查重', async () => {
    mockRepo.findOne.mockResolvedValueOnce(null);
    mockRepo.create.mockImplementation((data) => data);
    mockRepo.save.mockImplementation(async (row) => ({ id: ITEM_ID, ...row }));

    await service.create({
      platformItemId: ' PLAT-NEW ',
      itemName: '事项',
      displayName: '展示',
      deptCode: ' scjgj ',
      themeCode: 'kbqy',
      relatedPolicyIds: [POLICY_ID_B, POLICY_ID_A, POLICY_ID_B],
    });

    expect(mockRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        platformItemId: 'PLAT-NEW',
        deptCode: 'SCJGJ',
        themeCode: 'KBQY',
        relatedPolicyIds: serializeRelatedIds([POLICY_ID_A, POLICY_ID_B]),
      }),
    );
  });

  it('create() platformItemId 重复返回 409', async () => {
    mockRepo.findOne.mockResolvedValueOnce(makeItem());
    await expect(
      service.create({
        platformItemId: PLATFORM_ITEM_ID,
        itemName: '事项',
        displayName: '展示',
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(mockRepo.findOne).toHaveBeenCalledWith({
      where: { platformItemId: PLATFORM_ITEM_ID },
      withDeleted: true,
    });
  });

  it('create() 逻辑删除后相同 platformItemId 仍返回 409', async () => {
    mockRepo.findOne.mockResolvedValueOnce(
      makeItem({ deletedAt: new Date('2024-07-01') }),
    );
    await expect(
      service.create({
        platformItemId: PLATFORM_ITEM_ID,
        itemName: '事项',
        displayName: '展示',
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('create() 并发唯一冲突返回 409', async () => {
    mockRepo.findOne.mockResolvedValueOnce(null);
    mockRepo.create.mockReturnValueOnce(makeItem({ platformItemId: 'PLAT-NEW' }));
    const dupError = new QueryFailedError(
      'INSERT',
      [],
      Object.assign(new Error('dup'), { errno: 1062 }),
    );
    mockRepo.save.mockRejectedValueOnce(dupError);
    await expect(
      service.create({
        platformItemId: 'PLAT-NEW',
        itemName: '事项',
        displayName: '展示',
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('list() 支持筛选条件', async () => {
    mockRepo.findAndCount.mockResolvedValueOnce([[], 0]);
    await service.list({
      page: 1,
      pageSize: 10,
      deptCode: 'SCJGJ',
      themeCode: 'KBQY',
      isHot: 1,
      isRecommend: 0,
      isVisible: 1,
    });
    expect(mockRepo.findAndCount).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          deptCode: 'SCJGJ',
          themeCode: 'KBQY',
          isHot: 1,
          isRecommend: 0,
          isVisible: 1,
        },
      }),
    );
  });
});

describe('Guide item config admin API — HTTP integration', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const mockUserRepo = { findOne: jest.fn() };
  const mockRoleRepo = { find: jest.fn() };
  const mockUserRoleRepo = { find: jest.fn() };
  const mockPermRepo = { find: jest.fn() };
  const mockRolePermRepo = { find: jest.fn() };
  const mockItemRepo = {
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softDelete: jest.fn(),
  };

  function makeSaToken(): string {
    return jwtService.sign({ sub: SA_USER_ID, username: 'superadmin' });
  }

  function makeEditorToken(): string {
    return jwtService.sign({ sub: EDITOR_USER_ID, username: 'editor01' });
  }

  function setupSaAuth(): void {
    mockUserRepo.findOne.mockResolvedValueOnce(makeSaUser());
    mockUserRoleRepo.find.mockResolvedValueOnce([
      { userId: SA_USER_ID, roleId: ROLE_SUPER_ID } as SysUserRole,
    ]);
    mockRoleRepo.find.mockResolvedValueOnce([makeSaRole()]);
  }

  function setupEditorAuthWithPerm(permissionId: string, permissionCode: string): void {
    mockUserRepo.findOne.mockResolvedValue(makeEditorUser());
    mockUserRoleRepo.find.mockResolvedValue([
      { userId: EDITOR_USER_ID, roleId: ROLE_EDITOR_ID } as SysUserRole,
    ]);
    mockRoleRepo.find.mockResolvedValue([makeEditorRole()]);
    mockRolePermRepo.find.mockResolvedValue([
      { roleId: ROLE_EDITOR_ID, permissionId },
    ]);
    mockPermRepo.find.mockResolvedValue([
      { id: permissionId, permissionCode, status: 'active' },
    ]);
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
      controllers: [GuideItemConfigsController],
      providers: [
        AuthService,
        JwtAuthGuard,
        PermissionsGuard,
        Reflector,
        ItemConfigService,
        { provide: getRepositoryToken(SysUser), useValue: mockUserRepo },
        { provide: getRepositoryToken(SysRole), useValue: mockRoleRepo },
        { provide: getRepositoryToken(SysUserRole), useValue: mockUserRoleRepo },
        { provide: getRepositoryToken(SysPermission), useValue: mockPermRepo },
        { provide: getRepositoryToken(SysRolePermission), useValue: mockRolePermRepo },
        { provide: getRepositoryToken(GuideItemConfig), useValue: mockItemRepo },
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
  });

  describe('GET /api/admin/guide/item-configs', () => {
    it('无 token 返回 401', async () => {
      const res = await supertest(app.getHttpServer()).get('/api/admin/guide/item-configs');
      expect(res.status).toBe(401);
    });

    it('无权限返回 403', async () => {
      setupEditorAuthNoPerms();
      const res = await supertest(app.getHttpServer())
        .get('/api/admin/guide/item-configs')
        .set('Authorization', `Bearer ${makeEditorToken()}`);
      expect(res.status).toBe(403);
    });

    it('SUPER_ADMIN 返回分页结构', async () => {
      setupSaAuth();
      mockItemRepo.findAndCount.mockResolvedValueOnce([[makeItem()], 1]);
      const res = await supertest(app.getHttpServer())
        .get('/api/admin/guide/item-configs?page=1&pageSize=20')
        .set('Authorization', `Bearer ${makeSaToken()}`);
      expect(res.status).toBe(200);
      expect(res.body.data.list[0].relatedPolicyIds).toEqual([POLICY_ID_A, POLICY_ID_B]);
      expect(res.body.data.list[0]).not.toHaveProperty('deletedAt');
    });

    it('deptCode/themeCode 小写和空格规范化后传入 repository', async () => {
      setupSaAuth();
      mockItemRepo.findAndCount.mockResolvedValueOnce([[], 0]);
      const res = await supertest(app.getHttpServer())
        .get('/api/admin/guide/item-configs')
        .query({ deptCode: ' scjgj ', themeCode: ' kbqy ' })
        .set('Authorization', `Bearer ${makeSaToken()}`);
      expect(res.status).toBe(200);
      expect(mockItemRepo.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deptCode: 'SCJGJ', themeCode: 'KBQY' }),
        }),
      );
    });

    it('deptCode 空字符串返回 400', async () => {
      setupSaAuth();
      const res = await supertest(app.getHttpServer())
        .get('/api/admin/guide/item-configs')
        .query({ deptCode: '   ' })
        .set('Authorization', `Bearer ${makeSaToken()}`);
      expect(res.status).toBe(400);
    });

    it('deptCode 超长返回 400', async () => {
      setupSaAuth();
      const res = await supertest(app.getHttpServer())
        .get('/api/admin/guide/item-configs')
        .query({ deptCode: 'A'.repeat(51) })
        .set('Authorization', `Bearer ${makeSaToken()}`);
      expect(res.status).toBe(400);
    });

    it('deptCode 为数组时返回 400', async () => {
      setupSaAuth();
      const res = await supertest(app.getHttpServer())
        .get('/api/admin/guide/item-configs')
        .query({ deptCode: ['SCJGJ', 'OTHER'] })
        .set('Authorization', `Bearer ${makeSaToken()}`);
      expect(res.status).toBe(400);
    });

    it('deptCode 为对象时返回 400', async () => {
      setupSaAuth();
      const res = await supertest(app.getHttpServer())
        .get('/api/admin/guide/item-configs?deptCode[foo]=bar')
        .set('Authorization', `Bearer ${makeSaToken()}`);
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/admin/guide/item-configs', () => {
    it('空白 platformItemId 返回 400', async () => {
      setupSaAuth();
      const res = await supertest(app.getHttpServer())
        .post('/api/admin/guide/item-configs')
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({
          platformItemId: '   ',
          itemName: '事项',
          displayName: '展示',
        });
      expect(res.status).toBe(400);
    });

    it('非法 isHot 返回 400', async () => {
      setupSaAuth();
      const res = await supertest(app.getHttpServer())
        .post('/api/admin/guide/item-configs')
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({
          platformItemId: 'PLAT-NEW',
          itemName: '事项',
          displayName: '展示',
          isHot: 2,
        });
      expect(res.status).toBe(400);
    });

    it('非法关联 ID 返回 400', async () => {
      setupSaAuth();
      const res = await supertest(app.getHttpServer())
        .post('/api/admin/guide/item-configs')
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({
          platformItemId: 'PLAT-NEW',
          itemName: '事项',
          displayName: '展示',
          relatedPolicyIds: ['not-a-uuid'],
        });
      expect(res.status).toBe(400);
    });

    it('未知字段返回 400', async () => {
      setupSaAuth();
      const res = await supertest(app.getHttpServer())
        .post('/api/admin/guide/item-configs')
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({
          platformItemId: 'PLAT-NEW',
          itemName: '事项',
          displayName: '展示',
          extra: true,
        });
      expect(res.status).toBe(400);
    });

    it('platformItemId 重复返回 409', async () => {
      setupSaAuth();
      mockItemRepo.findOne.mockResolvedValueOnce(makeItem());
      const res = await supertest(app.getHttpServer())
        .post('/api/admin/guide/item-configs')
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({
          platformItemId: PLATFORM_ITEM_ID,
          itemName: '事项',
          displayName: '展示',
        });
      expect(res.status).toBe(409);
    });

    it('guide:item:create 权限允许创建并规范化编码', async () => {
      setupEditorAuthWithPerm(PERM_ITEM_CREATE, 'guide:item:create');
      mockItemRepo.findOne.mockResolvedValueOnce(null);
      const created = makeItem({
        id: 'item-new',
        platformItemId: 'PLAT-NEW',
        deptCode: 'SCJGJ',
        themeCode: 'KBQY',
      });
      mockItemRepo.create.mockReturnValueOnce(created);
      mockItemRepo.save.mockResolvedValueOnce(created);

      const res = await supertest(app.getHttpServer())
        .post('/api/admin/guide/item-configs')
        .set('Authorization', `Bearer ${makeEditorToken()}`)
        .send({
          platformItemId: ' PLAT-NEW ',
          itemName: '事项',
          displayName: '展示',
          deptCode: ' scjgj ',
          themeCode: 'kbqy',
        });
      expect(res.status).toBe(201);
      expect(mockItemRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ deptCode: 'SCJGJ', themeCode: 'KBQY', platformItemId: 'PLAT-NEW' }),
      );
    });

    it('重复关联 ID 可成功创建并去重排序存储', async () => {
      setupSaAuth();
      mockItemRepo.findOne.mockResolvedValueOnce(null);
      mockItemRepo.create.mockImplementation((data) => data);
      mockItemRepo.save.mockImplementation(async (row) => ({ id: 'item-new', ...row }));

      const res = await supertest(app.getHttpServer())
        .post('/api/admin/guide/item-configs')
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({
          platformItemId: 'PLAT-DUP-IDS',
          itemName: '事项',
          displayName: '展示',
          relatedPolicyIds: [POLICY_ID_B, POLICY_ID_A, POLICY_ID_B],
        });
      expect(res.status).toBe(201);
      expect(mockItemRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          relatedPolicyIds: serializeRelatedIds([POLICY_ID_A, POLICY_ID_B]),
        }),
      );
    });

    it('空数组关联 ID 存储为 null', async () => {
      setupSaAuth();
      mockItemRepo.findOne.mockResolvedValueOnce(null);
      mockItemRepo.create.mockImplementation((data) => data);
      mockItemRepo.save.mockImplementation(async (row) => ({ id: 'item-new', ...row }));

      const res = await supertest(app.getHttpServer())
        .post('/api/admin/guide/item-configs')
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({
          platformItemId: 'PLAT-EMPTY-IDS',
          itemName: '事项',
          displayName: '展示',
          relatedPolicyIds: [],
        });
      expect(res.status).toBe(201);
      expect(mockItemRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ relatedPolicyIds: null }),
      );
    });
  });

  describe('PUT /api/admin/guide/item-configs/:id', () => {
    it('itemName:null 返回 400', async () => {
      setupSaAuth();
      const res = await supertest(app.getHttpServer())
        .put(`/api/admin/guide/item-configs/${ITEM_ID}`)
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({ itemName: null });
      expect(res.status).toBe(400);
    });

    it('isVisible:null 返回 400', async () => {
      setupSaAuth();
      const res = await supertest(app.getHttpServer())
        .put(`/api/admin/guide/item-configs/${ITEM_ID}`)
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({ isVisible: null });
      expect(res.status).toBe(400);
    });

    it('platformItemId 不可更新', async () => {
      setupSaAuth();
      const res = await supertest(app.getHttpServer())
        .put(`/api/admin/guide/item-configs/${ITEM_ID}`)
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({ platformItemId: 'CHANGED' });
      expect(res.status).toBe(400);
    });

    it('记录不存在返回 404', async () => {
      setupSaAuth();
      mockItemRepo.findOne.mockResolvedValueOnce(null);
      const res = await supertest(app.getHttpServer())
        .put(`/api/admin/guide/item-configs/missing-id`)
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({ displayName: '新名' });
      expect(res.status).toBe(404);
    });

    it('deptCode:null 允许清空', async () => {
      setupSaAuth();
      const item = makeItem();
      mockItemRepo.findOne.mockResolvedValueOnce(item);
      mockItemRepo.save.mockImplementation(async (row) => row);
      const res = await supertest(app.getHttpServer())
        .put(`/api/admin/guide/item-configs/${ITEM_ID}`)
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({ deptCode: null });
      expect(res.status).toBe(200);
      expect(mockItemRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ deptCode: null }),
      );
    });

    it('guide:item:update 权限校验', async () => {
      setupEditorAuthWithPerm(PERM_ITEM_READ, 'guide:item:read');
      const res = await supertest(app.getHttpServer())
        .put(`/api/admin/guide/item-configs/${ITEM_ID}`)
        .set('Authorization', `Bearer ${makeEditorToken()}`)
        .send({ displayName: '新名' });
      expect(res.status).toBe(403);
    });

    it('重复关联 ID 可成功更新并去重排序存储', async () => {
      setupSaAuth();
      const item = makeItem();
      mockItemRepo.findOne.mockResolvedValueOnce(item);
      mockItemRepo.save.mockImplementation(async (row) => row);

      const res = await supertest(app.getHttpServer())
        .put(`/api/admin/guide/item-configs/${ITEM_ID}`)
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({ relatedPolicyIds: [POLICY_ID_B, POLICY_ID_A, POLICY_ID_B] });
      expect(res.status).toBe(200);
      expect(mockItemRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          relatedPolicyIds: serializeRelatedIds([POLICY_ID_A, POLICY_ID_B]),
        }),
      );
    });

    it('relatedPolicyIds:null 返回 400', async () => {
      setupSaAuth();
      const res = await supertest(app.getHttpServer())
        .put(`/api/admin/guide/item-configs/${ITEM_ID}`)
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({ relatedPolicyIds: null });
      expect(res.status).toBe(400);
    });

    it('空数组清空关联 ID', async () => {
      setupSaAuth();
      const item = makeItem();
      mockItemRepo.findOne.mockResolvedValueOnce(item);
      mockItemRepo.save.mockImplementation(async (row) => row);

      const res = await supertest(app.getHttpServer())
        .put(`/api/admin/guide/item-configs/${ITEM_ID}`)
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({ relatedPolicyIds: [] });
      expect(res.status).toBe(200);
      expect(mockItemRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ relatedPolicyIds: null }),
      );
    });

    it('省略 relatedPolicyIds 不修改原值', async () => {
      setupSaAuth();
      const item = makeItem();
      const originalSerialized = item.relatedPolicyIds;
      mockItemRepo.findOne.mockResolvedValueOnce(item);
      mockItemRepo.save.mockImplementation(async (row) => row);

      const res = await supertest(app.getHttpServer())
        .put(`/api/admin/guide/item-configs/${ITEM_ID}`)
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({ displayName: '新展示名' });
      expect(res.status).toBe(200);
      expect(mockItemRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ relatedPolicyIds: originalSerialized }),
      );
    });
  });

  describe('DELETE /api/admin/guide/item-configs/:id', () => {
    it('逻辑删除', async () => {
      setupSaAuth();
      mockItemRepo.findOne.mockResolvedValueOnce(makeItem());
      mockItemRepo.softDelete.mockResolvedValueOnce(undefined);
      const res = await supertest(app.getHttpServer())
        .delete(`/api/admin/guide/item-configs/${ITEM_ID}`)
        .set('Authorization', `Bearer ${makeSaToken()}`);
      expect(res.status).toBe(200);
      expect(mockItemRepo.softDelete).toHaveBeenCalledWith(ITEM_ID);
    });

    it('guide:item:delete 权限校验', async () => {
      setupEditorAuthWithPerm(PERM_ITEM_READ, 'guide:item:read');
      const res = await supertest(app.getHttpServer())
        .delete(`/api/admin/guide/item-configs/${ITEM_ID}`)
        .set('Authorization', `Bearer ${makeEditorToken()}`);
      expect(res.status).toBe(403);
    });
  });
});
