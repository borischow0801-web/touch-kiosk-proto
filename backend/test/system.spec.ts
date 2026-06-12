import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Reflector } from '@nestjs/core';
import { DataSource, EntityManager } from 'typeorm';
import * as bcryptjs from 'bcryptjs';
import supertest = require('supertest');
import { AuthService } from '../src/auth/auth.service';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../src/auth/guards/permissions.guard';
import { UsersService } from '../src/system/users.service';
import { RolesService } from '../src/system/roles.service';
import { UsersController } from '../src/admin-api/controllers/users.controller';
import { RolesController } from '../src/admin-api/controllers/roles.controller';
import { PermissionsController } from '../src/admin-api/controllers/permissions.controller';
import { SysUser } from '../src/database/entities/sys-user.entity';
import { SysRole } from '../src/database/entities/sys-role.entity';
import { SysUserRole } from '../src/database/entities/sys-user-role.entity';
import { SysPermission } from '../src/database/entities/sys-permission.entity';
import { SysRolePermission } from '../src/database/entities/sys-role-permission.entity';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { ResponseInterceptor } from '../src/common/interceptors/response.interceptor';

// ── Constants ──────────────────────────────────────────────────────────────

const TEST_JWT_SECRET = 'test-jwt-secret-for-system-spec';

// ── Fixtures ───────────────────────────────────────────────────────────────

const SA_USER_ID = 'user-super-001';
const SA_USER_ID_2 = 'user-super-002';
const EDITOR_USER_ID = 'user-editor-002';
const ROLE_SUPER_ID = 'role-super-001';
const ROLE_EDITOR_ID = 'role-editor-002';
const ROLE_REVIEWER_ID = 'role-reviewer-003';
const PERM_USER_READ_ID = 'perm-user-read-001';
const PERM_USER_CREATE_ID = 'perm-user-create-002';
const PERM_PERMISSION_READ_ID = 'perm-permission-read-012';

function createMockTxManager() {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn().mockResolvedValue({ affected: 1 }),
    softDelete: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    save: jest.fn().mockResolvedValue([]),
  };
}

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

function makePermUserRead(): SysPermission {
  return {
    id: PERM_USER_READ_ID, permissionCode: 'system:user:read',
    permissionName: '用户查看', moduleCode: 'system',
    permissionType: 'api', sortOrder: 1,
    createdAt: new Date(), updatedAt: new Date(),
  } as SysPermission;
}

function makePermUserCreate(): SysPermission {
  return {
    id: PERM_USER_CREATE_ID, permissionCode: 'system:user:create',
    permissionName: '用户创建', moduleCode: 'system',
    permissionType: 'api', sortOrder: 2,
    createdAt: new Date(), updatedAt: new Date(),
  } as SysPermission;
}

function makeReviewerRole(): SysRole {
  return {
    id: ROLE_REVIEWER_ID, roleCode: 'PUBLISH_REVIEWER', roleName: '审核发布员',
    description: null, status: 'active',
    createdAt: new Date('2024-01-01'), updatedAt: new Date('2024-01-01'), deletedAt: null,
  } as SysRole;
}

function makePermPermissionRead(): SysPermission {
  return {
    id: PERM_PERMISSION_READ_ID, permissionCode: 'system:permission:read',
    permissionName: '权限列表查看', moduleCode: 'system',
    permissionType: 'api', sortOrder: 12,
    createdAt: new Date(), updatedAt: new Date(),
  } as SysPermission;
}

function makeSaUser2(): SysUser {
  return {
    id: SA_USER_ID_2, username: 'superadmin2', passwordHash: '',
    realName: '超级管理员2', mobile: null, email: null, status: 'active',
    lastLoginAt: null, createdAt: new Date('2024-01-03'),
    updatedAt: new Date('2024-01-03'), deletedAt: null,
  } as SysUser;
}

function makeSaLink2(): SysUserRole {
  return { id: 'ur-002', userId: SA_USER_ID_2, roleId: ROLE_SUPER_ID, createdAt: new Date() } as SysUserRole;
}

// ── UsersService unit tests ────────────────────────────────────────────────

describe('UsersService — unit', () => {
  let service: UsersService;

  const mockUserRepo = {
    findOne: jest.fn(), find: jest.fn(), findAndCount: jest.fn(),
    create: jest.fn(), save: jest.fn(), update: jest.fn(), softDelete: jest.fn(),
  };
  const mockRoleRepo = { find: jest.fn(), findOne: jest.fn() };
  const mockUserRoleRepo = { find: jest.fn() };
  const mockDataSource = { transaction: jest.fn() };
  let mockTxManager: ReturnType<typeof createMockTxManager>;

  beforeEach(async () => {
    jest.resetAllMocks();
    mockTxManager = createMockTxManager();
    mockDataSource.transaction.mockImplementation(
      (cb: (manager: EntityManager) => Promise<unknown>) => cb(mockTxManager as unknown as EntityManager),
    );
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(SysUser), useValue: mockUserRepo },
        { provide: getRepositoryToken(SysRole), useValue: mockRoleRepo },
        { provide: getRepositoryToken(SysUserRole), useValue: mockUserRoleRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();
    service = module.get<UsersService>(UsersService);
  });

  describe('list()', () => {
    it('返回分页用户列表并附带角色代码', async () => {
      const saUser = makeSaUser();
      mockUserRepo.findAndCount.mockResolvedValueOnce([[saUser], 1]);
      mockUserRoleRepo.find.mockResolvedValueOnce([makeSaLink()]);
      mockRoleRepo.find.mockResolvedValueOnce([makeSaRole()]);

      const result = await service.list({ page: 1, pageSize: 20 });

      expect(result.total).toBe(1);
      expect(result.list[0].username).toBe('superadmin');
      expect(result.list[0].roles).toContain('SUPER_ADMIN');
    });

    it('无用户时返回空列表', async () => {
      mockUserRepo.findAndCount.mockResolvedValueOnce([[], 0]);
      const result = await service.list({ page: 1, pageSize: 20 });
      expect(result.total).toBe(0);
      expect(result.list).toHaveLength(0);
    });
  });

  describe('getById()', () => {
    it('返回用户详情与角色', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce(makeSaUser());
      mockUserRoleRepo.find.mockResolvedValueOnce([makeSaLink()]);
      mockRoleRepo.find.mockResolvedValueOnce([makeSaRole()]);

      const result = await service.getById(SA_USER_ID);
      expect(result.id).toBe(SA_USER_ID);
      expect(result.roles).toContain('SUPER_ADMIN');
    });

    it('用户不存在时抛出 404', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.getById('nonexistent')).rejects.toThrow('用户不存在');
    });
  });

  describe('create()', () => {
    it('创建用户并对密码哈希', async () => {
      mockUserRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ ...makeEditorUser(), username: 'newuser' });
      mockUserRepo.create.mockReturnValueOnce({ ...makeEditorUser(), username: 'newuser' });
      mockUserRepo.save.mockResolvedValueOnce({ ...makeEditorUser(), username: 'newuser' });
      mockUserRoleRepo.find.mockResolvedValueOnce([]);
      mockRoleRepo.find.mockResolvedValueOnce([]);

      const result = await service.create({ username: 'newuser', password: 'securepassword123' });
      expect(result.username).toBe('newuser');
      expect(mockUserRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ username: 'newuser' }),
      );
    });

    it('passwordHash 不等于明文且 bcrypt.compare 可验证', async () => {
      let savedHash = '';
      mockUserRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ ...makeEditorUser(), username: 'pwuser' });
      mockUserRepo.create.mockImplementation((data: { passwordHash: string }) => {
        savedHash = data.passwordHash;
        return { ...makeEditorUser(), username: 'pwuser', passwordHash: data.passwordHash };
      });
      mockUserRepo.save.mockImplementation(async (u: SysUser) => u);
      mockUserRoleRepo.find.mockResolvedValueOnce([]);
      mockRoleRepo.find.mockResolvedValueOnce([]);

      await service.create({ username: 'pwuser', password: 'securepassword123' });
      expect(savedHash).not.toBe('securepassword123');
      expect(await bcryptjs.compare('securepassword123', savedHash)).toBe(true);
    });

    it('用户名已存在时抛出 409', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce(makeSaUser());
      await expect(
        service.create({ username: 'superadmin', password: 'somepassword' }),
      ).rejects.toThrow('已存在');
    });
  });

  describe('update()', () => {
    it('PUT status=disabled 禁止禁用自己', async () => {
      await expect(
        service.update(SA_USER_ID, { status: 'disabled' }, SA_USER_ID),
      ).rejects.toThrow('不允许禁用自己的账号');
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });

    it('禁用最后一个 SUPER_ADMIN 时抛出 ForbiddenException', async () => {
      mockTxManager.findOne
        .mockResolvedValueOnce(makeSaUser())
        .mockResolvedValueOnce(makeSaRole())
        .mockResolvedValueOnce(null);
      mockTxManager.find.mockResolvedValueOnce([makeSaLink()]);

      await expect(
        service.update(SA_USER_ID, { status: 'disabled' }, EDITOR_USER_ID),
      ).rejects.toThrow('最后一个有效的超级管理员');
      expect(mockDataSource.transaction).toHaveBeenCalled();
    });

    it('状态禁用使用事务与悲观锁', async () => {
      mockTxManager.findOne.mockResolvedValueOnce(makeEditorUser());
      mockUserRepo.findOne.mockResolvedValueOnce(makeEditorUser());
      mockUserRoleRepo.find.mockResolvedValueOnce([]);

      await service.update(EDITOR_USER_ID, { realName: '新名称' }, SA_USER_ID);
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockTxManager.findOne).toHaveBeenCalledWith(
        SysUser,
        expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
      );
    });
  });

  describe('remove()', () => {
    it('删除自己时抛出 ForbiddenException', async () => {
      await expect(service.remove(SA_USER_ID, SA_USER_ID)).rejects.toThrow('不允许删除自己');
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });

    it('删除最后一个有效 SUPER_ADMIN 时抛出 ForbiddenException', async () => {
      mockTxManager.findOne
        .mockResolvedValueOnce(makeSaUser())
        .mockResolvedValueOnce(makeSaRole())
        .mockResolvedValueOnce(null);
      mockTxManager.find.mockResolvedValueOnce([makeSaLink()]);

      await expect(service.remove(SA_USER_ID, EDITOR_USER_ID)).rejects.toThrow(
        '最后一个有效的超级管理员',
      );
      expect(mockDataSource.transaction).toHaveBeenCalled();
    });

    it('软删除非最后 SA 用户', async () => {
      mockTxManager.findOne
        .mockResolvedValueOnce(makeEditorUser())
        .mockResolvedValueOnce(makeSaRole())
        .mockResolvedValueOnce(makeSaUser());
      mockTxManager.find.mockResolvedValueOnce([makeSaLink()]);

      await service.remove(EDITOR_USER_ID, SA_USER_ID);
      expect(mockTxManager.softDelete).toHaveBeenCalledWith(SysUser, EDITOR_USER_ID);
      expect(mockDataSource.transaction).toHaveBeenCalled();
    });
  });

  describe('disable()', () => {
    it('禁用自己时抛出 ForbiddenException', async () => {
      await expect(service.disable(SA_USER_ID, SA_USER_ID)).rejects.toThrow('不允许禁用自己');
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });

    it('禁用最后一个 SUPER_ADMIN 时抛出 ForbiddenException', async () => {
      mockTxManager.findOne
        .mockResolvedValueOnce(makeSaUser())
        .mockResolvedValueOnce(makeSaRole())
        .mockResolvedValueOnce(null);
      mockTxManager.find.mockResolvedValueOnce([makeSaLink()]);

      await expect(service.disable(SA_USER_ID, EDITOR_USER_ID)).rejects.toThrow(
        '最后一个有效的超级管理员',
      );
      expect(mockDataSource.transaction).toHaveBeenCalled();
    });

    it('POST disable 使用事务与悲观锁', async () => {
      mockTxManager.findOne
        .mockResolvedValueOnce(makeEditorUser())
        .mockResolvedValueOnce(makeSaRole())
        .mockResolvedValueOnce(makeSaUser());
      mockTxManager.find.mockResolvedValueOnce([makeSaLink()]);
      mockUserRepo.findOne.mockResolvedValueOnce(makeEditorUser());
      mockUserRoleRepo.find.mockResolvedValueOnce([]);

      await service.disable(EDITOR_USER_ID, SA_USER_ID);
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockTxManager.update).toHaveBeenCalledWith(SysUser, EDITOR_USER_ID, { status: 'disabled' });
    });
  });

  describe('resetPassword()', () => {
    it('为已存在用户更新密码哈希且不等于明文', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce(makeEditorUser());
      mockUserRepo.update.mockResolvedValueOnce({ affected: 1 });

      await service.resetPassword(EDITOR_USER_ID, { newPassword: 'NewPass123!' });
      const updateArg = mockUserRepo.update.mock.calls[0][1] as { passwordHash: string };
      expect(updateArg.passwordHash).not.toBe('NewPass123!');
      expect(await bcryptjs.compare('NewPass123!', updateArg.passwordHash)).toBe(true);
    });

    it('用户不存在时抛出 404', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce(null);
      await expect(
        service.resetPassword('bad-id', { newPassword: 'NewPass123!' }),
      ).rejects.toThrow('用户不存在');
    });
  });

  describe('assignRoles()', () => {
    it('禁止修改自己的角色', async () => {
      await expect(
        service.assignRoles(SA_USER_ID, { roleIds: [ROLE_EDITOR_ID] }, SA_USER_ID),
      ).rejects.toThrow('不允许修改自己的角色');
      expect(mockDataSource.transaction).not.toHaveBeenCalled();
    });

    it('有合法角色时分配成功', async () => {
      mockTxManager.findOne.mockResolvedValueOnce(makeEditorUser());
      mockTxManager.find
        .mockResolvedValueOnce([makeEditorRole()])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      mockUserRepo.findOne.mockResolvedValueOnce(makeEditorUser());
      mockUserRoleRepo.find.mockResolvedValueOnce([]);
      mockRoleRepo.find.mockResolvedValueOnce([]);

      const result = await service.assignRoles(EDITOR_USER_ID, { roleIds: [ROLE_EDITOR_ID] }, SA_USER_ID);
      expect(result.id).toBe(EDITOR_USER_ID);
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(mockTxManager.save).toHaveBeenCalled();
    });

    it('空数组清除角色', async () => {
      mockTxManager.findOne.mockResolvedValueOnce(makeEditorUser());
      mockTxManager.find.mockResolvedValueOnce([]);
      mockUserRepo.findOne.mockResolvedValueOnce(makeEditorUser());
      mockUserRoleRepo.find.mockResolvedValueOnce([]);

      await service.assignRoles(EDITOR_USER_ID, { roleIds: [] }, SA_USER_ID);
      expect(mockTxManager.delete).toHaveBeenCalledWith(SysUserRole, { userId: EDITOR_USER_ID });
      expect(mockTxManager.save).not.toHaveBeenCalled();
    });

    it('不允许移除最后一个有效 SUPER_ADMIN', async () => {
      mockTxManager.findOne
        .mockResolvedValueOnce(makeSaUser())
        .mockResolvedValueOnce(makeSaRole())
        .mockResolvedValueOnce(null);
      mockTxManager.find
        .mockResolvedValueOnce([makeSaLink()])
        .mockResolvedValueOnce([makeSaRole()])
        .mockResolvedValueOnce([makeSaLink()]);

      await expect(
        service.assignRoles(SA_USER_ID, { roleIds: [] }, EDITOR_USER_ID),
      ).rejects.toThrow('最后一个有效的超级管理员');
    });

    it('不存在、禁用角色被拒绝', async () => {
      mockTxManager.findOne.mockResolvedValueOnce(makeEditorUser());
      mockTxManager.find.mockResolvedValueOnce([]);

      await expect(
        service.assignRoles(EDITOR_USER_ID, { roleIds: ['missing-role-id'] }, SA_USER_ID),
      ).rejects.toThrow('不存在、已禁用或已删除');
    });

    it('未规划角色被拒绝', async () => {
      const badRole = { ...makeEditorRole(), roleCode: 'UNKNOWN_ROLE' };
      mockTxManager.findOne.mockResolvedValueOnce(makeEditorUser());
      mockTxManager.find.mockResolvedValueOnce([badRole]);

      await expect(
        service.assignRoles(EDITOR_USER_ID, { roleIds: [ROLE_EDITOR_ID] }, SA_USER_ID),
      ).rejects.toThrow('不在一期允许列表中');
    });

    it('事务失败后旧角色关联保持不变', async () => {
      const txFind = jest
        .fn()
        .mockResolvedValueOnce([makeEditorRole()])
        .mockResolvedValueOnce([]);
      mockDataSource.transaction.mockImplementationOnce(async (cb) => {
        const mgr = {
          findOne: jest.fn().mockResolvedValue(makeEditorUser()),
          find: txFind,
          delete: jest.fn().mockResolvedValue(undefined),
          save: jest.fn().mockRejectedValue(new Error('tx fail')),
        };
        await cb(mgr as unknown as EntityManager);
      });

      await expect(
        service.assignRoles(EDITOR_USER_ID, { roleIds: [ROLE_EDITOR_ID] }, SA_USER_ID),
      ).rejects.toThrow('tx fail');
      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(txFind).toHaveBeenCalled();
    });

    it('替换用户角色使用事务与悲观锁', async () => {
      mockTxManager.findOne.mockResolvedValueOnce(makeEditorUser());
      mockTxManager.find
        .mockResolvedValueOnce([makeEditorRole()])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      mockUserRepo.findOne.mockResolvedValueOnce(makeEditorUser());
      mockUserRoleRepo.find.mockResolvedValueOnce([]);

      await service.assignRoles(EDITOR_USER_ID, { roleIds: [ROLE_EDITOR_ID] }, SA_USER_ID);
      expect(mockTxManager.find).toHaveBeenCalledWith(
        SysRole,
        expect.objectContaining({ lock: { mode: 'pessimistic_write' } }),
      );
    });
  });

  describe('并发保护 — 事务入口统一', () => {
    it('update/disable/remove/assignRoles 均通过 dataSource.transaction', async () => {
      mockTxManager.findOne.mockResolvedValue(makeEditorUser());
      mockTxManager.find.mockResolvedValue([]);
      mockUserRepo.findOne.mockResolvedValue(makeEditorUser());
      mockUserRoleRepo.find.mockResolvedValue([]);

      await service.update(EDITOR_USER_ID, { realName: 'x' }, SA_USER_ID);
      await service.disable(EDITOR_USER_ID, SA_USER_ID);
      await service.remove(EDITOR_USER_ID, SA_USER_ID);
      await service.assignRoles(EDITOR_USER_ID, { roleIds: [] }, SA_USER_ID);

      expect(mockDataSource.transaction).toHaveBeenCalledTimes(4);
    });
  });
});

// ── RolesService unit tests ────────────────────────────────────────────────

describe('RolesService — unit', () => {
  let service: RolesService;

  const mockRoleRepo = {
    find: jest.fn(), findOne: jest.fn(),
    create: jest.fn(), save: jest.fn(), softDelete: jest.fn(),
  };
  const mockPermRepo = { find: jest.fn(), findOne: jest.fn() };
  const mockRolePermRepo = { find: jest.fn(), delete: jest.fn() };
  const mockUserRoleRepo = { find: jest.fn() };
  const mockDataSource = { transaction: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    // Re-establish persistent transaction implementation after reset
    mockDataSource.transaction.mockImplementation(
      (cb: (manager: unknown) => Promise<unknown>) =>
        cb({ delete: jest.fn().mockResolvedValue(undefined), save: jest.fn().mockResolvedValue([]) }),
    );
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        { provide: getRepositoryToken(SysRole), useValue: mockRoleRepo },
        { provide: getRepositoryToken(SysPermission), useValue: mockPermRepo },
        { provide: getRepositoryToken(SysRolePermission), useValue: mockRolePermRepo },
        { provide: getRepositoryToken(SysUserRole), useValue: mockUserRoleRepo },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();
    service = module.get<RolesService>(RolesService);
  });

  describe('list()', () => {
    it('返回角色列表并附带权限', async () => {
      mockRoleRepo.find.mockResolvedValueOnce([makeSaRole(), makeEditorRole()]);
      // attachPermissions: no role-permission links → permRepo.find not called
      mockRolePermRepo.find.mockResolvedValueOnce([]);

      const result = await service.list();
      expect(result).toHaveLength(2);
      expect(result[0].roleCode).toBe('SUPER_ADMIN');
      expect(result[0].permissions).toEqual([]);
    });
  });

  describe('create()', () => {
    it('创建允许列表内的新角色', async () => {
      mockRoleRepo.findOne.mockResolvedValueOnce(null); // 不存在
      const newRole = makeEditorRole();
      mockRoleRepo.create.mockReturnValueOnce(newRole);
      mockRoleRepo.save.mockResolvedValueOnce(newRole);
      mockRolePermRepo.find.mockResolvedValueOnce([]); // attachPermissions

      const result = await service.create({ roleCode: 'CONTENT_EDITOR', roleName: '内容编辑员' });
      expect(result.roleCode).toBe('CONTENT_EDITOR');
    });

    it('角色代码已存在时抛出 409', async () => {
      mockRoleRepo.findOne.mockResolvedValueOnce(makeEditorRole());
      await expect(
        service.create({ roleCode: 'CONTENT_EDITOR', roleName: '内容编辑员' }),
      ).rejects.toThrow('已存在');
    });

    it('非法角色代码时抛出 ForbiddenException', async () => {
      await expect(
        service.create({ roleCode: 'INVALID_CODE', roleName: '非法角色' }),
      ).rejects.toThrow('不在允许列表');
    });
  });

  describe('remove()', () => {
    it('角色下有关联用户时抛出 409', async () => {
      mockRoleRepo.findOne.mockResolvedValueOnce(makeEditorRole());
      mockUserRoleRepo.find.mockResolvedValueOnce([makeSaLink()]);
      await expect(service.remove(ROLE_EDITOR_ID)).rejects.toThrow('仍有关联用户');
    });

    it('无关联用户时软删除角色', async () => {
      mockRoleRepo.findOne.mockResolvedValueOnce(makeEditorRole());
      mockUserRoleRepo.find.mockResolvedValueOnce([]);
      mockRoleRepo.softDelete.mockResolvedValueOnce(undefined);

      await service.remove(ROLE_EDITOR_ID);
      expect(mockRoleRepo.softDelete).toHaveBeenCalledWith(ROLE_EDITOR_ID);
    });
  });

  describe('assignPermissions()', () => {
    it('使用事务替换权限关联', async () => {
      mockRoleRepo.findOne
        .mockResolvedValueOnce(makeEditorRole()) // findRoleOrFail (before assign)
        .mockResolvedValueOnce(makeEditorRole()); // findRoleOrFail (after assign, for re-fetch)
      mockPermRepo.find.mockResolvedValueOnce([makePermUserRead()]); // validate IDs
      mockRolePermRepo.find.mockResolvedValueOnce([]); // attachPermissions: no links

      const result = await service.assignPermissions(ROLE_EDITOR_ID, {
        permissionIds: [PERM_USER_READ_ID],
      });

      expect(mockDataSource.transaction).toHaveBeenCalled();
      expect(result.roleCode).toBe('CONTENT_EDITOR');
    });

    it('permissionId 不存在时抛出 404', async () => {
      mockRoleRepo.findOne.mockResolvedValueOnce(makeEditorRole());
      mockPermRepo.find.mockResolvedValueOnce([]); // 0 found, 1 requested
      await expect(
        service.assignPermissions(ROLE_EDITOR_ID, { permissionIds: ['bad-perm-id'] }),
      ).rejects.toThrow('不存在');
    });

    it('传入空数组时清除所有权限', async () => {
      mockRoleRepo.findOne
        .mockResolvedValueOnce(makeEditorRole())
        .mockResolvedValueOnce(makeEditorRole());
      mockRolePermRepo.find.mockResolvedValueOnce([]); // attachPermissions

      await service.assignPermissions(ROLE_EDITOR_ID, { permissionIds: [] });
      expect(mockDataSource.transaction).toHaveBeenCalled();
    });

    it('事务失败后旧权限关联保持不变', async () => {
      mockRoleRepo.findOne.mockResolvedValueOnce(makeEditorRole());
      mockPermRepo.find.mockResolvedValueOnce([makePermUserRead()]);
      mockDataSource.transaction.mockImplementationOnce(async (cb) => {
        const mgr = {
          delete: jest.fn().mockResolvedValue(undefined),
          save: jest.fn().mockRejectedValue(new Error('tx fail')),
        };
        await cb(mgr);
        throw new Error('tx fail');
      });

      await expect(
        service.assignPermissions(ROLE_EDITOR_ID, { permissionIds: [PERM_USER_READ_ID] }),
      ).rejects.toThrow('tx fail');
      expect(mockDataSource.transaction).toHaveBeenCalled();
    });
  });

  describe('listPermissions()', () => {
    it('返回公开 DTO 字段，不含内部字段', async () => {
      mockPermRepo.find.mockResolvedValueOnce([makePermUserRead(), makePermPermissionRead()]);

      const result = await service.listPermissions();
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: PERM_USER_READ_ID,
        permissionCode: 'system:user:read',
        permissionName: '用户查看',
        moduleCode: 'system',
        permissionType: 'api',
        sortOrder: 1,
      });
      expect(result[0]).not.toHaveProperty('createdAt');
      expect(result[0]).not.toHaveProperty('updatedAt');
    });
  });
});

// ── HTTP integration tests ─────────────────────────────────────────────────

describe('SystemModule — HTTP integration', () => {
  let app: INestApplication;
  let jwtService: JwtService;

  // Single set of mock repos shared by AuthService, UsersService, and RolesService
  const mockUserRepo = {
    findOne: jest.fn(), find: jest.fn(), findAndCount: jest.fn(),
    create: jest.fn(), save: jest.fn(), update: jest.fn(), softDelete: jest.fn(),
  };
  const mockRoleRepo = {
    find: jest.fn(), findOne: jest.fn(),
    create: jest.fn(), save: jest.fn(), softDelete: jest.fn(),
  };
  const mockUserRoleRepo = { find: jest.fn() };
  const mockPermRepo = { find: jest.fn(), findOne: jest.fn() };
  const mockRolePermRepo = { find: jest.fn(), delete: jest.fn() };
  const mockDataSource = { transaction: jest.fn() };

  function makeSaToken(): string {
    return jwtService.sign({ sub: SA_USER_ID, username: 'superadmin' });
  }

  /**
   * Sets up mock call sequence for a SUPER_ADMIN authenticated request:
   *   JwtAuthGuard → validateUserWithRoles → userRepo.findOne + userRoleRepo.find + roleRepo.find
   *   PermissionsGuard → SUPER_ADMIN fast-path (no extra DB calls)
   */
  function setupSaAuth(): void {
    mockUserRepo.findOne.mockResolvedValueOnce(makeSaUser());       // validateUserWithRoles
    mockUserRoleRepo.find.mockResolvedValueOnce([makeSaLink()]);     // getActiveRoles
    mockRoleRepo.find.mockResolvedValueOnce([makeSaRole()]);         // getActiveRoles → roleRepo
  }

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        JwtModule.register({ secret: TEST_JWT_SECRET, signOptions: { expiresIn: '1h' } }),
      ],
      controllers: [UsersController, RolesController, PermissionsController],
      providers: [
        AuthService,
        JwtAuthGuard,
        PermissionsGuard,
        Reflector,
        UsersService,
        RolesService,
        { provide: getRepositoryToken(SysUser), useValue: mockUserRepo },
        { provide: getRepositoryToken(SysRole), useValue: mockRoleRepo },
        { provide: getRepositoryToken(SysUserRole), useValue: mockUserRoleRepo },
        { provide: getRepositoryToken(SysPermission), useValue: mockPermRepo },
        { provide: getRepositoryToken(SysRolePermission), useValue: mockRolePermRepo },
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
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const mockTxManager = createMockTxManager();

  function setupEditorAuthNoPerms(): void {
    mockUserRepo.findOne.mockResolvedValue(makeEditorUser());
    mockUserRoleRepo.find.mockResolvedValue([
      { userId: EDITOR_USER_ID, roleId: ROLE_EDITOR_ID } as SysUserRole,
    ]);
    mockRoleRepo.find.mockResolvedValue([makeEditorRole()]);
    mockRolePermRepo.find.mockResolvedValue([]);
  }

  function makeEditorToken(): string {
    return jwtService.sign({ sub: EDITOR_USER_ID, username: 'editor01' });
  }

  beforeEach(() => {
    jest.resetAllMocks();
    Object.assign(mockTxManager, createMockTxManager());
    mockDataSource.transaction.mockImplementation(
      (cb: (manager: EntityManager) => Promise<unknown>) =>
        cb(mockTxManager as unknown as EntityManager),
    );
  });

  // ── Users ──────────────────────────────────────────────────────────────

  describe('GET /api/admin/system/users', () => {
    it('无 token 返回 401', async () => {
      const res = await supertest(app.getHttpServer()).get('/api/admin/system/users');
      expect(res.status).toBe(401);
    });

    it('SUPER_ADMIN 获取用户列表成功', async () => {
      setupSaAuth();
      mockUserRepo.findAndCount.mockResolvedValueOnce([[makeSaUser()], 1]);
      mockUserRoleRepo.find.mockResolvedValueOnce([makeSaLink()]);
      mockRoleRepo.find.mockResolvedValueOnce([makeSaRole()]);

      const res = await supertest(app.getHttpServer())
        .get('/api/admin/system/users')
        .set('Authorization', `Bearer ${makeSaToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.total).toBe(1);
      expect(res.body.data.list[0].username).toBe('superadmin');
      expect(res.body.data.list[0]).not.toHaveProperty('passwordHash');
    });
  });

  describe('POST /api/admin/system/users', () => {
    it('SUPER_ADMIN 创建用户成功', async () => {
      setupSaAuth();
      const newUser = { ...makeEditorUser(), id: 'new-u-id', username: 'brand_new' };
      mockUserRepo.findOne
        .mockResolvedValueOnce(null)     // username not taken
        .mockResolvedValueOnce(newUser); // getById after create
      mockUserRepo.create.mockReturnValueOnce(newUser);
      mockUserRepo.save.mockResolvedValueOnce(newUser);
      mockUserRoleRepo.find.mockResolvedValueOnce([]);
      mockRoleRepo.find.mockResolvedValueOnce([]);

      const res = await supertest(app.getHttpServer())
        .post('/api/admin/system/users')
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({ username: 'brand_new', password: 'StrongPass99' });

      expect(res.status).toBe(201);
      expect(res.body.code).toBe(0);
    });

    it('缺少密码字段返回 400', async () => {
      setupSaAuth();
      const res = await supertest(app.getHttpServer())
        .post('/api/admin/system/users')
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({ username: 'newuser_nopw' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/admin/system/users/:id/reset-password', () => {
    it('SUPER_ADMIN 重置密码成功', async () => {
      setupSaAuth();
      mockUserRepo.findOne.mockResolvedValueOnce(makeEditorUser());
      mockUserRepo.update.mockResolvedValueOnce({ affected: 1 });

      const res = await supertest(app.getHttpServer())
        .post(`/api/admin/system/users/${EDITOR_USER_ID}/reset-password`)
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({ newPassword: 'NewStrongPass99' });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });

    it('密码过短返回 400', async () => {
      setupSaAuth();
      const res = await supertest(app.getHttpServer())
        .post(`/api/admin/system/users/${EDITOR_USER_ID}/reset-password`)
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({ newPassword: 'short' });

      expect(res.status).toBe(400);
    });
  });

  // ── Roles ──────────────────────────────────────────────────────────────

  describe('GET /api/admin/system/roles', () => {
    it('SUPER_ADMIN 获取角色列表', async () => {
      setupSaAuth();
      mockRoleRepo.find.mockResolvedValueOnce([makeSaRole(), makeEditorRole()]);
      mockRolePermRepo.find.mockResolvedValueOnce([]); // no role-permission links

      const res = await supertest(app.getHttpServer())
        .get('/api/admin/system/roles')
        .set('Authorization', `Bearer ${makeSaToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });
  });

  describe('POST /api/admin/system/roles', () => {
    it('SUPER_ADMIN 创建角色成功', async () => {
      setupSaAuth();
      mockRoleRepo.findOne.mockResolvedValueOnce(null); // not exist
      const newRole = makeEditorRole();
      mockRoleRepo.create.mockReturnValueOnce(newRole);
      mockRoleRepo.save.mockResolvedValueOnce(newRole);
      mockRolePermRepo.find.mockResolvedValueOnce([]); // attachPermissions

      const res = await supertest(app.getHttpServer())
        .post('/api/admin/system/roles')
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({ roleCode: 'CONTENT_EDITOR', roleName: '内容编辑员' });

      expect(res.status).toBe(201);
      expect(res.body.code).toBe(0);
    });

    it('非法角色代码被 DTO 校验拦截返回 400', async () => {
      setupSaAuth();
      const res = await supertest(app.getHttpServer())
        .post('/api/admin/system/roles')
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({ roleCode: 'UNKNOWN_ROLE', roleName: '未知角色' });

      // @IsIn validator on CreateRoleDto rejects unknown codes before reaching service
      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/admin/system/roles/:id/permissions', () => {
    it('SUPER_ADMIN 分配权限成功', async () => {
      setupSaAuth();
      mockRoleRepo.findOne
        .mockResolvedValueOnce(makeEditorRole())
        .mockResolvedValueOnce(makeEditorRole());
      mockPermRepo.find.mockResolvedValueOnce([makePermUserRead()]);
      mockRolePermRepo.find.mockResolvedValueOnce([]);

      const res = await supertest(app.getHttpServer())
        .put(`/api/admin/system/roles/${ROLE_EDITOR_ID}/permissions`)
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({ permissionIds: [PERM_USER_READ_ID] });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });

    it('permissionIds 重复返回 400', async () => {
      setupSaAuth();
      const res = await supertest(app.getHttpServer())
        .put(`/api/admin/system/roles/${ROLE_EDITOR_ID}/permissions`)
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({ permissionIds: [PERM_USER_READ_ID, PERM_USER_READ_ID] });

      expect(res.status).toBe(400);
    });

    it('permissionId 超过 36 字符返回 400', async () => {
      setupSaAuth();
      const res = await supertest(app.getHttpServer())
        .put(`/api/admin/system/roles/${ROLE_EDITOR_ID}/permissions`)
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({ permissionIds: ['a'.repeat(37)] });

      expect(res.status).toBe(400);
    });

    it('不存在权限返回 404', async () => {
      setupSaAuth();
      mockRoleRepo.findOne.mockResolvedValueOnce(makeEditorRole());
      mockPermRepo.find.mockResolvedValueOnce([]);

      const res = await supertest(app.getHttpServer())
        .put(`/api/admin/system/roles/${ROLE_EDITOR_ID}/permissions`)
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({ permissionIds: ['nonexistent-perm-id'] });

      expect(res.status).toBe(404);
    });

    it('空数组清除权限', async () => {
      setupSaAuth();
      mockRoleRepo.findOne
        .mockResolvedValueOnce(makeEditorRole())
        .mockResolvedValueOnce(makeEditorRole());
      mockRolePermRepo.find.mockResolvedValueOnce([]);

      const res = await supertest(app.getHttpServer())
        .put(`/api/admin/system/roles/${ROLE_EDITOR_ID}/permissions`)
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({ permissionIds: [] });

      expect(res.status).toBe(200);
      expect(mockDataSource.transaction).toHaveBeenCalled();
    });
  });

  describe('PUT /api/admin/system/users/:id', () => {
    it('禁止禁用自己', async () => {
      setupSaAuth();
      const res = await supertest(app.getHttpServer())
        .put(`/api/admin/system/users/${SA_USER_ID}`)
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({ status: 'disabled' });

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/admin/system/users/:id/disable', () => {
    it('禁止禁用自己', async () => {
      setupSaAuth();
      const res = await supertest(app.getHttpServer())
        .post(`/api/admin/system/users/${SA_USER_ID}/disable`)
        .set('Authorization', `Bearer ${makeSaToken()}`);

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /api/admin/system/users/:id', () => {
    it('禁止删除自己', async () => {
      setupSaAuth();
      const res = await supertest(app.getHttpServer())
        .delete(`/api/admin/system/users/${SA_USER_ID}`)
        .set('Authorization', `Bearer ${makeSaToken()}`);

      expect(res.status).toBe(403);
    });
  });

  describe('PUT /api/admin/system/users/:id/roles', () => {
    it('有权限时分配成功', async () => {
      setupSaAuth();
      mockTxManager.findOne.mockResolvedValueOnce(makeEditorUser());
      mockTxManager.find
        .mockResolvedValueOnce([makeEditorRole()])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);
      mockUserRepo.findOne.mockResolvedValueOnce(makeEditorUser());
      mockUserRoleRepo.find.mockResolvedValueOnce([]);
      mockRoleRepo.find.mockResolvedValueOnce([]);

      const res = await supertest(app.getHttpServer())
        .put(`/api/admin/system/users/${EDITOR_USER_ID}/roles`)
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({ roleIds: [ROLE_EDITOR_ID] });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
    });

    it('无 Token 返回 401', async () => {
      const res = await supertest(app.getHttpServer())
        .put(`/api/admin/system/users/${EDITOR_USER_ID}/roles`)
        .send({ roleIds: [ROLE_EDITOR_ID] });

      expect(res.status).toBe(401);
    });

    it('无权限返回 403', async () => {
      setupEditorAuthNoPerms();

      const res = await supertest(app.getHttpServer())
        .put(`/api/admin/system/users/${EDITOR_USER_ID}/roles`)
        .set('Authorization', `Bearer ${makeEditorToken()}`)
        .send({ roleIds: [ROLE_EDITOR_ID] });

      expect(res.status).toBe(403);
    });

    it('禁止修改自己的角色', async () => {
      setupSaAuth();
      const res = await supertest(app.getHttpServer())
        .put(`/api/admin/system/users/${SA_USER_ID}/roles`)
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({ roleIds: [ROLE_EDITOR_ID] });

      expect(res.status).toBe(403);
    });

    it('roleIds 重复返回 400', async () => {
      setupSaAuth();
      const res = await supertest(app.getHttpServer())
        .put(`/api/admin/system/users/${EDITOR_USER_ID}/roles`)
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({ roleIds: [ROLE_EDITOR_ID, ROLE_EDITOR_ID] });

      expect(res.status).toBe(400);
    });

    it('roleId 超过 36 字符返回 400', async () => {
      setupSaAuth();
      const res = await supertest(app.getHttpServer())
        .put(`/api/admin/system/users/${EDITOR_USER_ID}/roles`)
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({ roleIds: ['b'.repeat(37)] });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/admin/system/permissions', () => {
    it('无 Token 返回 401', async () => {
      const res = await supertest(app.getHttpServer()).get('/api/admin/system/permissions');
      expect(res.status).toBe(401);
    });

    it('无权限返回 403', async () => {
      setupEditorAuthNoPerms();

      const res = await supertest(app.getHttpServer())
        .get('/api/admin/system/permissions')
        .set('Authorization', `Bearer ${makeEditorToken()}`);

      expect(res.status).toBe(403);
    });

    it('有权限返回成功且仅含公开字段', async () => {
      setupSaAuth();
      mockPermRepo.find.mockResolvedValueOnce([makePermUserRead(), makePermPermissionRead()]);

      const res = await supertest(app.getHttpServer())
        .get('/api/admin/system/permissions')
        .set('Authorization', `Bearer ${makeSaToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0]).toEqual({
        id: PERM_USER_READ_ID,
        permissionCode: 'system:user:read',
        permissionName: '用户查看',
        moduleCode: 'system',
        permissionType: 'api',
        sortOrder: 1,
      });
      expect(res.body.data[0]).not.toHaveProperty('createdAt');
      expect(res.body.data[0]).not.toHaveProperty('updatedAt');
    });
  });

  describe('POST /api/admin/system/users — 密码安全', () => {
    it('响应不包含 passwordHash', async () => {
      setupSaAuth();
      const newUser = { ...makeEditorUser(), id: 'new-u-id', username: 'brand_new' };
      mockUserRepo.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(newUser);
      mockUserRepo.create.mockReturnValueOnce(newUser);
      mockUserRepo.save.mockResolvedValueOnce(newUser);
      mockUserRoleRepo.find.mockResolvedValueOnce([]);
      mockRoleRepo.find.mockResolvedValueOnce([]);

      const res = await supertest(app.getHttpServer())
        .post('/api/admin/system/users')
        .set('Authorization', `Bearer ${makeSaToken()}`)
        .send({ username: 'brand_new', password: 'StrongPass99' });

      expect(res.status).toBe(201);
      expect(JSON.stringify(res.body)).not.toContain('passwordHash');
      expect(JSON.stringify(res.body)).not.toContain('StrongPass99');
    });
  });
});
