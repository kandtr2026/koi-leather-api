/**
 * Client Shopee Open API v2: ký HMAC-SHA256, tự refresh access_token, retry,
 * throttle. Chỉ dùng thư viện có sẵn (crypto + fetch của Node 18+).
 */

import { Injectable, Logger } from '@nestjs/common';
import { createHmac } from 'crypto';
import { PATH_TOKEN_REFRESH, normalizeRow } from './shopee-ads.config';

/** Error code Shopee trả về khi access_token hết hạn. */
const TOKEN_ERRORS = new Set([
  'error_auth',
  'error_token',
  'invalid_access_token',
  'access_token_error',
]);

const RETRYABLE_ERRORS = new Set(['error_server', 'error_busy', 'error_inner']);

export class ShopeeApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly path: string,
  ) {
    super(`[${code}] ${message} (path=${path})`);
    this.name = 'ShopeeApiError';
  }
}

export interface ShopeeCreds {
  partnerId: number;
  partnerKey: string;
  shopId: number;
  accessToken: string;
  refreshToken: string;
  host: string;
}

// Việc đọc credential nằm ở ShopeeCredentialService (shopee-ads.credentials.ts):
// nguồn chính là DB, env chỉ là dự phòng. Client chỉ nhận creds đã giải mã sẵn.

@Injectable()
export class ShopeeAdsClient {
  private readonly log = new Logger('ShopeeAdsClient');
  private lastCall = 0;
  public callCount = 0;

  /** Token mới sau khi refresh — service lưu lại để lần sync sau dùng. */
  public refreshedTokens: { accessToken: string; refreshToken: string } | null = null;

  constructor(
    private creds: ShopeeCreds,
    private readonly minIntervalMs = 350, // ~3 req/s
    private readonly timeoutMs = 20000,
  ) {}

  private sign(path: string, ts: number, shopLevel: boolean): string {
    let base = `${this.creds.partnerId}${path}${ts}`;
    if (shopLevel) base += `${this.creds.accessToken}${this.creds.shopId}`;
    return createHmac('sha256', this.creds.partnerKey).update(base).digest('hex');
  }

  private async throttle(): Promise<void> {
    const gap = Date.now() - this.lastCall;
    if (gap < this.minIntervalMs) {
      await new Promise((r) => setTimeout(r, this.minIntervalMs - gap));
    }
    this.lastCall = Date.now();
  }

  private buildUrl(path: string, query: Record<string, any>, shopLevel: boolean): string {
    const ts = Math.floor(Date.now() / 1000);
    const params = new URLSearchParams({
      partner_id: String(this.creds.partnerId),
      timestamp: String(ts),
      sign: this.sign(path, ts, shopLevel),
    });
    if (shopLevel) {
      params.set('access_token', this.creds.accessToken);
      params.set('shop_id', String(this.creds.shopId));
    }
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) params.set(k, String(v));
    }
    return `${this.creds.host}${path}?${params.toString()}`;
  }

  private async rawCall(
    path: string,
    query: Record<string, any> = {},
    shopLevel = true,
  ): Promise<any> {
    await this.throttle();
    this.callCount++;

    const url = this.buildUrl(path, query, shopLevel);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
      });
      const text = await res.text();
      let body: any;
      try {
        body = JSON.parse(text);
      } catch {
        throw new ShopeeApiError('bad_json', `HTTP ${res.status}: ${text.slice(0, 200)}`, path);
      }
      // Shopee trả HTTP 200 kèm field `error` khi thất bại.
      const code = String(body?.error || '');
      if (code) {
        throw new ShopeeApiError(code, String(body?.message || 'unknown'), path);
      }
      return body?.response ?? body;
    } finally {
      clearTimeout(timer);
    }
  }

  /** Gọi API, tự refresh token 1 lần nếu hết hạn, retry backoff cho lỗi server. */
  async call(path: string, query: Record<string, any> = {}, shopLevel = true): Promise<any> {
    let refreshed = false;
    let lastErr: unknown;

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        return await this.rawCall(path, query, shopLevel);
      } catch (err) {
        lastErr = err;

        if (err instanceof ShopeeApiError && TOKEN_ERRORS.has(err.code) && !refreshed) {
          refreshed = true;
          await this.refreshAccessToken();
          continue; // thử lại ngay với token mới, không tính vào backoff
        }

        const retryable =
          (err instanceof ShopeeApiError && RETRYABLE_ERRORS.has(err.code)) ||
          (err as any)?.name === 'AbortError' ||
          (err as any)?.code === 'ECONNRESET';

        if (retryable && attempt < 3) {
          await new Promise((r) => setTimeout(r, 500 * attempt));
          continue;
        }
        throw err;
      }
    }
    throw lastErr;
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.creds.refreshToken) {
      throw new ShopeeApiError(
        'no_refresh_token',
        'access_token hết hạn và không có SHOPEE_REFRESH_TOKEN để làm mới',
        PATH_TOKEN_REFRESH,
      );
    }
    this.log.warn('access_token hết hạn — đang làm mới');

    const ts = Math.floor(Date.now() / 1000);
    const sign = createHmac('sha256', this.creds.partnerKey)
      .update(`${this.creds.partnerId}${PATH_TOKEN_REFRESH}${ts}`)
      .digest('hex');
    const url =
      `${this.creds.host}${PATH_TOKEN_REFRESH}` +
      `?partner_id=${this.creds.partnerId}&timestamp=${ts}&sign=${sign}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refresh_token: this.creds.refreshToken,
        partner_id: this.creds.partnerId,
        shop_id: this.creds.shopId,
      }),
    });
    const body: any = await res.json().catch(() => ({}));
    if (body?.error || !body?.access_token) {
      throw new ShopeeApiError(
        String(body?.error || 'refresh_failed'),
        String(body?.message || 'không làm mới được token'),
        PATH_TOKEN_REFRESH,
      );
    }

    this.creds.accessToken = body.access_token;
    if (body.refresh_token) this.creds.refreshToken = body.refresh_token;
    this.refreshedTokens = {
      accessToken: this.creds.accessToken,
      refreshToken: this.creds.refreshToken,
    };
    this.log.log('Đã làm mới access_token');
  }

  /** Bóc list bản ghi ra khỏi các lớp wrapper khác nhau của response. */
  static asRows(resp: any): Record<string, any>[] {
    if (!resp) return [];
    if (Array.isArray(resp)) return resp.filter((r) => r && typeof r === 'object');
    if (typeof resp === 'object') {
      const keys = [
        'campaign_list',
        'shop_daily_performance_list',
        'campaign_daily_performance_list',
        'performance_list',
        'daily_performance_list',
        'list',
      ];
      for (const k of keys) {
        if (Array.isArray(resp[k])) {
          return resp[k].filter((r: any) => r && typeof r === 'object');
        }
      }
      if ('expense' in resp || 'click' in resp || 'impression' in resp) return [resp];
    }
    return [];
  }

  /**
   * Response campaign thường lồng nhau:
   *   { campaign_id: 1, campaign_list: [{ date, metrics: {...} }] }
   * Hàm này kéo metrics lồng trong ra cùng cấp và gắn kèm campaign_id.
   */
  static flatten(row: Record<string, any>): Record<string, any>[] {
    const nestedKeys = Object.keys(row).filter(
      (k) => Array.isArray(row[k]) && row[k].length && typeof row[k][0] === 'object',
    );

    if (!nestedKeys.length) {
      const merged: Record<string, any> = { ...row };
      for (const [k, v] of Object.entries(row)) {
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          delete merged[k];
          Object.assign(merged, v); // vd { metrics: {...} }
        }
      }
      return [normalizeRow(merged)];
    }

    const parent: Record<string, any> = {};
    for (const [k, v] of Object.entries(row)) {
      if (!nestedKeys.includes(k)) parent[k] = v;
    }

    const out: Record<string, any>[] = [];
    for (const key of nestedKeys) {
      for (const child of row[key]) {
        // Con thắng cha khi trùng key: số liệu theo ngày cụ thể hơn.
        out.push(...ShopeeAdsClient.flatten({ ...parent, ...child }));
      }
    }
    return out;
  }
}
