import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ContentItem } from '../database/entities/content-item.entity';
import { ContentVersion } from '../database/entities/content-version.entity';

const PUBLISHED_ITEM_STATUS = 'published';
const PUBLISHED_VERSION_STATUS = 'published';

export interface GuideRelatedContentItem {
  id: string;
  title: string;
}

@Injectable()
export class GuideRelatedContentService {
  constructor(
    @InjectRepository(ContentItem)
    private readonly itemRepo: Repository<ContentItem>,
  ) {}

  async loadPublishedPolicies(ids: string[]): Promise<GuideRelatedContentItem[]> {
    return this.loadPublishedByType(ids, 'policy_file');
  }

  async loadPublishedFaqs(ids: string[]): Promise<GuideRelatedContentItem[]> {
    return this.loadPublishedByType(ids, 'faq');
  }

  private async loadPublishedByType(
    ids: string[],
    contentType: string,
  ): Promise<GuideRelatedContentItem[]> {
    if (ids.length === 0) return [];
    const unique = [...new Set(ids)];
    const rows = await this.itemRepo
      .createQueryBuilder('item')
      .innerJoin(
        ContentVersion,
        'version',
        'version.id = item.current_version_id AND version.status = :versionStatus',
        { versionStatus: PUBLISHED_VERSION_STATUS },
      )
      .where('item.id IN (:...ids)', { ids: unique })
      .andWhere('item.content_type = :contentType', { contentType })
      .andWhere('item.status = :itemStatus', { itemStatus: PUBLISHED_ITEM_STATUS })
      .andWhere('item.current_version_id IS NOT NULL')
      .select(['item.id AS id', 'item.title AS title'])
      .getRawMany<GuideRelatedContentItem>();

    const byId = new Map(rows.map((row) => [row.id, row]));
    return unique.filter((id) => byId.has(id)).map((id) => byId.get(id)!);
  }
}
