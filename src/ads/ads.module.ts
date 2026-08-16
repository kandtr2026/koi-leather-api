import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AiEditModule } from "../ai-edit/ai-edit.module";
import { AdsAdminController, AdsTrackController, AdsKeywordPoolController } from "./ads.controller";
import { AdsService } from "./ads.service";
import { GoogleAdsClient } from "./google-ads.client";
import { KeywordPoolService } from "./keyword-pool.service";
import { SyncService } from "./sync.service";
import { AdsSyncService } from "./ads-sync.service";
import { LandingSeoService } from "./landing-seo.service";

@Module({
  // AiEditModule để lấy OpenAiClient (nó exports sẵn) cho cụm Landing-SEO —
  // cùng cách SeoWhitelistModule dùng chung client GPT, không khai báo lại.
  imports: [PrismaModule, AiEditModule],
  controllers: [AdsTrackController, AdsAdminController, AdsKeywordPoolController],
  providers: [
    AdsService,
    GoogleAdsClient,
    KeywordPoolService,
    SyncService,
    AdsSyncService,
    LandingSeoService,
  ],
  // SeoWhitelistModule dùng tuKhoaThat() làm nguồn snapshot metric từ khoá.
  exports: [AdsService],
})
export class AdsModule {}
