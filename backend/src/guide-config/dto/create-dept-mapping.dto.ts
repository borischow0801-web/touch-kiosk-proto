import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { IsNotBlankString } from './is-not-blank-string.validator';
import { NormalizeGuideCode } from './normalize-guide-code.transform';
import { TrimString } from './trim-string.transform';

export class CreateDeptMappingDto {
  @TrimString()
  @IsString()
  @IsNotBlankString()
  @MaxLength(100)
  deptName: string;

  @NormalizeGuideCode()
  @IsString()
  @IsNotBlankString()
  @MaxLength(50)
  deptCode: string;

  @TrimString()
  @IsString()
  @IsNotBlankString()
  @MaxLength(100)
  displayName: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  icon?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  floorText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  areaText?: string;

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  isVisible?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
