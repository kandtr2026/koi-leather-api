import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
  }

  async findById(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: { products: { take: 10, orderBy: { createdAt: 'desc' } } },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async findByCode(code: string) {
    const category = await this.prisma.category.findUnique({
      where: { code: code as any },
      include: { products: { where: { status: 'ACTIVE' } } },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }
}
