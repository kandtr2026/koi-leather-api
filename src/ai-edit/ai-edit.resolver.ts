import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { COLOR_FAMILY_LABEL } from "../common/enums";
import { PrismaService } from "../prisma/prisma.service";
import { goBoc } from "./ai-edit.json-vi";
import {
  BanGhiDaTra,
  LoaiNoiDung,
  NguCanh,
  TEN_BANG,
  TRUONG_CHO_PHEP,
} from "./ai-edit.types";

/**
 * Đường dẫn ở GỐC tên miền do storefront tự dựng bằng mã, KHÔNG đọc từ DB.
 *
 * Vì sao phải liệt kê ở đây: route cứng trong src/app/ của Next.js ĐÈ LÊN route
 * bắt-tất [slug]. Nên nếu bảng `pages` có một dòng slug "lien-he", trang thật mà
 * khách thấy vẫn là src/app/lien-he/page.tsx — sửa DB không đổi được một chữ nào
 * trên trang đó. Không cảnh báo thì chủ shop bấm Áp dụng, thấy báo thành công,
 * mở trang ra thấy y như cũ, và không hiểu vì sao.
 *
 * Danh sách lấy từ `find src/app -maxdepth 1 -type d` của repo koi-storefront.
 * Thêm route cứng mới ở storefront thì thêm vào đây.
 */
const ROUTE_CUNG = new Set([
  "badge",
  "blog",
  "category",
  "chinh-sach-giao-hang",
  "cua-hang",
  "dau-an-rieng",
  "dich-vu-lam-tui-da-theo-yeu-cau",
  "huong-dan-thanh-toan",
  "lien-he",
  "lookbook",
  "qua-tang-doanh-nghiep-cuoi-nam",
  "qua-tang-doanh-nghiep-theo-yeu-cau",
  "san-pham",
  "tag",
  "tim-kiem",
  "tu-khoa-san-pham",
]);

/**
 * Tiền tố mà koi-domain-router đẩy về BACKEND, không tới storefront.
 *
 * Lớp che thứ hai, nằm TRƯỚC cả Next.js: router (api/index.js, hàm targetFor)
 * quyết định request đi đâu. Slug nào trùng danh sách này thì khách gõ vào không
 * bao giờ tới storefront, nên dòng trong bảng `pages` cũng không ai đọc.
 *
 * Có thật trên dữ liệu: bảng pages đang có một dòng slug "shop".
 */
const TIEN_TO_ROUTER = new Set([
  "admin",
  "tailwind.css",
  "auth",
  "analytics",
  "products",
  "categories",
  "material-categories",
  "image-categories",
  "crafting-specs",
  "production-orders",
  "raw-materials",
  "shop",
  "storage",
  "health",
  "shopee-ads",
  "api",
]);

/**
 * Slug ở gốc bị che hay không, và vì sao.
 *
 * Áp cho CẢ posts LẪN pages. Kiểm trên dữ liệu thật: có 2 BÀI POST trùng route
 * cứng của storefront (/dich-vu-lam-tui-da-theo-yeu-cau/,
 * /qua-tang-doanh-nghiep-cuoi-nam/) — nếu chỉ cảnh báo cho pages thì chủ shop sửa
 * hai bài đó, thấy báo thành công, mở trang ra không đổi gì.
 */
function liDoBiChe(slug: string): string | null {
  if (TIEN_TO_ROUTER.has(slug)) {
    return `QUAN TRỌNG: /${slug}/ là tiền tố hệ thống — koi-domain-router chuyển nó về máy chủ API, không tới trang bán hàng. Dòng này trong cơ sở dữ liệu KHÔNG hiện ở đâu cả; sửa cũng không ai thấy.`;
  }
  if (ROUTE_CUNG.has(slug)) {
    return `QUAN TRỌNG: /${slug}/ đang được dựng bằng mã trong storefront, không đọc từ cơ sở dữ liệu. Sửa ở đây sẽ KHÔNG đổi trang khách đang thấy — phải sửa mã nguồn.`;
  }
  return null;
}

export interface KetQuaTra extends BanGhiDaTra {
  /** Cảnh báo hiện màu vàng trên admin. Rỗng = không có gì đáng lo. */
  canhBao: string[];
}

@Injectable()
export class AiEditResolver {
  private readonly log = new Logger(AiEditResolver.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Tách đường dẫn từ thứ chủ shop dán vào. Nhận cả URL đầy đủ lẫn đường dẫn
   * trần, cả có lẫn không dấu / ở cuối, và bỏ tham số ?utm_... vì link chép từ
   * thanh địa chỉ hay mang theo.
   */
  private tachDuongDan(dan: string): string[] {
    const s = (dan || "").trim();
    if (!s) throw new BadRequestException("Chưa dán link nào.");

    let path = s;
    if (/^https?:\/\//i.test(s)) {
      let u: URL;
      try {
        u = new URL(s);
      } catch {
        throw new BadRequestException(`Link không đọc được: ${s}`);
      }
      // Chặn link của site khác: dán link đối thủ vào thì không tra ra gì, nhưng
      // nói thẳng lý do thay vì để chủ shop tưởng bài của mình bị mất.
      const host = u.hostname.replace(/^www\./, "");
      const nhaMinh = ["koileather.com", "koileather.vn", "localhost"];
      if (!nhaMinh.some((h) => host === h || host.endsWith(`.${h}`))) {
        throw new BadRequestException(
          `Link này thuộc ${host}, không phải website của mình. Chỉ sửa được nội dung trên koileather.com.`,
        );
      }
      path = u.pathname;
    }

    // Bỏ ?query và #hash nếu người dán đưa vào dạng đường dẫn trần.
    path = path.split("?")[0].split("#")[0];

    return path
      .split("/")
      .map((x) => {
        try {
          return decodeURIComponent(x);
        } catch {
          return x;
        }
      })
      .filter(Boolean);
  }

  /** Ghép lại đường dẫn chuẩn (luôn có / ở đầu và cuối, theo trailingSlash). */
  private chuanHoa(doan: string[]): string {
    return `/${doan.join("/")}/`;
  }

  private truongTu(
    kind: LoaiNoiDung,
    row: Record<string, unknown>,
  ): BanGhiDaTra["truong"] {
    return TRUONG_CHO_PHEP[kind].map((t) => {
      const v = row[t.ten];
      return {
        ten: t.ten,
        nhan: t.nhan,
        // goBoc: name/description của sản phẩm lưu dạng {"vi":"..."}. Hiện thô
        // ra thì chủ shop đọc phải cả dấu ngoặc, và AI sẽ viết lại luôn cái vỏ.
        // KHÔNG String(v): PrismaService parse sẵn thành object, ép String() ra
        // "[object Object]". goBoc nhận unknown.
        giaTri: goBoc(v),
        html: t.html,
        soKyTuNen: t.soKyTuNen ?? null,
      };
    });
  }

  private async demLanDaSua(kind: LoaiNoiDung, id: string): Promise<number> {
    return this.prisma.koiContentRevision.count({
      where: { kind, recordId: id, revertedAt: null },
    });
  }

  /**
   * Số ảnh gửi cho AI xem. Đặt qua AI_EDIT_SO_ANH.
   *
   * Vì sao phải có trần: mỗi tấm ảnh là thêm token VÀ thêm giây chờ, mà cả lượt
   * gọi chỉ có 4 phút trước khi openai.client tự bỏ cuộc. 3 tấm là đủ thấy hình
   * dáng, chất da và một góc chi tiết; tấm thứ mười không thêm được gì mà lượt
   * nào cũng phải trả tiền cho nó.
   *
   * 0 = không gửi ảnh nào (tắt vision, vẫn giữ phần ngữ cảnh chữ). Đây là số ĐẶT
   * CÓ Ý, nên phải phân biệt được với "biến chưa đặt" — xem bên dưới.
   */
  private soAnhGuiAi(): number {
    // Đọc chuỗi thô rồi mới đổi số. KHÔNG viết Number(process.env.X || ""):
    // Number("") ra 0 chứ không phải NaN, nên biến chưa đặt sẽ lọt qua mọi kiểm
    // tra và hàm trả về 0 — tức KHÔNG GỬI ẢNH NÀO trong khi mặc định phải là 3.
    // Đã dính đúng lỗi này: chạy thử trên dữ liệu thật thấy sản phẩm có 4 ảnh mà
    // số ảnh gửi đi là 0, và không có thông báo lỗi nào để lần ra.
    const tho = process.env.AI_EDIT_SO_ANH?.trim();
    if (!tho) return 3;
    const n = Number(tho);
    if (!Number.isFinite(n) || n < 0) return 3;
    return Math.min(Math.floor(n), 8);
  }

  /**
   * Đọc ngữ cảnh của một sản phẩm: danh mục, loại da, màu, ảnh, bản ghi SEO.
   *
   * Chạy SAU khi đã có sản phẩm, bằng các truy vấn riêng thay vì `include` lồng
   * trong findUnique. Lý do là DB đi qua pgbouncer với connection_limit=1
   * (prisma.service.ts): include nhiều bảng một lượt sinh câu JOIN lớn, còn ở đây
   * mấy truy vấn nhỏ có chỉ mục sẵn (@@index([productId])) thì nhẹ và đọc dễ hơn.
   *
   * Lỗi ở đây KHÔNG được làm sập cả lượt tra: ngữ cảnh là phần làm chữ tốt hơn,
   * không phải phần bắt buộc để sửa được chữ. Bên gọi bắt lỗi và đi tiếp với null.
   */
  private async nguCanhSanPham(sp: {
    id: string;
    categoryId: string | null;
    materialCategoryId: string | null;
    colorFamily: string | null;
    productType: string;
    hasVariants: boolean;
  }): Promise<NguCanh> {
    const soAnh = this.soAnhGuiAi();

    const [dmChinh, dmPhu, daChinh, daPhu, mauPhu, anh, tongSoAnh, seo] =
      await Promise.all([
        sp.categoryId
          ? this.prisma.koiCategory.findUnique({
              where: { id: sp.categoryId },
              select: { name: true },
            })
          : Promise.resolve(null),
        this.prisma.koiProductCategory.findMany({
          where: { productId: sp.id },
          select: { category: { select: { name: true } } },
        }),
        sp.materialCategoryId
          ? this.prisma.koiMaterialCategory.findUnique({
              where: { id: sp.materialCategoryId },
              select: { name: true, description: true },
            })
          : Promise.resolve(null),
        this.prisma.koiProductMaterialCategory.findMany({
          where: { productId: sp.id },
          orderBy: { sortOrder: "asc" },
          select: {
            materialCategory: { select: { name: true, description: true } },
          },
        }),
        this.prisma.koiProductColor.findMany({
          where: { productId: sp.id },
          orderBy: { sortOrder: "asc" },
          select: { colorFamily: true },
        }),
        // isPrimary desc rồi displayOrder asc: ảnh chính phải là tấm đầu tiên AI
        // nhìn thấy, vì nếu chỉ gửi được vài tấm thì đó là tấm đáng gửi nhất.
        soAnh > 0
          ? this.prisma.koiProductImage.findMany({
              where: { productId: sp.id },
              orderBy: [{ isPrimary: "desc" }, { displayOrder: "asc" }],
              take: soAnh,
              select: {
                url: true,
                thumbnailUrl: true,
                altText: true,
                imageType: true,
                isPrimary: true,
              },
            })
          : Promise.resolve([]),
        this.prisma.koiProductImage.count({ where: { productId: sp.id } }),
        // Bảng này dùng chung cho nhiều loại thực thể (đã kiểm: entityType có giá
        // trị "PRODUCT"), nên phải lọc CẢ entityType chứ không chỉ entityId. Chỉ
        // lọc entityId thì đúng cho tới ngày một danh mục và một sản phẩm tình cờ
        // trùng id — và lúc đó AI đọc thẻ SEO của trang khác mà không ai biết.
        this.prisma.koiSEORecord.findFirst({
          where: { entityId: sp.id, entityType: "PRODUCT" },
          select: {
            ogTitle: true,
            ogDescription: true,
            noIndex: true,
            jsonLd: true,
          },
        }),
      ]);

    // Danh mục chính lên đầu, rồi danh mục phụ, bỏ trùng. goBoc vì tên có thể là
    // JSON hai thứ tiếng ở một số dòng — trả chuỗi trần thì goBoc cho lại y nguyên.
    const danhMuc: string[] = [];
    const themDm = (v: unknown) => {
      const s = goBoc(v)?.trim();
      if (s && !danhMuc.includes(s)) danhMuc.push(s);
    };
    themDm(dmChinh?.name);
    dmPhu.forEach((d) => themDm(d.category?.name));

    const loaiDa: NguCanh["loaiDa"] = [];
    const themDa = (ten: unknown, moTa: unknown) => {
      const t = goBoc(ten)?.trim();
      if (!t || loaiDa.some((x) => x.ten === t)) return;
      loaiDa.push({ ten: t, moTa: goBoc(moTa)?.trim() || null });
    };
    themDa(daChinh?.name, daChinh?.description);
    daPhu.forEach((d) =>
      themDa(d.materialCategory?.name, d.materialCategory?.description),
    );

    // colorFamily trong DB là MÃ, không phải tên đọc được: "VANG_BO", "XANH_LA",
    // "NAU_DAM". Đưa nguyên mã vào prompt là AI viết ra chữ "màu VANG_BO" trong
    // mô tả bán hàng. Đổi sang nhãn tiếng Việt bằng đúng bảng mà cửa hàng và
    // admin đang dùng (COLOR_FAMILY_LABEL), để chữ AI viết khớp với chữ khách
    // thấy trên thanh lọc. Mã lạ không có trong bảng thì giữ nguyên — thà hiện mã
    // còn hơn bỏ mất một màu có thật.
    const mau: string[] = [];
    const themMau = (v: string | null) => {
      const s = (v || "").trim();
      if (!s) return;
      const nhan = COLOR_FAMILY_LABEL[s] || s;
      if (!mau.includes(nhan)) mau.push(nhan);
    };
    themMau(sp.colorFamily);
    mauPhu.forEach((m) => themMau(m.colorFamily));

    // jsonLd qua middleware PrismaService là object đã parse. "{}" hay object rỗng
    // đều tính là CHƯA có JSON-LD.
    const coJsonLd = (() => {
      const v = seo?.jsonLd as unknown;
      if (v == null) return false;
      if (typeof v === "object") return Object.keys(v).length > 0;
      const s = String(v).trim();
      return s !== "" && s !== "{}";
    })();

    return {
      danhMuc,
      loaiDa,
      mau,
      loaiSanPham: sp.productType || null,
      coBienThe: sp.hasVariants,
      anh: anh.map((a) => ({
        url: a.url,
        // thumbnailUrl để trống ở một số dòng cũ — lùi về url để ô xem trước
        // không thành ảnh hỏng.
        urlNho: a.thumbnailUrl?.trim() || a.url,
        altText: a.altText,
        imageType: a.imageType,
        isPrimary: a.isPrimary,
      })),
      tongSoAnh,
      seo: seo
        ? {
            ogTitle: goBoc(seo.ogTitle),
            ogDescription: goBoc(seo.ogDescription),
            noIndex: seo.noIndex,
            coJsonLd,
          }
        : null,
    };
  }

  /**
   * Tra link ra bản ghi. Ném NotFoundException nếu không có gì khớp — chủ shop
   * cần biết ngay, không phải nhận về một khung trống.
   */
  async tra(dan: string): Promise<KetQuaTra> {
    const doan = this.tachDuongDan(dan);
    const canhBao: string[] = [];

    // Trang chủ và các trang do mã dựng hoàn toàn: không có bản ghi nào để sửa.
    if (!doan.length) {
      throw new BadRequestException(
        "Đây là trang chủ, nội dung do mã dựng nên không sửa được bằng công cụ này.",
      );
    }

    const dong = async <T>(p: Promise<T | null>, loi: string): Promise<T> => {
      const r = await p;
      if (!r) throw new NotFoundException(loi);
      return r;
    };

    // ---- /cua-hang/<slug>/ = TRANG SẢN PHẨM ----
    // Đọc kỹ: /cua-hang/ là sản phẩm, /san-pham/ là danh mục. Ngược với cảm giác
    // đọc tên, và là chỗ nhầm tai hại nhất — xem doc ai-edit.types.ts.
    if (doan[0] === "cua-hang" && doan[1]) {
      const sp = await dong(
        this.prisma.koiProduct.findUnique({ where: { slug: doan[1] } }),
        `Không có sản phẩm nào với slug "${doan[1]}".`,
      );
      if (sp.isDeleted)
        canhBao.push("Sản phẩm này đã bị xoá mềm, không hiện trên site.");
      if (sp.status !== "ACTIVE")
        canhBao.push(
          `Sản phẩm đang ở trạng thái ${sp.status}, không hiện trên site.`,
        );
      return {
        kind: "product",
        id: sp.id,
        tieuDe: goBoc(sp.name) || sp.slug,
        slug: sp.slug,
        path: this.chuanHoa(["cua-hang", sp.slug]),
        bang: TEN_BANG.product,
        truong: this.truongTu(
          "product",
          sp as unknown as Record<string, unknown>,
        ),
        soLanDaSua: await this.demLanDaSua("product", sp.id),
        canhBao,
        // Ngữ cảnh là phần LÀM CHỮ TỐT HƠN, không phải phần bắt buộc để sửa chữ.
        // Nên nó không được quyền làm sập lượt tra: một bảng nối lỗi, một cột đổi
        // tên, và chủ shop mất luôn khả năng sửa nội dung — đổi lấy thứ chỉ là bổ
        // trợ. Lỗi thì đi tiếp với null và ghi log để còn lần ra.
        nguCanh: await this.nguCanhSanPham(sp).catch((e: Error) => {
          this.log.warn(
            `Không đọc được ngữ cảnh sản phẩm ${sp.slug}: ${e.message}`,
          );
          return null;
        }),
      };
    }

    // ---- /san-pham/<slug>/ = TRANG DANH MỤC ----
    if (doan[0] === "san-pham" && doan[1]) {
      const dm = await dong(
        this.prisma.koiCategory.findUnique({ where: { slug: doan[1] } }),
        `Không có danh mục nào với slug "${doan[1]}".`,
      );
      if (!dm.isActive)
        canhBao.push("Danh mục đang tắt, không hiện trên site.");
      return {
        kind: "category",
        id: dm.id,
        tieuDe: goBoc(dm.name) || dm.slug,
        slug: dm.slug,
        path: this.chuanHoa(["san-pham", dm.slug]),
        bang: TEN_BANG.category,
        truong: this.truongTu(
          "category",
          dm as unknown as Record<string, unknown>,
        ),
        soLanDaSua: await this.demLanDaSua("category", dm.id),
        canhBao,
      };
    }

    // ---- /tu-khoa-san-pham/<slug>/ = từ khoá sản phẩm ----
    if (doan[0] === "tu-khoa-san-pham" && doan[1]) {
      const tag = await dong(
        this.prisma.tags.findUnique({ where: { slug: doan[1] } }),
        `Không có từ khoá sản phẩm nào với slug "${doan[1]}".`,
      );
      return {
        kind: "product_tag",
        id: String(tag.id),
        tieuDe: tag.name,
        slug: tag.slug,
        path: this.chuanHoa(["tu-khoa-san-pham", tag.slug]),
        bang: TEN_BANG.product_tag,
        truong: this.truongTu(
          "product_tag",
          tag as unknown as Record<string, unknown>,
        ),
        soLanDaSua: await this.demLanDaSua("product_tag", String(tag.id)),
        canhBao,
      };
    }

    // ---- /category/<slug>/ và /tag/<slug>/ = chuyên mục & tag blog ----
    if ((doan[0] === "category" || doan[0] === "tag") && doan[1]) {
      const taxonomy = doan[0] === "category" ? "category" : "post_tag";
      // post_terms không có unique trên slug đơn lẻ (unique là [taxonomy, slug]),
      // nên phải findFirst với cả hai. Thử đúng taxonomy trước; không có thì thử
      // taxonomy còn lại, vì bản clone WordPress dùng cả "tag" và "post_tag".
      const term =
        (await this.prisma.post_terms.findFirst({
          where: { taxonomy, slug: doan[1] },
        })) ??
        (await this.prisma.post_terms.findFirst({
          where: {
            slug: doan[1],
            taxonomy: { in: ["tag", "post_tag", "category"] },
          },
        }));
      if (!term)
        throw new NotFoundException(
          `Không có chuyên mục/tag blog nào với slug "${doan[1]}".`,
        );
      return {
        kind: "blog_term",
        id: String(term.id),
        tieuDe: term.name,
        slug: term.slug,
        path: this.chuanHoa([doan[0], term.slug]),
        bang: TEN_BANG.blog_term,
        truong: this.truongTu(
          "blog_term",
          term as unknown as Record<string, unknown>,
        ),
        soLanDaSua: await this.demLanDaSua("blog_term", String(term.id)),
        canhBao,
      };
    }

    // ---- /<slug>/ ở gốc = BÀI VIẾT, hoặc TRANG TĨNH ----
    if (doan.length === 1) {
      const slug = doan[0];

      // Thử `posts` TRƯỚC rồi mới tới `pages` — đúng thứ tự của contentBySlug ở
      // shop-content.service.ts:120. Đảo thứ tự thì một slug có ở cả hai bảng sẽ
      // được công cụ này sửa ở bảng A trong khi site đang đọc bảng B.
      const post = await this.prisma.posts.findUnique({ where: { slug } });
      if (post) {
        if (!post.is_published)
          canhBao.push("Bài này chưa xuất bản, không hiện trên site.");
        // Bài post cũng bị che được: đã kiểm trên dữ liệu thật, có 2 bài trùng
        // route cứng của storefront.
        const che = liDoBiChe(slug);
        if (che) canhBao.push(che);
        return {
          kind: "post",
          id: String(post.id),
          tieuDe: post.title,
          slug: post.slug,
          path: this.chuanHoa([post.slug]),
          bang: TEN_BANG.post,
          truong: this.truongTu(
            "post",
            post as unknown as Record<string, unknown>,
          ),
          soLanDaSua: await this.demLanDaSua("post", String(post.id)),
          canhBao,
        };
      }

      const page = await this.prisma.pages.findUnique({ where: { slug } });
      if (page) {
        if (!page.is_published)
          canhBao.push("Trang này chưa xuất bản, không hiện trên site.");
        // Route cứng của Next.js, hoặc tiền tố router, đè lên [slug] — sửa DB sẽ
        // KHÔNG đổi trang thật. Trên dữ liệu hiện tại có 6 dòng pages như vậy.
        const che = liDoBiChe(slug);
        if (che) canhBao.push(che);
        return {
          kind: "page",
          id: String(page.id),
          tieuDe: page.title,
          slug: page.slug,
          path: this.chuanHoa([page.slug]),
          bang: TEN_BANG.page,
          truong: this.truongTu(
            "page",
            page as unknown as Record<string, unknown>,
          ),
          soLanDaSua: await this.demLanDaSua("page", String(page.id)),
          canhBao,
        };
      }

      // Không có dòng nào trong DB, mà slug lại là route cứng hoặc tiền tố hệ
      // thống: nói rõ nội dung nằm trong mã nguồn, đừng để chủ shop tưởng bài
      // của mình bị mất.
      if (ROUTE_CUNG.has(slug)) {
        throw new BadRequestException(
          `/${slug}/ là trang do mã dựng, không có bản ghi trong cơ sở dữ liệu. Nội dung của nó nằm trong mã nguồn storefront.`,
        );
      }
      if (TIEN_TO_ROUTER.has(slug)) {
        throw new BadRequestException(
          `/${slug}/ là tiền tố hệ thống, không phải một trang nội dung.`,
        );
      }
      throw new NotFoundException(
        `Không tìm thấy bài viết hay trang nào với slug "${slug}".`,
      );
    }

    throw new BadRequestException(
      `Chưa hỗ trợ đường dẫn "${this.chuanHoa(doan)}". Dán link bài viết (/ten-bai/), sản phẩm (/cua-hang/ten-sp/), danh mục (/san-pham/ten-dm/), từ khoá (/tu-khoa-san-pham/...), hoặc chuyên mục blog (/category/...).`,
    );
  }
}
