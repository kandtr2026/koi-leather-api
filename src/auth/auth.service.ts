import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

/**
 * Phiên đăng nhập admin: 30 ngày, TỰ GIA HẠN khi dùng (A Khoa 30/09/2026: "giữ
 * session lâu chục ngày... ngày nào cũng xài mà cứ kêu login hơi phiền"). Trước
 * là 24h cứng nên sáng nào cũng phải đăng nhập lại. Xem lamMoiNeuCan().
 */
export const THOI_HAN_PHIEN = "30d";
/**
 * Token đã sống quá mốc này thì /auth/me cấp token mới. 1 giờ (không phải 1 ngày)
 * để token 24h phát trước bản này cũng kịp đổi sang 30 ngày trước khi hết hạn —
 * người đang đăng nhập không bị đá ra lần nào khi nâng cấp.
 */
const GIA_HAN_SAU_GIAY = 3600;

@Injectable()
export class AuthService {
  private readonly adminEmails: string[];

  constructor(private jwtService: JwtService) {
    const raw = process.env.ADMIN_EMAILS || "";
    this.adminEmails = raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    // Fail-closed: on production the admin whitelist must be configured,
    // otherwise every Google account would be granted admin access.
    if (!this.adminEmails.length && process.env.VERCEL_ENV === "production") {
      console.error(
        "[Auth] ADMIN_EMAILS is empty in production — all logins will be rejected.",
      );
    }
  }

  private getGoogleClientId(): string {
    return process.env.GOOGLE_CLIENT_ID || "";
  }

  async loginWithGoogle(credential: string): Promise<{
    accessToken: string;
    user: { email: string; name: string; picture: string };
  }> {
    const { OAuth2Client } = await import("google-auth-library");
    const client = new OAuth2Client(this.getGoogleClientId());

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: this.getGoogleClientId(),
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new UnauthorizedException("Invalid Google token");
    }

    const email = payload.email.toLowerCase();

    if (!this.isEmailAllowed(email)) {
      throw new UnauthorizedException(
        `Email "${email}" không có quyền truy cập. Liên hệ admin để được cấp quyền.`,
      );
    }

    const user = {
      email,
      name: payload.name || email.split("@")[0],
      picture: payload.picture || "",
    };

    const accessToken = this.kySession(user);

    return { accessToken, user };
  }

  private kySession(u: {
    email: string;
    name: string;
    picture: string;
  }): string {
    return this.jwtService.sign(
      { email: u.email, name: u.name, picture: u.picture },
      { expiresIn: THOI_HAN_PHIEN },
    );
  }

  /**
   * Gia hạn phiên: token đã sống quá GIA_HAN_SAU_GIAY (1 giờ) và email VẪN trong danh sách
   * được phép → ký token mới đủ THOI_HAN_PHIEN. /auth/me gọi hàm này mỗi lần mở
   * admin, nên dùng mỗi ngày là không bao giờ hết hạn; bỏ không 30 ngày mới phải
   * đăng nhập lại. Gỡ email khỏi danh sách là lượt gia hạn kế tiếp bị từ chối.
   */
  lamMoiNeuCan(payload: {
    email?: string;
    name?: string;
    picture?: string;
    iat?: number;
  }): string | null {
    if (!payload?.email || typeof payload.iat !== "number") return null;
    if (Date.now() / 1000 - payload.iat < GIA_HAN_SAU_GIAY) return null;
    if (!this.isEmailAllowed(payload.email)) return null;
    return this.kySession({
      email: payload.email,
      name: payload.name || payload.email.split("@")[0],
      picture: payload.picture || "",
    });
  }

  verifyToken(token: string): { email: string; name: string; picture: string } {
    try {
      return this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException("Token hết hạn hoặc không hợp lệ");
    }
  }

  decodeToken(
    token: string,
  ): { email: string; name: string; picture: string } | null {
    try {
      return this.jwtService.decode(token) as any;
    } catch {
      return null;
    }
  }

  isEmailAllowed(email: string): boolean {
    // Fail-closed: no whitelist configured means nobody is authorized.
    if (!this.adminEmails.length) return false;
    return this.adminEmails.includes(email.toLowerCase());
  }

  get whitelist(): string[] {
    return [...this.adminEmails];
  }
}
