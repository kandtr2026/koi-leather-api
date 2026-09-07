import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { MediaService } from "../media/media.service";
import { OpenAiClient } from "../ai-edit/openai.client";
import { QueryProductsDto } from "./dto/product-alt.dto";

// So anh toi da gui AI cho 1 san pham trong 1 luot (alt ngan, nhung nhieu anh
// + detail:low de model map theo thu tu de sai — cap cho an toan).
const MAX_ANH_SINH = 12;

function tenSanPham(name: unknown): string {
  // KoiProduct.name la JSON {vi,en} (middleware Prisma tu parse thanh object),
  // nhung phong khi la chuoi JSON tho.
  if (name && typeof name === "object") {
    const o = name as Record<string, unknown>;
    return (o.vi as string) || (o.en as string) || "Sản phẩm KOI";
  }
  if (typeof name === "string") {
    try {
      const o = JSON.parse(name);
      return o.vi || o.en || name;
    } catch {
      return name;
    }
  }
  return "Sản phẩm KOI";
}

function alTrong(v?: string | null): boolean {
  return v === null || v === undefined || v.trim() === "";
}

@Injectable()
export class ProductAltService {
  constructor(
    private prisma: PrismaService,
    private media: MediaService,
    private openai: OpenAiClient,
  ) {}

  /** Tập altText bị trùng (>=2 ảnh cùng alt) — cả site. */
  private async altTrungSet(): Promise<Set<string>> {
    const nhom = await this.prisma.koiProductImage.groupBy({
      by: ["altText"],
      // Loại cả null LẪN chuỗi rỗng "" để "alt trùng" khớp với filter chiTrung
      // (altTrungSet cũng bỏ rỗng) — nếu không, ảnh "" gộp thành 1 nhóm giả to.
      where: { NOT: [{ altText: null }, { altText: "" }] },
      _count: { altText: true },
      having: { altText: { _count: { gt: 1 } } },
    });
    return new Set(
      nhom
        .map((g) => g.altText)
        .filter((a): a is string => a !== null && a.trim() !== ""),
    );
  }

  async stats() {
    const [tongAnh, thieuAlt, nhomTrung] = await Promise.all([
      this.prisma.koiProductImage.count(),
      this.prisma.koiProductImage.count({
        where: { OR: [{ altText: null }, { altText: "" }] },
      }),
      this.prisma.koiProductImage.groupBy({
        by: ["altText"],
        where: { altText: { not: null } },
        _count: { altText: true },
        having: { altText: { _count: { gt: 1 } } },
      }),
    ]);
    const anhTrungAlt = nhomTrung.reduce((s, g) => s + g._count.altText, 0);
    return {
      tongAnh,
      thieuAlt,
      soNhomAltTrung: nhomTrung.length,
      anhTrungAlt,
    };
  }

  async dsSanPham(dto: QueryProductsDto) {
    const page = dto.page && dto.page > 0 ? dto.page : 1;
    const pageSize =
      dto.pageSize && dto.pageSize > 0 ? Math.min(dto.pageSize, 60) : 24;
    const chiThieu = dto.chiThieu === "true" || dto.chiThieu === "1";
    const chiTrung = dto.chiTrung === "true" || dto.chiTrung === "1";

    const where: any = { isDeleted: false, images: { some: {} } };
    if (dto.q) {
      where.OR = [
        { name: { contains: dto.q, mode: "insensitive" } },
        { slug: { contains: dto.q, mode: "insensitive" } },
      ];
    }

    // Lọc "chỉ thiếu / chỉ trùng": tính tập productId liên quan rồi giới hạn.
    if (chiThieu || chiTrung) {
      const idSet = new Set<string>();
      if (chiThieu) {
        const g = await this.prisma.koiProductImage.groupBy({
          by: ["productId"],
          where: { OR: [{ altText: null }, { altText: "" }] },
          _count: { _all: true },
        });
        g.forEach((r) => idSet.add(r.productId));
      }
      if (chiTrung) {
        const altSet = await this.altTrungSet();
        if (altSet.size) {
          const anh = await this.prisma.koiProductImage.findMany({
            where: { altText: { in: Array.from(altSet) } },
            select: { productId: true },
            distinct: ["productId"],
          });
          anh.forEach((r) => idSet.add(r.productId));
        }
      }
      where.id = { in: idSet.size ? Array.from(idSet) : ["__khong_co__"] };
    }

    const [sp, total] = await this.prisma.$transaction([
      this.prisma.koiProduct.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: { id: true, name: true, slug: true, status: true },
      }),
      this.prisma.koiProduct.count({ where }),
    ]);

    // Đếm ảnh + ảnh thiếu alt cho đúng các SP trong trang (2 query gọn).
    const ids = sp.map((p) => p.id);
    const [tong, thieu] = ids.length
      ? await Promise.all([
          this.prisma.koiProductImage.groupBy({
            by: ["productId"],
            where: { productId: { in: ids } },
            _count: { _all: true },
          }),
          this.prisma.koiProductImage.groupBy({
            by: ["productId"],
            where: {
              productId: { in: ids },
              OR: [{ altText: null }, { altText: "" }],
            },
            _count: { _all: true },
          }),
        ])
      : [[], []];
    const mTong = new Map(tong.map((r) => [r.productId, r._count._all]));
    const mThieu = new Map(thieu.map((r) => [r.productId, r._count._all]));

    return {
      items: sp.map((p) => ({
        id: p.id,
        ten: tenSanPham(p.name),
        slug: p.slug,
        status: p.status,
        soAnh: mTong.get(p.id) ?? 0,
        soThieuAlt: mThieu.get(p.id) ?? 0,
      })),
      total,
      page,
      pageSize,
    };
  }

  async anhCuaSanPham(productId: string) {
    const anh = await this.prisma.koiProductImage.findMany({
      where: { productId },
      orderBy: [{ isPrimary: "desc" }, { displayOrder: "asc" }],
      select: {
        id: true,
        url: true,
        thumbnailUrl: true,
        altText: true,
        imageType: true,
        isPrimary: true,
        displayOrder: true,
      },
    });
    return { items: anh };
  }

  async sinhAlt(productId: string) {
    const sp = await this.prisma.koiProduct.findUnique({
      where: { id: productId },
      select: { id: true, name: true },
    });
    if (!sp) throw new NotFoundException("Không tìm thấy sản phẩm");

    const anh = await this.prisma.koiProductImage.findMany({
      where: { productId },
      orderBy: [{ isPrimary: "desc" }, { displayOrder: "asc" }],
      take: MAX_ANH_SINH,
      select: { id: true, url: true, thumbnailUrl: true, imageType: true, altText: true },
    });
    if (!anh.length) throw new BadRequestException("Sản phẩm chưa có ảnh nào");

    const ten = tenSanPham(sp.name);
    const heThong =
      "Bạn viết ALT text tiếng Việt cho ảnh sản phẩm đồ da thủ công KOI Leather " +
      "(ví, dây đồng hồ, túi, thắt lưng, phụ kiện da...). ALT tốt: mô tả NGẮN GỌN " +
      "8–18 từ đúng vật thể thấy trong ảnh + loại da/màu nếu rõ + nhắc tên sản phẩm " +
      "tự nhiên; MỖI ảnh một alt KHÁC nhau theo góc/chi tiết; không nhồi từ khoá; " +
      "KHÔNG bịa thương hiệu/thông số không nhìn thấy; TUYỆT ĐỐI không đọc hay chép " +
      "tên riêng khắc trên sản phẩm. Chỉ trả JSON, không giải thích.";

    const dong = anh
      .map((a, i) => `Ảnh ${i + 1}: loại ${a.imageType}${a.altText ? `, alt hiện tại "${a.altText}"` : ""}`)
      .join("\n");
    const nguoiDung =
      `Sản phẩm: "${ten}". Có ${anh.length} ảnh theo thứ tự (ảnh 1..${anh.length}).\n` +
      `${dong}\n\n` +
      `Viết alt mới cho TỪNG ảnh. Trả JSON đúng dạng: {"alts": ["alt ảnh 1", ... "alt ảnh ${anh.length}"]} — ` +
      `đúng ${anh.length} phần tử, đúng thứ tự.`;

    const urls = anh.map((a) => a.url);
    const kq = await this.openai.sinhJson(heThong, nguoiDung, 1500, urls);
    const data = kq.dulieu as { alts?: unknown };
    const alts = Array.isArray(data?.alts) ? (data.alts as unknown[]) : null;
    if (!alts) {
      throw new BadRequestException(
        "AI trả về không đúng định dạng (thiếu mảng alts). Thử lại.",
      );
    }

    const goiY = anh.map((a, i) => ({
      imageId: a.id,
      url: a.url,
      thumbnailUrl: a.thumbnailUrl,
      imageType: a.imageType,
      altCu: a.altText ?? "",
      altMoi: typeof alts[i] === "string" ? (alts[i] as string).trim() : "",
    }));

    return {
      productId,
      tenSP: ten,
      model: kq.model,
      soAnhDaXem: kq.soAnhDaXem,
      soAnh: anh.length,
      caveat:
        anh.length === MAX_ANH_SINH
          ? `Chỉ sinh cho ${MAX_ANH_SINH} ảnh đầu; nếu SP có nhiều hơn, sinh lại lượt sau.`
          : null,
      goiY,
    };
  }

  async apDungAlt(items: { imageId: string; altText: string }[]) {
    const ket: { imageId: string; ok: boolean; loi?: string }[] = [];
    for (const it of items) {
      try {
        await this.media.updateImageMetadata(it.imageId, {
          altText: it.altText.trim(),
        });
        ket.push({ imageId: it.imageId, ok: true });
      } catch (e) {
        ket.push({
          imageId: it.imageId,
          ok: false,
          loi: e instanceof Error ? e.message : "lỗi",
        });
      }
    }
    return { soDaGhi: ket.filter((k) => k.ok).length, ket };
  }
}
