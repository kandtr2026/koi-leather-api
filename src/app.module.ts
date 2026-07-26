import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { ProductModule } from './product/product.module';
import { CategoryModule } from './category/category.module';
import { MediaModule } from './media/media.module';
import { RawMaterialModule } from './raw-material/raw-material.module';
import { ProductionOrderModule } from './production-order/production-order.module';
import { CraftingSpecModule } from './crafting-spec/crafting-spec.module';
import { SeoModule } from './seo/seo.module';
import { InventoryModule } from './inventory/inventory.module';
import { InventorySyncModule } from './inventory-sync/inventory-sync.module';

@Module({
  imports: [
    PrismaModule,
    CategoryModule,
    ProductModule,
    MediaModule,
    RawMaterialModule,
    ProductionOrderModule,
    CraftingSpecModule,
    SeoModule,
    InventoryModule,
    InventorySyncModule,
  ],
})
export class AppModule {}
