import { IsOptional, IsString, MaxLength } from 'class-validator';
import { IsNotBlankString } from './is-not-blank-string.validator';
import { TrimString } from './trim-string.transform';

export class UpdateHomeConfigDto {
  @TrimString()
  @IsString()
  @IsNotBlankString()
  @MaxLength(255)
  title: string;

  @IsOptional()
  @TrimString()
  @IsString()
  @MaxLength(255)
  subtitle?: string;

  @IsOptional()
  topBannerJson?: unknown;

  @IsOptional()
  themeJson?: unknown;

  @IsOptional()
  @TrimString()
  @IsString()
  @MaxLength(255)
  changeRemark?: string;
}
