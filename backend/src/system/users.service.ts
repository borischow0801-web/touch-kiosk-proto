import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Like, Repository } from 'typeorm';
import * as bcryptjs from 'bcryptjs';
import { SysUser } from '../database/entities/sys-user.entity';
import { SysRole } from '../database/entities/sys-role.entity';
import { SysUserRole } from '../database/entities/sys-user-role.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UserListQueryDto } from './dto/user-list-query.dto';
import { AssignRolesDto } from './dto/assign-roles.dto';
import { ALLOWED_ROLE_CODES, SUPER_ADMIN_CODE } from './constants/role-codes';

export interface UserListItem {
  id: string;
  username: string;
  realName: string | null;
  mobile: string | null;
  email: string | null;
  status: string;
  lastLoginAt: Date | null;
  createdAt: Date;
  roles: string[];
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @InjectRepository(SysUser)
    private readonly userRepo: Repository<SysUser>,
    @InjectRepository(SysRole)
    private readonly roleRepo: Repository<SysRole>,
    @InjectRepository(SysUserRole)
    private readonly userRoleRepo: Repository<SysUserRole>,
    private readonly dataSource: DataSource,
  ) {}

  async list(
    query: UserListQueryDto,
  ): Promise<{ list: UserListItem[]; total: number; page: number; pageSize: number }> {
    const { page, pageSize, username, status } = query;

    const where: Record<string, unknown> = {};
    if (username) where['username'] = Like(`%${username}%`);
    if (status) where['status'] = status;

    const [users, total] = await this.userRepo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const list = await this.attachRoleCodes(users);
    return { list, total, page, pageSize };
  }

  async getById(id: string): Promise<UserListItem> {
    const user = await this.findUserOrFail(id);
    const [item] = await this.attachRoleCodes([user]);
    return item;
  }

  async create(dto: CreateUserDto): Promise<UserListItem> {
    const existing = await this.userRepo.findOne({ where: { username: dto.username } });
    if (existing) {
      throw new ConflictException(`用户名 "${dto.username}" 已存在`);
    }

    const passwordHash = await bcryptjs.hash(dto.password, 10);
    const user = this.userRepo.create({
      username: dto.username,
      passwordHash,
      realName: dto.realName ?? null,
      mobile: dto.mobile ?? null,
      email: dto.email ?? null,
      status: 'active',
    });
    await this.userRepo.save(user);

    this.logger.log(`User created: id=${user.id} username=${user.username}`);
    return this.getById(user.id);
  }

  async update(id: string, dto: UpdateUserDto, currentUserId: string): Promise<UserListItem> {
    if (dto.status === 'disabled' && id === currentUserId) {
      throw new ForbiddenException('不允许禁用自己的账号');
    }

    await this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(SysUser, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) throw new NotFoundException('用户不存在');

      if (dto.status === 'disabled' && user.status !== 'disabled') {
        await this.guardLastSuperAdminInTx(id, manager);
      }

      const patch: Partial<SysUser> = {};
      if (dto.realName !== undefined) patch.realName = dto.realName ?? null;
      if (dto.mobile !== undefined) patch.mobile = dto.mobile ?? null;
      if (dto.email !== undefined) patch.email = dto.email ?? null;
      if (dto.status !== undefined) patch.status = dto.status;

      if (Object.keys(patch).length > 0) {
        await manager.update(SysUser, id, patch);
      }
    });

    this.logger.log(`User updated: id=${id}`);
    return this.getById(id);
  }

  async remove(id: string, currentUserId: string): Promise<void> {
    if (id === currentUserId) {
      throw new ForbiddenException('不允许删除自己的账号');
    }

    await this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(SysUser, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) throw new NotFoundException('用户不存在');

      await this.guardLastSuperAdminInTx(id, manager);
      await manager.softDelete(SysUser, id);
    });

    this.logger.log(`User soft-deleted: id=${id}`);
  }

  async resetPassword(id: string, dto: ResetPasswordDto): Promise<void> {
    await this.findUserOrFail(id);
    const passwordHash = await bcryptjs.hash(dto.newPassword, 10);
    await this.userRepo.update(id, { passwordHash });
    this.logger.log(`Password reset: userId=${id}`);
  }

  async disable(id: string, currentUserId: string): Promise<UserListItem> {
    if (id === currentUserId) {
      throw new ForbiddenException('不允许禁用自己的账号');
    }

    await this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(SysUser, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) throw new NotFoundException('用户不存在');
      if (user.status === 'disabled') return;

      await this.guardLastSuperAdminInTx(id, manager);
      await manager.update(SysUser, id, { status: 'disabled' });
    });

    this.logger.log(`User disabled: id=${id}`);
    return this.getById(id);
  }

  async enable(id: string): Promise<UserListItem> {
    const user = await this.findUserOrFail(id);
    if (user.status === 'active') return this.getById(id);
    await this.userRepo.update(id, { status: 'active' });
    this.logger.log(`User enabled: id=${id}`);
    return this.getById(id);
  }

  async assignRoles(id: string, dto: AssignRolesDto, currentUserId: string): Promise<UserListItem> {
    if (id === currentUserId) {
      throw new ForbiddenException('不允许修改自己的角色');
    }

    const { roleIds } = dto;

    await this.dataSource.transaction(async (manager) => {
      const user = await manager.findOne(SysUser, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!user) throw new NotFoundException('用户不存在');

      let verifiedRoles: SysRole[] = [];
      if (roleIds.length > 0) {
        verifiedRoles = await manager.find(SysRole, {
          where: { id: In(roleIds), status: 'active' },
          lock: { mode: 'pessimistic_write' },
        });
        if (verifiedRoles.length !== roleIds.length) {
          throw new NotFoundException('部分角色 ID 不存在、已禁用或已删除');
        }
        for (const role of verifiedRoles) {
          if (!ALLOWED_ROLE_CODES.has(role.roleCode)) {
            throw new ForbiddenException(`角色 "${role.roleCode}" 不在一期允许列表中`);
          }
        }
      }

      const currentLinks = await manager.find(SysUserRole, { where: { userId: id } });
      if (currentLinks.length > 0) {
        const currentRoleIds = currentLinks.map((l) => l.roleId);
        const currentRoles = await manager.find(SysRole, { where: { id: In(currentRoleIds) } });
        const hadSa = currentRoles.some((r) => r.roleCode === SUPER_ADMIN_CODE);
        const willHaveSa = verifiedRoles.some((r) => r.roleCode === SUPER_ADMIN_CODE);
        if (hadSa && !willHaveSa) {
          await this.guardLastSuperAdminInTx(id, manager);
        }
      }

      await manager.delete(SysUserRole, { userId: id });
      if (roleIds.length > 0) {
        const newLinks = roleIds.map((roleId) => {
          const link = new SysUserRole();
          link.userId = id;
          link.roleId = roleId;
          return link;
        });
        await manager.save(SysUserRole, newLinks);
      }
    });

    this.logger.log(`Roles assigned: userId=${id} count=${roleIds.length}`);
    return this.getById(id);
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private async findUserOrFail(id: string): Promise<SysUser> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('用户不存在');
    return user;
  }

  /**
   * Throws if targetUserId is the only remaining active SUPER_ADMIN.
   * Must be called within an open transaction — locks the SUPER_ADMIN role row
   * with FOR UPDATE to serialize concurrent disable/delete/role-change operations.
   */
  private async guardLastSuperAdminInTx(
    targetUserId: string,
    manager: EntityManager,
  ): Promise<void> {
    // Lock the SA role row → serializes all concurrent SA-affecting operations
    const saRole = await manager.findOne(SysRole, {
      where: { roleCode: SUPER_ADMIN_CODE, status: 'active' },
      lock: { mode: 'pessimistic_write' },
    });
    if (!saRole) return; // no active SA role exists

    const saLinks = await manager.find(SysUserRole, { where: { roleId: saRole.id } });
    if (saLinks.length === 0) return;

    const otherSaUserIds = saLinks.map((l) => l.userId).filter((uid) => uid !== targetUserId);
    if (otherSaUserIds.length === 0) {
      throw new ForbiddenException('不允许禁用或删除最后一个有效的超级管理员');
    }

    const activeOtherSA = await manager.findOne(SysUser, {
      where: { id: In(otherSaUserIds), status: 'active' },
    });
    if (!activeOtherSA) {
      throw new ForbiddenException('不允许禁用或删除最后一个有效的超级管理员');
    }
  }

  private async attachRoleCodes(users: SysUser[]): Promise<UserListItem[]> {
    if (users.length === 0) return [];

    const userIds = users.map((u) => u.id);
    const userRoles = await this.userRoleRepo.find({ where: { userId: In(userIds) } });

    const roleIds = [...new Set(userRoles.map((ur) => ur.roleId))];
    const roles =
      roleIds.length > 0 ? await this.roleRepo.find({ where: { id: In(roleIds) } }) : [];

    const roleMap = new Map<string, string>(roles.map((r) => [r.id, r.roleCode]));
    const userRoleMap = new Map<string, string[]>();
    for (const ur of userRoles) {
      const code = roleMap.get(ur.roleId);
      if (!code) continue;
      const arr = userRoleMap.get(ur.userId) ?? [];
      arr.push(code);
      userRoleMap.set(ur.userId, arr);
    }

    return users.map((u) => ({
      id: u.id,
      username: u.username,
      realName: u.realName,
      mobile: u.mobile,
      email: u.email,
      status: u.status,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
      roles: userRoleMap.get(u.id) ?? [],
    }));
  }
}
