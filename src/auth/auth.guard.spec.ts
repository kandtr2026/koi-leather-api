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
const TOKEN_GHI = "w".repeat(48); // token ghi, PHẢI khác token đọc

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

    it("dấu / cuối trên đường ĐƯỢC PHÉP vẫn qua (chuẩn hoá không làm chặt quá)", () => {
      const { guard } = guardMoi();
      const { ctx: c } = ctx("GET", "/analytics/summary/", TOKEN);
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

    /**
     * ĐÃ RÒ THẬT trên production: thêm một dấu / cuối là vượt deny-list.
     * Express để strict routing = false nên "/…/feed-config/" vẫn vào đúng
     * handler, nhưng request.path giữ dấu / nên includes() trượt.
     * feed-config đã trả mật khẩu feed Google Ads (28 ký tự) cho service token.
     */
    it.each([
      "/analytics/ads/feed-config/",
      "/analytics/ads/export.csv/",
      "/analytics/ads/feed-config//",
      "/Analytics/Ads/Feed-Config", // route khớp không phân biệt hoa thường
      "/ANALYTICS/ADS/EXPORT.CSV/",
    ])("GET %s cũng bị chặn (biến thể lách deny-list)", (path) => {
      const { guard } = guardMoi();
      const { ctx: c } = ctx("GET", path, TOKEN);
      expect(() => guard.canActivate(c)).toThrow(UnauthorizedException);
    });

    it.each([
      "/analytics-noi-bo", // startsWith('/analytics') khớp nhầm
      "/analyticsx",
    ])("GET %s bị chặn — không phải nhóm /analytics", (path) => {
      const { guard } = guardMoi();
      const { ctx: c } = ctx("GET", path, TOKEN);
      expect(() => guard.canActivate(c)).toThrow(UnauthorizedException);
    });

    it("đường dẫn kèm query vẫn bị chặn", () => {
      const { guard } = guardMoi();
      const { ctx: c } = ctx("GET", "/analytics/ads/feed-config?x=1", TOKEN);
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

/**
 * Khoá lại quyền của TOKEN GHI (Heoiu bấm nút ghi từ xa).
 *
 * Token ghi tách hẳn khỏi token đọc, và phạm vi hẹp hơn nữa: allow-list khớp
 * chính xác method + đường dẫn. Ba điểm hồi quy phải giữ:
 *
 * 1. Token ghi KHÔNG đọc được gì. Nếu để nó rơi xuống nhánh GET chung thì khi
 *    PUBLIC_VIEW=1 nhánh đó cho qua, tức token ghi bỗng đọc được cả /analytics.
 * 2. Token đọc vẫn phải chỉ-đọc. Thêm nhánh ghi mà lỡ nới nhánh cũ là mất trắng
 *    hai lần vá trước đó.
 * 3. Dán trùng một giá trị vào cả hai biến phải bị coi là CHƯA cấu hình. Không
 *    có chốt này thì lỗi cấu hình trả về đúng câu 401 mà token đọc bình thường
 *    cũng trả, nhìn log không phân biệt được.
 */
describe("AuthGuard — token ghi cho Heoiu", () => {
  const docCu = process.env.HEOIU_SERVICE_TOKEN;
  const ghiCu = process.env.HEOIU_WRITE_TOKEN;

  beforeEach(() => {
    process.env.HEOIU_SERVICE_TOKEN = TOKEN;
    process.env.HEOIU_WRITE_TOKEN = TOKEN_GHI;
  });

  afterAll(() => {
    if (docCu === undefined) delete process.env.HEOIU_SERVICE_TOKEN;
    else process.env.HEOIU_SERVICE_TOKEN = docCu;
    if (ghiCu === undefined) delete process.env.HEOIU_WRITE_TOKEN;
    else process.env.HEOIU_WRITE_TOKEN = ghiCu;
  });

  // Từ khoá dùng UUID, lead dùng số tự tăng — hai kiểu id khác nhau thật, không
  // phải chép thiếu. Xem GHI_CHO_PHEP trong auth.guard.ts.
  const UUID = "3f1a7c8e-9b24-4d61-a0f5-7e2c8b41d6a9";

  describe("cho phép đúng 5 đường", () => {
    it.each([
      ["POST", "/analytics/ads/convert"],
      ["POST", "/analytics/ads/keywords"],
      ["PATCH", `/analytics/ads/keywords/${UUID}`],
      ["DELETE", `/analytics/ads/keywords/${UUID}`],
      ["PATCH", "/analytics/leads/34"],
    ])("%s %s đi qua và KHÔNG gọi verifyToken", (method, path) => {
      const { guard, authService } = guardMoi();
      const { ctx: c, request } = ctx(method, path, TOKEN_GHI);

      expect(guard.canActivate(c)).toBe(true);
      expect(authService.verifyToken).not.toHaveBeenCalled();
      expect(request.user).toEqual({ service: "heoiu", chiGhi: true });
    });

    // Express strict routing = false: hai đường này vào cùng handler nên chuẩn
    // hoá cho khớp là đúng, không phải lỗ hổng.
    it.each([
      ["POST", "/analytics/ads/convert/"],
      ["PATCH", `/ANALYTICS/ADS/KEYWORDS/${UUID.toUpperCase()}`],
    ])("%s %s vẫn qua sau chuẩn hoá", (method, path) => {
      const { guard } = guardMoi();
      const { ctx: c } = ctx(method, path, TOKEN_GHI);
      expect(guard.canActivate(c)).toBe(true);
    });

    it("POST /analytics/ads/keywords/push-bulk đi qua (nút đẩy cả lô)", () => {
      const { guard, authService } = guardMoi();
      const { ctx: c, request } = ctx(
        "POST",
        "/analytics/ads/keywords/push-bulk",
        TOKEN_GHI,
      );
      expect(guard.canActivate(c)).toBe(true);
      expect(authService.verifyToken).not.toHaveBeenCalled();
      expect(request.user).toEqual({ service: "heoiu", chiGhi: true });
    });
  });

  describe("từ chối", () => {
    it.each([
      "/analytics/summary",
      "/analytics/ads",
      "/analytics/ads/keywords", // GET cùng đường mà POST được phép
      "/analytics/leads",
    ])("GET %s bị chặn — token ghi không có quyền đọc", (path) => {
      const { guard } = guardMoi();
      const { ctx: c } = ctx("GET", path, TOKEN_GHI);
      expect(() => guard.canActivate(c)).toThrow(UnauthorizedException);
    });

    it.each([
      ["PUT", `/analytics/ads/keywords/${UUID}`], // method không có trong danh sách
      ["POST", "/analytics/leads/34"], // leads chỉ cho PATCH
      ["DELETE", "/analytics/leads/34"],
      ["POST", `/analytics/ads/keywords/${UUID}`], // POST chỉ cho đường không id
      ["PATCH", "/analytics/ads/keywords"], // PATCH phải có id
    ])("%s %s bị chặn — sai cặp method+đường", (method, path) => {
      const { guard } = guardMoi();
      const { ctx: c } = ctx(method, path, TOKEN_GHI);
      expect(() => guard.canActivate(c)).toThrow(UnauthorizedException);
    });

    it.each([
      "/analytics/ads/keywords/12", // số không phải UUID — id từ khoá là UUID
      "/analytics/ads/keywords/abc",
      `/analytics/ads/keywords/${UUID}/xoa`, // đuôi lạ, neo $ phải chặn
      `/analytics/ads/keywords/${UUID}x`,
      `/analytics/ads/keywords/${UUID.slice(0, 35)}`, // thiếu một ký tự
      "/analytics/ads/keywords/3f1a7c8e-9b24-4d61-a0f5-7e2c8b41d6ag", // 'g' ngoài hex
      // Ba ca dưới đây là lý do phải khớp khuôn 8-4-4-4-12 thay vì
      // [0-9a-f-]{36}: cả ba đều đúng 36 ký tự hex-và-gạch.
      "/analytics/ads/keywords/------------------------------------", // 36 dấu gạch
      "/analytics/ads/keywords/3f1a7c8e9b244d61a0f57e2c8b41d6a93f1a", // 36 hex, không gạch
      "/analytics/ads/keywords/3f1a7c8-e9b24-4d61-a0f5-7e2c8b41d6a9", // gạch lệch một ô
      "/analytics/ads/convertx",
      `/analytics/leads/${UUID}`, // lead phải là số, không phải UUID
    ])("PATCH/DELETE %s bị chặn — không khớp mẫu id", (path) => {
      const { guard } = guardMoi();
      const { ctx: c } = ctx("PATCH", path, TOKEN_GHI);
      expect(() => guard.canActivate(c)).toThrow(UnauthorizedException);
    });

    it("không ghi được ngoài /analytics", () => {
      const { guard } = guardMoi();
      const { ctx: c } = ctx("POST", "/product", TOKEN_GHI);
      expect(() => guard.canActivate(c)).toThrow(UnauthorizedException);
    });

    it("token ghi KHÔNG đọc được dù PUBLIC_VIEW mở hết GET", () => {
      const cu = process.env.PUBLIC_VIEW;
      process.env.PUBLIC_VIEW = "1";
      try {
        // publicView đọc ở lúc dựng nên phải dựng guard SAU khi đặt biến.
        const { guard } = guardMoi();
        const { ctx: c } = ctx("GET", "/analytics/summary", TOKEN_GHI);
        expect(() => guard.canActivate(c)).toThrow(UnauthorizedException);
      } finally {
        if (cu === undefined) delete process.env.PUBLIC_VIEW;
        else process.env.PUBLIC_VIEW = cu;
      }
    });
  });

  describe("không nới token đọc", () => {
    it.each(["POST", "PATCH", "DELETE", "PUT"])(
      "%s bằng token ĐỌC vẫn bị chặn sau khi thêm nhánh ghi",
      (method) => {
        const { guard } = guardMoi();
        const { ctx: c } = ctx(method, "/analytics/ads/keywords", TOKEN);
        expect(() => guard.canActivate(c)).toThrow(
          /chỉ được đọc, không được ghi/,
        );
      },
    );

    it("token đọc vẫn đọc được bình thường", () => {
      const { guard } = guardMoi();
      const { ctx: c, request } = ctx("GET", "/analytics/summary", TOKEN);
      expect(guard.canActivate(c)).toBe(true);
      expect(request.user).toEqual({ service: "heoiu", chiDoc: true });
    });

    it("token đọc vẫn không lấy được feed-config", () => {
      const { guard } = guardMoi();
      const { ctx: c } = ctx("GET", "/analytics/ads/feed-config", TOKEN);
      expect(() => guard.canActivate(c)).toThrow(UnauthorizedException);
    });
  });

  /**
   * Ở nhóm này điều cần chứng minh là "KHÔNG ghi được", chứ không phải ném ra
   * đúng loại lỗi nào. Token ghi không khớp thì rơi xuống nhánh JWT cuối và
   * verifyToken ném lỗi ở đó — cũng là chặn, và ngoài thực tế Nest biến lỗi JWT
   * thành 401. Nên assert toThrow() chung, đừng ghim UnauthorizedException:
   * ghim vào là test đỏ trong khi guard đang chặn đúng.
   */
  describe("fail-closed khi cấu hình thiếu", () => {
    it("chưa đặt HEOIU_WRITE_TOKEN thì không ghi được", () => {
      delete process.env.HEOIU_WRITE_TOKEN;
      const { guard } = guardMoi();
      const { ctx: c } = ctx("POST", "/analytics/ads/convert", TOKEN_GHI);
      expect(() => guard.canActivate(c)).toThrow();
    });

    it("token ghi dưới 32 ký tự bị coi là chưa cấu hình", () => {
      process.env.HEOIU_WRITE_TOKEN = "ngan";
      const { guard } = guardMoi();
      const { ctx: c } = ctx("POST", "/analytics/ads/convert", "ngan");
      expect(() => guard.canActivate(c)).toThrow();
    });

    it("dán TRÙNG token đọc thì coi như chưa cấu hình token ghi", () => {
      process.env.HEOIU_WRITE_TOKEN = TOKEN;
      const { guard } = guardMoi();
      const { ctx: c } = ctx("POST", "/analytics/ads/convert", TOKEN);
      // Rơi vào nhánh token đọc: chặn vì chỉ-đọc, KHÔNG mở đường ghi. Đây là ca
      // duy nhất trong nhóm ghim được thông báo, và ghim để thấy rõ nó không
      // lẳng lặng chuyển thành quyền ghi.
      expect(() => guard.canActivate(c)).toThrow(
        /chỉ được đọc, không được ghi/,
      );
    });

    it("token ghi sai nội dung nhưng đúng độ dài vẫn bị chặn", () => {
      const { guard } = guardMoi();
      const { ctx: c } = ctx("POST", "/analytics/ads/convert", "z".repeat(48));
      expect(() => guard.canActivate(c)).toThrow();
    });

    it("token ghi sai độ dài không làm timingSafeEqual nổ", () => {
      const { guard } = guardMoi();
      const { ctx: c } = ctx("POST", "/analytics/ads/convert", "w".repeat(10));
      // Nếu timingSafeEqual bị gọi với hai buffer khác độ dài thì nó ném
      // RangeError, không phải lỗi xác thực. Chốt bằng thông báo để phân biệt.
      expect(() => guard.canActivate(c)).toThrow(/jwt malformed/);
    });
  });
});
