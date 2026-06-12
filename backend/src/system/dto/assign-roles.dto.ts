import { ArrayUnique, IsArray, IsString, MaxLength } from 'class-validator';

export class AssignRolesDto {
  @IsArray()
  @IsString({ each: true })
  @MaxLength(36, { each: true })
  @ArrayUnique()
  roleIds: string[];
}
