import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
  ValidationPipe,
  UsePipes,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { createHash, timingSafeEqual } from "node:crypto";
import type { Request, Response } from "express";
import { AdsService } from "./ads.service";
import { KeywordPoolService } from "./keyword-pool.service";
import { SyncService } from "./sync.service";
import { LandingSeoService } from "./landing-seo.service";
import { AssignKeywordDto } from "./dto/assign-keyword.dto";
import { PushBulkDto } from "./dto/push-bulk.dto";
import { SyncPushDto } from "./dto/sync-push.dto";
import { AdClickDto, AdContactDto } from "./dto/public-ad.dto";
import { AnalyzeDto, LuuVerifiedDto, ScoreDto, SeodraftDto } from "./dto/landing-seo.dto";

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
  async adClick(@Body() body: AdClickDto): Promise<{ token: string | null }> {
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
  async adContact(@Body() dto: AdContactDto): Promise<void> {
    try {
      await this.ads.ghiNhanLienHe({
        token: dto.token,
        channel: dto.channel,
        productName: dto.productName ?? null,
      });
    } catch {
      // Nuốt lỗi: 204 dù có chuyện gì. Nút Zalo phải luôn chạy.
    }
  }

  /**
   * Tệp Google Ads TỰ TẢI mỗi ngày. Không ai phải bấm gì.
   *
   * VÌ SAO NẰM Ở /shop DÙ ĐÂY LÀ DỮ LIỆU RIÊNG. Không phải vì lười, mà vì
   * AuthGuard không dùng được cho đường này: auth.guard.ts:83 chỉ đọc header
   * dạng "Bearer <token>", còn Google Ads gửi HTTP Basic (user + mật khẩu) —
   * đó là kiểu xác thực DUY NHẤT nó hỗ trợ cho nguồn HTTPS. Để endpoint này ở
   * /analytics là guard chặn 401 trước khi mã trong hàm chạy, và không có cách
   * nào bảo Google gửi Bearer.
   *
   * Nên /shop để đi qua được guard (auth.guard.ts:35 mở toàn bộ tiền tố này),
   * rồi TỰ KIỂM Basic ngay dòng đầu hàm. Đường này bảo mật bằng chính nó, không
   * dựa vào guard, và phải đọc như vậy khi sửa về sau.
   *
   * KHOÁ CHẶT KHI THIẾU BIẾN MÔI TRƯỜNG. Chưa đặt ADS_FEED_USER/ADS_FEED_PASS
   * thì trả 401 hết. Mặc định phải là đóng: hớ chỗ này là toàn bộ gclid của
   * khách — dữ liệu quảng cáo, gắn được với hành vi từng người — phơi ra cho ai
   * gọi cũng đọc.
   *
   * ?ghi=1 MỚI ĐÓNG DẤU "đã gửi Google". Không có tham số đó thì chỉ đọc, không
   * ghi gì. Xem doc feedCsv để biết vì sao mặc định phải như vậy; ngắn gọn: địa
   * chỉ này bị mở ra xem bằng trình duyệt và bằng curl, mà mỗi lần xem lại đóng
   * dấu thì con số trên admin thành số bịa. Chỉ URL nạp vào lịch Google Ads mang
   * ghi=1 — trang admin dựng sẵn URL đó kèm nút chép.
   */
  @Get("ads-feed.csv")
  @Header("Content-Type", "text/csv; charset=utf-8")
  @Header("Cache-Control", "no-store")
  @Throttle({ default: { limit: 5, ttl: 60_000 } }) // 5 req/phút/IP
  @ApiOperation({
    summary: "Google Ads tự tải theo lịch (HTTP Basic, không phải Bearer)",
  })
  async feed(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Query("name") name?: string,
    @Query("ghi") ghi?: string,
  ): Promise<string> {
    this.kiemBasic(req, res);

    // BOM để Excel bản Việt mở ra không thành ký tự rác — chủ tiệm sẽ mở địa
    // chỉ này bằng mắt để kiểm. Google bỏ qua BOM nên vô hại với việc nó đọc.
    //
    // KHÔNG có nhánh "rỗng thì trả chuỗi rỗng" như bên xuat(): tệp trắng làm
    // Google coi lịch là hỏng rồi gắn cảnh báo. feedCsv luôn trả ít nhất hai
    // dòng tiêu đề, và đó là điều đúng.
    return `﻿${await this.ads.feedCsv(name || "Zalo Sale", ghi === "1")}`;
  }

  /**
   * Kiểm HTTP Basic. Ném 401 kèm WWW-Authenticate nếu không khớp.
   *
   * So sánh bằng timingSafeEqual trên bản băm SHA-256 chứ không phải `===`:
   *
   *  · `===` trên chuỗi thoát ra ngay ký tự đầu khác nhau, nên thời gian phản
   *    hồi tiết lộ mình đã đoán đúng mấy ký tự đầu. Đây là đường công khai, ai
   *    cũng gọi được bao nhiêu lần cũng được, nên đó là kênh rò rỉ thật.
   *  · Băm trước rồi mới so vì timingSafeEqual đòi hai buffer DÀI BẰNG NHAU —
   *    khác độ dài là nó ném lỗi, mà chính độ dài cũng là thứ không nên tiết lộ.
   *    SHA-256 cho ra 32 byte cố định, hết cả hai vấn đề.
   */
  private kiemBasic(req: Request, res: Response): void {
    const user = process.env.ADS_FEED_USER || "";
    const pass = process.env.ADS_FEED_PASS || "";

    const tuChoi = (): never => {
      // WWW-Authenticate là bắt buộc theo chuẩn cho phản hồi 401 Basic. Google
      // Ads không cần nó, nhưng trình duyệt thì có: nhờ header này chủ tiệm mở
      // địa chỉ feed lên là được hỏi user/mật khẩu ngay để tự kiểm.
      res.setHeader("WWW-Authenticate", 'Basic realm="KOI Ads Feed"');
      throw new UnauthorizedException("Sai thông tin đăng nhập feed");
    };

    if (!user || !pass) tuChoi();

    const h = req.headers.authorization || "";
    if (!h.startsWith("Basic ")) tuChoi();

    let giaiMa = "";
    try {
      giaiMa = Buffer.from(h.slice(6), "base64").toString("utf8");
    } catch {
      tuChoi();
    }

    // Chỉ tách ở dấu hai chấm ĐẦU TIÊN: mật khẩu được phép chứa dấu hai chấm,
    // và mật khẩu sinh tự động rất hay có. split(":") rồi lấy [1] là cắt mất
    // đuôi mật khẩu, thành ra mật khẩu đúng vẫn bị từ chối.
    const v = giaiMa.indexOf(":");
    if (v < 0) tuChoi();

    const okUser = this.bangNhau(giaiMa.slice(0, v), user);
    const okPass = this.bangNhau(giaiMa.slice(v + 1), pass);
    // Kiểm CẢ HAI rồi mới quyết định, không && ngắn mạch: thoát sớm khi sai user
    // là thời gian phản hồi lại nói cho người gọi biết họ sai ở ô nào.
    if (!okUser || !okPass) tuChoi();
  }

  private bangNhau(a: string, b: string): boolean {
    return timingSafeEqual(
      createHash("sha256").update(a, "utf8").digest(),
      createHash("sha256").update(b, "utf8").digest(),
    );
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
  constructor(
    private readonly ads: AdsService,
    private readonly landingSeo: LandingSeoService,
  ) {}

  @Get("ads")
  @ApiOperation({ summary: "Danh sách cú bấm quảng cáo" })
  // chiTiet=1 (heoiu panel koi-ads) bật phần gọi ra Google Ads API: chi phí kênh
  // theo kỳ + nối gclid → chữ khách gõ / từ khoá. Các nơi khác không truyền để
  // giữ phản hồi nhanh (bảng Liên hệ chỉ cần con số tổng).
  danhSach(@Query("days") days?: string, @Query("chiTiet") chiTiet?: string) {
    return this.ads.danhSach(Number(days) || 90, chiTiet === "1");
  }

  @Get("ads/lookup")
  @ApiOperation({ summary: "Tra một mã lấy từ hộp thoại Zalo" })
  tra(@Query("token") token: string) {
    return this.ads.tra(token || "");
  }

  /**
   * Ba thông tin để nạp vào lịch tự tải của Google Ads: địa chỉ, tên đăng nhập,
   * mật khẩu.
   *
   * CÓ, ĐƯỜNG NÀY TRẢ MẬT KHẨU RA. Cân nhắc kỹ rồi mới làm, và đây là lý do:
   *
   *  · Người gọi được đường này đã là admin đăng nhập — AuthGuard đòi Bearer
   *    cho mọi thứ dưới /analytics. Mà admin thì đã đọc được TOÀN BỘ dữ liệu mà
   *    mật khẩu này bảo vệ: từng gclid, từng cú bấm, từng lead. Nên trả nó ra
   *    không mở thêm cửa nào — chỉ hiện lại chìa của căn phòng người ta đang
   *    đứng trong.
   *  · Chủ tiệm BẮT BUỘC phải có mật khẩu để gõ vào Google Ads, đúng một lần.
   *    Không trả ở đây thì họ phải mở bảng điều khiển Vercel đi tìm — đúng cái
   *    việc tay mà cả bản này sinh ra để bỏ.
   *
   * Đổi lại phải giữ đúng hai điều kiện, sửa về sau đừng phá: đường này KHÔNG
   * BAO GIỜ được rời khỏi /analytics sang /shop, và trang admin không được ghi
   * mật khẩu vào localStorage hay URL.
   */
  @Get("ads/feed-config")
  @ApiOperation({ summary: "Thông tin nạp vào lịch tự tải của Google Ads" })
  feedConfig(@Req() req: Request, @Query("name") name?: string) {
    // TỰ ĐÒI ĐĂNG NHẬP, KHÔNG PHÓ CHO GUARD. Guard mặc định đã chặn mọi GET
    // dưới /analytics, nhưng nó có công tắc PUBLIC_VIEW=1 (auth.guard.ts:65) —
    // đặt biến đó là MỞ TOÀN BỘ PHẦN ĐỌC cho khách vãng lai. Biến ấy sinh ra để
    // mở nội dung cửa hàng, và một ngày nào đó sẽ có người bật nó lên vì lý do
    // hoàn toàn chính đáng; hôm đó mật khẩu feed phơi ra internet mà không ai
    // nghĩ tới đường này. Nên chốt riêng ở đây: mật khẩu chỉ ra khi CÓ admin
    // thật, bất kể guard đang mở hay khoá. Đúng một dòng, và nó đứng ngoài mọi
    // lần đổi cấu hình về sau.
    //
    // Guard đã gắn sẵn request.user cho mọi GET đi qua nó: có Bearer hợp lệ thì
    // là object, còn lại là null — kể cả khi PUBLIC_VIEW cho đi qua.
    if (!(req as Request & { user?: unknown }).user) {
      throw new UnauthorizedException("Cần đăng nhập admin để xem thông tin này");
    }

    const user = process.env.ADS_FEED_USER || "";
    const pass = process.env.ADS_FEED_PASS || "";

    // Địa chỉ tuyệt đối, vì Google gọi từ máy nó. Ưu tiên host của chính request
    // đang chạy: admin mở bằng tên miền nào thì feed cũng ở tên miền đó, khỏi
    // phải thêm biến môi trường và khỏi lệch khi đổi tên miền. x-forwarded-host
    // là thứ Vercel đặt; req.headers.host sau proxy có thể là host nội bộ.
    //
    // Tên miền nào cũng chạy được vì koi-domain-router đẩy tiền tố /shop về API
    // này — dù chủ tiệm mở admin ở koileather.com hay ở địa chỉ Vercel.
    const host =
      (req.headers["x-forwarded-host"] as string) || req.headers.host || "";
    const scheme = host.startsWith("localhost") ? "http" : "https";

    // URL mang sẵn ĐỦ hai tham số để chép-dán là chạy, không phải tự ghép:
    //
    //  · name — tên conversion action, phải khớp từng chữ với bên Google Ads.
    //    Thiếu nó thì rơi về "Zalo Sale" mặc định, mà chủ tiệm đặt tên khác là
    //    Google từ chối cả tệp và chỉ báo lỗi bên tài khoản của họ.
    //  · ghi=1 — cho phép đóng dấu "đã gửi Google". CHỈ URL này có; ai mở feed
    //    bằng trình duyệt để xem thử thì không, nên xem thử không làm bẩn số
    //    liệu. Xem doc feed() và feedCsv().
    const q = new URLSearchParams();
    if (name) q.set("name", name);
    q.set("ghi", "1");

    return {
      // Chưa đặt biến môi trường thì feed đang khoá chặt — trang admin phải nói
      // thẳng điều đó thay vì hiện một bộ thông tin không dùng được.
      daDatMatKhau: Boolean(user && pass),
      url: host ? `${scheme}://${host}/shop/ads-feed.csv?${q.toString()}` : "",
      user,
      pass,
    };
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
   * Tải file CSV để đưa lên Google Ads BẰNG TAY.
   *
   * Kể từ khi có /shop/ads-feed.csv thì đây là đường DỰ PHÒNG, không còn là
   * đường chính: Google Ads tự đi lấy tệp mỗi ngày, chủ tiệm không phải bấm gì.
   * Giữ lại vì vẫn có lúc cần — kiểm bằng mắt xem tệp có gì, hoặc gửi gấp một
   * đơn vừa chốt mà không đợi chuyến kế tiếp.
   *
   * GET chứ không POST dù có ghi (đánh dấu đã xuất): trình duyệt chỉ tải file
   * được bằng cách mở một địa chỉ, mà fetch rồi dựng blob thì mất header
   * Authorization... nên vẫn phải fetch. Xem hàm tải ở public/index.html.
   *
   * BOM ﻿ ở đầu: không có nó thì Excel bản Việt mở file ra tiếng Việt
   * thành ký tự rác. Google bỏ qua BOM nên vô hại với việc tải lên.
   *
   * lai=1: xuất lại cả những đơn đã tải lên rồi. Việc này AN TOÀN — Google khử
   * trùng lặp theo tên action + giờ + gclid nên dòng gửi hai lần chỉ tính một.
   * Mặc định vẫn chỉ lấy dòng mới, để tệp nhỏ và chủ tiệm thấy được cái gì vừa
   * thêm.
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

  /**
   * Sổ tay từ khoá quảng cáo — CRUD.
   *
   * Đây KHÔNG phải là nối vào Google Ads API: sửa ở đây không đổi gì trong tài
   * khoản quảng cáo. Nó là chỗ ghi lại "tiệm đang nhắm những từ nào", để lần sau
   * mở lại còn nhớ mình đã thử gì, từ nào bỏ vì đắt, từ nào phải chặn. Muốn thay
   * thật thì vẫn phải vào Google Ads bấm tay.
   *
   * Đặt dưới /analytics/ads/keywords chứ không mở nhánh mới: koi-domain-router là
   * repo riêng và chỉ chuyển tiếp một số tiền tố cố định. Thêm tiền tố lạ là phải
   * đi deploy thêm một repo nữa mới gọi được.
   */
  @Get("ads/keywords")
  @ApiOperation({ summary: "Danh sách từ khoá quảng cáo trong sổ tay" })
  async danhSachTuKhoa(@Req() req: Request) {
    // Tự kiểm đăng nhập: PUBLIC_VIEW=1 mở hết các GET, mà sổ tay từ khoá là
    // chuyện làm ăn nội bộ — để lộ là đối thủ đọc được cả kế hoạch chạy quảng cáo.
    if (!(req as Request & { user?: unknown }).user) {
      throw new UnauthorizedException("Cần đăng nhập admin để xem thông tin này");
    }
    return this.ads.danhSachTuKhoa();
  }

  /**
   * Từ khoá THẬT đang chạy trên Google Ads, kèm số liệu 30 ngày.
   *
   * Route riêng chứ không gộp vào GET ads/keywords ở trên: cái kia đọc DB, chỉ
   * mất vài mili giây và không bao giờ hỏng. Cái này gọi ra ngoài Internet, có
   * thể chậm hoặc lỗi. Gộp lại thì Google Ads sập là sổ tay cũng không xem được.
   */
  @Get("ads/keywords/live")
  @ApiOperation({ summary: "Từ khoá thật trên Google Ads + số liệu 30 ngày" })
  async tuKhoaThat(@Req() req: Request) {
    if (!(req as Request & { user?: unknown }).user) {
      throw new UnauthorizedException("Cần đăng nhập admin để xem thông tin này");
    }
    return this.ads.tuKhoaThat();
  }

  /**
   * Cụm từ tìm kiếm THẬT khách gõ, kèm số liệu 30 ngày + gợi ý thêm/loại trừ.
   *
   * Admin-only y hệt keywords/live: tự kiểm req.user chứ không phó cho guard,
   * vì PUBLIC_VIEW=1 mở hết phần đọc — mà cụm khách tìm là dữ liệu kinh doanh
   * nội bộ, lộ ra là đối thủ đọc được cả ý đồ nhắm khách.
   */
  @Get("ads/search-terms/live")
  @ApiOperation({ summary: "Cụm từ khách tìm thật trên Google Ads + số liệu 30 ngày" })
  async searchTermsThat(@Req() req: Request) {
    if (!(req as Request & { user?: unknown }).user) {
      throw new UnauthorizedException("Cần đăng nhập admin để xem thông tin này");
    }
    return this.ads.searchTermsThat();
  }

  /**
   * Keyword Planner: gợi ý từ khoá mới từ vài từ gốc.
   *
   * GET với ?seed=...&seed=... (lặp lại được nhiều lần) — đọc-only, hợp với GET.
   * Admin-only như trên. Không có seed hợp lệ thì service ném 400 rõ ràng.
   *
   * express gộp query lặp thành mảng, một lần thành chuỗi — chuẩn hoá về mảng
   * để service làm sạch (bỏ rỗng, gộp trùng, cắt còn tối đa 20 seed).
   */
  @Get("ads/keyword-ideas/live")
  @ApiOperation({ summary: "Gợi ý từ khoá mới từ Keyword Planner (đọc-only)" })
  async yTuongTuKhoa(
    @Req() req: Request,
    @Query("seed") seed?: string | string[],
  ) {
    if (!(req as Request & { user?: unknown }).user) {
      throw new UnauthorizedException("Cần đăng nhập admin để xem thông tin này");
    }
    const seeds = Array.isArray(seed) ? seed : seed ? [seed] : [];
    return this.ads.yTuongTuKhoa(seeds);
  }

  /**
   * Cấu trúc tài khoản: danh sách campaign (ENABLED) + ad group (ENABLED) con
   * để heoiu dựng picker chọn đích khi thêm/sửa từ khoá (Phase 1a).
   *
   * Admin-only như các route đọc Ads khác.
   */
  @Get("ads/structure")
  @ApiOperation({ summary: "Danh sách campaign + ad group ENABLED để làm picker chọn đích" })
  async layStructure(@Req() req: Request) {
    if (!(req as Request & { user?: unknown }).user) {
      throw new UnauthorizedException("Cần đăng nhập admin để xem thông tin này");
    }
    return this.ads.layStructure();
  }

  /**
   * Import hiện trạng: hút toàn bộ từ khoá/negative đang chạy trên Google Ads
   * vào sổ tay (Phase 0). CHỈ ĐỌC Ads + ghi DB của mình, KHÔNG mutate Ads.
   *
   * Tự kiểm req.user như các route admin khác: khi heoiu gọi bằng token ghi,
   * guard đã gắn req.user = { service:"heoiu", chiGhi:true } (truthy) nên qua
   * được; khi admin gọi bằng Bearer JWT thì req.user là payload. PUBLIC_VIEW chỉ
   * mở GET nên không liên quan tới POST này, nhưng vẫn tự kiểm cho nhất quán.
   *
   * Idempotent: bấm nhiều lần không đẻ dòng trùng (khoá theo adsResourceName).
   */
  @Post("ads/keywords/import")
  @ApiOperation({ summary: "Import từ khoá/negative đang chạy trên Google Ads về sổ tay" })
  async importTuKhoa(@Req() req: Request) {
    if (!(req as Request & { user?: unknown }).user) {
      throw new UnauthorizedException("Cần đăng nhập admin để thực hiện thao tác này");
    }
    return this.ads.importTuKhoaTuAds();
  }

  /**
   * Thêm từ khoá vào sổ tay (Phase 1b: nhận thêm loai, adGroupId, campaignId,
   * phamViNegative). Dùng themTuKhoaV2 thay themTuKhoa cũ — khuôn mới validate
   * đầy đủ, loaiKhop không còn nhận 'negative' (đã tách sang cột loai).
   */
  @Post("ads/keywords")
  @ApiOperation({ summary: "Thêm từ khoá vào sổ tay" })
  async themTuKhoa(
    @Body()
    body: {
      tuKhoa: string;
      chienDich?: string;
      loaiKhop?: string;
      trangThai?: string;
      ghiChu?: string;
      loai?: string;
      adGroupId?: string;
      campaignId?: string;
      phamViNegative?: string;
    },
  ) {
    return this.ads.themTuKhoaV2(body);
  }

  /**
   * PATCH chứ không PUT: giao diện cho sửa từng ô một. Phase 1b: nhận thêm
   * loai, adGroupId, campaignId, phamViNegative — dùng suaTuKhoaV2.
   */
  @Patch("ads/keywords/:id")
  @ApiOperation({ summary: "Sửa từ khoá trong sổ tay" })
  async suaTuKhoa(
    @Param("id") id: string,
    @Body()
    body: {
      tuKhoa?: string;
      chienDich?: string | null;
      loaiKhop?: string | null;
      trangThai?: string;
      ghiChu?: string | null;
      loai?: string;
      adGroupId?: string | null;
      campaignId?: string | null;
      phamViNegative?: string | null;
    },
  ) {
    return this.ads.suaTuKhoaV2(id, body);
  }

  /**
   * Xoá từ khoá khỏi sổ tay — và GỠ khỏi Google Ads trước nếu đã đẩy.
   *
   * Từ 2026-08-16 (chốt của chủ dự án): sổ tay là gốc nên xoá phải đè được xuống
   * Ads. Service gọi Ads mutate remove TRƯỚC, thành công mới delete dòng DB; Ads
   * lỗi thì giữ dòng và ghi loiDongBo. Đây giờ là endpoint MUTATE tài khoản thật,
   * nên tự kiểm req.user giống route push.
   */
  @Delete("ads/keywords/:id")
  @ApiOperation({
    summary: "Xoá từ khoá khỏi sổ tay (gỡ khỏi Google Ads trước nếu đã đẩy)",
  })
  async xoaTuKhoa(@Param("id") id: string, @Req() req: Request) {
    if (!(req as Request & { user?: unknown }).user) {
      throw new UnauthorizedException("Cần đăng nhập admin để thực hiện thao tác này");
    }
    return this.ads.xoaTuKhoa(id);
  }

  /**
   * Đẩy 1 từ khoá lên Google Ads — MUTATE tài khoản thật (Phase 2).
   *
   * POST thay vì PATCH: hành động này không chỉ ghi sổ tay mà còn gọi ra Google
   * Ads API và tạo/cập nhật criterion trên tài khoản đang tiêu tiền. Về mặt REST,
   * "đẩy" là một hành động (action endpoint), không phải cập nhật thuộc tính.
   *
   * :id/push đặt SAU :id trong file nhưng trước trong GHI_CHO_PHEP vì regex khớp
   * chính xác — "uuid/push" không bao giờ khớp regex uuid trơn, nên thứ tự Express
   * đăng ký handler mới quan trọng (static route trước dynamic route).
   *
   * Tự kiểm req.user như các route ghi khác: token ghi của heoiu có
   * req.user = { service:"heoiu", chiGhi:true } (truthy) → qua được.
   */
  @Post("ads/keywords/:id/push")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Đẩy 1 từ khoá lên Google Ads (MUTATE tài khoản thật)" })
  async dayTuKhoa(@Param("id") id: string, @Req() req: Request) {
    if (!(req as Request & { user?: unknown }).user) {
      throw new UnauthorizedException("Cần đăng nhập admin để thực hiện thao tác này");
    }
    return this.ads.dayTuKhoa(id);
  }

  /**
   * Chuyển 1 từ khoá giữa 3 box của Sổ tay SEO — MUTATE tài khoản thật.
   *
   * Kéo/bấm thẻ trên kanban gọi route này. body.den ∈ dang-chay | tam-dung |
   * dang-chan. Service tự phân nhánh: cùng loại → pause/resume; đổi loại
   * keyword↔negative → gỡ criterion cũ + tạo lại. den sai → 400 từ service.
   *
   * Cho phép body.loaiKhop ∈ broad | phrase | exact để ĐỔI KIỂU KHỚP ngay từ
   * thẻ kanban: Google Ads không cho update match type trên criterion đã tồn
   * tại nên service gỡ cũ + tạo mới. Có loaiKhop thì `den` chỉ là cột nguồn
   * (giữ nguyên loai/trangThai hiện tại).
   *
   * Tự kiểm req.user như route push/delete: đây là hành động đụng tài khoản thật.
   */
  @Post("ads/keywords/:id/move")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Chuyển từ khoá giữa 3 box Sổ tay SEO (MUTATE tài khoản thật)" })
  async chuyenBoxTuKhoa(
    @Param("id") id: string,
    @Body() body: { den?: string; loaiKhop?: string },
    @Req() req: Request,
  ) {
    if (!(req as Request & { user?: unknown }).user) {
      throw new UnauthorizedException("Cần đăng nhập admin để thực hiện thao tác này");
    }
    const loaiKhop = body?.loaiKhop != null && String(body.loaiKhop).trim() !== ""
      ? String(body.loaiKhop).trim()
      : undefined;
    return this.ads.chuyenBoxTuKhoa(id, String(body?.den ?? ""), loaiKhop);
  }

  /**
   * Đẩy NHIỀU từ khoá lên Google Ads — nút "Đẩy cả lô" của sổ tay (Phase 4).
   *
   * MUTATE tài khoản thật. Body chỉ nhận `{ ids: UUID[] }`; ValidationPipe
   * whitelist cắt bỏ mọi field lạ, IsUUID loại id sai khuôn, ArrayMinSize(1)
   * loại mảng rỗng — cả ba đều 400 trước khi chạm service.
   *
   * Trả khuôn `{ total, succeeded, failed, errors: [{ id, loi }] }` giống
   * sync/push để Heoiu parse lại một mẫu đã có. Một dòng lỗi không chặn cả lô.
   */
  @Post("ads/keywords/push-bulk")
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @ApiOperation({ summary: "Đẩy nhiều từ khoá lên Google Ads (MUTATE tài khoản thật)" })
  async dayNhieuTuKhoa(@Body() dto: PushBulkDto, @Req() req: Request) {
    if (!(req as Request & { user?: unknown }).user) {
      throw new UnauthorizedException("Cần đăng nhập admin để thực hiện thao tác này");
    }
    return this.ads.dayTuKhoaNhieu(dto.ids);
  }

  // ─── Cụm "Ads ↔ Landing ↔ SEO" (bước 1, 2, 3, 6 + verified pool) ──────────
  //
  // KHÔNG mutate tài khoản Ads: bước 4-5 (review + đẩy) đi qua sổ tay KoiAdKeyword
  // và push-bulk ở trên; verified pool chỉ ghi Postgres.
  //
  // Ba đường POST gọi GPT đều tốn phí nên cùng một bộ chốt: tự kiểm req.user
  // (chống PUBLIC_VIEW=1 mở cửa phần đọc), ValidationPipe whitelist chặn body lạ,
  // và Throttle 10 lượt/phút — cùng mức route seo/review. Ba đường verified pool
  // cũng tự kiểm req.user; GET verified ngoài admin đăng nhập còn phục vụ
  // SERVICE TOKEN của heoiu (AuthGuard mở mọi GET /analytics cho token đọc).

  /**
   * Bước 1: campaign đang chạy (ENABLED) kèm finalUrls của quảng cáo bên trong,
   * để heoiu vẽ danh sách chọn landing phân tích. Cùng khuôn daNoi/thieuBien
   * với các route đọc Ads khác.
   */
  @Get("ads/landing/campaigns")
  @ApiOperation({ summary: "Campaign đang chạy + URL landing của quảng cáo" })
  async landingCampaigns(@Req() req: Request) {
    if (!(req as Request & { user?: unknown }).user) {
      throw new UnauthorizedException("Cần đăng nhập admin để xem thông tin này");
    }
    return this.landingSeo.landingCampaigns();
  }

  /**
   * Bước 2: fetch trang landing (chỉ host trong allowlist — chống SSRF), lột
   * chữ, GPT tóm tắt. Trả ok=false kèm loi khi landing/GPT lỗi — KHÔNG ném 500,
   * để heoiu luôn nhận cùng một khuôn trả lời.
   */
  @Post("ads/landing/analyze")
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: "Tải trang landing + GPT tóm tắt (chỉ host cho phép)" })
  async phanTichLanding(@Req() req: Request, @Body() dto: AnalyzeDto) {
    if (!(req as Request & { user?: unknown }).user) {
      throw new UnauthorizedException("Cần đăng nhập admin để thực hiện thao tác này");
    }
    return this.landingSeo.phanTichLanding(dto.url);
  }

  /**
   * Bước 3: chấm MỘT LÔ từ khoá so với landing → nenDung / nenChan / nenThem.
   * heoiu tự chia lô ~100 từ và gọi nhiều lần. Không gọi GPT khi lô vào rỗng
   * sau lọc — trả ba mảng rỗng kèm loi, không tốn phí.
   */
  @Post("ads/landing/score")
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: "GPT chấm một lô từ khoá so với landing (nenDung/nenChan/nenThem)" })
  async chamTuKhoa(@Req() req: Request, @Body() dto: ScoreDto) {
    if (!(req as Request & { user?: unknown }).user) {
      throw new UnauthorizedException("Cần đăng nhập admin để thực hiện thao tác này");
    }
    return this.landingSeo.chamTuKhoa({
      landingText: dto.landingText,
      tomTat: dto.tomTat,
      intent: dto.intent,
      tuKhoas: dto.tuKhoas,
      searchTerms: dto.searchTerms,
    });
  }

  /**
   * Bước 6: GPT viết NHÁP khối nội dung SEO bổ sung (H2/FAQ) phủ từ khoá đã
   * duyệt. Chỉ trả về cho heoiu hiển thị — không ghi xuống landing, không đẩy
   * đi đâu; chủ shop tự quyết định dán hay không.
   */
  @Post("ads/landing/seo-draft")
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: "GPT viết nháp khối nội dung SEO (H2/FAQ) cho landing" })
  async vietSeoDraft(@Req() req: Request, @Body() dto: SeodraftDto) {
    if (!(req as Request & { user?: unknown }).user) {
      throw new UnauthorizedException("Cần đăng nhập admin để thực hiện thao tác này");
    }
    return this.landingSeo.vietSeoDraft({
      landingText: dto.landingText,
      tomTat: dto.tomTat,
      tuKhoas: dto.tuKhoas,
      url: dto.url,
    });
  }

  /**
   * Verified pool — ĐỌC: toàn bộ từ khoá đã đẩy lên Ads, theo từng landing.
   * heoiu đọc đường này bằng SERVICE TOKEN (AuthGuard mở mọi GET /analytics cho
   * token đọc — req.user khi đó là { service:'heoiu', chiDoc: true }, vẫn truthy
   * qua chốt dưới) để lọc từ đã đẩy khi chấm lại landing, khỏi duyệt từ đầu.
   */
  @Get("ads/landing/verified")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: "Verified pool: từ khoá đã đẩy lên Ads theo landing" })
  async docVerified(@Req() req: Request) {
    if (!(req as Request & { user?: unknown }).user) {
      throw new UnauthorizedException("Cần đăng nhập admin để xem thông tin này");
    }
    return this.landingSeo.docVerified();
  }

  /**
   * Verified pool — LƯU quyết định duyệt (phase 1 chỉ 'pushed') sau khi chủ shop
   * duyệt wizard bên heoiu. CHỈ ghi Postgres, KHÔNG mutate tài khoản Ads.
   * Body { url, dsQuyetDinh } qua ValidationPipe whitelist; host ngoài allowlist
   * bị service chặn 400 (cùng danh sách với analyze).
   */
  @Post("ads/landing/verified")
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: "Lưu từ đã đẩy vào verified pool (chỉ ghi Postgres)" })
  async luuVerified(@Req() req: Request, @Body() dto: LuuVerifiedDto) {
    if (!(req as Request & { user?: unknown }).user) {
      throw new UnauthorizedException("Cần đăng nhập admin để thực hiện thao tác này");
    }
    return this.landingSeo.luuVerified(dto.url, dto.dsQuyetDinh);
  }

  /**
   * Verified pool — XOÁ SẠCH pool của một landing (?url=...), dùng khi landing
   * bị bỏ hoặc dựng lại từ đầu. Đọc query param, KHÔNG dùng body — DELETE mang
   * body không đáng tin qua các proxy. CHỈ ghi Postgres, không đụng Ads.
   */
  @Delete("ads/landing/verified")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @ApiOperation({ summary: "Xoá verified pool của một landing (?url=...)" })
  async xoaVerified(@Req() req: Request, @Query("url") url?: string) {
    if (!(req as Request & { user?: unknown }).user) {
      throw new UnauthorizedException("Cần đăng nhập admin để thực hiện thao tác này");
    }
    return this.landingSeo.xoaVerified(url || "");
  }
}

/**
 * Keyword Pool + Google Ads Sync — Phase 3.
 *
 * Nằm dưới /analytics/ads/... để đi qua AuthGuard hiện có (tiền tố /analytics
 * đã được koi-domain-router chuyển tiếp về API này).
 *
 * Mọi route ở đây yêu cầu đăng nhập admin (req.user truthy). Pattern giống các
 * route admin khác trong AdsAdminController phía trên.
 */
@ApiTags("Analytics (admin)")
@Controller("analytics")
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class AdsKeywordPoolController {
  constructor(
    private readonly kwPool: KeywordPoolService,
    private readonly sync: SyncService,
  ) {}

  // ─── Keyword Pool ──────────────────────────────────────────────────────────

  @Get("ads/keyword-pool")
  @ApiOperation({ summary: "Danh sách keyword pool, hỗ trợ lọc + phân trang" })
  async listKeywordPool(
    @Req() req: Request,
    @Query("projectTag") projectTag?: string,
    @Query("q") q?: string,
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
  ) {
    if (!(req as Request & { user?: unknown }).user) {
      throw new UnauthorizedException("Cần đăng nhập admin để xem thông tin này");
    }
    return this.kwPool.list({
      projectTag,
      q,
      page: Number(page) || 1,
      pageSize: Number(pageSize) || 50,
    });
  }

  /**
   * Gán keyword + ĐẨY LUÔN lên Google Ads trong cùng request.
   *
   * 200 chứ không 201/202: phản hồi mang kết quả đẩy thật (syncStatus là
   * 'synced' hay 'error', kèm lastError) chứ không phải "đã nhận, đi hỏi sau".
   * Bản cũ trả 202 + jobId vì có queue; giờ không còn queue nữa.
   */
  @Post("ads/keyword-pool/assign")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Gán keyword vào campaign/ad group + đẩy ngay lên Google Ads, trả syncStatus thật",
  })
  async assignKeyword(
    @Req() req: Request,
    @Body() dto: AssignKeywordDto,
  ) {
    if (!(req as Request & { user?: unknown }).user) {
      throw new UnauthorizedException("Cần đăng nhập admin để thực hiện thao tác này");
    }
    return this.kwPool.assign(dto);
  }

  /**
   * Huỷ gán: xoá criterion trên Google Ads trước, xoá dòng local sau.
   *
   * Xoá được trên Ads thì trả { deleted: true }. Ads lỗi thì GIỮ dòng local và
   * trả { deleted: false, errors } — xem doc unassign() để biết vì sao không
   * xoá local trước.
   */
  @Delete("ads/keyword-pool/assign/:linkId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Huỷ gán keyword: xoá criterion trên Ads rồi xoá link. Trả 409 nếu đang syncing.",
  })
  async unassignKeyword(
    @Req() req: Request,
    @Param("linkId") linkId: string,
  ) {
    if (!(req as Request & { user?: unknown }).user) {
      throw new UnauthorizedException("Cần đăng nhập admin để thực hiện thao tác này");
    }
    return this.kwPool.unassign(linkId);
  }

  // ─── Sync ──────────────────────────────────────────────────────────────────

  /**
   * Hút campaign + ad group từ Google Ads về DB local. CHẠY XONG MỚI TRẢ.
   *
   * 200 chứ không 202: không còn queue, phản hồi mang số đếm thật. Trả 409 nếu
   * có lần chạy cùng loại còn trong cửa sổ 5 phút (chống double-click).
   */
  @Post("ads/sync/pull")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Hút campaign + ad group từ Google Ads về local. Trả 409 nếu đang chạy.",
  })
  async syncPull(@Req() req: Request) {
    if (!(req as Request & { user?: unknown }).user) {
      throw new UnauthorizedException("Cần đăng nhập admin để thực hiện thao tác này");
    }
    return this.sync.pull(this.aiBam(req));
  }

  /**
   * Đẩy link lên Google Ads. Không truyền linkIds = đẩy tất cả pending/error.
   *
   * MUTATE TÀI KHOẢN THẬT. Một link lỗi không chặn cả lô: link đó ghi error rồi
   * đi tiếp, lỗi gom vào mảng errors trong phản hồi.
   */
  @Post("ads/sync/push")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      "Đẩy keyword lên Google Ads (MUTATE tài khoản thật). Trả 409 nếu đang chạy.",
  })
  async syncPush(@Req() req: Request, @Body() dto: SyncPushDto) {
    if (!(req as Request & { user?: unknown }).user) {
      throw new UnauthorizedException("Cần đăng nhập admin để thực hiện thao tác này");
    }
    return this.sync.push(dto?.linkIds, this.aiBam(req));
  }

  /**
   * Dọn dẹp hằng ngày cho Vercel Cron — KHÔNG cần đăng nhập, bảo mật bằng
   * CRON_SECRET.
   *
   * VÌ SAO KHÔNG DÙNG AuthGuard. Vercel Cron gọi bằng máy, không có phiên đăng
   * nhập và không có JWT nào để gửi. Nó gửi `Authorization: Bearer <CRON_SECRET>`
   * (biến CRON_SECRET của Vercel) — mà AuthGuard đưa chuỗi đó vào verifyToken,
   * thấy không phải JWT hợp lệ nên coi là ẩn danh rồi chặn 401. Nên đường này tự
   * kiểm bí mật ngay dòng đầu hàm, giống cách /shop/ads-feed.csv tự kiểm HTTP
   * Basic. AuthGuard có một nhánh allowlist đúng đường dẫn này để request đi qua
   * được — xem auth.guard.ts.
   *
   * KHOÁ CHẶT KHI THIẾU BIẾN: chưa đặt CRON_SECRET thì trả 401 hết. Mặc định
   * phải là đóng — hở chỗ này là ai cũng gọi được một đường MUTATE tài khoản
   * quảng cáo thật.
   */
  @Get("ads/cron/sweep")
  @ApiOperation({
    summary: "Cron dọn dẹp: gỡ link kẹt, thử lại link lỗi, hút lại campaign",
  })
  async cronSweep(@Req() req: Request) {
    this.kiemCronSecret(req);
    return this.sync.sweep();
  }

  @Get("ads/sync/status")
  @ApiOperation({ summary: "Trạng thái sync: số link pending/error/synced + log gần đây" })
  async syncStatus(@Req() req: Request, @Query("limit") limit?: string) {
    if (!(req as Request & { user?: unknown }).user) {
      throw new UnauthorizedException("Cần đăng nhập admin để xem thông tin này");
    }
    return this.sync.getStatus(Number(limit) || 20);
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  /** Ghi vào SyncJobLog.triggeredBy để sau còn biết ai đã bấm. */
  private aiBam(req: Request): string {
    const u = (req as Request & { user?: { email?: string; service?: string } })
      .user;
    return u?.email ?? u?.service ?? "admin";
  }

  /**
   * Kiểm CRON_SECRET. Nhận cả `x-cron-secret: <bí mật>` (gọi tay/curl) và
   * `Authorization: Bearer <bí mật>` (dạng Vercel Cron gửi).
   *
   * So sánh bằng timingSafeEqual trên bản băm SHA-256, không phải `===`, cùng
   * lý do như kiemBasic() ở AdsTrackController: `===` thoát ra ngay ký tự đầu
   * khác nhau nên thời gian phản hồi tiết lộ đã đoán đúng mấy ký tự; băm trước
   * cho hai buffer dài bằng nhau (timingSafeEqual đòi vậy) và giấu luôn độ dài.
   */
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
