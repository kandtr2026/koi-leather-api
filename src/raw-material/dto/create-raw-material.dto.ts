import { IsString, IsOptional, IsEnum, IsNumber, Min } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { MaterialType, MaterialUnit } from "../../common/enums";

export class CreateRawMaterialDto {
  @ApiProperty({ description: "Tên nguyên liệu" })
  @IsString()
  name: string;

  @ApiProperty({ enum: MaterialType })
  @IsEnum(MaterialType)
  materialType: MaterialType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  supplier?: string;

  @ApiProperty({ enum: MaterialUnit })
  @IsEnum(MaterialUnit)
  unit: MaterialUnit;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  thicknessMm?: number;

  @ApiProperty({ description: "Giá nhập (VNĐ)" })
  @IsNumber()
  @Min(0)
  unitCost: number;

  @ApiPropertyOptional({ description: "ID từ kitleather.vn" })
  @IsOptional()
  @IsString()
  externalId?: string;

  @ApiPropertyOptional({ description: "ID của danh mục nguyên liệu" })
  @IsOptional()
  @IsString()
  materialCategoryId?: string;
}
