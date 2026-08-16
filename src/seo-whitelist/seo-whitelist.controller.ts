import { Controller, Get, Post, Query, Req, Body, UnauthorizedException } from "@nestjs/common";
import { ApiOperation } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { createHash, timingSafeEqual } from "node:crypto";
import type { Request } from "express";
import { SeoWhitelistService } from "./seo-whitelist.service";
import { SeoReviewDto } from "./dto/seo-review.dto";

/**
 * Whitelist SEO: từ khoá Ads đã cắn tiền được GPT review để chọn ra từ đáng
 * làm SEO (organic). Hai đường cron tự kiểm CRON_SECRET như ads/cron/sweep —
 * AuthGuard có allowlist đúng 2 đường để request đi qua (xem auth.guard.ts).
 */
@Controller("analytics")
export class SeoWhitelistController {
  constructor(private readonly seo: SeoWhitelistService) {}

  @Get("seo/whitelist")
  @ApiOperation({
    summary: "Whitelist SEO hiện tại, mỗi từ kèm snapshot metric mới nhất",
  })
  whitelist(@Query("trangThai") trangThai?: string) {
    return this.seo.layWhitelist(trangThai);
  }

  @Get("seo/metrics")
  @ApiOperation({ summary: "Snapshot metric từ khoá gần đây (debug)" })
  metrics(@Query("days") days?: string) {
    return this.seo.layMetrics(Number(days) || 7);
  }

  /** Chạy review bằng tay — gọi GPT nên tốn phí OpenAI nhỏ, giới hạn 10 lần/phút. */
  @Post("seo/review")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({
    summary: "Chạy AI review từ khoá đã cắn tiền (ids rỗng = tự chọn diện)",
  })
  review(@Body() body: SeoReviewDto) {
    return this.seo.review(body.ids);
  }

  @Get("seo/cron/snapshot")
  @ApiOperation({ summary: "Cron hằng ngày: snapshot metric từ khoá vào KoiKeywordMetric" })
  async cronSnapshot(@Req() req: Request) {
    this.kiemCronSecret(req);
    return this.seo.snapshot();
  }

  @Get("seo/cron/review")
  @ApiOperation({ summary: "Cron hằng ngày: review diện từ khoá mới cắn tiền" })
  async cronReview(@Req() req: Request) {
    this.kiemCronSecret(req);
    return this.seo.review(undefined);
  }

  // ─── Helpers (copy pattern ads.controller.ts — kiemCronSecret) ───────────

  /** Kiểm CRON_SECRET, nhận x-cron-secret hoặc Authorization: Bearer. */
  private kiemCronSecret(req: Request): void {
    const mong = process.env.CRON_SECRET || "";
    if (!mong) {
      throw new UnauthorizedException("Chưa cấu hình CRON_SECRET");
    }
    const auth = req.headers.authorization || "";
    const nhan =
      (req.headers["x-cron-secret"] as string) ||
      (auth.startsWith("Bearer ") ? auth.slice(7) : "");
    if (!nhan || !this.bangNhauBam(nhan, mong)) {
      throw new UnauthorizedException("Sai CRON_SECRET");
    }
  }

  private bangNhauBam(a: string, b: string): boolean {
    return timingSafeEqual(
      createHash("sha256").update(a, "utf8").digest(),
      createHash("sha256").update(b, "utf8").digest(),
    );
  }
}