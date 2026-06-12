import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ALLOWED_RELATION_TYPES } from '../constants/relation-types';

const RELATION_TYPES = [...ALLOWED_RELATION_TYPES];

export class RelationItemDto {
  @IsString()
  @MaxLength(36)
  targetId: string;

  @IsString()
  @IsIn(RELATION_TYPES)
  relationType: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
