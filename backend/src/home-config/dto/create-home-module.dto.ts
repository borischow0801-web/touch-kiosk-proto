import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { IsNotBlankString } from './is-not-blank-string.validator';
import { TrimString } from './trim-string.transform';

export class CreateHomeModuleDto {
  @TrimString()
  @IsString()
  @IsNotBlankString()
  @MaxLength(50)
  moduleCode: string;

  @TrimString()
  @IsString()
  @IsNotBlankString()
  @MaxLength(100)
  moduleName: string;

  @TrimString()
  @IsString()
  @IsNotBlankString()
  @MaxLength(50)
  moduleType: string;

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

  @TrimString()
  @IsString()
  @IsNotBlankString()
  @MaxLength(50)
  targetType: string;

  @TrimString()
  @IsString()
  @IsNotBlankString()
  @MaxLength(500)
  targetValue: string;
}
