import { Module } from "@nestjs/common";
import { MediaController } from "./media.controller";
import { StorageController } from "./storage.controller";
import { NoiDungAnhController } from "./noi-dung-anh.controller";
import { MediaService } from "./media.service";
import { RevalidateService } from "../common/revalidate.service";
import { RevalidateStorefrontInterceptor } from "../common/revalidate-storefront.interceptor";

@Module({
  controllers: [MediaController, StorageController, NoiDungAnhController],
  providers: [MediaService, RevalidateService, RevalidateStorefrontInterceptor],
  exports: [MediaService],
})
export class KoiMediaModule {}
