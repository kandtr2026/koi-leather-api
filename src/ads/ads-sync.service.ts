import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { GoogleAdsClient } from "./google-ads.client";

export type KetQuaPull = { campaignCount: number; adGroupCount: number };

export type KetQuaPush = {
  total: number;
  succeeded: number;
  failed: number;
  errors: string[];
};

/**
 * Đồng bộ Keyword Pool ↔ Google Ads — CHẠY ĐỒNG BỘ NGAY TRONG REQUEST.
 *
 * VÌ SAO KHÔNG CÒN QUEUE. Bản trước đẩy việc qua BullMQ/Redis. Nhưng đồng bộ từ
 * khoá chỉ chạy khi chủ tiệm chủ động bấm nút, mỗi lần vài chục criterion, gọi
 * Ads API mất 2-5 giây. Vercel Pro cho hàm chạy tới 300 giây nên làm thẳng trong
 * request là vừa đủ — mà lại bỏ được cả Redis, cả tầng worker, và người bấm thấy
 * kết quả thật ngay thay vì một jobId phải đi tra sau.
 *
 * MỘT LINK LỖI KHÔNG LÀM CHẾT CẢ LÔ. Không còn retry tự động của queue, nên mỗi
 * link tự chịu lỗi của mình: ghi syncStatus='error' + lastError + retryCount rồi
 * đi tiếp link kế. Lỗi được gom vào mảng errors trả về cho người bấm đọc, và lần
 * bấm sau sẽ tự lấy lại đúng những link đang error đó.
 */
@Injectable()
export class AdsSyncService {
  private readonly log = new Logger(AdsSyncService.name);

  /**
   * Link kẹt ở "syncing" lâu hơn mốc này coi như lần chạy trước đã chết giữa
   * đường (hàm serverless bị cắt, deploy đè...). Phải gỡ về "error" trước khi
   * push, không thì nó kẹt vĩnh viễn: pushKeywords chỉ nhặt pending/error.
   */
  private static readonly MOC_KET_MS = 15 * 60 * 1000;

  constructor(
    private readonly db: PrismaService,
    private readonly gads: GoogleAdsClient,
  ) {}

  // ─── Pull campaigns + ad groups ────────────────────────────────────────────

  /**
   * Hút campaign (ENABLED) + ad group con từ Google Ads về DB local.
   *
   * Một campaign lỗi chỉ tính vào failed rồi đi tiếp — không để một campaign
   * hỏng chặn cả tài khoản. Lỗi ở tầng ngoài (mất token, Ads API sập) thì đóng
   * log là "error" rồi ném lên cho controller trả lỗi thật.
   */
  async pullCampaigns(triggeredBy = "manual"): Promise<KetQuaPull> {
    const logId = await this.moLog("pull_campaigns", triggeredBy);
    this.log.log(`pull_campaigns start (logId=${logId})`);

    let campaignCount = 0;
    let adGroupCount = 0;
    let failed = 0;

    try {
      const campaignRows = await this.gads.truyVan(`
        SELECT
          campaign.id,
          campaign.name,
          campaign.status,
          campaign.advertising_channel_type,
          campaign_budget.amount_micros
        FROM campaign
        WHERE campaign.status = 'ENABLED'
      `);

      const customerId = this.gads.maTaiKhoan();

      for (const row of campaignRows) {
        const c = row.campaign;
        const budget = row.campaignBudget;
        try {
          await this.db.gAdsCampaign.upsert({
            where: { id: String(c.id) },
            create: {
              id: String(c.id),
              customerId,
              name: c.name,
              status: c.status,
              advertisingChannelType: c.advertisingChannelType ?? null,
              budgetMicros: budget?.amountMicros
                ? BigInt(budget.amountMicros)
                : null,
              syncedAt: new Date(),
            },
            update: {
              name: c.name,
              status: c.status,
              advertisingChannelType: c.advertisingChannelType ?? null,
              budgetMicros: budget?.amountMicros
                ? BigInt(budget.amountMicros)
                : null,
              syncedAt: new Date(),
            },
          });

          adGroupCount += await this.syncAdGroupsForCampaign(
            String(c.id),
            c.name,
          );
          campaignCount++;
        } catch (err) {
          this.log.error(`Failed to upsert campaign ${c.id}: ${err}`);
          failed++;
        }
      }

      await this.dongLog(logId, {
        total: campaignRows.length,
        succeeded: campaignCount,
        failed,
      });

      this.log.log(
        `pull_campaigns done: ${campaignCount} campaign, ${adGroupCount} ad group, ${failed} lỗi`,
      );
      return { campaignCount, adGroupCount };
    } catch (err) {
      this.log.error(`pull_campaigns error: ${err}`);
      await this.loiLog(logId, err, {
        total: campaignCount + failed,
        succeeded: campaignCount,
        failed,
      });
      throw err;
    }
  }

  /**
   * Hút ad group của một campaign + đảm bảo có default ad group.
   *
   * Trả về số ad group đã ghi (kể cả default) để pullCampaigns cộng dồn.
   */
  private async syncAdGroupsForCampaign(
    campaignId: string,
    campaignName: string,
  ): Promise<number> {
    // Chỉ nhận chuỗi toàn chữ số trước khi nối vào câu GAQL. campaignId đến từ
    // Ads API nên hiện tại luôn là số, nhưng đây là chỗ DUY NHẤT có nội suy
    // chuỗi vào GAQL — để hở là mở đường tiêm câu truy vấn khi nguồn dữ liệu
    // đổi (import từ file, tham số người dùng...).
    const safeCampaignId = String(campaignId);
    if (!/^\d+$/.test(safeCampaignId)) {
      this.log.warn(`Skipping invalid campaignId: ${safeCampaignId}`);
      return 0;
    }

    const rows = await this.gads.truyVan(`
      SELECT
        ad_group.id,
        ad_group.name,
        ad_group.status,
        ad_group.type
      FROM ad_group
      WHERE campaign.id = ${safeCampaignId}
        AND ad_group.status = 'ENABLED'
    `);

    let dem = 0;
    for (const row of rows) {
      const ag = row.adGroup;
      await this.db.gAdsAdGroup.upsert({
        where: { id: String(ag.id) },
        create: {
          id: String(ag.id),
          campaignId: safeCampaignId,
          name: ag.name,
          status: ag.status,
          type: "custom",
          syncedAt: new Date(),
        },
        update: {
          name: ag.name,
          status: ag.status,
          syncedAt: new Date(),
        },
      });
      dem++;
    }

    // Default ad group để người dùng gán từ khoá mà không phải chọn ad group.
    // id có tiền tố default_ nên không đụng id thật của Ads.
    const defaultId = `default_${safeCampaignId}`;
    await this.db.gAdsAdGroup.upsert({
      where: { id: defaultId },
      create: {
        id: defaultId,
        campaignId: safeCampaignId,
        name: `${campaignName} - General`,
        status: "ENABLED",
        type: "default",
      },
      update: { name: `${campaignName} - General` },
    });
    dem++;

    return dem;
  }

  // ─── Push keywords lên Google Ads ──────────────────────────────────────────

  /**
   * Đẩy link lên Ads. Không truyền linkIds thì lấy tất cả link pending/error.
   *
   * Gỡ link kẹt "syncing" trước khi chọn, để lần chạy chết giữa đường không để
   * lại link không bao giờ được nhặt lại.
   */
  async pushKeywords(
    linkIds?: string[],
    triggeredBy = "manual",
  ): Promise<KetQuaPush> {
    await this.goLinkKet();

    let danhSach: string[];
    if (linkIds?.length) {
      danhSach = linkIds;
    } else {
      const links = await this.db.keywordCampaignLink.findMany({
        where: { syncStatus: { in: ["pending", "error"] } },
        select: { id: true },
      });
      danhSach = links.map((l) => l.id);
    }

    const logId = await this.moLog("push_keywords", triggeredBy);
    this.log.log(`push_keywords start: ${danhSach.length} link (logId=${logId})`);

    let succeeded = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const linkId of danhSach) {
      try {
        await this.pushMotLink(linkId);
        succeeded++;
      } catch (err) {
        // Cố ý KHÔNG ném lên: mỗi link tự chịu lỗi của mình, cả lô vẫn đi tiếp.
        // pushMotLink đã ghi error/lastError/retryCount vào DB trước khi ném.
        const moTa = `${linkId}: ${this.moTaLoi(err)}`;
        this.log.error(`push_keywords link ${moTa}`);
        errors.push(moTa);
        failed++;
      }
    }

    await this.dongLog(logId, {
      total: danhSach.length,
      succeeded,
      failed,
      errorSummary: errors.length ? errors.join(" | ").slice(0, 1000) : null,
    });

    this.log.log(`push_keywords done: ${succeeded} ok, ${failed} lỗi`);
    return { total: danhSach.length, succeeded, failed, errors };
  }

  /**
   * Tạo criterion cho một link trên Google Ads.
   *
   * Đã có adsResourceName thì KHÔNG gọi create lần nữa — chỉ đóng dấu synced.
   * Không có chốt này thì mỗi lần bấm lại đẻ thêm một ADGROUP_CRITERION trùng
   * trong tài khoản đang tiêu tiền thật, và Ads không tự khử trùng cho mình.
   */
  private async pushMotLink(linkId: string): Promise<void> {
    const link = await this.db.keywordCampaignLink.findUnique({
      where: { id: linkId },
      include: { keyword: true, adGroup: true },
    });

    if (!link) {
      this.log.warn(`Link ${linkId} không tìm thấy, bỏ qua`);
      return;
    }

    if (link.syncStatus === "synced" && link.adsResourceName) {
      this.log.log(`Link ${linkId} đã synced, bỏ qua`);
      return;
    }

    // Default ad group là dòng tự dựng của mình (id default_<campaignId>), KHÔNG
    // tồn tại bên Google. Đẩy vào đó là Ads trả lỗi resource not found mà thông
    // báo rất khó hiểu, nên chặn sớm và nói rõ phải chọn ad group thật.
    if (link.adGroupId.startsWith("default_")) {
      const loi =
        "Ad group mặc định chỉ có trong sổ tay, chưa có trên Google Ads. " +
        "Chọn một ad group thật rồi gán lại.";
      await this.ghiLoiLink(linkId, loi);
      throw new Error(loi);
    }

    // Đóng dấu syncing để lần bấm song song không đẩy trùng cùng một link.
    await this.db.keywordCampaignLink.update({
      where: { id: linkId },
      data: { syncStatus: "syncing", updatedAt: new Date() },
    });

    try {
      const customerId = this.gads.maTaiKhoan();
      const adGroupResource = `customers/${customerId}/adGroups/${link.adGroupId}`;

      const criterion: any = {
        adGroup: adGroupResource,
        negative: link.isNegative,
        keyword: {
          text: link.keyword.text,
          matchType: link.matchType.toUpperCase(),
        },
      };

      const result = await this.gads.mutate("adGroupCriteria:mutate", {
        operations: [{ create: criterion }],
      });

      const resourceName: string = result?.results?.[0]?.resourceName ?? "";

      await this.db.keywordCampaignLink.update({
        where: { id: linkId },
        data: {
          syncStatus: "synced",
          adsResourceName: resourceName || null,
          lastSyncAt: new Date(),
          lastError: null,
          updatedAt: new Date(),
        },
      });
    } catch (err) {
      await this.ghiLoiLink(linkId, this.moTaLoi(err));
      throw err;
    }
  }

  // ─── Remove keywords khỏi Google Ads ───────────────────────────────────────

  /**
   * Xoá criterion trên Ads cho các link chỉ định, rồi đánh dấu "removed".
   *
   * Link chưa có adsResourceName thì chưa từng lên Ads — đánh dấu removed luôn
   * và tính là thành công, không gọi API (gọi cũng không có gì để xoá).
   */
  async removeKeywords(
    linkIds: string[],
    triggeredBy = "manual",
  ): Promise<KetQuaPush> {
    const danhSach = linkIds ?? [];
    const logId = await this.moLog("remove_keyword", triggeredBy);
    this.log.log(`remove_keyword start: ${danhSach.length} link (logId=${logId})`);

    let succeeded = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const linkId of danhSach) {
      try {
        await this.removeMotLink(linkId);
        succeeded++;
      } catch (err) {
        const moTa = `${linkId}: ${this.moTaLoi(err)}`;
        this.log.error(`remove_keyword link ${moTa}`);
        errors.push(moTa);
        failed++;
      }
    }

    await this.dongLog(logId, {
      total: danhSach.length,
      succeeded,
      failed,
      errorSummary: errors.length ? errors.join(" | ").slice(0, 1000) : null,
    });

    this.log.log(`remove_keyword done: ${succeeded} ok, ${failed} lỗi`);
    return { total: danhSach.length, succeeded, failed, errors };
  }

  private async removeMotLink(linkId: string): Promise<void> {
    const link = await this.db.keywordCampaignLink.findUnique({
      where: { id: linkId },
    });

    if (!link) {
      this.log.warn(`Link ${linkId} không tìm thấy, bỏ qua`);
      return;
    }

    if (!link.adsResourceName) {
      await this.db.keywordCampaignLink.update({
        where: { id: linkId },
        data: {
          syncStatus: "removed",
          lastSyncAt: new Date(),
          lastError: null,
          updatedAt: new Date(),
        },
      });
      return;
    }

    try {
      await this.gads.mutate("adGroupCriteria:mutate", {
        operations: [{ remove: link.adsResourceName }],
      });

      await this.db.keywordCampaignLink.update({
        where: { id: linkId },
        data: {
          syncStatus: "removed",
          lastSyncAt: new Date(),
          lastError: null,
          updatedAt: new Date(),
        },
      });
    } catch (err) {
      await this.ghiLoiLink(linkId, this.moTaLoi(err));
      throw err;
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  /**
   * Gỡ link kẹt ở "syncing" quá lâu về "error". Trả về số dòng đã gỡ.
   *
   * Public vì sweep() bên SyncService cần con số này để báo cáo.
   */
  async goLinkKet(): Promise<number> {
    const { count } = await this.db.keywordCampaignLink.updateMany({
      where: {
        syncStatus: "syncing",
        updatedAt: { lt: new Date(Date.now() - AdsSyncService.MOC_KET_MS) },
      },
      data: {
        syncStatus: "error",
        lastError: "Lần đồng bộ trước bị cắt giữa đường — gỡ khỏi trạng thái syncing",
      },
    });
    if (count > 0) this.log.warn(`Đã gỡ ${count} link kẹt ở syncing`);
    return count;
  }

  private async ghiLoiLink(linkId: string, loi: string): Promise<void> {
    await this.db.keywordCampaignLink.update({
      where: { id: linkId },
      data: {
        syncStatus: "error",
        lastError: loi.slice(0, 500),
        retryCount: { increment: 1 },
        updatedAt: new Date(),
      },
    });
  }

  /** Lấy câu lỗi ngắn gọn, không lộ stack trace ra phản hồi API. */
  private moTaLoi(err: unknown): string {
    const raw =
      err instanceof Error ? err.message : String(err ?? "Lỗi không rõ");
    return raw.slice(0, 500);
  }

  private async moLog(jobType: string, triggeredBy: string): Promise<string> {
    const row = await this.db.syncJobLog.create({
      data: { jobType, triggeredBy, status: "running" },
      select: { id: true },
    });
    return row.id;
  }

  private async dongLog(
    logId: string,
    d: {
      total: number;
      succeeded: number;
      failed: number;
      errorSummary?: string | null;
    },
  ): Promise<void> {
    await this.db.syncJobLog.update({
      where: { id: logId },
      data: {
        status: d.failed > 0 ? (d.succeeded > 0 ? "partial" : "error") : "done",
        totalItems: d.total,
        succeededItems: d.succeeded,
        failedItems: d.failed,
        errorSummary: d.errorSummary ?? null,
        finishedAt: new Date(),
      },
    });
  }

  private async loiLog(
    logId: string,
    err: unknown,
    d: { total: number; succeeded: number; failed: number },
  ): Promise<void> {
    await this.db.syncJobLog.update({
      where: { id: logId },
      data: {
        status: "error",
        errorSummary: this.moTaLoi(err),
        totalItems: d.total,
        succeededItems: d.succeeded,
        failedItems: d.failed,
        finishedAt: new Date(),
      },
    });
  }
}
