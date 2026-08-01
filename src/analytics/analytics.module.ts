import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import {
  AnalyticsController,
  AnalyticsTrackController,
} from "./analytics.controller";
import { AnalyticsService } from "./analytics.service";

@Module({
  imports: [PrismaModule],
  controllers: [AnalyticsTrackController, AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
