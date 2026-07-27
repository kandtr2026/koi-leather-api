import {
  Controller, Get, Post, Delete, Patch, Param, Query, Body,
  ParseUUIDPipe, BadRequestException, UseInterceptors,
  UploadedFile, Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBody, ApiConsumes } from '@nestjs/swagger';
import { MediaService } from './media.service';
import * as path from 'path';
import * as fs from 'fs';
// Lazy Sharp — optional on platforms without native binaries (Vercel Lambda)
function getSharp() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('sharp');
  } catch {
    return null;
  }
}

// Lazy Cloudinary helper — only loads when env has real keys
function getCloudinary() {
  const name = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!name || name === 'your_cloud_name' || !key || !secret) return null;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const cloudinary = require('cloudinary').v2;
  cloudinary.config({ cloud_name: name, api_key: key, api_secret: secret });
  return cloudinary;
}

async function uploadToCloudinary(buf: Buffer, folder: string, filename: string): Promise<{ url: string; publicId: string } | null> {
  const cloudinary = getCloudinary();
  if (!cloudinary) return null;
  return new Promise((resolve, reject) => {
    cloudinary.uploader.upload_stream(
      { folder, public_id: filename, resource_type: 'image', format: 'webp' },
      (err, result) => {
        if (err || !result) return reject(err || new Error('Upload failed'));
        resolve({ url: result.secure_url, publicId: result.public_id });
      },
    ).end(buf);
  });
}

class RegisterImageDto {
  cloudinaryPublicId?: string;
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

class UploadResult {
  id: string;
  url: string;
  thumbnailUrl: string;
  mediumUrl: string;
  altText: string | null;
  isPrimary: boolean;
  displayOrder: number;
  width: number | null;
  height: number | null;
  mimeType: string | null;
  fileSize: number | null;
  createdAt: string;
}

class ReorderDto {
  items: { id: string; displayOrder: number }[];
}

@ApiTags('Media')
@Controller('products/:productId/images')
export class MediaController {
  private readonly logger = new Logger(MediaController.name);

  constructor(private readonly mediaService: MediaService) {}


  @Post('upload')
  @ApiOperation({ summary: 'Upload image → convert to WebP & register' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        altText: { type: 'string' },
        imageType: { type: 'string', enum: ['STUDIO', 'LIFESTYLE', 'INVENTORY'], description: 'Phân loại ảnh' },
        isPrimary: { type: 'boolean' },
        variantId: { type: 'string' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @Param('productId', ParseUUIDPipe) productId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('altText') altText?: string,
    @Body('imageType') imageType?: string,
    @Body('isPrimary') isPrimary?: string,
    @Body('variantId') variantId?: string,
  ) {
    if (!file) throw new BadRequestException('File is required');
    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('Only image files allowed');
    }

    const timestamp = Date.now();
    const slug = `${timestamp}`;
    const sharpInstance = getSharp();

    let webpBuf: Buffer, thumbBuf: Buffer, mediumBuf: Buffer;
    let width: number | undefined, height: number | undefined;

    if (sharpInstance) {
      // Sharp available — convert to WebP with thumbnails
      const meta = await sharpInstance(file.buffer).metadata();
      width = meta.width || undefined;
      height = meta.height || undefined;
      webpBuf = await sharpInstance(file.buffer).webp({ quality: 85 }).toBuffer();
      thumbBuf = await sharpInstance(file.buffer)
        .resize(300, undefined, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 70 }).toBuffer();
      mediumBuf = await sharpInstance(file.buffer)
        .resize(1200, undefined, { fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 80 }).toBuffer();
    } else {
      // Sharp unavailable — store original file as-is (Vercel Lambda, etc.)
      webpBuf = file.buffer;
      thumbBuf = file.buffer;
      mediumBuf = file.buffer;
    }

    // Try Cloudinary first, fall back to local
    const folder = `koi/products/${productId}`;
    const [fullResult, thumbResult, mediumResult] = await Promise.all([
      uploadToCloudinary(webpBuf, folder, slug),
      uploadToCloudinary(thumbBuf, folder, `${slug}-thumb`),
      uploadToCloudinary(mediumBuf, folder, `${slug}-medium`),
    ]);

    let publicUrl: string, thumbUrl: string, mediumUrl: string;
    let cloudinaryPublicId: string | undefined;

    if (fullResult) {
      // Cloudinary upload succeeded
      publicUrl = fullResult.url;
      thumbUrl = thumbResult?.url || fullResult.url;
      mediumUrl = mediumResult?.url || fullResult.url;
      cloudinaryPublicId = fullResult.publicId;
    } else {
      // Fall back to local storage
      const ext = path.extname(file.originalname) || '.jpg';
      const uploadDir = path.join(process.cwd(), 'uploads', 'products', productId);
      fs.mkdirSync(uploadDir, { recursive: true });
      fs.writeFileSync(path.join(uploadDir, `${slug}${ext}`), webpBuf);
      fs.writeFileSync(path.join(uploadDir, `${slug}-thumb${ext}`), thumbBuf);
      fs.writeFileSync(path.join(uploadDir, `${slug}-medium${ext}`), mediumBuf);
      publicUrl = `/uploads/products/${productId}/${slug}${ext}`;
      thumbUrl = `/uploads/products/${productId}/${slug}-thumb${ext}`;
      mediumUrl = `/uploads/products/${productId}/${slug}-medium${ext}`;
    }

    const result = await this.mediaService.registerImage(productId, {
      cloudinaryPublicId,
      cloudinaryUrl: publicUrl,
      thumbnailUrl: thumbUrl,
      mediumUrl,
      altText: altText || undefined,
      imageType: imageType || 'STUDIO',
      isPrimary: isPrimary === 'true',
      width,
      height,
      mimeType: sharpInstance ? 'image/webp' : file.mimetype,
      fileSize: webpBuf.length,
    }, variantId || undefined);

    this.logger.log(`Uploaded & converted ${file.originalname} → WEBP for product ${productId}${fullResult ? ' (Cloudinary)' : ' (local)'}`);
    return result;
  }

  @Post()
  @ApiOperation({ summary: 'Register a Cloudinary image URL for a product' })
  @ApiBody({ type: RegisterImageDto })
  register(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Body() dto: RegisterImageDto,
  ) {
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

  @Patch(':imageId/type')
  @ApiOperation({ summary: 'Update image type (STUDIO, LIFESTYLE, INVENTORY)' })
  updateType(
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @Body('imageType') imageType: string,
  ) {
    if (!imageType) throw new BadRequestException('imageType is required');
    return this.mediaService.updateImageType(imageId, imageType);
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
