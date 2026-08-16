import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AdsSyncService } from "./ads-sync.service";

@Injectable()
export class SyncService {
  private readonly log = new Logger(SyncService.name);

  /**
   * Cửa sổ chống bấm trùng. Job cùng loại đang "running" và mới mở trong vòng
   * này thì chặn 409.
   *
   * VÌ SAO 5 PHÚT MÀ KHÔNG PHẢI VÔ HẠN. Hàm serverless bị cắt giữa đường sẽ để
   * lại một dòng log "running" mãi mãi (không còn worker nào đóng nó). Nếu chặn
   * vô điều kiện theo dòng đó thì một lần chạy chết là khoá sạch nút bấm, phải
   * vào DB sửa tay mới dùng lại được. Quá 5 phút thì coi dòng cũ là rác và cho
   * chạy tiếp — dài hơn mọi lần chạy thật (2-5 giây) rất nhiều nên không cắt
   * ngang việc đang chạy.
   */
  private static readonly CUA_SO_CHAY_MS = 5 * 60 * 1000;

  constructor(
    private readonly db: PrismaService,
    private readonly adsSync: AdsSyncService,
  ) {}

  // ─── Pull / Push ──────────────────────────────────────────────────────────

  /** Hút campaign + ad group từ Google Ads về DB local. Chạy đồng bộ. */
  async pull(triggeredBy = "manual") {
    await this.chanBamTrung("pull_campaigns");
    const batDau = Date.now();
    const ketQua = await this.adsSync.pullCampaigns(triggeredBy);
    return { ...ketQua, durationMs: Date.now() - batDau };
  }

  /**
   * Đẩy link lên Google Ads. Không truyền linkIds = đẩy tất cả pending/error.
   */
  async push(linkIds?: string[], triggeredBy = "manual") {
    await this.chanBamTrung("push_keywords");
    return this.adsSync.pushKeywords(linkIds, triggeredBy);
  }

  // ─── Status ───────────────────────────────────────────────────────────────

  async getStatus(limit = 20) {
    const logs = await this.db.syncJobLog.findMany({
      orderBy: { startedAt: "desc" },
      take: Math.min(Math.max(Number(limit) || 20, 1), 100),
    });

    const pendingCount = await this.db.keywordCampaignLink.count({
      where: { syncStatus: "pending" },
    });
    const errorCount = await this.db.keywordCampaignLink.count({
      where: { syncStatus: "error" },
    });
    const syncedCount = await this.db.keywordCampaignLink.count({
      where: { syncStatus: "synced" },
    });

    return {
      pendingLinks: pendingCount,
      errorLinks: errorCount,
      syncedLinks: syncedCount,
      recentJobs: logs,
    };
  }

  // ─── Cron sweep ───────────────────────────────────────────────────────────

  /**
   * Việc dọn dẹp hằng ngày cho cron: gỡ link kẹt, thử lại link lỗi, hút lại
   * cấu trúc tài khoản.
   *
   * KHÔNG chặn bấm trùng ở đây: cron chạy theo lịch cố định, mà chặn thì một
   * lần chạy chết để lại dòng "running" sẽ làm lịch hôm sau bị bỏ luôn.
   *
   * Pull đứng SAU push: push xong mới hút lại để trạng thái đọc ra là mới nhất.
   * Lỗi của pull không được làm mất kết quả push đã chạy, nên bắt riêng.
   */
  async sweep() {
    const stuckReset = await this.adsSync.goLinkKet();

    const ketQuaPush = await this.adsSync.pushKeywords(undefined, "cron");

    let campaignCount = 0;
    let adGroupCount = 0;
    let pullError: string | null = null;
    try {
      const ketQuaPull = await this.adsSync.pullCampaigns("cron");
      campaignCount = ketQuaPull.campaignCount;
      adGroupCount = ketQuaPull.adGroupCount;
    } catch (err) {
      pullError = err instanceof Error ? err.message : String(err);
      this.log.error(`sweep: pull campaigns lỗi — ${pullError}`);
    }

    return {
      stuckReset,
      retriedLinks: ketQuaPush.total,
      retriedSucceeded: ketQuaPush.succeeded,
      retriedFailed: ketQuaPush.failed,
      campaignCount,
      adGroupCount,
      ...(pullError ? { pullError } : {}),
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  /**
   * Chặn double-click: job cùng loại đang chạy trong cửa sổ CUA_SO_CHAY_MS thì
   * ném 409.
   *
   * Đây là chốt CHO NGƯỜI DÙNG BẤM HAI LẦN, không phải khoá phân tán. Hai
   * request vào cùng một phần nghìn giây trên hai instance vẫn lọt được cả hai
   * — nhưng pushMotLink đã có chốt riêng (adsResourceName + syncStatus) nên
   * không đẻ criterion trùng trên tài khoản thật.
   */
  private async chanBamTrung(jobType: string): Promise<void> {
    const dangChay = await this.db.syncJobLog.findFirst({
      where: {
        jobType,
        status: "running",
        startedAt: { gt: new Date(Date.now() - SyncService.CUA_SO_CHAY_MS) },
      },
      orderBy: { startedAt: "desc" },
    });

    if (dangChay) {
      throw new HttpException(
        {
          statusCode: HttpStatus.CONFLICT,
          message: `Đã có job ${jobType} đang chạy (id: ${dangChay.id}). Đợi nó xong rồi thử lại.`,
          runningJobId: dangChay.id,
        },
        HttpStatus.CONFLICT,
      );
    }
  }
}
