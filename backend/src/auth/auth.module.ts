import { Module, Logger } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SysUser } from '../database/entities/sys-user.entity';
import { SysRole } from '../database/entities/sys-role.entity';
import { SysUserRole } from '../database/entities/sys-user-role.entity';
import { SysPermission } from '../database/entities/sys-permission.entity';
import { SysRolePermission } from '../database/entities/sys-role-permission.entity';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { isWeakJwtSecret, JWT_SECRET_MIN_LENGTH } from './utils/jwt-secret.util';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([
      SysUser,
      SysRole,
      SysUserRole,
      SysPermission,
      SysRolePermission,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('JWT_SECRET');
        const nodeEnv = config.get<string>('NODE_ENV') ?? 'development';

        if (isWeakJwtSecret(secret)) {
          if (nodeEnv === 'production') {
            // Do not log the secret value itself
            Logger.error(
              `JWT_SECRET is missing, too short (minimum ${JWT_SECRET_MIN_LENGTH} characters), ` +
                `or uses a known placeholder value. Refusing to start.`,
              'AuthModule',
            );
            process.exit(1);
          }
          Logger.warn(
            'JWT_SECRET is not set, too short, or uses a placeholder value. ' +
              'Using insecure default — for development only. Set a strong secret before deploying.',
            'AuthModule',
          );
        }

        const DEV_FALLBACK = 'dev-insecure-jwt-secret-CHANGE-IN-PRODUCTION';
        return {
          secret: isWeakJwtSecret(secret) ? DEV_FALLBACK : secret!,
          signOptions: {
            expiresIn: config.get<string>('JWT_EXPIRES_IN') ?? '8h',
          },
        };
      },
    }),
  ],
  providers: [AuthService, JwtAuthGuard, PermissionsGuard],
  exports: [AuthService, JwtAuthGuard, PermissionsGuard, JwtModule],
})
export class AuthModule {}
