import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { SpecsValidatorService } from "../common/specs-validator.service";
import { dieuKienTimSanPham, gopVaoAnd } from "../common/tim-san-pham";
import { CreateProductDto, VariantDto } from "./dto/create-product.dto";
import { UpdateProductDto, VariantPatchDto } from "./dto/update-product.dto";
import { Prisma } from "@prisma/client";
import {
  generateSlug,
  generateSlugAndCode,
  ensureUniqueSlug,
  extractNameForGeneration,
} from "../common/slugAndCodeGenerator";
import {
  generateProductSeo,
  generateProductJsonLd,
  generateImageAltText,
} from "../seo/seo-generator.helper";
import {
  auditHtml,
  blocksToHtml,
  htmlToBlocks,
  normalizeBlocks,
  removedText,
  type DescriptionBlock,
} from "./description-blocks";

@Injectable()
export class ProductService {
  private logger = new Logger(ProductService.name);

  constructor(
    private prisma: PrismaService,
    private specsValidator: SpecsValidatorService,
  ) {}

  private readonly categoryLinksInclude = {
    include: {
      category: { select: { id: true, code: true, name: true, slug: true } },
    },
  } as const;

  private readonly materialCategoryLinksInclude = {
    orderBy: { sortOrder: "asc" as const },
    include: { materialCategory: true },
  } as const;

  private readonly colorLinksInclude = {
    orderBy: { sortOrder: "asc" as const },
  } as const;

  private generateSlug(nameVi: string): string {
    const slug = generateSlug(nameVi);
    return slug || `product-${Date.now()}`;
  }

  private resolveCategoryIds(dto: {
    categoryId?: string;
    categoryIds?: string[];
  }): string[] {
    const ids = [
      ...(dto.categoryIds || []),
      ...(dto.categoryId ? [dto.categoryId] : []),
    ];
    return [...new Set(ids.filter(Boolean))];
  }

  private withCategories<
    T extends {
      categoryLinks?: any[];
      colorLinks?: any[];
      materialCategoryLinks?: any[];
    },
  >(p: T): any {
    if (!p) return p;
    const { categoryLinks, ...rest } = p as any;
    const r = rest as any;
    // Bảng nối màu / loại da → mảng phẳng cho client. Giữ thứ tự sortOrder để
    // phần tử đầu luôn là màu chính (chấm màu đầu tiên trên thẻ sản phẩm).
    if (r.colorLinks) {
      const links = [...r.colorLinks].sort(
        (a: any, b: any) => a.sortOrder - b.sortOrder,
      );
      r.colors = links.map((l: any) => ({
        colorFamily: l.colorFamily,
        colorHex: l.colorHex ?? null,
      }));
      delete r.colorLinks;
    }
    if (r.materialCategoryLinks) {
      const links = [...r.materialCategoryLinks].sort(
        (a: any, b: any) => a.sortOrder - b.sortOrder,
      );
      r.materialCategoryIds = links.map((l: any) => l.materialCategoryId);
      r.materialCategories = links
        .map((l: any) => l.materialCategory)
        .filter(Boolean);
      delete r.materialCategoryLinks;
    }
    return {
      ...r,
      categories: (categoryLinks || []).map((l: any) => l.category),
    };
  }

  // -------------------------------------------------------------------------
  // Mô tả sản phẩm dạng khối
  // -------------------------------------------------------------------------

  /** Lấy chuỗi từ field đa ngữ ({vi,en}) hoặc chuỗi trần. */
  private textOf(v: any): string {
    if (!v) return "";
    if (typeof v === "string") return v;
    return v.vi ?? v.en ?? "";
  }

  /**
   * Bổ sung `descriptionBlocks` + `descriptionAudit` cho một sản phẩm khi trả
   * về admin.
   *
   * Mô tả cũ (chưa có cột khối) được phân tích TẠI CHỖ, KHÔNG ghi vào DB: mở
   * modal xem thôi thì không được đổi dữ liệu. HTML sạch chỉ thực sự được lưu
   * khi người bán bấm Lưu, hoặc khi chạy dọn hàng loạt.
   */
  private withDescriptionBlocks(p: any): any {
    if (!p) return p;
    const html = this.textOf(p.description);
    const name = this.textOf(p.name);

    let blocks: DescriptionBlock[] = normalizeBlocks(
      Array.isArray(p.descriptionBlocks)
        ? p.descriptionBlocks
        : (p.descriptionBlocks as any)?.blocks,
    );
    let derived = false;
    if (!blocks.length && html) {
      blocks = htmlToBlocks(html, name).blocks;
      derived = blocks.length > 0;
    }

    const audit = auditHtml(html);
    return {
      ...p,
      descriptionBlocks: blocks,
      descriptionAudit: {
        ...audit,
        /** true = khối vừa suy ra từ HTML cũ, chưa lưu trong DB. */
        derivedFromHtml: derived,
        /** Chữ sẽ mất nếu dọn — để modal báo trước, không dọn âm thầm. */
        removedText: audit.isLegacy ? removedText(html, name).slice(0, 2000) : "",
      },
    };
  }

  /**
   * Khối do client gửi → dữ liệu ghi DB.
   *
   * Luôn in lại HTML từ khối: `description` (storefront đọc) và
   * `descriptionBlocks` (admin mở lại) không bao giờ được lệch nhau.
   * Trả null khi khối rỗng nhưng mô tả cũ có chữ — chặn ca "trình dựng khối
   * lỗi/gửi mảng rỗng" xoá trắng mô tả đang bán.
   */
  private buildDescriptionData(
    rawBlocks: any[],
    existingHtml: string,
  ): { description: any; descriptionBlocks: any } | null {
    const blocks = normalizeBlocks(rawBlocks);
    if (!blocks.length && existingHtml.trim()) return null;
    return {
      description: { vi: blocksToHtml(blocks) },
      descriptionBlocks: { blocks },
    };
  }

  /** Bỏ trùng theo colorFamily, giữ thứ tự người dùng chọn (đầu = màu chính). */
  private normalizeColors(
    colors: { colorFamily: string; colorHex?: string | null }[] | undefined,
  ) {
    if (!colors) return null;
    const seen = new Set<string>();
    const out: { colorFamily: string; colorHex: string | null }[] = [];
    for (const c of colors) {
      const fam = (c?.colorFamily || "").trim();
      if (!fam || seen.has(fam)) continue;
      seen.add(fam);
      out.push({ colorFamily: fam, colorHex: c.colorHex ?? null });
    }
    return out;
  }

  /** Hợp nhất `colors[]` (mới) với colorFamily/colorHex đơn lẻ (client cũ). */
  private resolveColors(dto: {
    colors?: { colorFamily: string; colorHex?: string | null }[];
    colorFamily?: string | null;
    colorHex?: string | null;
  }) {
    if (dto.colors !== undefined) return this.normalizeColors(dto.colors);
    // Client cũ chỉ gửi 1 màu: coi như danh sách 1 phần tử, null = xoá hết.
    if (dto.colorFamily !== undefined) {
      return dto.colorFamily
        ? [{ colorFamily: dto.colorFamily, colorHex: dto.colorHex ?? null }]
        : [];
    }
    return null; // không gửi gì → giữ nguyên
  }

  /** Hợp nhất `materialCategoryIds[]` (mới) với materialCategoryId đơn (cũ). */
  private resolveMaterialCategoryIds(dto: {
    materialCategoryIds?: string[];
    materialCategoryId?: string | null;
  }) {
    if (dto.materialCategoryIds !== undefined) {
      return [...new Set(dto.materialCategoryIds.filter(Boolean))];
    }
    if (dto.materialCategoryId !== undefined) {
      return dto.materialCategoryId ? [dto.materialCategoryId] : [];
    }
    return null;
  }

  private generateSku(productType: string, slug: string): string {
    const prefixMap: Record<string, string> = {
      WALLET: "WD",
      BELT: "TL",
      WATCH_STRAP: "WS",
      BAG: "TT",
      ACCESSORY: "PK",
    };
    const prefix = prefixMap[productType] || "SP";
    const shortSlug = slug.split("-").slice(0, 3).join("-");
    const suffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${shortSlug}-${suffix}`;
  }

  private async ensureUniqueSlug(
    baseSlug: string,
    excludeId?: string,
    tx?: any,
  ): Promise<string> {
    const client = tx || this.prisma;
    return ensureUniqueSlug(baseSlug, async (s) => {
      const existing = await client.koiProduct.findUnique({
        where: { slug: s },
      });
      return !!existing && existing.id !== excludeId;
    });
  }

  private safeParseSpecs(value: any): Record<string, any> {
    if (!value) return {};
    if (typeof value === "string") {
      try {
        return JSON.parse(value);
      } catch {
        throw new BadRequestException(
          "Thông số kỹ thuật không đúng định dạng JSON. Vui lòng kiểm tra lại.",
        );
      }
    }
    if (typeof value === "object" && !Array.isArray(value)) return value;
    throw new BadRequestException(
      "Thông số kỹ thuật phải là một object hoặc JSON string hợp lệ.",
    );
  }

  private async validateTechnicalSpecs(
    categoryId: string | undefined,
    technicalSpecs: Record<string, any>,
  ) {
    if (
      !categoryId ||
      !technicalSpecs ||
      Object.keys(technicalSpecs).length === 0
    )
      return;
    const category = await this.prisma.koiCategory.findUnique({
      where: { id: categoryId },
    });
    if (!category)
      throw new BadRequestException(`Danh mục ${categoryId} không tồn tại`);
    const schema = category.specsSchema as unknown as Record<string, any>;
    if (!schema || Object.keys(schema).length === 0) return;
    const { valid, errors } = this.specsValidator.validate(
      schema,
      technicalSpecs,
    );
    if (!valid) {
      throw new BadRequestException(
        `Thông số kỹ thuật không hợp lệ: ${errors.join("; ")}`,
      );
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
    const prices = variants
      .map((v) => v.price)
      .filter((p): p is number => p != null);
    if (prices.length === 0) {
      return {
        priceMin: basePrice ?? null,
        priceMax: basePrice ?? null,
        hasVariants: true,
      };
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
      return this.upsertVariantsTx(tx, productId, variants);
    });
  }

  private async upsertVariantsTx(
    tx: any,
    productId: string,
    variants: VariantDto[],
  ) {
    if (!variants || variants.length === 0) return [];

    const incomingIds = variants.filter((v) => v.id).map((v) => v.id!);
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
        hardwareOption: v.hardwareOption || "none",
        stockStatus: v.stockStatus || "IN_STOCK",
        isDefault: v.isDefault ?? false,
        options: (v.options || {}) as any,
      };

      if (v.id) {
        const existing = await tx.koiProductVariant.findUnique({
          where: { id: v.id },
        });
        if (existing) {
          const updated = await tx.koiProductVariant.update({
            where: { id: v.id },
            data,
          });
          results.push(updated);
          continue;
        }
      }
      const created = await tx.koiProductVariant.create({ data });
      results.push(created);
    }
    return results;
  }

  async create(dto: CreateProductDto) {
    try {
      const categoryIds = this.resolveCategoryIds(dto);
      const primaryCategoryId = categoryIds[0];
      const productType = dto.productType || "ACCESSORY";

      // Màu / loại da: phần tử đầu của mảng là "chính", cũng ghi xuống cột cũ
      // trên koi_products để code chưa đọc bảng nối vẫn chạy đúng.
      const colors = this.resolveColors(dto) ?? [];
      const materialCategoryIds = this.resolveMaterialCategoryIds(dto) ?? [];
      const primaryColor = colors[0] ?? null;
      const primaryMaterialCategoryId = materialCategoryIds[0] ?? null;

      const rawSpecs = dto.technicalSpecs ?? dto.specs ?? {};
      const technicalSpecs = this.safeParseSpecs(rawSpecs);

      await this.validateTechnicalSpecs(primaryCategoryId, technicalSpecs);

      // Pre-compute SEO metadata (outside transaction — read-only, no side effects)
      const nameVi = extractNameForGeneration(dto.name);
      const providedTitle = dto.metaTitle ?? dto.seo?.metaTitle;
      const providedDesc = dto.metaDescription ?? dto.seo?.metaDescription;
      let categoryName: string | undefined;
      if (primaryCategoryId) {
        const cat = await this.prisma.koiCategory.findUnique({
          where: { id: primaryCategoryId },
        });
        categoryName = cat?.name;
      }

      const seo = generateProductSeo(
        nameVi,
        categoryName,
        dto.basePrice ?? undefined,
      );
      const metaTitle = providedTitle || seo.metaTitle;
      const metaDescription = providedDesc || seo.metaDescription;
      const computed = this.computePriceRange(
        dto.variants || [],
        dto.basePrice,
      );

      // Sản phẩm mới soạn bằng trình dựng khối: HTML sinh từ khối. Sản phẩm mới
      // chưa có mô tả cũ nên khối rỗng là chấp nhận được (truyền "" làm mô tả
      // hiện có → buildDescriptionData không chặn).
      const newDescription =
        dto.descriptionBlocks !== undefined
          ? this.buildDescriptionData(dto.descriptionBlocks, "")
          : null;

      // Atomic transaction: slug check, SKU check, create, and variants upsert
      const result = await this.prisma.$transaction(async (tx) => {
        const slug = await this.ensureUniqueSlug(
          this.generateSlug(nameVi),
          undefined,
          tx,
        );

        if (dto.sku) {
          const existing = await tx.koiProduct.findFirst({
            where: { sku: dto.sku },
          });
          if (existing)
            throw new ConflictException(`SKU "${dto.sku}" đã tồn tại`);
        }

        for (const v of dto.variants || []) {
          if (!v.sku)
            throw new BadRequestException("SKU biến thể không được để trống");
          const dup = await tx.koiProductVariant.findUnique({
            where: { sku: v.sku },
          });
          if (dup)
            throw new ConflictException(`SKU biến thể "${v.sku}" đã tồn tại`);
        }

        const sku = dto.sku || this.generateSku(productType, slug);

        const created = await tx.koiProduct.create({
          data: {
            name: dto.name as any,
            slug,
            productType: productType as any,
            sku,
            categoryId: primaryCategoryId,
            description: (newDescription?.description ||
              dto.description ||
              {}) as any,
            descriptionBlocks: (newDescription?.descriptionBlocks ??
              null) as any,
            basePrice: dto.basePrice ?? undefined,
            priceMin: computed.priceMin ?? undefined,
            priceMax: computed.priceMax ?? undefined,
            hasVariants: computed.hasVariants,
            // Mặc định ACTIVE: sản phẩm vừa tạo trong admin phải xuất hiện ngay
            // ngoài store. Trước đây mặc định DRAFT nên hàng mới thêm bị ẩn im
            // lặng — admin đếm 33, store đếm 34, và chủ shop không hiểu vì sao
            // không thấy hàng. Muốn ẩn thì bấm nút "hiện/ẩn" trên từng dòng.
            status: dto.status ?? "ACTIVE",
            externalId: dto.externalId,
            materialCategoryId: primaryMaterialCategoryId,
            colorFamily: primaryColor?.colorFamily ?? null,
            colorHex: primaryColor?.colorHex ?? null,
            technicalSpecs: technicalSpecs as any,
            metaTitle,
            metaDescription,
            canonicalUrl: dto.seo?.canonicalUrl || slug,
            categoryLinks: {
              create: categoryIds.map((categoryId) => ({ categoryId })),
            },
            colorLinks: {
              create: colors.map((c, i) => ({
                colorFamily: c.colorFamily,
                colorHex: c.colorHex,
                sortOrder: i,
              })),
            },
            materialCategoryLinks: {
              create: materialCategoryIds.map((materialCategoryId, i) => ({
                materialCategoryId,
                sortOrder: i,
              })),
            },
          },
          include: {
            images: { orderBy: { displayOrder: "asc" } },
            variants: true,
            category: true,
            categoryLinks: this.categoryLinksInclude,
            colorLinks: this.colorLinksInclude,
            materialCategoryLinks: this.materialCategoryLinksInclude,
          },
        });

        if (dto.variants && dto.variants.length > 0) {
          await this.upsertVariantsTx(tx, created.id, dto.variants);
          const full = await tx.koiProduct.findUnique({
            where: { id: created.id },
            include: {
              variants: true,
              images: { orderBy: { displayOrder: "asc" } },
              category: true,
              categoryLinks: this.categoryLinksInclude,
              colorLinks: this.colorLinksInclude,
              materialCategoryLinks: this.materialCategoryLinksInclude,
            },
          });
          return this.withCategories(full!);
        }

        return this.withCategories(created);
      });

      try {
        await this.upsertSeoRecord(result);
        await this.updateImageAltText(result);
      } catch (seoErr) {
        this.logger.warn(
          `SEO/alt-text generation failed (non-blocking): ${(seoErr as Error).message}`,
        );
      }

      return result;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof ConflictException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        this.logger.error(`Prisma error [${error.code}]: ${error.message}`);
        if (error.code === "P2002") {
          const target = ((error.meta as any)?.target as string[]) || [];
          const fieldStr = target.join(", ");
          throw new ConflictException(
            `Dữ liệu bị trùng lặp (${fieldStr}). Vui lòng kiểm tra lại SKU/slug.`,
          );
        }
        if (error.code === "P2003") {
          throw new BadRequestException(
            "Dữ liệu tham chiếu không hợp lệ (danh mục hoặc biến thể không tồn tại).",
          );
        }
      }
      this.logger.error(
        `Unexpected error creating product: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw new InternalServerErrorException(
        "Không thể tạo sản phẩm, vui lòng thử lại sau.",
      );
    }
  }

  private async upsertSeoRecord(product: any) {
    const jsonLd = generateProductJsonLd({
      name:
        typeof product.name === "object"
          ? product.name?.vi || product.name?.en || ""
          : String(product.name || ""),
      slug: product.slug,
      description:
        typeof product.description === "object"
          ? product.description?.vi || product.description?.en
          : product.description,
      basePrice: product.basePrice,
      priceMin: product.priceMin,
      priceMax: product.priceMax,
      sku: product.sku,
      category: product.category ? { name: product.category.name } : undefined,
    });

    await this.prisma.koiSEORecord.upsert({
      where: {
        slug: product.slug,
      },
      create: {
        entityType: "PRODUCT",
        entityId: product.id,
        slug: product.slug,
        jsonLd: JSON.stringify(jsonLd),
        metaTitle: product.metaTitle || undefined,
        metaDescription: product.metaDescription || undefined,
      },
      update: {
        jsonLd: JSON.stringify(jsonLd),
        metaTitle: product.metaTitle || undefined,
        metaDescription: product.metaDescription || undefined,
      },
    });
  }

  private async updateImageAltText(product: any) {
    const productName =
      typeof product.name === "object"
        ? product.name?.vi || product.name?.en || ""
        : String(product.name || "");

    const images = await this.prisma.koiProductImage.findMany({
      where: { productId: product.id, altText: null },
    });

    for (const img of images) {
      const altText = generateImageAltText(productName, img.imageType);
      await this.prisma.koiProductImage.update({
        where: { id: img.id },
        data: { altText },
      });
    }
  }

  /**
   * Whitelist of sortable columns for the admin product table. Keys are the
   * public `sort` query values; values build the Prisma orderBy fragment.
   * A whitelist (not a passthrough) keeps arbitrary client input out of the
   * query, and keeps the API stable if a column is renamed in the schema.
   */
  private static readonly PRODUCT_SORT_FIELDS: Record<
    string,
    (dir: Prisma.SortOrder) => Prisma.KoiProductOrderByWithRelationInput
  > = {
    // `name` and `technicalSpecs` are stringified JSON in text columns (see the
    // PrismaService JSON middleware). The `{"vi":"` prefix is constant, so a
    // plain text sort orders by the Vietnamese name in practice.
    name: (dir) => ({ name: dir }),
    images: (dir) => ({ images: { _count: dir } }),
    category: (dir) => ({ category: { name: dir } }),
    // `material` và `color` là cột bấm được trên bảng admin nhưng trước đây
    // thiếu ở whitelist, nên bấm vào là 400. Sắp theo tên loại da / mã nhóm
    // màu chính (cột đơn luôn được đồng bộ với phần tử đầu của colors[]).
    material: (dir) => ({ materialCategory: { name: dir } }),
    color: (dir) => ({ colorFamily: dir }),
    price: (dir) => ({ basePrice: dir }),
    specs: (dir) => ({ technicalSpecs: dir }),
    updatedAt: (dir) => ({ updatedAt: dir }),
    createdAt: (dir) => ({ createdAt: dir }),
    sku: (dir) => ({ sku: dir }),
    status: (dir) => ({ status: dir }),
  };

  async findAll(
    page = 1,
    limit = 20,
    type?: string,
    status?: string,
    categoryId?: string,
    categorySlug?: string,
    search?: string, // <--- Add search parameter
    sort?: string,
    order?: string,
    missing?: string,
    materialCategoryId?: string,
    priceMin?: number,
    priceMax?: number,
  ) {
    const where: Prisma.KoiProductWhereInput = { isDeleted: false };
    if (type) where.productType = type as any;
    if (status) where.status = status as any;

    // --- Todolist filter: chỉ sản phẩm còn thiếu dữ liệu ---
    // Kết hợp bằng where.AND vì ô tìm kiếm và lọc loại da bên dưới cũng dùng AND
    // — cả ba phải cộng dồn, không cái nào được đè cái nào (dùng gopVaoAnd).
    // technicalSpecs là JSON nén thành chuỗi trong cột text, nên "rỗng" gồm cả
    // null, chuỗi trống và '{}' (xem PrismaService JSON middleware).
    const emptySpecs: Prisma.KoiProductWhereInput = {
      OR: [
        { technicalSpecs: "" },
        { technicalSpecs: "{}" },
      ],
    };
    const missingCondition = (
      key: string,
    ): Prisma.KoiProductWhereInput | null => {
      switch (key) {
        case "material":
          return { materialCategoryId: null };
        case "price":
          return { basePrice: null };
        case "specs":
          return emptySpecs;
        case "category":
          return { categoryLinks: { none: {} } };
        case "images":
          return { images: { none: {} } };
        case "color":
          return { colorFamily: null };
        default:
          return null;
      }
    };
    if (missing) {
      const keys = missing
        .split(",")
        .map((k) => k.trim().toLowerCase())
        .filter(Boolean);
      const missingAnd: Prisma.KoiProductWhereInput[] = [];
      if (keys.includes("any")) {
        // Thiếu bất kỳ trường nào trong danh sách todolist.
        missingAnd.push({
          OR: [
            { materialCategoryId: null },
            { basePrice: null },
            emptySpecs,
            { categoryLinks: { none: {} } },
          ],
        });
      } else {
        // Nhiều key = thiếu tất cả (AND) các trường được liệt kê.
        for (const key of keys) {
          const cond = missingCondition(key);
          if (cond) missingAnd.push(cond);
        }
      }
      gopVaoAnd(where, missingAnd);
    }
    // --- End todolist filter ---

    let resolvedCategoryId = categoryId;
    if (categorySlug) {
      const cat = await this.prisma.koiCategory.findUnique({
        where: { slug: categorySlug },
      });
      // A stale slug (e.g. a bookmarked link from before a category rename) must
      // not silently fall through to "no filter" — that returns the full catalog
      // while the UI still claims the filter is active.
      if (!cat) {
        throw new NotFoundException(
          `Không tìm thấy danh mục có slug "${categorySlug}"`,
        );
      }
      resolvedCategoryId = cat.id;
    }
    if (resolvedCategoryId) {
      where.categoryLinks = { some: { categoryId: resolvedCategoryId } };
    }

    // --- Lọc theo loại da ---
    // Sản phẩm gán nhiều loại da qua bảng nối; cột materialCategoryId đơn là
    // của bản cũ và chỉ giữ loại da đầu tiên. Phải khớp CẢ HAI, nếu không
    // những sản phẩm nhập trước khi có bảng nối sẽ biến mất khỏi kết quả.
    if (materialCategoryId) {
      gopVaoAnd(where, [
        {
          OR: [
            { materialCategoryLinks: { some: { materialCategoryId } } },
            { materialCategoryId },
          ],
        },
      ]);
    }

    // --- Lọc theo khoảng giá ---
    // Chỉ áp khi là số thật. Sản phẩm chưa có giá (basePrice = null) tự rơi
    // khỏi kết quả — muốn tìm chúng thì đã có chip "Chưa có giá".
    const priceRange: Prisma.FloatFilter = {};
    if (typeof priceMin === "number" && Number.isFinite(priceMin)) {
      priceRange.gte = priceMin;
    }
    if (typeof priceMax === "number" && Number.isFinite(priceMax)) {
      priceRange.lte = priceMax;
    }
    if (Object.keys(priceRange).length) {
      where.basePrice = priceRange;
    }

    // --- Tìm kiếm ---
    // Dùng CHUNG vị từ với mặt tiền (src/common/tim-san-pham.ts). Trước đây chỗ
    // này nhét cả chuỗi vào một `contains` trên các cột JSON, nên gõ "vi" ra tất
    // cả 324 sản phẩm (khớp cái khoá {"vi":) còn gõ "vi da nam" ra 0 — tức là ô
    // tìm trong trang quản trị gần như chỉ chạy khi gõ đủ dấu và đúng một từ.
    //
    // Gộp vào AND thay vì gán where.OR: ở trên đã có lọc loại da và nhóm "thiếu
    // thông tin" cùng dùng AND, và giữ AND thì từ khoá nhiều từ mới là "phải có
    // đủ" chứ không phải "có một trong số".
    if (search) {
      const nhomToken = dieuKienTimSanPham(search, true);
      // Từ khoá rỗng nghĩa/không còn token ("   ", "{}") thì bỏ qua, không lọc
      // rỗng — đừng biến ô tìm gõ nhầm thành danh sách trắng.
      if (nhomToken) gopVaoAnd(where, nhomToken);
    }
    // --- Hết tìm kiếm ---

    // `id` is the tiebreaker, not decoration: the catalog was imported in
    // batches so hundreds of rows share a createdAt down to the millisecond,
    // and Postgres does not guarantee an order between equal sort keys.
    // Without it each OFFSET query could order the ties differently, so some
    // products appeared on two pages and others on none. Every sort option
    // keeps it for the same reason (image counts and prices tie constantly).
    const dir: Prisma.SortOrder =
      order?.toLowerCase() === "asc" ? "asc" : "desc";
    const buildOrderBy = sort
      ? ProductService.PRODUCT_SORT_FIELDS[sort]
      : undefined;
    if (sort && !buildOrderBy) {
      throw new BadRequestException(
        `Không thể sắp xếp theo "${sort}". Các trường hợp lệ: ${Object.keys(ProductService.PRODUCT_SORT_FIELDS).join(", ")}`,
      );
    }
    const orderBy: Prisma.KoiProductOrderByWithRelationInput[] = buildOrderBy
      ? [buildOrderBy(dir), { id: "asc" }]
      : [{ createdAt: "desc" }, { id: "asc" }];

    const [data, total] = await Promise.all([
      this.prisma.koiProduct.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy,
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
          // Nút tick ngôi sao trong bảng admin cần biết trạng thái hiện tại.
          isFeatured: true,
          technicalSpecs: true,
          createdAt: true,
          updatedAt: true,
          categoryId: true,
          materialCategoryId: true,
          category: {
            select: {
              id: true,
              code: true,
              name: true,
              slug: true,
              specsSchema: true,
            },
          },
          categoryLinks: {
            select: {
              category: {
                select: { id: true, code: true, name: true, slug: true },
              },
            },
          },
          colorLinks: {
            orderBy: { sortOrder: "asc" },
            select: { colorFamily: true, colorHex: true },
          },
          materialCategoryLinks: {
            orderBy: { sortOrder: "asc" },
            select: {
              materialCategoryId: true,
              materialCategory: { select: { id: true, code: true, name: true } },
            },
          },
          _count: { select: { variants: true, images: true } },
          images: {
            orderBy: { displayOrder: "asc" },
            select: {
              id: true,
              thumbnailUrl: true,
              url: true,
              altText: true,
              isPrimary: true,
            },
          },
        },
      }),
      this.prisma.koiProduct.count({ where }),
    ]);

    const productsWithThumbnails = data.map(
      ({ images, categoryLinks, colorLinks, materialCategoryLinks, ...product }) => {
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
          colors: (colorLinks || []).map((l: any) => ({
            colorFamily: l.colorFamily,
            colorHex: l.colorHex ?? null,
          })),
          materialCategoryIds: (materialCategoryLinks || []).map(
            (l: any) => l.materialCategoryId,
          ),
          materialCategories: (materialCategoryLinks || [])
            .map((l: any) => l.materialCategory)
            .filter(Boolean),
          thumbnails: { items: top, remaining },
        };
      },
    );

    return {
      data: productsWithThumbnails,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string) {
    const product = await this.prisma.koiProduct.findFirst({
      where: { id, isDeleted: false },
      include: {
        category: true,
        categoryLinks: {
          include: {
            category: {
              select: { id: true, code: true, name: true, slug: true },
            },
          },
        },
        colorLinks: this.colorLinksInclude,
        materialCategoryLinks: this.materialCategoryLinksInclude,
        images: { orderBy: { displayOrder: "asc" } },
        variants: {
          include: { images_rel: { orderBy: { displayOrder: "asc" } } },
        },
        craftSpecs: true,
        seoRecords: true,
      },
    });
    if (!product) throw new NotFoundException("Product not found");
    // findById là đường admin đọc để mở modal sửa → kèm khối + kiểm kê rác.
    return this.withDescriptionBlocks(this.withCategories(product));
  }

  async findBySlug(slug: string) {
    const product = await this.prisma.koiProduct.findFirst({
      where: { slug, isDeleted: false },
      include: {
        category: true,
        colorLinks: this.colorLinksInclude,
        materialCategoryLinks: this.materialCategoryLinksInclude,
        images: { orderBy: { displayOrder: "asc" } },
        variants: {
          include: { images_rel: { orderBy: { displayOrder: "asc" } } },
        },
      },
    });
    if (!product) throw new NotFoundException("Product not found");
    return this.withCategories(product);
  }

  async update(id: string, dto: UpdateProductDto) {
    const existing = await this.findById(id);

    const technicalSpecs = dto.technicalSpecs || dto.specs;
    if (technicalSpecs) {
      const catId =
        dto.categoryIds?.[0] ?? dto.categoryId ?? (existing as any).categoryId;
      await this.validateTechnicalSpecs(
        catId || undefined,
        this.safeParseSpecs(technicalSpecs),
      );
    }

    const categoriesProvided =
      dto.categoryIds !== undefined || dto.categoryId !== undefined;
    const newCategoryIds = categoriesProvided
      ? this.resolveCategoryIds(dto)
      : null;

    // Màu / loại da: `colors[]` và `materialCategoryIds[]` là nguồn chính;
    // colorFamily/materialCategoryId đơn lẻ vẫn nhận được (client cũ).
    // null trả về = client không gửi gì → giữ nguyên liên kết đang có.
    const newColors = this.resolveColors(dto);
    const newMaterialCategoryIds = this.resolveMaterialCategoryIds(dto);

    const data: any = {};
    if (dto.name) data.name = dto.name;
    if (dto.productType) data.productType = dto.productType;
    // null = xoá giá, undefined = client không gửi field nên giữ nguyên.
    if (dto.basePrice !== undefined) data.basePrice = dto.basePrice ?? null;
    if (dto.description) data.description = dto.description;
    // Trình dựng khối gửi `descriptionBlocks` → HTML được in lại từ khối, đè
    // luôn `description` client gửi kèm (nếu có) để hai chỗ không lệch nhau.
    if (dto.descriptionBlocks !== undefined) {
      const built = this.buildDescriptionData(
        dto.descriptionBlocks,
        this.textOf((existing as any).description),
      );
      if (!built) {
        throw new BadRequestException(
          "Mô tả dạng khối rỗng nhưng sản phẩm đang có mô tả — từ chối ghi để " +
            "không xoá trắng. Muốn xoá mô tả thì gửi description = {vi: \"\"}.",
        );
      }
      data.description = built.description;
      data.descriptionBlocks = built.descriptionBlocks;
    }
    if (dto.status) data.status = dto.status;
    if (dto.externalId !== undefined) data.externalId = dto.externalId;
    if (dto.sku !== undefined) data.sku = dto.sku;
    // Cột cũ trên koi_products = phần tử ĐẦU của danh sách ("chính"), để code
    // chưa đọc bảng nối vẫn thấy đúng một màu / một loại da.
    if (newMaterialCategoryIds !== null)
      data.materialCategoryId = newMaterialCategoryIds[0] ?? null;
    if (newColors !== null) {
      data.colorFamily = newColors[0]?.colorFamily ?? null;
      data.colorHex = newColors[0]?.colorHex ?? null;
    }
    if (technicalSpecs)
      data.technicalSpecs = this.safeParseSpecs(technicalSpecs);

    if (dto.name?.vi && !dto.seo?.canonicalUrl) {
      data.slug = await this.ensureUniqueSlug(
        this.generateSlug(dto.name.vi),
        id,
      );
    } else if (dto.seo?.canonicalUrl) {
      data.slug = await this.ensureUniqueSlug(dto.seo.canonicalUrl, id);
      data.canonicalUrl = dto.seo.canonicalUrl;
    }

    const nameVi =
      extractNameForGeneration(dto.name) ||
      extractNameForGeneration(existing.name) ||
      "";
    let categoryName: string | undefined;
    const catId =
      (newCategoryIds ? newCategoryIds[0] : undefined) || existing.categoryId;
    if (catId) {
      const cat = await this.prisma.koiCategory.findUnique({
        where: { id: catId },
      });
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
      data.metaTitle = generateProductSeo(
        nameVi,
        categoryName,
        price,
      ).metaTitle;
    }

    if (dto.metaDescription !== undefined) {
      data.metaDescription = dto.metaDescription;
    } else if (dto.seo?.metaDescription !== undefined) {
      data.metaDescription = dto.seo.metaDescription;
    } else if (existing.metaDescription) {
      data.metaDescription = existing.metaDescription;
    } else {
      data.metaDescription = generateProductSeo(
        nameVi,
        categoryName,
        price,
      ).metaDescription;
    }

    if (dto.variants !== undefined) {
      await this.upsertVariants(id, dto.variants);
      const allVariants = await this.prisma.koiProductVariant.findMany({
        where: { productId: id },
      });
      const computed = this.computePriceRange(
        allVariants,
        dto.basePrice ?? existing.basePrice,
      );
      data.priceMin = computed.priceMin;
      data.priceMax = computed.priceMax;
      data.hasVariants = computed.hasVariants;
    }

    // Category mapping: atomic transaction - xoá liên kết cũ, tạo liên kết mới, cập nhật product đồng thời
    const updated = await this.prisma.$transaction(async (tx) => {
      if (newCategoryIds !== null) {
        await tx.koiProductCategory.deleteMany({ where: { productId: id } });
        if (newCategoryIds.length > 0) {
          await tx.koiProductCategory.createMany({
            data: newCategoryIds.map((categoryId) => ({
              productId: id,
              categoryId,
            })),
          });
        }
        data.categoryId = newCategoryIds[0] ?? null;
      }

      // Màu: thay toàn bộ liên kết (đơn giản và đúng hơn diff từng dòng —
      // số màu mỗi SP chỉ vài cái).
      if (newColors !== null) {
        await tx.koiProductColor.deleteMany({ where: { productId: id } });
        if (newColors.length > 0) {
          await tx.koiProductColor.createMany({
            data: newColors.map((c, i) => ({
              productId: id,
              colorFamily: c.colorFamily,
              colorHex: c.colorHex,
              sortOrder: i,
            })),
          });
        }
      }

      if (newMaterialCategoryIds !== null) {
        await tx.koiProductMaterialCategory.deleteMany({
          where: { productId: id },
        });
        if (newMaterialCategoryIds.length > 0) {
          await tx.koiProductMaterialCategory.createMany({
            data: newMaterialCategoryIds.map((materialCategoryId, i) => ({
              productId: id,
              materialCategoryId,
              sortOrder: i,
            })),
          });
        }
      }

      return tx.koiProduct.update({
        where: { id },
        data,
        include: {
          images: { orderBy: { displayOrder: "asc" } },
          variants: true,
          category: true,
          categoryLinks: this.categoryLinksInclude,
          colorLinks: this.colorLinksInclude,
          materialCategoryLinks: this.materialCategoryLinksInclude,
        },
      });
    });
    return this.withCategories(updated);
  }

  async remove(id: string) {
    await this.findById(id);

    const { deletedAt } = await this.prisma.$transaction(async (tx) => {
      const now = new Date();

      await tx.koiProductionOrder.updateMany({
        where: { variant: { productId: id } },
        data: { status: "CANCELLED" },
      });

      await tx.koiProduct.update({
        where: { id },
        data: { isDeleted: true, deletedAt: now },
      });

      // Đơn bị huỷ thì trả nguyên liệu đã giữ chỗ về lại kho khả dụng.
      const cancelledOrders = await tx.koiProductionOrder.findMany({
        where: { variant: { productId: id } },
      });
      for (const order of cancelledOrders) {
        const allocations = order.materialsAllocated as unknown as Array<{
          material_id: string;
          qty: number;
        }>;
        if (!allocations || allocations.length === 0) continue;
        for (const alloc of allocations) {
          if (!alloc.material_id) continue;
          await tx.koiRawMaterial.update({
            where: { id: alloc.material_id },
            data: {
              reservedQuantity: { decrement: alloc.qty },
              availableQuantity: { increment: alloc.qty },
            },
          });
        }
      }

      return { deletedAt: now };
    });

    return { deleted: true, id, deletedAt };
  }

  async findDeleted(page = 1, limit = 20) {
    const where: Prisma.KoiProductWhereInput = { isDeleted: true };

    const [data, total] = await Promise.all([
      this.prisma.koiProduct.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        // Same tiebreaker reasoning as findAll(): bulk deletes share deletedAt.
        orderBy: [{ deletedAt: "desc" }, { id: "asc" }],
        select: {
          id: true,
          name: true,
          slug: true,
          productType: true,
          sku: true,
          basePrice: true,
          status: true,
          isDeleted: true,
          deletedAt: true,
          createdAt: true,
          updatedAt: true,
          categoryId: true,
          category: { select: { id: true, code: true, name: true } },
          _count: { select: { variants: true, images: true } },
        },
      }),
      this.prisma.koiProduct.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async restore(id: string) {
    const product = await this.prisma.koiProduct.findFirst({
      where: { id, isDeleted: true },
    });
    if (!product) throw new NotFoundException("Deleted product not found");

    const updated = await this.prisma.koiProduct.update({
      where: { id },
      data: { isDeleted: false, deletedAt: null },
    });

    return { restored: true, id, updatedAt: updated.updatedAt };
  }

  async toggleStatus(id: string) {
    const product = await this.findById(id);
    const newStatus = product.status === "ACTIVE" ? "DRAFT" : "ACTIVE";
    return this.prisma.koiProduct.update({
      where: { id },
      data: { status: newStatus },
    });
  }

  /**
   * Bật/tắt hàng "đinh" — món được tick sẽ nằm đầu danh sách cửa hàng, trước
   * phần xếp tự động theo displayRank.
   *
   * Trả kèm soLuongDinh để admin cảnh báo mềm khi tick quá nhiều: tick 60 món
   * thì lớp xếp tự động mất tác dụng và trang 1 lại thành một mớ không thứ tự.
   * Cố ý KHÔNG chặn cứng — đây là quyết định kinh doanh của người bán.
   */
  async toggleFeatured(id: string) {
    const product = await this.findById(id);
    const updated = await this.prisma.koiProduct.update({
      where: { id },
      data: { isFeatured: !product.isFeatured },
      select: { id: true, isFeatured: true },
    });
    const soLuongDinh = await this.prisma.koiProduct.count({
      where: { isFeatured: true, isDeleted: false },
    });
    return { ...updated, soLuongDinh };
  }

  // -------------------------------------------------------------------------
  // Dọn mô tả hàng loạt
  // -------------------------------------------------------------------------

  /**
   * Dọn mô tả cũ cho nhiều sản phẩm một lượt.
   *
   * `dryRun: true` (mặc định) chỉ TÍNH và báo cáo, không ghi gì — người bán xem
   * trước sẽ mất chữ nào rồi mới quyết. Đã kiểm chứng trên toàn bộ 324 mô tả
   * thật (prisma/_verify-desc-clean.mjs): không mất câu mô tả nào, dọn hai lần
   * ra cùng kết quả, dung lượng giảm 51%.
   *
   * Hai chốt an toàn:
   *   · mô tả nào dọn xong ra rỗng thì GIỮ NGUYÊN bản cũ và báo lại — có 1 sản
   *     phẩm mô tả chỉ vỏn vẹn cái tiêu đề lặp tên, dọn đúng luật sẽ trắng
   *     trang, phải để người bán tự viết;
   *   · mô tả đã sạch (không còn rác) thì bỏ qua, không ghi vô ích.
   */
  async cleanDescriptions(opts: {
    dryRun?: boolean;
    ids?: string[];
    limit?: number;
  }) {
    const dryRun = opts.dryRun !== false;
    const rows = await this.prisma.koiProduct.findMany({
      where: {
        isDeleted: false,
        ...(opts.ids?.length ? { id: { in: opts.ids } } : {}),
      },
      select: { id: true, slug: true, name: true, description: true },
      orderBy: { slug: "asc" },
      ...(opts.limit ? { take: opts.limit } : {}),
    });

    const items: any[] = [];
    let cleaned = 0;
    let skippedClean = 0;
    let skippedEmpty = 0;
    let deadImages = 0;
    let bytesBefore = 0;
    let bytesAfter = 0;

    for (const r of rows) {
      const html = this.textOf(r.description);
      if (!html.trim()) continue;

      const audit = auditHtml(html);
      if (!audit.isLegacy) {
        skippedClean++;
        continue;
      }

      const name = this.textOf(r.name);
      const parsed = htmlToBlocks(html, name);
      const nextHtml = blocksToHtml(parsed.blocks);

      if (!nextHtml.trim()) {
        skippedEmpty++;
        items.push({
          id: r.id,
          slug: r.slug,
          ketQua: "BO_QUA_VI_RONG",
          lyDo:
            "Mô tả cũ chỉ có tiêu đề lặp tên sản phẩm — dọn sẽ trắng trang nên " +
            "giữ nguyên. Cần tự viết mô tả mới.",
        });
        continue;
      }

      cleaned++;
      deadImages += parsed.deadImages.length;
      bytesBefore += html.length;
      bytesAfter += nextHtml.length;

      items.push({
        id: r.id,
        slug: r.slug,
        ketQua: dryRun ? "SE_DON" : "DA_DON",
        soKhoi: parsed.blocks.length,
        anhChetBo: parsed.deadImages,
        chuBiBo: removedText(html, name).slice(0, 500),
        truoc: html.length,
        sau: nextHtml.length,
      });

      if (!dryRun) {
        await this.prisma.koiProduct.update({
          where: { id: r.id },
          data: {
            description: { vi: nextHtml } as any,
            descriptionBlocks: { blocks: parsed.blocks } as any,
          },
        });
      }
    }

    return {
      dryRun,
      tongSanPham: rows.length,
      daDon: cleaned,
      boQuaVdSach: skippedClean,
      boQuaVdRong: skippedEmpty,
      anhChetDaBo: deadImages,
      dungLuong: {
        truoc: bytesBefore,
        sau: bytesAfter,
        giamPhanTram: bytesBefore
          ? Math.round(((bytesBefore - bytesAfter) / bytesBefore) * 100)
          : 0,
      },
      chiTiet: items,
    };
  }

  async createVariant(productId: string, dto: VariantDto) {
    await this.findById(productId);
    const existing = await this.prisma.koiProductVariant.findUnique({
      where: { sku: dto.sku },
    });
    if (existing)
      throw new ConflictException(`SKU biến thể "${dto.sku}" đã tồn tại`);

    const variant = await this.prisma.koiProductVariant.create({
      data: {
        productId,
        sku: dto.sku,
        title: dto.title || null,
        price: dto.price,
        hardwareOption: dto.hardwareOption || "none",
        stockStatus: dto.stockStatus || "IN_STOCK",
        isDefault: dto.isDefault ?? false,
        options: (dto.options || {}) as any,
      },
    });

    await this.recomputePriceRange(productId);
    return variant;
  }

  async updateVariant(variantId: string, dto: Partial<VariantDto>) {
    const variant = await this.prisma.koiProductVariant.findUnique({
      where: { id: variantId },
    });
    if (!variant) throw new NotFoundException("Variant not found");

    if (dto.sku && dto.sku !== variant.sku) {
      const dup = await this.prisma.koiProductVariant.findUnique({
        where: { sku: dto.sku },
      });
      if (dup)
        throw new ConflictException(`SKU biến thể "${dto.sku}" đã tồn tại`);
    }

    const data: any = {};
    if (dto.sku !== undefined) data.sku = dto.sku;
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.price !== undefined) data.price = dto.price;
    if (dto.hardwareOption !== undefined)
      data.hardwareOption = dto.hardwareOption;
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

  /**
   * Ghi một nhóm biến thể trong CÙNG transaction.
   *
   * Đây là đường admin dùng để nhập giá lần đầu. Không thay bằng Promise.all của
   * updateVariant(): mỗi updateVariant tự recomputePriceRange(), nên 28 request
   * có 28 trạng thái trung gian có thể lộ ra storefront. Một transaction cho DB
   * chỉ thấy hai trạng thái: trước khi nhập, hoặc sau khi cả bảng đã đúng.
   */
  async updateVariants(productId: string, patches: VariantPatchDto[]) {
    if (!patches.length) return { variants: [], changed: 0 };

    const ids = patches.map((v) => v.id);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException("Một biến thể xuất hiện hai lần trong lượt lưu");
    }

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.koiProductVariant.findMany({
        where: { productId, id: { in: ids } },
      });
      if (existing.length !== patches.length) {
        throw new BadRequestException(
          "Có biến thể không thuộc sản phẩm này hoặc không còn tồn tại",
        );
      }

      const byId = new Map(existing.map((v: any) => [v.id, v]));
      const updated: any[] = [];
      for (const patch of patches) {
        const old = byId.get(patch.id)!;
        const data: any = {};
        if (patch.title !== undefined) data.title = patch.title;
        if (patch.price !== undefined) data.price = patch.price;
        if (patch.stockStatus !== undefined) data.stockStatus = patch.stockStatus;

        // Không gọi update rỗng: đỡ chạm updatedAt và đỡ làm người bán tưởng có gì đổi.
        if (Object.keys(data).length) {
          updated.push(await tx.koiProductVariant.update({ where: { id: old.id }, data }));
        } else {
          updated.push(old);
        }
      }

      const variants = await tx.koiProductVariant.findMany({ where: { productId } });
      const product = await tx.koiProduct.findUnique({ where: { id: productId } });
      const computed = this.computePriceRange(variants, product?.basePrice);
      await tx.koiProduct.update({
        where: { id: productId },
        data: {
          priceMin: computed.priceMin,
          priceMax: computed.priceMax,
          hasVariants: computed.hasVariants,
        },
      });

      return { variants: updated, changed: patches.length };
    });
  }

  async removeVariant(variantId: string) {
    const variant = await this.prisma.koiProductVariant.findUnique({
      where: { id: variantId },
    });
    if (!variant) throw new NotFoundException("Variant not found");

    await this.prisma.koiProductVariant.delete({ where: { id: variantId } });
    await this.recomputePriceRange(variant.productId);
    return { deleted: true };
  }

  private async recomputePriceRange(productId: string) {
    const variants = await this.prisma.koiProductVariant.findMany({
      where: { productId },
    });
    const product = await this.prisma.koiProduct.findUnique({
      where: { id: productId },
    });
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
