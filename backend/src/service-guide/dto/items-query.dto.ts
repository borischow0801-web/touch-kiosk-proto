import { IsOptional, IsString, MaxLength } from 'class-validator';
import { QueryPageDto } from '../../common/dto/query-page.dto';
import { NormalizeGuideCode } from '../../guide-config/dto/normalize-guide-code.transform';

export class ItemsQueryDto extends QueryPageDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @NormalizeGuideCode()
  deptCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  @NormalizeGuideCode()
  themeCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  itemTypeCode?: string;
}
