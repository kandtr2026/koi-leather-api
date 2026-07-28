import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { generateImageAltText } from '../seo/seo-generator.helper';

@Injectable()
export class MediaService {
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

    await this.prisma.koiProductImage.delete({ where: { id: imageId } });
    return { deleted: true, cloudinaryPublicId: image.url.split('/').pop()?.split('.')[0] };
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
}
