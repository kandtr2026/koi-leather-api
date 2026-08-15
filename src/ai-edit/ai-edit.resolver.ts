import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { goBoc } from "./ai-edit.json-vi";
import {
  BanGhiDaTra,
  LoaiNoiDung,
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
