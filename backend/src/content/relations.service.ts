import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { ContentItem } from '../database/entities/content-item.entity';
import { ContentRelation } from '../database/entities/content-relation.entity';
import { ALLOWED_RELATION_TYPES } from './constants/relation-types';
import { ReplaceRelationsDto } from './dto/replace-relations.dto';

export interface RelationListItem {
  id: string;
  sourceId: string;
  targetId: string;
  relationType: string;
  sortOrder: number;
  targetTitle: string;
  targetContentType: string;
  createdAt: Date;
}

@Injectable()
export class RelationsService {
  private readonly logger = new Logger(RelationsService.name);

  constructor(
    @InjectRepository(ContentItem)
    private readonly itemRepo: Repository<ContentItem>,
    @InjectRepository(ContentRelation)
    private readonly relationRepo: Repository<ContentRelation>,
    private readonly dataSource: DataSource,
  ) {}

  async list(sourceId: string): Promise<RelationListItem[]> {
    await this.findItemOrFail(sourceId);
    const relations = await this.relationRepo.find({
      where: { sourceId },
      order: { sortOrder: 'ASC', createdAt: 'ASC' },
    });
    if (relations.length === 0) return [];

    const targetIds = relations.map((r) => r.targetId);
    const targets = await this.itemRepo.find({ where: { id: In(targetIds) } });
    const targetMap = new Map(targets.map((t) => [t.id, t]));

    return relations.map((r) => {
      const target = targetMap.get(r.targetId);
      return {
        id: r.id,
        sourceId: r.sourceId,
        targetId: r.targetId,
        relationType: r.relationType,
        sortOrder: r.sortOrder,
        targetTitle: target?.title ?? '',
        targetContentType: target?.contentType ?? '',
        createdAt: r.createdAt,
      };
    });
  }

  async replace(sourceId: string, dto: ReplaceRelationsDto): Promise<RelationListItem[]> {
    await this.findItemOrFail(sourceId);

    for (const rel of dto.relations) {
      if (rel.targetId === sourceId) {
        throw new BadRequestException('内容关联不允许自关联');
      }
      if (!(ALLOWED_RELATION_TYPES as ReadonlySet<string>).has(rel.relationType)) {
        throw new BadRequestException(`关联类型 "${rel.relationType}" 不在允许列表中`);
      }
      await this.findItemOrFail(rel.targetId);
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.delete(ContentRelation, { sourceId });
      if (dto.relations.length > 0) {
        const links = dto.relations.map((rel, idx) => {
          const link = new ContentRelation();
          link.sourceId = sourceId;
          link.targetId = rel.targetId;
          link.relationType = rel.relationType;
          link.sortOrder = rel.sortOrder ?? idx;
          return link;
        });
        await manager.save(ContentRelation, links);
      }
    });

    this.logger.log(`Relations replaced: sourceId=${sourceId} count=${dto.relations.length}`);
    return this.list(sourceId);
  }

  private async findItemOrFail(id: string): Promise<ContentItem> {
    const item = await this.itemRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('内容不存在');
    return item;
  }
}
