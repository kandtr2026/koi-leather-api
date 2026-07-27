import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class KoiKoiProductImageResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() url: string;
  @ApiProperty() thumbnailUrl: string;
  @ApiPropertyOptional() mediumUrl?: string;
  @ApiPropertyOptional() altText?: string;
  @ApiProperty() isPrimary: boolean;
  @ApiProperty() displayOrder: number;
}

export class KoiProductResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() name: Record<string, string>;
  @ApiProperty() slug: string;
  @ApiProperty() productType: string;
  @ApiPropertyOptional() categoryId?: string;
  @ApiPropertyOptional() description?: Record<string, string>;
  @ApiPropertyOptional() basePrice?: number;
  @ApiProperty() status: string;
  @ApiPropertyOptional() sku?: string;
  @ApiPropertyOptional() externalId?: string;
  @ApiProperty() technicalSpecs: Record<string, any>;
  @ApiPropertyOptional() metaTitle?: string;
  @ApiPropertyOptional() metaDescription?: string;
  @ApiPropertyOptional() canonicalUrl?: string;
  @ApiPropertyOptional() createdAt: string;
  @ApiPropertyOptional() updatedAt: string;
  @ApiPropertyOptional({ type: [KoiKoiProductImageResponseDto] })
  images?: KoiKoiProductImageResponseDto[];
}

export class PaginatedKoiProductsDto {
  @ApiProperty() data: KoiProductResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
  @ApiProperty() totalPages: number;
}
