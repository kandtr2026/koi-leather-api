import { Module } from "@nestjs/common";
import { APP_GUARD, APP_FILTER } from "@nestjs/core";
import { ThrottlerModule } from "@nestjs/throttler";
import { HealthController } from "./health.controller";
import { PrismaModule } from "./prisma/prisma.module";
import { KoiCategoryModule } from "./category/category.module";
import { KoiProductModule } from "./product/product.module";
import { KoiMediaModule } from "./media/media.module";
import { KoiRawMaterialModule } from "./raw-material/raw-material.module";
import { KoiProductionOrderModule } from "./production-order/production-order.module";
import { KoiCraftingSpecModule } from "./crafting-spec/crafting-spec.module";
import { KoiSeoModule } from "./seo/seo.module";
import { KoiInventoryModule } from "./inventory/inventory.module";
import { KoiImageCategoryModule } from "./image-category/image-category.module";
import { MaterialCategoryModule } from "./material-category/material-category.module";
import { AuthModule } from "./auth/auth.module";
import { AuthGuard } from "./auth/auth.guard";
import { ThrottleByIpGuard } from "./common/throttle-by-ip.guard";
import { PrismaExceptionFilter } from "./common/filters/prisma-exception.filter";
import { KhongDemLoiFilter } from "./common/filters/khong-dem-loi.filter";
import { ShopModule } from "./shop/shop.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { AdsModule } from "./ads/ads.module";
import { AiEditModule } from "./ai-edit/ai-edit.module";
import { SeoWhitelistModule } from "./seo-whitelist/seo-whitelist.module";

@Module({
  imports: [
    AuthModule,
    PrismaModule,
    // Rate limit toàn cục: 60 req/phút/IP. Bộ đếm trong RAM per-instance serverless,
    // nên không chặt tuyệt đối — để chặt hơn cần Redis/Upstash. Đủ chặn bot đơn giản.
    ThrottlerModule.forRoot([
      {
        ttl: 60_000, // 60 giây
        limit: 60,   // 60 request
      },
    ]),
    KoiCategoryModule,
    KoiProductModule,
    KoiMediaModule,
    KoiRawMaterialModule,
    KoiProductionOrderModule,
    KoiCraftingSpecModule,
    KoiSeoModule,
    KoiInventoryModule,
    KoiImageCategoryModule,
    MaterialCategoryModule,
    ShopModule,
    AnalyticsModule,
    AdsModule,
    AiEditModule,
    SeoWhitelistModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_GUARD, useClass: ThrottleByIpGuard },
    // Nest áp bộ lọc toàn cục theo thứ tự NGƯỢC với khai báo, nên bộ bắt-tất-cả
    // đứng trước để bộ hẹp hơn (Prisma) được chọn trước cho lỗi Prisma. Cả hai
    // đều tự đặt Cache-Control nên thứ tự sai cũng không làm lỗi bị đệm.
    { provide: APP_FILTER, useClass: KhongDemLoiFilter },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
  ],
})
export class AppModule {}
