/**
 * SeoWhitelistService — pipeline "Whitelist SEO": snapshot metric hằng ngày +
 * GPT review từ khoá đã cắn tiền.
 *
 * Điểm then chốt được khoá ở đây:
 *  1. SNAPSHOT NHẠY VỚI MÚI GIỜ: ngay luôn là 00:00 giờ VN, chienDich null → ''
 *     (Postgres coi nhiều NULL khác nhau nên unique [tuKhoa,chienDich,ngay]
 *     với null sẽ đẻ dòng trùng mỗi ngày).
 *  2. REVIEW CHỈ ĐẠI CHỌN DIỆN ĐÃ CẮN TIỀN: cuBam >= 1 trong cửa sổ, tổng chi
 *     phí cao review trước, bỏ qua từ đã review trong khoảng lịch lại (7 ngày).
 *  3. MỘT DÒNG TRẢ LỜI AI SAI KHÔNG CHẶN CẢ LÔ: thiếu tuKhoa / quyetDinh lạ /
 *     diem không phải số 0-100 → bỏ qua từ đó, không làm cả lô rớt.
 *  4. LUÔN append log mỗi lần review kể cả kết quả giống lần trước.
 *
 * Mock PrismaService/AdsService/OpenAiClient hoàn toàn — không gọi Ads hay
 * OpenAI thật.
 */
import { SeoWhitelistService } from "./seo-whitelist.service";

/** Một dòng metric như tuKhoaThat() trả về sau upsert snapshot. */
const dongMetric = (tuKhoa: string, over: Record<string, any> = {}) => ({
  tuKhoa,
  chienDich: "Chiến dịch A",
  hienThi: 100,
  cuBam: 5,
  chiPhi: 200000,
  ctr: 5.0,
  cpcTrungBinh: 40000,
  cuChuyenDoi: 1,
  ...over,
});

/** Một dòng KoiKeywordMetric như Prisma trả. */
const dongLuu = (tuKhoa: string, over: Record<string, any> = {}) => ({
  id: "m-" + tuKhoa,
  tuKhoa,
  chienDich: "Chiến dịch A",
  ngay: new Date("2026-08-16T00:00:00.000Z"),
  hienThi: 100,
  cuBam: 5,
  chiPhi: 200000,
  ctr: 5.0,
  cpcTrungBinh: 40000,
  cuChuyenDoi: 1,
  ...over,
});

function prismaGia(over: Record<string, any> = {}) {
  return {
    koiKeywordMetric: {
      findMany: jest.fn(async () => []),
      groupBy: jest.fn(async () => []),
      upsert: jest.fn(async (arg: any) => ({ id: "m", ...arg?.create })),
    },
    koiKeywordWhitelist: {
      findMany: jest.fn(async () => []),
      upsert: jest.fn(async (arg: any) => ({ id: "w", ...arg?.create })),
    },
    koiKeywordReviewLog: {
      create: jest.fn(async (arg: any) => ({ id: "l", ...arg?.data })),
    },
    ...over,
  };
}

function adsGia(over: Record<string, any> = {}) {
  return {
    tuKhoaThat: jest.fn(async () => ({
      daNoi: true,
      thieuBien: [],
      ocid: "123",
      dsTuKhoa: [],
    })),
    ...over,
  };
}

function openaiGia(over: Record<string, any> = {}) {
  return {
    sinhJson: jest.fn(async (_heThong: string, nguoiDung: string) => ({ dulieu: { danhGia: [] }, model: "gpt-4.1-mini", soToken: 10, soAnhDaXem: 0 })),
    modelDangDung: jest.fn(() => "gpt-4.1-mini"),
    ...over,
  };
}

const dichVu = (prisma: any, ads: any, openai: any) =>
  new SeoWhitelistService(prisma as never, ads as never, openai as never);

const UUID = (n: string) =>
  `${n.repeat(8)}-${n.repeat(4)}-4${n.repeat(3)}-8${n.repeat(3)}-${n.repeat(12)}`;

describe("SeoWhitelistService.snapshot() — cron hằng ngày", () => {
  it("chưa nối Google Ads → ok:false, không ghi gì", async () => {
    const prisma = prismaGia();
    const ads = adsGia({ tuKhoaThat: jest.fn(async () => ({ daNoi: false, thieuBien: ["GOOGLE_CLIENT_ID"], ocid: null, dsTuKhoa: [] })) });
    const kq = await dichVu(prisma, ads, openaiGia()).snapshot();
    expect(kq).toEqual({ ok: false, loi: "Chưa nối Google Ads", thieuBien: ["GOOGLE_CLIENT_ID"] });
    expect(prisma.koiKeywordMetric.upsert).not.toHaveBeenCalled();
  });

  it("đã nối → upsert từng dòng với ngay 00:00 VN và chienDich '' thay null", async () => {
    const prisma = prismaGia();
    const ads = adsGia({
      tuKhoaThat: jest.fn(async () => ({
        daNoi: true,
        thieuBien: [],
        ocid: "123",
        dsTuKhoa: [dongMetric("ví da bò thật"), dongMetric("bóp da nam", { chienDich: "" })],
      })),
    });
    const kq = await dichVu(prisma, ads, openaiGia()).snapshot();
    expect(kq.ok).toBe(true);
    expect((kq as any).daGhi).toBe(2);
    const ghi = prisma.koiKeywordMetric.upsert.mock.calls;
    for (const [arg] of ghi) {
      const { tuKhoa, chienDich, ngay } = arg.where.tuKhoa_chienDich_ngay;
      // Chốt múi giờ: snapshot lưu đúng mốc 00:00 giờ VN, tức 17:00 UTC hôm
      // trước (VN = UTC+7, không DST nên 17 là hằng số).
      expect(ngay.getUTCHours()).toBe(17);
      expect(ngay.getUTCMinutes()).toBe(0);
      if (tuKhoa === "ví da bò thật") expect(chienDich).toBe("Chiến dịch A");
      if (tuKhoa === "bóp da nam") expect(chienDich).toBe("");
    }
  });
});

describe("SeoWhitelistService.review() — diện tự chọn theo metric", () => {
  it("không có từ nào trong diện → daReview 0, không gọi GPT", async () => {
    const prisma = prismaGia(); // groupBy trả [] mặc định
    const openai = openaiGia();
    const kq = await dichVu(prisma, adsGia(), openai).review();
    expect(kq.ok).toBe(true);
    expect(kq.daReview).toBe(0);
    expect(kq.loi).toContain("Không có từ khoá nào");
    expect(openai.sinhJson).not.toHaveBeenCalled();
  });

  it("bỏ qua từ đã review trong khoảng lịch lại, chỉ gọi GPT cho phần còn thiếu", async () => {
    const som = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 ngày trước — vẫn trong 7 ngày
    const prisma = prismaGia({
      koiKeywordWhitelist: {
        findMany: jest.fn(async () => [{ tuKhoa: "ví da cũ", ngayReview: som }]),
        upsert: jest.fn(async (arg: any) => ({ id: "w", ...arg?.create })),
      },
      koiKeywordMetric: {
        groupBy: jest.fn(async () => [{ tuKhoa: "ví da cũ" }, { tuKhoa: "ví da mới" }]),
        findMany: jest.fn(async () => [dongLuu("ví da cũ"), dongLuu("ví da mới")]),
      },
    });
    const openai = openaiGia({
      sinhJson: jest.fn(async () => ({
        dulieu: {
          danhGia: [
            { tuKhoa: "ví da mới", quyetDinh: "whitelist", lyDo: "Có chuyển đổi", diem: 82 },
          ],
        },
        model: "gpt-4.1-mini",
        soToken: 10,
        soAnhDaXem: 0,
      })),
    });
    const kq = await dichVu(prisma, adsGia(), openai).review();
    expect(kq.daReview).toBe(1);
    expect(kq.danhSach[0].tuKhoa).toBe("ví da mới");
    // Prompt phải chỉ chứa từ còn thiếu, không chứa từ đã review gần đây.
    const caGui = openai.sinhJson.mock.calls[0]?.[1] ?? "";
    expect(caGui).toContain('"ví da mới"');
    expect(caGui).not.toContain('"ví da cũ"');
    // Upsert trạng thái + append log.
    expect(prisma.koiKeywordWhitelist.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.koiKeywordReviewLog.create).toHaveBeenCalledTimes(1);
    const logArg = prisma.koiKeywordReviewLog.create.mock.calls[0][0];
    expect(logArg.data.tuKhoa).toBe("ví da mới");
    expect(logArg.data.quyetDinh).toBe("whitelisted");
  });

  it("review lại ra quyết định khác → upsert đổi trạng thái + append log", async () => {
    const cu = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 ngày trước — ngoài lịch lại
    const prisma = prismaGia({
      koiKeywordWhitelist: {
        findMany: jest.fn(async () => [{ tuKhoa: "ví da A", ngayReview: cu }]),
        upsert: jest.fn(async (arg: any) => ({ id: "w", ...arg?.create })),
      },
      koiKeywordMetric: {
        groupBy: jest.fn(async () => [{ tuKhoa: "ví da A" }]),
        findMany: jest.fn(async () => [dongLuu("ví da A")]),
      },
    });
    const openai = openaiGia({
      sinhJson: jest.fn(async () => ({
        dulieu: {
          danhGia: [
            { tuKhoa: "ví da A", quyetDinh: "reject", lyDo: "Sai chính tả nặng", diem: 12 },
          ],
        },
        model: "gpt-4.1-mini",
        soToken: 10,
        soAnhDaXem: 0,
      })),
    });
    const kq = await dichVu(prisma, adsGia(), openai).review();
    expect(kq.daReview).toBe(1);
    expect(kq.danhSach[0].quyetDinh).toBe("rejected");
    expect(prisma.koiKeywordWhitelist.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.koiKeywordReviewLog.create).toHaveBeenCalledTimes(1);
  });

  it("một dòng trả lời AI sai (quyetDinh lạ / diem sai) bị bỏ qua, không chặn cả lô", async () => {
    const prisma = prismaGia({
      koiKeywordMetric: {
        groupBy: jest.fn(async () => [{ tuKhoa: "tốt" }, { tuKhoa: "xấu" }, { tuKhoa: "điểm sai" }]),
        findMany: jest.fn(async () => [dongLuu("tốt"), dongLuu("xấu"), dongLuu("điểm sai")]),
      },
    });
    const openai = openaiGia({
      sinhJson: jest.fn(async () => ({
        dulieu: {
          danhGia: [
            { tuKhoa: "tốt", quyetDinh: "whitelist", lyDo: "OK", diem: 80 },
            { tuKhoa: "xấu", quyetDinh: "maybe", lyDo: "lạ", diem: 50 },
            { tuKhoa: "điểm sai", quyetDinh: "reject", lyDo: "thiếu", diem: 999 },
            { tuKhoa: "không trong diện", quyetDinh: "whitelist", lyDo: "không gửi", diem: 70 },
            { diem: 10 }, // thiếu tuKhoa
          ],
        },
        model: "gpt-4.1-mini",
        soToken: 10,
        soAnhDaXem: 0,
      })),
    });
    const kq = await dichVu(prisma, adsGia(), openai).review();
    expect(kq.daReview).toBe(1);
    expect(kq.danhSach[0].tuKhoa).toBe("tốt");
    expect(prisma.koiKeywordReviewLog.create).toHaveBeenCalledTimes(1);
  });

  it("id không đúng khuôn UUID bị bỏ khỏi diện ép review", async () => {
    const prisma = prismaGia();
    const kq = await dichVu(prisma, adsGia(), openaiGia()).review(["abc", "not-a-uuid"]);
    expect(kq.ok).toBe(true);
    expect(kq.daReview).toBe(0);
    expect(prisma.koiKeywordWhitelist.findMany).not.toHaveBeenCalled();
  });

  it("ids ép review → chỉ xét đúng những dòng đó (bỏ qua lịch lại)", async () => {
    const idA = UUID("a");
    const prisma = prismaGia({
      koiKeywordWhitelist: {
        findMany: jest.fn(async () => [{ id: idA, tuKhoa: "ví da ép", ngayReview: new Date(Date.now() - 1000) }]),
        upsert: jest.fn(async (arg: any) => ({ id: "w", ...arg?.create })),
      },
      koiKeywordMetric: {
        groupBy: jest.fn(async () => [{ tuKhoa: "ví da ép" }]),
        findMany: jest.fn(async () => [dongLuu("ví da ép")]),
      },
    });
    const openai = openaiGia({
      sinhJson: jest.fn(async () => ({
        dulieu: { danhGia: [{ tuKhoa: "ví da ép", quyetDinh: "whitelist", lyDo: "Ép tay", diem: 90 }] },
        model: "gpt-4.1-mini",
        soToken: 10,
        soAnhDaXem: 0,
      })),
    });
    const kq = await dichVu(prisma, adsGia(), openai).review([idA]);
    expect(kq.daReview).toBe(1);
    // Dòng vừa review 1 giây trước vẫn được ép chạy lại.
    expect(prisma.koiKeywordReviewLog.create).toHaveBeenCalledTimes(1);
  });
});

describe("SeoWhitelistService.layWhitelist() — kèm metric mới nhất", () => {
  it("mỗi dòng được gắn metricGanNhat là snapshot MỚI NHẤT của từ khoá đó", async () => {
    const prisma = prismaGia({
      koiKeywordWhitelist: {
        findMany: jest.fn(async () => [
          { id: "w1", tuKhoa: "ví da", trangThai: "whitelisted", ngayReview: new Date() },
          { id: "w2", tuKhoa: "bóp da", trangThai: "pending", ngayReview: new Date() },
        ]),
      },
      koiKeywordMetric: {
        findMany: jest.fn(async () => [
          // Mock quên mất orderBy — service nhận theo `ngay: desc` nên phải
          // trả bản MỚI NHẤT trước thì `layWhitelist` mới bắt đúng "mới nhất".
          dongLuu("ví da", { ngay: new Date("2026-08-15T00:00:00.000Z"), chiPhi: 250 }),
          dongLuu("bóp da", { ngay: new Date("2026-08-09T00:00:00.000Z"), chiPhi: 40 }),
          dongLuu("ví da", { ngay: new Date("2026-08-10T00:00:00.000Z"), chiPhi: 100 }),
        ]),
      },
    });
    const ds = await dichVu(prisma, adsGia(), openaiGia()).layWhitelist();
    const viDa = ds.find((k: any) => k.tuKhoa === "ví da") as any;
    expect(viDa.metricGanNhat.chiPhi).toBe(250); // lấy bản ngày 15, không phải 10
    expect((ds as any[]).find((k: any) => k.tuKhoa === "bóp da").metricGanNhat.chiPhi).toBe(40);
  });
});