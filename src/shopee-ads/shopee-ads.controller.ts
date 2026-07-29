import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  Req,
  Header,
  HttpCode,
  HttpStatus,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ShopeeAdsService } from './shopee-ads.service';
import { ShopeeCredentialService } from './shopee-ads.credentials';
import { ShopeeAdsAdminGuard } from './shopee-ads.guard';
import { ExchangeCodeDto, SaveShopeeConfigDto } from './dto/shopee-config.dto';

/**
 * Mọi endpoint ở đây đều là dữ liệu kinh doanh nội bộ (chi phí, GMV, ROAS).
 *
 * UseGuards ở cấp controller nên áp cho CẢ các route GET — cố ý làm vậy vì
 * AuthGuard toàn cục cho GET đi qua tự do (xem shopee-ads.guard.ts).
 */
@ApiTags('Shopee Ads')
@ApiBearerAuth()
@UseGuards(ShopeeAdsAdminGuard)
@Controller('shopee-ads')
export class ShopeeAdsController {
  constructor(
    private readonly service: ShopeeAdsService,
    private readonly credentials: ShopeeCredentialService,
  ) {}

  /**
   * Nhận '25', '25%' hoặc '0.25' -> 0.25.
   * Tỷ lệ lợi nhuận gộp sau phí sàn, dùng để tính điểm hoà vốn ROAS = 1/margin.
   */
  private parseMargin(raw?: string): number | null {
    if (raw === undefined || raw === null || raw === '') return null;
    const s = String(raw).trim().replace(/%$/, '');
    const f = Number(s);
    if (!isFinite(f) || f <= 0) {
      throw new BadRequestException('margin phải là số dương, ví dụ 25 hoặc 0.25');
    }
    const ratio = f > 1 ? f / 100 : f;
    if (ratio >= 1) {
      throw new BadRequestException('margin phải nhỏ hơn 100%');
    }
    return ratio;
  }

  private parseDays(raw?: string): number {
    const n = Number(raw ?? 30);
    if (!isFinite(n) || n < 1) return 30;
    // Chặn trần để một request không quét cả năm dữ liệu.
    return Math.min(Math.floor(n), 180);
  }

  @Get('audit')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({
    summary: 'Báo cáo audit Shopee Ads (đọc từ dữ liệu đã sync trong DB)',
  })
  @ApiQuery({ name: 'days', required: false, example: 30 })
  @ApiQuery({ name: 'margin', required: false, example: '25', description: 'Lợi nhuận gộp sau phí sàn' })
  audit(@Query('days') days?: string, @Query('margin') margin?: string) {
    return this.service.audit(this.parseDays(days), this.parseMargin(margin));
  }

  @Get('status')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Trạng thái cấu hình + lần sync gần nhất' })
  async status() {
    const result = await this.service.audit(7, null);
    return {
      configured: result.configured,
      authorized: result.authorized,
      sync: result.sync,
      hasData: result.period.days > 0,
    };
  }

  // -------------------------------------------------------------------------
  // CẤU HÌNH CREDENTIAL
  // -------------------------------------------------------------------------

  /**
   * Trạng thái khai báo. KHÔNG trả partner_key hay token về client —
   * chỉ trả dạng đã che (**** + 4 ký tự cuối) để admin đối chiếu.
   */
  @Get('config')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Trạng thái khai báo Shopee (giá trị bí mật đã che)' })
  config() {
    return this.credentials.status();
  }

  @Post('config')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Lưu Partner ID / Partner Key / Shop ID (mã hoá vào DB)' })
  saveConfig(@Body() dto: SaveShopeeConfigDto, @Req() req: any) {
    return this.credentials.saveConfig({
      partnerId: dto.partnerId,
      partnerKey: dto.partnerKey.trim(),
      shopId: dto.shopId,
      env: dto.env || 'live',
      updatedBy: req.user?.email || 'unknown',
    });
  }

  @Delete('config')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Xoá credential Shopee đã lưu' })
  async clearConfig(@Req() req: any) {
    await this.credentials.clear(req.user?.email || 'unknown');
    return { ok: true };
  }

  /**
   * Link uỷ quyền để chủ shop bấm đồng ý.
   *
   * `redirect` do server tự dựng từ Origin/Host của request, không nhận từ body:
   * nếu để client truyền vào thì đây thành open redirect, và `code` của Shopee
   * có thể bị đẩy sang domain lạ.
   */
  @Get('auth-url')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Tạo link uỷ quyền shop Shopee' })
  async authUrl(@Req() req: any) {
    const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'https')
      .toString()
      .split(',')[0]
      .trim();
    const host = (req.headers['x-forwarded-host'] || req.headers.host || '')
      .toString()
      .split(',')[0]
      .trim();
    if (!host) {
      throw new BadRequestException('Không xác định được domain để làm redirect URL.');
    }
    const redirect = `${proto}://${host}/admin/shopee-ads`;
    return { url: await this.credentials.buildAuthUrl(redirect), redirect };
  }

  /**
   * Đổi `code` (Shopee trả về qua query khi redirect) thành token.
   *
   * Làm bằng POST có JWT admin thay vì endpoint callback công khai: callback
   * public sẽ cho bất kỳ ai gọi được cũng ghi đè token của shop.
   */
  @Post('exchange-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Đổi code uỷ quyền thành access_token và lưu vào DB' })
  exchangeCode(@Body() dto: ExchangeCodeDto) {
    return this.credentials.exchangeCode(dto.code.trim(), dto.shopId);
  }

  /**
   * Sync chạy bằng POST vì nó gọi Shopee API và ghi DB.
   * Mặc định 7 ngày: một lượt 30 ngày dễ vượt giới hạn 30s của Vercel, nên
   * lịch chạy hằng ngày chỉ cần cập nhật cửa sổ gần nhất.
   */
  @Post('sync')
  @ApiOperation({ summary: 'Lấy số liệu mới từ Shopee và ghi vào DB' })
  @ApiQuery({ name: 'days', required: false, example: 7 })
  sync(@Query('days') days?: string) {
    const n = Number(days ?? 7);
    const safe = !isFinite(n) || n < 1 ? 7 : Math.min(Math.floor(n), 60);
    return this.service.sync(safe);
  }
}
