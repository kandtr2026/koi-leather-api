import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  Min,
  ValidateNested,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";

export class MaterialAllocationDto {
  @ApiProperty({ description: "Raw material ID" })
  materialId: string;

  @ApiProperty({ description: "Quantity consumed per unit" })
  qtyPerUnit: number;

  @ApiProperty({ description: "Material name for snapshot" })
  materialName: string;

  @ApiProperty({ description: "Unit" })
  unit: string;
}

export class CreateProductionOrderDto {
  @ApiProperty({ description: "ProductVariant ID" })
  @IsString()
  variantId: string;

  @ApiProperty({ description: "Số lượng sản xuất" })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  craftsman?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  dueDate?: string;

  @ApiPropertyOptional({
    description:
      "Material allocations for snapshot. If omitted, auto-calculated from CraftingSpec.",
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MaterialAllocationDto)
  materials?: MaterialAllocationDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
