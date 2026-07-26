import {
  Controller, Get, Post, Delete, Patch, Param, Query, Body,
  ParseUUIDPipe, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBody } from '@nestjs/swagger';
import { MediaService } from './media.service';

class RegisterImageDto {
  cloudinaryPublicId: string;
  cloudinaryUrl: string;
  thumbnailUrl: string;
  mediumUrl?: string;
  altText?: string;
  isPrimary?: boolean;
  width?: number;
  height?: number;
  mimeType?: string;
  fileSize?: number;
  variantId?: string;
}

class ReorderDto {
  items: { id: string; displayOrder: number }[];
}

@ApiTags('Media')
@Controller('products/:productId/images')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post()
  @ApiOperation({ summary: 'Register a Cloudinary image URL for a product' })
  @ApiBody({ type: RegisterImageDto })
  register(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: RegisterImageDto,
  ) {
    if (!dto.cloudinaryUrl) {
      throw new BadRequestException('cloudinaryUrl is required');
    }
    return this.mediaService.registerImage(productId, dto, dto.variantId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all images for a product' })
  findAll(@Param('productId', ParseUUIDPipe) productId: string) {
    return this.mediaService.getProductImages(productId);
  }

  @Delete(':imageId')
  @ApiOperation({ summary: 'Delete a product image record' })
  remove(@Param('imageId', ParseUUIDPipe) imageId: string) {
    return this.mediaService.deleteImage(imageId);
  }

  @Patch('primary')
  @ApiOperation({ summary: 'Set image as primary for product' })
  setPrimary(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body('imageId') imageId: string,
  ) {
    if (!imageId) throw new BadRequestException('imageId is required');
    return this.mediaService.setPrimaryImage(productId, imageId);
  }

  @Patch('reorder')
  @ApiOperation({ summary: 'Reorder product images' })
  reorder(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: ReorderDto,
  ) {
    if (!dto.items || !Array.isArray(dto.items)) {
      throw new BadRequestException('items array is required');
    }
    return this.mediaService.reorderImages(productId, dto.items);
  }
}
