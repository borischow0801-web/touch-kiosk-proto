import {
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { SysRole } from '../database/entities/sys-role.entity';
import { SysPermission } from '../database/entities/sys-permission.entity';
import { SysRolePermission } from '../database/entities/sys-role-permission.entity';
import { SysUserRole } from '../database/entities/sys-user-role.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { AssignPermissionsDto } from './dto/assign-permissions.dto';
import { ALLOWED_ROLE_CODES } from './constants/role-codes';

export interface RoleDetail {
  id: string;
  roleCode: string;
  roleName: string;
  description: string | null;
  status: string;
  createdAt: Date;
  permissions: Array<{ id: string; permissionCode: string; permissionName: string; moduleCode: string }>;
}

export interface PermissionListItem {
  id: string;
  permissionCode: string;
  permissionName: string;
  moduleCode: string;
  permissionType: string;
  sortOrder: number;
}

@Injectable()
export class RolesService {
  private readonly logger = new Logger(RolesService.name);

  constructor(
    @InjectRepository(SysRole)
    private readonly roleRepo: Repository<SysRole>,
    @InjectRepository(SysPermission)
    private readonly permRepo: Repository<SysPermission>,
    @InjectRepository(SysRolePermission)
    private readonly rolePermRepo: Repository<SysRolePermission>,
    @InjectRepository(SysUserRole)
    private readonly userRoleRepo: Repository<SysUserRole>,
    private readonly dataSource: DataSource,
  ) {}

  async list(): Promise<RoleDetail[]> {
    const roles = await this.roleRepo.find({ order: { createdAt: 'ASC' } });
    return this.attachPermissions(roles);
  }

  async create(dto: CreateRoleDto): Promise<RoleDetail> {
    if (!ALLOWED_ROLE_CODES.has(dto.roleCode)) {
      throw new ForbiddenException(`角色代码 "${dto.roleCode}" 不在允许列表中`);
    }

    const existing = await this.roleRepo.findOne({ where: { roleCode: dto.roleCode } });
    if (existing) {
      throw new ConflictException(`角色代码 "${dto.roleCode}" 已存在`);
    }

    const role = this.roleRepo.create({
      roleCode: dto.roleCode,
      roleName: dto.roleName,
      description: dto.description ?? null,
      status: 'active',
    });
    await this.roleRepo.save(role);

    this.logger.log(`Role created: id=${role.id} roleCode=${role.roleCode}`);
    const [detail] = await this.attachPermissions([role]);
    return detail;
  }

  async update(id: string, dto: UpdateRoleDto): Promise<RoleDetail> {
    const role = await this.findRoleOrFail(id);

    if (dto.roleName !== undefined) role.roleName = dto.roleName;
    if (dto.description !== undefined) role.description = dto.description ?? null;

    await this.roleRepo.save(role);
    this.logger.log(`Role updated: id=${id}`);
    const [detail] = await this.attachPermissions([role]);
    return detail;
  }

  async remove(id: string): Promise<void> {
    await this.findRoleOrFail(id);

    const links = await this.userRoleRepo.find({ where: { roleId: id } });
    if (links.length > 0) {
      throw new ConflictException('该角色下仍有关联用户，不允许删除');
    }

    await this.roleRepo.softDelete(id);
    this.logger.log(`Role soft-deleted: id=${id}`);
  }

  async assignPermissions(id: string, dto: AssignPermissionsDto): Promise<RoleDetail> {
    await this.findRoleOrFail(id);

    const { permissionIds } = dto;

    // Validate all provided IDs exist
    if (permissionIds.length > 0) {
      const found = await this.permRepo.find({ where: { id: In(permissionIds) } });
      if (found.length !== permissionIds.length) {
        throw new NotFoundException('部分权限 ID 不存在');
      }
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(SysRolePermission, { roleId: id });

      if (permissionIds.length > 0) {
        const newLinks = permissionIds.map((permId) => {
          const link = new SysRolePermission();
          link.roleId = id;
          link.permissionId = permId;
          return link;
        });
        await manager.save(SysRolePermission, newLinks);
      }
    });

    this.logger.log(`Permissions assigned: roleId=${id} count=${permissionIds.length}`);
    const role = await this.findRoleOrFail(id);
    const [detail] = await this.attachPermissions([role]);
    return detail;
  }

  async listPermissions(): Promise<PermissionListItem[]> {
    const permissions = await this.permRepo.find({
      order: { moduleCode: 'ASC', sortOrder: 'ASC' },
    });
    return permissions.map((p) => ({
      id: p.id,
      permissionCode: p.permissionCode,
      permissionName: p.permissionName,
      moduleCode: p.moduleCode,
      permissionType: p.permissionType,
      sortOrder: p.sortOrder,
    }));
  }

  // ── Private helpers ──────────────────────────────────────────────────────

  private async findRoleOrFail(id: string): Promise<SysRole> {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) throw new NotFoundException('角色不存在');
    return role;
  }

  private async attachPermissions(roles: SysRole[]): Promise<RoleDetail[]> {
    if (roles.length === 0) return [];

    const roleIds = roles.map((r) => r.id);
    const rolePerms = await this.rolePermRepo.find({ where: { roleId: In(roleIds) } });

    const permIds = [...new Set(rolePerms.map((rp) => rp.permissionId))];
    const permissions = permIds.length > 0
      ? await this.permRepo.find({ where: { id: In(permIds) } })
      : [];

    const permMap = new Map(permissions.map((p) => [p.id, p]));
    const rolePermMap = new Map<string, SysPermission[]>();
    for (const rp of rolePerms) {
      const perm = permMap.get(rp.permissionId);
      if (!perm) continue;
      const arr = rolePermMap.get(rp.roleId) ?? [];
      arr.push(perm);
      rolePermMap.set(rp.roleId, arr);
    }

    return roles.map((r) => ({
      id: r.id,
      roleCode: r.roleCode,
      roleName: r.roleName,
      description: r.description,
      status: r.status,
      createdAt: r.createdAt,
      permissions: (rolePermMap.get(r.id) ?? []).map((p) => ({
        id: p.id,
        permissionCode: p.permissionCode,
        permissionName: p.permissionName,
        moduleCode: p.moduleCode,
      })),
    }));
  }
}
