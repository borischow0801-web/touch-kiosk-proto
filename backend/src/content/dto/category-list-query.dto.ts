import { IsIn, IsOptional, IsString } from 'class-validator';
import { QueryPageDto } from '../../common/dto/query-page.dto';
import { ALLOWED_CONTENT_TYPES } from '../constants/content-types';

const CONTENT_TYPES = [...ALLOWED_CONTENT_TYPES];

export class CategoryListQueryDto extends QueryPageDto {
  @IsOptional()
  @IsString()
  @IsIn(CONTENT_TYPES)
  contentType?: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}
