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
import { DeptMappingService } from '../src/guide-config/dept-mapping.service';
import { ThemeMappingService } from '../src/guide-config/theme-mapping.service';
import { GuideDeptsController } from '../src/admin-api/controllers/guide-depts.controller';
import { GuideThemesController } from '../src/admin-api/controllers/guide-themes.controller';
import { GuideDeptMapping } from '../src/database/entities/guide-dept-mapping.entity';
import { GuideThemeMapping } from '../src/database/entities/guide-theme-mapping.entity';
import { SysUser } from '../src/database/entities/sys-user.entity';
import { SysRole } from '../src/database/entities/sys-role.entity';
import { SysUserRole } from '../src/database/entities/sys-user-role.entity';
import { SysPermission } from '../src/database/entities/sys-permission.entity';
import { SysRolePermission } from '../src/database/entities/sys-role-permission.entity';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { SEED_GUIDE_PERMISSIONS } from '../src/database/migrations/1749898800000-SeedGuidePermissions';

const TEST_JWT_SECRET = 'test-jwt-secret-for-guide-config-spec';

const SA_USER_ID = 'user-super-001';
const EDITOR_USER_ID = 'user-editor-002';
const REVIEWER_USER_ID = 'user-reviewer-003';
const ROLE_SUPER_ID = 'role-super-001';
const ROLE_EDITOR_ID = 'role-editor-002';
const ROLE_REVIEWER_ID = 'role-reviewer-003';
const DEPT_ID = 'dept-001';
const THEME_ID = 'theme-001';

const PERM_GUIDE_DEPT_READ = SEED_GUIDE_PERMISSIONS[0].id;
const PERM_GUIDE_DEPT_CREATE = SEED_GUIDE_PERMISSIONS[1].id;
const PERM_GUIDE_DEPT_UPDATE = SEED_GUIDE_PERMISSIONS[2].id;
const PERM_GUIDE_DEPT_DELETE = SEED_GUIDE_PERMISSIONS[3].id;
const PERM_GUIDE_THEME_READ = SEED_GUIDE_PERMISSIONS[4].id;
const PERM_GUIDE_THEME_CREATE = SEED_GUIDE_PERMISSIONS[5].id;
const PERM_GUIDE_THEME_UPDATE = SEED_GUIDE_PERMISSIONS[6].id;
const PERM_GUIDE_THEME_DELETE = SEED_GUIDE_PERMISSIONS[7].id;

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

function makeReviewerUser(): SysUser {
  return {
    id: REVIEWER_USER_ID, username: 'reviewer01', passwordHash: '',
    realName: '审核员', mobile: null, email: null, status: 'active',
    lastLoginAt: null, createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03'), deletedAt: null,
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

function makeReviewerRole(): SysRole {
  return {
    id: ROLE_REVIEWER_ID, roleCode: 'PUBLISH_REVIEWER', roleName: '审核发布员',
    description: null, status: 'active',
    createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01'), deletedAt: null,
  } as SysRole;
}

function makeDept(overrides: Partial<GuideDeptMapping> = {}): GuideDeptMapping {
  return {
    id: DEPT_ID,
    deptName: '市场监管局',
    deptCode: 'SCJGJ',
    displayName: '市监局',
    icon: null,
    floorText: '2楼',
    areaText: 'A区',
    isVisible: 1,
    sortOrder: 0,
    status: 'active',
    createdAt: new Date('2024-06-01'),
    updatedAt: new Date('2024-06-01'),
    deletedAt: null,
    ...overrides,
  } as GuideDeptMapping;
}

function makeTheme(overrides: Partial<GuideThemeMapping> = {}): GuideThemeMapping {
  return {
    id: THEME_ID,
    themeName: '开办企业',
    themeCode: 'KBQY',
    platformParamJson: '{"type":"kbqy"}',
    icon: null,
    isVisible: 1,
    sortOrder: 0,
    createdAt: new Date('2024-06-01'),
    updatedAt: new Date('2024-06-01'),
    deletedAt: null,
    ...overrides,
  } as GuideThemeMapping;
}

describe('DeptMappingService — unit', () => {
  let service: DeptMappingService;
  const mockDeptRepo = {
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
        DeptMappingService,
        { provide: getRepositoryToken(GuideDeptMapping), useValue: mockDeptRepo },
      ],
    }).compile();
    service = module.get<DeptMappingService>(DeptMappingService);
  });

  it('list() 返回分页列表且不暴露 deletedAt', async () => {
    mockDeptRepo.findAndCount.mockResolvedValueOnce([[makeDept()], 1]);
    const result = await service.list({ page: 1, pageSize: 20 });
    expect(result.total).toBe(1);
    expect(result.list[0]).not.toHaveProperty('deletedAt');
    expect(result.list[0].deptCode).toBe('SCJGJ');
  });

  it('create() 有效记录编码重复返回 409', async () => {
    mockDeptRepo.findOne.mockResolvedValueOnce(makeDept());
    await expect(
      service.create({
        deptName: '市场监管局',
        deptCode: 'SCJGJ',
        displayName: '市监局',
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(mockDeptRepo.findOne).toHaveBeenCalledWith({
      where: { deptCode: 'SCJGJ' },
      withDeleted: true,
    });
  });

  it('create() 已逻辑删除的相同编码仍返回 409', async () => {
    mockDeptRepo.findOne.mockResolvedValueOnce(
      makeDept({ deletedAt: new Date('2024-07-01') }),
    );
    await expect(
      service.create({
        deptName: '市场监管局',
        deptCode: 'SCJGJ',
        displayName: '市监局',
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('create() 并发唯一冲突最终返回 409 而非 500', async () => {
    mockDeptRepo.findOne.mockResolvedValueOnce(null);
    const created = makeDept({ id: 'dept-new', deptCode: 'NEWDEPT' });
    mockDeptRepo.create.mockReturnValueOnce(created);
    const dupError = new QueryFailedError(
      'INSERT',
      [],
      Object.assign(new Error('Duplicate entry'), { errno: 1062, code: 'ER_DUP_ENTRY' }),
    );
    mockDeptRepo.save.mockRejectedValueOnce(dupError);

    await expect(
      service.create({
        deptName: '新部门',
        deptCode: 'NEWDEPT',
        displayName: '新部门',
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('create() 保存规范化大写编码', async () => {
    mockDeptRepo.findOne.mockResolvedValueOnce(null);
    const created = makeDept({ deptCode: 'CODE_A' });
    mockDeptRepo.create.mockImplementation((data) => data);
    mockDeptRepo.save.mockResolvedValueOnce(created);

    await service.create({
      deptName: '部门A',
      deptCode: ' code_a ',
      displayName: '部门A展示',
    });

    expect(mockDeptRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ deptCode: 'CODE_A' }),
    );
    expect(mockDeptRepo.findOne).toHaveBeenCalledWith({
      where: { deptCode: 'CODE_A' },
      withDeleted: true,
    });
  });

  it('create() 大小写不同视为同一编码返回 409', async () => {
    mockDeptRepo.findOne.mockResolvedValueOnce(makeDept({ deptCode: 'CODE_A' }));
    await expect(
      service.create({
        deptName: '部门B',
        deptCode: 'code_a',
        displayName: '部门B',
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(mockDeptRepo.findOne).toHaveBeenCalledWith({
      where: { deptCode: 'CODE_A' },
      withDeleted: true,
    });
  });

  it('remove() 执行逻辑删除', async () => {
    mockDeptRepo.findOne.mockResolvedValueOnce(makeDept());
    mockDeptRepo.softDelete.mockResolvedValueOnce(undefined);
    await service.remove(DEPT_ID);
    expect(mockDeptRepo.softDelete).toHaveBeenCalledWith(DEPT_ID);
  });
});

describe('ThemeMappingService — unit', () => {
  let service: ThemeMappingService;
  const mockThemeRepo = {
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
        ThemeMappingService,
        { provide: getRepositoryToken(GuideThemeMapping), useValue: mockThemeRepo },
      ],
    }).compile();
    service = module.get<ThemeMappingService>(ThemeMappingService);
  });

  it('create() 有效记录编码重复返回 409', async () => {
    mockThemeRepo.findOne.mockResolvedValueOnce(makeTheme());
    await expect(
      service.create({
        themeName: '开办企业',
        themeCode: 'KBQY',
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(mockThemeRepo.findOne).toHaveBeenCalledWith({
      where: { themeCode: 'KBQY' },
      withDeleted: true,
    });
  });

  it('create() 已逻辑删除的相同编码仍返回 409', async () => {
    mockThemeRepo.findOne.mockResolvedValueOnce(
      makeTheme({ deletedAt: new Date('2024-07-01') }),
    );
    await expect(
      service.create({
        themeName: '开办企业',
        themeCode: 'KBQY',
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('create() 并发唯一冲突最终返回 409 而非 500', async () => {
    mockThemeRepo.findOne.mockResolvedValueOnce(null);
    const created = makeTheme({ id: 'theme-new', themeCode: 'NEWTHEME' });
    mockThemeRepo.create.mockReturnValueOnce(created);
    const dupError = new QueryFailedError(
      'INSERT',
      [],
      Object.assign(new Error('duplicate key'), { code: '23505' }),
    );
    mockThemeRepo.save.mockRejectedValueOnce(dupError);

    await expect(
      service.create({
        themeName: '新主题',
        themeCode: 'NEWTHEME',
      }),
    ).rejects.toMatchObject({ status: 409 });
  });

  it('create() 保存规范化大写编码', async () => {
    mockThemeRepo.findOne.mockResolvedValueOnce(null);
    const created = makeTheme({ themeCode: 'THEME_X' });
    mockThemeRepo.create.mockImplementation((data) => data);
    mockThemeRepo.save.mockResolvedValueOnce(created);

    await service.create({
      themeName: '主题X',
      themeCode: ' theme_x ',
    });

    expect(mockThemeRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ themeCode: 'THEME_X' }),
    );
    expect(mockThemeRepo.findOne).toHaveBeenCalledWith({
      where: { themeCode: 'THEME_X' },
      withDeleted: true,
    });
  });

  it('create() 大小写不同视为同一编码返回 409', async () => {
    mockThemeRepo.findOne.mockResolvedValueOnce(makeTheme({ themeCode: 'THEME_X' }));
    await expect(
      service.create({
        themeName: '主题Y',
        themeCode: 'theme_x',
      }),
    ).rejects.toMatchObject({ status: 409 });
    expect(mockThemeRepo.findOne).toHaveBeenCalledWith({
      where: { themeCode: 'THEME_X' },
      withDeleted: true,
    });
  });

  it('list() 不暴露 deletedAt', async () => {
    mockThemeRepo.findAndCount.mockResolvedValueOnce([[makeTheme()], 1]);
    const result = await service.list({ page: 1, pageSize: 20 });
    expect(result.list[0]).not.toHaveProperty('deletedAt');
    expect(result.list[0].themeCode).toBe('KBQY');
  });
});

describe('Guide config admin API — HTTP integration', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const mockUserRepo = { findOne: jest.fn() };
  const mockRoleRepo = { find: jest.fn() };
  const mockUserRoleRepo = { find: jest.fn() };
  const mockPermRepo = { find: jest.fn() };
  const mockRolePermRepo = { find: jest.fn() };
  const mockDeptRepo = {
    findAndCount: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    softDelete: jest.fn(),
  };
  const mockThemeRepo = {
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

  function makeReviewerToken(): string {
    return jwtService.sign({ sub: REVIEWER_USER_ID, username: 'reviewer01' });
  }

  function setupSaAuth(): void {
    mockUserRepo.findOne.mockResolvedValueOnce(makeSaUser());
    mockUserRoleRepo.find.mockResolvedValueOnce([
      { userId: SA_USER_ID, roleId: ROLE_SUPER_ID } as SysUserRole,
    ]);
    mockRoleRepo.find.mockResolvedValueOnce([makeSaRole()]);
  }

  function setupEditorAuthWithGuidePerms(): void {
    mockUserRepo.findOne.mockResolvedValue(makeEditorUser());
    mockUserRoleRepo.find.mockResolvedValue([
      { userId: EDITOR_USER_ID, roleId: ROLE_EDITOR_ID } as SysUserRole,
    ]);
    mockRoleRepo.find.mockResolvedValue([makeEditorRole()]);
    mockRolePermRepo.find.mockResolvedValue(
      SEED_GUIDE_PERMISSIONS.map((p) => ({
        roleId: ROLE_EDITOR_ID,
        permissionId: p.id,
      })),
    );
    mockPermRepo.find.mockResolvedValue(
      SEED_GUIDE_PERMISSIONS.map((p) => ({
        id: p.id,
        permissionCode: p.permissionCode,
        status: 'active',
      })),
    );
  }

  function setupEditorAuthNoPerms(): void {
    mockUserRepo.findOne.mockResolvedValue(makeEditorUser());
    mockUserRoleRepo.find.mockResolvedValue([
      { userId: EDITOR_USER_ID, roleId: ROLE_EDITOR_ID } as SysUserRole,
    ]);
    mockRoleRepo.find.mockResolvedValue([makeEditorRole()]);
    mockRolePermRepo.find.mockResolvedValue([]);
  }

  function setupReviewerAuthNoGuidePerms(): void {
    mockUserRepo.findOne.mockResolvedValue(makeReviewerUser());
    mockUserRoleRepo.find.mockResolvedValue([
      { userId: REVIEWER_USER_ID, roleId: ROLE_REVIEWER_ID } as SysUserRole,
    ]);
    mockRoleRepo.find.mockResolvedValue([makeReviewerRole()]);
    mockRolePermRepo.find.mockResolvedValue([]);
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

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({ secret: TEST_JWT_SECRET, signOptions: { expiresIn: '1h' } }),
      ],
      controllers: [GuideDeptsController, GuideThemesController],
      providers: [
        AuthService,
        JwtAuthGuard,
        PermissionsGuard,
        Reflector,
        DeptMappingService,
        ThemeMappingService,
        { provide: getRepositoryToken(SysUser), useValue: mockUserRepo },
        { provide: getRepositoryToken(SysRole), useValue: mockRoleRepo },
        { provide: getRepositoryToken(SysUserRole), useValue: mockUserRoleRepo },
        { provide: getRepositoryToken(SysPermission), useValue: mockPermRepo },
        { provide: getRepositoryToken(SysRolePermission), useValue: mockRolePermRepo },
        { provide: getRepositoryToken(GuideDeptMapping), useValue: mockDeptRepo },
        { provide: getRepositoryToken(GuideThemeMapping), useValue: mockThemeRepo },
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

  describe('GET /api/admin/guide/depts', () => {
    it('无 token 返回 401', async () => {
      const res = await supertest(app.getHttpServer()).get('/api/admin/guide/depts');
      expect(res.status).toBe(401);
    });

    it('无 guide:dept:read 权限返回 403', async () => {
      setupEditorAuthNoPerms();
      const res = await supertest(app.getHttpServer())
        .get('/api/admin/guide/depts')
        .set('Authorization', `Bearer ${makeEditorToken()}`);
      expect(res.status).toBe(403);
    });

    it('SUPER_ADMIN 返回标准分页结构', async () => {
      setupSaAuth();
      mockDeptRepo.findAndCount.mockResolvedValueOnce([[makeDept()], 1]);

      const res = await supertest(app.getHttpServer())
        .get('/api/admin/guide/depts?page=1&pageSize=20')
        .set('Authorization', `Bearer ${makeSaToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.list).toHaveLength(1);
      expect(res.body.data.total).toBe(1);
      expect(res.body.data.list[0]).not.toHaveProperty('deletedAt');
    });

    it('CONTENT_EDITOR 具备 guide:dept:read 时可访问', async () => {
      setupEditorAuthWithPerm(PERM_GUIDE_DEPT_READ, 'guide:dept:read');
      mockDeptRepo.findAndCount.mockResolvedValueOnce([[makeDept()], 1]);

      const res = await supertest(app.getHttpServer())
        .get('/api/admin/guide/depts')
        .set('Authorization', `Bearer ${makeEditorToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });
  });

  describe('POST /api/admin/guide/depts', () => {
    it('isVisible 非 0/1 返回 400', async () => {
      setupSaAuth();
      const res = await supertest(app.getHttpServer())
        .post('/api/admin/guide/depts')
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({
          deptName: '市场监管局',
          deptCode: 'SCJGJ',
          displayName: '市监局',
          isVisible: 2,
        });
      expect(res.status).toBe(400);
    });

    it('编码重复返回 409', async () => {
      setupSaAuth();
      mockDeptRepo.findOne.mockResolvedValueOnce(makeDept());

      const res = await supertest(app.getHttpServer())
        .post('/api/admin/guide/depts')
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({
          deptName: '市场监管局',
          deptCode: 'SCJGJ',
          displayName: '市监局',
        });

      expect(res.status).toBe(409);
    });

    it('需要 guide:dept:create 权限', async () => {
      setupEditorAuthWithPerm(PERM_GUIDE_DEPT_READ, 'guide:dept:read');
      const res = await supertest(app.getHttpServer())
        .post('/api/admin/guide/depts')
        .set('Authorization', `Bearer ${makeEditorToken()}`)
        .send({
          deptName: '市场监管局',
          deptCode: 'NEW01',
          displayName: '市监局',
        });
      expect(res.status).toBe(403);
    });

    it('空名称、空编码、纯空白编码返回 400', async () => {
      const cases = [
        { deptName: '', deptCode: 'SCJGJ', displayName: '市监局' },
        { deptName: '市场监管局', deptCode: '', displayName: '市监局' },
        { deptName: '市场监管局', deptCode: '   ', displayName: '市监局' },
        { deptName: '   ', deptCode: 'SCJGJ', displayName: '市监局' },
      ];
      for (const body of cases) {
        setupSaAuth();
        const res = await supertest(app.getHttpServer())
          .post('/api/admin/guide/depts')
          .set('Authorization', `Bearer ${makeSaToken()}`)
          .send(body);
        expect(res.status).toBe(400);
      }
    });

    it('未知字段返回 400', async () => {
      setupSaAuth();
      const res = await supertest(app.getHttpServer())
        .post('/api/admin/guide/depts')
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({
          deptName: '市场监管局',
          deptCode: 'SCJGJ',
          displayName: '市监局',
          unknownField: 'x',
        });
      expect(res.status).toBe(400);
    });

    it('编码前后空格的重复请求返回 409', async () => {
      const created = makeDept({ deptCode: 'SCJGJ' });
      mockDeptRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(created);
      mockDeptRepo.create.mockReturnValueOnce(created);
      mockDeptRepo.save.mockResolvedValueOnce(created);

      setupSaAuth();
      const res1 = await supertest(app.getHttpServer())
        .post('/api/admin/guide/depts')
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({
          deptName: '市场监管局',
          deptCode: ' SCJGJ ',
          displayName: '市监局',
        });
      expect(res1.status).toBe(201);
      expect(mockDeptRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ deptCode: 'SCJGJ' }),
      );

      setupSaAuth();
      const res2 = await supertest(app.getHttpServer())
        .post('/api/admin/guide/depts')
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({
          deptName: '市场监管局2',
          deptCode: 'SCJGJ',
          displayName: '市监局2',
        });
      expect(res2.status).toBe(409);
    });

    it('先创建 CODE_A 再创建 code_a 返回 409', async () => {
      const created = makeDept({ deptCode: 'CODE_A' });
      mockDeptRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(created);
      mockDeptRepo.create.mockReturnValueOnce(created);
      mockDeptRepo.save.mockResolvedValueOnce(created);

      setupSaAuth();
      const res1 = await supertest(app.getHttpServer())
        .post('/api/admin/guide/depts')
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({
          deptName: '部门A',
          deptCode: ' code_a ',
          displayName: '部门A',
        });
      expect(res1.status).toBe(201);
      expect(mockDeptRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ deptCode: 'CODE_A' }),
      );

      setupSaAuth();
      const res2 = await supertest(app.getHttpServer())
        .post('/api/admin/guide/depts')
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({
          deptName: '部门B',
          deptCode: 'CODE_a',
          displayName: '部门B',
        });
      expect(res2.status).toBe(409);
    });
  });

  describe('PUT /api/admin/guide/depts/:id', () => {
    it('更新 deptCode 被拒绝（forbidNonWhitelisted）', async () => {
      setupSaAuth();
      const res = await supertest(app.getHttpServer())
        .put(`/api/admin/guide/depts/${DEPT_ID}`)
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({ deptCode: 'CHANGED' });
      expect(res.status).toBe(400);
    });

    it('需要 guide:dept:update 权限', async () => {
      setupEditorAuthWithPerm(PERM_GUIDE_DEPT_READ, 'guide:dept:read');
      const res = await supertest(app.getHttpServer())
        .put(`/api/admin/guide/depts/${DEPT_ID}`)
        .set('Authorization', `Bearer ${makeEditorToken()}`)
        .send({ displayName: '新名称' });
      expect(res.status).toBe(403);
    });

    it('非法 status 返回 400', async () => {
      setupSaAuth();
      const res = await supertest(app.getHttpServer())
        .put(`/api/admin/guide/depts/${DEPT_ID}`)
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({ status: 'invalid' });
      expect(res.status).toBe(400);
    });

    it('null 字段返回 400', async () => {
      const nullCases = [
        { deptName: null },
        { displayName: null },
        { status: null },
        { isVisible: null },
        { sortOrder: null },
      ];
      for (const body of nullCases) {
        setupSaAuth();
        const res = await supertest(app.getHttpServer())
          .put(`/api/admin/guide/depts/${DEPT_ID}`)
          .set('Authorization', `Bearer ${makeSaToken()}`)
          .send(body);
        expect(res.status).toBe(400);
      }
    });

    it('icon 传 null 允许清空', async () => {
      setupSaAuth();
      const dept = makeDept({ icon: 'old-icon' });
      mockDeptRepo.findOne.mockResolvedValueOnce(dept);
      mockDeptRepo.save.mockImplementation(async (row) => row);

      const res = await supertest(app.getHttpServer())
        .put(`/api/admin/guide/depts/${DEPT_ID}`)
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({ icon: null });

      expect(res.status).toBe(200);
      expect(mockDeptRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ icon: null }),
      );
    });
  });

  describe('DELETE /api/admin/guide/depts/:id', () => {
    it('需要 guide:dept:delete 权限', async () => {
      setupEditorAuthWithPerm(PERM_GUIDE_DEPT_READ, 'guide:dept:read');
      const res = await supertest(app.getHttpServer())
        .delete(`/api/admin/guide/depts/${DEPT_ID}`)
        .set('Authorization', `Bearer ${makeEditorToken()}`);
      expect(res.status).toBe(403);
    });

    it('SUPER_ADMIN 执行逻辑删除', async () => {
      setupSaAuth();
      mockDeptRepo.findOne.mockResolvedValueOnce(makeDept());
      mockDeptRepo.softDelete.mockResolvedValueOnce(undefined);

      const res = await supertest(app.getHttpServer())
        .delete(`/api/admin/guide/depts/${DEPT_ID}`)
        .set('Authorization', `Bearer ${makeSaToken()}`);

      expect(res.status).toBe(200);
      expect(mockDeptRepo.softDelete).toHaveBeenCalledWith(DEPT_ID);
    });
  });

  describe('GET /api/admin/guide/themes', () => {
    it('无 token 返回 401', async () => {
      const res = await supertest(app.getHttpServer()).get('/api/admin/guide/themes');
      expect(res.status).toBe(401);
    });

    it('PUBLISH_REVIEWER 无 guide 权限返回 403', async () => {
      setupReviewerAuthNoGuidePerms();
      const res = await supertest(app.getHttpServer())
        .get('/api/admin/guide/themes')
        .set('Authorization', `Bearer ${makeReviewerToken()}`);
      expect(res.status).toBe(403);
    });

    it('SUPER_ADMIN 返回标准分页结构', async () => {
      setupSaAuth();
      mockThemeRepo.findAndCount.mockResolvedValueOnce([[makeTheme()], 1]);

      const res = await supertest(app.getHttpServer())
        .get('/api/admin/guide/themes')
        .set('Authorization', `Bearer ${makeSaToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.data.list[0].themeCode).toBe('KBQY');
      expect(res.body.data.list[0]).not.toHaveProperty('deletedAt');
    });
  });

  describe('POST /api/admin/guide/themes', () => {
    it('platformParamJson 非合法 JSON 返回 400', async () => {
      setupSaAuth();
      const res = await supertest(app.getHttpServer())
        .post('/api/admin/guide/themes')
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({
          themeName: '开办企业',
          themeCode: 'KBQY',
          platformParamJson: 'not-json',
        });
      expect(res.status).toBe(400);
    });

    it('编码重复返回 409', async () => {
      setupSaAuth();
      mockThemeRepo.findOne.mockResolvedValueOnce(makeTheme());

      const res = await supertest(app.getHttpServer())
        .post('/api/admin/guide/themes')
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({
          themeName: '开办企业',
          themeCode: 'KBQY',
        });

      expect(res.status).toBe(409);
    });

    it('需要 guide:theme:create 权限', async () => {
      setupEditorAuthWithPerm(PERM_GUIDE_THEME_READ, 'guide:theme:read');
      const res = await supertest(app.getHttpServer())
        .post('/api/admin/guide/themes')
        .set('Authorization', `Bearer ${makeEditorToken()}`)
        .send({
          themeName: '开办企业',
          themeCode: 'NEW_THEME',
        });
      expect(res.status).toBe(403);
    });

    it('先创建 CODE_A 再创建 code_a 返回 409', async () => {
      const created = makeTheme({ themeCode: 'CODE_A' });
      mockThemeRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(created);
      mockThemeRepo.create.mockReturnValueOnce(created);
      mockThemeRepo.save.mockResolvedValueOnce(created);

      setupSaAuth();
      const res1 = await supertest(app.getHttpServer())
        .post('/api/admin/guide/themes')
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({
          themeName: '主题A',
          themeCode: ' CODE_A ',
        });
      expect(res1.status).toBe(201);
      expect(mockThemeRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ themeCode: 'CODE_A' }),
      );

      setupSaAuth();
      const res2 = await supertest(app.getHttpServer())
        .post('/api/admin/guide/themes')
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({
          themeName: '主题B',
          themeCode: 'code_a',
        });
      expect(res2.status).toBe(409);
    });
  });

  describe('PUT /api/admin/guide/themes/:id', () => {
    it('更新 themeCode 被拒绝（forbidNonWhitelisted）', async () => {
      setupSaAuth();
      const res = await supertest(app.getHttpServer())
        .put(`/api/admin/guide/themes/${THEME_ID}`)
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({ themeCode: 'CHANGED' });
      expect(res.status).toBe(400);
    });

    it('需要 guide:theme:update 权限', async () => {
      setupEditorAuthWithPerm(PERM_GUIDE_THEME_READ, 'guide:theme:read');
      const res = await supertest(app.getHttpServer())
        .put(`/api/admin/guide/themes/${THEME_ID}`)
        .set('Authorization', `Bearer ${makeEditorToken()}`)
        .send({ themeName: '新主题' });
      expect(res.status).toBe(403);
    });

    it('null 字段返回 400', async () => {
      const nullCases = [
        { themeName: null },
        { isVisible: null },
        { sortOrder: null },
      ];
      for (const body of nullCases) {
        setupSaAuth();
        const res = await supertest(app.getHttpServer())
          .put(`/api/admin/guide/themes/${THEME_ID}`)
          .set('Authorization', `Bearer ${makeSaToken()}`)
          .send(body);
        expect(res.status).toBe(400);
      }
    });

    it('platformParamJson 传 null 允许清空', async () => {
      setupSaAuth();
      const theme = makeTheme({ platformParamJson: '{"a":1}' });
      mockThemeRepo.findOne.mockResolvedValueOnce(theme);
      mockThemeRepo.save.mockImplementation(async (row) => row);

      const res = await supertest(app.getHttpServer())
        .put(`/api/admin/guide/themes/${THEME_ID}`)
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({ platformParamJson: null });

      expect(res.status).toBe(200);
      expect(mockThemeRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ platformParamJson: null }),
      );
    });
  });

  describe('DELETE /api/admin/guide/themes/:id', () => {
    it('需要 guide:theme:delete 权限', async () => {
      setupEditorAuthWithPerm(PERM_GUIDE_THEME_UPDATE, 'guide:theme:update');
      const res = await supertest(app.getHttpServer())
        .delete(`/api/admin/guide/themes/${THEME_ID}`)
        .set('Authorization', `Bearer ${makeEditorToken()}`);
      expect(res.status).toBe(403);
    });

    it('CONTENT_EDITOR 具备全部 guide 权限时可删除', async () => {
      setupEditorAuthWithGuidePerms();
      mockThemeRepo.findOne.mockResolvedValueOnce(makeTheme());
      mockThemeRepo.softDelete.mockResolvedValueOnce(undefined);

      const res = await supertest(app.getHttpServer())
        .delete(`/api/admin/guide/themes/${THEME_ID}`)
        .set('Authorization', `Bearer ${makeEditorToken()}`);

      expect(res.status).toBe(200);
    });
  });

  describe('权限码校验', () => {
    it('guide:dept:create 允许创建', async () => {
      setupEditorAuthWithPerm(PERM_GUIDE_DEPT_CREATE, 'guide:dept:create');
      const created = makeDept({ id: 'dept-new', deptCode: 'NEWDEPT' });
      mockDeptRepo.findOne.mockResolvedValueOnce(null);
      mockDeptRepo.create.mockReturnValueOnce(created);
      mockDeptRepo.save.mockResolvedValueOnce(created);

      const res = await supertest(app.getHttpServer())
        .post('/api/admin/guide/depts')
        .set('Authorization', `Bearer ${makeEditorToken()}`)
        .send({
          deptName: '新部门',
          deptCode: 'NEWDEPT',
          displayName: '新部门展示名',
        });

      expect(res.status).toBe(201);
      expect(res.body.code).toBe(0);
    });

    it('guide:theme:update 允许更新', async () => {
      setupEditorAuthWithPerm(PERM_GUIDE_THEME_UPDATE, 'guide:theme:update');
      const theme = makeTheme();
      mockThemeRepo.findOne.mockResolvedValueOnce(theme);
      mockThemeRepo.save.mockResolvedValueOnce({ ...theme, themeName: '更新后' });

      const res = await supertest(app.getHttpServer())
        .put(`/api/admin/guide/themes/${THEME_ID}`)
        .set('Authorization', `Bearer ${makeEditorToken()}`)
        .send({ themeName: '更新后' });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });

    it('guide:dept:delete 允许删除', async () => {
      setupEditorAuthWithPerm(PERM_GUIDE_DEPT_DELETE, 'guide:dept:delete');
      mockDeptRepo.findOne.mockResolvedValueOnce(makeDept());
      mockDeptRepo.softDelete.mockResolvedValueOnce(undefined);

      const res = await supertest(app.getHttpServer())
        .delete(`/api/admin/guide/depts/${DEPT_ID}`)
        .set('Authorization', `Bearer ${makeEditorToken()}`);

      expect(res.status).toBe(200);
    });
  });
});
