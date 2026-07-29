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
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBody } from "@nestjs/swagger";
import { ImageCategoryService } from "./image-category.service";
import { CreateImageCategoryDto } from "./dto/create-image-category.dto";
import { UpdateImageCategoryDto } from "./dto/update-image-category.dto";

@ApiTags("Image Categories")
@Controller("image-categories")
export class ImageCategoryController {
  constructor(private readonly imageCategoryService: ImageCategoryService) {}

  @Get()
  @ApiOperation({ summary: "List all image categories" })
  findAll() {
    return this.imageCategoryService.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get image category by UUID or code" })
  findOne(@Param("id") id: string) {
    const isUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id,
      );
    return isUUID
      ? this.imageCategoryService.findById(id)
      : this.imageCategoryService.findByCode(id);
  }

  @Post()
  @ApiOperation({ summary: "Create a new image category" })
  @ApiBody({ type: CreateImageCategoryDto })
  create(@Body() dto: CreateImageCategoryDto) {
    return this.imageCategoryService.create(dto);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update image category (partial)" })
  update(@Param("id") id: string, @Body() dto: UpdateImageCategoryDto) {
    return this.imageCategoryService.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete an image category" })
  remove(@Param("id") id: string) {
    return this.imageCategoryService.remove(id);
  }
}
