import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { IsJsonString } from './is-json-string.validator';
import { IsNotBlankString } from './is-not-blank-string.validator';
import { NormalizeGuideCode } from './normalize-guide-code.transform';
import { TrimString } from './trim-string.transform';

export class CreateThemeMappingDto {
  @TrimString()
  @IsString()
  @IsNotBlankString()
  @MaxLength(100)
  themeName: string;

  @NormalizeGuideCode()
  @IsString()
  @IsNotBlankString()
  @MaxLength(50)
  themeCode: string;

  @IsOptional()
  @IsString()
  @IsJsonString()
  platformParamJson?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  icon?: string;

  @IsOptional()
  @IsInt()
  @IsIn([0, 1])
  isVisible?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
