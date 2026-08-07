import { PartialType, OmitType } from "@nestjs/swagger";
import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsArray, ArrayNotEmpty, ValidateNested, IsUUID, IsNumber, Min } from "class-validator";
import { Type } from "class-transformer";
import { CreateProductDto, VariantDto } from "./create-product.dto";

/**
 * Một thay đổi NHẸ cho biến thể đã có.
 *
 * Khác VariantDto dùng lúc tạo: giá được phép null ở đây. null có nghĩa là chủ
 * shop chủ động bỏ giá để đưa biến thể về trạng thái "Liên hệ", không phải giá
 * 0đ. Không dùng Partial<VariantDto> trực tiếp ở controller: TypeScript chỉ là
 * kiểu biên dịch, còn ValidationPipe cần một class thật để không bỏ trắng body.
 */
export class VariantPatchDto {
  @ApiPropertyOptional({ description: "UUID biến thể cần sửa" })
  @IsUUID()
  id: string;

  @ApiPropertyOptional({ description: "Tên biến thể", nullable: true })
  @IsOptional()
  @IsString()
  title?: string | null;

  @ApiPropertyOptional({ description: "Giá biến thể; null = chưa định giá", nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number | null;

  @ApiPropertyOptional({ description: "Trạng thái tồn kho" })
  @IsOptional()
  @IsString()
  stockStatus?: string;
}

/** Các thay đổi được ghi trong CÙNG MỘT transaction, không có trạng thái dở dang. */
export class BatchVariantPatchDto {
  @ApiPropertyOptional({ type: [VariantPatchDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => VariantPatchDto)
  variants: VariantPatchDto[];
}

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
