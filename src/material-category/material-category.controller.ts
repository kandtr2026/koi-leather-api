import { Controller, Get, Post, Patch, Delete, Body, Param, HttpCode, HttpStatus, Header } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { MaterialCategoryService } from './material-category.service';
import { CreateMaterialCategoryDto } from './dto/create-material-category.dto';
import { UpdateMaterialCategoryDto } from './dto/update-material-category.dto';

@ApiTags('Material Categories')
@Controller('material-categories')
export class MaterialCategoryController {
  constructor(private readonly materialCategoryService: MaterialCategoryService) {}

  @Get()
  @Header('Cache-Control', 'public, max-age=30, s-maxage=60, stale-while-revalidate=30')
  @ApiOperation({ summary: 'List all raw material categories' })
  findAll() {
    return this.materialCategoryService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get material category by UUID' })
  findOne(@Param('id') id: string) {
    return this.materialCategoryService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new material category' })
  @ApiBody({ type: CreateMaterialCategoryDto })
  create(@Body() dto: CreateMaterialCategoryDto) {
    return this.materialCategoryService.create(dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update material category (partial)' })
  update(@Param('id') id: string, @Body() dto: UpdateMaterialCategoryDto) {
    return this.materialCategoryService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a material category' })
  remove(@Param('id') id: string) {
    return this.materialCategoryService.remove(id);
  }
}
