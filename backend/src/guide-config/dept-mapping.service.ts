import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GuideDeptMapping } from '../database/entities/guide-dept-mapping.entity';
import { CreateDeptMappingDto } from './dto/create-dept-mapping.dto';
import { DeptMappingListQueryDto } from './dto/dept-mapping-list-query.dto';
import { UpdateDeptMappingDto } from './dto/update-dept-mapping.dto';
import { isUniqueCodeViolation } from './utils/unique-code.util';
import { normalizeGuideCode } from './utils/normalize-guide-code.util';

export interface DeptMappingListItem {
  id: string;
  deptName: string;
  deptCode: string;
  displayName: string;
  icon: string | null;
  floorText: string | null;
  areaText: string | null;
  isVisible: number;
  sortOrder: number;
  status: string;
  createdAt: Date;
}

@Injectable()
export class DeptMappingService {
  private readonly logger = new Logger(DeptMappingService.name);

  constructor(
    @InjectRepository(GuideDeptMapping)
    private readonly deptRepo: Repository<GuideDeptMapping>,
  ) {}

  async list(
    query: DeptMappingListQueryDto,
  ): Promise<{ list: DeptMappingListItem[]; total: number; page: number; pageSize: number }> {
    const { page, pageSize } = query;

    const [rows, total] = await this.deptRepo.findAndCount({
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

  async create(dto: CreateDeptMappingDto): Promise<DeptMappingListItem> {
    const deptCode = normalizeGuideCode(dto.deptCode);
    await this.assertDeptCodeUnique(deptCode);

    const dept = this.deptRepo.create({
      deptName: dto.deptName.trim(),
      deptCode,
      displayName: dto.displayName.trim(),
      icon: dto.icon ?? null,
      floorText: dto.floorText ?? null,
      areaText: dto.areaText ?? null,
      isVisible: dto.isVisible ?? 1,
      sortOrder: dto.sortOrder ?? 0,
      status: 'active',
    });
    const saved = await this.saveDept(dept);
    this.logger.log(`Dept mapping created: id=${saved.id} deptCode=${saved.deptCode}`);
    return this.toListItem(saved);
  }

  async update(id: string, dto: UpdateDeptMappingDto): Promise<DeptMappingListItem> {
    const dept = await this.findDeptOrFail(id);
    if (dto.deptName !== undefined) dept.deptName = dto.deptName.trim();
    if (dto.displayName !== undefined) dept.displayName = dto.displayName.trim();
    if (dto.icon !== undefined) dept.icon = dto.icon;
    if (dto.floorText !== undefined) dept.floorText = dto.floorText;
    if (dto.areaText !== undefined) dept.areaText = dto.areaText;
    if (dto.isVisible !== undefined) dept.isVisible = dto.isVisible;
    if (dto.sortOrder !== undefined) dept.sortOrder = dto.sortOrder;
    if (dto.status !== undefined) dept.status = dto.status;
    const saved = await this.saveDept(dept);
    this.logger.log(`Dept mapping updated: id=${id}`);
    return this.toListItem(saved);
  }

  async remove(id: string): Promise<void> {
    await this.findDeptOrFail(id);
    await this.deptRepo.softDelete(id);
    this.logger.log(`Dept mapping soft-deleted: id=${id}`);
  }

  private async assertDeptCodeUnique(deptCode: string): Promise<void> {
    const existing = await this.deptRepo.findOne({
      where: { deptCode },
      withDeleted: true,
    });
    if (existing) {
      throw new ConflictException(`部门编码 "${deptCode}" 已存在`);
    }
  }

  private async saveDept(dept: GuideDeptMapping): Promise<GuideDeptMapping> {
    try {
      return await this.deptRepo.save(dept);
    } catch (error) {
      if (isUniqueCodeViolation(error, 'dept')) {
        throw new ConflictException(`部门编码 "${dept.deptCode}" 已存在`);
      }
      throw error;
    }
  }

  private async findDeptOrFail(id: string): Promise<GuideDeptMapping> {
    const dept = await this.deptRepo.findOne({ where: { id } });
    if (!dept) throw new NotFoundException('部门映射不存在');
    return dept;
  }

  private toListItem(row: GuideDeptMapping): DeptMappingListItem {
    return {
      id: row.id,
      deptName: row.deptName,
      deptCode: row.deptCode,
      displayName: row.displayName,
      icon: row.icon,
      floorText: row.floorText,
      areaText: row.areaText,
      isVisible: row.isVisible,
      sortOrder: row.sortOrder,
      status: row.status,
      createdAt: row.createdAt,
    };
  }
}
