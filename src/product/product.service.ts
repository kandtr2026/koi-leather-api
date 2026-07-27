import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SpecsValidatorService } from '../common/specs-validator.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Prisma } from '@prisma/client';
import slugify from 'slugify';
import { generateProductSeo } from '../seo/seo-generator.helper';

@Injectable()
export class ProductService {
  constructor(
    private prisma: PrismaService,
    private specsValidator: SpecsValidatorService,
  ) {}

  private generateSlug(nameVi: string): string {
    let slug = slugify(nameVi, { lower: true, strict: true, locale: 'vi' });
    if (!slug) slug = `product-${Date.now()}`;
    return slug;
  }

  // Gộp categoryId (chính, legacy) + categoryIds (nhiều–nhiều) thành danh sách id duy nhất
  private resolveCategoryIds(dto: { categoryId?: string; categoryIds?: string[] }): string[] {
    const ids = [
      ...(dto.categoryIds || []),
      ...(dto.categoryId ? [dto.categoryId] : []),
    ];
    return [...new Set(ids.filter(Boolean))];
  }

  // Chuyển categoryLinks -> mảng categories phẳng cho response
  private withCategories<T extends { categoryLinks?: any[] }>(p: T): any {
    if (!p) return p;
    const { categoryLinks, ...rest } = p as any;
    return { ...rest, categories: (categoryLinks || []).map((l: any) => l.category) };
  }

  private generateSku(productType: string, slug: string): string {
    const prefixMap: Record<string, string> = {
      WALLET: 'WD',
      BELT: 'TL',
      WATCH_STRAP: 'WS',
      BAG: 'TT',
      ACCESSORY: 'PK',
    };
    const prefix = prefixMap[productType] || 'SP';
    const shortSlug = slug.split('-').slice(0, 3).join('-');
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${shortSlug}-${suffix}`;
  }

  private async ensureUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
    let slug = baseSlug;
    let counter = 0;
    while (true) {
      const existing = await this.prisma.koiProduct.findUnique({ where: { slug } });
      if (!existing || (excludeId && existing.id === excludeId)) return slug;
      counter++;
      slug = `${baseSlug}-${counter}`;
    }
  }

  private async validateTechnicalSpecs(categoryId: string | undefined, technicalSpecs: Record<string, any>) {
    if (!categoryId || !technicalSpecs || Object.keys(technicalSpecs).length === 0) return;

    const category = await this.prisma.koiCategory.findUnique({ where: { id: categoryId } });
    if (!category) throw new BadRequestException(`Category ${categoryId} not found`);

    const schema = category.specsSchema as unknown as Record<string, any>;
    if (!schema || Object.keys(schema).length === 0) return;

    const { valid, errors } = this.specsValidator.validate(schema, technicalSpecs);
    if (!valid) {
      throw new BadRequestException(
        `Technical specs validation failed: ${errors.join('; ')}`,
      );
    }
  }

  async create(dto: CreateProductDto) {
    const slug = await this.ensureUniqueSlug(this.generateSlug(dto.name.vi));

    if (dto.sku) {
      const existing = await this.prisma.koiProduct.findFirst({
        where: { sku: dto.sku },
      });
      if (existing) throw new ConflictException('Product with this SKU already exists');
    }

    const categoryIds = this.resolveCategoryIds(dto);
    const primaryCategoryId = categoryIds[0];
    const productType = dto.productType || 'ACCESSORY';

    const sku = dto.sku || this.generateSku(productType, slug);
    const technicalSpecs = dto.technicalSpecs || dto.specs || {};

    await this.validateTechnicalSpecs(primaryCategoryId, technicalSpecs);

    const providedTitle = dto.metaTitle ?? dto.seo?.metaTitle;
    const providedDesc = dto.metaDescription ?? dto.seo?.metaDescription;

    if (providedTitle && providedDesc) {
      // Both provided — use as-is
    } else {
      let categoryName: string | undefined;
      if (primaryCategoryId) {
        const cat = await this.prisma.koiCategory.findUnique({ where: { id: primaryCategoryId } });
        categoryName = cat?.name;
      }
      const generated = generateProductSeo(dto.name?.vi || '', categoryName, dto.basePrice);
      if (!providedTitle) dto.metaTitle = generated.metaTitle;
      if (!providedDesc) dto.metaDescription = generated.metaDescription;
    }

    const created = await this.prisma.koiProduct.create({
      data: {
        name: dto.name as any,
        slug,
        productType: productType as any,
        sku,
        categoryId: primaryCategoryId,
        description: (dto.description || {}) as any,
        basePrice: dto.basePrice ?? undefined,
        status: dto.status ?? 'DRAFT',
        externalId: dto.externalId,
        technicalSpecs: technicalSpecs as any,
        metaTitle: dto.metaTitle ?? dto.seo?.metaTitle,
        metaDescription: dto.metaDescription ?? dto.seo?.metaDescription,
        canonicalUrl: dto.seo?.canonicalUrl || slug,
        categoryLinks: { create: categoryIds.map((categoryId) => ({ categoryId })) },
      },
      include: {
        images: { orderBy: { displayOrder: 'asc' } },
        variants: true,
        category: true,
        categoryLinks: { include: { category: { select: { id: true, code: true, name: true, slug: true } } } },
      },
    });
    return this.withCategories(created);
  }

  async findAll(page = 1, limit = 20, type?: string, status?: string, categoryId?: string) {
    const where: Prisma.KoiProductWhereInput = {};
    if (type) where.productType = type as any;
    if (status) where.status = status as any;
    if (categoryId) where.categoryId = categoryId;

    const [data, total] = await Promise.all([
      this.prisma.koiProduct.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          name: true,
          slug: true,
          productType: true,
          sku: true,
          basePrice: true,
          status: true,
          technicalSpecs: true,
          createdAt: true,
          updatedAt: true,
          categoryId: true,
          category: { select: { id: true, code: true, name: true, specsSchema: true } },
          categoryLinks: { select: { category: { select: { id: true, code: true, name: true, slug: true } } } },
          _count: { select: { variants: true, images: true } },
          images: {
            orderBy: { displayOrder: 'asc' },
            select: { id: true, thumbnailUrl: true, url: true, altText: true, isPrimary: true },
          },
        },
      }),
      this.prisma.koiProduct.count({ where }),
    ]);

    const productsWithThumbnails = data.map(({ images, categoryLinks, ...product }) => {
      const top = (images || []).slice(0, 3).map((img) => ({
        id: img.id,
        url: img.thumbnailUrl || img.url,
        alt: img.altText,
        isPrimary: img.isPrimary,
      }));
      const totalImages = images?.length || 0;
      const remaining = totalImages > 3 ? totalImages - 3 : 0;
      return {
        ...product,
        categories: (categoryLinks || []).map((l: any) => l.category),
        thumbnails: { items: top, remaining },
      };
    });

    return { data: productsWithThumbnails, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string) {
    const product = await this.prisma.koiProduct.findUnique({
      where: { id },
      include: {
        category: true,
        categoryLinks: { include: { category: { select: { id: true, code: true, name: true, slug: true } } } },
        images: { orderBy: { displayOrder: 'asc' } },
        variants: { include: { images_rel: { orderBy: { displayOrder: 'asc' } } } },
        craftSpecs: true,
        seoRecords: true,
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return this.withCategories(product);
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.koiProduct.findUnique({
      where: { slug },
      include: {
        category: true,
        images: { orderBy: { displayOrder: 'asc' } },
        variants: true,
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(id: string, dto: UpdateProductDto) {
    const existing = await this.findById(id);

    const technicalSpecs = dto.technicalSpecs || dto.specs;
    if (technicalSpecs) {
      const catId = dto.categoryIds?.[0] ?? dto.categoryId ?? (existing as any).categoryId;
      await this.validateTechnicalSpecs(catId || undefined, technicalSpecs);
    }

    // Nhiều–nhiều: nếu client gửi categoryIds (hoặc categoryId), thay toàn bộ danh mục
    const categoriesProvided = dto.categoryIds !== undefined || dto.categoryId !== undefined;
    const newCategoryIds = categoriesProvided ? this.resolveCategoryIds(dto) : null;

    const data: any = {};
    if (dto.name) data.name = dto.name;
    if (dto.productType) data.productType = dto.productType;
    if (newCategoryIds) {
      data.categoryId = newCategoryIds[0] ?? null;
      data.categoryLinks = {
        deleteMany: {},
        create: newCategoryIds.map((categoryId) => ({ categoryId })),
      };
    }
    if (dto.description) data.description = dto.description;
    if (dto.basePrice !== undefined) data.basePrice = dto.basePrice;
    if (dto.status) data.status = dto.status;
    if (dto.externalId !== undefined) data.externalId = dto.externalId;
    if (dto.sku !== undefined) data.sku = dto.sku;
    if (technicalSpecs) data.technicalSpecs = technicalSpecs;

    if (dto.name?.vi && !dto.seo?.canonicalUrl) {
      data.slug = await this.ensureUniqueSlug(this.generateSlug(dto.name.vi), id);
    } else if (dto.seo?.canonicalUrl) {
      data.slug = await this.ensureUniqueSlug(dto.seo.canonicalUrl, id);
      data.canonicalUrl = dto.seo.canonicalUrl;
    }

    const nameVi = dto.name?.vi || (existing.name as any)?.vi || '';
    let categoryName: string | undefined;
    const catId = (newCategoryIds ? newCategoryIds[0] : undefined) || existing.categoryId;
    if (catId) {
      const cat = await this.prisma.koiCategory.findUnique({ where: { id: catId } });
      categoryName = cat?.name;
    }
    const price = dto.basePrice ?? existing.basePrice ?? undefined;

    // Resolve metaTitle: explicit DTO > seo sub-object > existing DB > auto-generate
    if (dto.metaTitle !== undefined) {
      data.metaTitle = dto.metaTitle;
    } else if (dto.seo?.metaTitle !== undefined) {
      data.metaTitle = dto.seo.metaTitle;
    } else if (existing.metaTitle) {
      data.metaTitle = existing.metaTitle;
    } else {
      data.metaTitle = generateProductSeo(nameVi, categoryName, price).metaTitle;
    }

    // Resolve metaDescription: explicit DTO > seo sub-object > existing DB > auto-generate
    if (dto.metaDescription !== undefined) {
      data.metaDescription = dto.metaDescription;
    } else if (dto.seo?.metaDescription !== undefined) {
      data.metaDescription = dto.seo.metaDescription;
    } else if (existing.metaDescription) {
      data.metaDescription = existing.metaDescription;
    } else {
      data.metaDescription = generateProductSeo(nameVi, categoryName, price).metaDescription;
    }

    const updated = await this.prisma.koiProduct.update({
      where: { id },
      data,
      include: {
        images: { orderBy: { displayOrder: 'asc' } },
        variants: true,
        category: true,
        categoryLinks: { include: { category: { select: { id: true, code: true, name: true, slug: true } } } },
      },
    });
    return this.withCategories(updated);
  }

  async remove(id: string) {
    await this.findById(id);
    return this.prisma.koiProduct.delete({ where: { id } });
  }

  async toggleStatus(id: string) {
    const product = await this.findById(id);
    const newStatus = product.status === 'ACTIVE' ? 'DRAFT' : 'ACTIVE';
    return this.prisma.koiProduct.update({
      where: { id },
      data: { status: newStatus },
    });
  }
}
