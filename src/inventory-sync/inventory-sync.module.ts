import { Module } from "@nestjs/common";
import { InventorySyncController } from "./inventory-sync.controller";
import { InventorySyncService } from "./inventory-sync.service";
import { KoiInventoryModule } from "../inventory/inventory.module";

@Module({
  imports: [KoiInventoryModule],
  controllers: [InventorySyncController],
  providers: [InventorySyncService],
  exports: [InventorySyncService],
})
export class KoiInventorySyncModule {}
