import { IsString, IsOptional, IsEnum, IsObject, IsInt, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategoryCode } from '../../common/enums';

export class CreateCategoryDto {
  @ApiProperty({ enum: CategoryCode })
  @IsEnum(CategoryCode)
  code: CategoryCode;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ description: 'JSON Schema Draft-07 defining technical specs for this category' })
  @IsOptional()
  @IsObject()
  specsSchema?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metaDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  displayOrder?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
