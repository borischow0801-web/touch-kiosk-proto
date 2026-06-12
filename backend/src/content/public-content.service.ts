import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { createPageResult, PageResult } from '../common/dto/page-result.dto';
import { ContentItem } from '../database/entities/content-item.entity';
import { ContentVersion } from '../database/entities/content-version.entity';
import { PublicContentListQueryDto } from './dto/public-content-list-query.dto';
import {
  PublicContentDetail,
  PublicContentListItem,
} from './types/public-content.types';

const PUBLISHED_ITEM_STATUS = 'published';
const PUBLISHED_VERSION_STATUS = 'published';

@Injectable()
export class PublicContentService {
  constructor(
    @InjectRepository(ContentItem)
    private readonly itemRepo: Repository<ContentItem>,
  ) {}

  async list(
    contentType: string,
    query: PublicContentListQueryDto,
  ): Promise<PageResult<PublicContentListItem>> {
    const { page, pageSize, categoryId } = query;
    let qb = this.buildPublishedQuery(contentType);
    if (categoryId) {
      qb = qb.andWhere('item.category_id = :categoryId', { categoryId });
    }

    qb = qb
      .orderBy('item.is_top', 'DESC')
      .addOrderBy('item.sort_order', 'ASC')
      .addOrderBy('item.publish_at', 'DESC')
      .addOrderBy('item.id', 'ASC');

    const total = await qb.getCount();
    const rows = await qb
      .select(this.listSelectFields())
      .offset((page - 1) * pageSize)
      .limit(pageSize)
      .getRawMany<PublicContentListItem>();

    return createPageResult(rows, total, page, pageSize);
  }

  async getById(contentType: string, id: string): Promise<PublicContentDetail> {
    const row = await this.buildPublishedQuery(contentType)
      .andWhere('item.id = :id', { id })
      .select([...this.listSelectFields(), 'version.body AS body'])
      .getRawOne<PublicContentDetail>();

    if (!row) {
      throw new NotFoundException('内容不存在');
    }
    return row;
  }

  private buildPublishedQuery(contentType: string): SelectQueryBuilder<ContentItem> {
    return this.itemRepo
      .createQueryBuilder('item')
      .innerJoin(
        ContentVersion,
        'version',
        'version.id = item.current_version_id AND version.status = :versionStatus',
        { versionStatus: PUBLISHED_VERSION_STATUS },
      )
      .where('item.content_type = :contentType', { contentType })
      .andWhere('item.status = :itemStatus', { itemStatus: PUBLISHED_ITEM_STATUS })
      .andWhere('item.current_version_id IS NOT NULL');
  }

  private listSelectFields(): string[] {
    return [
      'item.id AS id',
      'item.content_type AS contentType',
      'item.title AS title',
      'item.subtitle AS subtitle',
      'item.summary AS summary',
      'item.category_id AS categoryId',
      'item.cover_file_id AS coverFileId',
      'item.publish_at AS publishAt',
      'item.source_type AS sourceType',
      'item.source_url AS sourceUrl',
    ];
  }
}
