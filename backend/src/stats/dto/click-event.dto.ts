import { IsIn, IsNumber, IsOptional, IsString, MaxLength } from 'class-validator';

const ALLOWED_CLICK_TYPES = [
  'item_view',
  'dept_click',
  'theme_click',
  'type_click',
  'module_click',
  'hot_item_click',
  'nav_click',
] as const;

export class ClickEventDto {
  @IsIn(ALLOWED_CLICK_TYPES)
  type: string;

  // Semantic validation (entity existence check) is performed by StatsController
  @IsOptional()
  @IsString()
  @MaxLength(100)
  id?: string;

  @IsOptional()
  @IsNumber()
  ts?: number;
}
