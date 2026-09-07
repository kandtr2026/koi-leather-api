import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

/**
 * Chốt phòng thủ cho toàn bộ /image-library: BẮT BUỘC có `req.user`.
 *
 * Guard toàn cục (auth.guard.ts) khoá mặc định, NHƯNG có công tắc go-live
 * `PUBLIC_VIEW=1` mở mọi GET cho khách ẩn danh (req.user=null vẫn qua). Kho ảnh
 * KoiImageVision là công cụ NỘI BỘ admin (đường bucket, phân loại AI, bản đồ
 * ảnh trùng…), KHÔNG phải nội dung storefront cho khách — nên phải luôn
 * admin/service-only kể cả khi PUBLIC_VIEW bật. Đây là bất biến mọi controller
 * dữ liệu nội bộ khác đang giữ (xem ads.controller.ts tự kiểm `if (!req.user)`).
 *
 * Chạy SAU AuthGuard toàn cục (đã gắn req.user cho admin JWT / media token /
 * heoiu). Chỉ chặn đúng trường hợp ẩn danh lọt qua nhờ PUBLIC_VIEW.
 */
@Injectable()
export class RequireAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    if (!req.user) {
      throw new UnauthorizedException(
        "Cần đăng nhập admin hoặc token để xem thư viện ảnh",
      );
    }
    return true;
  }
}
