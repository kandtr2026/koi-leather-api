import {
  IsString,
  IsOptional,
  IsBoolean,
  IsObject,
  IsEnum,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { EntityType } from "../../common/enums";

export class CreateSEORecordDto {
  @ApiProperty({ enum: EntityType })
  @IsEnum(EntityType)
  entityType: EntityType;

  @ApiProperty()
  @IsString()
  entityId: string;

  @ApiProperty({ description: "URL slug" })
  @IsString()
  slug: string;

  @ApiPropertyOptional({ description: "JSON-LD structured data" })
  @IsOptional()
  @IsObject()
  jsonLd?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ogTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ogDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  ogImage?: string;

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
  @IsBoolean()
  noIndex?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sitemapPriority?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sitemapChangeFreq?: string;
}

export class UpdateSEORecordDto {
  @ApiPropertyOptional({
    description: "New slug (old slug auto-saved to history)",
  })
  slug?: string;

  @ApiPropertyOptional()
  jsonLd?: Record<string, any>;

  @ApiPropertyOptional()
  ogTitle?: string;

  @ApiPropertyOptional()
  ogDescription?: string;

  @ApiPropertyOptional()
  ogImage?: string;

  @ApiPropertyOptional()
  metaTitle?: string;

  @ApiPropertyOptional()
  metaDescription?: string;

  @ApiPropertyOptional()
  noIndex?: boolean;

  @ApiPropertyOptional()
  sitemapPriority?: string;

  @ApiPropertyOptional()
  sitemapChangeFreq?: string;
}
