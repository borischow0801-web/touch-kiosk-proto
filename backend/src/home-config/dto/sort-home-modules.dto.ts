import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsString, Min, ValidateNested } from 'class-validator';

export class SortHomeModuleItemDto {
  @IsString()
  id: string;

  @IsInt()
  @Min(1)
  sortOrder: number;
}

export class SortHomeModulesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SortHomeModuleItemDto)
  items: SortHomeModuleItemDto[];
}
