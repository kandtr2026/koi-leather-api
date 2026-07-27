import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SpecsValidatorService } from '../common/specs-validator.service';
import { CreateProductDto, VariantDto } from './dto/create-product.dto';
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

  private resolveCategoryIds(dto: { categoryId?: string; categoryIds?: string[] }): string[] {
    const ids = [
      ...(dto.categoryIds || []),
      ...(dto.categoryId ? [dto.categoryId] : []),
    ];
    return [...new Set(ids.filter(Boolean))];
  }

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
      throw new BadRequestException(`Technical specs validation failed: ${errors.join('; ')}`);
    }
  }

  private computePriceRange(
    variants: { price?: number | null }[],
    basePrice?: number | null,
  ) {
    if (!variants || variants.length === 0) {
      return {
        priceMin: basePrice ?? null,
        priceMax: basePrice ?? null,
        hasVariants: false,
      };
    }
    const prices = variants.map(v => v.price).filter((p): p is number => p != null);
    if (prices.length === 0) {
      return { priceMin: basePrice ?? null, priceMax: basePrice ?? null, hasVariants: true };
    }
    return {
      priceMin: Math.min(...prices),
      priceMax: Math.max(...prices),
      hasVariants: true,
    };
  }

  private async upsertVariants(productId: string, variants: VariantDto[]) {
    if (!variants || variants.length === 0) return [];

    return this.prisma.$transaction(async (tx) => {
      const incomingIds = variants.filter(v => v.id).map(v => v.id!);
      await tx.koiProductVariant.deleteMany({
        where: { productId, id: { notIn: incomingIds } },
      });

      const results: any[] = [];
      for (const v of variants) {
        const data: any = {
          productId,
          sku: v.sku,
          title: v.title || null,
          price: v.price,
          hardwareOption: v.hardwareOption || 'none',
          stockStatus: v.stockStatus || 'IN_STOCK',
          isDefault: v.isDefault ?? false,
          options: (v.options || {}) as any,
        };

        if (v.id) {
          const existing = await tx.koiProductVariant.findUnique({ where: { id: v.id } });
          if (existing) {
            const updated = await tx.koiProductVariant.update({ where: { id: v.id }, data });
            results.push(updated);
            continue;
          }
        }
        const created = await tx.koiProductVariant.create({ data });
        results.push(created);
      }
      return results;
    });
  }

  async create(dto: CreateProductDto) {
    const slug = await this.ensureUniqueSlug(this.generateSlug(dto.name.vi));

    if (dto.sku) {
      const existing = await this.prisma.koiProduct.findFirst({
        where: { sku: dto.sku },
      });
      if (existing) throw new ConflictException('Product with this SKU already exists');
    }

    for (const v of dto.variants || []) {
      const dup = await this.prisma.koiProductVariant.findUnique({ where: { sku: v.sku } });
      if (dup) throw new ConflictException(`Variant SKU "${v.sku}" already exists`);
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

    const computed = this.computePriceRange(dto.variants || [], dto.basePrice);

    const created = await this.prisma.koiProduct.create({
      data: {
        name: dto.name as any,
        slug,
        productType: productType as any,
        sku,
        categoryId: primaryCategoryId,
        description: (dto.description || {}) as any,
        basePrice: dto.basePrice ?? undefined,
        priceMin: computed.priceMin ?? undefined,
        priceMax: computed.priceMax ?? undefined,
        hasVariants: computed.hasVariants,
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

    if (dto.variants && dto.variants.length > 0) {
      await this.upsertVariants(created.id, dto.variants);
      const full = await this.prisma.koiProduct.findUnique({
        where: { id: created.id },
        include: {
          variants: true,
          images: { orderBy: { displayOrder: 'asc' } },
          category: true,
          categoryLinks: { include: { category: { select: { id: true, code: true, name: true, slug: true } } } },
        },
      });
      return this.withCategories(full!);
    }

    return this.withCategories(created);
  }

  async findAll(page = 1, limit = 20, type?: string, status?: string, categoryId?: string, categorySlug?: string) {
    const where: Prisma.KoiProductWhereInput = {};
    if (type) where.productType = type as any;
    if (status) where.status = status as any;

    // Resolve category filter: slug takes precedence over UUID
    let resolvedCategoryId = categoryId;
    if (categorySlug) {
      const cat = await this.prisma.koiCategory.findUnique({ where: { slug: categorySlug } });
      if (cat) resolvedCategoryId = cat.id;
    }
    if (resolvedCategoryId) {
      where.categoryLinks = { some: { categoryId: resolvedCategoryId } };
    }

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
          priceMin: true,
          priceMax: true,
          hasVariants: true,
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
        variants: { include: { images_rel: { orderBy: { displayOrder: 'asc' } } } },
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

    const categoriesProvided = dto.categoryIds !== undefined || dto.categoryId !== undefined;
    const newCategoryIds = categoriesProvided ? this.resolveCategoryIds(dto) : null;

    const data: any = {};
    if (dto.name) data.name = dto.name;
    if (dto.productType) data.productType = dto.productType;
    if (dto.basePrice !== undefined) data.basePrice = dto.basePrice;
    if (newCategoryIds) {
      data.categoryId = newCategoryIds[0] ?? null;
      data.categoryLinks = {
        deleteMany: {},
        create: newCategoryIds.map((categoryId) => ({ categoryId })),
      };
    }
    if (dto.description) data.description = dto.description;
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

    if (dto.metaTitle !== undefined) {
      data.metaTitle = dto.metaTitle;
    } else if (dto.seo?.metaTitle !== undefined) {
      data.metaTitle = dto.seo.metaTitle;
    } else if (existing.metaTitle) {
      data.metaTitle = existing.metaTitle;
    } else {
      data.metaTitle = generateProductSeo(nameVi, categoryName, price).metaTitle;
    }

    if (dto.metaDescription !== undefined) {
      data.metaDescription = dto.metaDescription;
    } else if (dto.seo?.metaDescription !== undefined) {
      data.metaDescription = dto.seo.metaDescription;
    } else if (existing.metaDescription) {
      data.metaDescription = existing.metaDescription;
    } else {
      data.metaDescription = generateProductSeo(nameVi, categoryName, price).metaDescription;
    }

    if (dto.variants !== undefined) {
      await this.upsertVariants(id, dto.variants);
      const allVariants = await this.prisma.koiProductVariant.findMany({ where: { productId: id } });
      const computed = this.computePriceRange(allVariants, dto.basePrice ?? existing.basePrice);
      data.priceMin = computed.priceMin;
      data.priceMax = computed.priceMax;
      data.hasVariants = computed.hasVariants;
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

  async createVariant(productId: string, dto: VariantDto) {
    await this.findById(productId);
    const existing = await this.prisma.koiProductVariant.findUnique({ where: { sku: dto.sku } });
    if (existing) throw new ConflictException(`Variant SKU "${dto.sku}" already exists`);

    const variant = await this.prisma.koiProductVariant.create({
      data: {
        productId,
        sku: dto.sku,
        title: dto.title || null,
        price: dto.price,
        hardwareOption: dto.hardwareOption || 'none',
        stockStatus: dto.stockStatus || 'IN_STOCK',
        isDefault: dto.isDefault ?? false,
        options: (dto.options || {}) as any,
      },
    });

    await this.recomputePriceRange(productId);
    return variant;
  }

  async updateVariant(variantId: string, dto: Partial<VariantDto>) {
    const variant = await this.prisma.koiProductVariant.findUnique({ where: { id: variantId } });
    if (!variant) throw new NotFoundException('Variant not found');

    if (dto.sku && dto.sku !== variant.sku) {
      const dup = await this.prisma.koiProductVariant.findUnique({ where: { sku: dto.sku } });
      if (dup) throw new ConflictException(`Variant SKU "${dto.sku}" already exists`);
    }

    const data: any = {};
    if (dto.sku !== undefined) data.sku = dto.sku;
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.price !== undefined) data.price = dto.price;
    if (dto.hardwareOption !== undefined) data.hardwareOption = dto.hardwareOption;
    if (dto.stockStatus !== undefined) data.stockStatus = dto.stockStatus;
    if (dto.isDefault !== undefined) data.isDefault = dto.isDefault;
    if (dto.options !== undefined) data.options = dto.options as any;

    const updated = await this.prisma.koiProductVariant.update({
      where: { id: variantId },
      data,
    });

    await this.recomputePriceRange(variant.productId);
    return updated;
  }

  async removeVariant(variantId: string) {
    const variant = await this.prisma.koiProductVariant.findUnique({ where: { id: variantId } });
    if (!variant) throw new NotFoundException('Variant not found');

    await this.prisma.koiProductVariant.delete({ where: { id: variantId } });
    await this.recomputePriceRange(variant.productId);
    return { deleted: true };
  }

  private async recomputePriceRange(productId: string) {
    const variants = await this.prisma.koiProductVariant.findMany({
      where: { productId },
    });
    const product = await this.prisma.koiProduct.findUnique({ where: { id: productId } });
    const computed = this.computePriceRange(variants, product?.basePrice);
    await this.prisma.koiProduct.update({
      where: { id: productId },
      data: {
        priceMin: computed.priceMin,
        priceMax: computed.priceMax,
        hasVariants: computed.hasVariants,
      },
    });
  }
}
