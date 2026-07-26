import { IsString, IsOptional, IsObject, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PatternFileDto {
  @ApiProperty() version: string;
  @ApiProperty() url: string;
  @ApiPropertyOptional() pieceCount?: number;
  @ApiPropertyOptional() format?: string; // PDF, DXF, AI
}

export class LeatherLayerDto {
  @ApiPropertyOptional() material_name?: string;
  @ApiPropertyOptional() tannery?: string;
  @ApiPropertyOptional() sqft?: number;
  @ApiPropertyOptional() wastage_rate?: number;
  @ApiPropertyOptional() thickness_mm?: number;
  @ApiPropertyOptional() color?: string;
}

export class CreateCraftingSpecDto {
  @ApiProperty({ description: 'Product ID' })
  @IsString()
  productId: string;

  @ApiPropertyOptional({ type: [PatternFileDto], description: 'Pattern file versions' })
  @IsOptional()
  @IsArray()
  patternFiles?: PatternFileDto[];

  @ApiPropertyOptional({ type: LeatherLayerDto })
  @IsOptional()
  @IsObject()
  outerLeather?: Record<string, any>;

  @ApiPropertyOptional({ type: LeatherLayerDto })
  @IsOptional()
  @IsObject()
  liningLeather?: Record<string, any>;

  @ApiPropertyOptional({ type: LeatherLayerDto })
  @IsOptional()
  @IsObject()
  interlining?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Dimensions spec — type-specific JSON',
    example: { lug_width_mm: 20, buckle_width_mm: 18, short_strap_mm: 115, long_strap_mm: 75 },
  })
  @IsOptional()
  @IsObject()
  dimensions?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Crafting details',
    example: { thread: 'Meisi 0.45mm', pitch_mm: 3.38, edge_finishing: 'Fenice', stitching_type: 'Saddle Stitch' },
  })
  @IsOptional()
  @IsObject()
  craftingDetails?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
