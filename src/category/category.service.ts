import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { generateCategorySeo } from '../seo/seo-generator.helper';
import { generateSlug, generateCode, ensureUniqueSlug, ensureUniqueCode } from '../common/slugAndCodeGenerator';

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

  /** Resolve a slug that is free, ignoring the row being updated. */
  private uniqueSlug(base: string, excludeId?: string) {
    return ensureUniqueSlug(base, async (s) => {
      const existing = await this.prisma.koiCategory.findUnique({ where: { slug: s } });
      return !!existing && existing.id !== excludeId;
    });
  }

  /** Resolve a code that is free, ignoring the row being updated. */
  private uniqueCode(base: string, excludeId?: string) {
    return ensureUniqueCode(base, async (c) => {
      const existing = await this.prisma.koiCategory.findUnique({ where: { code: c as any } });
      return !!existing && existing.id !== excludeId;
    });
  }

  async create(dto: CreateCategoryDto) {
    const [finalCode, finalSlug] = await Promise.all([
      this.uniqueCode(dto.code || generateCode(dto.name)),
      this.uniqueSlug(dto.slug || generateSlug(dto.name)),
    ]);

    if (!dto.metaTitle || !dto.metaDescription) {
      const generated = generateCategorySeo(dto.name);
      if (!dto.metaTitle) dto.metaTitle = generated.metaTitle;
      if (!dto.metaDescription) dto.metaDescription = generated.metaDescription;
    }

    return this.prisma.koiCategory.create({
      data: {
        code: finalCode,
        name: dto.name,
        slug: finalSlug,
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

    const name = dto.name ?? category.name;
    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;

    // Slug follows the name (the admin form previews this), unless sent explicitly.
    if (dto.slug !== undefined) {
      data.slug = await this.uniqueSlug(dto.slug, id);
    } else if (dto.name !== undefined && dto.name !== category.name) {
      data.slug = await this.uniqueSlug(generateSlug(name), id);
    }

    // `code` is an identity key, not a display field: findByCode() resolves
    // categories by it and the admin infers productType from it (WALLET, BELT…).
    // Never rewrite it on rename — only when the caller asks explicitly.
    if (dto.code !== undefined) {
      data.code = await this.uniqueCode(dto.code, id);
    }

    if (dto.description !== undefined) data.description = dto.description;
    if (dto.specsSchema !== undefined) data.specsSchema = JSON.stringify(dto.specsSchema);
    if (dto.displayOrder !== undefined) data.displayOrder = dto.displayOrder;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    // Auto-generate SEO if not explicitly provided and no existing value
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
