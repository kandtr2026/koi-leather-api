import { Module } from '@nestjs/common';
import { ProductController } from './product.controller';
import { ProductService } from './product.service';
import { SpecsValidatorService } from '../common/specs-validator.service';

@Module({
  controllers: [ProductController],
  providers: [ProductService, SpecsValidatorService],
  exports: [ProductService],
})
export class ProductModule {}
