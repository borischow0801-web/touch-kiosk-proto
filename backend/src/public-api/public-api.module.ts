import { Module } from '@nestjs/common';
import { HomeConfigModule } from '../home-config/home-config.module';
import { ServiceGuideModule } from '../service-guide/service-guide.module';
import { StatsModule } from '../stats/stats.module';
import { HomeController } from './controllers/home.controller';
import { ServiceGuideController } from './controllers/service-guide.controller';
import { StatsController } from './controllers/stats.controller';

@Module({
  imports: [HomeConfigModule, ServiceGuideModule, StatsModule],
  controllers: [HomeController, ServiceGuideController, StatsController],
})
export class PublicApiModule {}
