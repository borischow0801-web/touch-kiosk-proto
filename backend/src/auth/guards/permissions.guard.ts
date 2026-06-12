import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { AuthService } from '../auth.service';
import { AuthenticatedUser } from '../dto/auth-response.dto';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[] | undefined>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    // No @RequirePermissions → access is governed only by JwtAuthGuard
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException();
    }

    // SUPER_ADMIN bypasses all permission checks
    if (user.roles.includes('SUPER_ADMIN')) return true;

    const userPermissions = await this.authService.getUserPermissions(user.id);

    const hasAll = required.every((p) => userPermissions.includes(p));
    if (!hasAll) throw new ForbiddenException();
    return true;
  }
}
