import {
  IsIn,
  IsInt,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { IsNotBlankString } from './is-not-blank-string.validator';
import { TrimString } from './trim-string.transform';

export class UpdateDeptMappingDto {
  @ValidateIf((_, value) => value !== undefined)
  @TrimString()
  @IsString()
  @IsNotBlankString()
  @MaxLength(100)
  deptName?: string;

  @ValidateIf((_, value) => value !== undefined)
  @TrimString()
  @IsString()
  @IsNotBlankString()
  @MaxLength(100)
  displayName?: string;

  /** Explicit null clears the icon. */
  @ValidateIf((_, value) => value !== undefined)
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(255)
  icon?: string | null;

  /** Explicit null clears floor text. */
  @ValidateIf((_, value) => value !== undefined)
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(100)
  floorText?: string | null;

  /** Explicit null clears area text. */
  @ValidateIf((_, value) => value !== undefined)
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(100)
  areaText?: string | null;

  @ValidateIf((_, value) => value !== undefined)
  @IsInt()
  @IsIn([0, 1])
  isVisible?: number;

  @ValidateIf((_, value) => value !== undefined)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ValidateIf((_, value) => value !== undefined)
  @IsString()
  @IsIn(['active', 'disabled'])
  status?: string;
}
