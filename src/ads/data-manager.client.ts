import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";

/**
 * Google Data Manager API client.
 *
 * Google Ads API `ConversionUploadService.UploadClickConversions` is restricted
 * for new integrations after 2026-06-15. Data Manager API is the replacement
 * path for offline Google Ads click conversions. This client intentionally uses
 * REST + fetch (no generated library) to keep the Vercel serverless bundle small,
 * matching `google-ads.client.ts`.
 */
@Injectable()
export class DataManagerClient {
  private readonly log = new Logger(DataManagerClient.name);
  private accessToken: { value: string; hetHanLuc: number } | null = null;

  private soThuan(raw: string | undefined): string {
    return (raw || "").replace(/\D/g, "");
  }

  maTaiKhoan(): string {
    return this.soThuan(process.env.GOOGLE_ADS_CUSTOMER_ID);
  }

  maDangNhap(): string {
    return this.soThuan(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID);
  }

  daCauHinh(): boolean {
    return Boolean(
      process.env.GOOGLE_ADS_CLIENT_ID &&
        process.env.GOOGLE_ADS_CLIENT_SECRET &&
        process.env.GOOGLE_ADS_REFRESH_TOKEN &&
        this.maTaiKhoan(),
    );
  }

  bienConThieu(): string[] {
    const can = [
      "GOOGLE_ADS_CLIENT_ID",
      "GOOGLE_ADS_CLIENT_SECRET",
      "GOOGLE_ADS_REFRESH_TOKEN",
      "GOOGLE_ADS_CUSTOMER_ID",
    ];
    return can.filter((t) => !process.env[t]);
  }

  private async layAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && this.accessToken.hetHanLuc > now) return this.accessToken.value;

    const scopes = [
      "https://www.googleapis.com/auth/datamanager",
      // Existing Koi refresh tokens were originally granted for Google Ads. Keep
      // adwords in the requested scope list so one re-consent can serve both API
      // clients; Google ignores scopes already bound to the refresh token.
      "https://www.googleapis.com/auth/adwords",
    ].join(" ");

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_ADS_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET || "",
        refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN || "",
        grant_type: "refresh_token",
        scope: scopes,
      }).toString(),
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok || !data.access_token) {
      const ma = data?.error || res.status;
      this.log.error(`Không lấy được Data Manager access token: ${ma}`);
      throw new ServiceUnavailableException(
        ma === "invalid_scope" || ma === "invalid_grant"
          ? "Google OAuth chưa cấp quyền Data Manager, cần cấp quyền lại với scope datamanager."
          : "Không kết nối được Google Data Manager lúc này.",
      );
    }
    const songTrongGiay = Number(data.expires_in) || 3600;
    this.accessToken = { value: data.access_token, hetHanLuc: now + (songTrongGiay - 60) * 1000 };
    return data.access_token;
  }

  async ingestEvents(payload: Record<string, unknown>): Promise<any> {
    const token = await this.layAccessToken();
    const res = await fetch("https://datamanager.googleapis.com/v1/events:ingest", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = data?.error?.message || data?.error || res.statusText || res.status;
      this.log.error(`Data Manager ingest lỗi ${res.status}: ${typeof msg === "string" ? msg : JSON.stringify(msg)}`);
      throw new ServiceUnavailableException(
        typeof msg === "string" ? msg : "Google Data Manager từ chối request.",
      );
    }
    return data;
  }
}
