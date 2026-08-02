import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsNumber,
  ValidateNested,
  IsUUID,
  IsArray,
  Min,
  Max,
  IsBoolean,
  ValidateIf,
} from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import { KoiProductType, KoiProductStatus } from "../../common/enums";

export function parseJsonString(value: any): any {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }
  return value;
}

export class SeoMetadataDto {
  @ApiPropertyOptional({ description: "Meta title" })
  metaTitle?: string;

  @ApiPropertyOptional({ description: "Meta description" })
  metaDescription?: string;

  @ApiPropertyOptional({ description: "Canonical URL slug" })
  canonicalUrl?: string;
}

export class VariantDto {
  @ApiPropertyOptional({ description: "Variant UUID (omit for new variant)" })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiProperty({ description: "SKU duy nhất cho biến thể" })
  @IsString()
  sku: string;

  @ApiPropertyOptional({
    description: "Tên biến thể (VD: Trơn, Có tag kim loại)",
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: "Giá biến thể" })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({
    description: "Option phụ kiện: none | brass_tag",
    default: "none",
  })
  @IsOptional()
  @IsString()
  hardwareOption?: string;

  @ApiPropertyOptional({
    description: "Trạng thái tồn kho",
    default: "IN_STOCK",
  })
  @IsOptional()
  @IsString()
  stockStatus?: string;

  @ApiPropertyOptional({
    description: "Có phải biến thể mặc định không?",
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({
    description: "Options JSON (leather, color, size...)",
  })
  @IsOptional()
  @IsObject()
  options?: Record<string, any>;
}

export class ProductColorDto {
  @ApiProperty({
    description: 'Mã nhóm màu chuẩn để lọc (DEN, NAU_DAM, VANG_BO...)',
  })
  @IsString()
  colorFamily: string;

  @ApiPropertyOptional({
    description: 'Mã màu thật (#hex) hút từ ảnh — chỉ để hiện chấm màu.',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  colorHex?: string | null;
}

export class CreateProductDto {
  @ApiProperty({ description: "Tên sản phẩm (JSONB multi-lang)" })
  @IsObject()
  name: { vi: string; en?: string };

  @ApiPropertyOptional({
    enum: KoiProductType,
    description:
      "Loại sản phẩm (legacy, tự suy từ danh mục chính nếu bỏ trống)",
  })
  @IsOptional()
  @IsEnum(KoiProductType)
  @Transform(({ value }) => {
    if (typeof value !== "string") return value;
    const upper = value.trim().toUpperCase().replace(/\s+/g, "_");
    const valid = Object.values(KoiProductType) as string[];
    if (valid.includes(upper)) return upper as KoiProductType;
    // Sanitize: map tên hiển thị / slug / code không chuẩn về enum
    const map = {
      ví: "WALLET",
      wallet: "WALLET",
      "ví/bóp/cardholder": "WALLET",
      "thắt lưng": "BELT",
      belt: "BELT",
      "watch strap": "WATCH_STRAP",
      "dây đồng hồ": "WATCH_STRAP",
      "dây da đồng hồ": "WATCH_STRAP",
      túi: "BAG",
      bag: "BAG",
      "túi/balo/clutch": "BAG",
      "phụ kiện": "ACCESSORY",
      accessory: "ACCESSORY",
      "phụ kiện da": "ACCESSORY",
    };
    const key = value
      .trim()
      .toLowerCase()
      .replace(/[-\s]+/g, " ");
    return map[key] || value;
  })
  productType?: KoiProductType;

  @ApiPropertyOptional({
    description:
      "Danh sách category ID — 1 sản phẩm thuộc nhiều danh mục (nhiều–nhiều)",
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID("all", { each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({
    description: "SKU duy nhất (tự động generate nếu không cung cấp)",
  })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({
    description: "Category ID để validate technical_specs theo specs_schema",
  })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({
    description: "ID sản phẩm bên website cũ, giữ để đối chiếu khi tra cứu",
  })
  @IsOptional()
  @IsString()
  externalId?: string;

  @ApiPropertyOptional({ description: "Mô tả sản phẩm (JSONB)" })
  @IsOptional()
  @IsObject()
  description?: { vi: string; en?: string };

  /**
   * Mô tả dạng khối do trình dựng khối trong admin gửi lên.
   *
   * Khi có field này, server TỰ IN LẠI HTML cho `description` bằng
   * blocksToHtml() và bỏ qua `description` client gửi kèm — chỉ một nguồn sự
   * thật, tránh hai chỗ lệch nhau. Nội dung được lọc lại qua normalizeBlocks()
   * vì koi-storefront render bằng dangerouslySetInnerHTML.
   *
   * Mảng thô, không dùng @ValidateNested: cấu trúc khối là union nhiều dạng,
   * class-validator diễn đạt rất rối; normalizeBlocks() đã bỏ mọi thứ lạ.
   */
  @ApiPropertyOptional({
    description:
      "Mô tả dạng khối: [{type:'paragraph'|'heading'|'list'|'quote'|'image', …}]. " +
      "Gửi field này thì HTML mô tả được sinh lại từ nó.",
    type: "array",
    items: { type: "object" },
  })
  @IsOptional()
  @IsArray()
  descriptionBlocks?: any[];

  @ApiPropertyOptional({
    description: "Giá cơ bản. Gửi null để xoá giá; bỏ hẳn field để giữ nguyên.",
    nullable: true,
  })
  @IsOptional()
  @ValidateIf((_o, v) => v !== null)
  @IsNumber()
  basePrice?: number | null;

  @ApiPropertyOptional({ enum: KoiProductStatus })
  @IsOptional()
  @IsEnum(KoiProductStatus)
  status?: KoiProductStatus;

  @ApiPropertyOptional({
    description:
      "Thông số kỹ thuật (JSONB - validated against category specsSchema). Hỗ trợ cả Object và JSON string.",
  })
  @IsOptional()
  @IsObject()
  @Transform(({ value }) => parseJsonString(value))
  technicalSpecs?: Record<string, any>;

  @ApiPropertyOptional({
    description: "[Deprecated] Use technicalSpecs instead",
  })
  @IsOptional()
  @IsObject()
  @Transform(({ value }) => parseJsonString(value))
  specs?: Record<string, any>;

  @ApiPropertyOptional({ description: "Meta title for SEO" })
  @IsOptional()
  @IsString()
  metaTitle?: string;

  @ApiPropertyOptional({ description: "Meta description for SEO" })
  @IsOptional()
  @IsString()
  metaDescription?: string;

  @ApiPropertyOptional({ type: SeoMetadataDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => SeoMetadataDto)
  seo?: SeoMetadataDto;

  @ApiPropertyOptional({
    description: "Mảng biến thể sản phẩm",
    type: [VariantDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  variants?: VariantDto[];

  @ApiPropertyOptional({
    description:
      'ID danh mục loại da (KoiMaterialCategory). null hoặc bỏ trống = không gán.',
    nullable: true,
  })
  @IsOptional()
  @IsUUID()
  materialCategoryId?: string | null;

  @ApiPropertyOptional({
    description:
      'Mã nhóm màu để lọc (DEN, NAU_DAM, VANG_BO...). null hoặc bỏ trống = không gán.',
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

  @ApiPropertyOptional({
    description:
      'Danh sách màu của sản phẩm (hàng phối 2 tông). Phần tử đầu là màu ' +
      'chính — nó cũng được ghi vào colorFamily/colorHex để tương thích ngược. ' +
      'Gửi mảng rỗng để xoá hết màu; bỏ hẳn field để giữ nguyên.',
    type: [ProductColorDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductColorDto)
  colors?: ProductColorDto[];

  @ApiPropertyOptional({
    description:
      'Danh sách loại da của sản phẩm (vd thân Epsom + lót Swift). Phần tử ' +
      'đầu là loại da chính, cũng ghi vào materialCategoryId. Mảng rỗng = xoá hết.',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('all', { each: true })
  materialCategoryIds?: string[];
}
