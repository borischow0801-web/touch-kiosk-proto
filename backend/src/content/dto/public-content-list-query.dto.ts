import { IsOptional, IsUUID } from 'class-validator';
import { QueryPageDto } from '../../common/dto/query-page.dto';

export class PublicContentListQueryDto extends QueryPageDto {
  @IsOptional()
  @IsUUID('4')
  categoryId?: string;
}
