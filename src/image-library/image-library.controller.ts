import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { ImageLibraryService } from "./image-library.service";
import { ProductAltService } from "./product-alt.service";
import { QueryImagesDto } from "./dto/query-images.dto";
import {
  QueryProductsDto,
  GenerateAltDto,
  ApplyAltDto,
} from "./dto/product-alt.dto";
import { RequireAuthGuard } from "./require-auth.guard";

/**
 * Thư viện ảnh tổng — CHỈ ĐỌC (GĐ1). Đọc bảng KoiImageVision (5.6k ảnh đã AI
 * phân loại) phục vụ màn quản trị storefront /quan-tri/anh.
 *
 * Guard toàn cục (auth.guard.ts) khoá mặc định: chỉ admin đăng nhập Google HOẶC
 * service token KOI_MEDIA_READ_TOKEN (đọc, đúng prefix này) mới vào được.
 *
 * ⚠️ Thứ tự route: "stats" và "duplicates" khai TRƯỚC ":id" để không bị route
 * động :id nuốt (Express khớp theo thứ tự khai báo).
 */
@ApiTags("Image Library")
@Controller("image-library")
// Bắt buộc có req.user cho MỌI route — giữ kho ảnh admin-only kể cả khi
// PUBLIC_VIEW=1 mở phần đọc công khai (xem require-auth.guard.ts).
@UseGuards(RequireAuthGuard)
export class ImageLibraryController {
  constructor(
    private readonly service: ImageLibraryService,
    private readonly alt: ProductAltService,
  ) {}

  @Get("stats")
  @ApiOperation({ summary: "Thống kê kho ảnh (KoiImageVision)" })
  stats() {
    return this.service.stats();
  }

  // ---- GĐ2: Alt ảnh sản phẩm (KoiProductImage) ----
  // Khai TRƯỚC @Get(":id") để route tĩnh "products" không bị :id nuốt.

  @Get("products/stats")
  @ApiOperation({ summary: "Thống kê alt ảnh sản phẩm (thiếu/trùng)" })
  productStats() {
    return this.alt.stats();
  }

  @Get("products")
  @ApiOperation({ summary: "Danh sách sản phẩm có ảnh + số ảnh thiếu alt" })
  products(@Query() dto: QueryProductsDto) {
    return this.alt.dsSanPham(dto);
  }

  @Get("products/:productId/images")
  @ApiOperation({ summary: "Ảnh của 1 sản phẩm (để sửa alt)" })
  productImages(@Param("productId") productId: string) {
    return this.alt.anhCuaSanPham(productId);
  }

  @Post("generate-alt")
  @ApiOperation({ summary: "Sinh alt AI cho ảnh 1 sản phẩm (chưa ghi DB)" })
  generateAlt(@Body() dto: GenerateAltDto) {
    return this.alt.sinhAlt(dto.productId);
  }

  @Post("apply-alt")
  @ApiOperation({ summary: "Ghi altText cho các ảnh đã duyệt" })
  applyAlt(@Body() dto: ApplyAltDto) {
    return this.alt.apDungAlt(dto.items);
  }

  @Get("duplicates")
  @ApiOperation({ summary: "Nhóm ảnh trùng theo hash nội dung" })
  duplicates(@Query() dto: QueryImagesDto) {
    return this.service.trungLap(dto);
  }

  @Get()
  @ApiOperation({ summary: "Danh sách ảnh có lọc + phân trang" })
  list(@Query() dto: QueryImagesDto) {
    return this.service.danhSach(dto);
  }

  @Get(":id")
  @ApiOperation({ summary: "Chi tiết 1 ảnh + danh sách ảnh trùng" })
  detail(@Param("id") id: string) {
    return this.service.chiTiet(id);
  }
}
