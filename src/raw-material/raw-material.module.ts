import { Module } from "@nestjs/common";
import { RawMaterialController } from "./raw-material.controller";
import { RawMaterialService } from "./raw-material.service";

@Module({
  controllers: [RawMaterialController],
  providers: [RawMaterialService],
  exports: [RawMaterialService],
})
export class KoiRawMaterialModule {}
