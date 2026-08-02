import { Module } from "@nestjs/common";
import { APP_GUARD, APP_FILTER } from "@nestjs/core";
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
import { PrismaExceptionFilter } from "./common/filters/prisma-exception.filter";
import { ShopModule } from "./shop/shop.module";
import { AnalyticsModule } from "./analytics/analytics.module";

@Module({
  imports: [
    AuthModule,
    PrismaModule,
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
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_FILTER, useClass: PrismaExceptionFilter },
  ],
})
export class AppModule {}
