import {
  Controller, Get, Post, Patch, Body, Param, Query, ParseUUIDPipe, DefaultValuePipe, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ProductionOrderService } from './production-order.service';
import { CreateProductionOrderDto } from './dto/create-production-order.dto';

@ApiTags('Production Orders')
@Controller('production-orders')
export class ProductionOrderController {
  constructor(private readonly orderService: ProductionOrderService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new production order with material cost snapshot' })
  create(@Body() dto: CreateProductionOrderDto) {
    return this.orderService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all production orders (paginated)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  findAll(
    @Query('status') status?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ) {
    return this.orderService.findAll(status, page, limit);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get production order statistics' })
  getStats() {
    return this.orderService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get production order detail with snapshot data' })
  findOne(@Param('id') id: string) {
    return this.orderService.findById(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update production order status' })
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.orderService.updateStatus(id, status);
  }
}
