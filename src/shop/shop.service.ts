import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Prisma } from "@prisma/client";
import { COLOR_FAMILIES } from "../common/enums";
import { dieuKienTimSanPham, gopVaoAnd } from "../common/tim-san-pham";

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
      is_featured: !!p.isFeatured,
      meta_title: p.metaTitle ?? null,
      meta_description: p.metaDescription ?? null,
      color_family: p.colorFamily ?? null,
      color_hex: p.colorHex ?? null,
      // Danh sách đầy đủ; phần tử đầu trùng color_family/color_hex ở trên.
      // Fallback về màu đơn cho sản phẩm chưa backfill sang bảng nối.
      colors: (p.colorLinks?.length
        ? p.colorLinks
        : p.colorFamily
          ? [{ colorFamily: p.colorFamily, colorHex: p.colorHex ?? null }]
          : []
      ).map((c: any) => ({
        color_family: c.colorFamily,
        color_hex: c.colorHex ?? null,
      })),
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
    isFeatured: true,
    // Hàng phối nhiều tông: thẻ sản phẩm hiện đủ các chấm màu.
    colorLinks: {
      orderBy: { sortOrder: "asc" as const },
      select: { colorFamily: true, colorHex: true },
    },
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
    // categoryId), rồi lấy sản phẩm đầu tiên làm bìa. Trước đây bắn N truy vấn
    // song song → vượt pool_size của session pooler (local) → lỗi "max clients
    // reached". Gộp về 1 query để không còn bão kết nối.
    // Bìa lấy theo displayRank (món được đầu tư nhiều ảnh nhất) chứ không theo
    // giá cao nhất — ảnh đẹp mới là thứ cần cho bìa, giá cao thì không.
    const catIds = cats.map((c) => c.id);
    const products = await this.prisma.koiProduct.findMany({
      where: { ...this.published, categoryId: { in: catIds } },
      orderBy: [{ isFeatured: "desc" }, { displayRank: "asc" }, { id: "asc" }],
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
   * Dựng điều kiện lọc sản phẩm — DÙNG CHUNG cho danh sách và cho số đếm bộ lọc.
   *
   * Trước đây listProducts tự dựng where riêng, còn shopFilters đếm trên tập
   * "toàn shop", nên hai bên trả về hai con số khác nhau cho cùng một điều kiện:
   * trong "Túi Da Cho Nữ" sidebar ghi "Epsom (89)" mà bấm vào chỉ có 6 món, "Cá
   * sấu (48)" chỉ có 2. Số trong ngoặc phải là số hàng khách bấm vào sẽ thấy —
   * nên cả hai đường phải đi qua đúng hàm này.
   *
   * `boQua` cho phép bỏ một chiều khỏi điều kiện. Đó là cách đếm facet đúng: số
   * bên cạnh mỗi loại da phải tính như thể khách CHƯA chọn loại da nào (nếu
   * không, chọn Epsom rồi thì mọi loại da khác đều về 0 và khách không đổi được
   * lựa chọn — cụt đường).
   *
   * `catId` là id danh mục đã tra sẵn. shopFilters gọi hàm này 4 lần; tra lại
   * mỗi lần là 3 truy vấn y hệt nhau bắn song song, đúng kiểu đã từng làm sập
   * pool kết nối (xem ghi chú ở categoriesWithCover).
   */
  private dieuKienLoc(
    opts: {
      categorySlug?: string;
      search?: string;
      material?: string;
      imageType?: string;
      color?: string;
      unpicked?: boolean;
    },
    catId: string | null,
    boQua?: "category" | "material" | "imageType" | "color",
  ): Prisma.KoiProductWhereInput {
    const where: Prisma.KoiProductWhereInput = { ...this.published };

    if (catId && boQua !== "category") {
      where.categoryLinks = { some: { categoryId: catId } };
    } else {
      // Danh sách chung: loại hàng thuộc danh mục ẩn. Còn khi khách vào thẳng
      // trang một danh mục (kể cả danh mục ẩn) thì vẫn hiện đủ — giữ URL sống.
      //
      // Khi đang bỏ qua chiều "category" để đếm facet, vẫn phải giữ notHidden:
      // 9 món của danh mục ẩn không được cộng vào số đếm nào cả.
      Object.assign(where, this.notHidden);
    }

    // Lọc theo loại da: SP gắn loại da này ở BẤT KỲ vị trí nào (thân hoặc lót).
    if (opts.material && boQua !== "material") {
      where.materialCategoryLinks = {
        some: { materialCategory: { code: opts.material } },
      };
    }

    // Lọc theo loại ảnh (imageType trên ảnh SP): SP có ÍT NHẤT 1 ảnh loại đó.
    if (opts.imageType && boQua !== "imageType") {
      where.images = { some: { imageType: opts.imageType } };
    }

    // Lọc theo màu: nhận nhiều mã nhóm màu, phân tách bởi dấu phẩy (union OR).
    // Đọc bảng nối nên hàng phối 2 tông hiện ở CẢ HAI màu.
    if (opts.color && boQua !== "color") {
      const codes = opts.color
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (codes.length) {
        where.colorLinks = { some: { colorFamily: { in: codes } } };
      }
    }

    // Admin: chỉ hàng CHƯA pick màu — để quét cái nào cần gán.
    // Đặt sau nhánh color: hai cái loại trừ nhau, unpicked thắng (đường admin).
    if (opts.unpicked) {
      where.colorLinks = { none: {} };
    }

    // Tìm kiếm: mỗi token một điều kiện, AND lại (xem common/tim-san-pham.ts).
    if (opts.search) {
      const nhomToken = dieuKienTimSanPham(opts.search);
      // Từ khoá không còn token dùng được ("   ", "{}", "%%%") thì coi như không
      // tìm gì, KHÔNG phải lọc rỗng — trả cả shop còn hơn trả trang trắng.
      if (nhomToken) gopVaoAnd(where, nhomToken);
    }

    return where;
  }

  /** Tra id danh mục theo slug, ném 404 sạch nếu không có. */
  private async idDanhMuc(slug?: string): Promise<string | null> {
    if (!slug) return null;
    const cat = await this.prisma.koiCategory.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!cat) throw new NotFoundException("Không tìm thấy danh mục");
    return cat.id;
  }

  /**
   * Dữ liệu cho sidebar lọc của trang cửa hàng: danh mục, loại da, màu, loại ảnh
   * — kèm số sản phẩm cho mỗi mục.
   *
   * Số đếm THEO NGỮ CẢNH: truyền vào bộ lọc khách đang bật thì mỗi con số là số
   * hàng còn lại nếu khách chọn thêm mục đó. Quy tắc "bỏ chiều của chính mình"
   * (xem dieuKienLoc): số cạnh mỗi loại da tính như thể chưa chọn loại da nào,
   * nên khách luôn đổi được lựa chọn thay vì thấy 0 khắp nơi.
   *
   * Không truyền gì thì hành vi y như trước: đếm trên toàn bộ hàng mặt tiền.
   */
  async shopFilters(
    opts: {
      categorySlug?: string;
      search?: string;
      material?: string;
      imageType?: string;
      color?: string;
    } = {},
  ) {
    const catId = await this.idDanhMuc(opts.categorySlug);

    // Mỗi chiều một tập nền riêng: nền của chiều X = mọi điều kiện TRỪ X.
    const wCat = this.dieuKienLoc(opts, catId, "category");
    const wMat = this.dieuKienLoc(opts, catId, "material");
    const wImg = this.dieuKienLoc(opts, catId, "imageType");
    const wColor = this.dieuKienLoc(opts, catId, "color");

    const [cats, materials, imageCats] = await Promise.all([
      this.prisma.koiCategory.findMany({
        where: { isActive: true, slug: { notIn: this.hiddenSlugs } },
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      }),
      this.prisma.koiMaterialCategory.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      this.prisma.koiImageCategory.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
    ]);

    // Loại ảnh: đếm SỐ SẢN PHẨM (không phải số ảnh) có ít nhất 1 ảnh loại đó.
    // Chạy song song từng loại — chỉ 4 loại nên rẻ.
    //
    // KHÔNG dùng làm bộ lọc cho khách. Đo trên hàng thật: STUDIO phủ 315/315 sản
    // phẩm, tức bấm vào nó không lọc bỏ được gì; STAMPING 13, LIFESTYLE 9,
    // CRAFTING 0. Sidebar /cua-hang/ vì thế không hiện nhóm này.
    // Vẫn TRẢ VỀ vì koi-storefront dùng danh sách này để dựng Lookbook
    // (getShotsByImageType gom ảnh theo loại) — bỏ đi là làm trắng trang đó.
    const imageTypes = await Promise.all(
      imageCats.map(async (ic) => ({
        code: ic.code,
        name: ic.name,
        count: await this.prisma.koiProduct.count({
          where: { ...wImg, images: { some: { imageType: ic.code } } },
        }),
      })),
    );

    // Danh mục: đếm qua bảng nối với CÙNG điều kiện của sản phẩm.
    //
    // Trước đây dùng _count.categoryLinks thô — nó đếm mọi liên kết, kể cả hàng
    // DRAFT và hàng đã xoá mềm (isDeleted). Kết quả: "Phụ Kiện Bằng Da (34)"
    // nhưng bấm vào chỉ có 32 sản phẩm. Số trong ngoặc phải khớp đúng số hàng
    // khách bấm vào sẽ thấy.
    const catGroups = await this.prisma.koiProductCategory.groupBy({
      by: ["categoryId"],
      where: { product: wCat },
      _count: { _all: true },
    });
    const catCount = new Map(
      catGroups.map((g) => [g.categoryId, g._count._all]),
    );

    // Loại da: đếm qua bảng nối nên SP dùng 2 loại da (thân + lót) được tính
    // cho cả hai, đúng như khi bấm lọc.
    const materialGroups = await this.prisma.koiProductMaterialCategory.groupBy({
      by: ["materialCategoryId"],
      where: { product: wMat },
      _count: { _all: true },
    });
    const materialCount = new Map(
      materialGroups.map((g) => [g.materialCategoryId, g._count._all]),
    );

    // Màu sắc: đếm qua bảng nối nên hàng phối 2 tông được tính cho CẢ HAI màu.
    const colorGroups = await this.prisma.koiProductColor.groupBy({
      by: ["colorFamily"],
      where: { product: wColor },
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
        .map((c) => ({
          name: this.text(c.name),
          slug: c.slug,
          count: catCount.get(c.id) ?? 0,
        }))
        .filter((c) => c.count > 0),
      materials: materials
        .map((m) => ({
          name: this.text(m.name),
          code: m.code,
          count: materialCount.get(m.id) ?? 0,
        }))
        .filter((m) => m.count > 0),
      imageTypes: imageTypes.filter((t) => t.count > 0),
      colors,
    };
  }

  async home() {
    const [featuredRaw, categories] = await Promise.all([
      this.prisma.koiProduct.findMany({
        where: { ...this.published, ...this.notHidden },
        // Cùng thứ tự với danh sách cửa hàng: hàng đinh trước, rồi displayRank.
        // Trước đây lấy 8 món đắt nhất nên khối "nổi bật" ngay trang chủ toàn
        // hàng 19–79 triệu — đúng thứ khiến khách nghĩ shop chỉ bán đồ đắt.
        orderBy: [
          { isFeatured: "desc" },
          { displayRank: "asc" },
          { id: "asc" },
        ],
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

  /**
   * Thứ tự hiện sản phẩm cho khách.
   *
   * "popular" là mặc định: hàng đinh (isFeatured, người bán tự tick) lên đầu,
   * phần còn lại theo displayRank — điểm tính sẵn bởi
   * scripts/compute-display-rank.js, ưu tiên món được đầu tư nhiều rồi cài răng
   * lược 3 dải giá. Trước đây mặc định là basePrice giảm dần nên trang 1 toàn
   * hàng 19–79 triệu (trung bình 30,7tr) trong khi trung vị cả shop chỉ 4tr —
   * khách tưởng shop chỉ bán đồ đắt.
   *
   * Mọi nhánh đều chốt bằng id để phân trang không nhảy khi có sản phẩm trùng
   * giá / trùng ngày.
   */
  private thuTuSapXep(
    sort?: string,
  ): Prisma.KoiProductOrderByWithRelationInput[] {
    switch (sort) {
      case "price-asc":
        return [{ basePrice: "asc" }, { id: "asc" }];
      case "price-desc":
        return [{ basePrice: "desc" }, { id: "asc" }];
      case "newest":
        return [{ createdAt: "desc" }, { id: "asc" }];
      default:
        return [{ isFeatured: "desc" }, { displayRank: "asc" }, { id: "asc" }];
    }
  }

  async listProducts(opts: {
    page?: number;
    limit?: number;
    categorySlug?: string;
    search?: string;
    material?: string;
    imageType?: string;
    color?: string;
    unpicked?: boolean;
    sort?: string;
  }) {
    const page = Math.max(1, opts.page || 1);
    const limit = Math.min(48, Math.max(1, opts.limit || 24));

    // Cùng một hàm dựng điều kiện với shopFilters — số trong ngoặc ở sidebar và
    // số hàng thực trả về đây không thể lệch nhau nữa.
    const where = this.dieuKienLoc(opts, await this.idDanhMuc(opts.categorySlug));

    const [rows, total] = await Promise.all([
      this.prisma.koiProduct.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: this.thuTuSapXep(opts.sort),
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
        // Cùng thứ tự với danh sách: gợi ý món shop đầu tư nhất, không phải
        // món đắt nhất. Khách đang xem ví 2tr mà gợi ý toàn hàng 40tr thì hỏng.
        orderBy: [
          { isFeatured: "desc" },
          { displayRank: "asc" },
          { id: "asc" },
        ],
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
