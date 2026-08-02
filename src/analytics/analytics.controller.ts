import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { AnalyticsService } from "./analytics.service";

/**
 * Đường ghi nhận lượt xem — CÔNG KHAI.
 *
 * Phải nằm dưới tiền tố /shop vì AuthGuard chỉ allowlist nhóm đó cho khách
 * vãng lai. Đặt ở /analytics/track thì mọi lượt xem của khách sẽ bị chặn 401
 * và bảng luôn rỗng.
 */
@ApiTags("Shop (storefront công khai)")
@Controller("shop")
export class AnalyticsTrackController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Post("track")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Ghi một lượt xem trang (ẩn danh)" })
  async track(
    @Body() body: { path?: string; referrer?: string | null; ping?: boolean },
    @Req() req: Request,
  ): Promise<void> {
    // Sau Vercel/Cloudflare thì req.ip là IP của proxy, không phải của khách.
    // x-forwarded-for là chuỗi "khach, proxy1, proxy2" — phần tử ĐẦU mới là khách.
    const xff = (req.headers["x-forwarded-for"] as string) || "";
    const ip = xff.split(",")[0].trim() || req.ip || "0.0.0.0";

    try {
      await this.analytics.track({
        path: body?.path || "/",
        referrer: body?.referrer ?? null,
        ip,
        ua: (req.headers["user-agent"] as string) || "",
        host: (req.headers["host"] as string) || "",
        // Nhịp tim: khách vẫn đang mở trang cũ. Chỉ làm tươi "đang online",
        // không tính thêm một lượt xem.
        ping: body?.ping === true,
      });
    } catch {
      // Nuốt lỗi: hỏng thống kê thì kệ, tuyệt đối không để nó làm lỗi hiện ra
      // trên trang của khách. 204 dù có chuyện gì.
    }
  }
}

/**
 * Đường đọc số liệu — CHỈ ADMIN.
 *
 * Tách controller riêng, KHÔNG nằm dưới /shop, để AuthGuard khoá lại. Gộp
 * chung với đường ghi ở trên là vô tình phơi toàn bộ số liệu kinh doanh cho
 * bất kỳ ai gọi đúng địa chỉ.
 */
@ApiTags("Analytics (admin)")
@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analytics: AnalyticsService) {}

  @Get("summary")
  @ApiOperation({ summary: "Tổng quan lưu lượng theo khoảng ngày" })
  summary(@Query("days") days?: string) {
    return this.analytics.summary(Number(days) || 30);
  }

  @Get("realtime")
  @ApiOperation({ summary: "Khách đang ở trên web ngay lúc này" })
  realtime() {
    return this.analytics.realtime();
  }
}
