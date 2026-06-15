import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GuideDeptMapping } from '../database/entities/guide-dept-mapping.entity';
import { GuideThemeMapping } from '../database/entities/guide-theme-mapping.entity';
import { GuideItemConfig } from '../database/entities/guide-item-config.entity';
import { DeptMappingService } from './dept-mapping.service';
import { ThemeMappingService } from './theme-mapping.service';
import { ItemConfigService } from './item-config.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([GuideDeptMapping, GuideThemeMapping, GuideItemConfig]),
  ],
  providers: [DeptMappingService, ThemeMappingService, ItemConfigService],
  exports: [DeptMappingService, ThemeMappingService, ItemConfigService],
})
export class GuideConfigModule {}
