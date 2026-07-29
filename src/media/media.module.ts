import { Module } from "@nestjs/common";
import { MediaController } from "./media.controller";
import { StorageController } from "./storage.controller";
import { MediaService } from "./media.service";

@Module({
  controllers: [MediaController, StorageController],
  providers: [MediaService],
  exports: [MediaService],
})
export class KoiMediaModule {}
