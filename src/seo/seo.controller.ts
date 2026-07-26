import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  ParseUUIDPipe, Header,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { SeoService } from './seo.service';
import { CreateSEORecordDto, UpdateSEORecordDto } from './dto/seo-record.dto';

@ApiTags('SEO')
@Controller('seo')
export class SeoController {
  constructor(private readonly seoService: SeoService) {}

  @Post('records')
  @ApiOperation({ summary: 'Create SEO record for any entity (polymorphic)' })
  createRecord(@Body() dto: CreateSEORecordDto) {
    return this.seoService.create(dto);
  }

  @Get('records/:slug')
  @ApiOperation({ summary: 'Get SEO record by slug' })
  findBySlug(@Param('slug') slug: string) {
    return this.seoService.findBySlug(slug);
  }

  @Get('entity/:entityType/:entityId')
  @ApiOperation({ summary: 'Get SEO record by entity type and ID' })
  findByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.seoService.findByEntity(entityType, entityId);
  }

  @Patch('records/:id')
  @ApiOperation({ summary: 'Update SEO record (handles slug history tracking)' })
  updateRecord(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSEORecordDto) {
    return this.seoService.update(id, dto);
  }

  @Delete('records/:id')
  @ApiOperation({ summary: 'Delete SEO record' })
  deleteRecord(@Param('id', ParseUUIDPipe) id: string) {
    return this.seoService.remove(id);
  }

  @Get('json-ld/product/:productId')
  @ApiOperation({ summary: 'Generate Product JSON-LD structured data' })
  async productJsonLd(@Param('productId', ParseUUIDPipe) productId: string) {
    return this.seoService.generateProductJsonLd(productId);
  }

  @Get('json-ld/breadcrumb')
  @ApiOperation({ summary: 'Generate BreadcrumbList JSON-LD' })
  breadcrumbJsonLd(@Query('path') path?: string) {
    const items = path
      ? path.split('/').filter(Boolean).map((name, i, arr) => ({
          name: decodeURIComponent(name),
          url: '/' + arr.slice(0, i + 1).join('/'),
        }))
      : [{ name: 'Trang chủ', url: '/' }];
    return this.seoService.generateBreadcrumbJsonLd(items);
  }

  @Get('json-ld/craft-action/:productId')
  @ApiOperation({ summary: 'Generate CraftAction JSON-LD for bespoke handcrafting' })
  craftActionJsonLd(@Param('productId', ParseUUIDPipe) productId: string) {
    return this.seoService.generateCraftActionJsonLd(productId);
  }

  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml')
  @ApiOperation({ summary: 'Generate dynamic XML sitemap' })
  async sitemap(@Query('baseUrl') baseUrl?: string) {
    return this.seoService.generateSitemapXml(baseUrl || 'https://koileather.vn');
  }
}
