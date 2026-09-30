import { JwtService } from "@nestjs/jwt";
import { AuthService } from "./auth.service";

/** Phiên admin 30 ngày, tự gia hạn khi dùng (A Khoa 30/09/2026). */
describe("AuthService — gia hạn phiên", () => {
  const jwt = new JwtService({ secret: "khoa-thu" });
  let svc: AuthService;
  const bayGio = () => Math.floor(Date.now() / 1000);

  beforeEach(() => {
    process.env.ADMIN_EMAILS = "a@koi.vn";
    svc = new AuthService(jwt);
  });

  it("token mới ký có thời hạn 30 ngày", () => {
    const t = jwt.decode(
      (svc as any).kySession({ email: "a@koi.vn", name: "A", picture: "" }),
    ) as { iat: number; exp: number };
    expect(t.exp - t.iat).toBe(30 * 24 * 3600);
  });

  it("token dưới 1 giờ tuổi: không cấp lại", () => {
    expect(
      svc.lamMoiNeuCan({ email: "a@koi.vn", iat: bayGio() - 600 }),
    ).toBeNull();
  });

  it("token quá 1 giờ tuổi (kể cả token 24h cũ), email còn quyền: cấp token mới 30 ngày, giữ đúng người", () => {
    const moi = svc.lamMoiNeuCan({
      email: "a@koi.vn",
      name: "A",
      iat: bayGio() - 2 * 86400,
    });
    expect(moi).toBeTruthy();
    const p = jwt.verify(moi!) as { email: string; exp: number };
    expect(p.email).toBe("a@koi.vn");
    expect(p.exp - bayGio()).toBeGreaterThan(29 * 86400);
  });

  it("email đã bị gỡ khỏi danh sách: không gia hạn", () => {
    expect(
      svc.lamMoiNeuCan({ email: "khac@koi.vn", iat: bayGio() - 2 * 86400 }),
    ).toBeNull();
  });

  it("thiếu iat (token dịch vụ, dữ liệu lạ): không gia hạn", () => {
    expect(svc.lamMoiNeuCan({ email: "a@koi.vn" })).toBeNull();
  });
});
