import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SpecsValidatorService } from '../common/specs-validator.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Prisma } from '@prisma/client';
import slugify from 'slugify';

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

    const sku = dto.sku || this.generateSku(dto.productType, slug);
    const technicalSpecs = dto.technicalSpecs || dto.specs || {};

    await this.validateTechnicalSpecs(dto.categoryId, technicalSpecs);

    return this.prisma.koiProduct.create({
      data: {
        name: dto.name as any,
        slug,
        productType: dto.productType,
        sku,
        categoryId: dto.categoryId,
        description: (dto.description || {}) as any,
        basePrice: dto.basePrice ?? undefined,
        status: dto.status ?? 'DRAFT',
        externalId: dto.externalId,
        technicalSpecs: technicalSpecs as any,
        metaTitle: dto.metaTitle ?? dto.seo?.metaTitle,
        metaDescription: dto.metaDescription ?? dto.seo?.metaDescription,
        canonicalUrl: dto.seo?.canonicalUrl || slug,
      },
      include: {
        images: { orderBy: { displayOrder: 'asc' } },
        variants: true,
        category: true,
      },
    });
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
          _count: { select: { variants: true, images: true } },
        },
      }),
      this.prisma.koiProduct.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string) {
    const product = await this.prisma.koiProduct.findUnique({
      where: { id },
      include: {
        category: true,
        images: { orderBy: { displayOrder: 'asc' } },
        variants: { include: { images_rel: { orderBy: { displayOrder: 'asc' } } } },
        craftSpecs: true,
        seoRecords: true,
      },
    });
    if (!product) throw new NotFoundException('Product not found');
    return product;
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
    await this.findById(id);

    const technicalSpecs = dto.technicalSpecs || dto.specs;
    if (technicalSpecs) {
      const catId = dto.categoryId || (await this.prisma.koiProduct.findUnique({ where: { id }, select: { categoryId: true } }))?.categoryId;
      await this.validateTechnicalSpecs(catId || undefined, technicalSpecs);
    }

    const data: any = {};
    if (dto.name) data.name = dto.name;
    if (dto.productType) data.productType = dto.productType;
    if (dto.categoryId !== undefined) data.categoryId = dto.categoryId;
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

    if (dto.metaTitle !== undefined) data.metaTitle = dto.metaTitle;
    else if (dto.seo?.metaTitle) data.metaTitle = dto.seo.metaTitle;

    if (dto.metaDescription !== undefined) data.metaDescription = dto.metaDescription;
    else if (dto.seo?.metaDescription) data.metaDescription = dto.seo.metaDescription;

    return this.prisma.koiProduct.update({
      where: { id },
      data,
      include: { images: { orderBy: { displayOrder: 'asc' } }, variants: true, category: true },
    });
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
