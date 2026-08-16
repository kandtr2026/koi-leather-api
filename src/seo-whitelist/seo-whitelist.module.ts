import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { AdsModule } from "../ads/ads.module";
import { AiEditModule } from "../ai-edit/ai-edit.module";
import { SeoWhitelistController } from "./seo-whitelist.controller";
import { SeoWhitelistService } from "./seo-whitelist.service";

@Module({
  imports: [PrismaModule, AdsModule, AiEditModule],
  controllers: [SeoWhitelistController],
  providers: [SeoWhitelistService],
})
export class SeoWhitelistModule {}