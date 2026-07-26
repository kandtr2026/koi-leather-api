import { Module } from '@nestjs/common';
import { InventorySyncController } from './inventory-sync.controller';
import { InventorySyncService } from './inventory-sync.service';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [InventoryModule],
  controllers: [InventorySyncController],
  providers: [InventorySyncService],
  exports: [InventorySyncService],
})
export class InventorySyncModule {}
