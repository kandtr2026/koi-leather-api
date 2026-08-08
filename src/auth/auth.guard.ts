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
    if (path.startsWith("/shop")) {
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
      if (!["GET", "HEAD"].includes(method)) {
        throw new UnauthorizedException(
          "Service token chỉ được đọc, không được ghi",
        );
      }
      if (!path.startsWith(DUONG_CHI_DOC)) {
        throw new UnauthorizedException(
          "Service token chỉ được đọc nhóm /analytics",
        );
      }
      if (DUONG_TU_CHOI_SERVICE.includes(path)) {
        throw new UnauthorizedException(
          "Đường dẫn này không cấp cho service token",
        );
      }
      // Đánh dấu là máy gọi, không phải người. Controller nào cần biết ai đang
      // đọc thì phân biệt được bằng cờ này.
      request.user = { service: "heoiu", chiDoc: true };
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

  // So sánh chống dò theo thời gian. Fail-closed: chưa đặt biến môi trường
  // hoặc token quá ngắn thì không có service token nào hợp lệ.
  private laServiceToken(token: string): boolean {
    const mong = process.env.HEOIU_SERVICE_TOKEN;
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
