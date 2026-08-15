import { Injectable, Logger, ServiceUnavailableException } from "@nestjs/common";

/**
 * Lớp gọi Google Ads API qua REST.
 *
 * VÌ SAO REST CHỨ KHÔNG DÙNG google-ads-api:
 *
 *  Thư viện `google-ads-api` chạy trên gRPC, kéo theo @grpc/grpc-js và một tập
 *  proto khá lớn. Backend này chạy serverless trên Vercel, cold start tính từng
 *  trăm mili giây và bundle bị giới hạn dung lượng. Sổ tay từ khoá của một shop
 *  chỉ cần vài endpoint, gọi REST bằng fetch có sẵn là đủ — không đáng đổi cold
 *  start cho tiện nghi của thư viện.
 *
 * VÌ SAO CÓ HAI CUSTOMER ID:
 *
 *  loginCustomerId là MCC — nghĩa là "tôi đi vào qua cửa quản lý này".
 *  customerId là tài khoản chạy quảng cáo thật — "tôi muốn sửa trong tài khoản
 *  này". Lẫn hai số này thì request vẫn đi nhưng tác động vào sai tài khoản, mà
 *  đây là tài khoản đang đốt tiền thật nên hậu quả không phải lỗi 400 hiền lành.
 */
@Injectable()
export class GoogleAdsClient {
  private readonly log = new Logger(GoogleAdsClient.name);

  /**
   * Access token dùng chung trong một lần chạy hàm serverless.
   *
   * Google trả token sống 1 giờ. Cache trong bộ nhớ tiến trình: cùng một
   * instance còn ấm thì nhiều request dùng lại được, instance mới thì tự xin
   * lại. Không lưu xuống DB — token sống ngắn, ghi ra ngoài chỉ thêm chỗ rò rỉ.
   */
  private accessToken: { value: string; hetHanLuc: number } | null = null;

  /** v21 đã sunset 5/8/2026. Cho đổi qua env để lần sau không phải sửa code. */
  private get version(): string {
    return process.env.GOOGLE_ADS_API_VERSION || "v23";
  }

  /** Bỏ dấu gạch ngang: Ads API chỉ nhận 10 chữ số liền nhau. */
  private soThuan(raw: string | undefined): string {
    return (raw || "").replace(/\D/g, "");
  }

  private get customerId(): string {
    return this.soThuan(process.env.GOOGLE_ADS_CUSTOMER_ID);
  }

  private get loginCustomerId(): string {
    return this.soThuan(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID);
  }

  /**
   * Mã tài khoản chạy quảng cáo (10 số, đã bỏ gạch), để dựng resource name kiểu
   * `customers/{cid}/adGroupCriteria/{adGroupId}~{criterionId}`.
   *
   * Đây KHÔNG phải bí mật — là số tài khoản Ads, hiện ngay trên giao diện Google.
   * Công khai getter thay vì để service tự đọc env: giữ một chỗ duy nhất chuẩn
   * hoá số (bỏ gạch), tránh mỗi nơi tự parse rồi lệch nhau.
   */
  maTaiKhoan(): string {
    return this.customerId;
  }

  /**
   * Đủ cấu hình để gọi Ads API hay chưa.
   *
   * Dùng để phần đọc từ khoá thật tự tắt một cách êm ả khi chưa có token, thay
   * vì đổ lỗi 500 vào mặt người dùng. Sổ tay vẫn xem được bình thường.
   */
  daCauHinh(): boolean {
    return Boolean(
      process.env.GOOGLE_ADS_DEVELOPER_TOKEN &&
        process.env.GOOGLE_ADS_CLIENT_ID &&
        process.env.GOOGLE_ADS_CLIENT_SECRET &&
        process.env.GOOGLE_ADS_REFRESH_TOKEN &&
        this.customerId,
    );
  }

  /** Liệt kê tên biến còn thiếu, để báo lỗi chỉ đúng chỗ cần sửa. */
  bienConThieu(): string[] {
    const can = [
      "GOOGLE_ADS_DEVELOPER_TOKEN",
      "GOOGLE_ADS_CLIENT_ID",
      "GOOGLE_ADS_CLIENT_SECRET",
      "GOOGLE_ADS_REFRESH_TOKEN",
      "GOOGLE_ADS_CUSTOMER_ID",
    ];
    return can.filter((t) => !process.env[t]);
  }

  /**
   * Đổi refresh token thành access token.
   *
   * Trừ đi 60 giây trước khi coi là hết hạn: request đang bay giữa đường mà
   * token chết ở giây cuối thì Google trả 401, mà 401 ở đây rất khó đoán nguyên
   * nhân vì nó trông giống hệt lỗi cấu hình sai.
   */
  private async layAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && this.accessToken.hetHanLuc > now) {
      return this.accessToken.value;
    }

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_ADS_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_ADS_CLIENT_SECRET || "",
        refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN || "",
        grant_type: "refresh_token",
      }).toString(),
    });

    const data: any = await res.json().catch(() => ({}));

    if (!res.ok || !data.access_token) {
      const ma = data?.error || res.status;

      // invalid_grant gần như luôn là một trong ba nguyên nhân dưới đây, mà
      // thông báo gốc của Google thì chỉ vỏn vẹn "Bad Request" nên rất dễ đi
      // sai hướng khi dò lỗi.
      if (ma === "invalid_grant") {
        this.log.error(
          "Refresh token bị từ chối. Ba nguyên nhân thường gặp: " +
            "(1) OAuth consent screen tụt về Testing — External + Testing thì " +
            "Google thu hồi refresh token sau 7 ngày; " +
            "(2) client secret đã bị rotate nên refresh token cũ chết theo; " +
            "(3) quyền của app đã bị thu hồi ở myaccount.google.com/permissions. " +
            "Cách sửa: chạy lại scripts/lay-refresh-token-ads.mjs.",
        );
        throw new ServiceUnavailableException(
          "Kết nối Google Ads đã hết hiệu lực, cần cấp quyền lại. Xem log server để biết cách sửa.",
        );
      }

      this.log.error(`Không lấy được access token: ${ma}`);
      throw new ServiceUnavailableException(
        "Không kết nối được Google Ads lúc này. Thử lại sau.",
      );
    }

    const songTrongGiay = Number(data.expires_in) || 3600;
    this.accessToken = {
      value: data.access_token,
      hetHanLuc: now + (songTrongGiay - 60) * 1000,
    };
    return data.access_token;
  }

  /** Header chung cho mọi request Ads API. */
  private async header(): Promise<Record<string, string>> {
    const token = await this.layAccessToken();
    const h: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN || "",
      "Content-Type": "application/json",
    };
    // Chỉ gửi login-customer-id khi đi qua MCC. Gửi bừa số rỗng là Google từ
    // chối cả request.
    if (this.loginCustomerId) h["login-customer-id"] = this.loginCustomerId;
    return h;
  }

  /**
   * Chạy một câu GAQL, trả về mảng row đã gộp từ các trang.
   *
   * Dùng `search` thay vì `searchStream`: searchStream trả về chuỗi JSON nối
   * nhau, phải tự cộng dồn và tách — không đáng cho vài trăm dòng, mà lại dễ
   * sai ở chỗ tách. `search` phân trang bằng nextPageToken, rõ ràng hơn.
   */
  async truyVan(gaql: string, gioiHanTrang = 10): Promise<any[]> {
    const url =
      `https://googleads.googleapis.com/${this.version}` +
      `/customers/${this.customerId}/googleAds:search`;

    const rows: any[] = [];
    let pageToken: string | undefined;
    let trang = 0;

    do {
      const res = await fetch(url, {
        method: "POST",
        headers: await this.header(),
        // KHÔNG gửi pageSize: từ Ads API v17+ tham số này bị bỏ, gửi vào là
        // Google trả lỗi "Setting the page size is not supported" và chặn cả
        // request. Response nay co page size co dinh 10000 dong, phan trang van
        // chay binh thuong qua nextPageToken.
        body: JSON.stringify({
          query: gaql,
          ...(pageToken ? { pageToken } : {}),
        }),
      });

      const data: any = await res.json().catch(() => ({}));
      if (!res.ok) this.nemLoi(res.status, data);

      rows.push(...(data.results || []));
      pageToken = data.nextPageToken;
      trang += 1;

      // Chặn vòng lặp vô tận nếu Google trả token lặp lại vì lý do nào đó.
      if (trang >= gioiHanTrang) break;
    } while (pageToken);

    return rows;
  }

  /**
   * Mã vùng địa lý Việt Nam cho Keyword Planner.
   *
   * geoTargetConstants/2704 — Việt Nam có criterion ID 2704 trong bảng
   * geo target constants của Google Ads (country codes). Cho override qua
   * GOOGLE_ADS_GEO_VN phòng khi cần nhắm hẹp hơn (một tỉnh) hoặc Google đổi
   * bảng. Nhận cả dạng số trần ("2704") lẫn resource name đầy đủ.
   */
  private get geoVietNam(): string {
    return this.chuanTaiNguyen(
      process.env.GOOGLE_ADS_GEO_VN || "2704",
      "geoTargetConstants",
    );
  }

  /**
   * Mã ngôn ngữ tiếng Việt cho Keyword Planner.
   *
   * languageConstants/1040 — tiếng Việt có criterion ID 1040 trong bảng
   * language constants của Google Ads. Cho override qua GOOGLE_ADS_LANG_VI.
   * Nhận cả dạng số trần ("1040") lẫn resource name đầy đủ.
   */
  private get ngonNguViet(): string {
    return this.chuanTaiNguyen(
      process.env.GOOGLE_ADS_LANG_VI || "1040",
      "languageConstants",
    );
  }

  /** Số trần thì bọc thành resource name; đã đầy đủ thì để nguyên. */
  private chuanTaiNguyen(raw: string, loai: string): string {
    const s = (raw || "").trim();
    return /^\d+$/.test(s) ? `${loai}/${s}` : s;
  }

  /**
   * Keyword Planner: xin gợi ý từ khoá từ vài từ gốc.
   *
   * KHÔNG dùng truyVan vì đây là endpoint khác hẳn: `:generateKeywordIdeas`
   * trên chính customer, không phải googleAds:search. Nó cũng trả `results`
   * kèm `nextPageToken` nên phân trang y như truyVan.
   *
   * CHỈ ĐỌC — không mutate, không đụng cấu hình hay tiền tài khoản.
   */
  async yTuongTuKhoa(seeds: string[], gioiHanTrang = 5): Promise<any[]> {
    const url =
      `https://googleads.googleapis.com/${this.version}` +
      `/customers/${this.customerId}:generateKeywordIdeas`;

    const results: any[] = [];
    let pageToken: string | undefined;
    let trang = 0;

    do {
      const res = await fetch(url, {
        method: "POST",
        headers: await this.header(),
        body: JSON.stringify({
          keywordSeed: { keywords: seeds },
          geoTargetConstants: [this.geoVietNam],
          language: this.ngonNguViet,
          keywordPlanNetwork: "GOOGLE_SEARCH",
          includeAdultKeywords: false,
          ...(pageToken ? { pageToken } : {}),
        }),
      });

      const data: any = await res.json().catch(() => ({}));
      if (!res.ok) this.nemLoi(res.status, data);

      results.push(...(data.results || []));
      pageToken = data.nextPageToken;
      trang += 1;

      if (trang >= gioiHanTrang) break;
    } while (pageToken);

    return results;
  }

  /** Gọi một mutate service, ví dụ `adGroupCriteria:mutate`. */
  async mutate(service: string, body: unknown): Promise<any> {
    const url =
      `https://googleads.googleapis.com/${this.version}` +
      `/customers/${this.customerId}/${service}`;

    const res = await fetch(url, {
      method: "POST",
      headers: await this.header(),
      body: JSON.stringify(body),
    });

    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) this.nemLoi(res.status, data);
    return data;
  }

  /**
   * Dịch lỗi của Ads API thành câu người dùng đọc được.
   *
   * Lỗi gốc lồng sâu trong error.details[].errors[].message và thường kèm mã
   * kiểu AuthorizationError.DEVELOPER_TOKEN_NOT_APPROVED — ghi nguyên văn vào
   * log để dò, còn trả cho người dùng câu ngắn.
   */
  private nemLoi(status: number, data: any): never {
    const chiTiet = data?.error?.details?.[0]?.errors?.[0];
    const goc = chiTiet?.message || data?.error?.message || `HTTP ${status}`;
    const ma = chiTiet?.errorCode ? JSON.stringify(chiTiet.errorCode) : "";

    this.log.error(`Ads API lỗi ${status}: ${goc} ${ma}`);

    // Developer token mới xin ở API Center nằm ở mức Test, chỉ gọi được tài
    // khoản test. Đây là chỗ vướng đầu tiên của gần như mọi lần tích hợp, nên
    // nói thẳng ra thay vì để người dùng đoán.
    if (ma.includes("DEVELOPER_TOKEN_NOT_APPROVED")) {
      throw new ServiceUnavailableException(
        "Developer token đang ở mức Test nên chưa gọi được tài khoản thật. " +
          "Vào MCC → Admin → API Center xin Basic Access.",
      );
    }
    if (ma.includes("DEVELOPER_TOKEN_PROHIBITED") || status === 401 || status === 403) {
      throw new ServiceUnavailableException(
        "Google Ads từ chối quyền truy cập. Kiểm tra developer token và " +
          "login-customer-id (MCC) đã đúng chưa.",
      );
    }

    throw new ServiceUnavailableException(`Google Ads báo lỗi: ${goc}`);
  }
}
