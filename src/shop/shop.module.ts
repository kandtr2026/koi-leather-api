import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { ShopController } from "./shop.controller";
import { ShopService } from "./shop.service";
import { ShopContentService } from "./shop-content.service";

@Module({
  imports: [PrismaModule],
  controllers: [ShopController],
  providers: [ShopService, ShopContentService],
})
export class ShopModule {}
