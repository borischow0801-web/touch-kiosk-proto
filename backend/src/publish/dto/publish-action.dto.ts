import { IsOptional, IsString, IsUUID } from 'class-validator';
import { PublishCommentDto } from './publish-comment.dto';

export class PublishActionDto extends PublishCommentDto {
  @IsOptional()
  @IsString()
  @IsUUID('4')
  versionId?: string;
}
