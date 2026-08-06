import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Res,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { AdsService } from "./ads.service";

/**
 * Đường ghi nhận cú bấm quảng cáo — CÔNG KHAI.
 *
 * Phải nằm dưới tiền tố /shop vì AuthGuard chỉ allowlist nhóm đó cho khách
 * vãng lai. Đặt ở /ads/... thì mọi cú bấm quảng cáo của khách bị chặn 401 và
 * gclid mất sạch — mà gclid mất là mất vĩnh viễn, không lấy lại được.
 *
 * Cũng phải là /shop vì lý do thứ hai: koi-domain-router chỉ đẩy vài tiền tố
 * (/shop, /analytics, /admin...) về API này, mọi đường khác đi sang storefront.
 * Thêm tiền tố mới là phải sửa và deploy thêm một repo nữa.
 */
@ApiTags("Shop (storefront công khai)")
@Controller("shop")
export class AdsTrackController {
  constructor(private readonly ads: AdsService) {}

  @Post("ad-click")
  @ApiOperation({ summary: "Khách vừa vào từ quảng cáo — trả về mã ngắn" })
  async adClick(
    @Body()
    body: {
      gclid?: string;
      gbraid?: string;
      wbraid?: string;
      landingPath?: string;
    },
  ): Promise<{ token: string | null }> {
    // Không có mã nào của Google thì không phải khách quảng cáo — đừng đẻ dòng
    // rác. Storefront cũng đã lọc, đây là lớp chặn thứ hai.
    if (!body?.gclid && !body?.gbraid && !body?.wbraid) {
      return { token: null };
    }
    try {
      return await this.ads.ghiNhanBam(body);
    } catch {
      // Hỏng thì trả null, storefront sẽ không chèn mã vào tin nhắn. Thà mất
      // một dòng đo đạc còn hơn để lỗi hiện lên trang của khách.
      return { token: null };
    }
  }

  @Post("ad-contact")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Khách vừa bấm nút Zalo/Messenger/Gọi — tính luôn là chuyển đổi",
  })
  async adContact(
    @Body() body: { token?: string; channel?: string; productName?: string },
  ): Promise<void> {
    if (!body?.token) return;
    try {
      await this.ads.ghiNhanLienHe({
        token: body.token,
        channel: body.channel ?? null,
        productName: body.productName ?? null,
      });
    } catch {
      // Nuốt lỗi: 204 dù có chuyện gì. Nút Zalo phải luôn chạy.
    }
  }
}

/**
 * Đường đọc và sửa số liệu — CHỈ ADMIN.
 *
 * Nằm dưới /analytics chứ không phải /ads: AuthGuard khoá mọi thứ ngoài /shop
 * nên bảo mật thì tiền tố nào cũng được, NHƯNG koi-domain-router chỉ chuyển
 * tiếp danh sách tiền tố cố định về API này. /analytics đã có trong danh sách;
 * /ads thì chưa, dùng nó là phải sửa và deploy thêm repo router.
 */
@ApiTags("Analytics (admin)")
@Controller("analytics")
export class AdsAdminController {
  constructor(private readonly ads: AdsService) {}

  @Get("ads")
  @ApiOperation({ summary: "Danh sách cú bấm quảng cáo" })
  danhSach(@Query("days") days?: string) {
    return this.ads.danhSach(Number(days) || 90);
  }

  @Get("ads/lookup")
  @ApiOperation({ summary: "Tra một mã lấy từ hộp thoại Zalo" })
  tra(@Query("token") token: string) {
    return this.ads.tra(token || "");
  }

  @Post("ads/convert")
  @ApiOperation({ summary: "Đánh dấu một mã đã chốt đơn + giá trị VND" })
  chot(
    @Body()
    body: {
      token: string;
      value?: number | string | null;
      note?: string | null;
      convertedAt?: string | null;
    },
  ) {
    return this.ads.danhDauChot(body);
  }

  /**
   * Tải file CSV để đưa lên Google Ads.
   *
   * GET chứ không POST dù có ghi (đánh dấu đã xuất): trình duyệt chỉ tải file
   * được bằng cách mở một địa chỉ, mà fetch rồi dựng blob thì mất header
   * Authorization... nên vẫn phải fetch. Xem hàm tải ở public/index.html.
   *
   * BOM ﻿ ở đầu: không có nó thì Excel bản Việt mở file ra tiếng Việt
   * thành ký tự rác. Google bỏ qua BOM nên vô hại với việc tải lên.
   *
   * lai=1: xuất lại cả những đơn đã tải lên rồi. Chỉ dùng khi Google báo lỗi
   * và file lần trước KHÔNG vào được — bình thường tải trùng là Google cộng dồn
   * thành hai chuyển đổi.
   */
  @Get("ads/export.csv")
  @Header("Content-Type", "text/csv; charset=utf-8")
  @Header("Content-Disposition", 'attachment; filename="koi-google-ads.csv"')
  @ApiOperation({ summary: "Xuất CSV chuyển đổi cho Google Ads" })
  async xuat(
    @Res({ passthrough: true }) res: Response,
    @Query("name") name?: string,
    @Query("lai") lai?: string,
  ): Promise<string> {
    const { csv, dangCho } = await this.ads.xuatCsv(name || "Zalo Sale", lai === "1");

    // Số dòng đang chờ đủ 24 giờ, gửi qua header vì thân phản hồi là tệp CSV
    // chứ không phải JSON. Không có con số này thì phía admin chỉ biết "rỗng"
    // và buộc phải báo "hết đơn mới" — sai, và làm chủ tiệm tưởng quảng cáo
    // không ra khách nào. Expose-Headers vì admin gọi khác tên miền.
    res.setHeader("X-Koi-Dang-Cho", String(dangCho));
    res.setHeader("Access-Control-Expose-Headers", "X-Koi-Dang-Cho");

    // Không đơn nào mới: trả rỗng hẳn. Dán BOM vào là thành file 3 byte, phía
    // admin thấy blob.size > 0 nên tưởng tải được và báo thành công.
    if (!csv) return "";
    return `﻿${csv}`;
  }
}
