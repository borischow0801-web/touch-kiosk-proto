import { IsOptional, IsString, MaxLength } from 'class-validator';

export class PublishCommentDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
