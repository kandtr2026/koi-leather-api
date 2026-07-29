import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMaterialCategoryDto } from './dto/create-material-category.dto';
import { UpdateMaterialCategoryDto } from './dto/update-material-category.dto';
import { generateCode, ensureUniqueCode } from '../common/slugAndCodeGenerator';

@Injectable()
export class MaterialCategoryService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.koiMaterialCategory.findMany({
      orderBy: { sortOrder: 'asc', name: 'asc' },
      include: { _count: { select: { materials: true } } },
    });
  }

  async findOne(id: string) {
    const category = await this.prisma.koiMaterialCategory.findUnique({
      where: { id },
    });
    if (!category) throw new NotFoundException('Material Category not found');
    return category;
  }

  private uniqueCode(base: string, excludeId?: string) {
    return ensureUniqueCode(base, async (c) => {
      const existing = await this.prisma.koiMaterialCategory.findUnique({ where: { code: c } });
      return !!existing && existing.id !== excludeId;
    });
  }

  async create(dto: CreateMaterialCategoryDto) {
    const finalCode = await this.uniqueCode(dto.code || generateCode(dto.name));
    return this.prisma.koiMaterialCategory.create({
      data: {
        ...dto,
        code: finalCode,
      },
    });
  }

  async update(id: string, dto: UpdateMaterialCategoryDto) {
    const category = await this.prisma.koiMaterialCategory.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Material Category not found');

    const data: UpdateMaterialCategoryDto = { ...dto };
    if (dto.code !== undefined && dto.code !== category.code) {
      data.code = await this.uniqueCode(dto.code, id);
    } else if (dto.name !== undefined && dto.name !== category.name) {
      data.code = await this.uniqueCode(generateCode(dto.name), id);
    }

    return this.prisma.koiMaterialCategory.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    const category = await this.prisma.koiMaterialCategory.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Material Category not found');
    return this.prisma.koiMaterialCategory.delete({ where: { id } });
  }
}