import { Injectable } from "@nestjs/common";
import { ThrottlerGuard } from "@nestjs/throttler";

/**
 * Throttle theo IP thay vì user-id mặc định.
 *
 * Đọc x-forwarded-for từ header (Vercel đặt) — phần tử đầu là IP khách.
 * Lưu ý: trên serverless, bộ đếm trong RAM không chia sẻ giữa các instance,
 * nên rate limit này là per-instance. Để chặt hơn cần Redis/Upstash.
 */
@Injectable()
export class ThrottleByIpGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const fwd = req.headers?.["x-forwarded-for"];
    if (fwd) return fwd.split(",")[0].trim();
    return req.headers?.["x-real-ip"] || req.ip || "unknown";
  }
}
