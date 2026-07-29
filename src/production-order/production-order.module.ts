import { Module } from "@nestjs/common";
import { ProductionOrderController } from "./production-order.controller";
import { ProductionOrderService } from "./production-order.service";
import { KoiRawMaterialModule } from "../raw-material/raw-material.module";

@Module({
  imports: [KoiRawMaterialModule],
  controllers: [ProductionOrderController],
  providers: [ProductionOrderService],
  exports: [ProductionOrderService],
})
export class KoiProductionOrderModule {}
