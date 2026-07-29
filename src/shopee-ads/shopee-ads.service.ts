/**
 * Service Shopee Ads: sync số liệu từ Shopee vào DB, và đọc lại từ DB để audit.
 *
 * Tại sao tách sync/đọc: Vercel giới hạn 30s mỗi request (vercel.json), còn một
 * lượt fetch 30 ngày phải gọi campaign list -> settings -> daily performance
 * (chunk 100 id, throttle ~3 req/s) nên rất dễ vượt. Vì vậy sync chạy riêng
 * (cron hoặc bấm tay), còn tab admin chỉ đọc từ DB nên luôn trả nhanh.
 */

import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ShopeeAdsClient,
  ShopeeApiError,
  type ShopeeCreds,
} from './shopee-ads.client';
import { ShopeeCredentialService } from './shopee-ads.credentials';
import {
  CAMPAIGN_ID_CHUNK,
  MAX_DAYS_PER_CALL,
  PATH_ADS_ALL_DAILY,
  PATH_ADS_BALANCE,
  PATH_ADS_SHOP_TOGGLE,
  PATH_CAMPAIGN_DAILY,
  PATH_CAMPAIGN_ID_LIST,
  PATH_CAMPAIGN_SETTING,
  formatAdsDate,
  normalizeRow,
  parseAdsDate,
  toUtcMidnight,
} from './shopee-ads.config';
import { num, runAudit, type AuditResult, type DailyRow, type ShopDailyRow } from './shopee-ads.audit';

export interface SyncReport {
  status: 'ok' | 'partial' | 'error';
  message: string;
  from: string;
  to: string;
  campaignRowsWritten: number;
  shopRowsWritten: number;
  apiCalls: number;
  warnings: string[];
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setUTCDate(out.getUTCDate() + n);
  return out;
}

/** Chia khoảng ngày thành các cửa sổ <= MAX_DAYS_PER_CALL ngày. */
function dateWindows(start: Date, end: Date): Array<[Date, Date]> {
  const out: Array<[Date, Date]> = [];
  let cur = start;
  while (cur <= end) {
    const stop = new Date(Math.min(addDays(cur, MAX_DAYS_PER_CALL - 1).getTime(), end.getTime()));
    out.push([cur, stop]);
    cur = addDays(stop, 1);
  }
  return out;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

@Injectable()
export class ShopeeAdsService {
  private readonly log = new Logger('ShopeeAdsService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly credentials: ShopeeCredentialService,
  ) {}

  /** Credential có được cấu hình hay chưa — UI dùng để hiện hướng dẫn setup. */
  async isConfigured(): Promise<boolean> {
    return (await this.credentials.getCreds()) !== null;
  }

  private async requireCreds(): Promise<ShopeeCreds> {
    const creds = await this.credentials.getCreds();
    if (!creds) {
      throw new ServiceUnavailableException(
        'Chưa khai báo thông số Shopee. Mở tab Shopee Ads > Cấu hình để nhập Partner ID, Partner Key, Shop ID rồi uỷ quyền shop.',
      );
    }
    if (!creds.accessToken) {
      throw new ServiceUnavailableException(
        'Đã khai báo thông số nhưng chưa uỷ quyền shop. Bấm "Uỷ quyền shop" trong tab Shopee Ads.',
      );
    }
    return creds;
  }

  // -------------------------------------------------------------------------
  // SYNC
  // -------------------------------------------------------------------------

  /**
   * Lấy dữ liệu từ Shopee và ghi vào DB.
   *
   * Từng nhóm endpoint được bọc try/catch riêng: một endpoint lỗi (Shopee đổi
   * tên field, shop chưa bật loại quảng cáo đó) thì phần còn lại vẫn ghi được
   * và trạng thái trả về là 'partial' thay vì mất trắng cả lượt sync.
   */
  async sync(days = 30): Promise<SyncReport> {
    const creds = await this.requireCreds();
    const client = new ShopeeAdsClient(creds);
    const warnings: string[] = [];

    // Kết thúc ở hôm qua: số liệu hôm nay Shopee chưa chốt, quy kết đơn còn chạy.
    const end = toUtcMidnight(addDays(new Date(), -1));
    const start = addDays(end, -(Math.max(1, days) - 1));

    let campaignRowsWritten = 0;
    let shopRowsWritten = 0;

    // --- Tổng toàn shop theo ngày -----------------------------------------
    try {
      shopRowsWritten = await this.syncShopDaily(client, creds.shopId, start, end);
    } catch (err) {
      warnings.push(`Tổng toàn shop: ${this.errMsg(err)}`);
    }

    // --- Campaign cấp sản phẩm --------------------------------------------
    try {
      campaignRowsWritten = await this.syncCampaigns(client, creds.shopId, start, end, warnings);
    } catch (err) {
      warnings.push(`Campaign: ${this.errMsg(err)}`);
    }

    // --- Số dư ví ----------------------------------------------------------
    let balance: number | null = null;
    let autoTopUp: boolean | null = null;
    try {
      const resp = await client.call(PATH_ADS_BALANCE);
      const row = normalizeRow(resp && typeof resp === 'object' ? resp : {});
      if (row.balance !== undefined) balance = num(row.balance);
    } catch (err) {
      warnings.push(`Số dư: ${this.errMsg(err)}`);
    }
    try {
      const resp = await client.call(PATH_ADS_SHOP_TOGGLE);
      const row = normalizeRow(resp && typeof resp === 'object' ? resp : {});
      if (row.autoTopUp !== undefined) autoTopUp = Boolean(row.autoTopUp);
    } catch (err) {
      warnings.push(`Cấu hình shop: ${this.errMsg(err)}`);
    }

    const wroteSomething = campaignRowsWritten > 0 || shopRowsWritten > 0;
    const status: SyncReport['status'] = !wroteSomething
      ? 'error'
      : warnings.length
        ? 'partial'
        : 'ok';
    const message = warnings.length
      ? warnings.join(' | ')
      : `Đã ghi ${campaignRowsWritten} dòng campaign, ${shopRowsWritten} dòng tổng shop.`;

    await this.prisma.koiShopeeAdsSyncState.upsert({
      where: { shopId: BigInt(creds.shopId) },
      create: {
        shopId: BigInt(creds.shopId),
        lastSyncAt: new Date(),
        lastSyncStatus: status,
        lastSyncMessage: message.slice(0, 1000),
        lastDateSynced: end,
        rowsWritten: campaignRowsWritten + shopRowsWritten,
        balance,
        autoTopUp,
      },
      update: {
        lastSyncAt: new Date(),
        lastSyncStatus: status,
        lastSyncMessage: message.slice(0, 1000),
        lastDateSynced: end,
        rowsWritten: campaignRowsWritten + shopRowsWritten,
        // Giữ giá trị cũ khi lần này gọi lỗi, để UI không mất thông tin số dư.
        ...(balance !== null ? { balance } : {}),
        ...(autoTopUp !== null ? { autoTopUp } : {}),
      },
    });

    // Token vừa được làm mới trong lúc sync: ghi lại vào DB ngay. Serverless
    // không giữ được biến giữa các lần gọi, nên không lưu là mất refresh_token
    // mới và đến lúc token cũ hết hiệu lực phải uỷ quyền lại bằng tay.
    if (client.refreshedTokens) {
      await this.credentials.persistRefreshedTokens(client.refreshedTokens);
    }

    return {
      status,
      message,
      from: start.toISOString().slice(0, 10),
      to: end.toISOString().slice(0, 10),
      campaignRowsWritten,
      shopRowsWritten,
      apiCalls: client.callCount,
      warnings,
    };
  }

  private errMsg(err: unknown): string {
    if (err instanceof ShopeeApiError) return err.message;
    return (err as any)?.message ? String((err as any).message) : String(err);
  }

  private async syncShopDaily(
    client: ShopeeAdsClient,
    shopId: number,
    start: Date,
    end: Date,
  ): Promise<number> {
    let written = 0;
    for (const [from, to] of dateWindows(start, end)) {
      const resp = await client.call(PATH_ADS_ALL_DAILY, {
        start_date: formatAdsDate(from),
        end_date: formatAdsDate(to),
      });
      for (const raw of ShopeeAdsClient.asRows(resp)) {
        for (const row of ShopeeAdsClient.flatten(raw)) {
          const date = parseAdsDate(row.date);
          if (!date) continue;
          await this.prisma.koiShopeeAdsShopDaily.upsert({
            where: { shopId_date: { shopId: BigInt(shopId), date } },
            create: {
              shopId: BigInt(shopId),
              date,
              expense: num(row.expense),
              impression: Math.round(num(row.impression)),
              click: Math.round(num(row.click)),
              order: Math.round(num(row.order)),
              gmv: num(row.gmv),
              directOrder: Math.round(num(row.directOrder)),
              directGmv: num(row.directGmv),
            },
            update: {
              expense: num(row.expense),
              impression: Math.round(num(row.impression)),
              click: Math.round(num(row.click)),
              order: Math.round(num(row.order)),
              gmv: num(row.gmv),
              directOrder: Math.round(num(row.directOrder)),
              directGmv: num(row.directGmv),
              syncedAt: new Date(),
            },
          });
          written++;
        }
      }
    }
    return written;
  }

  private async syncCampaigns(
    client: ShopeeAdsClient,
    shopId: number,
    start: Date,
    end: Date,
    warnings: string[],
  ): Promise<number> {
    // 1. Danh sách campaign_id
    const idResp = await client.call(PATH_CAMPAIGN_ID_LIST, { page_no: 1, page_size: 500 });
    const ids: number[] = [];
    for (const raw of ShopeeAdsClient.asRows(idResp)) {
      const row = normalizeRow(raw);
      const id = num(row.campaignId, 0);
      if (id) ids.push(id);
    }
    if (!ids.length) {
      // Một số response trả thẳng mảng số thay vì mảng object.
      const flat = (idResp as any)?.campaign_id_list;
      if (Array.isArray(flat)) for (const v of flat) if (num(v, 0)) ids.push(num(v));
    }
    if (!ids.length) return 0;

    // 2. Setting (tên, loại, ngân sách) — thiếu cũng không chặn số liệu
    const settings = new Map<string, Record<string, any>>();
    for (const group of chunk(ids, CAMPAIGN_ID_CHUNK)) {
      try {
        const resp = await client.call(PATH_CAMPAIGN_SETTING, {
          campaign_id_list: group.join(','),
          info_type_list: '1,2,3',
        });
        for (const raw of ShopeeAdsClient.asRows(resp)) {
          const row = normalizeRow(raw);
          const id = String(num(row.campaignId, 0));
          if (id !== '0') settings.set(id, row);
        }
      } catch (err) {
        warnings.push(`Cấu hình campaign: ${this.errMsg(err)}`);
      }
    }

    // 3. Số liệu theo ngày
    let written = 0;
    for (const [from, to] of dateWindows(start, end)) {
      for (const group of chunk(ids, CAMPAIGN_ID_CHUNK)) {
        const resp = await client.call(PATH_CAMPAIGN_DAILY, {
          campaign_id_list: group.join(','),
          start_date: formatAdsDate(from),
          end_date: formatAdsDate(to),
        });
        for (const raw of ShopeeAdsClient.asRows(resp)) {
          for (const row of ShopeeAdsClient.flatten(raw)) {
            const date = parseAdsDate(row.date);
            const campaignId = num(row.campaignId, 0);
            if (!date || !campaignId) continue;

            const setting = settings.get(String(campaignId)) || {};
            const data = {
              name: setting.name ? String(setting.name) : row.name ? String(row.name) : null,
              adType: setting.adType ? String(setting.adType) : row.adType ? String(row.adType) : null,
              status: setting.status ? String(setting.status) : row.status ? String(row.status) : null,
              dailyBudget:
                setting.dailyBudget !== undefined
                  ? num(setting.dailyBudget)
                  : row.dailyBudget !== undefined
                    ? num(row.dailyBudget)
                    : null,
              expense: num(row.expense),
              impression: Math.round(num(row.impression)),
              click: Math.round(num(row.click)),
              order: Math.round(num(row.order)),
              gmv: num(row.gmv),
              directOrder: Math.round(num(row.directOrder)),
              directGmv: num(row.directGmv),
            };

            await this.prisma.koiShopeeAdsDaily.upsert({
              where: {
                shopId_date_campaignId: {
                  shopId: BigInt(shopId),
                  date,
                  campaignId: BigInt(campaignId),
                },
              },
              create: {
                shopId: BigInt(shopId),
                date,
                campaignId: BigInt(campaignId),
                ...data,
              },
              update: { ...data, syncedAt: new Date() },
            });
            written++;
          }
        }
      }
    }
    return written;
  }

  // -------------------------------------------------------------------------
  // ĐỌC + AUDIT
  // -------------------------------------------------------------------------

  /**
   * Đọc dữ liệu đã sync trong DB và chạy audit.
   * @param days số ngày lùi về từ hôm nay
   * @param margin tỷ lệ lợi nhuận gộp sau phí sàn (0..1); null = không kết luận lỗ/lãi
   */
  async audit(
    days = 30,
    margin: number | null = null,
  ): Promise<AuditResult & { configured: boolean; authorized: boolean }> {
    const creds = await this.credentials.getCreds();
    const shopId = creds ? BigInt(creds.shopId) : null;

    const end = toUtcMidnight(addDays(new Date(), -1));
    const start = addDays(end, -(Math.max(1, days) - 1));
    const where = shopId
      ? { shopId, date: { gte: start, lte: end } }
      : { date: { gte: start, lte: end } };

    const [campaignRecords, shopRecords, state] = await Promise.all([
      this.prisma.koiShopeeAdsDaily.findMany({
        where,
        orderBy: [{ date: 'asc' }, { campaignId: 'asc' }],
      }),
      this.prisma.koiShopeeAdsShopDaily.findMany({ where, orderBy: { date: 'asc' } }),
      shopId
        ? this.prisma.koiShopeeAdsSyncState.findUnique({ where: { shopId } })
        : Promise.resolve(null),
    ]);

    const campaignRows: DailyRow[] = campaignRecords.map((r) => ({
      date: r.date,
      campaignId: r.campaignId,
      name: r.name,
      adType: r.adType,
      status: r.status,
      dailyBudget: r.dailyBudget,
      expense: r.expense,
      impression: r.impression,
      click: r.click,
      order: r.order,
      gmv: r.gmv,
      directOrder: r.directOrder,
      directGmv: r.directGmv,
    }));

    const shopRows: ShopDailyRow[] = shopRecords.map((r) => ({
      date: r.date,
      expense: r.expense,
      impression: r.impression,
      click: r.click,
      order: r.order,
      gmv: r.gmv,
      directOrder: r.directOrder,
      directGmv: r.directGmv,
    }));

    const result = runAudit({
      campaignRows,
      shopRows,
      margin,
      balance: state?.balance ?? null,
      autoTopUp: state?.autoTopUp ?? null,
      lastSyncAt: state?.lastSyncAt ?? null,
      lastSyncStatus: state?.lastSyncStatus ?? null,
      lastSyncMessage: state?.lastSyncMessage ?? null,
    });

    // Dùng lại creds đã đọc ở trên, không query DB lần nữa.
    // authorized tách riêng khỏi configured: khai báo xong nhưng chưa uỷ quyền
    // là trạng thái rất dễ gặp, UI cần phân biệt để hướng dẫn đúng bước tiếp.
    return {
      ...result,
      configured: creds !== null,
      authorized: !!creds?.accessToken,
    };
  }
}
