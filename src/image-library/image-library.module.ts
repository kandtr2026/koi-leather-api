import { Module } from "@nestjs/common";
import { ImageLibraryController } from "./image-library.controller";
import { ImageLibraryService } from "./image-library.service";
import { ProductAltService } from "./product-alt.service";
import { KoiMediaModule } from "../media/media.module";
import { AiEditModule } from "../ai-edit/ai-edit.module";

// PrismaModule là @Global. Cần MediaService (ghi altText) từ KoiMediaModule và
// OpenAiClient (sinh alt AI) từ AiEditModule — cả hai đều export sẵn.
@Module({
  imports: [KoiMediaModule, AiEditModule],
  controllers: [ImageLibraryController],
  providers: [ImageLibraryService, ProductAltService],
})
export class ImageLibraryModule {}
