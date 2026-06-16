import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Reflector } from '@nestjs/core';
import supertest = require('supertest');
import { AuthService } from '../src/auth/auth.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../src/auth/guards/permissions.guard';
import { HomeConfigService } from '../src/home-config/home-config.service';
import { HomeConfigController } from '../src/admin-api/controllers/home-config.controller';
import { HomeModulesController } from '../src/admin-api/controllers/home-modules.controller';
import { SysUser } from '../src/database/entities/sys-user.entity';
import { SysRole } from '../src/database/entities/sys-role.entity';
import { SysUserRole } from '../src/database/entities/sys-user-role.entity';
import { SysPermission } from '../src/database/entities/sys-permission.entity';
import { SysRolePermission } from '../src/database/entities/sys-role-permission.entity';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { SEED_HOME_CONFIG_PERMISSIONS } from '../src/database/migrations/1749928800000-SeedHomeConfigPermissions';

const TEST_JWT_SECRET = 'test-jwt-secret-for-admin-home-config-spec';

const SA_USER_ID = 'user-super-001';
const EDITOR_USER_ID = 'user-editor-002';
const ROLE_SUPER_ID = 'role-super-001';
const ROLE_EDITOR_ID = 'role-editor-002';
const CONFIG_ID = 'config-001';
const MODULE_ID = 'module-001';

const PERM_CONFIG_READ = SEED_HOME_CONFIG_PERMISSIONS[0].id;
const PERM_MODULE_READ = SEED_HOME_CONFIG_PERMISSIONS[2].id;
const PERM_MODULE_CREATE = SEED_HOME_CONFIG_PERMISSIONS[3].id;
const PERM_MODULE_UPDATE = SEED_HOME_CONFIG_PERMISSIONS[4].id;
const PERM_MODULE_DELETE = SEED_HOME_CONFIG_PERMISSIONS[5].id;
const PERM_MODULE_SORT = SEED_HOME_CONFIG_PERMISSIONS[6].id;

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

describe('Admin home config API — HTTP integration', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const mockUserRepo = { findOne: jest.fn() };
  const mockRoleRepo = { find: jest.fn() };
  const mockUserRoleRepo = { find: jest.fn() };
  const mockPermRepo = { find: jest.fn() };
  const mockRolePermRepo = { find: jest.fn() };
  const mockHomeConfigService = {
    getAdminConfig: jest.fn(),
    updateAdminConfig: jest.fn(),
    listModules: jest.fn(),
    createModule: jest.fn(),
    updateModule: jest.fn(),
    sortModules: jest.fn(),
    removeModule: jest.fn(),
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
      controllers: [HomeConfigController, HomeModulesController],
      providers: [
        AuthService,
        JwtAuthGuard,
        PermissionsGuard,
        Reflector,
        { provide: HomeConfigService, useValue: mockHomeConfigService },
        { provide: getRepositoryToken(SysUser), useValue: mockUserRepo },
        { provide: getRepositoryToken(SysRole), useValue: mockRoleRepo },
        { provide: getRepositoryToken(SysUserRole), useValue: mockUserRoleRepo },
        { provide: getRepositoryToken(SysPermission), useValue: mockPermRepo },
        { provide: getRepositoryToken(SysRolePermission), useValue: mockRolePermRepo },
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

  describe('GET /api/admin/home/config', () => {
    it('未登录返回 401', async () => {
      const res = await supertest(app.getHttpServer()).get('/api/admin/home/config');
      expect(res.status).toBe(401);
    });

    it('无权限返回 403', async () => {
      setupEditorAuthNoPerms();
      const res = await supertest(app.getHttpServer())
        .get('/api/admin/home/config')
        .set('Authorization', `Bearer ${makeEditorToken()}`);
      expect(res.status).toBe(403);
    });

    it('有权限可访问且不返回审计字段', async () => {
      setupSaAuth();
      mockHomeConfigService.getAdminConfig.mockResolvedValueOnce({
        id: CONFIG_ID,
        configName: 'default',
        status: 'draft',
        currentVersionId: null,
        currentVersion: null,
        draftVersion: {
          id: 'v1',
          versionNo: 1,
          title: '标题',
          subtitle: null,
          status: 'draft',
          topBannerJson: [],
          themeJson: {},
          changeRemark: null,
        },
        updatedAt: new Date('2024-01-01'),
      });

      const res = await supertest(app.getHttpServer())
        .get('/api/admin/home/config')
        .set('Authorization', `Bearer ${makeSaToken()}`);
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.id).toBe(CONFIG_ID);
      expect(res.body.data).not.toHaveProperty('createdBy');
      expect(res.body.data).not.toHaveProperty('updatedBy');
      expect(res.body.data.draftVersion).not.toHaveProperty('createdBy');
    });
  });

  describe('PUT /api/admin/home/config', () => {
    it('home:config:update 权限校验', async () => {
      setupEditorAuthWithPerm(PERM_CONFIG_READ, 'home:config:read');
      const res = await supertest(app.getHttpServer())
        .put('/api/admin/home/config')
        .set('Authorization', `Bearer ${makeEditorToken()}`)
        .send({ title: '标题' });
      expect(res.status).toBe(403);
    });

    it('有权限可更新', async () => {
      setupSaAuth();
      mockHomeConfigService.updateAdminConfig.mockResolvedValueOnce({
        id: CONFIG_ID,
        configName: 'default',
        status: 'draft',
        currentVersionId: null,
        currentVersion: null,
        draftVersion: {
          id: 'v1',
          versionNo: 1,
          title: '标题',
          subtitle: null,
          status: 'draft',
          topBannerJson: ['a'],
          themeJson: { color: '#000' },
          changeRemark: null,
        },
        updatedAt: new Date('2024-01-02'),
      });

      const res = await supertest(app.getHttpServer())
        .put('/api/admin/home/config')
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({ title: '标题', topBannerJson: ['a'], themeJson: { color: '#000' } });
      expect(res.status).toBe(200);
      expect(mockHomeConfigService.updateAdminConfig).toHaveBeenCalledWith(
        expect.objectContaining({ title: '标题' }),
        SA_USER_ID,
      );
    });
  });

  describe('GET /api/admin/home/modules', () => {
    it('有 home:module:read 权限可访问', async () => {
      setupEditorAuthWithPerm(PERM_MODULE_READ, 'home:module:read');
      mockHomeConfigService.listModules.mockResolvedValueOnce({
        list: [{
          id: MODULE_ID,
          moduleCode: 'guide_dept',
          moduleName: '按部门查',
          moduleType: 'card',
          icon: null,
          color: null,
          layoutType: null,
          isVisible: true,
          sortOrder: 1,
          targetType: 'route',
          targetValue: '/guide/depts',
        }],
      });

      const res = await supertest(app.getHttpServer())
        .get('/api/admin/home/modules')
        .set('Authorization', `Bearer ${makeEditorToken()}`);
      expect(res.status).toBe(200);
      expect(res.body.data.list).toHaveLength(1);
      expect(res.body.data.list[0]).not.toHaveProperty('homeConfigVersionId');
      expect(res.body.data.list[0]).not.toHaveProperty('deletedAt');
    });
  });

  describe('PUT /api/admin/home/modules/sort', () => {
    it('/modules/sort 不被 :id 捕获，调用 sortModules', async () => {
      setupEditorAuthWithPerm(PERM_MODULE_SORT, 'home:module:sort');
      mockHomeConfigService.sortModules.mockResolvedValueOnce({ list: [] });

      const res = await supertest(app.getHttpServer())
        .put('/api/admin/home/modules/sort')
        .set('Authorization', `Bearer ${makeEditorToken()}`)
        .send({ items: [{ id: MODULE_ID, sortOrder: 1 }] });
      expect(res.status).toBe(200);
      expect(mockHomeConfigService.sortModules).toHaveBeenCalled();
      expect(mockHomeConfigService.updateModule).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/admin/home/modules', () => {
    it('无 home:module:create 权限返回 403', async () => {
      setupEditorAuthWithPerm(PERM_MODULE_READ, 'home:module:read');
      const res = await supertest(app.getHttpServer())
        .post('/api/admin/home/modules')
        .set('Authorization', `Bearer ${makeEditorToken()}`)
        .send({
          moduleCode: 'guide_dept',
          moduleName: '按部门查',
          moduleType: 'card',
          targetType: 'route',
          targetValue: '/guide/depts',
        });
      expect(res.status).toBe(403);
    });

    it('isVisible: true 校验通过并传入 service 为 boolean', async () => {
      setupEditorAuthWithPerm(PERM_MODULE_CREATE, 'home:module:create');
      mockHomeConfigService.createModule.mockResolvedValueOnce({
        id: MODULE_ID,
        moduleCode: 'guide_dept',
        moduleName: '按部门查',
        moduleType: 'card',
        icon: null,
        color: null,
        layoutType: null,
        isVisible: true,
        sortOrder: 1,
        targetType: 'route',
        targetValue: '/guide/depts',
      });

      const res = await supertest(app.getHttpServer())
        .post('/api/admin/home/modules')
        .set('Authorization', `Bearer ${makeEditorToken()}`)
        .send({
          moduleCode: 'guide_dept',
          moduleName: '按部门查',
          moduleType: 'card',
          targetType: 'route',
          targetValue: '/guide/depts',
          isVisible: true,
        });
      expect(res.status).toBe(201);
      expect(mockHomeConfigService.createModule).toHaveBeenCalledWith(
        expect.objectContaining({ isVisible: true }),
      );
      expect(typeof mockHomeConfigService.createModule.mock.calls[0][0].isVisible).toBe('boolean');
    });

    it('isVisible: false 校验通过并传入 service 为 boolean', async () => {
      setupEditorAuthWithPerm(PERM_MODULE_CREATE, 'home:module:create');
      mockHomeConfigService.createModule.mockResolvedValueOnce({
        id: MODULE_ID,
        moduleCode: 'hidden_card',
        moduleName: '隐藏卡片',
        moduleType: 'card',
        icon: null,
        color: null,
        layoutType: null,
        isVisible: false,
        sortOrder: 1,
        targetType: 'route',
        targetValue: '/hidden',
      });

      const res = await supertest(app.getHttpServer())
        .post('/api/admin/home/modules')
        .set('Authorization', `Bearer ${makeEditorToken()}`)
        .send({
          moduleCode: 'hidden_card',
          moduleName: '隐藏卡片',
          moduleType: 'card',
          targetType: 'route',
          targetValue: '/hidden',
          isVisible: false,
        });
      expect(res.status).toBe(201);
      expect(mockHomeConfigService.createModule).toHaveBeenCalledWith(
        expect.objectContaining({ isVisible: false }),
      );
    });
  });

  describe('PUT /api/admin/home/modules/:id', () => {
    it('isVisible: false 校验通过并传入 service 为 boolean', async () => {
      setupEditorAuthWithPerm(PERM_MODULE_UPDATE, 'home:module:update');
      mockHomeConfigService.updateModule.mockResolvedValueOnce({
        id: MODULE_ID,
        moduleCode: 'guide_dept',
        moduleName: '按部门查',
        moduleType: 'card',
        icon: null,
        color: null,
        layoutType: null,
        isVisible: false,
        sortOrder: 1,
        targetType: 'route',
        targetValue: '/guide/depts',
      });

      const res = await supertest(app.getHttpServer())
        .put(`/api/admin/home/modules/${MODULE_ID}`)
        .set('Authorization', `Bearer ${makeEditorToken()}`)
        .send({ isVisible: false });
      expect(res.status).toBe(200);
      expect(mockHomeConfigService.updateModule).toHaveBeenCalledWith(
        MODULE_ID,
        expect.objectContaining({ isVisible: false }),
      );
    });
  });

  describe('DELETE /api/admin/home/modules/:id', () => {
    it('home:module:delete 权限可删除', async () => {
      setupEditorAuthWithPerm(PERM_MODULE_DELETE, 'home:module:delete');
      mockHomeConfigService.removeModule.mockResolvedValueOnce(undefined);

      const res = await supertest(app.getHttpServer())
        .delete(`/api/admin/home/modules/${MODULE_ID}`)
        .set('Authorization', `Bearer ${makeEditorToken()}`);
      expect(res.status).toBe(200);
      expect(mockHomeConfigService.removeModule).toHaveBeenCalledWith(MODULE_ID);
    });
  });
});
