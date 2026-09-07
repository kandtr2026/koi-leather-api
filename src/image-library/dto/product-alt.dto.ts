import {
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsArray,
  ValidateNested,
  ArrayMaxSize,
} from "class-validator";
import { Type } from "class-transformer";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/** Danh sách SẢN PHẨM có ảnh (để làm việc alt). */
export class QueryProductsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  pageSize?: number;

  @ApiPropertyOptional({ description: "Tìm theo tên/slug sản phẩm" })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  q?: string;

  @ApiPropertyOptional({ description: 'Chỉ SP có ảnh THIẾU alt ("true")' })
  @IsOptional()
  @IsString()
  chiThieu?: string;

  @ApiPropertyOptional({ description: 'Chỉ SP có ảnh alt TRÙNG ("true")' })
  @IsOptional()
  @IsString()
  chiTrung?: string;
}

export class GenerateAltDto {
  @ApiProperty({ description: "ID sản phẩm cần sinh alt AI cho các ảnh" })
  @IsString()
  productId: string;
}

export class AltItemDto {
  @ApiProperty()
  @IsString()
  imageId: string;

  @ApiProperty()
  @IsString()
  @MaxLength(500)
  altText: string;
}

export class ApplyAltDto {
  @ApiProperty({ type: [AltItemDto] })
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => AltItemDto)
  items: AltItemDto[];
}
