import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
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

  /**
   * Ghi một cú bấm nút liên hệ. CÔNG KHAI, ẩn danh.
   *
   * Đường RIÊNG, không gộp vào /shop/ad-contact: đường đó là đường chuyển đổi
   * Google, gọi hụt là mất hẳn một chuyển đổi. Đường này hỏng thì chỉ mất số đo,
   * nên hai đường phải độc lập — storefront gọi cả hai khi khách quảng cáo bấm.
   *
   * 204 và nuốt lỗi y hệt track ở trên: khách đang chờ Zalo mở, không có lý do
   * gì để một lỗi thống kê chặn đường họ đi.
   */
  @Post("contact-click")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Ghi một cú bấm nút liên hệ (ẩn danh)" })
  async contactClick(
    @Body()
    body: {
      channel?: string;
      path?: string;
      referrer?: string | null;
      productName?: string | null;
      adToken?: string | null;
    },
    @Req() req: Request,
  ): Promise<void> {
    // Cùng cách lấy IP như track: sau proxy thì req.ip là IP của proxy, phần tử
    // đầu của x-forwarded-for mới là khách.
    const xff = (req.headers["x-forwarded-for"] as string) || "";
    const ip = xff.split(",")[0].trim() || req.ip || "0.0.0.0";

    try {
      await this.analytics.ghiCuBamLienHe({
        channel: body?.channel || "",
        path: body?.path || "/",
        referrer: body?.referrer ?? null,
        ip,
        ua: (req.headers["user-agent"] as string) || "",
        host: (req.headers["host"] as string) || "",
        productName: body?.productName ?? null,
        adToken: body?.adToken ?? null,
      });
    } catch {
      // Nuốt lỗi như trên.
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

  /**
   * Hành vi khách: nguồn dẫn khách, khách vào trang nào, đi tiếp đường nào.
   *
   * Phải nằm ở /analytics chứ KHÔNG phải /shop: auth.guard.ts:101 cho qua vô
   * điều kiện mọi đường bắt đầu bằng /shop, đặt sang đó là phơi toàn bộ số liệu
   * kinh doanh cho bất kỳ ai gọi đúng địa chỉ. Guard toàn cục đã gắn qua
   * APP_GUARD ở app.module.ts nên không cần @UseGuards ở đây.
   *
   * Kẹp `days` ngay tại cửa. KHÔNG copy mẫu `Number(days) || 30` của route
   * summary ở trên: mẫu đó không chặn số âm, days=-5 đi thẳng vào phép tính mốc
   * ngày và cho khoảng thời gian ở tương lai (bảng rỗng, nhìn như mất dữ liệu).
   * Math.trunc để days=1.9 không thả số thực xuống dưới.
   *
   * Service kẹp lại y hệt một lần nữa — cố ý trùng, vì service là hàm công khai
   * còn gọi từ chỗ khác và từ test, không dựa vào cửa này để an toàn.
   */
  @Get("hanh-vi")
  @ApiOperation({ summary: "Hành vi khách theo nguồn / giờ / đường đi" })
  hanhVi(@Query("days") days?: string) {
    const soNgay = Math.min(Math.max(Math.trunc(Number(days) || 7), 1), 90);
    return this.analytics.hanhVi(soNgay);
  }

  /**
   * Khách gần đây kèm IP và khu vực — tab "IP khách" của panel Heoiu.
   *
   * Nằm ở /analytics (chỉ admin) chứ KHÔNG phải /shop là điều kiện bắt buộc,
   * cùng lý do với /leads ở dưới: đường này phơi IP THÔ của khách, cho qua
   * auth.guard là phơi cho cả internet.
   *
   * Kẹp `days` và `limit` như hanh-vi; service kẹp lại y hệt một lần nữa —
   * cố ý trùng, vì service là hàm công khai còn gọi từ chỗ khác và từ test.
   */
  @Get("visitors")
  @ApiOperation({ summary: "Khách gần đây kèm IP và khu vực (chỉ admin)" })
  visitors(@Query("days") days?: string, @Query("limit") limit?: string) {
    const soNgay = Math.min(Math.max(Math.trunc(Number(days) || 7), 1), 90);
    const gioiHan = Math.min(Math.max(Math.trunc(Number(limit) || 50), 1), 200);
    return this.analytics.visitors(soNgay, gioiHan);
  }

  /**
   * Kênh liên hệ: khách bấm Zalo / Messenger / Gọi điện, và đến từ đâu.
   *
   * Không tự kiểm req.user, đi theo tiền lệ GET /analytics/ads: số ở đây là số
   * gộp, không có tên hay số điện thoại của ai. Guard toàn cục đã chặn ở cửa.
   *
   * Kẹp `days` như hanh-vi ở trên, và service kẹp lại một lần nữa — cố ý trùng.
   */
  @Get("kenh-lien-he")
  @ApiOperation({ summary: "Cú bấm nút liên hệ theo kênh và nguồn" })
  kenhLienHe(@Query("days") days?: string) {
    const soNgay = Math.min(Math.max(Math.trunc(Number(days) || 30), 1), 90);
    return this.analytics.kenhLienHe(soNgay);
  }

  /**
   * Danh sách khách để lại thông tin.
   *
   * Nằm ở /analytics chứ KHÔNG phải /shop là điều kiện an toàn bắt buộc, không
   * phải chuyện xếp cho gọn: auth.guard.ts:35 cho qua mọi đường bắt đầu bằng
   * /shop mà không cần đăng nhập. Chuyển đường này sang đó là phơi tên và số
   * điện thoại của mọi khách hàng cho bất kỳ ai gọi đúng địa chỉ.
   */
  @Get("leads")
  @ApiOperation({ summary: "Danh sách khách để lại thông tin (chỉ admin)" })
  leads(
    @Query("status") status?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string,
    @Query("days") days?: string,
  ) {
    // Kẹp `days` như hanh-vi ở trên; service kẹp lại y hệt một lần nữa — cố ý
    // trùng, vì service là hàm công khai còn gọi từ chỗ khác và từ test.
    const soNgay = days
      ? Math.min(Math.max(Math.trunc(Number(days) || 0), 0), 365)
      : undefined;
    return this.analytics.leads({
      status,
      limit: Number(limit) || undefined,
      offset: Number(offset) || undefined,
      days: soNgay,
    });
  }

  @Patch("leads/:id")
  @ApiOperation({ summary: "Đổi trạng thái hoặc ghi chú một lead" })
  async capNhatLead(
    @Param("id") id: string,
    @Body() body: { status?: string; note?: string | null },
  ) {
    const so = Number(id);
    if (!Number.isInteger(so) || so <= 0) {
      throw new BadRequestException("id không hợp lệ");
    }
    const kq = await this.analytics.capNhatLead(so, body ?? {});
    if (kq === "khong-thay") {
      throw new NotFoundException("Không tìm thấy lead");
    }
    if (!kq) {
      throw new BadRequestException(
        `Cần status thuộc [${AnalyticsService.TRANG_THAI_LEAD.join(", ")}] hoặc note`,
      );
    }
    return kq;
  }
}
