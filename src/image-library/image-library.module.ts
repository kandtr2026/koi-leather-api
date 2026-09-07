import { Module } from "@nestjs/common";
import { ImageLibraryController } from "./image-library.controller";
import { ImageLibraryService } from "./image-library.service";

// PrismaModule là @Global (như image-category dùng PrismaService mà không import),
// nên không cần khai lại ở đây.
@Module({
  controllers: [ImageLibraryController],
  providers: [ImageLibraryService],
})
export class ImageLibraryModule {}
