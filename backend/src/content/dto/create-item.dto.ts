import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ALLOWED_CONTENT_TYPES } from '../constants/content-types';

const CONTENT_TYPES = [...ALLOWED_CONTENT_TYPES];

export class CreateItemDto {
  @IsString()
  @IsIn(CONTENT_TYPES)
  contentType: string;

  @IsString()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  subtitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  summary?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  extraJson?: string;

  @IsOptional()
  @IsString()
  @MaxLength(36)
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  changeRemark?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
