/**
 * Chuẩn hoá số liệu Google Ads cho ba màn "live": từ khoá thật, cụm tìm kiếm
 * thật, và gợi ý từ khoá (Keyword Planner).
 *
 * ĐIỂM THEN CHỐT được khoá ở đây: số liệu Ads API cho từ ít dữ liệu rất hay
 * VẮNG mặt. Khi vắng phải trả null để Front hiện "—", TUYỆT ĐỐI không để lọt
 * NaN (Front không phân biệt được "chưa có dữ liệu" với "tính lỗi") và không
 * quy bừa về 0 (0 là một con số THẬT, khác hẳn "chưa có"). Micro phải ÷1e6,
 * phân số 0–1 phải ×100, enum chất lượng/cạnh tranh/trạng thái phải ra nhãn VN.
 *
 * Mock GoogleAdsClient hoàn toàn — KHÔNG gọi API thật (không có credentials).
 * Kiểm trên GIÁ TRỊ TRẢ VỀ (mapping) và trên ĐỐI SỐ truyền xuống client (làm
 * sạch seed), cả hai đều không cần mạng.
 */
import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { AdsService } from "./ads.service";
import { AdsAdminController } from "./ads.controller";

/**
 * GoogleAdsClient giả. Mặc định "đã nối" và trả rỗng; mỗi bài tự nạp dữ liệu
 * hoặc lật cờ qua `over`.
 */
function adsGia(over: Record<string, any> = {}) {
  return {
    daCauHinh: jest.fn(() => true),
    bienConThieu: jest.fn(() => []),
    truyVan: jest.fn(async () => [] as any[]),
    yTuongTuKhoa: jest.fn(async () => [] as any[]),
    maTaiKhoan: jest.fn(() => "1234567890"),
    ...over,
  };
}

/** PrismaService giả — chỉ phần các hàm này chạm tới (sổ tay từ khoá). */
function prismaGia(soTay: any[] = []) {
  return {
    koiAdKeyword: { findMany: jest.fn(async () => soTay) },
  };
}

const dichVu = (ads: any, prisma: any = prismaGia()) =>
  new AdsService(prisma as never, ads as never, null as never);

/** Các cột SỐ (number|null) của một dòng từ khoá — dùng để soát NaN. */
const COT_SO_TU_KHOA = [
  "ctr",
  "cpcTrungBinh",
  "cuChuyenDoi",
  "cuChuyenDoiTatCa",
  "giaTriChuyenDoi",
  "giaMoiChuyenDoi",
  "tyLeChuyenDoi",
  "tyLeHienThi",
  "matViHang",
  "topTuyetDoi",
  "diemChatLuong",
];

/** Không cột nào được là NaN — hoặc số hữu hạn, hoặc null. */
function khongCoNaN(item: any, cot: string[]) {
  for (const c of cot) {
    const v = item[c];
    expect(Number.isNaN(v)).toBe(false);
    expect(v === null || Number.isFinite(v)).toBe(true);
  }
}

// ─────────────────────────────────────────────────────────────────────────
describe("tuKhoaThat() — từ khoá thật + số liệu 30 ngày", () => {
  it("chưa cấu hình → daNoi:false, kèm thieuBien, KHÔNG gọi Ads API", async () => {
    const ads = adsGia({
      daCauHinh: jest.fn(() => false),
      bienConThieu: jest.fn(() => ["GOOGLE_ADS_DEVELOPER_TOKEN", "GOOGLE_ADS_CUSTOMER_ID"]),
    });
    const kq: any = await dichVu(ads).tuKhoaThat();

    expect(kq.daNoi).toBe(false);
    expect(kq.thieuBien).toEqual([
      "GOOGLE_ADS_DEVELOPER_TOKEN",
      "GOOGLE_ADS_CUSTOMER_ID",
    ]);
    expect(kq.dsTuKhoa).toEqual([]);
    // Không được đụng tới Internet khi chưa đủ token.
    expect(ads.truyVan).not.toHaveBeenCalled();
  });

  it("đủ field → map đúng số, micro ÷1e6, phân số ×100, enum → nhãn VN", async () => {
    const row = {
      adGroupCriterion: {
        keyword: { text: "ví da", matchType: "PHRASE" },
        status: "ENABLED",
        negative: false,
        qualityInfo: {
          qualityScore: 7,
          creativeQualityScore: "ABOVE_AVERAGE",
          postClickQualityScore: "AVERAGE",
          searchPredictedCtr: "BELOW_AVERAGE",
        },
      },
      campaign: { name: "Chiến dịch A", id: 777 },
      adGroup: { name: "Nhóm 1" },
      metrics: {
        impressions: 1000,
        clicks: 50,
        ctr: 0.05, // → 5%
        averageCpc: 2_000_000, // micro → 2
        costMicros: 100_000_000, // micro → 100
        conversions: 3,
        allConversions: 5,
        conversionsValue: 900000,
        costPerConversion: 33_000_000, // micro → 33
        conversionsFromInteractionsRate: 0.06, // → 6%
        searchImpressionShare: 0.8, // → 80%
        searchRankLostImpressionShare: 0.15, // → 15%
        absoluteTopImpressionPercentage: 0.5, // → 50%
      },
    };
    const ads = adsGia({ truyVan: jest.fn(async () => [row]) });
    const kq: any = await dichVu(ads).tuKhoaThat();

    expect(kq.daNoi).toBe(true);
    expect(kq.thieuBien).toEqual([]);
    expect(kq.ocid).toBe("1234567890");
    expect(ads.truyVan).toHaveBeenCalledTimes(1);

    const it0 = kq.dsTuKhoa[0];
    expect(it0.tuKhoa).toBe("ví da");
    expect(it0.loaiKhop).toBe("phrase");
    expect(it0.trangThai).toBe("enabled");
    expect(it0.chienDich).toBe("Chiến dịch A");
    expect(it0.chienDichId).toBe("777");
    expect(it0.nhomQuangCao).toBe("Nhóm 1");

    // Đếm — giữ nguyên số thật.
    expect(it0.hienThi).toBe(1000);
    expect(it0.cuBam).toBe(50);
    expect(it0.chiPhi).toBe(100);

    // Micro ÷ 1e6.
    expect(it0.cpcTrungBinh).toBe(2);
    expect(it0.giaMoiChuyenDoi).toBe(33);

    // Phân số 0–1 × 100 (dùng toBeCloseTo vì phép nhân dấu phẩy động).
    expect(it0.ctr).toBeCloseTo(5, 6);
    expect(it0.tyLeChuyenDoi).toBeCloseTo(6, 6);
    expect(it0.tyLeHienThi).toBeCloseTo(80, 6);
    expect(it0.matViHang).toBeCloseTo(15, 6);
    expect(it0.topTuyetDoi).toBeCloseTo(50, 6);

    // conversions VÀ allConversions đọc riêng, cả hai đều có mặt.
    expect(it0.cuChuyenDoi).toBe(3);
    expect(it0.cuChuyenDoiTatCa).toBe(5);
    expect(it0.giaTriChuyenDoi).toBe(900000);

    // Enum → nhãn tiếng Việt.
    expect(it0.diemChatLuong).toBe(7);
    expect(it0.chatLuongQuangCao).toBe("trên TB"); // ABOVE_AVERAGE
    expect(it0.chatLuongTrangDich).toBe("Trung bình"); // AVERAGE
    expect(it0.ctrKyVong).toBe("dưới TB"); // BELOW_AVERAGE
  });

  it("FIELD VẮNG → null, KHÔNG phải NaN (ca then chốt)", async () => {
    const row = {
      adGroupCriterion: {
        keyword: { text: "túi", matchType: "EXACT" },
        status: "ENABLED",
        negative: false,
        qualityInfo: {}, // không có bucket chất lượng nào
      },
      campaign: {},
      adGroup: {},
      metrics: {
        // impressions/clicks/cost cố tình VẮNG để kiểm luôn nhánh mặc định 0
        ctr: "", // chuỗi rỗng cũng phải ra null, không NaN
        // mọi trường còn lại: undefined
      },
    };
    const ads = adsGia({ truyVan: jest.fn(async () => [row]) });
    const kq: any = await dichVu(ads).tuKhoaThat();
    const it0 = kq.dsTuKhoa[0];

    // Đếm vắng → 0 thật (đúng thiết kế: 0 impressions là 0 thật).
    expect(it0.hienThi).toBe(0);
    expect(it0.cuBam).toBe(0);
    expect(it0.chiPhi).toBe(0);

    // Mọi số liệu hay-vắng → null. So sánh === null: đã loại luôn NaN, vì NaN
    // sẽ không bằng null.
    expect(it0.ctr).toBeNull();
    expect(it0.cpcTrungBinh).toBeNull();
    expect(it0.cuChuyenDoi).toBeNull();
    expect(it0.cuChuyenDoiTatCa).toBeNull();
    expect(it0.giaTriChuyenDoi).toBeNull();
    expect(it0.giaMoiChuyenDoi).toBeNull();
    expect(it0.tyLeChuyenDoi).toBeNull();
    expect(it0.tyLeHienThi).toBeNull();
    expect(it0.matViHang).toBeNull();
    expect(it0.topTuyetDoi).toBeNull();
    expect(it0.diemChatLuong).toBeNull();

    // Enum vắng → null (không bịa mức "Trung bình").
    expect(it0.chatLuongQuangCao).toBeNull();
    expect(it0.chatLuongTrangDich).toBeNull();
    expect(it0.ctrKyVong).toBeNull();

    // Chiến dịch vắng id → null để Heoiu không dựng link sâu bừa.
    expect(it0.chienDichId).toBeNull();

    // Soát tổng quát: không cột nào là NaN.
    khongCoNaN(it0, COT_SO_TU_KHOA);
    // Và cả phản hồi serialize được (NaN/BigInt đều làm hỏng bước này).
    expect(() => JSON.stringify(kq)).not.toThrow();
  });

  it("đọc CẢ conversions lẫn allConversions — Secondary chỉ vào allConversions", async () => {
    // conversions vắng (action bị đặt Secondary), allConversions vẫn có.
    const row = {
      adGroupCriterion: {
        keyword: { text: "dây nịt", matchType: "BROAD" },
        status: "ENABLED",
        negative: false,
        qualityInfo: {},
      },
      campaign: {},
      adGroup: {},
      metrics: { allConversions: 4 },
    };
    const ads = adsGia({ truyVan: jest.fn(async () => [row]) });
    const kq: any = await dichVu(ads).tuKhoaThat();
    const it0 = kq.dsTuKhoa[0];

    expect(it0.cuChuyenDoi).toBeNull(); // Primary vắng
    expect(it0.cuChuyenDoiTatCa).toBe(4); // Secondary có
  });

  it("conversions = 0 giữ nguyên 0 (khác null), allConversions đọc độc lập", async () => {
    const row = {
      adGroupCriterion: {
        keyword: { text: "ví nam", matchType: "PHRASE" },
        status: "ENABLED",
        negative: false,
        qualityInfo: {},
      },
      campaign: {},
      adGroup: {},
      metrics: { conversions: 0, allConversions: 2 },
    };
    const ads = adsGia({ truyVan: jest.fn(async () => [row]) });
    const kq: any = await dichVu(ads).tuKhoaThat();
    const it0 = kq.dsTuKhoa[0];

    expect(it0.cuChuyenDoi).toBe(0); // 0 THẬT, không được thành null
    expect(it0.cuChuyenDoiTatCa).toBe(2);
  });

  it("negative=true → loaiKhop 'negative' bất kể matchType", async () => {
    const row = {
      adGroupCriterion: {
        keyword: { text: "sửa khoá", matchType: "BROAD" },
        status: "ENABLED",
        negative: true, // từ khoá loại trừ
        qualityInfo: {},
      },
      campaign: {},
      adGroup: {},
      metrics: {},
    };
    const ads = adsGia({ truyVan: jest.fn(async () => [row]) });
    const kq: any = await dichVu(ads).tuKhoaThat();
    expect(kq.dsTuKhoa[0].loaiKhop).toBe("negative");
  });

  it("ghép ghi chú sổ tay theo tuKhoa KHÔNG phân biệt hoa thường", async () => {
    const row = {
      adGroupCriterion: {
        keyword: { text: "ví da", matchType: "PHRASE" },
        status: "ENABLED",
        negative: false,
        qualityInfo: {},
      },
      campaign: {},
      adGroup: {},
      metrics: {},
    };
    const rowKhongGhiChu = {
      adGroupCriterion: {
        keyword: { text: "túi xách", matchType: "PHRASE" },
        status: "ENABLED",
        negative: false,
        qualityInfo: {},
      },
      campaign: {},
      adGroup: {},
      metrics: {},
    };
    const ads = adsGia({ truyVan: jest.fn(async () => [row, rowKhongGhiChu]) });
    // Sổ tay ghi "Ví Da" hoa; Google trả "ví da" thường — vẫn phải khớp.
    const prisma = prismaGia([{ tuKhoa: "Ví Da", ghiChu: "từ đắt, canh CPC" }]);
    const kq: any = await dichVu(ads, prisma).tuKhoaThat();

    expect(kq.dsTuKhoa[0].ghiChuCuaToi).toBe("từ đắt, canh CPC");
    expect(kq.dsTuKhoa[1].ghiChuCuaToi).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("searchTermsThat() — cụm khách tìm thật + gợi ý", () => {
  const dongSearchTerm = (over: any = {}) => ({
    searchTermView: { searchTerm: "ví da nam", status: "NONE" },
    segments: {
      keyword: { info: { text: "ví da" } },
      searchTermMatchType: "BROAD",
    },
    campaign: { name: "CD", id: 777 },
    adGroup: { name: "Nhóm" },
    metrics: { impressions: 100, clicks: 1, costMicros: 1_000_000, conversions: 0 },
    ...over,
  });

  it("chưa cấu hình → daNoi:false, không gọi Ads API", async () => {
    const ads = adsGia({
      daCauHinh: jest.fn(() => false),
      bienConThieu: jest.fn(() => ["GOOGLE_ADS_REFRESH_TOKEN"]),
    });
    const kq: any = await dichVu(ads).searchTermsThat();
    expect(kq.daNoi).toBe(false);
    expect(kq.thieuBien).toEqual(["GOOGLE_ADS_REFRESH_TOKEN"]);
    expect(kq.dsSearchTerm).toEqual([]);
    expect(ads.truyVan).not.toHaveBeenCalled();
  });

  it("trả ocid + chienDichId mỗi dòng để Heoiu dựng link sâu mở chiến dịch", async () => {
    const ads = adsGia({
      truyVan: jest.fn(async () => [dongSearchTerm(), dongSearchTerm()]),
    });
    const kq: any = await dichVu(ads).searchTermsThat();

    // ocid là mã tài khoản (ads.google.com/aw/campaigns?ocid=...&campaignId=...)
    expect(kq.ocid).toBe("1234567890");
    // campaign.id phải về dạng chuỗi y như tuKhoaThat.
    expect(kq.dsSearchTerm[0].chienDichId).toBe("777");
    expect(kq.dsSearchTerm[1].chienDichId).toBe("777");
  });

  it("campaign VẮNG id → chienDichId null (không bịa link sâu)", async () => {
    const ads = adsGia({
      truyVan: jest.fn(async () => [dongSearchTerm({ campaign: { name: "CD" } })]),
    });
    const kq: any = await dichVu(ads).searchTermsThat();
    expect(kq.ocid).toBe("1234567890");
    expect(kq.dsSearchTerm[0].chienDichId).toBeNull();
  });

  it("map trạng thái ENUM → nhãn tiếng Việt", async () => {
    const rows = [
      dongSearchTerm({ searchTermView: { searchTerm: "a", status: "ADDED" } }),
      dongSearchTerm({ searchTermView: { searchTerm: "b", status: "EXCLUDED" } }),
      dongSearchTerm({ searchTermView: { searchTerm: "c", status: "ADDED_EXCLUDED" } }),
      dongSearchTerm({ searchTermView: { searchTerm: "d", status: "UNKNOWN" } }),
      dongSearchTerm({ searchTermView: { searchTerm: "e", status: "NONE" } }),
      dongSearchTerm({ searchTermView: { searchTerm: "f" } }), // status vắng
    ];
    const ads = adsGia({ truyVan: jest.fn(async () => rows) });
    const kq: any = await dichVu(ads).searchTermsThat();

    const nhan = kq.dsSearchTerm.map((r: any) => r.trangThai);
    expect(nhan).toEqual([
      "đã thêm",
      "đã loại trừ",
      "đã thêm & loại trừ",
      "chưa xử lý", // UNKNOWN
      "chưa xử lý", // NONE
      "chưa xử lý", // vắng
    ]);
  });

  it("gợi ý 'nên thêm' khi CHƯA XỬ LÝ mà đã có chuyển đổi", async () => {
    const rows = [
      dongSearchTerm({
        searchTermView: { searchTerm: "ra don", status: "NONE" },
        metrics: { clicks: 1, costMicros: 2_000_000, conversions: 1 },
      }),
    ];
    const ads = adsGia({ truyVan: jest.fn(async () => rows) });
    const kq: any = await dichVu(ads).searchTermsThat();
    expect(kq.dsSearchTerm[0].goiY).toBe("nên thêm");
  });

  it("gợi ý 'xem lại' (KHÔNG phải 'nên thêm') khi CÓ theo dõi chuyển đổi mà cụm nhiều bấm + tốn tiền nhưng 0 đơn", async () => {
    // Đây là điểm Viet nêu: cụm hút bấm, đốt tiền, 0 chuyển đổi mà lại được gán
    // "nên thêm" (xanh) là đọc ngược ý. Vì tập có cột chuyển đổi (conversions:0
    // là 0 THẬT, không phải vắng), 0 đơn ở đây là tín hiệu đáng ngờ → "xem lại".
    const rows = [
      dongSearchTerm({
        searchTermView: { searchTerm: "hut bam khong don", status: "NONE" },
        metrics: { clicks: 30, costMicros: 20_000_000, conversions: 0 },
      }),
    ];
    const ads = adsGia({ truyVan: jest.fn(async () => rows) });
    const kq: any = await dichVu(ads).searchTermsThat();
    expect(kq.dsSearchTerm[0].goiY).toBe("xem lại");
  });

  it("CHƯA gắn theo dõi chuyển đổi (mọi cụm vắng conversions): KHÔNG bắn 'nên loại trừ', chỉ gợi ý nhẹ theo bấm", async () => {
    // Viet #1: khi cả tập không đọc được chuyển đổi, "0 đơn" là "chưa đo được"
    // chứ không phải "không ra khách". Cụm ít bấm + tốn tiền KHÔNG được dán nhãn
    // đỏ "nên loại trừ"; cụm nhiều bấm chỉ được gợi ý NHẸ "nên thêm".
    const rows = [
      dongSearchTerm({
        searchTermView: { searchTerm: "it bam ton tien", status: "NONE" },
        metrics: { clicks: 4, costMicros: 6_000_000 }, // conversions VẮNG
      }),
      dongSearchTerm({
        searchTermView: { searchTerm: "nhieu bam", status: "NONE" },
        metrics: { clicks: 9, costMicros: 3_000_000 }, // conversions VẮNG
      }),
    ];
    const ads = adsGia({ truyVan: jest.fn(async () => rows) });
    const kq: any = await dichVu(ads).searchTermsThat();
    // Ít bấm + tốn tiền, chưa đo chuyển đổi → KHÔNG "nên loại trừ", để null.
    expect(kq.dsSearchTerm[0].goiY).toBeNull();
    // Nhiều bấm → gợi ý nhẹ "nên thêm".
    expect(kq.dsSearchTerm[1].goiY).toBe("nên thêm");
  });

  it("gợi ý 'nên loại trừ' khi CHƯA XỬ LÝ, tốn tiền mà 0 chuyển đổi và ít bấm", async () => {
    const rows = [
      dongSearchTerm({
        searchTermView: { searchTerm: "dot tien", status: "NONE" },
        metrics: { clicks: 4, costMicros: 6_000_000, conversions: 0 }, // 4 < 5, cost > 0
      }),
    ];
    const ads = adsGia({ truyVan: jest.fn(async () => rows) });
    const kq: any = await dichVu(ads).searchTermsThat();
    expect(kq.dsSearchTerm[0].goiY).toBe("nên loại trừ");
  });

  it("goiY null khi không đủ tín hiệu (chưa xử lý, 0 tiền, 0 bấm)", async () => {
    const rows = [
      dongSearchTerm({
        searchTermView: { searchTerm: "im lang", status: "NONE" },
        metrics: { clicks: 0, costMicros: 0, conversions: 0 },
      }),
    ];
    const ads = adsGia({ truyVan: jest.fn(async () => rows) });
    const kq: any = await dichVu(ads).searchTermsThat();
    expect(kq.dsSearchTerm[0].goiY).toBeNull();
  });

  it("goiY null cho cụm ĐÃ XỬ LÝ dù nhiều bấm/chuyển đổi", async () => {
    const rows = [
      dongSearchTerm({
        searchTermView: { searchTerm: "da them", status: "ADDED" },
        metrics: { clicks: 100, costMicros: 50_000_000, conversions: 9 },
      }),
      dongSearchTerm({
        searchTermView: { searchTerm: "da loai", status: "EXCLUDED" },
        metrics: { clicks: 80, costMicros: 40_000_000, conversions: 0 },
      }),
    ];
    const ads = adsGia({ truyVan: jest.fn(async () => rows) });
    const kq: any = await dichVu(ads).searchTermsThat();
    expect(kq.dsSearchTerm[0].goiY).toBeNull();
    expect(kq.dsSearchTerm[1].goiY).toBeNull();
  });

  it("chi phí micro ÷1e6, conversions vắng → null (không NaN)", async () => {
    const rows = [
      dongSearchTerm({
        searchTermView: { searchTerm: "x", status: "NONE" },
        metrics: { impressions: 10, clicks: 2, costMicros: 7_500_000 }, // conversions & value vắng
      }),
    ];
    const ads = adsGia({ truyVan: jest.fn(async () => rows) });
    const kq: any = await dichVu(ads).searchTermsThat();
    const r = kq.dsSearchTerm[0];
    expect(r.chiPhi).toBeCloseTo(7.5, 6);
    expect(r.cuChuyenDoi).toBeNull();
    expect(r.giaTriChuyenDoi).toBeNull();
    expect(r.daNoi).toBeUndefined();
    expect(kq.daNoi).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("yTuongTuKhoa() — gợi ý từ khoá (Keyword Planner)", () => {
  it("seeds rỗng → ném BadRequestException (kể cả khi CHƯA cấu hình)", async () => {
    // Chưa cấu hình đi nữa vẫn phải ném lỗi rỗng — kiểm seed diễn ra TRƯỚC.
    const ads = adsGia({ daCauHinh: jest.fn(() => false) });
    await expect(dichVu(ads).yTuongTuKhoa([])).rejects.toThrow(BadRequestException);
    await expect(dichVu(ads).yTuongTuKhoa([])).rejects.toThrow(
      /ít nhất một từ khoá gốc/,
    );
    // Không được gọi client khi seed rỗng.
    expect(ads.yTuongTuKhoa).not.toHaveBeenCalled();
  });

  it("seeds toàn khoảng trắng/rỗng → cũng ném BadRequestException", async () => {
    const ads = adsGia();
    await expect(
      dichVu(ads).yTuongTuKhoa(["", "   ", "\t", null as any, undefined as any]),
    ).rejects.toThrow(BadRequestException);
    expect(ads.yTuongTuKhoa).not.toHaveBeenCalled();
  });

  it("làm sạch: trim + gộp trùng trước khi gọi client", async () => {
    const ads = adsGia();
    await dichVu(ads).yTuongTuKhoa(["ví da", " ví da ", "túi", "túi ", ""]);
    expect(ads.yTuongTuKhoa).toHaveBeenCalledTimes(1);
    expect(ads.yTuongTuKhoa).toHaveBeenCalledWith(["ví da", "túi"]);
  });

  it("cắt còn tối đa 20 seed (Google từ chối cả request nếu quá ~20)", async () => {
    const ads = adsGia();
    const nhieu = Array.from({ length: 25 }, (_, i) => `tu-khoa-${i}`);
    await dichVu(ads).yTuongTuKhoa(nhieu);

    const daTruyen = (ads.yTuongTuKhoa.mock.calls[0] as any[])[0];
    expect(daTruyen).toHaveLength(20);
    expect(daTruyen).toEqual(nhieu.slice(0, 20));
  });

  it("có seed hợp lệ nhưng CHƯA cấu hình → daNoi:false, không gọi client", async () => {
    const ads = adsGia({
      daCauHinh: jest.fn(() => false),
      bienConThieu: jest.fn(() => ["GOOGLE_ADS_CLIENT_ID"]),
    });
    const kq: any = await dichVu(ads).yTuongTuKhoa(["ví da"]);
    expect(kq.daNoi).toBe(false);
    expect(kq.thieuBien).toEqual(["GOOGLE_ADS_CLIENT_ID"]);
    expect(kq.dsYTuong).toEqual([]);
    expect(ads.yTuongTuKhoa).not.toHaveBeenCalled();
  });

  it("map metrics + giá thầu micro + competition enum → nhãn", async () => {
    const results = [
      {
        text: "ví da handmade",
        keywordIdeaMetrics: {
          avgMonthlySearches: 1200,
          competition: "HIGH",
          competitionIndex: 85,
          lowTopOfPageBidMicros: 3_000_000, // → 3
          highTopOfPageBidMicros: 12_000_000, // → 12
        },
      },
    ];
    const ads = adsGia({ yTuongTuKhoa: jest.fn(async () => results) });
    const kq: any = await dichVu(ads).yTuongTuKhoa(["ví da"]);

    expect(kq.daNoi).toBe(true);
    const y = kq.dsYTuong[0];
    expect(y.tuKhoa).toBe("ví da handmade");
    expect(y.luongTimKiem).toBe(1200);
    expect(y.canhTranh).toBe("cao"); // HIGH
    expect(y.chiSoCanhTranh).toBe(85);
    expect(y.giaThauThap).toBe(3);
    expect(y.giaThauCao).toBe(12);
  });

  it("competition enum: LOW→thấp, MEDIUM→trung bình, thiếu→null", async () => {
    const results = [
      { text: "a", keywordIdeaMetrics: { competition: "LOW" } },
      { text: "b", keywordIdeaMetrics: { competition: "MEDIUM" } },
      { text: "c", keywordIdeaMetrics: { competition: "UNSPECIFIED" } },
      { text: "d", keywordIdeaMetrics: {} }, // competition vắng
    ];
    const ads = adsGia({ yTuongTuKhoa: jest.fn(async () => results) });
    const kq: any = await dichVu(ads).yTuongTuKhoa(["seed"]);
    expect(kq.dsYTuong.map((r: any) => r.canhTranh)).toEqual([
      "thấp",
      "trung bình",
      null,
      null,
    ]);
  });

  it("field vắng → null, KHÔNG NaN; text vắng → chuỗi rỗng", async () => {
    const results = [{ text: undefined, keywordIdeaMetrics: undefined }];
    const ads = adsGia({ yTuongTuKhoa: jest.fn(async () => results) });
    const kq: any = await dichVu(ads).yTuongTuKhoa(["seed"]);
    const y = kq.dsYTuong[0];

    expect(y.tuKhoa).toBe("");
    expect(y.luongTimKiem).toBeNull();
    expect(y.canhTranh).toBeNull();
    expect(y.chiSoCanhTranh).toBeNull();
    expect(y.giaThauThap).toBeNull();
    expect(y.giaThauCao).toBeNull();
    khongCoNaN(y, [
      "luongTimKiem",
      "chiSoCanhTranh",
      "giaThauThap",
      "giaThauCao",
    ]);
    expect(() => JSON.stringify(kq)).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────
describe("AdsAdminController — 2 endpoint live mới: admin-only + 400", () => {
  const reqCoAdmin = () => ({ user: { sub: "admin-1" } }) as any;
  const reqAnDanh = () => ({}) as any; // không có req.user (PUBLIC_VIEW cho GET đi qua)

  /** AdsService giả chỉ để soi controller có gọi đúng hàm hay không. */
  const serviceGia = () =>
    ({
      searchTermsThat: jest.fn(async () => ({ daNoi: true })),
      tuKhoaThat: jest.fn(async () => ({ daNoi: true })),
      yTuongTuKhoa: jest.fn(async () => ({ daNoi: true, dsYTuong: [] })),
    }) as any;

  it("GET search-terms/live: không req.user → chặn 401, KHÔNG chạm service", async () => {
    const svc = serviceGia();
    const ctl = new AdsAdminController(svc, {} as any); // landingSeo không đụng trong các test này
    await expect(ctl.searchTermsThat(reqAnDanh())).rejects.toThrow(
      UnauthorizedException,
    );
    expect(svc.searchTermsThat).not.toHaveBeenCalled();
  });

  it("GET search-terms/live: có admin → gọi service", async () => {
    const svc = serviceGia();
    const ctl = new AdsAdminController(svc, {} as any); // landingSeo không đụng trong các test này
    await ctl.searchTermsThat(reqCoAdmin());
    expect(svc.searchTermsThat).toHaveBeenCalledTimes(1);
  });

  it("GET keyword-ideas/live: không req.user → chặn 401, KHÔNG chạm service", async () => {
    const svc = serviceGia();
    const ctl = new AdsAdminController(svc, {} as any); // landingSeo không đụng trong các test này
    await expect(ctl.yTuongTuKhoa(reqAnDanh(), "ví da")).rejects.toThrow(
      UnauthorizedException,
    );
    expect(svc.yTuongTuKhoa).not.toHaveBeenCalled();
  });

  it("GET keyword-ideas/live: chuẩn hoá seed (chuỗi/mảng/vắng) trước khi gọi", async () => {
    const svc = serviceGia();
    const ctl = new AdsAdminController(svc, {} as any); // landingSeo không đụng trong các test này

    await ctl.yTuongTuKhoa(reqCoAdmin(), "ví da"); // một chuỗi → mảng 1 phần tử
    expect(svc.yTuongTuKhoa).toHaveBeenLastCalledWith(["ví da"]);

    await ctl.yTuongTuKhoa(reqCoAdmin(), ["a", "b"]); // đã là mảng
    expect(svc.yTuongTuKhoa).toHaveBeenLastCalledWith(["a", "b"]);

    await ctl.yTuongTuKhoa(reqCoAdmin(), undefined); // vắng → mảng rỗng
    expect(svc.yTuongTuKhoa).toHaveBeenLastCalledWith([]);
  });

  it("GET keyword-ideas/live: có admin nhưng KHÔNG seed hợp lệ → 400 (qua service thật)", async () => {
    // Dùng AdsService thật (client + prisma giả) để chứng minh đường đi trọn vẹn:
    // controller chuẩn hoá undefined → [] → service ném BadRequest.
    const service = new AdsService(prismaGia() as never, adsGia() as never, null as never);
    const ctl = new AdsAdminController(service, {} as any); // landingSeo không đụng trong test này
    await expect(ctl.yTuongTuKhoa(reqCoAdmin(), undefined)).rejects.toThrow(
      BadRequestException,
    );
  });

  it("GET keywords/live (từ khoá thật): không req.user → chặn 401", async () => {
    const svc = serviceGia();
    const ctl = new AdsAdminController(svc, {} as any); // landingSeo không đụng trong các test này
    await expect(ctl.tuKhoaThat(reqAnDanh())).rejects.toThrow(
      UnauthorizedException,
    );
    expect(svc.tuKhoaThat).not.toHaveBeenCalled();
  });
});
