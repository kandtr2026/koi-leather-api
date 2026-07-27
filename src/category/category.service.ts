import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { generateCategorySeo } from '../seo/seo-generator.helper';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const rows = await this.prisma.koiCategory.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        slug: true,
        description: true,
        displayOrder: true,
        isActive: true,
        createdAt: true,
        _count: { select: { categoryLinks: true } },
      },
    });

    // Count only ACTIVE products per category (via junction table)
    const activeCounts: Record<string, number> = {};
    const raw: { categoryId: string; activeCount: number }[] =
      await this.prisma.$queryRaw`
        SELECT pc."categoryId", COUNT(*)::int as "activeCount"
        FROM koi_free_style.koi_product_categories pc
        JOIN koi_free_style.koi_products p ON p.id = pc."productId"
        WHERE p.status = 'ACTIVE'
        GROUP BY pc."categoryId"
      `;
    for (const r of raw) activeCounts[r.categoryId] = Number(r.activeCount);

    return rows.map(r => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      productCount: activeCounts[r.id] ?? 0,
    }));
  }

  async findById(id: string) {
    const category = await this.prisma.koiCategory.findUnique({
      where: { id },
      include: {
        categoryLinks: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: { product: true },
        },
      },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async findByCode(code: string) {
    const category = await this.prisma.koiCategory.findUnique({
      where: { code: code as any },
      include: {
        categoryLinks: {
          include: { product: true },
        },
      },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async create(dto: CreateCategoryDto) {
    const existing = await this.prisma.koiCategory.findUnique({
      where: { code: dto.code as any },
    });
    if (existing) throw new ConflictException(`Category with code "${dto.code}" already exists`);

    if (!dto.metaTitle || !dto.metaDescription) {
      const generated = generateCategorySeo(dto.name);
      if (!dto.metaTitle) dto.metaTitle = generated.metaTitle;
      if (!dto.metaDescription) dto.metaDescription = generated.metaDescription;
    }

    return this.prisma.koiCategory.create({
      data: {
        code: dto.code,
        name: dto.name,
        slug: dto.slug || dto.code.toLowerCase().replace(/_/g, '-'),
        description: dto.description,
        specsSchema: JSON.stringify(dto.specsSchema || {}),
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        displayOrder: dto.displayOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.prisma.koiCategory.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.slug !== undefined) data.slug = dto.slug;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.code !== undefined) data.code = dto.code;
    if (dto.specsSchema !== undefined) data.specsSchema = JSON.stringify(dto.specsSchema);
    if (dto.displayOrder !== undefined) data.displayOrder = dto.displayOrder;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    // Auto-generate SEO if not explicitly provided and no existing value
    const name = dto.name ?? category.name;
    if (dto.metaTitle !== undefined) {
      data.metaTitle = dto.metaTitle;
    } else if (!category.metaTitle) {
      const generated = generateCategorySeo(name);
      data.metaTitle = generated.metaTitle;
    }

    if (dto.metaDescription !== undefined) {
      data.metaDescription = dto.metaDescription;
    } else if (!category.metaDescription) {
      const generated = generateCategorySeo(name);
      data.metaDescription = generated.metaDescription;
    }

    return this.prisma.koiCategory.update({ where: { id }, data });
  }

  async remove(id: string) {
    const category = await this.prisma.koiCategory.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');

    return this.prisma.koiCategory.delete({ where: { id } });
  }

  async toggleStatus(id: string) {
    const category = await this.prisma.koiCategory.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Category not found');

    return this.prisma.koiCategory.update({
      where: { id },
      data: { isActive: !category.isActive },
    });
  }
}
