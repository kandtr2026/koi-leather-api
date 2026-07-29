/**
 * Cấu hình endpoint + mapping field cho Shopee Open API v2 (module ads).
 *
 * QUAN TRỌNG: các path và tên field dưới đây dựa trên spec Shopee Open API v2.
 * Shopee đổi tên field / thêm field khá thường xuyên và khác nhau giữa các thị
 * trường. Nếu sync báo lỗi "error_param" hoặc thiếu cột thì sửa TRỰC TIẾP trong
 * file này, không cần sửa logic ở chỗ khác.
 *
 * Đối chiếu tại: https://open.shopee.com/documents/v2 (module Ads)
 */

export const SHOPEE_HOSTS: Record<string, string> = {
  live: 'https://partner.shopeemobile.com',
  sandbox: 'https://partner.test-stable.shopeemobile.com',
};

/** Trang uỷ quyền: mở trên browser, chủ shop bấm đồng ý. */
export const PATH_AUTH_PARTNER = '/api/v2/shop/auth_partner';
/** Đổi `code` (Shopee trả về sau khi uỷ quyền) thành access_token. */
export const PATH_TOKEN_GET = '/api/v2/auth/access_token/get';
export const PATH_TOKEN_REFRESH = '/api/v2/auth/access_token/refresh';

export const PATH_ADS_BALANCE = '/api/v2/ads/get_total_balance';
export const PATH_ADS_SHOP_TOGGLE = '/api/v2/ads/get_shop_toggle_info';
export const PATH_ADS_ALL_DAILY = '/api/v2/ads/get_all_cpc_ads_daily_performance';
export const PATH_CAMPAIGN_ID_LIST = '/api/v2/ads/get_product_level_campaign_id_list';
export const PATH_CAMPAIGN_SETTING = '/api/v2/ads/get_product_level_campaign_setting_info';
export const PATH_CAMPAIGN_DAILY = '/api/v2/ads/get_product_campaign_daily_performance';

/**
 * Module ads dùng DD-MM-YYYY (khác các module khác dùng unix timestamp).
 * Nếu API trả lỗi "invalid date" thì đổi sang 'YYYY-MM-DD'.
 */
export const ADS_DATE_FORMAT: 'DD-MM-YYYY' | 'YYYY-MM-DD' = 'DD-MM-YYYY';

/** Số campaign_id tối đa mỗi lần gọi performance. */
export const CAMPAIGN_ID_CHUNK = 100;

/** Số ngày tối đa mỗi lần gọi performance (Shopee giới hạn khoảng ngày). */
export const MAX_DAYS_PER_CALL = 30;

/**
 * Normalize tên field. Key = tên chuẩn dùng nội bộ, value = các tên có thể
 * xuất hiện trong response tuỳ endpoint/thị trường.
 */
const FIELD_ALIASES: Record<string, string[]> = {
  campaignId: ['campaign_id', 'campaignid', 'id'],
  name: ['campaign_name', 'ad_name', 'name', 'title'],
  adType: ['ad_type', 'campaign_type', 'type'],
  status: ['status', 'state', 'campaign_status'],
  dailyBudget: ['daily_budget', 'budget', 'campaign_budget'],
  date: ['date', 'stat_date', 'report_date'],
  expense: ['expense', 'cost', 'spend', 'total_expense'],
  impression: ['impression', 'impressions', 'view', 'total_impression'],
  click: ['click', 'clicks', 'total_click'],
  order: ['order', 'orders', 'order_amount', 'conversion', 'total_order'],
  gmv: ['gmv', 'sales', 'revenue', 'order_gmv', 'total_gmv'],
  directOrder: ['direct_order', 'direct_orders', 'direct_conversion'],
  directGmv: ['direct_gmv', 'direct_sales', 'direct_revenue'],
  balance: ['balance', 'total_balance', 'ads_balance'],
  autoTopUp: ['auto_top_up', 'auto_topup', 'auto_top_up_status'],
};

/** Bảng tra ngược: tên thô (lowercase) -> tên chuẩn. */
const REVERSE_ALIASES: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const [canonical, aliases] of Object.entries(FIELD_ALIASES)) {
    for (const alias of aliases) {
      // Alias đầu tiên thắng: thứ tự trong FIELD_ALIASES là thứ tự ưu tiên.
      if (!(alias in map)) map[alias] = canonical;
    }
  }
  return map;
})();

/**
 * Đổi tên field thô của Shopee về tên chuẩn nội bộ.
 * Field lạ được giữ nguyên để không mất dữ liệu khi Shopee thêm cột mới.
 */
export function normalizeRow(row: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [key, value] of Object.entries(row)) {
    const canonical = REVERSE_ALIASES[key.toLowerCase()];
    if (canonical) {
      // Không ghi đè giá trị đã có: alias ưu tiên cao hơn đã set trước đó.
      if (out[canonical] === undefined || out[canonical] === null) {
        out[canonical] = value;
      }
    } else {
      out[key] = value;
    }
  }
  return out;
}

/** Format ngày theo định dạng module ads yêu cầu. */
export function formatAdsDate(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return ADS_DATE_FORMAT === 'DD-MM-YYYY' ? `${day}-${m}-${y}` : `${y}-${m}-${day}`;
}

/** Parse ngày từ response (chịu nhiều định dạng + unix timestamp). */
export function parseAdsDate(v: any): Date | null {
  if (v === null || v === undefined || v === '') return null;
  const s = String(v).trim();

  // Unix timestamp (giây)
  if (/^\d{10}$/.test(s)) {
    const d = new Date(Number(s) * 1000);
    return isNaN(d.getTime()) ? null : toUtcMidnight(d);
  }

  let m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(s); // DD-MM-YYYY
  if (m) return new Date(Date.UTC(+m[3], +m[2] - 1, +m[1]));

  m = /^(\d{4})[-/](\d{2})[-/](\d{2})$/.exec(s); // YYYY-MM-DD
  if (m) return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : toUtcMidnight(d);
}

export function toUtcMidnight(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
