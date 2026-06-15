import {
  IsArray,
  IsIn,
  IsInt,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { IsNotBlankString } from './is-not-blank-string.validator';
import { NormalizeGuideCode } from './normalize-guide-code.transform';
import { TrimString } from './trim-string.transform';

export class UpdateItemConfigDto {
  @ValidateIf((_, value) => value !== undefined)
  @TrimString()
  @IsString()
  @IsNotBlankString()
  @MaxLength(255)
  itemName?: string;

  @ValidateIf((_, value) => value !== undefined)
  @TrimString()
  @IsString()
  @IsNotBlankString()
  @MaxLength(255)
  displayName?: string;

  @ValidateIf((_, value) => value !== undefined)
  @ValidateIf((_, value) => value !== null)
  @NormalizeGuideCode()
  @IsString()
  @IsNotBlankString()
  @MaxLength(50)
  deptCode?: string | null;

  @ValidateIf((_, value) => value !== undefined)
  @ValidateIf((_, value) => value !== null)
  @NormalizeGuideCode()
  @IsString()
  @IsNotBlankString()
  @MaxLength(50)
  themeCode?: string | null;

  @ValidateIf((_, value) => value !== undefined)
  @IsInt()
  @IsIn([0, 1])
  isHot?: number;

  @ValidateIf((_, value) => value !== undefined)
  @IsInt()
  @IsIn([0, 1])
  isRecommend?: number;

  @ValidateIf((_, value) => value !== undefined)
  @IsInt()
  @IsIn([0, 1])
  isVisible?: number;

  @ValidateIf((_, value) => value !== undefined)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ValidateIf((_, value) => value !== undefined)
  @IsArray()
  @IsUUID('4', { each: true })
  relatedPolicyIds?: string[];

  @ValidateIf((_, value) => value !== undefined)
  @IsArray()
  @IsUUID('4', { each: true })
  relatedFaqIds?: string[];
}
