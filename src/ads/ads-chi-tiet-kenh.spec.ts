/**
 * Phần chiTiet của danhSach: chi phí kênh + nối gclid → từ khoá trúng.
 *
 * Bài kiểm ads-cat-ky.spec.ts dựng client null nên KHÔNG test nào chạy nhánh
 * gọi Google Ads API — chính vì vậy một câu GAQL sai field (click_view không
 * có search_term, keyword là resource name chứ không phải chữ) từng lọt qua mà
 * không ai bắt. File này dựng GoogleAdsClient GIẢ ghi lại mọi câu GAQL để khoá:
 *   · câu campaign dùng BETWEEN hai ngày lịch VN;
 *   · câu click_view dùng đúng MỘT ngày (segments.date = '...') và đúng field
 *     click_view.keyword_info.text;
 *   · chia lô 20 gclid, lọc whitelist gclid rác;
 *   · một nhánh ném lỗi thì nhánh kia vẫn trả (allSettled degrade).
 */
import { AdsService } from "./ads.service";
import { dauNgayVN, ngayVNCuaDate } from "../common/ngay-vn";

/** Prisma giả: findMany trả dsClick, count/aggregate trả rỗng. */
function prismaGia(dsClick: any[]) {
  const ghi = (ten: string) => (arg: any) => {
    if (ten === "aggregate") return Promise.resolve({ _sum: { value: null } });
    if (ten === "count") return Promise.resolve(0);
    return Promise.resolve([]);
  };
  return {
    koiAdClick: {
      findMany: () => Promise.resolve(dsClick),
      count: ghi("count"),
      aggregate: ghi("aggregate"),
    },
  };
}

/**
 * GoogleAdsClient giả: ghi lại mọi câu GAQL đã gửi. Câu campaign trả chi phí
 * cố định (trừ khi loiCampaign); câu click_view trả ketQua nếu được đặt, còn
 * không thì "bắt chước" Google — trả lại từng gclid trong câu IN kèm từ khoá
 * giả, đủ để retry ngày liền trước không kích hoạt. `rongCacCauDau` mô phỏng
 * mấy câu click_view đầu trả rỗng (click rơi sang ngày khác theo múi giờ tài
 * khoản Ads) để test nhánh retry.
 */
class AdsGia {
  cacCau: string[] = [];
  loiCampaign = false;
  ketQua: any[] = [];
  rongCacCauDau = 0;
  private soLanClick = 0;

  daCauHinh() {
    return true;
  }

  async truyVan(gaql: string): Promise<any[]> {
    this.cacCau.push(gaql);
    if (this.loiCampaign && gaql.includes("FROM campaign")) {
      throw new Error("Google từ chối");
    }
    if (gaql.includes("FROM campaign")) {
      return [{ metrics: { costMicros: "1234567890123" } }];
    }
    this.soLanClick += 1;
    if (this.rongCacCauDau > 0 && this.soLanClick <= this.rongCacCauDau) return [];
    if (this.ketQua.length) return this.ketQua;
    const m = /IN \(([^)]*)\)/.exec(gaql);
    const gclids = m ? m[1].split(", ").map((s) => s.slice(1, -1)) : [];
    return gclids.map((g) => ({
      clickView: { gclid: g, keywordInfo: { text: "kw-" + g } },
    }));
  }
}

/** Một dòng koiAdClick để findMany trả về. clickedAt = hôm nay 00:00 VN. */
const click = (gclid: string | null) => ({
  token: "AAAAAA",
  gclid,
  gbraid: null,
  wbraid: null,
  landingPath: "/",
  productName: null,
  channel: null,
  clickedAt: dauNgayVN(0),
  contactedAt: null,
  convertedAt: null,
  value: null,
  note: null,
  exportedAt: null,
});

const dichVu = (p: any, ads: any) => new AdsService(p as never, ads as never);

describe("danhSach chiTiet — chi phí kênh và nối gclid → từ khoá", () => {
  it("chiPhi = tổng cost_micros / 1e6 làm tròn; câu campaign BETWEEN ngày lịch VN", async () => {
    const ads = new AdsGia();
    const kq: any = await dichVu(prismaGia([]), ads).danhSach(7, true);
    expect(kq.chiPhi).toBe(1234568);
    const cau = ads.cacCau.find((c) => c.includes("FROM campaign"));
    expect(cau).toBeDefined();
    expect(cau).toContain("segments.date BETWEEN");
    expect(cau).toContain(ngayVNCuaDate(dauNgayVN(6)));
    expect(cau).toContain(ngayVNCuaDate(dauNgayVN(0)));
  });

  it("nối gclid → tuKhoa qua keyword_info.text; câu click_view khoá đúng MỘT ngày", async () => {
    const ads = new AdsGia();
    ads.ketQua = [{ clickView: { gclid: "abc123", keywordInfo: { text: "ví da bò" } } }];
    const kq: any = await dichVu(prismaGia([click("abc123")]), ads).danhSach(7, true);
    expect(kq.items[0].tuKhoa).toBe("ví da bò");
    const cau = ads.cacCau.find((c) => c.includes("FROM click_view"));
    expect(cau).toBeDefined();
    expect(cau).toContain("click_view.keyword_info.text");
    expect(cau).toContain(`segments.date = '${ngayVNCuaDate(dauNgayVN(0))}'`);
    // Field không tồn tại (search_term) và field resource name (click_view.keyword
    // trần) không bao giờ được xuất hiện lại trong câu GAQL.
    expect(cau).not.toContain("search_term");
    expect(cau).not.toMatch(/click_view\.keyword\b(?!_)/);
  });

  it("gclid rác bị loại khỏi câu IN; dòng đó tuKhoa null", async () => {
    const ads = new AdsGia();
    const kq: any = await dichVu(
      prismaGia([click("abc';DROP"), click("abc.def-123_~")]),
      ads,
    ).danhSach(7, true);
    const cacCau = ads.cacCau.filter((c) => c.includes("FROM click_view")).join("\n");
    expect(cacCau).not.toContain("DROP");
    expect(cacCau).toContain("abc.def-123_~");
    expect(kq.items[0].tuKhoa).toBeNull();
    expect(kq.items[1].tuKhoa).toBe("kw-abc.def-123_~");
  });

  it("chỉ nối 20 dòng đầu: 25 dòng thì 5 dòng cuối tuKhoa null", async () => {
    const ads = new AdsGia();
    const ds = Array.from({ length: 25 }, (_, i) => click("gclid" + i));
    const kq: any = await dichVu(prismaGia(ds), ads).danhSach(7, true);
    const cacCau = ads.cacCau.filter((c) => c.includes("FROM click_view"));
    expect(cacCau).toHaveLength(1);
    expect(kq.items[19].tuKhoa).toBe("kw-gclid19");
    expect(kq.items[20].tuKhoa).toBeNull();
    expect(kq.items[24].tuKhoa).toBeNull();
  });

  it("campaign ném lỗi: chiPhi null, từ khoá vẫn nối được", async () => {
    const ads = new AdsGia();
    ads.loiCampaign = true;
    ads.ketQua = [{ clickView: { gclid: "abc123", keywordInfo: { text: "ví" } } }];
    const kq: any = await dichVu(prismaGia([click("abc123")]), ads).danhSach(7, true);
    expect(kq.chiPhi).toBeNull();
    expect(kq.items[0].tuKhoa).toBe("ví");
  });

  it("gclid không tra được thì hỏi lại ngày liền trước một lần", async () => {
    const ads = new AdsGia();
    // Câu đầu trả rỗng (như click rơi sang ngày khác theo múi giờ tài khoản),
    // câu thứ hai trả kết quả — retry phải lấy được.
    ads.rongCacCauDau = 1;
    ads.ketQua = [{ clickView: { gclid: "xyz789", keywordInfo: { text: "túi da" } } }];
    const kq: any = await dichVu(prismaGia([click("xyz789")]), ads).danhSach(7, true);
    const cacCau = ads.cacCau.filter((c) => c.includes("FROM click_view"));
    expect(cacCau).toHaveLength(2);
    const ngayHomQua = ngayVNCuaDate(new Date(+dauNgayVN(0) - 24 * 60 * 60 * 1000));
    expect(cacCau[1]).toContain(`segments.date = '${ngayHomQua}'`);
    expect(kq.items[0].tuKhoa).toBe("túi da");
  });
});
