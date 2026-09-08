import { Controller, Get, Header } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { PrismaService } from "../prisma/prisma.service";

// Supabase Free plan cap: 500 MB Postgres database (storage bucket 1 GB tính
// riêng). Ảnh sản phẩm nay nằm trên Supabase Storage (bucket products).
const SUPABASE_FREE_DB_LIMIT_BYTES = 500 * 1024 * 1024;

function pct(used: number, limit: number): number {
  if (!limit || limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 1000) / 10);
}

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
    try {
      // pg_database_size = tổng dung lượng DB hiện tại (mọi schema). Đây là
      // con số Supabase tính vào hạn mức 500 MB của gói Free.
      const rows = await this.prisma.$queryRaw<
        { size: bigint; name: string }[]
      >`SELECT pg_database_size(current_database()) AS size, current_database() AS name`;
      const usedBytes = Number(rows?.[0]?.size ?? 0);
      const dbName = rows?.[0]?.name ?? null;

      return {
        configured: true,
        provider: "Supabase",
        dbName,
        plan: "Free",
        storage: {
          usedBytes,
          limitBytes: SUPABASE_FREE_DB_LIMIT_BYTES,
          usedPct: pct(usedBytes, SUPABASE_FREE_DB_LIMIT_BYTES),
        },
      };
    } catch (e: any) {
      return {
        configured: true,
        provider: "Supabase",
        error: e?.message || "Không lấy được dung lượng database",
      };
    }
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
