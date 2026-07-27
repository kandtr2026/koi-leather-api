import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  private readonly adminEmails: string[];

  constructor(private jwtService: JwtService) {
    const raw = process.env.ADMIN_EMAILS || '';
    this.adminEmails = raw
      .split(',')
      .map(e => e.trim().toLowerCase())
      .filter(Boolean);

    // Fail-closed: on production the admin whitelist must be configured,
    // otherwise every Google account would be granted admin access.
    if (!this.adminEmails.length && process.env.VERCEL_ENV === 'production') {
      console.error('[Auth] ADMIN_EMAILS is empty in production — all logins will be rejected.');
    }
  }

  private getGoogleClientId(): string {
    return process.env.GOOGLE_CLIENT_ID || '';
  }

  async loginWithGoogle(credential: string): Promise<{ accessToken: string; user: { email: string; name: string; picture: string } }> {
    const { OAuth2Client } = await import('google-auth-library');
    const client = new OAuth2Client(this.getGoogleClientId());

    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: this.getGoogleClientId(),
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      throw new UnauthorizedException('Invalid Google token');
    }

    const email = payload.email.toLowerCase();

    if (!this.isEmailAllowed(email)) {
      throw new UnauthorizedException(`Email "${email}" không có quyền truy cập. Liên hệ admin để được cấp quyền.`);
    }

    const user = {
      email,
      name: payload.name || email.split('@')[0],
      picture: payload.picture || '',
    };

    const accessToken = this.jwtService.sign(user, { expiresIn: '24h' });

    return { accessToken, user };
  }

  verifyToken(token: string): { email: string; name: string; picture: string } {
    try {
      return this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Token hết hạn hoặc không hợp lệ');
    }
  }

  decodeToken(token: string): { email: string; name: string; picture: string } | null {
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
