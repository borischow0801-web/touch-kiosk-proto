import { Controller, Post, Get, Body, Req, HttpCode } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../../auth/auth.service';
import { LoginDto } from '../../auth/dto/login.dto';
import { Public } from '../../auth/decorators/public.decorator';
import { AuthenticatedUser } from '../../auth/dto/auth-response.dto';

@Controller('admin/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /** POST /api/admin/auth/login — public, no JWT required */
  @Public()
  @Post('login')
  @HttpCode(200)
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  /**
   * POST /api/admin/auth/logout — requires valid JWT.
   * Token invalidation is client-side (no server-side blacklist in Phase 1).
   * This endpoint exists for audit logging purposes.
   */
  @Post('logout')
  @HttpCode(200)
  async logout(@Req() req: Request & { user?: AuthenticatedUser }) {
    // Future: write to sys_login_log when SystemModule is implemented
    return null;
  }

  /** GET /api/admin/auth/profile — returns current user's info, roles and permissions */
  @Get('profile')
  async profile(@Req() req: Request & { user?: AuthenticatedUser }) {
    const user = req.user as AuthenticatedUser;
    return this.authService.getProfile(user.id);
  }
}
