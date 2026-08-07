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

  /**
   * Biến thể cho mặt tiền — CÓ GIÁ, mã hàng và tình trạng còn hàng.
   *
   * VÌ SAO PHẢI SỬA. Bản cũ chỉ trả `{ id, name, attributes }`. Ba cột quan
   * trọng nhất của bảng koi_product_variants — `price`, `sku`, `stockStatus` —
   * nằm lại trong cơ sở dữ liệu. Chừng nào mặt tiền còn là brochure ("Nhắn Zalo
   * hỏi mẫu này") thì không sao: người bán tự báo giá trong cuộc gọi. Nhưng giỏ
   * hàng thì phải tự tính tiền, và không có giá biến thể thì không tính được.
   *
   * ══ MỘT LỖ TIỀN CÓ THẬT, ĐO ĐƯỢC — ĐỌC TRƯỚC KHI SỬA HÀM NÀY ══
   *
   * Đo trên dữ liệu thật ngày 2026-08-07: 106/106 biến thể có `price = null`.
   * Không một biến thể nào trong toàn bộ cơ sở dữ liệu có giá riêng.
   *
   * Trong khi đó 12 sản phẩm đang bán khai DẢI GIÁ trên chính sản phẩm
   * (priceMin ≠ priceMax), tức trang đang in cho khách "3.800.000 ₫ –
   * 6.800.000 ₫". Dải đó là di sản nhập từ WooCommerce; giá từng biến thể làm
   * nên dải KHÔNG theo sang.
   *
   * Nên nếu hàm này lấy `v.price ?? p.basePrice` cho gọn, giỏ hàng sẽ tính
   * MỌI biến thể theo giá thấp nhất của dải:
   *   · hal-bag-da-bo-swift-white  : chọn "Da Swift" (6,8tr) → tính 3,8tr, hụt 3.000.000đ
   *   · kep-tien-inh-nametag…      : dải 1,2tr–2,8tr        → hụt tới 1.600.000đ
   *   · 9 bản rập PDF              : dải 100k–350k          → hụt 250.000đ mỗi đơn
   * Khách không làm gì sai, code tự bán rẻ, và không ai biết cho tới lúc đối
   * chiếu sổ. Đúng loại lỗi phải chặn ở tầng dữ liệu chứ không nhắc trong tài
   * liệu.
   *
   * ══ QUY TẮC GIÁ, KHAI MỘT LẦN Ở ĐÂY ══
   *
   *   1. Biến thể có `price` riêng     → dùng số đó. (Hôm nay: 0 biến thể.)
   *   2. Sản phẩm KHÔNG có dải giá     → dùng `basePrice`. An toàn: mọi biến thể
   *      cùng một giá, đó chính là điều "không có dải" nghĩa là.
   *   3. Sản phẩm CÓ dải giá mà biến thể không có giá → trả `null`.
   *
   * Đo sau khi áp quy tắc: 47 biến thể (10 sản phẩm) đủ điều kiện vào giỏ, 59
   * biến thể (13 sản phẩm) bị chặn. 13 chứ không phải 12 vì có thêm
   * `da-ca-sau-phap-alligator`: `basePrice = 0` với 28 biến thể. Đó là hàng
   * "Liên hệ" — backend trả SỐ 0 chứ không phải null cho 8 sản phẩm chưa nhập
   * giá, đúng cái bẫy `giaThuc()` ở storefront (lib/format.ts) đã ghi lại. Điều
   * kiện `price > 0` khi chuẩn hoá chặn nó, nên "0đ" không bao giờ thành "miễn
   * phí" ở giỏ hàng — và `price` trả ra là `null`, không phải `0`.
   *
   * `null` KHÔNG phải "miễn phí" mà là "chưa định giá được món này" — giỏ hàng
   * phải từ chối thêm vào và đẩy khách sang gọi hotline. Thà mất một đơn tự phục
   * vụ còn hơn bán rẻ 3 triệu. Cờ `can_add_to_cart` nói thẳng điều đó ra để mặt
   * tiền không phải tự suy luận từ `price === null`.
   *
   * Cách bịt hẳn nhánh 3: nhập giá cho từng biến thể của 12 sản phẩm đó trong
   * admin. Sau đó nhánh 1 nhận hết và `can_add_to_cart` tự thành true, không cần
   * sửa dòng nào ở đây.
   *
   * QUY TẮC NÀY CHỈ ĐƯỢC KHAI Ở ĐÂY. Khi dựng bảng `orders`, tầng tạo đơn phải
   * gọi lại chính hàm này để tính lại tiền phía máy chủ — không bao giờ tin số
   * tiền trình duyệt gửi lên. Hai chỗ tự tính giá là hai chỗ sẽ lệch nhau.
   */
  private mapVariants(p: any) {
    // Dải giá khai trên sản phẩm: có nghĩa là các biến thể KHÔNG cùng giá.
    const coDaiGia =
      p.priceMin != null && p.priceMax != null && p.priceMax > p.priceMin;

    return (p.variants || []).map((v: any) => {
      let attributes: Record<string, string> = {};
      try {
        attributes =
          typeof v.options === "string" ? JSON.parse(v.options) : v.options || {};
      } catch {
        attributes = {};
      }

      // Xem "QUY TẮC GIÁ" ở trên. Thứ tự ba nhánh là phần quan trọng nhất của
      // hàm này — đảo nhánh 2 lên trước nhánh 3 là mở lại lỗ bán rẻ.
      const thoGia = v.price ?? (coDaiGia ? null : (p.basePrice ?? null));

      // MỘT cách khai "chưa có giá", không phải hai.
      //
      // `basePrice` là 0 chứ không phải null ở 8 sản phẩm chưa nhập giá (hàng
      // "Liên hệ"), nên nhánh 2 trả ra số 0. Nếu để nguyên thì "chưa định giá"
      // có hai hình: `null` và `0` — và mọi nơi đọc field này phải nhớ kiểm cả
      // hai. Chỗ nào quên là in ra "0 ₫" cho khách, đúng lỗi đã xảy ra một lần ở
      // JSON-LD storefront (xem `giaThuc` trong lib/format.ts).
      //
      // Chuẩn hoá tại đây: `price` chỉ là số khi đó là số tiền dùng được.
      const price = thoGia != null && thoGia > 0 ? thoGia : null;

      return {
        id: v.id,
        name: v.title ?? null,
        attributes,
        // sku là cột NOT NULL @unique, nhưng vẫn để đường lui: mặt tiền không
        // được sập vì một hàng dữ liệu lệch.
        sku: v.sku ?? null,
        price,
        stock_status: v.stockStatus ?? "IN_STOCK",
        // Biến thể chọn sẵn khi khách mở trang. Đo thật: mỗi sản phẩm có đúng
        // một hàng isDefault = true.
        is_default: !!v.isDefault,
        /**
         * Đủ điều kiện thêm vào giỏ hay chưa.
         *
         * Cả hai điều kiện đều bắt buộc: có giá tin được VÀ còn hàng. Tính ở
         * máy chủ chứ không để trình duyệt tự suy từ `price === null` — cùng
         * một câu trả lời cho mọi nơi hỏi, và sau này siết thêm điều kiện thì
         * chỉ sửa một dòng.
         */
        can_add_to_cart: price != null && v.stockStatus === "IN_STOCK",
      };
    });
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

  /**
   * Đếm liên kết danh mục CHỈ trên hàng đang bán.
   *
   * `_count: { categoryLinks: true }` thô đếm mọi liên kết, kể cả hàng DRAFT và
   * hàng đã xoá mềm. Đo trên hàng thật: 8/31 danh mục lệch — "Túi Da Cho Nữ" ghi
   * 49 nhưng khách bấm vào chỉ thấy 48, "Phụ Kiện Bằng Da" 34 vs 33, và
   * "qua-tang-su-kien" ghi 1 trong khi trang trống trơn. shopFilters đã sửa lỗi
   * này bằng groupBy; đây là cùng một lỗi ở đường /shop/categories.
   *
   * Số hiện cho khách phải là số hàng khách bấm vào sẽ thấy — không có ngoại lệ.
   */
  private readonly demHangDangBan = {
    _count: {
      select: {
        categoryLinks: { where: { product: { isDeleted: false, status: "ACTIVE" as const } } },
      },
    },
  };

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
      include: this.demHangDangBan,
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

    // Byte NUL trong tham số làm Postgres từ chối truy vấn → HTTP 500. Đo thật:
    // /shop/categories/card-holder?material=%00 trả 500 trên production. Đây là
    // tham số công khai, khách/bot dán gì cũng được, nên rửa ngay tại cửa vào
    // thay vì tin vào từng nhánh bên dưới. Cắt luôn độ dài: mã loại da / mã màu
    // thật dài nhất chưa tới 20 ký tự, chuỗi 5000 ký tự chỉ có thể là dò lỗi.
    const sach = (v?: string) =>
      v ? v.replace(/\0/g, "").slice(0, 120) || undefined : undefined;
    const material = sach(opts.material);
    const imageType = sach(opts.imageType);
    const color = sach(opts.color);
    const search = sach(opts.search);

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
    if (material && boQua !== "material") {
      where.materialCategoryLinks = {
        some: { materialCategory: { code: material } },
      };
    }

    // Lọc theo loại ảnh (imageType trên ảnh SP): SP có ÍT NHẤT 1 ảnh loại đó.
    if (imageType && boQua !== "imageType") {
      where.images = { some: { imageType: imageType } };
    }

    // Lọc theo màu: nhận nhiều mã nhóm màu, phân tách bởi dấu phẩy (union OR).
    // Đọc bảng nối nên hàng phối 2 tông hiện ở CẢ HAI màu.
    if (color && boQua !== "color") {
      const codes = color
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
    if (search) {
      const nhomToken = dieuKienTimSanPham(search);
      // Từ khoá không còn token dùng được ("   ", "{}", "%%%") thì coi như không
      // tìm gì, KHÔNG phải lọc rỗng — trả cả shop còn hơn trả trang trắng.
      if (nhomToken) gopVaoAnd(where, nhomToken);
    }

    return where;
  }

  /**
   * Tra id danh mục theo slug, ném 404 sạch nếu không có.
   *
   * Rửa NUL ngay ở đây vì đây là chỗ DUY NHẤT slug danh mục đi xuống Prisma —
   * cả shopFilters lẫn listProducts đều gọi qua hàm này. Việc rửa ở đầu
   * dieuKienLoc không cứu được đường này: id danh mục được tra TRƯỚC, bên ngoài
   * dieuKienLoc, nên /shop/filters?category=%00 vẫn trả 500 (đo thật) sau khi
   * đã sửa ?material=%00. Cùng một lỗi, ba đường vào khác nhau.
   */
  private async idDanhMuc(slug?: string): Promise<string | null> {
    const sach = slug ? slug.replace(/\0/g, "").trim().slice(0, 200) : "";
    if (!sach) return null;
    const cat = await this.prisma.koiCategory.findUnique({
      where: { slug: sach },
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

    // Mục count = 0 bị loại, TRỪ mục khách đang chọn.
    //
    // Giữ lại mục đang chọn vì sidebar cần TÊN của nó để hiện "đang lọc" và tô
    // sáng. Bỏ nó đi thì với ?category=watch-case&material=EPSOM (0 kết quả)
    // mặt tiền không còn gì để tra, phải in thẳng mã thô "watch-case", "EPSOM"
    // và không mục nào sáng — khách thấy trang trắng mà tưởng chưa lọc gì.
    // Ở đây count=0 là thông tin thật ("cặp này hết hàng"), không phải rác.
    const giu = <T extends { count: number }>(ds: T[], dangChon: (t: T) => boolean) =>
      ds.filter((t) => t.count > 0 || dangChon(t));

    const colors = giu(
      COLOR_FAMILIES.map((f) => ({
        code: f.code,
        name: f.name,
        hex: f.hex,
        count: colorCount.get(f.code) ?? 0,
      })),
      (c) => c.code === opts.color,
    );

    return {
      categories: giu(
        cats.map((c) => ({
          name: this.text(c.name),
          slug: c.slug,
          count: catCount.get(c.id) ?? 0,
        })),
        (c) => c.slug === opts.categorySlug,
      ),
      materials: giu(
        materials.map((m) => ({
          name: this.text(m.name),
          code: m.code,
          count: materialCount.get(m.id) ?? 0,
        })),
        (m) => m.code === opts.material,
      ),
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

  /**
   * Kẹp số trang / số hàng mỗi trang về khoảng dùng được.
   *
   * Math.max(1, x) KHÔNG đủ: `Number("1e999")` là Infinity, và
   * `Math.max(1, Infinity)` vẫn là Infinity → `skip: Infinity` làm Prisma ném
   * lỗi → 500. Đo thật trên production: ?page=1e999, ?page=Infinity,
   * ?page=1e400 và ?page=99999999999999999999 đều trả HTTP 500 ở cả ba đường
   * /shop/categories/:slug, /shop/products và /shop/posts — không cần đăng
   * nhập. (page=abc / -5 / 0 và limit=9999 / -1 thì kẹp đúng, chỉ Infinity lọt
   * qua.) Nguy hơn nữa: các đường này khai @Header Cache-Control s-maxage=300
   * nên CDN đệm luôn cả phản hồi lỗi.
   *
   * Number.isFinite chặn Infinity và NaN; Math.trunc bỏ phần thập phân để
   * ?page=1.9 không thành skip lẻ. Trần đặt ở TRAN_TRANG: sâu hơn thế thì
   * không có trang thật nào, mà OFFSET lớn còn buộc Postgres đếm-rồi-bỏ.
   */
  private static readonly TRAN_TRANG = 100_000;

  private kepTrang(page?: number, limit?: number) {
    const soTrang = Number.isFinite(page) ? Math.trunc(page as number) : 1;
    const soHang = Number.isFinite(limit) ? Math.trunc(limit as number) : 24;
    return {
      page: Math.min(ShopService.TRAN_TRANG, Math.max(1, soTrang || 1)),
      limit: Math.min(48, Math.max(1, soHang || 24)),
    };
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
    /**
     * id danh mục bên gọi ĐÃ TRA RỒI — truyền vào để khỏi tra lại.
     * categoryBySlug bắt buộc phải đọc bản ghi danh mục (cần tên, mô tả), rồi
     * gọi hàm này với cùng slug đó; không có tham số này là 2 truy vấn y hệt
     * nhau cho mỗi lượt xem trang danh mục. Bỏ trống thì tra như cũ.
     */
    catId?: string | null;
  }) {
    const { page, limit } = this.kepTrang(opts.page, opts.limit);

    // Cùng một hàm dựng điều kiện với shopFilters — số trong ngoặc ở sidebar và
    // số hàng thực trả về đây không thể lệch nhau nữa.
    const where = this.dieuKienLoc(
      opts,
      opts.catId ?? (await this.idDanhMuc(opts.categorySlug)),
    );

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

  /**
   * Trang một danh mục: bản ghi danh mục + sản phẩm trong đó.
   *
   * Nhận cả loại da / màu / thứ tự vì đây là chỗ khách từ Google rơi vào nhiều
   * nhất — trước đây chỉ nhận page/limit nên trang danh mục là danh sách cứng,
   * khách muốn lọc phải mò sang /cua-hang/ rồi chọn lại danh mục từ đầu.
   *
   * KHÔNG trả kèm facet ở đây. Facet của một danh mục KHÔNG phụ thuộc page hay
   * sort, nên để riêng ở /shop/filters?category=… thì mọi trang và mọi thứ tự
   * dùng chung một bản đã đệm; gộp vào đây là bắt 11 truy vấn của shopFilters
   * chạy lại cho từng tổ hợp page × sort × loại da × màu.
   */
  async categoryBySlug(
    slug: string,
    page = 1,
    limit = 24,
    opts: { material?: string; color?: string; sort?: string } = {},
  ) {
    const cat = await this.prisma.koiCategory.findUnique({
      where: { slug },
      include: this.demHangDangBan,
    });
    if (!cat || cat.isActive === false)
      throw new NotFoundException("Không tìm thấy danh mục");

    const list = await this.listProducts({
      page,
      limit,
      categorySlug: slug,
      // Đã có bản ghi danh mục ở trên rồi — đừng tra lại lần nữa.
      catId: cat.id,
      material: opts.material,
      color: opts.color,
      sort: opts.sort,
    });
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

    const variants = this.mapVariants(p);

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
