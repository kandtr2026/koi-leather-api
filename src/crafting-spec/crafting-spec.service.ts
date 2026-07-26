import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCraftingSpecDto } from './dto/create-crafting-spec.dto';
import { UpdateCraftingSpecDto } from './dto/update-crafting-spec.dto';

@Injectable()
export class CraftingSpecService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCraftingSpecDto) {
    const product = await this.prisma.product.findUnique({ where: { id: dto.productId } });
    if (!product) throw new NotFoundException('Product not found');

    return this.prisma.craftingSpec.create({
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

  async findByProduct(productId: string) {
    return this.prisma.craftingSpec.findMany({
      where: { productId },
      include: { variants: { select: { id: true, sku: true } } },
    });
  }

  async findById(id: string) {
    const spec = await this.prisma.craftingSpec.findUnique({
      where: { id },
      include: { product: true, variants: true },
    });
    if (!spec) throw new NotFoundException('Crafting spec not found');
    return spec;
  }

  async update(id: string, dto: UpdateCraftingSpecDto) {
    await this.findById(id);
    return this.prisma.craftingSpec.update({
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
    return this.prisma.craftingSpec.delete({ where: { id } });
  }
}
