import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AdsAdminController, AdsTrackController, AdsKeywordPoolController } from "./ads.controller";
import { AdsService } from "./ads.service";
import { GoogleAdsClient } from "./google-ads.client";
import { KeywordPoolService } from "./keyword-pool.service";
import { SyncService } from "./sync.service";
import { AdsSyncService } from "./ads-sync.service";

@Module({
  imports: [PrismaModule],
  controllers: [AdsTrackController, AdsAdminController, AdsKeywordPoolController],
  providers: [
    AdsService,
    GoogleAdsClient,
    KeywordPoolService,
    SyncService,
    AdsSyncService,
  ],
  // SeoWhitelistModule dùng tuKhoaThat() làm nguồn snapshot metric từ khoá.
  exports: [AdsService],
})
export class AdsModule {}
