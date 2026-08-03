import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Header,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { ShopService } from "./shop.service";
import { ShopContentService } from "./shop-content.service";

/**
 * Các kiểu sắp xếp khách được chọn. Bỏ trống = "popular" (mặc định): hàng đinh
 * trước, rồi displayRank. Xem thuTuSapXep() trong shop.service.ts.
 */
const SORT_HOP_LE = ["popular", "price-asc", "price-desc", "newest"];

/**
 * API CÔNG KHAI cho storefront khách hàng (KoiFront).
 *
 * Toàn bộ nhóm /shop/* được allowlist trong AuthGuard → khách không cần đăng
 * nhập vẫn đọc được (khác với admin đang khoá). Chỉ trả hàng đã xuất bản và
 * các field an toàn cho khách.
 */
@ApiTags("Shop (storefront công khai)")
@Controller("shop")
export class ShopController {
  constructor(
    private readonly shop: ShopService,
    private readonly content: ShopContentService,
  ) {}

  @Get("home")
  @Header("Cache-Control", "public, max-age=60, s-maxage=300")
  @ApiOperation({ summary: "Dữ liệu trang chủ: sản phẩm nổi bật + danh mục" })
  home() {
    return this.shop.home();
  }

  @Get("categories")
  @Header("Cache-Control", "public, max-age=60, s-maxage=300")
  @ApiOperation({ summary: "Danh sách danh mục (kèm ảnh đại diện, số lượng)" })
  categories() {
    return this.shop.categories();
  }

  @Get("categories/:slug")
  @Header("Cache-Control", "public, max-age=60, s-maxage=300")
  @ApiOperation({ summary: "Danh mục theo slug + sản phẩm trong danh mục" })
  categoryBySlug(
    @Param("slug") slug: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    return this.shop.categoryBySlug(slug, Number(page) || 1, Number(limit) || 24);
  }

  @Get("filters")
  @Header("Cache-Control", "public, max-age=60, s-maxage=300")
  @ApiOperation({
    summary:
      "Bộ lọc trang cửa hàng: danh mục, loại da, màu, loại ảnh — số đếm theo ngữ cảnh",
    description:
      "Truyền bộ lọc khách đang bật để mỗi con số là số hàng còn lại nếu chọn " +
      "thêm mục đó. Không truyền gì thì đếm trên toàn bộ hàng mặt tiền.",
  })
  filters(
    @Query("category") category?: string,
    @Query("material") material?: string,
    @Query("imageType") imageType?: string,
    @Query("color") color?: string,
    @Query("search") search?: string,
  ) {
    return this.shop.shopFilters({
      categorySlug: category,
      material,
      imageType,
      color,
      search,
    });
  }

  @Get("color-families")
  @Header("Cache-Control", "public, max-age=300, s-maxage=3600")
  @ApiOperation({ summary: "Toàn bộ nhóm màu chuẩn (cho picker admin)" })
  colorFamilies() {
    return this.shop.colorFamilies();
  }

  @Get("products")
  @Header("Cache-Control", "public, max-age=60, s-maxage=300")
  @ApiOperation({
    summary: "Danh sách sản phẩm (lọc theo danh mục / loại da / loại ảnh / tìm kiếm)",
  })
  listProducts(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("category") category?: string,
    @Query("search") search?: string,
    @Query("material") material?: string,
    @Query("imageType") imageType?: string,
    @Query("color") color?: string,
    @Query("unpicked") unpicked?: string,
    @Query("sort") sort?: string,
  ) {
    return this.shop.listProducts({
      page: Number(page) || 1,
      limit: Number(limit) || 24,
      categorySlug: category,
      search,
      material,
      imageType,
      color,
      unpicked: unpicked === "1" || unpicked === "true",
      // Lọc trắng danh sách: giá trị lạ rơi về "popular" thay vì ném lỗi —
      // đường dẫn có sort cũ/gõ sai vẫn ra trang bình thường.
      sort: SORT_HOP_LE.includes(sort as string) ? sort : undefined,
    });
  }

  @Get("products/:slug")
  @Header("Cache-Control", "public, max-age=60, s-maxage=300")
  @ApiOperation({ summary: "Chi tiết sản phẩm theo slug + liên quan" })
  productBySlug(@Param("slug") slug: string) {
    return this.shop.productBySlug(slug);
  }

  // ----- Nội dung cũ (blog / trang / tag) — schema public -----

  @Get("posts")
  @Header("Cache-Control", "public, max-age=120, s-maxage=600")
  @ApiOperation({ summary: "Danh sách bài viết blog + chuyên mục" })
  posts(@Query("page") page?: string, @Query("limit") limit?: string) {
    return this.content.posts(Number(page) || 1, Number(limit) || 12);
  }

  @Get("content/:slug")
  @Header("Cache-Control", "public, max-age=120, s-maxage=600")
  @ApiOperation({ summary: "Bài viết hoặc trang tĩnh theo slug" })
  async contentBySlug(@Param("slug") slug: string) {
    const found = await this.content.contentBySlug(slug);
    if (!found) throw new NotFoundException("Không tìm thấy nội dung");
    return found;
  }

  @Get("blog-terms/:taxonomy/:slug")
  @Header("Cache-Control", "public, max-age=120, s-maxage=600")
  @ApiOperation({ summary: "Chuyên mục / tag blog + các bài thuộc nó" })
  async blogTerm(
    @Param("taxonomy") taxonomy: "category" | "tag",
    @Param("slug") slug: string,
  ) {
    const found = await this.content.blogTerm(taxonomy, slug);
    if (!found) throw new NotFoundException("Không tìm thấy");
    return found;
  }

  @Get("product-tags/:slug")
  @Header("Cache-Control", "public, max-age=120, s-maxage=600")
  @ApiOperation({ summary: "Từ khoá sản phẩm (schema public) + sản phẩm" })
  async productTag(@Param("slug") slug: string) {
    const found = await this.content.productTag(slug);
    if (!found) throw new NotFoundException("Không tìm thấy từ khoá");
    return found;
  }

  @Post("leads")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Khách để lại thông tin liên hệ (công khai)" })
  createLead(
    @Body()
    body: {
      name?: string;
      phone?: string;
      message?: string;
      productName?: string;
    },
  ) {
    const name = String(body?.name ?? "").trim();
    const phone = String(body?.phone ?? "").replace(/[\s.-]/g, "");
    if (name.length < 2) throw new BadRequestException("Tên không hợp lệ");
    if (!/^(0\d{9}|\+84\d{9})$/.test(phone))
      throw new BadRequestException("Số điện thoại không hợp lệ");
    return this.content.createLead({
      name,
      phone,
      message: body?.message ?? null,
      productName: body?.productName ?? null,
    });
  }

  @Get("sitemap-data")
  @Header("Cache-Control", "public, max-age=600, s-maxage=3600")
  @ApiOperation({ summary: "Dữ liệu dựng sitemap.xml" })
  sitemapData() {
    return this.content.sitemapData();
  }
}
