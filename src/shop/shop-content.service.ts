import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Nội dung "cũ" cho storefront: blog, trang tĩnh, tag — nằm ở schema `public`
 * (bản clone WordPress). Đây là phần đang có organic traffic nên PHẢI giữ sống
 * để link Google không gãy. Backend đọc trực tiếp qua Prisma (đã multiSchema).
 *
 * Lưu ý: các bảng public dùng khoá BigInt → JSON không serialize được, phải
 * ép về Number/chuỗi ISO trong mọi mapper.
 */
@Injectable()
export class ShopContentService {
  private readonly logger = new Logger(ShopContentService.name);

  constructor(private prisma: PrismaService) {}

  private mapPost(p: any) {
    return {
      id: Number(p.id),
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt ?? null,
      content: p.content ?? null,
      meta_title: p.meta_title ?? null,
      meta_description: p.meta_description ?? null,
      published_at: p.published_at ? p.published_at.toISOString() : null,
    };
  }

  private mapPage(p: any) {
    return {
      id: Number(p.id),
      title: p.title,
      slug: p.slug,
      content: p.content ?? null,
      meta_title: p.meta_title ?? null,
      meta_description: p.meta_description ?? null,
    };
  }

  private mapTerm(t: any) {
    return {
      id: Number(t.id),
      name: t.name,
      slug: t.slug,
      description: t.description ?? null,
      taxonomy: t.taxonomy,
      post_count: t.post_count,
    };
  }

  private mapPublicProduct(p: any) {
    return {
      id: Number(p.id),
      name: p.name,
      slug: p.slug,
      sku: p.sku ?? null,
      short_description: p.short_description ?? null,
      description: null,
      price: p.price != null ? Number(p.price) : null,
      regular_price: p.regular_price != null ? Number(p.regular_price) : null,
      price_min: p.price_min != null ? Number(p.price_min) : null,
      price_max: p.price_max != null ? Number(p.price_max) : null,
      on_sale: !!p.on_sale,
      has_variants: !!p.has_variants,
      is_available: !!p.is_available,
      is_featured: !!p.is_featured,
      meta_title: p.meta_title ?? null,
      meta_description: p.meta_description ?? null,
      // storage_path bản public là TÊN FILE trần → imageUrl() phía frontend
      // sẽ ghép prefix bucket Supabase Storage.
      product_images: (p.product_images ?? []).map((i: any) => ({
        storage_path: i.storage_path,
        alt: i.alt ?? null,
        is_primary: !!i.is_primary,
        sort_order: i.sort_order ?? 0,
      })),
    };
  }

  // ----- blog -----

  async posts(page = 1, limit = 12) {
    // Math.max(1, x) không chặn được Infinity: Number("1e999") là Infinity nên
    // `skip: Infinity` làm Prisma ném lỗi → /shop/posts?page=1e999 trả 500 trên
    // production (đo thật). Number.isFinite chặn cả Infinity lẫn NaN, Math.trunc
    // bỏ phần thập phân. Cùng một lỗi và cùng cách sửa như kepTrang ở ShopService
    // — bên đó là bảng sản phẩm, bên này là bảng bài viết (schema public).
    page = Math.min(
      100_000,
      Math.max(1, (Number.isFinite(page) ? Math.trunc(page) : 1) || 1),
    );
    limit = Math.min(
      48,
      Math.max(1, (Number.isFinite(limit) ? Math.trunc(limit) : 12) || 12),
    );
    const [rows, total, cats] = await Promise.all([
      this.prisma.posts.findMany({
        where: { is_published: true },
        orderBy: [{ published_at: "desc" }, { id: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.posts.count({ where: { is_published: true } }),
      this.prisma.post_terms.findMany({
        where: { taxonomy: "category", post_count: { gt: 0 } },
        orderBy: { post_count: "desc" },
      }),
    ]);
    return {
      data: rows.map((p) => this.mapPost(p)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      categories: cats.map((c) => this.mapTerm(c)),
    };
  }

  /** Bài viết hoặc trang tĩnh theo slug (thử bài trước, rồi tới trang). */
  async contentBySlug(slug: string) {
    const post = await this.prisma.posts.findUnique({ where: { slug } });
    if (post && post.is_published)
      return { kind: "post" as const, doc: this.mapPost(post) };

    const page = await this.prisma.pages.findUnique({ where: { slug } });
    if (page && page.is_published)
      return { kind: "page" as const, doc: this.mapPage(page) };

    return null;
  }

  /** Chuyên mục / tag blog + các bài thuộc nó. */
  async blogTerm(taxonomy: "category" | "tag", slug: string) {
    const term = await this.prisma.post_terms.findFirst({
      where: { taxonomy, slug },
    });
    if (!term) return null;

    const links = await this.prisma.post_term_links.findMany({
      where: { term_id: term.id },
      select: { post_id: true },
    });
    const ids = links.map((l) => l.post_id);
    const posts = ids.length
      ? await this.prisma.posts.findMany({
          where: { id: { in: ids }, is_published: true },
          orderBy: [{ published_at: "desc" }, { id: "desc" }],
          take: 60,
        })
      : [];

    return {
      term: this.mapTerm(term),
      posts: posts.map((p) => this.mapPost(p)),
    };
  }

  // ----- product tags (từ khoá sản phẩm — schema public) -----

  async productTag(slug: string) {
    const tag = await this.prisma.tags.findUnique({ where: { slug } });
    if (!tag) return null;

    const links = await this.prisma.product_tags.findMany({
      where: { tag_id: tag.id },
      select: { product_id: true },
    });
    const ids = links.map((l) => l.product_id);
    const products = ids.length
      ? await this.prisma.products.findMany({
          where: { id: { in: ids }, is_published: true },
          orderBy: [{ price: "desc" }, { id: "asc" }],
          take: 48,
          include: {
            product_images: { orderBy: { sort_order: "asc" } },
          },
        })
      : [];

    return {
      tag: {
        id: Number(tag.id),
        name: tag.name,
        slug: tag.slug,
        product_count: tag.product_count,
      },
      products: products.map((p) => this.mapPublicProduct(p)),
    };
  }

  // ----- lead (khách để lại thông tin) -----

  /**
   * Ghi lead vào bảng public.leads. product_id để null: sản phẩm hiển thị nay
   * là koi_free_style (UUID) không khớp khoá ngoại BigInt của public.products,
   * nên tên sản phẩm (nếu có) được gộp vào message thay vì làm FK.
   */
  async createLead(input: {
    name: string;
    phone: string;
    message?: string | null;
    productName?: string | null;
  }) {
    const parts = [input.message?.trim()].filter(Boolean) as string[];
    if (input.productName) parts.push(`(Sản phẩm: ${input.productName})`);
    const message = parts.length ? parts.join(" ") : null;
    await this.prisma.leads.create({
      data: {
        name: input.name,
        phone: input.phone,
        message,
        source: "koifront",
        status: "new",
      },
    });

    // Báo email cho chủ shop. Cố tình ĐỢI (await) trước khi trả về: trên Vercel
    // serverless, fire-and-forget sau khi response xong dễ bị đóng hàm giữa
    // chừng nên tin không kịp gửi. notifyNewLead KHÔNG bao giờ throw — lead đã
    // ghi thành công thì khách phải thấy "đã nhận" dù mail có lỗi.
    await this.notifyNewLead({
      name: input.name,
      phone: input.phone,
      message,
    });

    return { ok: true };
  }

  /**
   * Gửi email báo có khách để lại form (nguồn koifront), qua HTTP API của Resend
   * — không thêm dependency, chạy được trên serverless. Cần 2 biến môi trường:
   *   · RESEND_API_KEY      — key từ resend.com
   *   · LEAD_NOTIFY_EMAIL   — nơi nhận báo (vd kandtr@gmail.com)
   * Tuỳ chọn LEAD_NOTIFY_FROM (mặc định địa chỉ test onboarding@resend.dev, chỉ
   * gửi được tới chính email đăng ký Resend — đủ để bắt đầu, sau verify domain
   * koileather.com thì đổi sang địa chỉ thương hiệu).
   *
   * Chưa cấu hình đủ env thì im lặng bỏ qua. Mọi lỗi mạng/API chỉ ghi log, KHÔNG
   * ném ra ngoài để không ảnh hưởng việc ghi lead.
   */
  private async notifyNewLead(lead: {
    name: string;
    phone: string;
    message: string | null;
  }): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    const to = process.env.LEAD_NOTIFY_EMAIL;
    if (!apiKey || !to) return;

    const from =
      process.env.LEAD_NOTIFY_FROM || "KOI Leather <onboarding@resend.dev>";
    const dong = [
      `Tên: ${lead.name}`,
      `Điện thoại: ${lead.phone}`,
      lead.message ? `Nội dung: ${lead.message}` : null,
      "",
      "Nguồn: koifront (form liên hệ koileather.com)",
    ].filter((x) => x !== null);

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [to],
          subject: `🔔 Khách để lại liên hệ: ${lead.name} — ${lead.phone}`,
          text: dong.join("\n"),
        }),
        // Không để form treo vì Resend chậm/kẹt.
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) {
        this.logger.warn(
          `Gửi email báo lead thất bại: ${res.status} ${await res
            .text()
            .catch(() => "")}`,
        );
      }
    } catch (err) {
      this.logger.warn(`Gửi email báo lead lỗi: ${String(err)}`);
    }
  }

  // ----- sitemap -----

  async sitemapData() {
    const [products, categories, catCounts, posts, pages, tags, postTerms] =
      await Promise.all([
        this.prisma.koiProduct.findMany({
          where: { isDeleted: false, status: "ACTIVE" },
          select: { slug: true, updatedAt: true },
        }),
        this.prisma.koiCategory.findMany({
          where: { isActive: true },
          select: { id: true, slug: true },
        }),
        // Số hàng ĐANG BÁN mỗi danh mục — để mặt tiền không khai vào sitemap
        // những danh mục rỗng. KHÔNG dùng _count.categoryLinks: nó đếm cả hàng
        // DRAFT và hàng đã xoá mềm, đúng cái bug đã sửa ở shopFilters ("Phụ Kiện
        // Bằng Da (34)" nhưng bấm vào chỉ có 32).
        this.prisma.koiProductCategory.groupBy({
          by: ["categoryId"],
          where: { product: { isDeleted: false, status: "ACTIVE" } },
          _count: { _all: true },
        }),
        this.prisma.posts.findMany({
          where: { is_published: true },
          select: { slug: true, published_at: true },
        }),
        this.prisma.pages.findMany({
          where: { is_published: true },
          select: { slug: true },
        }),
        this.prisma.tags.findMany({
          select: { slug: true, product_count: true },
        }),
        this.prisma.post_terms.findMany({
          select: { slug: true, taxonomy: true, post_count: true },
        }),
      ]);

    const soHang = new Map(
      catCounts.map((g) => [g.categoryId, g._count._all]),
    );

    return {
      products: products.map((p) => ({
        slug: p.slug,
        updated_at: p.updatedAt ? p.updatedAt.toISOString() : null,
      })),
      // Kèm product_count để sitemap lọc được danh mục rỗng — cùng cách đã làm
      // với tag (productTags.product_count).
      categories: categories.map((c) => ({
        slug: c.slug,
        product_count: soHang.get(c.id) ?? 0,
      })),
      posts: posts.map((p) => ({
        slug: p.slug,
        published_at: p.published_at ? p.published_at.toISOString() : null,
      })),
      pages: pages.map((p) => ({ slug: p.slug })),
      productTags: tags.map((t) => ({
        slug: t.slug,
        product_count: t.product_count,
      })),
      blogTerms: postTerms.map((t) => ({
        slug: t.slug,
        taxonomy: t.taxonomy,
        post_count: t.post_count,
      })),
    };
  }
}
