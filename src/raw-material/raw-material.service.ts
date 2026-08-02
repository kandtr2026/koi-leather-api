import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateRawMaterialDto } from "./dto/create-raw-material.dto";
import { UpdateRawMaterialDto } from "./dto/update-raw-material.dto";
import { Prisma } from "@prisma/client";

const catalogSelect = {
  id: true,
  name: true,
  materialType: true,
  supplier: true,
  unit: true,
  color: true,
  thicknessMm: true,
  unitCost: true,
  currency: true,
  externalId: true,
  createdAt: true,
  updatedAt: true,
  materialCategory: { select: { id: true, name: true, code: true } },
};

@Injectable()
export class RawMaterialService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateRawMaterialDto) {
    return this.prisma.koiRawMaterial.create({
      data: {
        name: dto.name,
        materialType: dto.materialType,
        supplier: dto.supplier,
        unit: dto.unit,
        color: dto.color,
        thicknessMm: dto.thicknessMm,
        unitCost: dto.unitCost,
        externalId: dto.externalId,
        materialCategoryId: dto.materialCategoryId,
      },
      select: catalogSelect,
    });
  }

  async findAll(type?: string, supplier?: string, materialCategoryId?: string) {
    const where: Prisma.KoiRawMaterialWhereInput = {};
    if (type) where.materialType = type as any;
    if (supplier) where.supplier = { contains: supplier };
    if (materialCategoryId) where.materialCategoryId = materialCategoryId;

    return this.prisma.koiRawMaterial.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: catalogSelect,
    });
  }

  async findById(id: string) {
    const material = await this.prisma.koiRawMaterial.findUnique({
      where: { id },
      select: {
        ...catalogSelect,
        transactions: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });
    if (!material) throw new NotFoundException("Raw material not found");
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
    if (dto.materialCategoryId !== undefined)
      data.materialCategoryId = dto.materialCategoryId;

    return this.prisma.koiRawMaterial.update({
      where: { id },
      data,
      select: catalogSelect,
    });
  }

  async remove(id: string) {
    await this.findById(id);
    await this.prisma.koiInventoryTransaction.deleteMany({
      where: { materialId: id },
    });
    return this.prisma.koiRawMaterial.delete({ where: { id } });
  }
}
