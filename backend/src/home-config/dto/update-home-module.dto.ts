import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { IsNotBlankString } from './is-not-blank-string.validator';
import { TrimString } from './trim-string.transform';

export class UpdateHomeModuleDto {
  @IsOptional()
  @TrimString()
  @IsString()
  @IsNotBlankString()
  @MaxLength(50)
  moduleCode?: string;

  @IsOptional()
  @TrimString()
  @IsString()
  @IsNotBlankString()
  @MaxLength(100)
  moduleName?: string;

  @IsOptional()
  @TrimString()
  @IsString()
  @IsNotBlankString()
  @MaxLength(50)
  moduleType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  icon?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  layoutType?: string;

  @IsOptional()
  @IsBoolean()
  isVisible?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @TrimString()
  @IsString()
  @IsNotBlankString()
  @MaxLength(50)
  targetType?: string;

  @IsOptional()
  @TrimString()
  @IsString()
  @IsNotBlankString()
  @MaxLength(500)
  targetValue?: string;
}
