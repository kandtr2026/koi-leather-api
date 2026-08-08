/**
 * Khoá lại quyền của SERVICE TOKEN (trang báo cáo Heoiu đọc số liệu máy-gọi-máy).
 *
 * Token này nguy hiểm hơn JWT của người vì nó không hết hạn và nằm trong biến
 * môi trường của một dự án khác. Nên phạm vi phải hẹp và phải có test giữ:
 *
 * 1. Nếu đặt nhánh service token SAU nhánh GET chung thì nó chết thầm:
 *    verifyToken() ném lỗi (nó không phải JWT) -> user = null -> 401. Tức là
 *    cấp token xong vẫn không đọc được, mà lỗi lại giống hệt "chưa đăng nhập".
 *
 * 2. /analytics/ads/export.csv GHI cột exportedAt và trả gclid ĐẦY ĐỦ.
 *    /analytics/ads/feed-config trả mật khẩu feed Google Ads.
 *    Cả hai nằm trong /analytics nên nếu chỉ kiểm tra tiền tố là lọt.
 *
 * 3. So sánh token bằng === sẽ dò được theo thời gian; phải timingSafeEqual, và
 *    biến môi trường trống thì KHÔNG được coi là khớp (fail-closed) — nếu không,
 *    quên đặt biến là mở toang /analytics cho mọi request có header bất kỳ.
 */
import { UnauthorizedException } from "@nestjs/common";
import { AuthGuard } from "./auth.guard";
import type { AuthService } from "./auth.service";

const TOKEN = "x".repeat(48); // đủ dài để qua ngưỡng 32 ký tự

/** Dựng ExecutionContext tối thiểu mà guard thực sự đọc tới. */
function ctx(method: string, path: string, token?: string) {
  const request: any = {
    method,
    path,
    headers: token ? { authorization: `Bearer ${token}` } : {},
  };
  return {
    request,
    ctx: {
      switchToHttp: () => ({ getRequest: () => request }),
    } as any,
  };
}

/** AuthService giả: mọi token đều KHÔNG phải JWT hợp lệ, giống thực tế. */
function guardMoi() {
  const authService = {
    verifyToken: jest.fn(() => {
      throw new Error("jwt malformed");
    }),
  } as unknown as AuthService;
  return { guard: new AuthGuard(authService), authService };
}

describe("AuthGuard — service token cho Heoiu", () => {
  const envCu = process.env.HEOIU_SERVICE_TOKEN;

  beforeEach(() => {
    process.env.HEOIU_SERVICE_TOKEN = TOKEN;
  });

  afterAll(() => {
    if (envCu === undefined) delete process.env.HEOIU_SERVICE_TOKEN;
    else process.env.HEOIU_SERVICE_TOKEN = envCu;
  });

  describe("cho phép đọc", () => {
    it.each([
      "/analytics/summary",
      "/analytics/realtime",
      "/analytics/leads",
      "/analytics/ads",
      "/analytics/ads/lookup",
      "/analytics/ads/keywords",
    ])("GET %s đi qua và KHÔNG gọi verifyToken", (path) => {
      const { guard, authService } = guardMoi();
      const { ctx: c, request } = ctx("GET", path, TOKEN);

      expect(guard.canActivate(c)).toBe(true);
      // Đây là điểm hồi quy số 1: nếu nhánh đặt sai chỗ, verifyToken bị gọi.
      expect(authService.verifyToken).not.toHaveBeenCalled();
      expect(request.user).toEqual({ service: "heoiu", chiDoc: true });
    });

    it("HEAD cũng được (dùng để kiểm tra sống)", () => {
      const { guard } = guardMoi();
      const { ctx: c } = ctx("HEAD", "/analytics/summary", TOKEN);
      expect(guard.canActivate(c)).toBe(true);
    });
  });

  describe("từ chối", () => {
    it.each(["POST", "PATCH", "DELETE", "PUT"])(
      "%s /analytics/ads/keywords bị chặn — token chỉ đọc",
      (method) => {
        const { guard } = guardMoi();
        const { ctx: c } = ctx(method, "/analytics/ads/keywords", TOKEN);
        expect(() => guard.canActivate(c)).toThrow(UnauthorizedException);
      },
    );

    it.each([
      "/analytics/ads/export.csv", // ghi exportedAt + gclid đầy đủ
      "/analytics/ads/feed-config", // trả mật khẩu feed
    ])("GET %s bị chặn dù nằm trong /analytics", (path) => {
      const { guard } = guardMoi();
      const { ctx: c } = ctx("GET", path, TOKEN);
      expect(() => guard.canActivate(c)).toThrow(UnauthorizedException);
    });

    it("không cho đọc ngoài /analytics (ví dụ /product)", () => {
      const { guard } = guardMoi();
      const { ctx: c } = ctx("GET", "/product", TOKEN);
      expect(() => guard.canActivate(c)).toThrow(UnauthorizedException);
    });
  });

  describe("fail-closed khi cấu hình thiếu", () => {
    it("biến môi trường trống thì token nào cũng không phải service token", () => {
      delete process.env.HEOIU_SERVICE_TOKEN;
      const { guard } = guardMoi();
      const { ctx: c } = ctx("GET", "/analytics/summary", TOKEN);
      // Rơi về nhánh GET thường: verifyToken ném lỗi -> ẩn danh -> 401.
      expect(() => guard.canActivate(c)).toThrow(UnauthorizedException);
    });

    it("token quá ngắn bị coi là chưa cấu hình", () => {
      process.env.HEOIU_SERVICE_TOKEN = "ngan";
      const { guard } = guardMoi();
      const { ctx: c } = ctx("GET", "/analytics/summary", "ngan");
      expect(() => guard.canActivate(c)).toThrow(UnauthorizedException);
    });

    it("token sai độ dài không làm timingSafeEqual nổ", () => {
      const { guard } = guardMoi();
      const { ctx: c } = ctx("GET", "/analytics/summary", "y".repeat(10));
      expect(() => guard.canActivate(c)).toThrow(UnauthorizedException);
    });

    it("token đúng độ dài nhưng sai nội dung vẫn bị chặn", () => {
      const { guard } = guardMoi();
      const { ctx: c } = ctx("GET", "/analytics/summary", "y".repeat(48));
      expect(() => guard.canActivate(c)).toThrow(UnauthorizedException);
    });
  });

  describe("không phá đường sẵn có", () => {
    it("/shop vẫn mở cho khách, không cần token", () => {
      const { guard } = guardMoi();
      const { ctx: c } = ctx("GET", "/shop/products");
      expect(guard.canActivate(c)).toBe(true);
    });

    it("/health vẫn mở", () => {
      const { guard } = guardMoi();
      const { ctx: c } = ctx("GET", "/health");
      expect(guard.canActivate(c)).toBe(true);
    });

    it("POST /shop/track (pixel của khách) vẫn mở", () => {
      const { guard } = guardMoi();
      const { ctx: c } = ctx("POST", "/shop/track");
      expect(guard.canActivate(c)).toBe(true);
    });
  });
});
