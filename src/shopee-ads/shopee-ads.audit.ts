/**
 * Tính chỉ số và sinh khuyến nghị từ dữ liệu ads đã sync trong DB.
 *
 * Nguyên tắc: không tin các tỷ lệ tính sẵn từ API (ROAS/CTR/CIR) vì cách làm
 * tròn và cách quy kết khác nhau giữa các endpoint. Luôn tính lại từ số thô.
 *
 *   ROAS       = gmv / expense
 *   ACOS (CIR) = expense / gmv
 *   Hoà vốn    : ROAS_min = 1 / tỷ_lệ_lợi_nhuận_gộp
 *                (lãi gộp 25% sau phí sàn -> ROAS phải >= 4.0 mới không lỗ)
 */

/** Ngưỡng cảnh báo. Sửa ở đây nếu ngành hàng khác biệt. */
export const THRESHOLDS = {
  minClickForJudgement: 30, // dưới mức này coi là chưa đủ dữ liệu
  minImpressionForCtr: 500,
  lowCtr: 0.008, // CTR < 0.8% -> ảnh/tiêu đề/từ khoá lệch
  lowCr: 0.005, // CR < 0.5% -> trang sản phẩm hoặc giá có vấn đề
  wastedClickNoOrder: 20, // >= 20 click mà 0 đơn -> đốt tiền
  budgetCapRatio: 0.95, // chi >= 95% ngân sách -> bị giới hạn
  roasGapSevere: 0.5, // ROAS < 50% mức hoà vốn -> cắt ngay
  balanceLowDays: 5, // số dư đủ dưới 5 ngày -> cảnh báo
  concentrationRatio: 0.6, // 1 campaign ăn > 60% chi phí -> rủi ro tập trung
};

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

const SEVERITY_ORDER: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

export interface Finding {
  severity: Severity;
  title: string;
  scope: string;
  detail: string;
  action: string;
  campaignId?: string;
}

export interface Metrics {
  expense: number;
  impression: number;
  click: number;
  order: number;
  gmv: number;
  directOrder: number;
  directGmv: number;
  roas: number | null;
  acos: number | null;
  ctr: number | null;
  cr: number | null;
  cpc: number | null;
  cpo: number | null;
  aov: number | null;
  directShare: number | null;
}

export interface CampaignSummary extends Metrics {
  campaignId: string;
  name: string | null;
  adType: string | null;
  status: string | null;
  dailyBudget: number | null;
  activeDays: number;
  /** Số ngày chi tiêu đạt >= budgetCapRatio ngân sách ngày. */
  cappedDays: number;
}

export interface DailyPoint extends Metrics {
  date: string;
}

/** Một dòng campaign-ngày lấy từ bảng koi_shopee_ads_daily. */
export interface DailyRow {
  date: Date;
  campaignId: bigint | string | number;
  name?: string | null;
  adType?: string | null;
  status?: string | null;
  dailyBudget?: number | null;
  expense: number;
  impression: number;
  click: number;
  order: number;
  gmv: number;
  directOrder: number;
  directGmv: number;
}

/** Một dòng tổng shop-ngày lấy từ bảng koi_shopee_ads_shop_daily. */
export interface ShopDailyRow {
  date: Date;
  expense: number;
  impression: number;
  click: number;
  order: number;
  gmv: number;
  directOrder: number;
  directGmv: number;
}

export interface AuditInput {
  campaignRows: DailyRow[];
  shopRows: ShopDailyRow[];
  /** Tỷ lệ lợi nhuận gộp sau phí sàn, dạng 0..1. Null = chưa khai báo. */
  margin?: number | null;
  balance?: number | null;
  autoTopUp?: boolean | null;
  lastSyncAt?: Date | null;
  lastSyncStatus?: string | null;
  lastSyncMessage?: string | null;
}

export interface AuditResult {
  period: { start: string | null; end: string | null; days: number };
  breakevenRoas: number | null;
  margin: number | null;
  shop: Metrics;
  campaigns: CampaignSummary[];
  daily: DailyPoint[];
  findings: Finding[];
  summary: {
    campaignCount: number;
    activeCampaignCount: number;
    wastedSpend: number;
    countCritical: number;
    countHigh: number;
    /** True khi bảng tổng shop trống và số liệu shop được cộng từ campaign. */
    shopTotalsFromCampaigns: boolean;
  };
  sync: {
    lastSyncAt: string | null;
    status: string | null;
    message: string | null;
    balance: number | null;
    autoTopUp: boolean | null;
    /** Số ngày chi tiêu mà số dư còn trụ được, tính theo chi phí bình quân. */
    balanceDaysLeft: number | null;
  };
}

// ---------------------------------------------------------------------------
// Ép kiểu an toàn
// ---------------------------------------------------------------------------

/** Đổi giá trị về number. API/Prisma hay trả string, null, Decimal, có dấu phẩy. */
export function num(v: any, fallback = 0): number {
  if (v === null || v === undefined) return fallback;
  if (typeof v === 'number') return isFinite(v) ? v : fallback;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'bigint') return Number(v);
  const s = String(v).trim().replace(/,/g, '').replace(/%/g, '');
  if (!s) return fallback;
  const f = Number(s);
  return isFinite(f) ? f : fallback;
}

/** Chia an toàn. Trả null khi mẫu bằng 0 để phân biệt "không có" với "bằng 0". */
export function div(a: number, b: number): number | null {
  return b ? a / b : null;
}

function emptyMetrics(): Metrics {
  return {
    expense: 0,
    impression: 0,
    click: 0,
    order: 0,
    gmv: 0,
    directOrder: 0,
    directGmv: 0,
    roas: null,
    acos: null,
    ctr: null,
    cr: null,
    cpc: null,
    cpo: null,
    aov: null,
    directShare: null,
  };
}

/** Chỉ phần số thô — dùng chung cho dòng campaign, dòng shop và điểm theo ngày. */
type RawCounters = {
  expense?: number;
  impression?: number;
  click?: number;
  order?: number;
  gmv?: number;
  directOrder?: number;
  directGmv?: number;
};

/** Cộng số thô của một dòng vào accumulator. */
function accumulate(acc: Metrics, row: RawCounters): void {
  acc.expense += num(row.expense);
  acc.impression += num(row.impression);
  acc.click += num(row.click);
  acc.order += num(row.order);
  acc.gmv += num(row.gmv);
  acc.directOrder += num(row.directOrder);
  acc.directGmv += num(row.directGmv);
}

/** Tính lại toàn bộ tỷ lệ từ số thô đã cộng. */
function derive(m: Metrics): Metrics {
  m.roas = div(m.gmv, m.expense);
  m.acos = div(m.expense, m.gmv);
  m.ctr = div(m.click, m.impression);
  m.cr = div(m.order, m.click);
  m.cpc = div(m.expense, m.click);
  m.cpo = div(m.expense, m.order);
  m.aov = div(m.gmv, m.order);
  m.directShare = div(m.directGmv, m.gmv);
  return m;
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function fmtMoney(v: number): string {
  return Math.round(v).toLocaleString('vi-VN');
}

function fmtPct(v: number | null): string {
  return v === null ? '-' : `${(v * 100).toFixed(2)}%`;
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

export function runAudit(input: AuditInput): AuditResult {
  const { campaignRows, shopRows } = input;
  const margin = input.margin ?? null;
  const breakevenRoas = margin && margin > 0 && margin < 1 ? 1 / margin : null;

  // --- Gom theo campaign ---------------------------------------------------
  const byCampaign = new Map<string, CampaignSummary>();
  for (const row of campaignRows) {
    const id = String(row.campaignId);
    let c = byCampaign.get(id);
    if (!c) {
      c = {
        ...emptyMetrics(),
        campaignId: id,
        name: row.name ?? null,
        adType: row.adType ?? null,
        status: row.status ?? null,
        dailyBudget: row.dailyBudget ?? null,
        activeDays: 0,
        cappedDays: 0,
      };
      byCampaign.set(id, c);
    }
    // Snapshot mới nhất thắng: dòng được sắp xếp theo ngày tăng dần ở service.
    if (row.name) c.name = row.name;
    if (row.adType) c.adType = row.adType;
    if (row.status) c.status = row.status;
    if (row.dailyBudget !== null && row.dailyBudget !== undefined) {
      c.dailyBudget = row.dailyBudget;
    }

    accumulate(c, row);
    const dayExpense = num(row.expense);
    if (dayExpense > 0) c.activeDays += 1;
    const budget = num(row.dailyBudget, 0);
    if (budget > 0 && dayExpense >= budget * THRESHOLDS.budgetCapRatio) {
      c.cappedDays += 1;
    }
  }
  const campaigns = [...byCampaign.values()].map((c) => derive(c) as CampaignSummary);
  campaigns.sort((a, b) => b.expense - a.expense);

  // --- Gom theo ngày ------------------------------------------------------
  // Ưu tiên bảng tổng shop vì Shopee quy kết GMV toàn shop khác tổng campaign.
  const dailyMap = new Map<string, DailyPoint>();
  const shopTotalsFromCampaigns = shopRows.length === 0;
  const sourceRows: Array<{ date: Date; row: Partial<DailyRow> }> = shopTotalsFromCampaigns
    ? campaignRows.map((r) => ({ date: r.date, row: r }))
    : shopRows.map((r) => ({ date: r.date, row: r }));

  for (const { date, row } of sourceRows) {
    const key = toIsoDate(date);
    let d = dailyMap.get(key);
    if (!d) {
      d = { ...emptyMetrics(), date: key };
      dailyMap.set(key, d);
    }
    accumulate(d, row);
  }
  const daily = [...dailyMap.values()]
    .map((d) => derive(d) as DailyPoint)
    .sort((a, b) => a.date.localeCompare(b.date));

  // --- Tổng toàn shop ----------------------------------------------------
  const shop = emptyMetrics();
  for (const d of daily) accumulate(shop, d);
  derive(shop);

  const period = {
    start: daily.length ? daily[0].date : null,
    end: daily.length ? daily[daily.length - 1].date : null,
    days: daily.length,
  };

  // --- Phát hiện ---------------------------------------------------------
  const findings: Finding[] = [];
  let wastedSpend = 0;

  for (const c of campaigns) {
    const label = `campaign ${c.campaignId}${c.name ? ` - ${c.name}` : ''}`;

    // Đốt tiền mà không ra đơn.
    if (c.order === 0 && c.click >= THRESHOLDS.wastedClickNoOrder && c.expense > 0) {
      wastedSpend += c.expense;
      findings.push({
        severity: 'critical',
        title: 'Chi tiền nhưng không có đơn',
        scope: label,
        campaignId: c.campaignId,
        detail: `${fmtMoney(c.click)} click, chi ${fmtMoney(c.expense)}, 0 đơn.`,
        action:
          'Tạm dừng campaign này. Nếu sản phẩm quan trọng, kiểm tra tồn kho/giá và trang sản phẩm trước khi bật lại.',
      });
      continue; // đã là vấn đề nặng nhất, không cần cảnh báo ROAS nữa
    }

    // ROAS dưới điểm hoà vốn.
    if (breakevenRoas && c.roas !== null && c.click >= THRESHOLDS.minClickForJudgement) {
      const ratio = c.roas / breakevenRoas;
      if (ratio < THRESHOLDS.roasGapSevere) {
        findings.push({
          severity: 'critical',
          title: 'ROAS thấp hơn nửa điểm hoà vốn',
          scope: label,
          campaignId: c.campaignId,
          detail: `ROAS ${c.roas.toFixed(2)} so với hoà vốn ${breakevenRoas.toFixed(2)} (đạt ${(ratio * 100).toFixed(0)}%). Chi ${fmtMoney(c.expense)}, GMV ${fmtMoney(c.gmv)}.`,
          action: 'Tắt campaign hoặc hạ bid mạnh rồi thu hẹp về từ khoá chính xác.',
        });
      } else if (ratio < 1) {
        findings.push({
          severity: 'high',
          title: 'ROAS dưới điểm hoà vốn',
          scope: label,
          campaignId: c.campaignId,
          detail: `ROAS ${c.roas.toFixed(2)} so với hoà vốn ${breakevenRoas.toFixed(2)}. Chi ${fmtMoney(c.expense)}, GMV ${fmtMoney(c.gmv)}.`,
          action: 'Hạ bid 15-20%, cắt từ khoá không ra đơn, kiểm tra lại giá bán.',
        });
      } else if (ratio >= 2) {
        findings.push({
          severity: 'info',
          title: 'Campaign hiệu quả tốt - nên mở rộng',
          scope: label,
          campaignId: c.campaignId,
          detail: `ROAS ${c.roas.toFixed(2)}, cao gấp ${ratio.toFixed(1)} lần điểm hoà vốn.`,
          action: 'Tăng ngân sách 20-30% mỗi lần và theo dõi 3 ngày trước khi tăng tiếp.',
        });
      }
    }

    // Bị chặn ngân sách -> đang bỏ lỡ hiển thị.
    if (c.cappedDays >= 3 && c.activeDays > 0) {
      const profitable = !breakevenRoas || (c.roas !== null && c.roas >= breakevenRoas);
      findings.push({
        severity: profitable ? 'high' : 'low',
        title: 'Thường xuyên cạn ngân sách ngày',
        scope: label,
        campaignId: c.campaignId,
        detail: `${c.cappedDays}/${c.activeDays} ngày chi đạt >= ${(THRESHOLDS.budgetCapRatio * 100).toFixed(0)}% ngân sách (${c.dailyBudget ? fmtMoney(c.dailyBudget) : '?'}/ngày).`,
        action: profitable
          ? 'Campaign đang có lãi mà bị chặn trần: tăng ngân sách ngày để lấy thêm hiển thị.'
          : 'Ngân sách bị chặn nhưng chưa có lãi: tối ưu từ khoá trước, chưa tăng ngân sách.',
      });
    }

    // CTR thấp: vấn đề ảnh/tiêu đề/từ khoá lệch nhu cầu.
    if (c.impression >= THRESHOLDS.minImpressionForCtr && c.ctr !== null && c.ctr < THRESHOLDS.lowCtr) {
      findings.push({
        severity: 'medium',
        title: 'CTR thấp',
        scope: label,
        campaignId: c.campaignId,
        detail: `CTR ${fmtPct(c.ctr)} trên ${fmtMoney(c.impression)} hiển thị.`,
        action:
          'Đổi ảnh bìa, rút gọn tiêu đề đưa từ khoá chính lên đầu, loại từ khoá không khớp sản phẩm.',
      });
    }

    // CR thấp: click về nhưng trang sản phẩm không chốt được.
    if (c.click >= THRESHOLDS.minClickForJudgement && c.cr !== null && c.cr > 0 && c.cr < THRESHOLDS.lowCr) {
      findings.push({
        severity: 'medium',
        title: 'Tỷ lệ chuyển đổi thấp',
        scope: label,
        campaignId: c.campaignId,
        detail: `CR ${fmtPct(c.cr)} (${fmtMoney(c.order)} đơn / ${fmtMoney(c.click)} click).`,
        action:
          'Vấn đề nằm ở trang sản phẩm chứ không phải quảng cáo: xem lại giá so với đối thủ, ảnh, mô tả, đánh giá và phí vận chuyển.',
      });
    }
  }

  // Rủi ro tập trung: một campaign ăn phần lớn ngân sách.
  if (campaigns.length > 1 && shop.expense > 0) {
    const top = campaigns[0];
    const share = top.expense / shop.expense;
    if (share > THRESHOLDS.concentrationRatio) {
      findings.push({
        severity: 'low',
        title: 'Chi phí tập trung vào một campaign',
        scope: `campaign ${top.campaignId}${top.name ? ` - ${top.name}` : ''}`,
        campaignId: top.campaignId,
        detail: `Chiếm ${fmtPct(share)} tổng chi phí quảng cáo.`,
        action:
          'Tách thêm campaign cho nhóm sản phẩm khác để giảm phụ thuộc vào một nhóm từ khoá.',
      });
    }
  }

  // ROAS suy giảm: so nửa kỳ sau với nửa kỳ đầu.
  if (daily.length >= 8) {
    const mid = Math.floor(daily.length / 2);
    const first = emptyMetrics();
    const second = emptyMetrics();
    daily.slice(0, mid).forEach((d) => accumulate(first, d));
    daily.slice(mid).forEach((d) => accumulate(second, d));
    derive(first);
    derive(second);
    if (first.roas && second.roas && first.roas > 0) {
      const drop = 1 - second.roas / first.roas;
      if (drop >= 0.25) {
        findings.push({
          severity: 'high',
          title: 'ROAS đang suy giảm',
          scope: 'toàn shop',
          detail: `Nửa đầu kỳ ROAS ${first.roas.toFixed(2)}, nửa sau ${second.roas.toFixed(2)} (giảm ${(drop * 100).toFixed(0)}%).`,
          action:
            'Kiểm tra đối thủ tăng bid, hết hàng biến thể bán chạy, hoặc thay đổi giá gần đây.',
        });
      }
    }
  }

  // Số dư ví ads.
  let balanceDaysLeft: number | null = null;
  const avgDailySpend = daily.length ? shop.expense / daily.length : 0;
  if (input.balance !== null && input.balance !== undefined && avgDailySpend > 0) {
    balanceDaysLeft = input.balance / avgDailySpend;
    if (balanceDaysLeft < THRESHOLDS.balanceLowDays) {
      findings.push({
        severity: balanceDaysLeft < 2 ? 'high' : 'medium',
        title: 'Số dư quảng cáo còn thấp',
        scope: 'toàn shop',
        detail: `Còn ${fmtMoney(input.balance)}, đủ khoảng ${balanceDaysLeft.toFixed(1)} ngày chi tiêu.`,
        action: 'Nạp thêm để quảng cáo không dừng giữa chiến dịch.',
      });
    }
  }
  if (input.autoTopUp === false) {
    findings.push({
      severity: 'low',
      title: 'Chưa bật tự động nạp tiền',
      scope: 'toàn shop',
      detail: 'auto_top_up đang tắt.',
      action: 'Bật tự động nạp để tránh gián đoạn ngoài giờ làm việc.',
    });
  }

  // Kết luận toàn shop.
  if (breakevenRoas && shop.roas !== null && shop.expense > 0) {
    const ratio = shop.roas / breakevenRoas;
    findings.push({
      severity: ratio < 1 ? 'critical' : 'info',
      title: ratio < 1 ? 'Toàn shop đang lỗ trên quảng cáo' : 'Toàn shop đang có lãi trên quảng cáo',
      scope: 'toàn shop',
      detail: `ROAS ${shop.roas.toFixed(2)} so với hoà vốn ${breakevenRoas.toFixed(2)} (đạt ${(ratio * 100).toFixed(0)}%).`,
      action:
        ratio < 1
          ? 'Cắt các campaign lỗ nặng ở trên trước, rồi mới xét tăng giá bán hoặc giảm giá vốn.'
          : 'Có thể tăng ngân sách trên các campaign ROAS cao nhất.',
    });
  }

  findings.sort((a, b) => {
    const s = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    return s !== 0 ? s : b.detail.length - a.detail.length;
  });

  return {
    period,
    breakevenRoas,
    margin,
    shop,
    campaigns,
    daily,
    findings,
    summary: {
      campaignCount: campaigns.length,
      activeCampaignCount: campaigns.filter((c) => c.expense > 0).length,
      wastedSpend,
      countCritical: findings.filter((f) => f.severity === 'critical').length,
      countHigh: findings.filter((f) => f.severity === 'high').length,
      shopTotalsFromCampaigns,
    },
    sync: {
      lastSyncAt: input.lastSyncAt ? input.lastSyncAt.toISOString() : null,
      status: input.lastSyncStatus ?? null,
      message: input.lastSyncMessage ?? null,
      balance: input.balance ?? null,
      autoTopUp: input.autoTopUp ?? null,
      balanceDaysLeft,
    },
  };
}
