import { Module } from "@nestjs/common";
import { ImageCategoryController } from "./image-category.controller";
import { ImageCategoryService } from "./image-category.service";

@Module({
  controllers: [ImageCategoryController],
  providers: [ImageCategoryService],
  exports: [ImageCategoryService],
})
export class KoiImageCategoryModule {}
