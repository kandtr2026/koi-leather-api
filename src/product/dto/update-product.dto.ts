import { PartialType, OmitType } from "@nestjs/swagger";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsArray, ValidateNested, IsUUID } from "class-validator";
import { Type } from "class-transformer";
import { CreateProductDto, VariantDto } from "./create-product.dto";

export class UpdateProductDto extends PartialType(
  OmitType(CreateProductDto, ["sku"] as const),
) {
  @ApiPropertyOptional({ description: "SKU duy nhất (optional khi update)" })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({ description: "Meta title for SEO" })
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @ApiPropertyOptional({ description: "Meta description for SEO" })
  @IsOptional()
  @IsString()
  metaDescription?: string;

  @ApiPropertyOptional({
    description: "Mảng biến thể (thay thế toàn bộ nếu được cung cấp)",
    type: [VariantDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  variants?: VariantDto[];

  @ApiPropertyOptional({
    description:
      'ID danh mục loại da (KoiMaterialCategory). Gửi null để bỏ chọn; ' +
      'bỏ hẳn field để giữ nguyên giá trị cũ.',
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  materialCategoryId?: string | null;

  @ApiPropertyOptional({
    description:
      'Mã nhóm màu để lọc (DEN, NAU_DAM, VANG_BO...). Gửi null để bỏ; ' +
      'bỏ hẳn field để giữ nguyên.',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  colorFamily?: string | null;

  @ApiPropertyOptional({
    description: 'Mã màu thật (#hex) để hiện chấm màu trên thẻ sản phẩm.',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  colorHex?: string | null;
}
