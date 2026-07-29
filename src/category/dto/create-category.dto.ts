import {
  IsString,
  IsOptional,
  IsObject,
  IsInt,
  IsBoolean,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class CreateCategoryDto {
  @ApiProperty({ description: "Tên danh mục — sẽ tự động sinh code & slug" })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: "Mã code ERP (tự động sinh từ tên nếu bỏ trống)",
  })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: "Slug SEO (tự động sinh từ tên nếu bỏ trống)",
  })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({
    description:
      "JSON Schema Draft-07 defining technical specs for this category",
  })
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
