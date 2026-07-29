/**
 * Nơi duy nhất lấy/lưu credential Shopee.
 *
 * TẠI SAO NẰM Ở DB CHỨ KHÔNG PHẢI ENV:
 * access_token của Shopee hết hạn sau 4 tiếng. Vercel là serverless nên không
 * ghi lại được biến môi trường của chính nó — nếu chỉ dựa vào env thì mỗi lần
 * function khởi động lạnh lại phải refresh, và tệ hơn là refresh_token mới do
 * Shopee cấp sẽ mất, đến lúc refresh_token cũ hết hạn thì phải uỷ quyền lại tay.
 * Lưu vào DB thì token sống qua các lần gọi và tự làm mới được.
 *
 * ENV vẫn được đọc như phương án dự phòng để tương thích cách cấu hình cũ, còn
 * bản trong DB luôn thắng.
 */

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { decryptSecret, encryptSecret, maskSecret } from './shopee-ads.crypto';
import {
  PATH_AUTH_PARTNER,
  PATH_TOKEN_GET,
  SHOPEE_HOSTS,
} from './shopee-ads.config';
import { ShopeeApiError, type ShopeeCreds } from './shopee-ads.client';

/** Bản ghi duy nhất: shop này chỉ nối một shop Shopee. */
const ROW_ID = 'default';

export interface CredentialStatus {
  configured: boolean;
  authorized: boolean;
  partnerId: string | null;
  shopId: string | null;
  env: string;
  partnerKeyMasked: string;
  tokenExpiresAt: Date | null;
  tokenExpired: boolean;
  authorizedAt: Date | null;
  updatedBy: string | null;
  source: 'db' | 'env' | 'none';
}

@Injectable()
export class ShopeeCredentialService {
  private readonly log = new Logger('ShopeeCredential');

  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------------------------
  // ĐỌC
  // -------------------------------------------------------------------------

  private credsFromEnvRaw(): ShopeeCreds | null {
    const partnerId = Number(process.env.SHOPEE_PARTNER_ID || 0);
    const partnerKey = process.env.SHOPEE_PARTNER_KEY || '';
    const shopId = Number(process.env.SHOPEE_SHOP_ID || 0);
    if (!partnerId || !partnerKey || !shopId) return null;
    return {
      partnerId,
      partnerKey,
      shopId,
      accessToken: process.env.SHOPEE_ACCESS_TOKEN || '',
      refreshToken: process.env.SHOPEE_REFRESH_TOKEN || '',
      host: SHOPEE_HOSTS[process.env.SHOPEE_ENV || 'live'] || SHOPEE_HOSTS.live,
    };
  }

  /** Credential dùng để gọi API. null = chưa cấu hình. */
  async getCreds(): Promise<ShopeeCreds | null> {
    const row = await this.prisma.koiShopeeCredential.findUnique({ where: { id: ROW_ID } });
    if (row) {
      try {
        return {
          partnerId: Number(row.partnerId),
          partnerKey: decryptSecret(row.partnerKeyEnc),
          shopId: Number(row.shopId),
          accessToken: row.accessTokenEnc ? decryptSecret(row.accessTokenEnc) : '',
          refreshToken: row.refreshTokenEnc ? decryptSecret(row.refreshTokenEnc) : '',
          host: SHOPEE_HOSTS[row.env] || SHOPEE_HOSTS.live,
        };
      } catch (err) {
        // Sai key giải mã (thường do đổi JWT_SECRET). Không rơi ngầm về env vì
        // như vậy sẽ khó hiểu tại sao lại dùng shop khác — báo lỗi rõ ràng.
        this.log.error(`Không giải mã được credential trong DB: ${(err as Error).message}`);
        throw new BadRequestException(
          'Không giải mã được credential Shopee đã lưu (JWT_SECRET/SHOPEE_CRED_KEY có thể đã đổi). Hãy khai báo và uỷ quyền lại.',
        );
      }
    }
    return this.credsFromEnvRaw();
  }

  async status(): Promise<CredentialStatus> {
    const row = await this.prisma.koiShopeeCredential.findUnique({ where: { id: ROW_ID } });
    if (row) {
      let partnerKeyMasked = '****';
      try {
        partnerKeyMasked = maskSecret(decryptSecret(row.partnerKeyEnc));
      } catch {
        partnerKeyMasked = '(không giải mã được)';
      }
      const expired = !!row.tokenExpiresAt && row.tokenExpiresAt.getTime() < Date.now();
      return {
        configured: true,
        authorized: !!row.accessTokenEnc,
        partnerId: String(row.partnerId),
        shopId: String(row.shopId),
        env: row.env,
        partnerKeyMasked,
        tokenExpiresAt: row.tokenExpiresAt,
        // Hết hạn không có nghĩa là mất quyền: còn refresh_token là tự làm mới được.
        tokenExpired: expired,
        authorizedAt: row.authorizedAt,
        updatedBy: row.updatedBy,
        source: 'db',
      };
    }

    const env = this.credsFromEnvRaw();
    if (env) {
      return {
        configured: true,
        authorized: !!env.accessToken,
        partnerId: String(env.partnerId),
        shopId: String(env.shopId),
        env: process.env.SHOPEE_ENV || 'live',
        partnerKeyMasked: maskSecret(env.partnerKey),
        tokenExpiresAt: null,
        tokenExpired: false,
        authorizedAt: null,
        updatedBy: null,
        source: 'env',
      };
    }

    return {
      configured: false,
      authorized: false,
      partnerId: null,
      shopId: null,
      env: 'live',
      partnerKeyMasked: '',
      tokenExpiresAt: null,
      tokenExpired: false,
      authorizedAt: null,
      updatedBy: null,
      source: 'none',
    };
  }

  // -------------------------------------------------------------------------
  // GHI
  // -------------------------------------------------------------------------

  /**
   * Lưu partner_id / partner_key / shop_id. Chưa có token — phải uỷ quyền sau.
   * Đổi partner_key hoặc shop_id thì token cũ vô nghĩa nên xoá luôn.
   */
  async saveConfig(input: {
    partnerId: number;
    partnerKey: string;
    shopId: number;
    env: string;
    updatedBy: string;
  }): Promise<CredentialStatus> {
    const env = input.env === 'sandbox' ? 'sandbox' : 'live';
    const existing = await this.prisma.koiShopeeCredential.findUnique({ where: { id: ROW_ID } });

    const identityChanged =
      !existing ||
      Number(existing.shopId) !== input.shopId ||
      Number(existing.partnerId) !== input.partnerId ||
      existing.env !== env;

    const data = {
      partnerId: BigInt(input.partnerId),
      shopId: BigInt(input.shopId),
      partnerKeyEnc: encryptSecret(input.partnerKey),
      env,
      updatedBy: input.updatedBy,
      ...(identityChanged
        ? { accessTokenEnc: null, refreshTokenEnc: null, tokenExpiresAt: null, authorizedAt: null }
        : {}),
    };

    await this.prisma.koiShopeeCredential.upsert({
      where: { id: ROW_ID },
      create: { id: ROW_ID, ...data },
      update: data,
    });

    this.log.log(
      `Đã lưu cấu hình Shopee (partner_id=${input.partnerId}, shop_id=${input.shopId}, env=${env}) bởi ${input.updatedBy}`,
    );
    return this.status();
  }

  /** Ghi token mới sau khi uỷ quyền hoặc refresh. */
  async saveTokens(input: {
    accessToken: string;
    refreshToken: string;
    expiresInSec?: number | null;
    markAuthorized?: boolean;
  }): Promise<void> {
    const expiresAt =
      input.expiresInSec && input.expiresInSec > 0
        ? new Date(Date.now() + input.expiresInSec * 1000)
        : null;

    await this.prisma.koiShopeeCredential.update({
      where: { id: ROW_ID },
      data: {
        accessTokenEnc: encryptSecret(input.accessToken),
        refreshTokenEnc: input.refreshToken ? encryptSecret(input.refreshToken) : null,
        ...(expiresAt ? { tokenExpiresAt: expiresAt } : {}),
        ...(input.markAuthorized ? { authorizedAt: new Date() } : {}),
      },
    });
  }

  /**
   * Lưu token vừa refresh. Bọc try/catch: sync đã lấy được số liệu rồi, không
   * để lỗi ghi DB làm hỏng cả lượt sync — lần sau chỉ tốn thêm một lần refresh.
   */
  async persistRefreshedTokens(tokens: { accessToken: string; refreshToken: string }): Promise<void> {
    try {
      const row = await this.prisma.koiShopeeCredential.findUnique({ where: { id: ROW_ID } });
      if (!row) {
        this.log.warn(
          'Token đã được làm mới nhưng credential đang đọc từ env nên không lưu được. Hãy khai báo lại trong tab Shopee Ads để lưu vào DB.',
        );
        return;
      }
      // Shopee không trả expire_in ở refresh: mặc định 4 tiếng theo tài liệu.
      await this.saveTokens({ ...tokens, expiresInSec: 4 * 3600 });
      this.log.log('Đã lưu access_token mới vào DB');
    } catch (err) {
      this.log.error(`Không lưu được token mới: ${(err as Error).message}`);
    }
  }

  async clear(updatedBy: string): Promise<void> {
    await this.prisma.koiShopeeCredential.deleteMany({ where: { id: ROW_ID } });
    this.log.warn(`Credential Shopee đã bị xoá bởi ${updatedBy}`);
  }

  // -------------------------------------------------------------------------
  // UỶ QUYỀN
  // -------------------------------------------------------------------------

  /**
   * Link để chủ shop bấm đồng ý. Sau khi đồng ý Shopee chuyển về `redirect`
   * kèm ?code=...&shop_id=...
   *
   * `redirect` phải trùng domain đã khai trên Shopee Open Platform, nếu không
   * Shopee từ chối.
   */
  async buildAuthUrl(redirect: string): Promise<string> {
    const creds = await this.getCreds();
    if (!creds) {
      throw new BadRequestException('Chưa khai báo partner_id/partner_key/shop_id.');
    }
    const ts = Math.floor(Date.now() / 1000);
    const sign = createHmac('sha256', creds.partnerKey)
      .update(`${creds.partnerId}${PATH_AUTH_PARTNER}${ts}`)
      .digest('hex');
    const params = new URLSearchParams({
      partner_id: String(creds.partnerId),
      timestamp: String(ts),
      sign,
      redirect,
    });
    return `${creds.host}${PATH_AUTH_PARTNER}?${params.toString()}`;
  }

  /** Đổi `code` thành access_token + refresh_token rồi lưu. */
  async exchangeCode(code: string, shopIdOverride?: number): Promise<CredentialStatus> {
    const creds = await this.getCreds();
    if (!creds) {
      throw new BadRequestException('Chưa khai báo partner_id/partner_key/shop_id.');
    }
    const shopId = shopIdOverride || creds.shopId;

    const ts = Math.floor(Date.now() / 1000);
    const sign = createHmac('sha256', creds.partnerKey)
      .update(`${creds.partnerId}${PATH_TOKEN_GET}${ts}`)
      .digest('hex');
    const url =
      `${creds.host}${PATH_TOKEN_GET}` +
      `?partner_id=${creds.partnerId}&timestamp=${ts}&sign=${sign}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, shop_id: shopId, partner_id: creds.partnerId }),
    });
    const body: any = await res.json().catch(() => ({}));
    if (body?.error || !body?.access_token) {
      throw new ShopeeApiError(
        String(body?.error || 'token_get_failed'),
        String(body?.message || 'không lấy được access_token từ code'),
        PATH_TOKEN_GET,
      );
    }

    // Chưa có bản ghi DB (đang dùng env): tạo mới để token có chỗ lưu.
    const row = await this.prisma.koiShopeeCredential.findUnique({ where: { id: ROW_ID } });
    if (!row) {
      await this.prisma.koiShopeeCredential.create({
        data: {
          id: ROW_ID,
          partnerId: BigInt(creds.partnerId),
          shopId: BigInt(shopId),
          partnerKeyEnc: encryptSecret(creds.partnerKey),
          env: process.env.SHOPEE_ENV === 'sandbox' ? 'sandbox' : 'live',
        },
      });
    } else if (Number(row.shopId) !== shopId) {
      await this.prisma.koiShopeeCredential.update({
        where: { id: ROW_ID },
        data: { shopId: BigInt(shopId) },
      });
    }

    await this.saveTokens({
      accessToken: String(body.access_token),
      refreshToken: String(body.refresh_token || ''),
      expiresInSec: Number(body.expire_in || 0) || 4 * 3600,
      markAuthorized: true,
    });

    this.log.log(`Uỷ quyền thành công cho shop_id=${shopId}`);
    return this.status();
  }
}
