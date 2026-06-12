import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

const ALLOWED_ROLE_CODES = ['SUPER_ADMIN', 'CONTENT_EDITOR', 'PUBLISH_REVIEWER'] as const;

export class CreateRoleDto {
  @IsString()
  @IsIn(ALLOWED_ROLE_CODES as unknown as string[])
  roleCode: string;

  @IsString()
  @MaxLength(64)
  roleName: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
