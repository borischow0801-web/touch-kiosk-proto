import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentCategory } from '../database/entities/content-category.entity';
import { ContentItem } from '../database/entities/content-item.entity';
import { ContentVersion } from '../database/entities/content-version.entity';
import { ContentRelation } from '../database/entities/content-relation.entity';
import { CategoriesService } from './categories.service';
import { ItemsService } from './items.service';
import { RelationsService } from './relations.service';
import { PublicContentService } from './public-content.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ContentCategory,
      ContentItem,
      ContentVersion,
      ContentRelation,
    ]),
  ],
  providers: [CategoriesService, ItemsService, RelationsService, PublicContentService],
  exports: [CategoriesService, ItemsService, RelationsService, PublicContentService],
})
export class ContentModule {}
