import { IsOptional, IsString, MaxLength } from 'class-validator';
import { QueryPageDto } from '../../common/dto/query-page.dto';

export class ItemsQueryDto extends QueryPageDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  deptCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  themeCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  itemTypeCode?: string;
}
