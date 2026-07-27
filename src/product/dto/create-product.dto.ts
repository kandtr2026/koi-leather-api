import { IsString, IsOptional, IsEnum, IsObject, IsNumber, ValidateNested, IsUUID, IsArray, Min, Max, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { KoiProductType, KoiProductStatus } from '../../common/enums';

export class SeoMetadataDto {
  @ApiPropertyOptional({ description: 'Meta title' })
  metaTitle?: string;

  @ApiPropertyOptional({ description: 'Meta description' })
  metaDescription?: string;

  @ApiPropertyOptional({ description: 'Canonical URL slug' })
  canonicalUrl?: string;
}

export class VariantDto {
  @ApiPropertyOptional({ description: 'Variant UUID (omit for new variant)' })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({ description: 'SKU duy nhất cho biến thể' })
  @IsString()
  sku: string;

  @ApiPropertyOptional({ description: 'Tên biến thể (VD: Trơn, Có tag kim loại)' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: 'Giá biến thể' })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ description: 'Option phụ kiện: none | brass_tag', default: 'none' })
  @IsOptional()
  @IsString()
  hardwareOption?: string;

  @ApiPropertyOptional({ description: 'Trạng thái tồn kho', default: 'IN_STOCK' })
  @IsOptional()
  @IsString()
  stockStatus?: string;

  @ApiPropertyOptional({ description: 'Có phải biến thể mặc định không?', default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({ description: 'Options JSON (leather, color, size...)' })
  @IsOptional()
  @IsObject()
  options?: Record<string, any>;
}

export class CreateProductDto {
  @ApiProperty({ description: 'Tên sản phẩm (JSONB multi-lang)' })
  @IsObject()
  name: { vi: string; en?: string };

  @ApiPropertyOptional({ enum: KoiProductType, description: 'Loại sản phẩm (legacy, tự suy từ danh mục chính nếu bỏ trống)' })
  @IsOptional()
  @IsEnum(KoiProductType)
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const upper = value.trim().toUpperCase().replace(/\s+/g, '_');
    const valid = Object.values(KoiProductType) as string[];
    if (valid.includes(upper)) return upper as KoiProductType;
    // Sanitize: map tên hiển thị / slug / code không chuẩn về enum
    const map = {
      'ví': 'WALLET', 'wallet': 'WALLET', 'ví/bóp/cardholder': 'WALLET',
      'thắt lưng': 'BELT', 'belt': 'BELT',
      'watch strap': 'WATCH_STRAP', 'dây đồng hồ': 'WATCH_STRAP', 'dây da đồng hồ': 'WATCH_STRAP',
      'túi': 'BAG', 'bag': 'BAG', 'túi/balo/clutch': 'BAG',
      'phụ kiện': 'ACCESSORY', 'accessory': 'ACCESSORY', 'phụ kiện da': 'ACCESSORY',
    };
    const key = value.trim().toLowerCase().replace(/[-\s]+/g, ' ');
    return map[key] || value;
  })
  productType?: KoiProductType;

  @ApiPropertyOptional({ description: 'Danh sách category ID — 1 sản phẩm thuộc nhiều danh mục (nhiều–nhiều)', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  categoryIds?: string[];

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

  @ApiPropertyOptional({ description: 'Mảng biến thể sản phẩm', type: [VariantDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  variants?: VariantDto[];
}
