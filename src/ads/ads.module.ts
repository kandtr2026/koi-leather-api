import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AdsAdminController, AdsTrackController } from "./ads.controller";
import { AdsService } from "./ads.service";

@Module({
  imports: [PrismaModule],
  controllers: [AdsTrackController, AdsAdminController],
  providers: [AdsService],
})
export class AdsModule {}
