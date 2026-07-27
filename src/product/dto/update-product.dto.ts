import { PartialType, OmitType } from '@nestjs/swagger';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateProductDto, VariantDto } from './create-product.dto';

export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, ['sku'] as const),
) {
  @ApiPropertyOptional({ description: 'SKU duy nhất (optional khi update)' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({ description: 'Meta title for SEO' })
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @ApiPropertyOptional({ description: 'Meta description for SEO' })
  @IsOptional()
  @IsString()
  metaDescription?: string;

  @ApiPropertyOptional({ description: 'Mảng biến thể (thay thế toàn bộ nếu được cung cấp)', type: [VariantDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  variants?: VariantDto[];
}
