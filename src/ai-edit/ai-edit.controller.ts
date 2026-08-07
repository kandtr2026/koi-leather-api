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
  SinhDto,
  TraLinkDto,
} from "./dto/ai-edit.dto";

/**
 * Sửa câu chữ toàn site bằng AI — CHỈ ADMIN.
 *
 * VÌ SAO NẰM DƯỚI /analytics CHỨ KHÔNG PHẢI /ai-edit:
 * koi-domain-router (api/index.js, hàm targetFor) chỉ đẩy một danh sách tiền tố
 * cố định về API này; mọi đường khác đi sang storefront Next.js. /analytics đã có
 * trong danh sách, /ai-edit thì chưa — dùng tiền tố mới là mọi lời gọi từ
 * koileather.com/admin trả về trang 404 của storefront, và phải sửa rồi deploy
 * thêm một repo nữa. Cùng lý do với AdsAdminController (ads.controller.ts:191).
 *
 * VÌ SAO MỌI ĐƯỜNG NẶNG ĐỀU LÀ POST, KỂ CẢ ĐƯỜNG CHỈ ĐỌC:
 * AuthGuard có công tắc PUBLIC_VIEW=1 (auth.guard.ts:65) mở TOÀN BỘ phần GET cho
 * khách vãng lai — biến đó sinh ra để mở nội dung cửa hàng, và sẽ có ngày ai đó
 * bật nó lên vì lý do chính đáng. Nhưng POST/PUT/PATCH/DELETE thì guard đòi
 * Bearer hợp lệ trong MỌI trường hợp, không có công tắc nào bỏ qua được.
 * Nên:
 *  · /generate là POST vì nó TIÊU TIỀN THẬT trong tài khoản OpenAI của chủ shop.
 *    Là GET thì hôm PUBLIC_VIEW bật lên, người ngoài gọi vòng lặp là hết hạn mức.
 *  · /resolve là POST vì nó nhận link dài và trả nguyên văn nội dung bản ghi.
 *  · /apply, /revert là POST vì chúng GHI vào nội dung đang chạy trên site.
 * Chỉ /status và /history là GET, và cả hai vẫn tự đòi đăng nhập ở dòng đầu.
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

  @Get("ai-edit/status")
  @ApiOperation({
    summary: "Máy chủ đã có key OpenAI chưa, đang dùng model nào",
  })
  trangThai(@Req() req: Request) {
    this.doiAdmin(req);
    // Chỉ trả CÓ/KHÔNG và tên model. Không bao giờ trả key, không trả cả một
    // phần key: bốn ký tự cuối cũng là bốn ký tự người ngoài không cần biết.
    return this.svc.trangThai();
  }

  @Post("ai-edit/resolve")
  @ApiOperation({ summary: "Dán link → ra bản ghi và nội dung hiện tại" })
  tra(@Body() dto: TraLinkDto) {
    return this.svc.tra(dto.link);
  }

  @Post("ai-edit/generate")
  @ApiOperation({ summary: "Gọi AI viết lại — CHƯA ghi vào cơ sở dữ liệu" })
  sinh(@Body() dto: SinhDto) {
    return this.svc.sinh(dto.link, dto.yeuCau, dto.truongChon);
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
