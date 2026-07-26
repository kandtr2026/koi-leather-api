import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRawMaterialDto } from './dto/create-raw-material.dto';
import { UpdateRawMaterialDto } from './dto/update-raw-material.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class RawMaterialService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateRawMaterialDto) {
    return this.prisma.rawMaterial.create({
      data: {
        name: dto.name,
        materialType: dto.materialType,
        supplier: dto.supplier,
        unit: dto.unit,
        color: dto.color,
        thicknessMm: dto.thicknessMm,
        totalQuantity: dto.totalQuantity,
        reservedQuantity: 0,
        availableQuantity: dto.totalQuantity,
        unitCost: dto.unitCost,
        externalId: dto.externalId,
        syncStatus: dto.externalId ? 'PENDING' : 'SYNCED',
      },
    });
  }

  async findAll(type?: string, supplier?: string) {
    const where: Prisma.RawMaterialWhereInput = {};
    if (type) where.materialType = type as any;
    if (supplier) where.supplier = { contains: supplier };

    return this.prisma.rawMaterial.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findById(id: string) {
    const material = await this.prisma.rawMaterial.findUnique({
      where: { id },
      include: { transactions: { orderBy: { createdAt: 'desc' }, take: 20 } },
    });
    if (!material) throw new NotFoundException('Raw material not found');
    return material;
  }

  async update(id: string, dto: UpdateRawMaterialDto) {
    await this.findById(id);

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.materialType) data.materialType = dto.materialType;
    if (dto.supplier !== undefined) data.supplier = dto.supplier;
    if (dto.unit) data.unit = dto.unit;
    if (dto.color !== undefined) data.color = dto.color;
    if (dto.thicknessMm !== undefined) data.thicknessMm = dto.thicknessMm;
    if (dto.unitCost !== undefined) data.unitCost = dto.unitCost;
    if (dto.totalQuantity !== undefined) {
      data.totalQuantity = dto.totalQuantity;
      data.availableQuantity = dto.totalQuantity - (await this.getReserved(id));
    }

    return this.prisma.rawMaterial.update({
      where: { id },
      data,
    });
  }

  private async getReserved(id: string): Promise<number> {
    const mat = await this.prisma.rawMaterial.findUnique({ where: { id } });
    return Number(mat?.reservedQuantity || 0);
  }

  async adjustStock(id: string, quantity: number, notes?: string) {
    const material = await this.findById(id);
    const newTotal = Number(material.totalQuantity) + quantity;
    if (newTotal < 0) throw new Error('Insufficient stock');

    return this.prisma.$transaction(async (tx) => {
      await tx.inventoryTransaction.create({
        data: {
          materialId: id,
          transactionType: quantity > 0 ? 'RECEIPT' : 'CONSUMPTION',
          quantity,
          costAtTransaction: material.unitCost,
          notes,
        },
      });

      return tx.rawMaterial.update({
        where: { id },
        data: {
          totalQuantity: newTotal,
          availableQuantity: newTotal - Number(material.reservedQuantity),
        },
      });
    });
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.rawMaterial.delete({ where: { id } });
  }
}
