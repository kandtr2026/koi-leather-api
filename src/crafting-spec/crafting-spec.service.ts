import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCraftingSpecDto } from './dto/create-crafting-spec.dto';
import { UpdateCraftingSpecDto } from './dto/update-crafting-spec.dto';

@Injectable()
export class CraftingSpecService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCraftingSpecDto) {
    const product = await this.prisma.koiProduct.findUnique({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException('Product not found');

    return this.prisma.koiCraftingSpec.create({
      data: {
        productId: dto.productId,
        patternFiles: (dto.patternFiles || []) as any,
        outerLeather: (dto.outerLeather || {}) as any,
        liningLeather: (dto.liningLeather || {}) as any,
        interlining: (dto.interlining || {}) as any,
        dimensions: (dto.dimensions || {}) as any,
        craftingDetails: (dto.craftingDetails || {}) as any,
        notes: dto.notes,
      },
    });
  }

  async findAll() {
    return this.prisma.koiCraftingSpec.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        product: { select: { id: true, name: true, sku: true, slug: true } },
        variants: { select: { id: true, sku: true } },
      },
    });
  }

  async findByProduct(productId: string) {
    return this.prisma.koiCraftingSpec.findMany({
      where: { productId },
      include: { variants: { select: { id: true, sku: true } } },
    });
  }

  async findById(id: string) {
    const spec = await this.prisma.koiCraftingSpec.findUnique({
      where: { id },
      include: { product: true, variants: true },
    });
    if (!spec) throw new NotFoundException('Crafting spec not found');
    return spec;
  }

  async update(id: string, dto: UpdateCraftingSpecDto) {
    await this.findById(id);
    return this.prisma.koiCraftingSpec.update({
      where: { id },
      data: {
        ...(dto.patternFiles ? { patternFiles: dto.patternFiles as any } : {}),
        ...(dto.outerLeather ? { outerLeather: dto.outerLeather as any } : {}),
        ...(dto.liningLeather ? { liningLeather: dto.liningLeather as any } : {}),
        ...(dto.interlining ? { interlining: dto.interlining as any } : {}),
        ...(dto.dimensions ? { dimensions: dto.dimensions as any } : {}),
        ...(dto.craftingDetails ? { craftingDetails: dto.craftingDetails as any } : {}),
        ...(dto.notes !== undefined ? { notes: dto.notes } : {}),
      },
    });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.koiCraftingSpec.delete({ where: { id } });
  }
}
