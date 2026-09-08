import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { AiEditService } from "./ai-edit.service";
import {
  ApDungDto,
  HoanTacDto,
  LichSuDto,
  TraLinkDto,
} from "./dto/ai-edit.dto";

/**
 * Sửa câu chữ nội dung site (bài viết/trang KoiBack) — CHỈ ADMIN.
 *
 * LƯU Ý: phần "viết lại bằng AI (GPT)" đã gỡ 09/2026 theo yêu cầu (khó dùng, sẽ
 * dựng lại kiểu khác sau). Còn lại là bộ sửa chữ THỦ CÔNG: dán link ra bản ghi
 * (/resolve), ghi chữ đã duyệt có lịch sử (/apply), hoàn tác (/revert) và xem
 * lịch sử (/history).
 *
 * VÌ SAO NẰM DƯỚI /analytics CHỨ KHÔNG PHẢI /ai-edit:
 * next.config.ts của storefront chỉ đẩy một danh sách tiền tố cố định về API này;
 * mọi đường khác đi sang trang Next.js. /analytics đã có trong danh sách, /ai-edit
 * thì chưa — dùng tiền tố mới là mọi lời gọi từ koileather.com/admin trả về trang
 * 404 của storefront. Cùng lý do với AdsAdminController (ads.controller.ts:191).
 *
 * VÌ SAO ĐƯỜNG GHI/ĐỌC-NẶNG ĐỀU LÀ POST:
 * AuthGuard có công tắc PUBLIC_VIEW=1 (auth.guard.ts:65) mở TOÀN BỘ phần GET cho
 * khách vãng lai. Nhưng POST/PUT/PATCH/DELETE thì guard đòi Bearer hợp lệ trong
 * MỌI trường hợp, không có công tắc nào bỏ qua được. Nên:
 *  · /resolve là POST vì nó nhận link dài và trả nguyên văn nội dung bản ghi.
 *  · /apply, /revert là POST vì chúng GHI vào nội dung đang chạy trên site.
 * Chỉ /history là GET, và nó vẫn tự đòi đăng nhập ở dòng đầu.
 */
@ApiTags("Analytics (admin)")
@Controller("analytics")
export class AiEditController {
  constructor(private readonly svc: AiEditService) {}

  /**
   * Chốt đăng nhập cho các đường GET, không phó cho guard.
   * Guard đã gắn request.user: Bearer hợp lệ thì là object, còn lại null — kể cả
   * khi PUBLIC_VIEW cho request đi qua.
   */
  private doiAdmin(req: Request): string {
    const user = (req as Request & { user?: { email?: string } }).user;
    if (!user) {
      throw new UnauthorizedException("Cần đăng nhập admin.");
    }
    return user.email || "";
  }

  private nguoiDung(req: Request): string {
    const user = (req as Request & { user?: { email?: string } }).user;
    return user?.email || "";
  }

  @Post("ai-edit/resolve")
  @ApiOperation({ summary: "Dán link → ra bản ghi và nội dung hiện tại" })
  tra(@Body() dto: TraLinkDto) {
    return this.svc.tra(dto.link);
  }

  @Post("ai-edit/apply")
  @ApiOperation({ summary: "Ghi chữ đã duyệt, có chụp bản gốc để hoàn tác" })
  apDung(@Req() req: Request, @Body() dto: ApDungDto) {
    return this.svc.apDung({
      kind: dto.kind,
      id: dto.id,
      path: dto.path ?? null,
      prompt: dto.prompt ?? null,
      model: dto.model ?? null,
      // Lấy từ token, KHÔNG lấy từ thân request: client tự khai được thành bất
      // kỳ ai, mà đây là cột duy nhất trả lời "ai đã sửa bài này".
      actor: this.nguoiDung(req),
      thayDoi: dto.thayDoi.map((t) => ({
        truong: t.truong,
        truoc: t.truoc ?? null,
        sau: t.sau ?? null,
      })),
    });
  }

  @Post("ai-edit/revert")
  @ApiOperation({ summary: "Trả một nhóm sửa về chữ gốc" })
  hoanTac(@Req() req: Request, @Body() dto: HoanTacDto) {
    return this.svc.hoanTac(dto.batch, this.nguoiDung(req), dto.buoc === true);
  }

  @Get("ai-edit/history")
  @ApiOperation({ summary: "Các lần sửa gần đây, gom theo nhóm" })
  lichSu(@Req() req: Request, @Query() q: LichSuDto) {
    this.doiAdmin(req);
    return this.svc.lichSu(q.gioiHan ?? 30);
  }
}
