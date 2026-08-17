import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { GoogleAdsClient } from "./google-ads.client";
import { OpenAiClient } from "../ai-edit/openai.client";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Cụm "Ads ↔ Landing ↔ SEO" (bước 1, 2, 3, 6 của luồng):
 *   1. landingCampaigns  — campaign đang chạy + URL landing của quảng cáo.
 *   2. phanTichLanding   — fetch landing (allowlist host), lột chữ, GPT tóm tắt.
 *   3. chamTuKhoa        — GPT chấm một lô từ khoá so với landing: nenDung /
 *                          nenChan / nenThem (nenThem ưu tiên search term thật).
 *   6. vietSeoDraft      — GPT viết nháp khối nội dung SEO bổ sung (H2, FAQ).
 *
 * Thêm verified pool (luuVerified / docVerified / xoaVerified): từ khoá ĐÃ ĐẨY
 * lên Ads ghi theo từng landing để lần chấm sau heoiu lọc ra, khỏi duyệt lại
 * từ đầu. Phần này CHỈ ghi Postgres, vẫn không mutate tài khoản Ads.
 *
 * CHỈ ĐỌC + NHÁP. Cả cụm KHÔNG gọi mutate() nào xuống Google Ads: bước 4-5
 * (review + đẩy) đi qua sổ tay KoiAdKeyword và push-bulk đã có sẵn.
 *
 * Ngân sách thời gian: hàm serverless sống 300 giây (maxDuration trong
 * vercel.json); fetch landing trần 15 giây + một lượt GPT trần 4 phút
 * (OpenAiClient.hanChoMs) — tổng lý thuyết 255 giây, vẫn dưới hạn của hàm.
 * Chạm trần thì request bị Vercel cắt và heoiu nhận timeout — bấm lại được,
 * không mất dữ liệu gì.
 */

// Chỉ fetch ĐÚNG các host này — chốt chống SSRF. Không có nó thì ai có quyền
// admin gọi analyze với url=http://169.254.169.254/... là mượn được server đọc
// metadata cloud. Kiểm TRƯỚC fetch (400) và kiểm LẠI host của res.url SAU khi
// đã theo redirect: chuyển hướng sang host ngoài danh sách là bỏ.
const HOST_CHO_PHEP = new Set([
  "koileather.com",
  "www.koileather.com",
  "kitleather.com",
  "www.kitleather.com",
]);

// Trần chờ tải trang landing. Hết hạn thì AbortController abort và báo lỗi gọn
// thay vì treo cả request đến khi Vercel cắt.
const HAN_CHO_FETCH_MS = 15_000;

// Text lột được cắt ở 8000 ký tự trước khi vào prompt — đủ ý một trang landing
// mà không đốt token vô ích. Đây cũng chính là `textTrich` trả về cho heoiu
// (hop dong API: textTrich = text trích cắt 8000, KHÔNG phải bản GPT tóm tắt).
const TOI_DA_TEXT = 8000;

// Trần dung lượng HTML đọc vào. Trang lớn hơn thì cắt bỏ phần đuôi — text rốt
// cuộc cũng chỉ lấy 8000 ký tự đầu, phần thừa không mang thêm thông tin.
const TOI_DA_HTML = 1_500_000;

// Trần một lô chấm (heoiu tự chia lô gọi nhiều lần) và trần search term kèm
// theo. Trùng mức ValidateDto ở biên, kẹp lại lần nữa cho chắc khi ai đó gọi
// thẳng qua curl bỏ qua DTO.
const TOI_DA_LO = 120;
const TOI_DA_SEARCH_TERM = 100;

// Token trần cho mỗi lượt GPT: đủ cho 120 từ khoá chấm hoặc ~6 khối HTML nháp.
const TOI_DA_TOKEN = 6000;

const HE_THONG_PHAN_TICH = `Bạn là chuyên gia phân tích nội dung cho cửa hàng đồ da thủ công Koi Leather (koileather.com, khách người Việt, chốt đơn qua Zalo).
Nhiệm vụ: đọc text trích từ một trang landing và trả về ba điều:
- "tomTat": 2-3 câu tiếng Việt, trang này bán gì / nói về gì, có gì nổi bật.
- "intent": 1 câu tiếng Việt mô tả ý định tìm kiếm của người mà trang này đáp ứng đúng.
- "banKinh": mảng các nhóm sản phẩm / dịch vụ trang nhắc tới (ví dụ "ví da nam", "thắt lưng da bò", "dây đồng hồ da"), mỗi mục tối đa vài chữ.
Trả về DUY NHẤT một JSON đúng khuôn:
{"tomTat":"...","intent":"...","banKinh":["..."]}
Không bịa thứ trang không nhắc tới. Trang không bán gì rõ ràng thì nói thẳng trong tomTat.`;

const HE_THONG_CHAM = `Bạn là chuyên gia Google Ads + SEO cho cửa hàng đồ da thủ công Koi Leather (khách người Việt).
Nhiệm vụ: so từng từ khoá quảng cáo với nội dung trang landing được cung cấp và chia làm ba nhóm:
- "nenDung": từ khoá KHỚP nội dung trang — khách bấm vào thấy đúng thứ họ tìm, đáng giữ chạy tiếp.
- "nenChan": từ khoá LẠC ĐỀ — trang không có thứ khách tìm, giữ chỉ tốn tiền.
- "nenThem": từ khoá CHƯA có trong danh sách chấm nhưng đáng chạy thêm cho trang này.
Trả về DUY NHẤT một JSON đúng khuôn:
{"nenDung":["..."],"nenChan":["..."],"nenThem":[{"tuKhoa":"...","lyDo":"một câu tiếng Việt"}]}
Quy tắc cứng:
- nenDung và nenChan chỉ được lấy NGUYÊN VĂN từ danh sách từ khoá nhận được — không tự chế, không sửa chữ, mỗi từ thuộc đúng một nhóm.
- nenThem KHÔNG lặp lại từ đã có trong danh sách chấm. Ưu tiên TUYỆT ĐỐI các search term thật khách đã gõ (có số click/chuyển đổi kèm theo) — đó là nhu cầu thật đã trả tiền để biết. Chỉ đề xuất ngoài danh sách đó khi thật sự chắc chắn và phải ghi lyDo.`;

const HE_THONG_SEO = `Bạn là người viết nội dung SEO tiếng Việt cho cửa hàng đồ da thủ công Koi Leather (koileather.com). Cửa hàng bán đồ da handmade: ví, thắt lưng, cặp/túi, ốp lưng và phụ kiện da thật; khách chốt đơn qua Zalo.
Nhiệm vụ: viết các KHỐI NỘI DUNG BỔ SUNG cho trang landing dựa trên danh sách từ khoá được duyệt, để trang phủ thêm ý định tìm kiếm mà không sửa phần đang có:
- 2-4 khối "h2_section": mỗi khối một đoạn H2 mở rộng (150-250 chữ) về một chủ đề trong danh sách từ khoá.
- 1 khối "faq": 4-6 câu hỏi đáp ngắn khách thật sự sẽ thắc mắc.
Trả về DUY NHẤT một JSON đúng khuôn:
{"sections":[{"loai":"h2_section"|"faq","tieuDe":"...","noiDungHtml":"..."}],"ghiChu":"một câu tiếng Việt ghi chú cho chủ shop"}
Quy tắc cứng:
- noiDungHtml chỉ dùng thẻ: h2, h3, p, ul, ol, li, strong, em. KHÔNG dùng script, iframe, img, link, style, table.
- Khối h2_section tự mở bằng <h2>...</h2> rồi đến <p>; khối faq mở bằng <h2> rồi mỗi cặp hỏi-đáp là <h3> + <p>.
- Viết tự nhiên, đúng sự thật về đồ da handmade; KHÔNG bịa giá, chính sách bảo hành, số liệu hay chứng nhận mà dữ liệu cung cấp không có.
- "ghiChu" nói ngắn gọn: khối nào nên đặt ở đâu trên trang.`;

/** Một đề xuất thêm từ khoá trong kết quả chấm. */
export interface DeXuatThem {
  tuKhoa: string;
  /** "search_term" = khách thật đã gõ (kèm số liệu); "ai_de_xuat" = GPT nghĩ ra. */
  nguon: string;
  cuBam?: number;
  cuChuyenDoi?: number;
  lyDo?: string;
}

@Injectable()
export class LandingSeoService {
  private readonly log = new Logger(LandingSeoService.name);

  constructor(
    private readonly gg: GoogleAdsClient,
    private readonly openai: OpenAiClient,
    // Verified pool ghi Postgres. PrismaModule là @Global (AdsModule đã import
    // sẵn) nên chỉ việc tiêm vào, không khai báo thêm ở module.
    private readonly db: PrismaService,
  ) {}

  // ─── Bước 1: campaign đang chạy + URL landing ─────────────────────────────

  /**
   * Campaign ENABLED kèm finalUrls của quảng cáo ENABLED bên trong, gom theo
   * campaign (một campaign nhiều quảng cáo thường trỏ về vài landing khác nhau).
   *
   * Cùng khuôn trả daNoi/thieuBien với các route đọc Ads khác (tuKhoaThat,
   * layStructure): chưa cấu hình biến thì trả daNoi=false êm ả thay vì 500,
   * heoiu dựa vào đó vẽ bảng "chưa nối Google Ads".
   */
  async landingCampaigns(): Promise<{
    daNoi: boolean;
    thieuBien?: string[];
    dsCampaign: Array<{ id: string; ten: string; dsUrl: string[] }>;
  }> {
    if (!this.gg.daCauHinh()) {
      return { daNoi: false, thieuBien: this.gg.bienConThieu(), dsCampaign: [] };
    }

    const rows = await this.gg.truyVan(
      `SELECT campaign.id, campaign.name, ad_group_ad.ad.final_urls
       FROM ad_group_ad
       WHERE campaign.status = 'ENABLED' AND ad_group_ad.status = 'ENABLED'`,
    );

    // Gom theo campaign.id; Set khử trùng URL (nhiều quảng cáo trỏ cùng một
    // landing là chuyện thường).
    const gom = new Map<string, { id: string; ten: string; dsUrl: Set<string> }>();
    for (const r of rows) {
      const id = String(r?.campaign?.id ?? "");
      if (!id) continue;
      let c = gom.get(id);
      if (!c) {
        c = { id, ten: String(r?.campaign?.name ?? ""), dsUrl: new Set() };
        gom.set(id, c);
      }
      const urls = r?.adGroupAd?.ad?.finalUrls;
      if (Array.isArray(urls)) {
        for (const u of urls) {
          if (typeof u === "string" && u.trim()) c.dsUrl.add(u.trim());
        }
      }
    }

    return {
      daNoi: true,
      dsCampaign: Array.from(gom.values()).map((c) => ({
        id: c.id,
        ten: c.ten,
        dsUrl: Array.from(c.dsUrl),
      })),
    };
  }

  // ─── Bước 2: fetch landing + GPT tóm tắt ───────────────────────────────────

  /**
   * Tải trang landing, lột chữ và nhờ GPT tóm tắt.
   *
   * `textTrich` trả về là text đã lột cắt 8000 ký tự — heoiu cầm nó đưa sang
   * bước chấm/viết sau này, không phải fetch lại. `loi` chỉ có mặt khi
   * ok=false; khi ok=true thì mọi trường đều đầy đủ.
   */
  async phanTichLanding(url: string): Promise<{
    ok: boolean;
    tomTat: string;
    intent: string;
    banKinh: string[];
    textTrich: string;
    loi?: string;
  }> {
    // 1. Chốt SSRF trước khi fetch: phải parse được, đúng http/https và host
    //    trong danh sách. Sai ở đây là 400 (lỗi của người gọi), không rơi vào
    //    nhánh ok:false của lỗi mạng.
    let u: URL;
    try {
      u = new URL(url);
    } catch {
      throw new BadRequestException("url không phải địa chỉ hợp lệ");
    }
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      throw new BadRequestException("Chỉ nhận địa chỉ http/https");
    }
    if (!HOST_CHO_PHEP.has(u.hostname.toLowerCase())) {
      throw new BadRequestException(
        "Chỉ phân tích trang thuộc koileather.com hoặc kitleather.com",
      );
    }

    // 2. Tải trang. redirect:'follow' nhưng SAU đó kiểm lại host của res.url —
    //    follow mà không kiểm lại thì allowlist chỉ là hình thức.
    const dungSau = new AbortController();
    const hen = setTimeout(() => dungSau.abort(), HAN_CHO_FETCH_MS);
    let res: Response;
    try {
      res = await fetch(u.toString(), {
        redirect: "follow",
        signal: dungSau.signal,
        headers: {
          "User-Agent": "KoiBackend-LandingCheck/1.0",
          Accept: "text/html",
        },
      });
    } catch (e) {
      const loi = e as Error;
      return this.loPhanTich(
        loi.name === "AbortError"
          ? `Trang landing phản hồi quá ${HAN_CHO_FETCH_MS / 1000} giây`
          : `Không tải được trang landing: ${loi.message}`,
      );
    } finally {
      clearTimeout(hen);
    }

    let dichDen: URL;
    try {
      dichDen = new URL(res.url);
    } catch {
      return this.loPhanTich("Không xác định được địa chỉ sau chuyển hướng");
    }
    if (!HOST_CHO_PHEP.has(dichDen.hostname.toLowerCase())) {
      return this.loPhanTich(
        `Trang chuyển hướng sang ${dichDen.hostname} — ngoài danh sách cho phép`,
      );
    }
    if (!res.ok) {
      return this.loPhanTich(`Trang landing trả mã lỗi HTTP ${res.status}`);
    }
    const kieu = res.headers.get("content-type") || "";
    if (kieu && !/text\/html/i.test(kieu)) {
      return this.loPhanTich("Địa chỉ này không trả về trang HTML");
    }

    // 3. Lột chữ. Trần HTML cắt ngay ở đây để chuỗi xử lý bên dưới không phình.
    const html = (await res.text()).slice(0, TOI_DA_HTML);
    const textTrich = this.lotHtml(html);
    if (!textTrich) {
      return this.loPhanTich("Không trích được chữ nào từ trang (trang rỗng hoặc toàn script)");
    }

    // 4. GPT tóm tắt. Lỗi GPT (chưa đặt key, quá hạn, JSON hỏng...) trả ok:false
    //    kèm câu lỗi thân thiện của OpenAiClient — không để exception thoát ra
    //    ngoài vì heoiu cần một khuôn trả lời nhất quán để vẽ.
    try {
      const kq = await this.openai.sinhJson(
        HE_THONG_PHAN_TICH,
        `Text trích từ trang ${dichDen.toString()}:\n"""${textTrich}"""`,
        TOI_DA_TOKEN,
      );
      const d = (kq.dulieu && typeof kq.dulieu === "object" ? kq.dulieu : {}) as Record<string, unknown>;
      const tomTat = typeof d.tomTat === "string" ? d.tomTat.trim().slice(0, 2000) : "";
      const intent = typeof d.intent === "string" ? d.intent.trim().slice(0, 1000) : "";
      const banKinh = Array.isArray(d.banKinh)
        ? d.banKinh
            .filter((x): x is string => typeof x === "string" && !!x.trim())
            .map((x) => x.trim().slice(0, 200))
            .slice(0, 30)
        : [];
      if (!tomTat) {
        return this.loPhanTich("GPT không trả được tóm tắt hợp lệ — thử lại");
      }
      return { ok: true, tomTat, intent, banKinh, textTrich };
    } catch (e) {
      const loi = e as Error;
      this.log.warn(`Phân tích landing lỗi GPT (${dichDen.toString()}): ${loi.message}`);
      return this.loPhanTich(loi.message);
    }
  }

  // ─── Bước 3: chấm lô từ khoá ───────────────────────────────────────────────

  /**
   * Chấm MỘT LÔ từ khoá so với landing, chia ba nhóm.
   *
   * Chống GPT bịa: nenDung/nenChan chỉ nhận từ khớp (không phân biệt hoa
   * thường) với lô đầu vào — trả lại đúng chữ gốc; nenThem bỏ từ trùng lô đầu
   * vào, và mỗi đề xuất phải neo được vào search term heoiu gửi kèm hoặc có
   * lyDo thật. `loi` chỉ có mặt khi lô rỗng hoặc GPT lỗi.
   */
  async chamTuKhoa(body: {
    landingText: string;
    tomTat?: string;
    intent?: string;
    tuKhoas: string[];
    searchTerms?: Array<{ term: string; cuBam?: number; cuChuyenDoi?: number }>;
  }): Promise<{
    nenDung: string[];
    nenChan: string[];
    nenThem: DeXuatThem[];
    loi?: string;
  }> {
    const rongs = { nenDung: [] as string[], nenChan: [] as string[], nenThem: [] as DeXuatThem[] };

    const vao = this.lamSachLo(body.tuKhoas, TOI_DA_LO);
    if (!vao.length) {
      return { ...rongs, loi: "Lô từ khoá rỗng sau khi lọc" };
    }

    // Search term thật: Map khoá lowercase để neo đề xuất của GPT về đúng số
    // liệu heoiu gửi — KHÔNG tin con số GPT chép lại trong câu trả lời.
    const terms: Array<{ term: string; cuBam: number; cuChuyenDoi: number }> = [];
    for (const t of body.searchTerms ?? []) {
      if (!t || typeof t.term !== "string" || !t.term.trim()) continue;
      terms.push({
        term: t.term.trim(),
        cuBam: Number(t.cuBam) > 0 ? Number(t.cuBam) : 0,
        cuChuyenDoi: Number(t.cuChuyenDoi) > 0 ? Number(t.cuChuyenDoi) : 0,
      });
      if (terms.length >= TOI_DA_SEARCH_TERM) break;
    }
    const termMap = new Map(terms.map((t) => [t.term.toLowerCase(), t]));

    const dongTuKhoa = vao.map((k, i) => `${i + 1}. "${k}"`).join("\n");
    const dongTerm = terms.length
      ? terms.map((t, i) => `${i + 1}. "${t.term}" | click ${t.cuBam} | chuyển đổi ${t.cuChuyenDoi}`).join("\n")
      : "(chưa có dữ liệu search term)";
    const caGui =
      `Nội dung trang landing (text đã lột):\n"""${(body.landingText || "").slice(0, TOI_DA_TEXT)}"""\n` +
      (body.tomTat ? `Tóm tắt trang: ${body.tomTat.slice(0, 2000)}\n` : "") +
      (body.intent ? `Ý định tìm kiếm hợp với trang: ${body.intent.slice(0, 1000)}\n` : "") +
      `\nDanh sách từ khoá cần chấm (${vao.length} từ):\n${dongTuKhoa}\n` +
      `\nSearch term thật khách đã gõ trong 30 ngày qua (chưa phải từ khoá):\n${dongTerm}\n` +
      `\nTrả về JSON đúng khuôn đã nêu trong hướng dẫn hệ thống.`;

    let duLieu: unknown;
    try {
      const kq = await this.openai.sinhJson(HE_THONG_CHAM, caGui, TOI_DA_TOKEN);
      duLieu = kq.dulieu;
    } catch (e) {
      const loi = e as Error;
      this.log.warn(`Chấm từ khoá lỗi GPT: ${loi.message}`);
      return { ...rongs, loi: loi.message };
    }

    const d = (duLieu && typeof duLieu === "object" ? duLieu : {}) as Record<string, unknown>;
    const goc = new Map(vao.map((k) => [k.toLowerCase(), k]));
    const nenDung = this.neoTheoLo(d.nenDung, goc);
    const nenChan = this.neoTheoLo(d.nenChan, goc);

    // nenChan và nenDung không được chéo nhau — GPT thỉnh thoảng bỏ một từ vào
    // cả hai nhóm. nenDung thắng: thà giữ nhầm còn hơn chặn nhầm một từ đang
    // chạy ra tiền mà chủ shop chưa kịp nhìn.
    const daDung = new Set(nenDung.map((k) => k.toLowerCase()));
    const nenChanSach = nenChan.filter((k) => !daDung.has(k.toLowerCase()));

    const nenThem: DeXuatThem[] = [];
    const daCoTrongLo = new Set(vao.map((k) => k.toLowerCase()));
    const daThem = new Set<string>();
    const mangThem = Array.isArray(d.nenThem) ? d.nenThem : [];
    for (const b of mangThem) {
      if (!b || typeof b !== "object") continue;
      const e = b as Record<string, unknown>;
      const tuKhoa = typeof e.tuKhoa === "string" ? e.tuKhoa.trim() : "";
      if (!tuKhoa) continue;
      const khoa = tuKhoa.toLowerCase();
      if (daCoTrongLo.has(khoa) || daThem.has(khoa)) continue;
      daThem.add(khoa);
      const lyDo = typeof e.lyDo === "string" ? e.lyDo.trim().slice(0, 500) : "";
      const trongTerm = termMap.get(khoa);
      // Đề xuất "ai_de_xuat" mà không có lyDo thì bỏ: không có gì cho chủ shop
      // thẩm định. Đề xuất trùng search term thì luôn giữ — bản thân số click
      // đã là bằng chứng.
      if (!trongTerm && !lyDo) continue;
      nenThem.push(
        trongTerm
          ? { tuKhoa, nguon: "search_term", cuBam: trongTerm.cuBam, cuChuyenDoi: trongTerm.cuChuyenDoi, ...(lyDo ? { lyDo } : {}) }
          : { tuKhoa, nguon: "ai_de_xuat", lyDo },
      );
    }

    return { nenDung, nenChan: nenChanSach, nenThem };
  }

  // ─── Bước 6: nháp khối nội dung SEO ────────────────────────────────────────

  /**
   * Viết nháp các khối H2/FAQ phủ từ khoá đã duyệt. CHỈ LÀ NHÁP trả về heoiu —
   * không ghi xuống landing, không đẩy đi đâu; chủ shop tự dán sau khi duyệt.
   *
   * HTML GPT trả được lọc lại (locHtml): prompt đã dặn chỉ thẻ sạch nhưng
   * không bao giờ tin — lỡ model chèn script/iframe thì nháp này sẽ được dán
   * thẳng vào trang bán hàng.
   */
  async vietSeoDraft(body: {
    landingText: string;
    tomTat?: string;
    tuKhoas: string[];
    url?: string;
  }): Promise<{
    sections: Array<{ loai: string; tieuDe: string; noiDungHtml: string }>;
    ghiChu: string;
    loi?: string;
  }> {
    const rongs = { sections: [] as Array<{ loai: string; tieuDe: string; noiDungHtml: string }>, ghiChu: "" };

    const vao = this.lamSachLo(body.tuKhoas, 200);
    if (!vao.length) {
      return { ...rongs, loi: "Danh sách từ khoá rỗng sau khi lọc" };
    }

    const dongTuKhoa = vao.map((k, i) => `${i + 1}. "${k}"`).join("\n");
    const caGui =
      `Nội dung trang landing hiện tại (text đã lột):\n"""${(body.landingText || "").slice(0, TOI_DA_TEXT)}"""\n` +
      (body.tomTat ? `Tóm tắt trang: ${body.tomTat.slice(0, 2000)}\n` : "") +
      (body.url ? `Địa chỉ trang: ${body.url}\n` : "") +
      `\nDanh sách từ khoá đã duyệt cần phủ (${vao.length} từ):\n${dongTuKhoa}\n` +
      `\nTrả về JSON đúng khuôn đã nêu trong hướng dẫn hệ thống.`;

    let duLieu: unknown;
    try {
      const kq = await this.openai.sinhJson(HE_THONG_SEO, caGui, TOI_DA_TOKEN);
      duLieu = kq.dulieu;
    } catch (e) {
      const loi = e as Error;
      this.log.warn(`Viết nháp SEO lỗi GPT: ${loi.message}`);
      return { ...rongs, loi: loi.message };
    }

    const d = (duLieu && typeof duLieu === "object" ? duLieu : {}) as Record<string, unknown>;
    const sections: Array<{ loai: string; tieuDe: string; noiDungHtml: string }> = [];
    const mang = Array.isArray(d.sections) ? d.sections : [];
    for (const b of mang) {
      if (!b || typeof b !== "object") continue;
      const e = b as Record<string, unknown>;
      // Chỉ nhận đúng hai loại khối đã hẹn; loai lạ = model chế thêm, bỏ.
      const loai = e.loai === "faq" ? "faq" : e.loai === "h2_section" ? "h2_section" : null;
      if (!loai) continue;
      const tieuDe = typeof e.tieuDe === "string" ? e.tieuDe.trim().slice(0, 300) : "";
      const html = typeof e.noiDungHtml === "string" ? this.locHtml(e.noiDungHtml).slice(0, 20_000) : "";
      if (!tieuDe || !html) continue;
      sections.push({ loai, tieuDe, noiDungHtml: html });
      // Trần 8 khối: prompt chỉ đòi tối đa ~5, thừa là chế — cắt cho an toàn.
      if (sections.length >= 8) break;
    }
    const ghiChu = typeof d.ghiChu === "string" ? d.ghiChu.trim().slice(0, 500) : "";

    if (!sections.length) {
      return { ...rongs, loi: "GPT không trả được khối nội dung nào hợp lệ — thử lại" };
    }
    return { sections, ghiChu };
  }

  // ─── Verified pool: từ đã đẩy lên Ads theo từng landing ────────────────────
  //
  // CHỈ ghi Postgres, KHÔNG mutate tài khoản Ads. Pool là bộ nhớ của quyết định
  // "đã đẩy" để lần chấm sau heoiu lọc ra, khỏi bắt chủ shop duyệt lại từ đầu.
  // Chủ shop đã chốt: CHỈ lưu từ đã đẩy ('pushed'), từ bị loại không ghi.

  /**
   * Lưu quyết định "đã đẩy" vào verified pool của một landing.
   *
   * Khoá theo (urlLanding, tuKhoa) nên đẩy lại là upsert: tạo dòng mới nếu chưa
   * có, cập nhật quyetDinh + chienDich nếu đã có — GIỮ taoLuc gốc của lần đẩy
   * đầu. Chuẩn hoá từ khoá trim + lowercase (phải trùng byte-for-byte cách heoiu
   * chuẩn hoá khi lọc), khử trùng trong lô. quyetDinh !== 'pushed' bị bỏ qua dù
   * DTO đã chặn — không tin client. Host ngoài HOST_CHO_PHEP là 400: defense-
   * in-depth chống gieo rác pool bằng URL không phải landing của tiệm.
   */
  async luuVerified(
    url: string,
    dsQuyetDinh: Array<{ tuKhoa: string; quyetDinh: string; chienDich?: string | null }>,
  ): Promise<{ ok: boolean; daLuu: number }> {
    const urlLanding = this.kiemHostLanding(url);

    const thay = new Set<string>();
    const hopLe: Array<{ tuKhoa: string; chienDich: string | null }> = [];
    for (const item of dsQuyetDinh ?? []) {
      if (!item || item.quyetDinh !== "pushed") continue;
      const tuKhoa = String(item.tuKhoa || "")
        .trim()
        .toLowerCase();
      if (!tuKhoa || thay.has(tuKhoa)) continue;
      thay.add(tuKhoa);
      hopLe.push({
        tuKhoa,
        chienDich:
          typeof item.chienDich === "string" && item.chienDich.trim()
            ? item.chienDich.trim()
            : null,
      });
    }

    // Một transaction cho cả lô: lưu dở giữa chừng thì không có nửa pool.
    if (hopLe.length) {
      await this.db.$transaction(
        hopLe.map((item) =>
          this.db.koiLandingVerified.upsert({
            where: { urlLanding_tuKhoa: { urlLanding, tuKhoa: item.tuKhoa } },
            create: {
              urlLanding,
              tuKhoa: item.tuKhoa,
              quyetDinh: "pushed",
              chienDich: item.chienDich,
            },
            // CHỈ hai trường này — taoLuc giữ nguyên của lần đẩy đầu.
            update: { quyetDinh: "pushed", chienDich: item.chienDich },
          }),
        ),
      );
    }

    return { ok: true, daLuu: hopLe.length };
  }

  /**
   * Đọc TOÀN BỘ verified pool — heoiu cầm về tự lọc theo landing khi chấm điểm.
   * Xếp taoLuc desc để từ mới đẩy hiện trước. Pool nhỏ (chỉ từ đã đẩy) nên trả
   * cả bảng, không phân trang.
   */
  async docVerified(): Promise<{
    ok: boolean;
    ds: Array<{
      id: string;
      urlLanding: string;
      tuKhoa: string;
      quyetDinh: string;
      chienDich: string | null;
      taoLuc: Date;
    }>;
  }> {
    const ds = await this.db.koiLandingVerified.findMany({
      orderBy: { taoLuc: "desc" },
    });
    return { ok: true, ds };
  }

  /**
   * Xoá SẠCH pool của MỘT landing — dùng khi landing bị bỏ hoặc dựng lại từ đầu.
   * deleteMany theo đúng urlLanding đã lưu, không đụng pool landing khác. Host lạ
   * vẫn bị 400 (không có dòng nào của host lạ trong bảng, nhưng chặn sớm cho
   * lỗi hiện ra ngay thay vì trả daXoa=0 im lặng).
   */
  async xoaVerified(url: string): Promise<{ ok: boolean; daXoa: number }> {
    const urlLanding = this.kiemHostLanding(url);
    const kq = await this.db.koiLandingVerified.deleteMany({
      where: { urlLanding },
    });
    return { ok: true, daXoa: kq.count };
  }

  /**
   * Chốt host cho verified pool: parse được, http/https, host trong HOST_CHO_PHEP
   * — CÙNG danh sách analyze dùng (bên kia chống SSRF, bên này chống gieo rác
   * pool). Trả lại url đã trim làm khoá lưu: pool khoá bằng chuỗi heoiu gửi,
   * nên heoiu phải gửi ĐÚNG MỘT chuỗi cho lưu/đọc/xoá cùng một landing.
   */
  private kiemHostLanding(url: string): string {
    const urlLanding = String(url || "").trim();
    let u: URL;
    try {
      u = new URL(urlLanding);
    } catch {
      throw new BadRequestException("url không phải địa chỉ hợp lệ");
    }
    if (u.protocol !== "http:" && u.protocol !== "https:") {
      throw new BadRequestException("Chỉ nhận địa chỉ http/https");
    }
    if (!HOST_CHO_PHEP.has(u.hostname.toLowerCase())) {
      throw new BadRequestException(
        "Chỉ nhận trang thuộc koileather.com hoặc kitleather.com",
      );
    }
    return urlLanding;
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  /** Khuôn trả lời nhất quán khi bước phân tích hỏng ở bất kỳ đâu. */
  private loPhanTich(loi: string): {
    ok: boolean;
    tomTat: string;
    intent: string;
    banKinh: string[];
    textTrich: string;
    loi?: string;
  } {
    return { ok: false, tomTat: "", intent: "", banKinh: [], textTrich: "", loi };
  }

  /**
   * Lột HTML lấy chữ: bỏ nguyên khối script/style/noscript/svg/template và chú
   * thích TRƯỚC khi xoá thẻ, kẻo chữ trong đó lọt ra; gỡ vài entity thông dụng
   * rồi ép khoảng trắng về một dấu.
   */
  private lotHtml(html: string): string {
    let s = html;
    s = s.replace(/<!--[\s\S]*?-->/g, " ");
    s = s.replace(/<\s*(script|style|noscript|svg|template)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, " ");
    // Thẻ mở chưa đóng (page cut giữa chừng): vét riêng cho khỏi sót chữ.
    s = s.replace(/<\s*(script|style|noscript|svg|template)\b[^>]*>/gi, " ");
    s = s.replace(/<[^>]+>/g, " ");
    s = s
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/g, "'");
    return s.replace(/\s+/g, " ").trim().slice(0, TOI_DA_TEXT);
  }

  /**
   * Lọc HTML nháp GPT viết: bỏ nguyên khối thẻ nguy hiểm, bỏ thuộc tính sự kiện
   * (on*) và url javascript:. Giữ lại thẻ nội dung thông thường — nháp này chủ
   * shop sẽ dán vào landing nên phải sạch trước khi họ nhìn thấy.
   */
  private locHtml(html: string): string {
    let s = html;
    s = s.replace(/<\s*(script|iframe|object|embed|form|link|meta|style)\b[\s\S]*?<\s*\/\s*\1\s*>/gi, " ");
    s = s.replace(/<\s*(script|iframe|object|embed|form|link|meta|style)\b[^>]*\/?\s*>/gi, " ");
    s = s.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, " ");
    s = s.replace(/(href|src)\s*=\s*["']?\s*javascript:[^"'>\s]*/gi, "$1=\"\"");
    return s.trim();
  }

  /**
   * Làm sạch lô từ khoá đầu vào: trim, bỏ rỗng, khử trùng không phân biệt hoa
   * thường (giữ chữ gốc đầu tiên), cắt trần. Dùng chung cho chấm và viết nháp.
   */
  private lamSachLo(ds: string[] | undefined | null, toiDa: number): string[] {
    const thay = new Set<string>();
    const ketQua: string[] = [];
    for (const k of ds ?? []) {
      if (typeof k !== "string") continue;
      const sach = k.trim();
      if (!sach) continue;
      const khoa = sach.toLowerCase();
      if (thay.has(khoa)) continue;
      thay.add(khoa);
      ketQua.push(sach);
      if (ketQua.length >= toiDa) break;
    }
    return ketQua;
  }

  /**
   * Neo mảng GPT trả về vào lô đầu vào: chỉ nhận từ khớp case-insensitive với
   * một từ trong lô, trả lại ĐÚNG chữ gốc của lô, khử trùng. Từ nào GPT tự chế
   * hoặc viết lệch đều rơi rụng ở đây.
   */
  private neoTheoLo(mang: unknown, goc: Map<string, string>): string[] {
    if (!Array.isArray(mang)) return [];
    const ketQua: string[] = [];
    const thay = new Set<string>();
    for (const b of mang) {
      if (typeof b !== "string") continue;
      const banGoc = goc.get(b.trim().toLowerCase());
      if (!banGoc) continue;
      const khoa = banGoc.toLowerCase();
      if (thay.has(khoa)) continue;
      thay.add(khoa);
      ketQua.push(banGoc);
    }
    return ketQua;
  }
}
