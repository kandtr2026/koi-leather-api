import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { AuthService } from '../auth/auth.service';

/**
 * Guard riêng cho module Shopee Ads.
 *
 * LÝ DO TỒN TẠI: AuthGuard toàn cục (src/auth/auth.guard.ts) cho MỌI request GET
 * đi qua mà không cần token — nó chỉ chặn POST/PUT/PATCH/DELETE. Nếu dựa vào
 * guard đó thì chi phí quảng cáo, GMV và ROAS của shop sẽ public cho bất kỳ ai
 * gọi được endpoint. Số liệu này là dữ liệu kinh doanh nội bộ nên guard này bắt
 * buộc phải có JWT hợp lệ VÀ email nằm trong ADMIN_EMAILS, kể cả với GET.
 *
 * Guard toàn cục vẫn chạy trước và đã gán request.user khi có token, nhưng ta
 * không tin giá trị đó: verify lại từ header để guard này đứng độc lập.
 */
@Injectable()
export class ShopeeAdsAdminGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const auth: string | undefined = request.headers?.authorization;

    if (!auth || !auth.startsWith('Bearer ')) {
      throw new UnauthorizedException('Cần đăng nhập admin để xem dữ liệu quảng cáo');
    }

    // Ném UnauthorizedException nếu token sai/hết hạn.
    const user = this.authService.verifyToken(auth.slice(7));

    // Whitelist được kiểm tra lại ở đây, không chỉ lúc đăng nhập: nếu một email
    // bị loại khỏi ADMIN_EMAILS thì token cũ của họ mất quyền ngay lập tức,
    // không phải chờ hết hạn 24h.
    if (!user?.email || !this.authService.isEmailAllowed(user.email)) {
      throw new ForbiddenException('Email này không có quyền xem dữ liệu quảng cáo');
    }

    request.user = user;
    return true;
  }
}
