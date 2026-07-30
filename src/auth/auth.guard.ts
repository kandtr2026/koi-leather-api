import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService } from "./auth.service";

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

  private extractToken(request: any): string | null {
    const auth = request.headers?.authorization;
    if (auth && auth.startsWith("Bearer ")) {
      return auth.slice(7);
    }
    return null;
  }
}
