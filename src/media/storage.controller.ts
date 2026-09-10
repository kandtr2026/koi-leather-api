import { Controller, Get, Header } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Hạn mức dung lượng của dự án Supabase.
 *
 * ⚠️ SỬA 10/09/2026: trước đây file này đóng đinh gói **Free / 500 MB**, trong
 * khi dự án KOI chạy gói **Pro**. Chip dung lượng trong admin vì thế báo sai
 * nặng — 337 MB thật hiện thành 67% "sắp đầy", đúng ra chỉ hơn 4%.
 *
 * Pro cấp sẵn **8 GB đĩa** mỗi dự án (vượt thì $0.125/GB) và tự nới thêm 50%
 * khi chạm 90%. Free chỉ 500 MB. Kho ảnh KHÔNG tính vào đây: file storage là
 * hạn mức riêng, Pro cho 100 GB.
 *
 * Để env đè được, vì gói có thể đổi mà mã thì không ai nhớ sửa:
 *   SUPABASE_PLAN=Pro|Free|...   SUPABASE_DB_LIMIT_GB=8
 *
 * ⚠️ pg_database_size đo **database size**, còn 8 GB kia là **disk size** —
 * đĩa còn chứa WAL và log hệ thống nên luôn lớn hơn. Con số ở đây là ước lượng
 * dễ hiểu cho người dùng, không phải hoá đơn.
 */
const GB = 1024 * 1024 * 1024;
const MAC_DINH_PLAN = "Pro";
const MAC_DINH_LIMIT_BYTES = 8 * GB;

function planHienTai(): string {
  return process.env.SUPABASE_PLAN?.trim() || MAC_DINH_PLAN;
}

function limitBytes(): number {
  const raw = Number(process.env.SUPABASE_DB_LIMIT_GB);
  // Number('') === 0 nên phải chặn cả 0 lẫn số âm, không chỉ NaN.
  return Number.isFinite(raw) && raw > 0 ? Math.round(raw * GB) : MAC_DINH_LIMIT_BYTES;
}

function pct(used: number, limit: number): number {
  if (!limit || limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 1000) / 10);
}

/**
 * Nhớ tạm kết quả trong tiến trình.
 *
 * VÌ SAO: chip này chỉ để liếc, nhưng mỗi lần mở admin là SPA bắn một loạt yêu
 * cầu cùng lúc (products, categories, image-categories, material-categories,
 * storage/*). Pooler Supabase chạy session mode với pool nhỏ, nên cái xui nhất
 * trong loạt đó dễ ăn lỗi hết kết nối — và chip hiện chữ "Lỗi" trong khi phần
 * còn lại của trang vẫn nạp bình thường. Đo một lần rồi dùng lại 5 phút thì
 * gần như không còn chen vào loạt đó nữa.
 */
const CACHE_MS = 5 * 60 * 1000;
let cache: { luc: number; usedBytes: number; dbName: string | null } | null = null;

@ApiTags("Storage")
@Controller("storage")
export class StorageController {
  constructor(private readonly prisma: PrismaService) {}

  @Get("database")
  @Header("Cache-Control", "public, max-age=300")
  @ApiOperation({
    summary: "Supabase Postgres database size vs Free plan 500 MB cap",
  })
  async database() {
    const limit = limitBytes();

    if (cache && Date.now() - cache.luc < CACHE_MS) {
      return this.traLoi(cache.usedBytes, cache.dbName, limit);
    }

    try {
      // pg_database_size = tổng dung lượng DB hiện tại (mọi schema).
      const rows = await this.prisma.$queryRaw<
        { size: bigint; name: string }[]
      >`SELECT pg_database_size(current_database()) AS size, current_database() AS name`;
      const usedBytes = Number(rows?.[0]?.size ?? 0);
      const dbName = rows?.[0]?.name ?? null;
      cache = { luc: Date.now(), usedBytes, dbName };
      return this.traLoi(usedBytes, dbName, limit);
    } catch (e: any) {
      // Ghi log: trước đây lỗi bị nuốt gọn vào JSON, nhìn Vercel logs không
      // thấy gì nên không ai biết vì sao chip báo "Lỗi".
      console.error("[storage/database] đo dung lượng thất bại:", e?.message);

      // Còn số cũ (dù đã quá hạn) thì hiện số cũ, hơn là quăng chữ "Lỗi" —
      // dung lượng database không nhảy trong vài phút.
      if (cache) return this.traLoi(cache.usedBytes, cache.dbName, limit, true);

      return {
        configured: true,
        provider: "Supabase",
        plan: planHienTai(),
        error: e?.message || "Không lấy được dung lượng database",
      };
    }
  }

  private traLoi(
    usedBytes: number,
    dbName: string | null,
    limit: number,
    soCu = false,
  ) {
    return {
      configured: true,
      provider: "Supabase",
      dbName,
      plan: planHienTai(),
      soCu,
      storage: {
        usedBytes,
        limitBytes: limit,
        usedPct: pct(usedBytes, limit),
      },
    };
  }

  @Get("usage")
  @Header("Cache-Control", "public, max-age=300")
  @ApiOperation({
    summary: "Đã ngừng dùng Cloudinary (ảnh nay ở Supabase Storage)",
  })
  usage() {
    // Cloudinary đã gỡ 09/2026 — ảnh sản phẩm chuyển hết về Supabase Storage.
    return {
      configured: false,
      reason: "Đã ngừng dùng Cloudinary — ảnh nay ở Supabase Storage.",
    };
  }
}
