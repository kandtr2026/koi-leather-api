import { IsString, IsOptional, IsEnum, IsObject, IsNumber, ValidateNested, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { KoiProductType, KoiProductStatus } from '../../common/enums';

export class SeoMetadataDto {
  @ApiPropertyOptional({ description: 'Meta title' })
  metaTitle?: string;

  @ApiPropertyOptional({ description: 'Meta description' })
  metaDescription?: string;

  @ApiPropertyOptional({ description: 'Canonical URL slug' })
  canonicalUrl?: string;
}

export class CreateProductDto {
  @ApiProperty({ description: 'Tên sản phẩm (JSONB multi-lang)' })
  @IsObject()
  name: { vi: string; en?: string };

  @ApiProperty({ enum: KoiProductType, description: 'Loại sản phẩm' })
  @IsEnum(KoiProductType)
  productType: KoiProductType;

  @ApiPropertyOptional({ description: 'SKU duy nhất (tự động generate nếu không cung cấp)' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({ description: 'Category ID để validate technical_specs theo specs_schema' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ description: 'Website ID (externalId for kitleather.vn sync)' })
  @IsOptional()
  @IsString()
  externalId?: string;

  @ApiPropertyOptional({ description: 'Mô tả sản phẩm (JSONB)' })
  @IsOptional()
  @IsObject()
  description?: { vi: string; en?: string };

  @ApiPropertyOptional({ description: 'Giá cơ bản' })
  @IsOptional()
  @IsNumber()
  basePrice?: number;

  @ApiPropertyOptional({ enum: KoiProductStatus })
  @IsOptional()
  @IsEnum(KoiProductStatus)
  status?: KoiProductStatus;

  @ApiPropertyOptional({ description: 'Thông số kỹ thuật (JSONB - validated against category specsSchema)' })
  @IsOptional()
  @IsObject()
  technicalSpecs?: Record<string, any>;

  @ApiPropertyOptional({ description: '[Deprecated] Use technicalSpecs instead' })
  @IsOptional()
  @IsObject()
  specs?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Meta title for SEO' })
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @ApiPropertyOptional({ description: 'Meta description for SEO' })
  @IsOptional()
  @IsString()
  metaDescription?: string;

  @ApiPropertyOptional({ type: SeoMetadataDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SeoMetadataDto)
  seo?: SeoMetadataDto;
}
