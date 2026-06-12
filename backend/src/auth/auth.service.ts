import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as bcryptjs from 'bcryptjs';
import { SysUser } from '../database/entities/sys-user.entity';
import { SysRole } from '../database/entities/sys-role.entity';
import { SysUserRole } from '../database/entities/sys-user-role.entity';
import { SysPermission } from '../database/entities/sys-permission.entity';
import { SysRolePermission } from '../database/entities/sys-role-permission.entity';
import { LoginDto } from './dto/login.dto';
import {
  AuthenticatedUser,
  JwtPayload,
  LoginResponseDto,
  ProfileResponseDto,
} from './dto/auth-response.dto';

const SUPER_ADMIN_ROLE = 'SUPER_ADMIN';
const ALLOWED_ROLES = new Set(['SUPER_ADMIN', 'CONTENT_EDITOR', 'PUBLISH_REVIEWER']);

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(SysUser)
    private readonly userRepo: Repository<SysUser>,
    @InjectRepository(SysRole)
    private readonly roleRepo: Repository<SysRole>,
    @InjectRepository(SysUserRole)
    private readonly userRoleRepo: Repository<SysUserRole>,
    @InjectRepository(SysPermission)
    private readonly permRepo: Repository<SysPermission>,
    @InjectRepository(SysRolePermission)
    private readonly rolePermRepo: Repository<SysRolePermission>,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.userRepo.findOne({
      where: { username: dto.username, status: 'active' },
    });
    if (!user) throw new UnauthorizedException('用户名或密码错误');

    const passwordValid = await bcryptjs.compare(dto.password, user.passwordHash);
    if (!passwordValid) throw new UnauthorizedException('用户名或密码错误');

    await this.userRepo.update(user.id, { lastLoginAt: new Date() });

    const roles = await this.getUserRoleCodes(user.id);
    const permissions = await this.getUserPermissions(user.id);

    const payload: JwtPayload = { sub: user.id, username: user.username };
    const accessToken = this.jwtService.sign(payload);

    this.logger.log(`User login: id=${user.id} username=${user.username}`);

    return {
      accessToken,
      userInfo: {
        id: user.id,
        username: user.username,
        realName: user.realName,
        status: user.status,
      },
      permissions,
    };
  }

  async validateUserWithRoles(userId: string): Promise<AuthenticatedUser | null> {
    const user = await this.userRepo.findOne({
      where: { id: userId, status: 'active' },
    });
    if (!user) return null;

    const roles = await this.getUserRoleCodes(user.id);
    return { id: user.id, username: user.username, status: user.status, roles };
  }

  async getProfile(userId: string): Promise<ProfileResponseDto> {
    const user = await this.userRepo.findOne({
      where: { id: userId, status: 'active' },
    });
    if (!user) throw new UnauthorizedException('用户不存在或已被禁用');

    const roles = await this.getUserRoleCodes(userId);
    const permissions = await this.getUserPermissions(userId);

    return {
      userInfo: {
        id: user.id,
        username: user.username,
        realName: user.realName,
        status: user.status,
      },
      roles,
      permissions,
    };
  }

  async getUserRoleCodes(userId: string): Promise<string[]> {
    const roles = await this.getActiveRoles(userId);
    return roles.map((r) => r.roleCode);
  }

  /**
   * Returns permission codes for a user.
   * SUPER_ADMIN check is performed internally via getActiveRoles() — the caller
   * cannot elevate privileges by passing a roles array.
   * Signature deliberately takes only userId.
   */
  async getUserPermissions(userId: string): Promise<string[]> {
    const activeRoles = await this.getActiveRoles(userId);

    if (activeRoles.some((r) => r.roleCode === SUPER_ADMIN_ROLE)) return ['*'];
    if (activeRoles.length === 0) return [];

    const activeRoleIds = activeRoles.map((r) => r.id);
    const rolePerms = await this.rolePermRepo.find({
      where: { roleId: In(activeRoleIds) },
    });
    if (rolePerms.length === 0) return [];

    const permIds = [...new Set(rolePerms.map((rp) => rp.permissionId))];
    const permissions = await this.permRepo.find({ where: { id: In(permIds) } });
    return permissions.map((p) => p.permissionCode);
  }

  /**
   * Single source of truth for active role resolution.
   * Three-layer filter: status='active' + deleted_at IS NULL (TypeORM) + ALLOWED_ROLES whitelist.
   */
  private async getActiveRoles(userId: string): Promise<SysRole[]> {
    const userRoles = await this.userRoleRepo.find({ where: { userId } });
    if (userRoles.length === 0) return [];

    const roleIds = userRoles.map((ur) => ur.roleId);
    const roles = await this.roleRepo.find({
      where: { id: In(roleIds), status: 'active' },
    });
    return roles.filter((r) => ALLOWED_ROLES.has(r.roleCode));
  }
}
