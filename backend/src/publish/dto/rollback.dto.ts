import { IsOptional, IsString, MaxLength, IsUUID } from 'class-validator';
import { PublishCommentDto } from './publish-comment.dto';

export class RollbackDto extends PublishCommentDto {
  @IsString()
  @IsUUID('4')
  versionId: string;
}
