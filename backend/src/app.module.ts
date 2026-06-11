import { Module } from '@nestjs/common';
import { CommonModule } from './common/common.module';
import { HomeConfigModule } from './home-config/home-config.module';
import { ServiceGuideModule } from './service-guide/service-guide.module';
import { StatsModule } from './stats/stats.module';
import { PublicApiModule } from './public-api/public-api.module';

@Module({
  imports: [
    CommonModule,
    HomeConfigModule,
    ServiceGuideModule,
    StatsModule,
    PublicApiModule,
  ],
})
export class AppModule {}
