import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentItem } from '../database/entities/content-item.entity';
import { ContentVersion } from '../database/entities/content-version.entity';
import { PublishRecord } from '../database/entities/publish-record.entity';
import { ContentPublishService } from './content-publish.service';
import { PublishService } from './publish.service';

@Module({
  imports: [TypeOrmModule.forFeature([ContentItem, ContentVersion, PublishRecord])],
  providers: [ContentPublishService, PublishService],
  exports: [PublishService],
})
export class PublishModule {}
