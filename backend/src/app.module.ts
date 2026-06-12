import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from './common/common.module';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { AdminApiModule } from './admin-api/admin-api.module';
import { HomeConfigModule } from './home-config/home-config.module';
import { ServiceGuideModule } from './service-guide/service-guide.module';
import { StatsModule } from './stats/stats.module';
import { PublicApiModule } from './public-api/public-api.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './auth/guards/permissions.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CommonModule,
    DatabaseModule,
    AuthModule,
    AdminApiModule,
    HomeConfigModule,
    ServiceGuideModule,
    StatsModule,
    PublicApiModule,
  ],
  providers: [
    // Guard execution order: JwtAuthGuard (authn) → PermissionsGuard (authz).
    // NestJS APP_GUARD providers run in declaration order.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
