import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { HealthController } from './health.controller';
import { PrismaModule } from './prisma/prisma.module';
import { KoiCategoryModule } from './category/category.module';
import { KoiProductModule } from './product/product.module';
import { KoiMediaModule } from './media/media.module';
import { KoiRawMaterialModule } from './raw-material/raw-material.module';
import { KoiProductionOrderModule } from './production-order/production-order.module';
import { KoiCraftingSpecModule } from './crafting-spec/crafting-spec.module';
import { KoiSeoModule } from './seo/seo.module';
import { KoiInventoryModule } from './inventory/inventory.module';
import { KoiInventorySyncModule } from './inventory-sync/inventory-sync.module';
import { KoiImageCategoryModule } from './image-category/image-category.module';
import { AuthModule } from './auth/auth.module';
import { AuthGuard } from './auth/auth.guard';

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
    KoiInventorySyncModule,
    KoiImageCategoryModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
