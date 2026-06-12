import { Type } from 'class-transformer';
import { ArrayUnique, IsArray, ValidateNested } from 'class-validator';
import { RelationItemDto } from './relation-item.dto';

export class ReplaceRelationsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RelationItemDto)
  @ArrayUnique((r: RelationItemDto) => `${r.targetId}:${r.relationType}`)
  relations: RelationItemDto[];
}
