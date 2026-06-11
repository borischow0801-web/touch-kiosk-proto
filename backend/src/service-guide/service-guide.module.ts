import { Module } from '@nestjs/common';
import { ServiceGuideService } from './service-guide.service';

@Module({
  providers: [ServiceGuideService],
  exports: [ServiceGuideService],
})
export class ServiceGuideModule {}
