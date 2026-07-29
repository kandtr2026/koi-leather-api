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

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const path = request.path || request.route?.path || "";

    // Public paths — always allow, but still extract user if token present
    if (path === "/health" || path === "/") {
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

    // GET/HEAD/OPTIONS: read-only — attach user if token present, never block
    if (["GET", "HEAD", "OPTIONS"].includes(method)) {
      if (token) {
        try {
          request.user = this.authService.verifyToken(token);
        } catch {
          // Token invalid — treat as anonymous, don't block
        }
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
