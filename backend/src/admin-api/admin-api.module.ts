import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SystemModule } from '../system/system.module';
import { ContentModule } from '../content/content.module';
import { PublishModule } from '../publish/publish.module';
import { GuideConfigModule } from '../guide-config/guide-config.module';
import { AuthController } from './controllers/auth.controller';
import { UsersController } from './controllers/users.controller';
import { RolesController } from './controllers/roles.controller';
import { PermissionsController } from './controllers/permissions.controller';
import { ContentCategoriesController } from './controllers/content-categories.controller';
import { ContentItemsController } from './controllers/content-items.controller';
import { PublishController } from './controllers/publish.controller';
import { GuideDeptsController } from './controllers/guide-depts.controller';
import { GuideThemesController } from './controllers/guide-themes.controller';
import { GuideItemConfigsController } from './controllers/guide-item-configs.controller';

@Module({
  imports: [AuthModule, SystemModule, ContentModule, PublishModule, GuideConfigModule],
  controllers: [
    AuthController,
    UsersController,
    RolesController,
    PermissionsController,
    ContentCategoriesController,
    ContentItemsController,
    PublishController,
    GuideDeptsController,
    GuideThemesController,
    GuideItemConfigsController,
  ],
})
export class AdminApiModule {}
