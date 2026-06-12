import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Like, Repository } from 'typeorm';
import { ContentItem } from '../database/entities/content-item.entity';
import { ContentVersion } from '../database/entities/content-version.entity';
import { ContentCategory } from '../database/entities/content-category.entity';
import { ALLOWED_CONTENT_TYPES } from './constants/content-types';
import { ItemListQueryDto } from './dto/item-list-query.dto';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

export interface ItemListItem {
  id: string;
  contentType: string;
  title: string;
  subtitle: string | null;
  summary: string | null;
  categoryId: string | null;
  currentVersionId: string | null;
  status: string;
  isTop: number;
  isRecommend: number;
  sortOrder: number;
  createdAt: Date;
}

export interface ItemDetail extends ItemListItem {
  publishAt: Date | null;
  sourceType: string | null;
  sourceUrl: string | null;
  createdBy: string | null;
  updatedBy: string | null;
}

export interface VersionListItem {
  id: string;
  contentId: string;
  versionNo: number;
  title: string;
  summary: string | null;
  status: string;
  changeRemark: string | null;
  createdBy: string | null;
  createdAt: Date;
}

export interface VersionDetail extends VersionListItem {
  body: string | null;
  extraJson: string | null;
}

@Injectable()
export class ItemsService {
  private readonly logger = new Logger(ItemsService.name);

  constructor(
    @InjectRepository(ContentItem)
    private readonly itemRepo: Repository<ContentItem>,
    @InjectRepository(ContentVersion)
    private readonly versionRepo: Repository<ContentVersion>,
    @InjectRepository(ContentCategory)
    private readonly categoryRepo: Repository<ContentCategory>,
    private readonly dataSource: DataSource,
  ) {}

  async list(
    query: ItemListQueryDto,
  ): Promise<{ list: ItemListItem[]; total: number; page: number; pageSize: number }> {
    const { page, pageSize, contentType, categoryId, status, title } = query;
    const where: Record<string, unknown> = {};
    if (contentType) where['contentType'] = contentType;
    if (categoryId) where['categoryId'] = categoryId;
    if (status) where['status'] = status;
    if (title) where['title'] = Like(`%${title}%`);

    const [rows, total] = await this.itemRepo.findAndCount({
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

  async getById(id: string): Promise<ItemDetail> {
    const item = await this.findItemOrFail(id);
    return this.toDetail(item);
  }

  async create(dto: CreateItemDto, userId: string): Promise<ItemDetail> {
    if (!(ALLOWED_CONTENT_TYPES as ReadonlySet<string>).has(dto.contentType)) {
      throw new BadRequestException(`内容类型 "${dto.contentType}" 不在允许列表中`);
    }
    if (dto.categoryId) {
      await this.validateCategoryContentType(dto.categoryId, dto.contentType);
    }

    return this.dataSource.transaction(async (manager) => {
      const item = manager.create(ContentItem, {
        contentType: dto.contentType,
        title: dto.title,
        subtitle: dto.subtitle ?? null,
        summary: dto.summary ?? null,
        categoryId: dto.categoryId ?? null,
        status: 'draft',
        sortOrder: dto.sortOrder ?? 0,
        isTop: 0,
        isRecommend: 0,
        createdBy: userId,
        updatedBy: userId,
      });
      await manager.save(ContentItem, item);

      const version = manager.create(ContentVersion, {
        contentId: item.id,
        versionNo: 1,
        title: dto.title,
        summary: dto.summary ?? null,
        body: dto.body ?? null,
        extraJson: dto.extraJson ?? null,
        status: 'draft',
        changeRemark: dto.changeRemark ?? '初始版本',
        createdBy: userId,
      });
      await manager.save(ContentVersion, version);

      this.logger.log(`Content item created: id=${item.id} versionId=${version.id}`);
      return this.toDetail(item);
    });
  }

  async update(id: string, dto: UpdateItemDto, userId: string): Promise<ItemDetail> {
    const versionFields = ['title', 'summary', 'body', 'extraJson', 'changeRemark'] as const;
    const hasVersionChange = versionFields.some(
      (f) => dto[f] !== undefined,
    );

    return this.dataSource.transaction(async (manager) => {
      const item = await manager.findOne(ContentItem, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!item) throw new NotFoundException('内容不存在');

      if (dto.categoryId !== undefined) {
        if (dto.categoryId) {
          await this.validateCategoryContentType(dto.categoryId, item.contentType);
        }
        item.categoryId = dto.categoryId || null;
      }
      if (dto.subtitle !== undefined) item.subtitle = dto.subtitle ?? null;
      if (dto.sortOrder !== undefined) item.sortOrder = dto.sortOrder;
      if (dto.isTop !== undefined) item.isTop = dto.isTop;
      if (dto.isRecommend !== undefined) item.isRecommend = dto.isRecommend;
      if (dto.sourceType !== undefined) item.sourceType = dto.sourceType ?? null;
      if (dto.sourceUrl !== undefined) item.sourceUrl = dto.sourceUrl ?? null;
      item.updatedBy = userId;

      if (hasVersionChange) {
        const latestRows = await manager.find(ContentVersion, {
          where: { contentId: id },
          order: { versionNo: 'DESC' },
          take: 1,
        });
        const latestVersion = latestRows[0] ?? null;
        const nextNo = (latestVersion?.versionNo ?? 0) + 1;
        const newTitle = dto.title ?? item.title;
        const newSummary = dto.summary !== undefined ? dto.summary ?? null : item.summary;

        const version = manager.create(ContentVersion, {
          contentId: id,
          versionNo: nextNo,
          title: newTitle,
          summary: newSummary,
          body: dto.body !== undefined ? dto.body ?? null : latestVersion?.body ?? null,
          extraJson:
            dto.extraJson !== undefined ? dto.extraJson ?? null : latestVersion?.extraJson ?? null,
          status: 'draft',
          changeRemark: dto.changeRemark ?? null,
          createdBy: userId,
        });
        await manager.save(ContentVersion, version);

        // 已发布/已撤回内容的新草稿审核期间，主表 title/summary 保持已发布版本
        if (item.status !== 'published' && item.status !== 'withdrawn') {
          item.title = newTitle;
          item.summary = newSummary;
        }
      }

      await manager.save(ContentItem, item);
      this.logger.log(`Content item updated: id=${id}`);
      return this.toDetail(item);
    });
  }

  async remove(id: string): Promise<void> {
    await this.findItemOrFail(id);
    await this.itemRepo.softDelete(id);
    this.logger.log(`Content item soft-deleted: id=${id}`);
  }

  async listVersions(contentId: string): Promise<VersionListItem[]> {
    await this.findItemOrFail(contentId);
    const versions = await this.versionRepo.find({
      where: { contentId },
      order: { versionNo: 'DESC' },
    });
    return versions.map((v) => this.toVersionListItem(v));
  }

  async getVersionById(versionId: string): Promise<VersionDetail> {
    const version = await this.versionRepo.findOne({ where: { id: versionId } });
    if (!version) throw new NotFoundException('版本不存在');
    return this.toVersionDetail(version);
  }

  private async findItemOrFail(id: string): Promise<ContentItem> {
    const item = await this.itemRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('内容不存在');
    return item;
  }

  private async findCategoryOrFail(id: string): Promise<ContentCategory> {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) throw new NotFoundException('分类不存在');
    return category;
  }

  private async validateCategoryContentType(
    categoryId: string,
    contentType: string,
  ): Promise<void> {
    const category = await this.findCategoryOrFail(categoryId);
    if (category.contentType !== contentType) {
      throw new BadRequestException(
        `内容与分类的 contentType 不一致：内容=${contentType}，分类=${category.contentType}`,
      );
    }
  }

  private toListItem(row: ContentItem): ItemListItem {
    return {
      id: row.id,
      contentType: row.contentType,
      title: row.title,
      subtitle: row.subtitle,
      summary: row.summary,
      categoryId: row.categoryId,
      currentVersionId: row.currentVersionId ?? null,
      status: row.status,
      isTop: row.isTop,
      isRecommend: row.isRecommend,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt,
    };
  }

  private toDetail(row: ContentItem): ItemDetail {
    return {
      ...this.toListItem(row),
      publishAt: row.publishAt,
      sourceType: row.sourceType,
      sourceUrl: row.sourceUrl,
      createdBy: row.createdBy,
      updatedBy: row.updatedBy,
    };
  }

  private toVersionListItem(v: ContentVersion): VersionListItem {
    return {
      id: v.id,
      contentId: v.contentId,
      versionNo: v.versionNo,
      title: v.title,
      summary: v.summary,
      status: v.status,
      changeRemark: v.changeRemark,
      createdBy: v.createdBy,
      createdAt: v.createdAt,
    };
  }

  private toVersionDetail(v: ContentVersion): VersionDetail {
    return {
      ...this.toVersionListItem(v),
      body: v.body,
      extraJson: v.extraJson,
    };
  }
}
