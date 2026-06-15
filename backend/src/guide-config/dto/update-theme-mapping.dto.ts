import { IsIn, IsInt, IsString, MaxLength, Min, ValidateIf } from 'class-validator';
import { IsJsonString } from './is-json-string.validator';
import { IsNotBlankString } from './is-not-blank-string.validator';
import { TrimString } from './trim-string.transform';

export class UpdateThemeMappingDto {
  @ValidateIf((_, value) => value !== undefined)
  @TrimString()
  @IsString()
  @IsNotBlankString()
  @MaxLength(100)
  themeName?: string;

  /** Explicit null clears platform API params. */
  @ValidateIf((_, value) => value !== undefined)
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @IsJsonString()
  platformParamJson?: string | null;

  /** Explicit null clears the icon. */
  @ValidateIf((_, value) => value !== undefined)
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(255)
  icon?: string | null;

  @ValidateIf((_, value) => value !== undefined)
  @IsInt()
  @IsIn([0, 1])
  isVisible?: number;

  @ValidateIf((_, value) => value !== undefined)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
