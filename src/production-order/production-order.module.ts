import { Module } from '@nestjs/common';
import { ProductionOrderController } from './production-order.controller';
import { ProductionOrderService } from './production-order.service';
import { RawMaterialModule } from '../raw-material/raw-material.module';

@Module({
  imports: [RawMaterialModule],
  controllers: [ProductionOrderController],
  providers: [ProductionOrderService],
  exports: [ProductionOrderService],
})
export class ProductionOrderModule {}
