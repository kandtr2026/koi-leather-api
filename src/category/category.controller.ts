import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Header,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBody } from "@nestjs/swagger";
import { CategoryService } from "./category.service";
import { CreateCategoryDto } from "./dto/create-category.dto";
import { UpdateCategoryDto } from "./dto/update-category.dto";

@ApiTags("Categories")
@Controller("categories")
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Get()
  @Header(
    "Cache-Control",
    "public, max-age=30, s-maxage=60, stale-while-revalidate=30",
  )
  @ApiOperation({
    summary: "List all product categories (lightweight — no specsSchema)",
  })
  findAll() {
    return this.categoryService.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get category by UUID or code" })
  findOne(@Param("id") id: string) {
    const isUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id,
      );
    return isUUID
      ? this.categoryService.findById(id)
      : this.categoryService.findByCode(id);
  }

  @Post()
  @ApiOperation({ summary: "Create a new product category" })
  @ApiBody({ type: CreateCategoryDto })
  create(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update category (partial)" })
  update(@Param("id") id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoryService.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a category" })
  remove(@Param("id") id: string) {
    return this.categoryService.remove(id);
  }

  @Post(":id/toggle-status")
  @ApiOperation({ summary: "Toggle category active status" })
  toggleStatus(@Param("id") id: string) {
    return this.categoryService.toggleStatus(id);
  }
}
