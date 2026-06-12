import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  title?: string;

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

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  isTop?: number;

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  isRecommend?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  sourceType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  sourceUrl?: string;
}
