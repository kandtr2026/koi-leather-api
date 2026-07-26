import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  ParseUUIDPipe, ParseIntPipe, DefaultValuePipe, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam, ApiBody } from '@nestjs/swagger';
import { ProductService } from './product.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@ApiTags('Products')
@Controller('products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new product (validates technicalSpecs against Category.specsSchema if categoryId provided)' })
  @ApiBody({ type: CreateProductDto })
  create(@Body() dto: CreateProductDto) {
    return this.productService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all products (paginated, filterable by type/status/category)' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'type', required: false, enum: ['WALLET', 'BELT', 'WATCH_STRAP', 'BAG', 'ACCESSORY'] })
  @ApiQuery({ name: 'status', required: false, enum: ['DRAFT', 'ACTIVE', 'ARCHIVED'] })
  @ApiQuery({ name: 'categoryId', required: false, description: 'Filter by category UUID' })
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.productService.findAll(page, limit, type, status, categoryId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID with images, variants, specs, category' })
  @ApiParam({ name: 'id', description: 'UUID or slug' })
  findOne(@Param('id') id: string) {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
    return isUUID ? this.productService.findById(id) : this.productService.findBySlug(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update product (partial). Validates technicalSpecs against category if changed.' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProductDto) {
    return this.productService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete product and all related images/variants' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.productService.remove(id);
  }

  @Post(':id/toggle-status')
  @ApiOperation({ summary: 'Toggle product status (ACTIVE ⟷ DRAFT)' })
  toggleStatus(@Param('id', ParseUUIDPipe) id: string) {
    return this.productService.toggleStatus(id);
  }
}
