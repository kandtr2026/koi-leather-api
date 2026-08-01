import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";
import { COLOR_FAMILIES } from "../common/enums";

// Danh sách nhóm màu ĐẦY ĐỦ cho picker admin (khác facet /shop/filters vốn chỉ
// trả nhóm đang có sản phẩm).
export type ColorFamily = { code: string; name: string; hex: string };

/**
 * Storefront (KoiFront) read layer.
 *
 * Trả dữ liệu ĐÃ ĐỊNH HÌNH sẵn theo đúng shape mà frontend Next mong đợi
 * (product_images.storage_path, price/price_min/price_max, is_available…), để
 * phần giao diện đã port gần như không phải sửa. Chỉ đọc hàng ĐÃ XUẤT BẢN
 * (status = ACTIVE, chưa xoá) và KHÔNG lộ giá vốn / nguyên liệu / lệnh sản xuất.
 */
@Injectable()
export class ShopService {
  constructor(private prisma: PrismaService) {}

  // ----- helpers -----

  /** name/description là JSON field ({vi,en}); middleware Prisma đã parse sẵn. */
  private text(v: any): string {
    if (v == null) return "";
    if (typeof v === "string") {
      const s = v.trim();
      if (s.startsWith("{")) {
        try {
          const o = JSON.parse(s);
          return o.vi || o.en || "";
        } catch {
          return s;
        }
      }
      return s;
    }
    if (typeof v === "object") return v.vi || v.en || "";
    return String(v);
  }

  private mapImages(images: any[] = []) {
    return images
      .slice()
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
      .map((img) => ({
        // id để admin thay ảnh tại chỗ (PUT /products/:productId/images/:id/file).
        id: img.id ?? null,
        // Giữ tên field 'storage_path' cho frontend; nhưng ở đây là URL đầy đủ
        // (Cloudinary). imageUrl() phía frontend đã cho URL http đi thẳng.
        storage_path: img.url || img.thumbnailUrl,
        alt: img.altText ?? null,
        is_primary: !!img.isPrimary,
        sort_order: img.displayOrder ?? 0,
        // Loại ảnh (STUDIO/LIFESTYLE/CRAFTING/TEXTURE) để frontend dựng Lookbook.
        image_type: img.imageType ?? null,
      }));
  }

  /** Sản phẩm rút gọn cho card (danh sách, trang chủ, liên quan). */
  private card(p: any) {
    return {
      id: p.id,
      name: this.text(p.name),
      slug: p.slug,
      sku: p.sku ?? null,
      short_description: null,
      description: null,
      price: p.basePrice ?? null,
      regular_price: null,
      price_min: p.priceMin ?? null,
      price_max: p.priceMax ?? null,
      on_sale: false,
      has_variants: !!p.hasVariants,
      is_available: p.status === "ACTIVE",
      is_featured: false,
      meta_title: p.metaTitle ?? null,
      meta_description: p.metaDescription ?? null,
      color_family: p.colorFamily ?? null,
      color_hex: p.colorHex ?? null,
      product_images: this.mapImages(p.images),
    };
  }

  private mapCategory(c: any, cover?: string | null) {
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description ?? null,
      parent_id: null,
      product_count: c._count?.categoryLinks ?? c.product_count ?? 0,
      is_hidden: c.isActive === false,
      cover_image: cover ?? null,
    };
  }

  private readonly cardSelect = {
    id: true,
    name: true,
    slug: true,
    sku: true,
    basePrice: true,
    priceMin: true,
    priceMax: true,
    hasVariants: true,
    status: true,
    metaTitle: true,
    metaDescription: true,
    colorFamily: true,
    colorHex: true,
    images: {
      orderBy: { displayOrder: "asc" as const },
      select: {
        id: true,
        url: true,
        thumbnailUrl: true,
        altText: true,
        isPrimary: true,
        displayOrder: true,
        imageType: true,
      },
    },
  };

  private readonly published: Prisma.KoiProductWhereInput = {
    isDeleted: false,
    status: "ACTIVE",
  };

  // Danh mục ẩn khỏi mặt tiền (menu, trang chủ, danh sách chung) NHƯNG địa chỉ
  // /san-pham/{slug} và trang sản phẩm vẫn sống — Google đang index, xoá là mất
  // uy tín SEO. Giống EXCLUDED_CATEGORY_SLUGS bên frontend cũ.
  private readonly hiddenSlugs = ["ban-rap-thiet-ke"];

  /** Loại sản phẩm thuộc danh mục ẩn khỏi các danh sách chung. */
  private get notHidden(): Prisma.KoiProductWhereInput {
    return {
      NOT: {
        categoryLinks: {
          some: { category: { slug: { in: this.hiddenSlugs } } },
        },
      },
    };
  }

  // ----- categories -----

  private async categoriesWithCover(limit?: number) {
    const cats = await this.prisma.koiCategory.findMany({
      where: { isActive: true, slug: { notIn: this.hiddenSlugs } },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      include: { _count: { select: { categoryLinks: true } } },
      ...(limit ? { take: limit } : {}),
    });
    if (!cats.length) return [];

    // Ảnh đại diện: MỘT truy vấn duy nhất cho mọi danh mục (theo danh mục chính
    // categoryId), rồi lấy sản phẩm đầu tiên (giá cao nhất) làm bìa. Trước đây
    // bắn N truy vấn song song → vượt pool_size của session pooler (local) →
    // lỗi "max clients reached". Gộp về 1 query để không còn bão kết nối.
    const catIds = cats.map((c) => c.id);
    const products = await this.prisma.koiProduct.findMany({
      where: { ...this.published, categoryId: { in: catIds } },
      orderBy: { basePrice: "desc" },
      select: {
        categoryId: true,
        images: {
          orderBy: { displayOrder: "asc" },
          take: 1,
          select: { url: true, thumbnailUrl: true },
        },
      },
    });

    const coverByCat = new Map<string, string>();
    for (const p of products) {
      const img = p.images?.[0];
      if (p.categoryId && img && !coverByCat.has(p.categoryId)) {
        coverByCat.set(p.categoryId, img.thumbnailUrl || img.url);
      }
    }

    return cats.map((c) => this.mapCategory(c, coverByCat.get(c.id) ?? null));
  }

  async categories() {
    return this.categoriesWithCover();
  }

  /** Toàn bộ nhóm màu chuẩn — cho picker admin (gán màu từng sản phẩm). */
  colorFamilies(): ColorFamily[] {
    return COLOR_FAMILIES.map((c) => ({ code: c.code, name: c.name, hex: c.hex }));
  }

  /**
   * Dữ liệu cho sidebar lọc của trang cửa hàng: danh mục sản phẩm, loại da,
   * loại ảnh — kèm số sản phẩm (đã publish) cho mỗi mục để hiển thị "(n)".
   * Chỉ đếm trong tập hàng hiện ở mặt tiền (published, không thuộc danh mục ẩn).
   */
  async shopFilters() {
    const baseWhere: Prisma.KoiProductWhereInput = {
      ...this.published,
      ...this.notHidden,
    };

    const [cats, materials, imageCats] = await Promise.all([
      this.prisma.koiCategory.findMany({
        where: { isActive: true, slug: { notIn: this.hiddenSlugs } },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
        include: { _count: { select: { categoryLinks: true } } },
      }),
      this.prisma.koiMaterialCategory.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: { _count: { select: { products: true } } },
      }),
      this.prisma.koiImageCategory.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
    ]);

    // Loại ảnh: đếm SỐ SẢN PHẨM (không phải số ảnh) có ít nhất 1 ảnh loại đó,
    // trong tập mặt tiền. Chạy song song từng loại — chỉ 4 loại nên rẻ.
    const imageTypes = await Promise.all(
      imageCats.map(async (ic) => ({
        code: ic.code,
        name: ic.name,
        count: await this.prisma.koiProduct.count({
          where: { ...baseWhere, images: { some: { imageType: ic.code } } },
        }),
      })),
    );

    // Màu sắc: đếm số SP theo colorFamily trong MỘT truy vấn groupBy, rồi map
    // sang danh sách nhóm chuẩn (giữ tên + hex đại diện, đúng thứ tự đã định).
    const colorGroups = await this.prisma.koiProduct.groupBy({
      by: ["colorFamily"],
      where: { ...baseWhere, colorFamily: { not: null } },
      _count: { _all: true },
    });
    const colorCount = new Map(
      colorGroups.map((g) => [g.colorFamily, g._count._all]),
    );
    const colors = COLOR_FAMILIES.map((f) => ({
      code: f.code,
      name: f.name,
      hex: f.hex,
      count: colorCount.get(f.code) ?? 0,
    })).filter((c) => c.count > 0);

    return {
      categories: cats
        .filter((c) => (c._count?.categoryLinks ?? 0) > 0)
        .map((c) => ({
          name: this.text(c.name),
          slug: c.slug,
          count: c._count?.categoryLinks ?? 0,
        })),
      materials: materials
        .filter((m) => (m._count?.products ?? 0) > 0)
        .map((m) => ({
          name: this.text(m.name),
          code: m.code,
          count: m._count?.products ?? 0,
        })),
      imageTypes: imageTypes.filter((t) => t.count > 0),
      colors,
    };
  }

  async home() {
    const [featuredRaw, categories] = await Promise.all([
      this.prisma.koiProduct.findMany({
        where: { ...this.published, ...this.notHidden },
        orderBy: { basePrice: "desc" },
        take: 8,
        select: this.cardSelect,
      }),
      this.categoriesWithCover(6),
    ]);
    return {
      featured: featuredRaw.map((p) => this.card(p)),
      categories,
    };
  }

  // ----- product list -----

  async listProducts(opts: {
    page?: number;
    limit?: number;
    categorySlug?: string;
    search?: string;
    material?: string;
    imageType?: string;
    color?: string;
    unpicked?: boolean;
  }) {
    const page = Math.max(1, opts.page || 1);
    const limit = Math.min(48, Math.max(1, opts.limit || 24));

    const where: Prisma.KoiProductWhereInput = { ...this.published };
    if (opts.categorySlug) {
      const cat = await this.prisma.koiCategory.findUnique({
        where: { slug: opts.categorySlug },
      });
      if (!cat) throw new NotFoundException("Không tìm thấy danh mục");
      where.categoryLinks = { some: { categoryId: cat.id } };
    } else {
      // Danh sách chung: loại hàng thuộc danh mục ẩn. Còn khi khách vào thẳng
      // trang một danh mục (kể cả danh mục ẩn) thì vẫn hiện đủ — giữ URL sống.
      Object.assign(where, this.notHidden);
    }
    // Lọc theo loại da (KoiMaterialCategory.code) — mỗi SP gắn tối đa 1 loại.
    if (opts.material) {
      where.materialCategory = { code: opts.material };
    }
    // Lọc theo loại ảnh (imageType trên ảnh SP): SP có ÍT NHẤT 1 ảnh loại đó.
    if (opts.imageType) {
      where.images = { some: { imageType: opts.imageType } };
    }
    // Lọc theo màu: nhận nhiều mã nhóm màu, phân tách bởi dấu phẩy (union OR).
    if (opts.color) {
      const codes = opts.color
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (codes.length) where.colorFamily = { in: codes };
    }
    // Admin: chỉ hàng CHƯA pick màu (colorFamily rỗng) — để quét cái nào cần gán.
    if (opts.unpicked) {
      where.colorFamily = null;
    }
    if (opts.search) {
      where.OR = [
        { name: { contains: opts.search, mode: "insensitive" } },
        { slug: { contains: opts.search, mode: "insensitive" } },
        { sku: { contains: opts.search, mode: "insensitive" } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.prisma.koiProduct.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ basePrice: "desc" }, { id: "asc" }],
        select: this.cardSelect,
      }),
      this.prisma.koiProduct.count({ where }),
    ]);

    return {
      data: rows.map((p) => this.card(p)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async categoryBySlug(slug: string, page = 1, limit = 24) {
    const cat = await this.prisma.koiCategory.findUnique({
      where: { slug },
      include: { _count: { select: { categoryLinks: true } } },
    });
    if (!cat || cat.isActive === false)
      throw new NotFoundException("Không tìm thấy danh mục");

    const list = await this.listProducts({ page, limit, categorySlug: slug });
    return { category: this.mapCategory(cat), ...list };
  }

  // ----- product detail -----

  async productBySlug(slug: string) {
    const p = await this.prisma.koiProduct.findFirst({
      where: { slug, ...this.published },
      include: {
        images: { orderBy: { displayOrder: "asc" } },
        variants: { orderBy: { createdAt: "asc" } },
        categoryLinks: { include: { category: true } },
      },
    });
    if (!p) throw new NotFoundException("Không tìm thấy sản phẩm");

    const categories = (p.categoryLinks || [])
      .map((l: any) => l.category)
      .filter((c: any) => c && c.isActive !== false)
      .map((c: any) => this.mapCategory(c));

    const variants = (p.variants || []).map((v: any) => {
      let attributes: Record<string, string> = {};
      try {
        attributes =
          typeof v.options === "string" ? JSON.parse(v.options) : v.options || {};
      } catch {
        attributes = {};
      }
      return { id: v.id, name: v.title ?? null, attributes };
    });

    // Sản phẩm liên quan: cùng danh mục chính, khác chính nó.
    let related: any[] = [];
    if (p.categoryId) {
      const rel = await this.prisma.koiProduct.findMany({
        where: {
          ...this.published,
          id: { not: p.id },
          categoryLinks: { some: { categoryId: p.categoryId } },
        },
        take: 4,
        orderBy: { basePrice: "desc" },
        select: this.cardSelect,
      });
      related = rel.map((r) => this.card(r));
    }

    return {
      ...this.card(p),
      description: this.text(p.description),
      categories,
      variants,
      related,
    };
  }
}
