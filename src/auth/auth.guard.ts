import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { timingSafeEqual } from "crypto";
import { AuthService } from "./auth.service";

// Máy-gọi-máy: trang báo cáo Heoiu đọc số liệu qua service token, không phải
// người đăng nhập Google. Token này CHỈ đọc, và chỉ đọc nhóm /analytics.
//
// Hai đường bị chặn dù nằm trong /analytics, vì chúng không phải "đọc thuần":
//   - ads/export.csv    ghi cột exportedAt (có tác dụng phụ) và trả gclid đầy đủ
//   - ads/feed-config   trả mật khẩu feed cho Google Ads
// Heoiu không cần hai thứ đó để vẽ báo cáo, nên không cấp.
const DUONG_CHI_DOC = "/analytics";
const DUONG_TU_CHOI_SERVICE = [
  "/analytics/ads/export.csv",
  "/analytics/ads/feed-config",
];

/**
 * Token GHI của Heoiu — biến môi trường KHÁC token đọc.
 *
 * Vì sao không nới token đọc ra cho ghi: token đọc nằm trong biến môi trường của
 * hai dự án khác (Heoiu và kitleather), không hết hạn, và đã phải vá hai lần để
 * giữ đúng tính chỉ-đọc. Nới nó là bỏ luôn thành quả đó. Hai token riêng thì mất
 * token đọc vẫn không ghi được gì, và ngược lại.
 *
 * Danh sách dưới đây là allow-list khớp CHÍNH XÁC method + đường dẫn, không phải
 * theo tiền tố. Thêm route ghi mới thì phải thêm vào đây mới gọi được — cố ý bắt
 * chặt, để không có đường ghi nào lọt ra ngoài mà không ai để ý.
 *
 * :\d+ chứ không phải .+ — id là số nguyên, để "/keywords/1/xoa" hay
 * "/keywords/abc" không khớp. Neo ^...$ để không có đuôi lạ nào đi kèm.
 */
const GHI_CHO_PHEP: ReadonlyArray<readonly [string, RegExp]> = [
  ["POST", /^\/analytics\/ads\/convert$/],
  // ----- Landing-SEO (cụm "Ads ↔ Landing ↔ SEO") -----
  // Ba đường POST gọi GPT (tốn phí OpenAI) phục vụ bước phân tích landing /
  // chấm từ khoá / viết nháp SEO. KHÔNG mutate tài khoản Ads, nhưng là POST
  // có tác dụng phụ ngoài (gọi OpenAI, fetch ra ngoài) nên phải qua token ghi.
  // Đường TĨNH và là nhánh /landing riêng — đặt TRƯỚC các luật /keywords để giữ
  // quy ước "static trước dynamic" và khỏi bị luật uuid nào nuốt nhầm.
  ["POST", /^\/analytics\/ads\/landing\/analyze$/],
  ["POST", /^\/analytics\/ads\/landing\/score$/],
  ["POST", /^\/analytics\/ads\/landing\/seo-draft$/],
  // AI mentor chiến dịch: đọc số liệu 1 chiến dịch (GAQL) rồi gọi GPT khuyên
  // việc cần làm. KHÔNG mutate tài khoản Ads, nhưng là POST gọi OpenAI (tốn
  // phí) — CÙNG loại với ba đường landing ở trên, nên đi qua token ghi. Đường
  // TĨNH, nhánh /mentor riêng, đặt cạnh cụm landing cho dễ đọc.
  ["POST", /^\/analytics\/ads\/mentor\/campaign$/],
  // Verified pool: lưu/xoá quyết định duyệt ("đã đẩy") theo từng landing —
  // CHỈ ghi Postgres, không mutate tài khoản Ads. GET verified KHÔNG có ở đây:
  // heoiu đọc bằng token đọc (nhánh service token mở mọi GET /analytics).
  ["POST", /^\/analytics\/ads\/landing\/verified$/],
  ["DELETE", /^\/analytics\/ads\/landing\/verified$/],
  ["POST", /^\/analytics\/ads\/keywords$/],
  // Import hiện trạng Google Ads về sổ tay (Phase 0). CHỈ đọc Ads + ghi DB của
  // mình, KHÔNG mutate tài khoản quảng cáo — nhưng vẫn là POST có tác dụng phụ
  // (ghi DB) nên đi qua token ghi, phải nằm trong allowlist này. Đặt TRƯỚC luật
  // /keywords/:id để đường tĩnh không bị luật uuid nuốt.
  ["POST", /^\/analytics\/ads\/keywords\/import$/],
  // Đẩy NHIỀU từ khoá lên Google Ads (Phase 4 batch push). MUTATE tài khoản
  // thật — body { ids: UUID[] }. Đường TĨNH (push-bulk là một đoạn cố định),
  // đặt TRƯỚC luật /keywords/:id/push cho cùng quy ước "static trước dynamic"
  // dù hai regex không xung đột nhau (một đoạn vs hai đoạn sau /keywords).
  ["POST", /^\/analytics\/ads\/keywords\/push-bulk$/],
  // Đẩy 1 từ khoá lên Google Ads (Phase 2). MUTATE tài khoản thật — cẩn thận.
  // Đặt TRƯỚC luật /keywords/:id/... chung vì push là endpoint riêng.
  // Khuôn UUID giống PATCH/DELETE bên dưới — cùng bảng KoiAdKeyword.
  ["POST", /^\/analytics\/ads\/keywords\/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}\/push$/],
  // Từ khoá dùng UUID (`KoiAdKeyword.id String @default(uuid())`), KHÔNG phải
  // số tự tăng. Để `\d+` ở đây là chặn sạch mọi lần sửa từ khoá thật, mà lỗi
  // hiện ra là 401 "không được dùng cho đường dẫn này" — nhìn hệt như token
  // sai, nên rất dễ đi kiểm biến môi trường thay vì kiểm cái regex này.
  //
  // chuanHoaDuong() đã hạ chữ thường nên chỉ cần khớp hex thường.
  //
  // Khớp đúng khuôn 8-4-4-4-12 chứ không phải [0-9a-f-]{36}: cách sau nhận cả
  // 36 dấu gạch, hoặc gạch đặt sai chỗ. Không phải lỗ bảo mật (không có '/',
  // '.' hay '%' nào lọt được vào, nên tệ nhất là Prisma tra không thấy rồi trả
  // 404), nhưng tầng gửi bên Heoiu đã khớp đúng khuôn này — để hai tầng lệch
  // luật nhau thì sau này sửa một bên là tưởng cả hai đã theo.
  ["PATCH", /^\/analytics\/ads\/keywords\/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/],
  ["DELETE", /^\/analytics\/ads\/keywords\/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/],
  // Lead thì ngược lại: `leads.id` là BigInt tự tăng, nên đúng là \d+.
  ["PATCH", /^\/analytics\/leads\/\d+$/],
  // ----- Keyword Pool (Phase 3) -----
  // Gắn 1 từ khoá vào ad group. MUTATE tài khoản Ads thật (đẩy inline, không
  // qua queue) — trả 200 kèm syncStatus='error' nếu Ads từ chối, chứ không 500.
  ["POST", /^\/analytics\/ads\/keyword-pool\/assign$/],
  // Gỡ 1 link. Xoá criterion trên Ads TRƯỚC, DB SAU — Ads lỗi thì giữ dòng local
  // (mất adsResourceName là không còn cách tìm lại criterion đang ăn tiền).
  // linkId là UUID (`KeywordCampaignLink.id String @default(uuid())`) — cùng
  // khuôn 8-4-4-4-12 với các luật keywords ở trên, KHÔNG phải \d+.
  [
    "DELETE",
    /^\/analytics\/ads\/keyword-pool\/assign\/[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/,
  ],
  // Kéo campaign + ad group từ Ads về DB. CHỈ đọc Ads, nhưng ghi DB nên vẫn là
  // đường ghi. Nút "Làm mới từ Google Ads" bên Heoiu.
  ["POST", /^\/analytics\/ads\/sync\/pull$/],
  // Đẩy các link pending/error lên Ads. MUTATE tài khoản thật — nút "Đẩy lên
  // Google Ads". Body rỗng = đẩy tất cả đang chờ, nên đây là đường nguy hiểm
  // nhất trong danh sách này.
  ["POST", /^\/analytics\/ads\/sync\/push$/],
  // ----- Whitelist SEO (Phase 4.5) -----
  // Chạy AI review diện từ khoá đã cắn tiền. Gọi GPT (tốn phí OpenAI nhỏ) +
  // upsert trạng thái — không mutate tài khoản Ads, nhưng vẫn là POST ghi DB
  // nên phải qua token ghi. Đường TĨNH, đặt cuối danh sách cho dễ đọc.
  ["POST", /^\/analytics\/seo\/review$/],
];

/**
 * Chuẩn hoá trước khi so khớp deny-list.
 *
 * Express để strict routing = false nên "/analytics/ads/feed-config/" vẫn khớp
 * đúng handler đó, nhưng request.path GIỮ dấu / cuối. So khớp chính xác bằng
 * includes() sẽ trượt, và một dấu / là vượt được deny-list — đã rò thật:
 * feed-config trả mật khẩu feed Google Ads cho service token.
 *
 * Hạ chữ hoa vì Express khớp route không phân biệt hoa thường (caseSensitive
 * = false), nên "/Analytics/Ads/Feed-Config" cũng vào đúng handler.
 */
function chuanHoaDuong(duong: string): string {
  const bo = duong.split("?")[0].replace(/\/+$/, "");
  return (bo || "/").toLowerCase();
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  // Mặc định KHOÁ: mọi giao diện/dữ liệu chỉ admin đăng nhập mới xem được,
  // kể cả đọc (GET). Đây là bản chạy trên domain tạm Vercel — khách hoặc
  // người chưa đăng nhập không được xem gì.
  //
  // Khi go-live muốn mở cho khách xem công khai: đặt biến môi trường
  // PUBLIC_VIEW=1 (hoặc =true) là mở lại toàn bộ phần đọc, không cần sửa code.
  private readonly publicView =
    process.env.PUBLIC_VIEW === "1" || process.env.PUBLIC_VIEW === "true";

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const path = request.path || request.route?.path || "";

    // Hạ tầng luôn mở: health-check và toàn bộ luồng đăng nhập (nếu chặn hai
    // cái này thì không ai đăng nhập vào được nữa).
    if (path === "/health" || path === "/") {
      return true;
    }

    // Storefront công khai (KoiFront): nhóm /shop/* là API cho khách vãng lai,
    // chỉ đọc hàng đã xuất bản và field an toàn — luôn mở, không dính khoá admin.
    //
    // Khớp CHÍNH XÁC "/shop" hoặc "/shop/" + bất kỳ gì, sau khi chuẩn hoá, để
    // tránh mở nhầm /shopee-ads hay /shopping (đã nằm trong danh sách router).
    const duong = chuanHoaDuong(path);
    if (duong === "/shop" || duong.startsWith("/shop/")) {
      return true;
    }

    // Vercel Cron gọi bằng máy: không có phiên đăng nhập, không có JWT. Nó gửi
    // Authorization: Bearer <CRON_SECRET> — chuỗi đó không phải JWT nên
    // verifyToken ném lỗi, request bị coi là ẩn danh rồi chặn 401, và không có
    // cách nào bảo Vercel gửi JWT thay thế.
    //
    // Nên guard cho ĐÚNG MỘT đường dẫn này đi qua, rồi controller TỰ kiểm
    // CRON_SECRET ngay dòng đầu hàm (ads.controller.ts → kiemCronSecret) —
    // giống cách /shop/ads-feed.csv tự kiểm HTTP Basic. Đường này bảo mật bằng
    // chính nó, KHÔNG dựa vào guard, và phải đọc như vậy khi sửa về sau.
    //
    // Khớp CHÍNH XÁC sau khi chuẩn hoá, không phải theo tiền tố: mở theo tiền tố
    // là vô tình mở luôn mọi đường /analytics/ads/cron/* thêm sau này, mà những
    // đường đó chưa chắc có tự kiểm bí mật.
    if (chuanHoaDuong(path) === "/analytics/ads/cron/sweep") {
      return true;
    }
    // Whitelist SEO: hai cron daily của SeoWhitelistController — cùng quy ước
    // "allowlist đúng đường dẫn, controller TỰ kiểm CRON_SECRET" như sweep.
    if (chuanHoaDuong(path) === "/analytics/seo/cron/snapshot") {
      return true;
    }
    if (chuanHoaDuong(path) === "/analytics/seo/cron/review") {
      return true;
    }

    const token = this.extractToken(request);

    // Auth endpoints: allow without blocking, but attach user for /auth/me
    if (path.startsWith("/auth")) {
      if (token) {
        try {
          request.user = this.authService.verifyToken(token);
        } catch {}
      }
      return true;
    }

    // Service token (Heoiu): chỉ đọc, chỉ /analytics, không cấp quyền ghi.
    // Kiểm tra trước nhánh GET chung vì token này không phải JWT — verifyToken
    // sẽ ném lỗi và bị coi là ẩn danh rồi chặn.
    if (token && this.laServiceToken(token)) {
      const duong = chuanHoaDuong(path);

      if (!["GET", "HEAD"].includes(method)) {
        throw new UnauthorizedException(
          "Service token chỉ được đọc, không được ghi",
        );
      }
      if (duong !== DUONG_CHI_DOC && !duong.startsWith(DUONG_CHI_DOC + "/")) {
        throw new UnauthorizedException(
          "Service token chỉ được đọc nhóm /analytics",
        );
      }
      if (DUONG_TU_CHOI_SERVICE.includes(duong)) {
        throw new UnauthorizedException(
          "Đường dẫn này không cấp cho service token",
        );
      }
      // Đánh dấu là máy gọi, không phải người. Controller nào cần biết ai đang
      // đọc thì phân biệt được bằng cờ này.
      request.user = { service: "heoiu", chiDoc: true };
      return true;
    }

    // Token ghi (Heoiu): chỉ đúng những method + đường trong GHI_CHO_PHEP.
    // Đặt sau nhánh token đọc và trước nhánh GET chung, cùng lý do: token này
    // không phải JWT nên verifyToken sẽ ném lỗi và bị coi là ẩn danh.
    if (token && this.laTokenGhi(token)) {
      const duong = chuanHoaDuong(path);
      const duocPhep = GHI_CHO_PHEP.some(
        ([m, mau]) => m === method && mau.test(duong),
      );

      if (!duocPhep) {
        // Không tách riêng thông báo cho GET: token ghi KHÔNG đọc được gì cả.
        // Chỉ cấp đúng quyền cần dùng, nên mất token ghi cũng không lộ số liệu.
        throw new UnauthorizedException(
          "Token ghi không được dùng cho đường dẫn này",
        );
      }
      request.user = { service: "heoiu", chiGhi: true };
      return true;
    }

    // GET/HEAD/OPTIONS: đọc dữ liệu.
    if (["GET", "HEAD", "OPTIONS"].includes(method)) {
      let user: unknown = null;
      if (token) {
        try {
          user = this.authService.verifyToken(token);
        } catch {
          // Token invalid — coi như ẩn danh
        }
      }
      request.user = user;

      // Khi KHOÁ (mặc định): chưa đăng nhập admin thì chặn cả đọc, để khách
      // và người chưa đăng nhập không xem được nội dung.
      if (!this.publicView && !user) {
        throw new UnauthorizedException("Cần đăng nhập để xem trang này");
      }
      return true;
    }

    // POST/PUT/PATCH/DELETE: require valid token
    if (!token) {
      throw new UnauthorizedException(
        "Cần đăng nhập để thực hiện thao tác này",
      );
    }
    request.user = this.authService.verifyToken(token);
    return true;
  }

  // Fail-closed: chưa đặt biến môi trường hoặc token quá ngắn thì không có
  // service token nào hợp lệ.
  private laServiceToken(token: string): boolean {
    return this.khopToken(token, process.env.HEOIU_SERVICE_TOKEN);
  }

  /**
   * Fail-closed thêm một điều kiện so với token đọc: nếu ai đó dán CÙNG một giá
   * trị vào cả hai biến thì coi như chưa cấu hình token ghi.
   *
   * Không có chốt này thì sự cố diễn ra âm thầm: nhánh token đọc chạy trước nên
   * token đó vẫn đọc được, mọi lệnh ghi trả 401 với thông báo "chỉ được đọc" —
   * đúng câu mà một token đọc bình thường cũng trả. Nhìn log không phân biệt
   * được là dán trùng biến hay là quên đặt biến. Chặn hẳn để lỗi hiện ra ngay.
   */
  private laTokenGhi(token: string): boolean {
    const mong = process.env.HEOIU_WRITE_TOKEN;
    if (mong && mong === process.env.HEOIU_SERVICE_TOKEN) return false;
    return this.khopToken(token, mong);
  }

  // So sánh chống dò theo thời gian, dùng chung cho cả hai loại token.
  private khopToken(token: string, mong?: string): boolean {
    if (!mong || mong.length < 32) return false;
    const a = Buffer.from(token);
    const b = Buffer.from(mong);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }

  private extractToken(request: any): string | null {
    const auth = request.headers?.authorization;
    if (auth && auth.startsWith("Bearer ")) {
      return auth.slice(7);
    }
    return null;
  }
}
