import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiBody,
} from "@nestjs/swagger";
import { ProductService } from "./product.service";
import { CreateProductDto, VariantDto } from "./dto/create-product.dto";
import { UpdateProductDto } from "./dto/update-product.dto";

@ApiTags("Products")
@Controller("products")
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @ApiOperation({
    summary:
      "Create a new product (validates technicalSpecs against Category.specsSchema if categoryId provided)",
  })
  @ApiBody({ type: CreateProductDto })
  create(@Body() dto: CreateProductDto) {
    return this.productService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary:
      "List all products (paginated, filterable by type/status/category/search)",
  }) // Update summary
  @ApiQuery({ name: "page", required: false, example: 1 })
  @ApiQuery({ name: "limit", required: false, example: 20 })
  @ApiQuery({
    name: "type",
    required: false,
    enum: ["WALLET", "BELT", "WATCH_STRAP", "BAG", "ACCESSORY"],
  })
  @ApiQuery({
    name: "status",
    required: false,
    enum: ["DRAFT", "ACTIVE", "ARCHIVED"],
  })
  @ApiQuery({
    name: "categoryId",
    required: false,
    description: "Filter by category UUID",
  })
  @ApiQuery({
    name: "category",
    required: false,
    description:
      "Filter by category slug (overrides categoryId if both provided)",
  })
  @ApiQuery({
    name: "q",
    required: false,
    description: "Search term for product name, SKU, or technical specs",
  }) // <--- Add search query parameter
  @ApiQuery({
    name: "sort",
    required: false,
    enum: [
      "name",
      "images",
      "category",
      "price",
      "specs",
      "updatedAt",
      "createdAt",
      "sku",
      "status",
    ],
    description: "Sort column (default: createdAt)",
  })
  @ApiQuery({
    name: "order",
    required: false,
    enum: ["asc", "desc"],
    description: "Sort direction (default: desc)",
  })
  @ApiQuery({
    name: "missing",
    required: false,
    description:
      "Todolist filter: chỉ sản phẩm còn thiếu dữ liệu. Nhận 'material' (chưa gán loại da), 'price' (chưa có giá), 'specs' (chưa có thông số), 'category' (chưa phân loại), 'images' (chưa có ảnh), 'any' (thiếu bất kỳ), hoặc nhiều giá trị phân tách bởi dấu phẩy (thiếu tất cả).",
  })
  findAll(
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query("type") type?: string,
    @Query("status") status?: string,
    @Query("categoryId") categoryId?: string,
    @Query("category") categorySlug?: string,
    @Query("q") search?: string, // <--- Add search parameter to controller method
    @Query("sort") sort?: string,
    @Query("order") order?: string,
    @Query("missing") missing?: string,
  ) {
    return this.productService.findAll(
      page,
      limit,
      type,
      status,
      categoryId,
      categorySlug,
      search,
      sort,
      order,
      missing,
    ); // <--- Pass search parameter to service
  }

  @Get("deleted")
  @ApiOperation({ summary: "List soft-deleted products (for admin restore)" })
  @ApiQuery({ name: "page", required: false, example: 1 })
  @ApiQuery({ name: "limit", required: false, example: 20 })
  findDeleted(
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.productService.findDeleted(page, limit);
  }

  @Post(":id/restore")
  @ApiOperation({ summary: "Restore a soft-deleted product" })
  @ApiParam({ name: "id", description: "Product UUID" })
  restore(@Param("id", ParseUUIDPipe) id: string) {
    return this.productService.restore(id);
  }

  @Get(":id")
  @ApiOperation({
    summary: "Get product by ID with images, variants, specs, category",
  })
  @ApiParam({ name: "id", description: "UUID or slug" })
  findOne(@Param("id") id: string) {
    const isUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id,
      );
    return isUUID
      ? this.productService.findById(id)
      : this.productService.findBySlug(id);
  }

  @Patch(":id")
  @ApiOperation({
    summary:
      "Update product (partial). Validates technicalSpecs against category if changed.",
  })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productService.update(id, dto);
  }

  @Delete(":id")
  @ApiOperation({
    summary:
      "Soft-delete product. Cancels related production orders and releases raw material reservations.",
  })
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.productService.remove(id);
  }

  @Post(":id/toggle-status")
  @ApiOperation({ summary: "Toggle product status (ACTIVE ⟷ DRAFT)" })
  toggleStatus(@Param("id", ParseUUIDPipe) id: string) {
    return this.productService.toggleStatus(id);
  }

  @Post(":productId/variants")
  @ApiOperation({ summary: "Add a new variant to product" })
  createVariant(
    @Param("productId", ParseUUIDPipe) productId: string,
    @Body() dto: VariantDto,
  ) {
    return this.productService.createVariant(productId, dto);
  }

  @Patch("variants/:variantId")
  @ApiOperation({ summary: "Update a variant" })
  updateVariant(
    @Param("variantId", ParseUUIDPipe) variantId: string,
    @Body() dto: Partial<VariantDto>,
  ) {
    return this.productService.updateVariant(variantId, dto);
  }

  @Delete("variants/:variantId")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a variant" })
  removeVariant(@Param("variantId", ParseUUIDPipe) variantId: string) {
    return this.productService.removeVariant(variantId);
  }
}
