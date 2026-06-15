import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository } from 'typeorm';
import { GuideItemConfig } from '../database/entities/guide-item-config.entity';
import { CreateItemConfigDto } from './dto/create-item-config.dto';
import { ItemConfigListQueryDto } from './dto/item-config-list-query.dto';
import { UpdateItemConfigDto } from './dto/update-item-config.dto';
import { normalizeGuideCode } from './utils/normalize-guide-code.util';
import { normalizePlatformItemId } from './utils/normalize-platform-item-id.util';
import {
  normalizeRelatedIdsForResponse,
  serializeRelatedIds,
} from './utils/related-ids.util';
import { isGuideUniqueViolation } from './utils/unique-code.util';

export interface ItemConfigListItem {
  id: string;
  platformItemId: string;
  itemName: string;
  displayName: string;
  deptCode: string | null;
  themeCode: string | null;
  isHot: number;
  isRecommend: number;
  isVisible: number;
  sortOrder: number;
  relatedPolicyIds: string[];
  relatedFaqIds: string[];
  createdAt: Date;
}

@Injectable()
export class ItemConfigService {
  private readonly logger = new Logger(ItemConfigService.name);

  constructor(
    @InjectRepository(GuideItemConfig)
    private readonly itemConfigRepo: Repository<GuideItemConfig>,
  ) {}

  async list(
    query: ItemConfigListQueryDto,
  ): Promise<{ list: ItemConfigListItem[]; total: number; page: number; pageSize: number }> {
    const { page, pageSize, deptCode, themeCode, isHot, isRecommend, isVisible } = query;
    const where: FindOptionsWhere<GuideItemConfig> = {};

    if (deptCode !== undefined) where.deptCode = deptCode;
    if (themeCode !== undefined) where.themeCode = themeCode;
    if (isHot !== undefined) where.isHot = isHot;
    if (isRecommend !== undefined) where.isRecommend = isRecommend;
    if (isVisible !== undefined) where.isVisible = isVisible;

    const [rows, total] = await this.itemConfigRepo.findAndCount({
      where,
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return {
      list: rows.map((r) => this.toListItem(r)),
      total,
      page,
      pageSize,
    };
  }

  async create(dto: CreateItemConfigDto): Promise<ItemConfigListItem> {
    const platformItemId = normalizePlatformItemId(dto.platformItemId);
    await this.assertPlatformItemIdUnique(platformItemId);

    const item = this.itemConfigRepo.create({
      platformItemId,
      itemName: dto.itemName.trim(),
      displayName: dto.displayName.trim(),
      deptCode: dto.deptCode != null ? normalizeGuideCode(dto.deptCode) : null,
      themeCode: dto.themeCode != null ? normalizeGuideCode(dto.themeCode) : null,
      isHot: dto.isHot ?? 0,
      isRecommend: dto.isRecommend ?? 0,
      isVisible: dto.isVisible ?? 1,
      sortOrder: dto.sortOrder ?? 0,
      relatedPolicyIds: serializeRelatedIds(dto.relatedPolicyIds),
      relatedFaqIds: serializeRelatedIds(dto.relatedFaqIds),
    });

    const saved = await this.saveItem(item);
    this.logger.log(`Item config created: id=${saved.id} platformItemId=${saved.platformItemId}`);
    return this.toListItem(saved);
  }

  async update(id: string, dto: UpdateItemConfigDto): Promise<ItemConfigListItem> {
    const item = await this.findItemOrFail(id);

    if (dto.itemName !== undefined) item.itemName = dto.itemName.trim();
    if (dto.displayName !== undefined) item.displayName = dto.displayName.trim();
    if (dto.deptCode !== undefined) {
      item.deptCode = dto.deptCode === null ? null : normalizeGuideCode(dto.deptCode);
    }
    if (dto.themeCode !== undefined) {
      item.themeCode = dto.themeCode === null ? null : normalizeGuideCode(dto.themeCode);
    }
    if (dto.isHot !== undefined) item.isHot = dto.isHot;
    if (dto.isRecommend !== undefined) item.isRecommend = dto.isRecommend;
    if (dto.isVisible !== undefined) item.isVisible = dto.isVisible;
    if (dto.sortOrder !== undefined) item.sortOrder = dto.sortOrder;
    if (dto.relatedPolicyIds !== undefined) {
      item.relatedPolicyIds = serializeRelatedIds(dto.relatedPolicyIds);
    }
    if (dto.relatedFaqIds !== undefined) {
      item.relatedFaqIds = serializeRelatedIds(dto.relatedFaqIds);
    }

    const saved = await this.saveItem(item);
    this.logger.log(`Item config updated: id=${id}`);
    return this.toListItem(saved);
  }

  async remove(id: string): Promise<void> {
    await this.findItemOrFail(id);
    await this.itemConfigRepo.softDelete(id);
    this.logger.log(`Item config soft-deleted: id=${id}`);
  }

  private async assertPlatformItemIdUnique(platformItemId: string): Promise<void> {
    const existing = await this.itemConfigRepo.findOne({
      where: { platformItemId },
      withDeleted: true,
    });
    if (existing) {
      throw new ConflictException(`平台事项 ID "${platformItemId}" 已存在`);
    }
  }

  private async saveItem(item: GuideItemConfig): Promise<GuideItemConfig> {
    try {
      return await this.itemConfigRepo.save(item);
    } catch (error) {
      if (isGuideUniqueViolation(error, 'platformItem')) {
        throw new ConflictException(`平台事项 ID "${item.platformItemId}" 已存在`);
      }
      throw error;
    }
  }

  private async findItemOrFail(id: string): Promise<GuideItemConfig> {
    const item = await this.itemConfigRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('事项展示配置不存在');
    return item;
  }

  private toListItem(row: GuideItemConfig): ItemConfigListItem {
    return {
      id: row.id,
      platformItemId: row.platformItemId,
      itemName: row.itemName,
      displayName: row.displayName,
      deptCode: row.deptCode,
      themeCode: row.themeCode,
      isHot: row.isHot,
      isRecommend: row.isRecommend,
      isVisible: row.isVisible,
      sortOrder: row.sortOrder,
      relatedPolicyIds: normalizeRelatedIdsForResponse(row.relatedPolicyIds),
      relatedFaqIds: normalizeRelatedIdsForResponse(row.relatedFaqIds),
      createdAt: row.createdAt,
    };
  }
}
