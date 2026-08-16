import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AssignKeywordDto } from "./dto/assign-keyword.dto";
import { AdsSyncService } from "./ads-sync.service";

@Injectable()
export class KeywordPoolService {
  private readonly log = new Logger(KeywordPoolService.name);

  constructor(
    private readonly db: PrismaService,
    private readonly adsSync: AdsSyncService,
  ) {}

  // ─── List ────────────────────────────────────────────────────────────────────

  async list(params: {
    projectTag?: string;
    q?: string;
    page?: number;
    pageSize?: number;
  }) {
    const { projectTag, q, page = 1, pageSize = 50 } = params;
    const take = Math.min(Math.max(Number(pageSize) || 50, 1), 200);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

    const where: any = {};
    if (projectTag) where.projectTag = projectTag;
    if (q) {
      where.text = { contains: q, mode: "insensitive" };
    }

    const [total, items] = await Promise.all([
      this.db.keywordPool.count({ where }),
      this.db.keywordPool.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          links: {
            select: {
              id: true,
              syncStatus: true,
              matchType: true,
              isNegative: true,
              adGroupId: true,
              campaignId: true,
              adsResourceName: true,
              lastSyncAt: true,
              lastError: true,
            },
          },
        },
      }),
    ]);

    return {
      total,
      page: Math.max(Number(page) || 1, 1),
      pageSize: take,
      items,
    };
  }

  // ─── Assign keyword → campaign/ad group ────────────────────────────────────

  async assign(dto: AssignKeywordDto) {
    const { keywordId, campaignId, isNegative = false, matchType = "broad" } =
      dto;

    // Validate keyword exists
    const keyword = await this.db.keywordPool.findUnique({
      where: { id: keywordId },
    });
    if (!keyword) throw new NotFoundException(`Keyword ${keywordId} không tìm thấy`);

    // Validate campaign exists
    const campaign = await this.db.gAdsCampaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) throw new NotFoundException(`Campaign ${campaignId} không tìm thấy`);

    // Resolve ad group: use provided or find/create default
    let adGroupId = dto.adGroupId;
    if (!adGroupId) {
      adGroupId = await this.resolveDefaultAdGroup(campaignId, campaign.name);
    } else {
      const ag = await this.db.gAdsAdGroup.findUnique({ where: { id: adGroupId } });
      if (!ag) throw new NotFoundException(`Ad group ${adGroupId} không tìm thấy`);
      if (ag.campaignId !== campaignId) {
        throw new BadRequestException(`Ad group ${adGroupId} không thuộc campaign ${campaignId}`);
      }
    }

    // Upsert link (idempotent on unique constraint)
    const link = await this.db.keywordCampaignLink.upsert({
      where: {
        keywordId_adGroupId_matchType_isNegative: {
          keywordId,
          adGroupId,
          matchType,
          isNegative,
        },
      },
      create: {
        keywordId,
        campaignId,
        adGroupId,
        matchType,
        isNegative,
        negativeScope: dto.negativeScope ?? null,
        syncStatus: "pending",
      },
      update: {
        // Re-queue if previously errored or removed
        syncStatus: "pending",
        lastError: null,
        negativeScope: dto.negativeScope ?? undefined,
        updatedAt: new Date(),
      },
    });

    this.log.log(
      `assign keyword=${keywordId} -> campaign=${campaignId} adGroup=${adGroupId} match=${matchType} negative=${isNegative} link=${link.id}`,
    );

    // Đẩy lên Google Ads NGAY trong request này. Người bấm nhận về syncStatus
    // thật (synced hoặc error) chứ không phải "pending" rồi phải tự đi hỏi lại.
    //
    // KHÔNG để lỗi Ads làm 500 cả request: dòng link đã ghi vào DB xong, và
    // pushKeywords đã ghi lastError vào link đó. Trả 200 kèm syncStatus='error'
    // + lastError để giao diện hiện đúng "đã lưu, chưa đẩy được, lý do là..."
    // — mất dòng link vì một lỗi mạng thì người dùng phải gán lại từ đầu.
    let ketQua: Awaited<ReturnType<AdsSyncService["pushKeywords"]>> | null = null;
    try {
      ketQua = await this.adsSync.pushKeywords([link.id], "assign");
    } catch (err) {
      this.log.error(`assign push link=${link.id} lỗi: ${err}`);
    }

    const sauKhiDay = await this.db.keywordCampaignLink.findUnique({
      where: { id: link.id },
    });

    return {
      ...(sauKhiDay ?? link),
      pushed: ketQua ? ketQua.succeeded > 0 : false,
      errors: ketQua?.errors ?? [],
    };
  }

  // ─── Unassign ────────────────────────────────────────────────────────────────

  async unassign(linkId: string) {
    const link = await this.db.keywordCampaignLink.findUnique({
      where: { id: linkId },
    });
    if (!link) throw new NotFoundException(`Link ${linkId} không tìm thấy`);

    // Safety guard: cannot delete while syncing
    if (link.syncStatus === "syncing") {
      throw new ConflictException(
        "Link đang trong quá trình đồng bộ, không thể xoá ngay. Thử lại sau.",
      );
    }

    // Xoá criterion trên Google Ads TRƯỚC, xoá dòng local SAU.
    //
    // Thứ tự này quan trọng: xoá dòng local trước mà Ads lỗi thì criterion còn
    // sống trên tài khoản thật, vẫn ăn tiền, mà mình mất luôn adsResourceName —
    // không còn cách nào tìm lại để xoá ngoài vào Google bấm tay. Nên Ads lỗi
    // thì GIỮ dòng local (đang ở syncStatus='error' kèm lastError) và trả về
    // deleted=false để giao diện nói thật là chưa xoá được.
    const ketQua = await this.adsSync.removeKeywords([linkId], "unassign");

    if (ketQua.failed > 0) {
      return {
        deleted: false,
        linkId,
        errors: ketQua.errors,
      };
    }

    await this.db.keywordCampaignLink.delete({ where: { id: linkId } });
    this.log.log(
      `unassign link=${linkId} keyword=${link.keywordId} campaign=${link.campaignId}`,
    );
    return { deleted: true, linkId, errors: [] as string[] };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  /**
   * Tìm hoặc tạo default ad group "[Campaign Name] - General" cho campaign.
   * Default ad group có type='default' để phân biệt với ad group thật từ Ads API.
   */
  private async resolveDefaultAdGroup(
    campaignId: string,
    campaignName: string,
  ): Promise<string> {
    const defaultName = `${campaignName} - General`;

    const existing = await this.db.gAdsAdGroup.findFirst({
      where: { campaignId, type: "default" },
    });
    if (existing) return existing.id;

    // Create a synthetic default ad group (id prefixed to avoid collision with real Ads IDs)
    const syntheticId = `default_${campaignId}`;
    const created = await this.db.gAdsAdGroup.upsert({
      where: { id: syntheticId },
      create: {
        id: syntheticId,
        campaignId,
        name: defaultName,
        status: "ENABLED",
        type: "default",
      },
      update: { name: defaultName },
    });

    return created.id;
  }
}
