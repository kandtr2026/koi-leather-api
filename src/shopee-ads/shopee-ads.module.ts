import { Module } from '@nestjs/common';
import { ShopeeAdsService } from './shopee-ads.service';
import { ShopeeCredentialService } from './shopee-ads.credentials';
import { ShopeeAdsController } from './shopee-ads.controller';
import { ShopeeAdsAdminGuard } from './shopee-ads.guard';
import { PrismaModule } from '../prisma/prisma.module';

// AuthModule là @Global nên AuthService đã có sẵn cho guard, không cần import.
@Module({
  imports: [PrismaModule],
  controllers: [ShopeeAdsController],
  providers: [ShopeeAdsService, ShopeeCredentialService, ShopeeAdsAdminGuard],
  exports: [ShopeeAdsService],
})
export class KoiShopeeAdsModule {}
