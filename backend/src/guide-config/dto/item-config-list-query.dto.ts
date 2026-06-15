import { Type } from 'class-transformer';
import { IsIn, IsInt, IsString, MaxLength, ValidateIf } from 'class-validator';
import { QueryPageDto } from '../../common/dto/query-page.dto';
import { IsNotBlankString } from './is-not-blank-string.validator';
import { NormalizeGuideCode } from './normalize-guide-code.transform';

export class ItemConfigListQueryDto extends QueryPageDto {
  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @NormalizeGuideCode()
  @IsNotBlankString()
  @MaxLength(50)
  deptCode?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @NormalizeGuideCode()
  @IsNotBlankString()
  @MaxLength(50)
  themeCode?: string;

  @ValidateIf((_, value) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @IsIn([0, 1])
  isHot?: number;

  @ValidateIf((_, value) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @IsIn([0, 1])
  isRecommend?: number;

  @ValidateIf((_, value) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @IsIn([0, 1])
  isVisible?: number;
}
