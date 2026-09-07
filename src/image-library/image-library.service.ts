import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { QueryImagesDto } from "./dto/query-images.dto";

// Cot tra ve cho luoi anh — chi lay du dung, khong keo ca bang KoiImageVision.
const SELECT_LIST = {
  id: true,
  url: true,
  nguon: true,
  bucket: true,
  spSlug: true,
  spTen: true,
  danhMuc: true,
  postSlugs: true,
  laBiaBai: true,
  phanLoai: true,
  coLogoKoi: true,
  coDauTen: true,
  laLifestyle: true,
  width: true,
  height: true,
  tyLe: true,
  coTep: true,
  altGoiY: true,
  noiDungHash: true,
};

const SELECT_MINI = {
  id: true,
  url: true,
  spSlug: true,
  spTen: true,
  nguon: true,
};

function bat(v?: string): boolean {
  return v === "true" || v === "1" || v === "on";
}

@Injectable()
export class ImageLibraryService {
  constructor(private prisma: PrismaService) {}

  /** Tập hash của các nhóm ảnh trùng (count > 1). Dùng cho lọc `trung`. */
  private async hashTrung(): Promise<string[]> {
    const nhom = await this.prisma.koiImageVision.groupBy({
      by: ["noiDungHash"],
      where: { noiDungHash: { not: null } },
      _count: { noiDungHash: true },
      having: { noiDungHash: { _count: { gt: 1 } } },
    });
    return nhom
      .map((g) => g.noiDungHash)
      .filter((h): h is string => h !== null);
  }

  async stats() {
    const [
      tong,
      theoNguonRaw,
      theoLoaiRaw,
      watermark,
      khacTen,
      lifestyle,
      chuaGan,
      nhomTrung,
    ] = await Promise.all([
      // Reads thuần, không cần transaction. Dùng Promise.all thay $transaction
      // vì gộp nhiều groupBy dị kiểu vào $transaction làm Prisma nới rộng kiểu
      // _count thành union (mất _all/noiDungHash cụ thể).
      this.prisma.koiImageVision.count(),
      this.prisma.koiImageVision.groupBy({
        by: ["nguon"],
        _count: { _all: true },
      }),
      this.prisma.koiImageVision.groupBy({
        by: ["loaiBanGhi"],
        _count: { _all: true },
      }),
      this.prisma.koiImageVision.count({ where: { coLogoKoi: true } }),
      this.prisma.koiImageVision.count({ where: { coDauTen: true } }),
      this.prisma.koiImageVision.count({ where: { laLifestyle: true } }),
      this.prisma.koiImageVision.count({
        where: { spId: null, postSlugs: { isEmpty: true } },
      }),
      this.prisma.koiImageVision.groupBy({
        by: ["noiDungHash"],
        where: { noiDungHash: { not: null } },
        _count: { noiDungHash: true },
        having: { noiDungHash: { _count: { gt: 1 } } },
      }),
    ]);

    const trung = nhomTrung.reduce((s, g) => s + g._count.noiDungHash, 0);

    return {
      tong,
      theoNguon: theoNguonRaw
        .map((r) => ({ nguon: r.nguon, so: r._count._all }))
        .sort((a, b) => b.so - a.so),
      theoLoai: theoLoaiRaw
        .map((r) => ({ loai: r.loaiBanGhi, so: r._count._all }))
        .sort((a, b) => b.so - a.so),
      watermark,
      khacTen,
      lifestyle,
      chuaGan,
      trung,
    };
  }

  async danhSach(dto: QueryImagesDto) {
    const page = dto.page && dto.page > 0 ? dto.page : 1;
    const pageSize =
      dto.pageSize && dto.pageSize > 0 ? Math.min(dto.pageSize, 120) : 60;

    const where: any = {};
    if (dto.nguon) where.nguon = dto.nguon;
    if (dto.loai) where.loaiBanGhi = dto.loai;
    if (dto.danhMuc) where.danhMuc = dto.danhMuc;
    if (dto.spSlug) where.spSlug = dto.spSlug;
    if (dto.phanLoai) where.phanLoai = dto.phanLoai;
    if (bat(dto.watermark)) where.coLogoKoi = true;
    if (bat(dto.khacTen)) where.coDauTen = true;
    if (bat(dto.biaBai)) where.laBiaBai = true;
    if (bat(dto.lifestyle)) where.laLifestyle = true;
    if (bat(dto.chuaGan)) {
      where.spId = null;
      where.postSlugs = { isEmpty: true };
    }
    if (bat(dto.trung)) {
      const hashes = await this.hashTrung();
      // Rong -> khong khop gi (tranh tra ve toan bo khi khong co anh trung).
      where.noiDungHash = { in: hashes.length ? hashes : ["__khong_co__"] };
    }
    if (dto.q) {
      const q = dto.q.trim();
      if (q) {
        where.OR = [
          { spTen: { contains: q, mode: "insensitive" } },
          { spSlug: { contains: q, mode: "insensitive" } },
          { moTa: { contains: q, mode: "insensitive" } },
          { url: { contains: q, mode: "insensitive" } },
        ];
      }
    }

    let orderBy: any = { quetLuc: "desc" };
    if (dto.sort === "nangNhat")
      orderBy = { coTep: { sort: "desc", nulls: "last" } };
    else if (dto.sort === "to")
      orderBy = { width: { sort: "desc", nulls: "last" } };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.koiImageVision.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: SELECT_LIST,
      }),
      this.prisma.koiImageVision.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async chiTiet(id: string) {
    const row = await this.prisma.koiImageVision.findUnique({ where: { id } });
    if (!row) throw new NotFoundException("Không tìm thấy ảnh");

    let trungLap: unknown[] = [];
    if (row.noiDungHash) {
      trungLap = await this.prisma.koiImageVision.findMany({
        where: { noiDungHash: row.noiDungHash, id: { not: row.id } },
        select: SELECT_MINI,
        take: 50,
      });
    }
    return { ...row, trungLap };
  }

  async trungLap(dto: QueryImagesDto) {
    const page = dto.page && dto.page > 0 ? dto.page : 1;
    const pageSize =
      dto.pageSize && dto.pageSize > 0 ? Math.min(dto.pageSize, 100) : 30;

    const nhom = await this.prisma.koiImageVision.groupBy({
      by: ["noiDungHash"],
      where: { noiDungHash: { not: null } },
      _count: { noiDungHash: true },
      having: { noiDungHash: { _count: { gt: 1 } } },
      orderBy: { _count: { noiDungHash: "desc" } },
    });

    const total = nhom.length;
    const trang = nhom.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize);
    const groups = await Promise.all(
      trang.map(async (g) => ({
        hash: g.noiDungHash,
        so: g._count.noiDungHash,
        items: await this.prisma.koiImageVision.findMany({
          where: { noiDungHash: g.noiDungHash },
          select: SELECT_MINI,
          take: 12,
        }),
      })),
    );

    return { groups, total, page, pageSize };
  }
}
