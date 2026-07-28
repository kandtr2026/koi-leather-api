import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { generateImageAltText } from '../seo/seo-generator.helper';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class MediaService {
  private logger = new Logger(MediaService.name);

  constructor(private prisma: PrismaService) {}

  async registerImage(
    productId: string,
    data: {
      cloudinaryPublicId?: string;
      cloudinaryUrl: string;
      thumbnailUrl: string;
      mediumUrl?: string;
      altText?: string;
      imageType?: string;
      isPrimary?: boolean;
      width?: number;
      height?: number;
      mimeType?: string;
      fileSize?: number;
    },
    variantId?: string,
  ) {
    const product = await this.prisma.koiProduct.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    // Validate imageType against dynamic categories if provided
    if (data.imageType) {
      const cat = await this.prisma.koiImageCategory.findUnique({ where: { code: data.imageType } });
      if (!cat) {
        const all = await this.prisma.koiImageCategory.findMany({ orderBy: { sortOrder: 'asc' } });
        const codes = all.map(c => c.code).join(', ');
        throw new BadRequestException(`Invalid imageType. Must be one of: ${codes}`);
      }
    }

    const lastImage = await this.prisma.koiProductImage.findFirst({
      where: { productId },
      orderBy: { displayOrder: 'desc' },
    });
    const displayOrder = lastImage ? lastImage.displayOrder + 1 : 0;

    if (data.isPrimary) {
      await this.prisma.koiProductImage.updateMany({
        where: { productId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const nameObj = product.name as any;
    const productName = nameObj?.vi || nameObj?.en || 'Koi Leather product';
    const finalAltText = data.altText || generateImageAltText(productName, data.imageType || 'STUDIO');

    return this.prisma.koiProductImage.create({
      data: {
        productId,
        variantId: variantId || null,
        url: data.cloudinaryUrl,
        thumbnailUrl: data.thumbnailUrl,
        mediumUrl: data.mediumUrl || data.cloudinaryUrl,
        altText: finalAltText,
        imageType: data.imageType || 'STUDIO',
        isPrimary: data.isPrimary || false,
        displayOrder,
        mimeType: data.mimeType || 'image/webp',
        fileSize: data.fileSize || null,
        width: data.width || null,
        height: data.height || null,
      },
    });
  }

  async getProductImages(productId: string) {
    return this.prisma.koiProductImage.findMany({
      where: { productId },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async deleteImage(imageId: string) {
    const image = await this.prisma.koiProductImage.findUnique({ where: { id: imageId } });
    if (!image) throw new NotFoundException('Image not found');

    // Kiểm tra xem URL ảnh có đang được tham chiếu bởi sản phẩm khác không
    const otherRefs = await this.prisma.koiProductImage.count({
      where: {
        id: { not: imageId },
        OR: [
          { url: image.url },
          { thumbnailUrl: image.thumbnailUrl },
          { mediumUrl: image.mediumUrl },
        ],
      },
    });

    if (otherRefs === 0) {
      // Không có tham chiếu nào khác → an toàn để xóa file vật lý
      await this.deletePhysicalFile(image);
    } else {
      this.logger.warn(
        `Image URL "${image.url}" is referenced by ${otherRefs} other record(s). Skipping physical file deletion.`,
      );
    }

    await this.prisma.koiProductImage.delete({ where: { id: imageId } });
    return { deleted: true, cloudinaryPublicId: image.url.split('/').pop()?.split('.')[0] };
  }

  private async deletePhysicalFile(image: {
    url: string;
    thumbnailUrl: string;
    mediumUrl: string | null;
  }) {
    // Try Cloudinary deletion first
    const deletedFromCdn = await this.deleteFromCloudinary(image.url);
    if (!deletedFromCdn) {
      // Fallback: delete from local storage
      this.deleteLocalFile(image.url);
      this.deleteLocalFile(image.thumbnailUrl);
      if (image.mediumUrl) this.deleteLocalFile(image.mediumUrl);
    }
  }

  private async deleteFromCloudinary(url: string): Promise<boolean> {
    const publicId = this.extractCloudinaryPublicId(url);
    if (!publicId) return false;

    try {
      const cloudinary = this.getCloudinaryInstance();
      if (!cloudinary) return false;
      await cloudinary.uploader.destroy(publicId);
      return true;
    } catch (err) {
      this.logger.warn(`Failed to delete from Cloudinary: ${(err as Error).message}`);
      return false;
    }
  }

  private extractCloudinaryPublicId(url: string): string | null {
    // Cloudinary URLs contain the public ID, e.g.:
    // https://res.cloudinary.com/.../image/upload/v123456/koi/products/xxx/yyy
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
    if (!match) return null;
    // Remove format suffix if present
    return match[1].replace(/\.[^.]+$/, '');
  }

  private deleteLocalFile(url: string) {
    if (!url.startsWith('/uploads/')) return;
    const filePath = path.join(process.cwd(), url);
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    } catch (err) {
      this.logger.warn(`Failed to delete local file ${url}: ${(err as Error).message}`);
    }
  }

  async setPrimaryImage(productId: string, imageId: string) {
    const image = await this.prisma.koiProductImage.findUnique({ where: { id: imageId } });
    if (!image || image.productId !== productId) {
      throw new NotFoundException('Image not found for this product');
    }

    await this.prisma.koiProductImage.updateMany({
      where: { productId, isPrimary: true },
      data: { isPrimary: false },
    });
    return this.prisma.koiProductImage.update({
      where: { id: imageId },
      data: { isPrimary: true },
    });
  }

  async reorderImages(productId: string, items: { id: string; displayOrder: number }[]) {
    const updates = items.map((item) =>
      this.prisma.koiProductImage.updateMany({
        where: { id: item.id, productId },
        data: { displayOrder: item.displayOrder },
      }),
    );
    await Promise.all(updates);
    return this.getProductImages(productId);
  }

  async updateImageType(imageId: string, imageType: string, autoGenerateAlt = true) {
    const cat = await this.prisma.koiImageCategory.findUnique({ where: { code: imageType } });
    if (!cat) {
      const all = await this.prisma.koiImageCategory.findMany({ orderBy: { sortOrder: 'asc' } });
      const codes = all.map(c => c.code).join(', ');
      throw new BadRequestException(`imageType must be one of: ${codes}`);
    }
    const existing = await this.prisma.koiProductImage.findUnique({
      where: { id: imageId },
      include: { product: { select: { name: true, slug: true } } },
    });
    if (!existing) throw new NotFoundException('Image not found');

    const data: any = { imageType };
    if (autoGenerateAlt) {
      const nameObj = existing.product.name as any;
      const productName = nameObj?.vi || nameObj?.en || 'Koi Leather product';
      data.altText = generateImageAltText(productName, imageType);
    }
    return this.prisma.koiProductImage.update({ where: { id: imageId }, data });
  }

  async updateImageMetadata(imageId: string, dto: { imageType?: string; altText?: string }) {
    const existing = await this.prisma.koiProductImage.findUnique({ where: { id: imageId } });
    if (!existing) throw new NotFoundException('Image not found');

    const data: any = {};
    if (dto.imageType) {
      const cat = await this.prisma.koiImageCategory.findUnique({ where: { code: dto.imageType } });
      if (!cat) {
        const all = await this.prisma.koiImageCategory.findMany({ orderBy: { sortOrder: 'asc' } });
        const codes = all.map(c => c.code).join(', ');
        throw new BadRequestException(`imageType must be one of: ${codes}`);
      }
      data.imageType = dto.imageType;
    }
    if (dto.altText !== undefined) data.altText = dto.altText;

    return this.prisma.koiProductImage.update({ where: { id: imageId }, data });
  }

  async bulkUpdateImageMetadata(
    productId: string,
    items: { id: string; imageType?: string; altText?: string }[],
  ) {
    const results: any[] = [];
    for (const item of items) {
      const updated = await this.updateImageMetadata(item.id, {
        imageType: item.imageType,
        altText: item.altText,
      });
      results.push(updated);
    }
    return results;
  }

  private getCloudinaryInstance() {
    const name = process.env.CLOUDINARY_CLOUD_NAME;
    const key = process.env.CLOUDINARY_API_KEY;
    const secret = process.env.CLOUDINARY_API_SECRET;
    if (!name || name === 'your_cloud_name' || !key || !secret) return null;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cloudinary = require('cloudinary').v2;
    cloudinary.config({ cloud_name: name, api_key: key, api_secret: secret });
    return cloudinary;
  }
}
