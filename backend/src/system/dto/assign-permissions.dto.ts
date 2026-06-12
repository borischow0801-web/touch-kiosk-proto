import { ArrayUnique, IsArray, IsString, MaxLength } from 'class-validator';

export class AssignPermissionsDto {
  @IsArray()
  @IsString({ each: true })
  @MaxLength(36, { each: true })
  @ArrayUnique()
  permissionIds: string[];
}
