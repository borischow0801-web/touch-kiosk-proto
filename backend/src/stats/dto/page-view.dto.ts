import { IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

export class PageViewDto {
  // Route whitelist validation is performed by StatsController
  @IsString()
  @MaxLength(200)
  path: string;

  @IsOptional()
  @IsNumber()
  ts?: number;
}
