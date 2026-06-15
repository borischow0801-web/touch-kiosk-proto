import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { IsNotBlankString } from './is-not-blank-string.validator';
import { NormalizeGuideCode } from './normalize-guide-code.transform';
import { NormalizePlatformItemId } from './normalize-platform-item-id.transform';
import { TrimString } from './trim-string.transform';

export class CreateItemConfigDto {
  @NormalizePlatformItemId()
  @IsString()
  @IsNotBlankString()
  @MaxLength(100)
  platformItemId: string;

  @TrimString()
  @IsString()
  @IsNotBlankString()
  @MaxLength(255)
  itemName: string;

  @TrimString()
  @IsString()
  @IsNotBlankString()
  @MaxLength(255)
  displayName: string;

  @IsOptional()
  @NormalizeGuideCode()
  @IsString()
  @IsNotBlankString()
  @MaxLength(50)
  deptCode?: string;

  @IsOptional()
  @NormalizeGuideCode()
  @IsString()
  @IsNotBlankString()
  @MaxLength(50)
  themeCode?: string;

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  isHot?: number;

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  isRecommend?: number;

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  isVisible?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  relatedPolicyIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  relatedFaqIds?: string[];
}
