import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Like, Repository } from 'typeorm';
import { ContentCategory } from '../database/entities/content-category.entity';
import { ContentItem } from '../database/entities/content-item.entity';
import { ALLOWED_CONTENT_TYPES } from './constants/content-types';
import { CategoryListQueryDto } from './dto/category-list-query.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

export interface CategoryListItem {
  id: string;
  parentId: string | null;
  categoryName: string;
  contentType: string;
  sortOrder: number;
  status: string;
  createdAt: Date;
}

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    @InjectRepository(ContentCategory)
    private readonly categoryRepo: Repository<ContentCategory>,
    @InjectRepository(ContentItem)
    private readonly itemRepo: Repository<ContentItem>,
  ) {}

  async list(
    query: CategoryListQueryDto,
  ): Promise<{ list: CategoryListItem[]; total: number; page: number; pageSize: number }> {
    const { page, pageSize, contentType, parentId } = query;
    const where: Record<string, unknown> = {};
    if (contentType) where['contentType'] = contentType;
    if (parentId !== undefined) {
      where['parentId'] = parentId === '' ? IsNull() : parentId;
    }

    const [rows, total] = await this.categoryRepo.findAndCount({
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

  async create(dto: CreateCategoryDto): Promise<CategoryListItem> {
    if (!(ALLOWED_CONTENT_TYPES as ReadonlySet<string>).has(dto.contentType)) {
      throw new BadRequestException(`内容类型 "${dto.contentType}" 不在允许列表中`);
    }
    if (dto.parentId) {
      const parent = await this.findCategoryOrFail(dto.parentId);
      if (parent.contentType !== dto.contentType) {
        throw new BadRequestException(
          `子分类与父分类的 contentType 必须一致：父=${parent.contentType}，子=${dto.contentType}`,
        );
      }
    }

    const category = this.categoryRepo.create({
      parentId: dto.parentId ?? null,
      categoryName: dto.categoryName,
      contentType: dto.contentType,
      sortOrder: dto.sortOrder ?? 0,
      status: 'active',
    });
    await this.categoryRepo.save(category);
    this.logger.log(`Category created: id=${category.id}`);
    return this.toListItem(category);
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<CategoryListItem> {
    const category = await this.findCategoryOrFail(id);
    if (dto.categoryName !== undefined) category.categoryName = dto.categoryName;
    if (dto.sortOrder !== undefined) category.sortOrder = dto.sortOrder;
    if (dto.status !== undefined) category.status = dto.status;
    await this.categoryRepo.save(category);
    this.logger.log(`Category updated: id=${id}`);
    return this.toListItem(category);
  }

  async remove(id: string): Promise<void> {
    await this.findCategoryOrFail(id);

    const childCount = await this.categoryRepo.count({
      where: { parentId: id },
    });
    if (childCount > 0) {
      throw new ConflictException('该分类下仍有子分类，不允许删除');
    }

    const itemCount = await this.itemRepo.count({
      where: { categoryId: id },
    });
    if (itemCount > 0) {
      throw new ConflictException('该分类下仍有内容，不允许删除');
    }

    await this.categoryRepo.softDelete(id);
    this.logger.log(`Category soft-deleted: id=${id}`);
  }

  private async findCategoryOrFail(id: string): Promise<ContentCategory> {
    const category = await this.categoryRepo.findOne({ where: { id } });
    if (!category) throw new NotFoundException('分类不存在');
    return category;
  }

  private toListItem(row: ContentCategory): CategoryListItem {
    return {
      id: row.id,
      parentId: row.parentId,
      categoryName: row.categoryName,
      contentType: row.contentType,
      sortOrder: row.sortOrder,
      status: row.status,
      createdAt: row.createdAt,
    };
  }
}
