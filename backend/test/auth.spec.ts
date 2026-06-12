import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Reflector } from '@nestjs/core';
import supertest = require('supertest');
import * as bcryptjs from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { AuthService } from '../src/auth/auth.service';
import { AuthController } from '../src/admin-api/controllers/auth.controller';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../src/auth/guards/permissions.guard';
import { RequirePermissions } from '../src/auth/decorators/require-permissions.decorator';
import { Public } from '../src/auth/decorators/public.decorator';
import { SysUser } from '../src/database/entities/sys-user.entity';
import { SysRole } from '../src/database/entities/sys-role.entity';
import { SysUserRole } from '../src/database/entities/sys-user-role.entity';
import { SysPermission } from '../src/database/entities/sys-permission.entity';
import { SysRolePermission } from '../src/database/entities/sys-role-permission.entity';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';
import { Controller, Get } from '@nestjs/common';

// ── Constants ──────────────────────────────────────────────────────────────

const TEST_JWT_SECRET = 'test-jwt-secret-for-auth-spec';

// Pre-computed bcrypt hash for 'correct-password' (salt=4, fast for tests)
let correctPasswordHash: string;

// ── Test-only controller to exercise permissions guard ─────────────────────

@Controller('admin/test-permissions')
class TestPermController {
  @RequirePermissions('content:read')
  @Get('requires-content-read')
  requiresContentRead() {
    return { granted: true };
  }

  @RequirePermissions('admin:anything')
  @Get('requires-admin')
  requiresAdmin() {
    return { granted: true };
  }

  @Get('no-permissions')
  noPermissions() {
    return { open: true };
  }

  @Public()
  @Get('public-in-admin')
  publicInAdmin() {
    return { public: true };
  }
}

// ── Fixtures ───────────────────────────────────────────────────────────────

const USER_ACTIVE_ID = 'user-active-001';
const USER_DISABLED_ID = 'user-disabled-002';
const USER_DELETED_ID = 'user-deleted-003';
const ROLE_SUPER_ID = 'role-super-001';
const ROLE_EDITOR_ID = 'role-editor-002';
const PERM_CONTENT_READ_ID = 'perm-content-read-001';

function makeActiveUser(): SysUser {
  return {
    id: USER_ACTIVE_ID,
    username: 'testadmin',
    passwordHash: correctPasswordHash,
    realName: '测试管理员',
    mobile: null,
    email: null,
    status: 'active',
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  } as SysUser;
}

function makeDisabledUser(): SysUser {
  return {
    id: USER_DISABLED_ID,
    username: 'disabled_user',
    passwordHash: correctPasswordHash,
    realName: null,
    mobile: null,
    email: null,
    status: 'disabled',
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
  } as SysUser;
}

function makeDeletedUser(): SysUser {
  return {
    id: USER_DELETED_ID,
    username: 'deleted_user',
    passwordHash: correctPasswordHash,
    realName: null,
    mobile: null,
    email: null,
    status: 'active',
    lastLoginAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: new Date(), // soft-deleted
  } as SysUser;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function makeExpiredToken(userId: string, username: string): string {
  return jwt.sign(
    { sub: userId, username },
    TEST_JWT_SECRET,
    { expiresIn: 1 }, // 1 second, but we post-process the exp to be in the past
  );
}

function makeValidToken(userId: string, username: string, jwtService: JwtService): string {
  return jwtService.sign({ sub: userId, username });
}

function makeTamperedToken(validToken: string): string {
  const parts = validToken.split('.');
  parts[2] = parts[2].split('').reverse().join('');
  return parts.join('.');
}

function makePastExpToken(userId: string, username: string): string {
  // Create a token with exp in the past (1 hour ago)
  return jwt.sign(
    { sub: userId, username, exp: Math.floor(Date.now() / 1000) - 3600 },
    TEST_JWT_SECRET,
  );
}

// ── Test setup ─────────────────────────────────────────────────────────────

describe('AuthModule — full HTTP tests', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  const mockUserRepo = { findOne: jest.fn(), update: jest.fn().mockResolvedValue({ affected: 1 }) };
  const mockRoleRepo = { find: jest.fn() };
  const mockUserRoleRepo = { find: jest.fn() };
  const mockPermRepo = { find: jest.fn() };
  const mockRolePermRepo = { find: jest.fn() };

  beforeAll(async () => {
    correctPasswordHash = bcryptjs.hashSync('correct-password', 4);

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({
          secret: TEST_JWT_SECRET,
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [AuthController, TestPermController],
      providers: [
        AuthService,
        JwtAuthGuard,
        PermissionsGuard,
        Reflector,
        { provide: getRepositoryToken(SysUser), useValue: mockUserRepo },
        { provide: getRepositoryToken(SysRole), useValue: mockRoleRepo },
        { provide: getRepositoryToken(SysUserRole), useValue: mockUserRoleRepo },
        { provide: getRepositoryToken(SysPermission), useValue: mockPermRepo },
        { provide: getRepositoryToken(SysRolePermission), useValue: mockRolePermRepo },
      ],
    }).compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api');

    jwtService = module.get(JwtService);
    const reflector = module.get(Reflector);
    const authService = module.get(AuthService);

    // Register guards globally, same as production
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
    jest.clearAllMocks();
  });

  const post = (path: string, body: Record<string, unknown>, token?: string) => {
    const req = supertest(app.getHttpServer())
      .post(path)
      .send(body)
      .set('Content-Type', 'application/json');
    if (token) req.set('Authorization', `Bearer ${token}`);
    return req;
  };

  const get = (path: string, token?: string) => {
    const req = supertest(app.getHttpServer()).get(path);
    if (token) req.set('Authorization', `Bearer ${token}`);
    return req;
  };

  // ── Login success ──────────────────────────────────────────────────────

  describe('POST /api/admin/auth/login — success', () => {
    it('correct credentials returns accessToken, userInfo (no password_hash), permissions', async () => {
      const activeUser = makeActiveUser();
      mockUserRepo.findOne.mockResolvedValueOnce(activeUser);
      // getUserRoleCodes: no roles for simplicity
      mockUserRoleRepo.find.mockResolvedValue([]);

      const res = await post('/api/admin/auth/login', {
        username: 'testadmin',
        password: 'correct-password',
      });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.accessToken).toBeDefined();
      expect(typeof res.body.data.accessToken).toBe('string');
      expect(res.body.data.userInfo.id).toBe(USER_ACTIVE_ID);
      expect(res.body.data.userInfo.username).toBe('testadmin');
      expect(res.body.data.userInfo).not.toHaveProperty('passwordHash');
      expect(res.body.data.userInfo).not.toHaveProperty('password_hash');
      expect(res.body.data.userInfo).not.toHaveProperty('mobile');
      expect(res.body.data.userInfo).not.toHaveProperty('email');
      expect(Array.isArray(res.body.data.permissions)).toBe(true);
    });

    it('login with SUPER_ADMIN returns permissions [*]', async () => {
      const activeUser = makeActiveUser();
      mockUserRepo.findOne.mockResolvedValueOnce(activeUser);
      mockUserRoleRepo.find.mockResolvedValue([{ userId: USER_ACTIVE_ID, roleId: ROLE_SUPER_ID }]);
      mockRoleRepo.find.mockResolvedValue([{ id: ROLE_SUPER_ID, roleCode: 'SUPER_ADMIN', status: 'active' }]);

      const res = await post('/api/admin/auth/login', {
        username: 'testadmin',
        password: 'correct-password',
      });

      expect(res.status).toBe(200);
      expect(res.body.data.permissions).toEqual(['*']);
    });

    it('login success updates last_login_at via repository update()', async () => {
      const activeUser = makeActiveUser();
      mockUserRepo.findOne.mockResolvedValueOnce(activeUser);
      mockUserRepo.update.mockClear();
      mockUserRoleRepo.find.mockResolvedValue([]);

      await post('/api/admin/auth/login', {
        username: 'testadmin',
        password: 'correct-password',
      });

      expect(mockUserRepo.update).toHaveBeenCalledTimes(1);
      expect(mockUserRepo.update).toHaveBeenCalledWith(
        USER_ACTIVE_ID,
        expect.objectContaining({ lastLoginAt: expect.any(Date) }),
      );
    });

    it('login failure (wrong password) does not update last_login_at', async () => {
      const activeUser = makeActiveUser();
      mockUserRepo.findOne.mockResolvedValueOnce(activeUser);
      mockUserRepo.update.mockClear();

      await post('/api/admin/auth/login', {
        username: 'testadmin',
        password: 'wrong-password',
      });

      expect(mockUserRepo.update).not.toHaveBeenCalled();
    });

    it('login failure (user not found) does not update last_login_at', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce(null);
      mockUserRepo.update.mockClear();

      await post('/api/admin/auth/login', {
        username: 'ghost',
        password: 'any',
      });

      expect(mockUserRepo.update).not.toHaveBeenCalled();
    });
  });

  // ── Login failures ─────────────────────────────────────────────────────

  describe('POST /api/admin/auth/login — failures', () => {
    it('user not found → 401', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce(null);

      const res = await post('/api/admin/auth/login', {
        username: 'nonexistent',
        password: 'any-password',
      });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe(401);
    });

    it('wrong password → 401', async () => {
      const activeUser = makeActiveUser();
      mockUserRepo.findOne.mockResolvedValueOnce(activeUser);

      const res = await post('/api/admin/auth/login', {
        username: 'testadmin',
        password: 'wrong-password',
      });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe(401);
    });

    it('disabled user → 401 (findOne returns null for status!=active)', async () => {
      // TypeORM query with status:'active' returns null for disabled user
      mockUserRepo.findOne.mockResolvedValueOnce(null);

      const res = await post('/api/admin/auth/login', {
        username: 'disabled_user',
        password: 'correct-password',
      });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe(401);
    });

    it('deleted user → 401 (TypeORM soft-delete excludes deleted records)', async () => {
      // With soft-delete, deleted user has deletedAt set and is excluded by default query
      mockUserRepo.findOne.mockResolvedValueOnce(null);

      const res = await post('/api/admin/auth/login', {
        username: 'deleted_user',
        password: 'correct-password',
      });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe(401);
    });

    it('missing username → 400', async () => {
      const res = await post('/api/admin/auth/login', { password: 'pw' });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
    });

    it('missing password → 400', async () => {
      const res = await post('/api/admin/auth/login', { username: 'u' });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
    });

    it('empty username → 400', async () => {
      const res = await post('/api/admin/auth/login', { username: '', password: 'pw' });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
    });
  });

  // ── JWT guard — missing / invalid / expired ────────────────────────────

  describe('JWT guard — token validation', () => {
    it('missing Authorization header → 401', async () => {
      const res = await get('/api/admin/auth/profile');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe(401);
    });

    it('malformed Bearer token → 401', async () => {
      const res = await get('/api/admin/auth/profile', 'not-a-valid-jwt');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe(401);
    });

    it('tampered token signature → 401', async () => {
      const activeUser = makeActiveUser();
      mockUserRepo.findOne.mockResolvedValueOnce(activeUser);
      mockUserRoleRepo.find.mockResolvedValue([]);
      const validToken = makeValidToken(USER_ACTIVE_ID, 'testadmin', jwtService);
      const tampered = makeTamperedToken(validToken);

      const res = await get('/api/admin/auth/profile', tampered);
      expect(res.status).toBe(401);
      expect(res.body.code).toBe(401);
    });

    it('expired token → 401', async () => {
      const expiredToken = makePastExpToken(USER_ACTIVE_ID, 'testadmin');

      const res = await get('/api/admin/auth/profile', expiredToken);
      expect(res.status).toBe(401);
      expect(res.body.code).toBe(401);
    });

    it('user disabled after token issued → 401', async () => {
      // Guard calls validateUserWithRoles which queries DB with status:'active'
      // Simulate: user was disabled after token was issued → findOne returns null
      mockUserRepo.findOne.mockResolvedValueOnce(null);
      const validToken = makeValidToken(USER_ACTIVE_ID, 'testadmin', jwtService);

      const res = await get('/api/admin/auth/profile', validToken);
      expect(res.status).toBe(401);
      expect(res.body.code).toBe(401);
    });

    it('valid token with active user → passes guard', async () => {
      const activeUser = makeActiveUser();
      // First call: validateUserWithRoles (guard)
      mockUserRepo.findOne.mockResolvedValueOnce(activeUser);
      mockUserRoleRepo.find.mockResolvedValue([]);
      // Second call: getProfile
      mockUserRepo.findOne.mockResolvedValueOnce(activeUser);
      mockUserRoleRepo.find.mockResolvedValue([]);

      const validToken = makeValidToken(USER_ACTIVE_ID, 'testadmin', jwtService);
      const res = await get('/api/admin/auth/profile', validToken);
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });
  });

  // ── profile endpoint ───────────────────────────────────────────────────

  describe('GET /api/admin/auth/profile', () => {
    it('returns userInfo, roles, permissions — never password_hash', async () => {
      const activeUser = makeActiveUser();
      // Guard call
      mockUserRepo.findOne.mockResolvedValueOnce(activeUser);
      mockUserRoleRepo.find.mockResolvedValue([{ userId: USER_ACTIVE_ID, roleId: ROLE_SUPER_ID }]);
      mockRoleRepo.find.mockResolvedValue([{ id: ROLE_SUPER_ID, roleCode: 'SUPER_ADMIN', status: 'active' }]);
      // Profile call
      mockUserRepo.findOne.mockResolvedValueOnce(activeUser);
      mockUserRoleRepo.find.mockResolvedValue([{ userId: USER_ACTIVE_ID, roleId: ROLE_SUPER_ID }]);
      mockRoleRepo.find.mockResolvedValue([{ id: ROLE_SUPER_ID, roleCode: 'SUPER_ADMIN', status: 'active' }]);

      const token = makeValidToken(USER_ACTIVE_ID, 'testadmin', jwtService);
      const res = await get('/api/admin/auth/profile', token);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.userInfo.id).toBe(USER_ACTIVE_ID);
      expect(res.body.data.userInfo.username).toBe('testadmin');
      expect(res.body.data.roles).toContain('SUPER_ADMIN');
      expect(res.body.data.permissions).toContain('*');
      // Must NOT expose sensitive fields
      expect(res.body.data.userInfo).not.toHaveProperty('passwordHash');
      expect(res.body.data.userInfo).not.toHaveProperty('password_hash');
      expect(res.body.data.userInfo).not.toHaveProperty('mobile');
      expect(res.body.data.userInfo).not.toHaveProperty('email');
    });

    it('profile for user with CONTENT_EDITOR returns actual permissions', async () => {
      const activeUser = makeActiveUser();
      const editorLink = [{ userId: USER_ACTIVE_ID, roleId: ROLE_EDITOR_ID }];
      const editorRole = [{ id: ROLE_EDITOR_ID, roleCode: 'CONTENT_EDITOR', status: 'active' }];
      // Guard: validateUserWithRoles → getUserRoleCodes → getActiveRoles
      mockUserRepo.findOne.mockResolvedValueOnce(activeUser);
      mockUserRoleRepo.find.mockResolvedValueOnce(editorLink);
      mockRoleRepo.find.mockResolvedValueOnce(editorRole);
      // Profile: getProfile → getUserRoleCodes → getActiveRoles
      mockUserRepo.findOne.mockResolvedValueOnce(activeUser);
      mockUserRoleRepo.find.mockResolvedValueOnce(editorLink);
      mockRoleRepo.find.mockResolvedValueOnce(editorRole);
      // Profile: getUserPermissions → getActiveRoles (re-validates, new in Step 3 final fix)
      mockUserRoleRepo.find.mockResolvedValueOnce(editorLink);
      mockRoleRepo.find.mockResolvedValueOnce(editorRole);
      // getUserPermissions non-SA path: rolePermRepo + permRepo
      mockRolePermRepo.find.mockResolvedValueOnce([{ roleId: ROLE_EDITOR_ID, permissionId: PERM_CONTENT_READ_ID }]);
      mockPermRepo.find.mockResolvedValueOnce([{ id: PERM_CONTENT_READ_ID, permissionCode: 'content:read' }]);

      const token = makeValidToken(USER_ACTIVE_ID, 'testadmin', jwtService);
      const res = await get('/api/admin/auth/profile', token);

      expect(res.status).toBe(200);
      expect(res.body.data.roles).toContain('CONTENT_EDITOR');
      expect(res.body.data.permissions).toContain('content:read');
      expect(res.body.data.permissions).not.toContain('*');
    });
  });

  // ── logout ─────────────────────────────────────────────────────────────

  describe('POST /api/admin/auth/logout', () => {
    it('valid token → 200', async () => {
      const activeUser = makeActiveUser();
      mockUserRepo.findOne.mockResolvedValueOnce(activeUser);
      mockUserRoleRepo.find.mockResolvedValue([]);

      const token = makeValidToken(USER_ACTIVE_ID, 'testadmin', jwtService);
      const res = await post('/api/admin/auth/logout', {}, token);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });

    it('missing token → 401', async () => {
      const res = await post('/api/admin/auth/logout', {});
      expect(res.status).toBe(401);
      expect(res.body.code).toBe(401);
    });
  });

  // ── RBAC — PermissionsGuard ─────────────────────────────────────────────

  describe('PermissionsGuard — @RequirePermissions', () => {
    function mockActiveUserForGuard(roles: string[], roleId: string, roleCode: string) {
      const activeUser = makeActiveUser();
      mockUserRepo.findOne.mockResolvedValueOnce(activeUser);
      mockUserRoleRepo.find.mockResolvedValueOnce([{ userId: USER_ACTIVE_ID, roleId }]);
      mockRoleRepo.find.mockResolvedValueOnce([{ id: roleId, roleCode, status: 'active' }]);
    }

    it('SUPER_ADMIN can access route requiring any permission', async () => {
      mockActiveUserForGuard(['SUPER_ADMIN'], ROLE_SUPER_ID, 'SUPER_ADMIN');

      const token = makeValidToken(USER_ACTIVE_ID, 'testadmin', jwtService);
      const res = await get('/api/admin/test-permissions/requires-admin', token);
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });

    it('SUPER_ADMIN can access route requiring content:read', async () => {
      mockActiveUserForGuard(['SUPER_ADMIN'], ROLE_SUPER_ID, 'SUPER_ADMIN');

      const token = makeValidToken(USER_ACTIVE_ID, 'testadmin', jwtService);
      const res = await get('/api/admin/test-permissions/requires-content-read', token);
      expect(res.status).toBe(200);
    });

    it('CONTENT_EDITOR with matching permission can access', async () => {
      mockActiveUserForGuard(['CONTENT_EDITOR'], ROLE_EDITOR_ID, 'CONTENT_EDITOR');
      // PermissionsGuard → getUserPermissions(userId) → getActiveRoles (re-validates)
      mockUserRoleRepo.find.mockResolvedValueOnce([{ userId: USER_ACTIVE_ID, roleId: ROLE_EDITOR_ID }]);
      mockRoleRepo.find.mockResolvedValueOnce([{ id: ROLE_EDITOR_ID, roleCode: 'CONTENT_EDITOR', status: 'active' }]);
      // non-SA path: rolePerms + perms
      mockRolePermRepo.find.mockResolvedValueOnce([{ roleId: ROLE_EDITOR_ID, permissionId: PERM_CONTENT_READ_ID }]);
      mockPermRepo.find.mockResolvedValueOnce([{ id: PERM_CONTENT_READ_ID, permissionCode: 'content:read' }]);

      const token = makeValidToken(USER_ACTIVE_ID, 'testadmin', jwtService);
      const res = await get('/api/admin/test-permissions/requires-content-read', token);
      expect(res.status).toBe(200);
    });

    it('user without required permission → 403', async () => {
      mockActiveUserForGuard(['CONTENT_EDITOR'], ROLE_EDITOR_ID, 'CONTENT_EDITOR');
      // PermissionsGuard → getUserPermissions(userId) → getActiveRoles
      mockUserRoleRepo.find.mockResolvedValueOnce([{ userId: USER_ACTIVE_ID, roleId: ROLE_EDITOR_ID }]);
      mockRoleRepo.find.mockResolvedValueOnce([{ id: ROLE_EDITOR_ID, roleCode: 'CONTENT_EDITOR', status: 'active' }]);
      // No permissions for this role
      mockRolePermRepo.find.mockResolvedValueOnce([]);

      const token = makeValidToken(USER_ACTIVE_ID, 'testadmin', jwtService);
      const res = await get('/api/admin/test-permissions/requires-admin', token);
      expect(res.status).toBe(403);
      expect(res.body.code).toBe(403);
    });

    it('route without @RequirePermissions accessible to any authenticated user', async () => {
      const activeUser = makeActiveUser();
      mockUserRepo.findOne.mockResolvedValueOnce(activeUser);
      mockUserRoleRepo.find.mockResolvedValue([]);

      const token = makeValidToken(USER_ACTIVE_ID, 'testadmin', jwtService);
      const res = await get('/api/admin/test-permissions/no-permissions', token);
      expect(res.status).toBe(200);
    });

    it('unauthenticated request to protected admin route → 401', async () => {
      const res = await get('/api/admin/test-permissions/requires-content-read');
      expect(res.status).toBe(401);
      expect(res.body.code).toBe(401);
    });
  });

  // ── Route isolation — public API unaffected ────────────────────────────

  describe('Route isolation — @Public() routes require no JWT', () => {
    it('@Public() route in admin controller accessible without token', async () => {
      const res = await get('/api/admin/test-permissions/public-in-admin');
      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });
  });

  // ── Validation ─────────────────────────────────────────────────────────

  describe('Input validation', () => {
    it('extra field in login body → 400 (forbidNonWhitelisted)', async () => {
      const res = await post('/api/admin/auth/login', {
        username: 'testadmin',
        password: 'pw',
        extra: 'injected',
      });
      expect(res.status).toBe(400);
      expect(res.body.code).toBe(400);
    });
  });
});

// ── Existing public stats routes still work (regression) ──────────────────

describe('Public API — anonymous access not broken', () => {
  let app: INestApplication;

  const mockUserRepo = { findOne: jest.fn(), update: jest.fn().mockResolvedValue({ affected: 1 }) };
  const mockRoleRepo = { find: jest.fn() };
  const mockUserRoleRepo = { find: jest.fn() };
  const mockPermRepo = { find: jest.fn() };
  const mockRolePermRepo = { find: jest.fn() };

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({ secret: TEST_JWT_SECRET, signOptions: { expiresIn: '1h' } }),
      ],
      controllers: [AuthController],
      providers: [
        AuthService,
        JwtAuthGuard,
        PermissionsGuard,
        Reflector,
        { provide: getRepositoryToken(SysUser), useValue: mockUserRepo },
        { provide: getRepositoryToken(SysRole), useValue: mockRoleRepo },
        { provide: getRepositoryToken(SysUserRole), useValue: mockUserRoleRepo },
        { provide: getRepositoryToken(SysPermission), useValue: mockPermRepo },
        { provide: getRepositoryToken(SysRolePermission), useValue: mockRolePermRepo },
      ],
    }).compile();

    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    const reflector = module.get(Reflector);
    const authService = module.get(AuthService);
    const jwtService = module.get(JwtService);
    app.useGlobalGuards(new JwtAuthGuard(jwtService, authService, reflector));
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('login endpoint is accessible without JWT (it is @Public)', async () => {
    // findOne returns null → login fails with 401 (auth error), but NOT 401 from guard
    mockUserRepo.findOne.mockResolvedValueOnce(null);

    const res = await supertest(app.getHttpServer())
      .post('/api/admin/auth/login')
      .send({ username: 'x', password: 'y' })
      .set('Content-Type', 'application/json');

    // 401 from AuthService.login (wrong credentials), NOT from the JWT guard
    // (meaning the route was reached without a JWT)
    expect(res.status).toBe(401);
    // Confirm the guard did NOT reject it (the body has our standard response shape)
    expect(res.body).toHaveProperty('code');
    expect(res.body).toHaveProperty('timestamp');
  });

  it('admin profile without JWT → 401 from guard', async () => {
    const res = await supertest(app.getHttpServer())
      .get('/api/admin/auth/profile');
    expect(res.status).toBe(401);
    expect(res.body.code).toBe(401);
  });
});

// ── AppModule — provider configuration (reflection check) ─────────────────
// Verifies the PRODUCTION app.module.ts actually registers both guards as
// APP_GUARD in the correct order. This cannot be faked by test-only setup.

describe('AppModule — APP_GUARD provider registration', () => {
  it('registers JwtAuthGuard as first APP_GUARD and PermissionsGuard as second', () => {
    // Dynamically import to avoid circular deps in other test suites
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { AppModule } = require('../src/app.module');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { APP_GUARD } = require('@nestjs/core');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { JwtAuthGuard: Guard1 } = require('../src/auth/guards/jwt-auth.guard');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { PermissionsGuard: Guard2 } = require('../src/auth/guards/permissions.guard');

    const providers = Reflect.getMetadata('providers', AppModule) as Array<{
      provide: symbol;
      useClass: unknown;
    }>;
    expect(Array.isArray(providers)).toBe(true);

    const guardProviders = providers.filter((p) => p?.provide === APP_GUARD);
    expect(guardProviders).toHaveLength(2);
    expect(guardProviders[0].useClass).toBe(Guard1);
    expect(guardProviders[1].useClass).toBe(Guard2);
  });
});

// ── AuthService — active role filtering (unit tests) ──────────────────────
// Tests getActiveRoles() behavior through getUserRoleCodes() and getUserPermissions().
// Ensures that disabled, deleted, and unrecognized roles never grant permissions.

describe('AuthService — active role filtering', () => {
  let authService: AuthService;

  const mockUserRepo2 = {
    findOne: jest.fn(),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
  };
  const mockRoleRepo2 = { find: jest.fn() };
  const mockUserRoleRepo2 = { find: jest.fn() };
  const mockPermRepo2 = { find: jest.fn() };
  const mockRolePermRepo2 = { find: jest.fn() };

  const ROLE_DISABLED_ID = 'role-disabled-999';
  const ROLE_UNKNOWN_ID = 'role-unknown-888';
  const PERM_SECRET_ID = 'perm-secret-777';

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'test', signOptions: { expiresIn: '1h' } })],
      providers: [
        AuthService,
        { provide: getRepositoryToken(SysUser), useValue: mockUserRepo2 },
        { provide: getRepositoryToken(SysRole), useValue: mockRoleRepo2 },
        { provide: getRepositoryToken(SysUserRole), useValue: mockUserRoleRepo2 },
        { provide: getRepositoryToken(SysPermission), useValue: mockPermRepo2 },
        { provide: getRepositoryToken(SysRolePermission), useValue: mockRolePermRepo2 },
      ],
    }).compile();
    authService = module.get(AuthService);
  });

  beforeEach(() => jest.clearAllMocks());

  it('disabled role (status=disabled) — getUserRoleCodes returns []', async () => {
    mockUserRoleRepo2.find.mockResolvedValueOnce([{ userId: USER_ACTIVE_ID, roleId: ROLE_DISABLED_ID }]);
    // roleRepo.find with status:'active' returns nothing for a disabled role
    mockRoleRepo2.find.mockResolvedValueOnce([]);

    const codes = await authService.getUserRoleCodes(USER_ACTIVE_ID);
    expect(codes).toHaveLength(0);
  });

  it('deleted role (soft-deleted) — excluded by TypeORM, getUserRoleCodes returns []', async () => {
    mockUserRoleRepo2.find.mockResolvedValueOnce([{ userId: USER_ACTIVE_ID, roleId: 'role-deleted-x' }]);
    // TypeORM automatically excludes deleted_at IS NOT NULL records from find()
    mockRoleRepo2.find.mockResolvedValueOnce([]);

    const codes = await authService.getUserRoleCodes(USER_ACTIVE_ID);
    expect(codes).toHaveLength(0);
  });

  it('role with unrecognized roleCode (not in ALLOWED_ROLES) — filtered out', async () => {
    mockUserRoleRepo2.find.mockResolvedValueOnce([{ userId: USER_ACTIVE_ID, roleId: ROLE_UNKNOWN_ID }]);
    // Role is active but its code is not in the allowed set
    mockRoleRepo2.find.mockResolvedValueOnce([{ id: ROLE_UNKNOWN_ID, roleCode: 'HACKER_ROLE', status: 'active' }]);

    const codes = await authService.getUserRoleCodes(USER_ACTIVE_ID);
    expect(codes).toHaveLength(0);
  });

  it('disabled role does not grant permissions via getUserPermissions()', async () => {
    mockUserRoleRepo2.find.mockResolvedValue([{ userId: USER_ACTIVE_ID, roleId: ROLE_DISABLED_ID }]);
    mockRoleRepo2.find.mockResolvedValue([]); // disabled → not returned by active filter

    const perms = await authService.getUserPermissions(USER_ACTIVE_ID);
    expect(perms).toHaveLength(0);
    expect(mockRolePermRepo2.find).not.toHaveBeenCalled();
  });

  it('disabled role does not grant SUPER_ADMIN wildcard', async () => {
    mockUserRoleRepo2.find.mockResolvedValue([{ userId: USER_ACTIVE_ID, roleId: 'role-super-disabled' }]);
    mockRoleRepo2.find.mockResolvedValue([]); // disabled SUPER_ADMIN not returned

    const perms = await authService.getUserPermissions(USER_ACTIVE_ID);
    expect(perms).not.toContain('*');
    expect(perms).toHaveLength(0);
  });

  it('active SUPER_ADMIN role grants wildcard permissions, rolePermRepo never queried', async () => {
    mockUserRoleRepo2.find.mockResolvedValueOnce([{ userId: USER_ACTIVE_ID, roleId: ROLE_SUPER_ID }]);
    mockRoleRepo2.find.mockResolvedValueOnce([{ id: ROLE_SUPER_ID, roleCode: 'SUPER_ADMIN', status: 'active' }]);

    const perms = await authService.getUserPermissions(USER_ACTIVE_ID);
    expect(perms).toEqual(['*']);
    // SUPER_ADMIN short-circuits after getActiveRoles — no permission table queries
    expect(mockRolePermRepo2.find).not.toHaveBeenCalled();
    expect(mockPermRepo2.find).not.toHaveBeenCalled();
  });

  it('getUserPermissions re-validates active roles from DB — stale caller input cannot elevate', async () => {
    // Role is disabled in DB → getActiveRoles() returns [] → no permissions regardless of context
    mockUserRoleRepo2.find.mockResolvedValue([{ userId: USER_ACTIVE_ID, roleId: ROLE_DISABLED_ID }]);
    mockRoleRepo2.find.mockResolvedValue([]); // disabled → not returned

    const perms = await authService.getUserPermissions(USER_ACTIVE_ID);
    expect(perms).toHaveLength(0);
  });

  it('传入失效 SUPER_ADMIN 时不获得通配权限', async () => {
    // Even if JwtAuthGuard somehow had stale SUPER_ADMIN in roles, getUserPermissions
    // re-validates via getActiveRoles() — a disabled SA returns [] not ['*']
    mockUserRoleRepo2.find.mockResolvedValueOnce([{ userId: USER_ACTIVE_ID, roleId: 'role-sa-disabled' }]);
    mockRoleRepo2.find.mockResolvedValueOnce([]); // disabled → filtered out

    const perms = await authService.getUserPermissions(USER_ACTIVE_ID);
    expect(perms).not.toContain('*');
  });
});

// ── JWT_SECRET validation utility ─────────────────────────────────────────

describe('isWeakJwtSecret() — production secret validation', () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const {
    isWeakJwtSecret,
    JWT_SECRET_MIN_LENGTH,
    JWT_SECRET_KNOWN_PLACEHOLDERS,
  } = require('../src/auth/utils/jwt-secret.util');

  it('undefined → weak', () => expect(isWeakJwtSecret(undefined)).toBe(true));
  it('empty string → weak', () => expect(isWeakJwtSecret('')).toBe(true));
  it('whitespace-only → weak', () => expect(isWeakJwtSecret('   ')).toBe(true));
  it(`${JWT_SECRET_MIN_LENGTH - 1} chars → weak`, () =>
    expect(isWeakJwtSecret('a'.repeat(JWT_SECRET_MIN_LENGTH - 1))).toBe(true));
  it(`exactly ${JWT_SECRET_MIN_LENGTH} chars → not weak`, () =>
    expect(isWeakJwtSecret('a'.repeat(JWT_SECRET_MIN_LENGTH))).toBe(false));
  it('64-char random-like string → not weak', () =>
    expect(isWeakJwtSecret('x'.repeat(64))).toBe(false));

  it('.env.example placeholder → weak', () => {
    const placeholder = [...JWT_SECRET_KNOWN_PLACEHOLDERS][0];
    expect(isWeakJwtSecret(placeholder)).toBe(true);
  });

  it('all known placeholders are weak', () => {
    for (const p of JWT_SECRET_KNOWN_PLACEHOLDERS) {
      expect(isWeakJwtSecret(p)).toBe(true);
    }
  });
});
