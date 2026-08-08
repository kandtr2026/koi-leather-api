import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AdsAdminController, AdsTrackController } from "./ads.controller";
import { AdsService } from "./ads.service";
import { GoogleAdsClient } from "./google-ads.client";

@Module({
  imports: [PrismaModule],
  controllers: [AdsTrackController, AdsAdminController],
  providers: [AdsService, GoogleAdsClient],
})
export class AdsModule {}
