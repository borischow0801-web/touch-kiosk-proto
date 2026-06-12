import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ALLOWED_CONTENT_TYPES } from '../constants/content-types';

const CONTENT_TYPES = [...ALLOWED_CONTENT_TYPES];

export class CreateCategoryDto {
  @IsOptional()
  @IsString()
  @MaxLength(36)
  parentId?: string;

  @IsString()
  @MaxLength(100)
  categoryName: string;

  @IsString()
  @IsIn(CONTENT_TYPES)
  contentType: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
