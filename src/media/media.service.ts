import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MediaService {
  constructor(private prisma: PrismaService) {}

  async registerImage(
    productId: string,
    data: {
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
    },
    variantId?: string,
  ) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) throw new NotFoundException('Product not found');

    const lastImage = await this.prisma.productImage.findFirst({
      where: { productId },
      orderBy: { displayOrder: 'desc' },
    });
    const displayOrder = lastImage ? lastImage.displayOrder + 1 : 0;

    if (data.isPrimary) {
      await this.prisma.productImage.updateMany({
        where: { productId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const nameObj = product.name as any;
    const finalAltText =
      data.altText ||
      `${nameObj?.vi || nameObj?.en || 'Koi Leather product'} - ${product.sku || ''}`;

    return this.prisma.productImage.create({
      data: {
        productId,
        variantId: variantId || null,
        url: data.cloudinaryUrl,
        thumbnailUrl: data.thumbnailUrl,
        mediumUrl: data.mediumUrl || data.cloudinaryUrl,
        altText: finalAltText,
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
    return this.prisma.productImage.findMany({
      where: { productId },
      orderBy: { displayOrder: 'asc' },
    });
  }

  async deleteImage(imageId: string) {
    const image = await this.prisma.productImage.findUnique({ where: { id: imageId } });
    if (!image) throw new NotFoundException('Image not found');

    await this.prisma.productImage.delete({ where: { id: imageId } });
    return { deleted: true, cloudinaryPublicId: image.url.split('/').pop()?.split('.')[0] };
  }

  async setPrimaryImage(productId: string, imageId: string) {
    const image = await this.prisma.productImage.findUnique({ where: { id: imageId } });
    if (!image || image.productId !== productId) {
      throw new NotFoundException('Image not found for this product');
    }

    await this.prisma.productImage.updateMany({
      where: { productId, isPrimary: true },
      data: { isPrimary: false },
    });
    return this.prisma.productImage.update({
      where: { id: imageId },
      data: { isPrimary: true },
    });
  }

  async reorderImages(productId: string, items: { id: string; displayOrder: number }[]) {
    const updates = items.map((item) =>
      this.prisma.productImage.updateMany({
        where: { id: item.id, productId },
        data: { displayOrder: item.displayOrder },
      }),
    );
    await Promise.all(updates);
    return this.getProductImages(productId);
  }
}
