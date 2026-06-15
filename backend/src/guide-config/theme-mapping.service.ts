import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GuideThemeMapping } from '../database/entities/guide-theme-mapping.entity';
import { CreateThemeMappingDto } from './dto/create-theme-mapping.dto';
import { ThemeMappingListQueryDto } from './dto/theme-mapping-list-query.dto';
import { UpdateThemeMappingDto } from './dto/update-theme-mapping.dto';
import { isUniqueCodeViolation } from './utils/unique-code.util';
import { normalizeGuideCode } from './utils/normalize-guide-code.util';

export interface ThemeMappingListItem {
  id: string;
  themeName: string;
  themeCode: string;
  platformParamJson: string | null;
  icon: string | null;
  isVisible: number;
  sortOrder: number;
  createdAt: Date;
}

@Injectable()
export class ThemeMappingService {
  private readonly logger = new Logger(ThemeMappingService.name);

  constructor(
    @InjectRepository(GuideThemeMapping)
    private readonly themeRepo: Repository<GuideThemeMapping>,
  ) {}

  async list(
    query: ThemeMappingListQueryDto,
  ): Promise<{ list: ThemeMappingListItem[]; total: number; page: number; pageSize: number }> {
    const { page, pageSize } = query;

    const [rows, total] = await this.themeRepo.findAndCount({
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

  async create(dto: CreateThemeMappingDto): Promise<ThemeMappingListItem> {
    const themeCode = normalizeGuideCode(dto.themeCode);
    await this.assertThemeCodeUnique(themeCode);

    const theme = this.themeRepo.create({
      themeName: dto.themeName.trim(),
      themeCode,
      platformParamJson: dto.platformParamJson ?? null,
      icon: dto.icon ?? null,
      isVisible: dto.isVisible ?? 1,
      sortOrder: dto.sortOrder ?? 0,
    });
    const saved = await this.saveTheme(theme);
    this.logger.log(`Theme mapping created: id=${saved.id} themeCode=${saved.themeCode}`);
    return this.toListItem(saved);
  }

  async update(id: string, dto: UpdateThemeMappingDto): Promise<ThemeMappingListItem> {
    const theme = await this.findThemeOrFail(id);
    if (dto.themeName !== undefined) theme.themeName = dto.themeName.trim();
    if (dto.platformParamJson !== undefined) theme.platformParamJson = dto.platformParamJson;
    if (dto.icon !== undefined) theme.icon = dto.icon;
    if (dto.isVisible !== undefined) theme.isVisible = dto.isVisible;
    if (dto.sortOrder !== undefined) theme.sortOrder = dto.sortOrder;
    const saved = await this.saveTheme(theme);
    this.logger.log(`Theme mapping updated: id=${id}`);
    return this.toListItem(saved);
  }

  async remove(id: string): Promise<void> {
    await this.findThemeOrFail(id);
    await this.themeRepo.softDelete(id);
    this.logger.log(`Theme mapping soft-deleted: id=${id}`);
  }

  private async assertThemeCodeUnique(themeCode: string): Promise<void> {
    const existing = await this.themeRepo.findOne({
      where: { themeCode },
      withDeleted: true,
    });
    if (existing) {
      throw new ConflictException(`主题编码 "${themeCode}" 已存在`);
    }
  }

  private async saveTheme(theme: GuideThemeMapping): Promise<GuideThemeMapping> {
    try {
      return await this.themeRepo.save(theme);
    } catch (error) {
      if (isUniqueCodeViolation(error, 'theme')) {
        throw new ConflictException(`主题编码 "${theme.themeCode}" 已存在`);
      }
      throw error;
    }
  }

  private async findThemeOrFail(id: string): Promise<GuideThemeMapping> {
    const theme = await this.themeRepo.findOne({ where: { id } });
    if (!theme) throw new NotFoundException('主题映射不存在');
    return theme;
  }

  private toListItem(row: GuideThemeMapping): ThemeMappingListItem {
    return {
      id: row.id,
      themeName: row.themeName,
      themeCode: row.themeCode,
      platformParamJson: row.platformParamJson,
      icon: row.icon,
      isVisible: row.isVisible,
      sortOrder: row.sortOrder,
      createdAt: row.createdAt,
    };
  }
}
