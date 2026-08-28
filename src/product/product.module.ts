import { Module } from "@nestjs/common";
import { ProductController } from "./product.controller";
import { ProductService } from "./product.service";
import { SpecsValidatorService } from "../common/specs-validator.service";
import { RevalidateService } from "../common/revalidate.service";
import { RevalidateStorefrontInterceptor } from "../common/revalidate-storefront.interceptor";

@Module({
  controllers: [ProductController],
  providers: [
    ProductService,
    SpecsValidatorService,
    RevalidateService,
    RevalidateStorefrontInterceptor,
  ],
  exports: [ProductService],
})
export class KoiProductModule {}
