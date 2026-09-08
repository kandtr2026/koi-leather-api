import { Module } from "@nestjs/common";
import { ImageLibraryController } from "./image-library.controller";
import { ImageLibraryService } from "./image-library.service";
import { ProductAltService } from "./product-alt.service";
import { KoiMediaModule } from "../media/media.module";
import { OpenAiModule } from "../openai/openai.module";

// PrismaModule là @Global. Cần MediaService (ghi altText) từ KoiMediaModule và
// OpenAiClient (sinh alt AI) từ OpenAiModule — cả hai đều export sẵn.
@Module({
  imports: [KoiMediaModule, OpenAiModule],
  controllers: [ImageLibraryController],
  providers: [ImageLibraryService, ProductAltService],
})
export class ImageLibraryModule {}
