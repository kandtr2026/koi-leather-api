/**
 * dayTuKhoaNhieu() — nút "Đẩy cả lô" từ sổ tay từ khoá lên Google Ads.
 *
 * Điểm then chốt được khoá ở đây, khác với dayTuKhoa() đơn lẻ:
 *
 *  1. IDEMPOTENT theo hướng lọc: chỉ đẩy `chua_day` | `loi`, bỏ qua `da_day` |
 *     `dang_day`. Bấm lại lần hai thì mọi dòng đã `da_day`, lô trả succeeded 0
 *     mà KHÔNG gọi Ads — không đẻ criterion trùng, không đốt quota.
 *  2. MỘT DÒNG LỖI KHÔNG CHẶN CẢ LÔ: lỗi (validation, Ads từ chối, id không
 *     tồn tại) bị bắt riêng, gom vào errors dạng { id, loi }.
 *  3. Khuôn trả về { total, succeeded, failed, errors } giống sync/push.
 *
 * Mock GoogleAdsClient và Prisma hoàn toàn — KHÔNG gọi Ads API thật.
 */
import { AdsService } from "./ads.service";

/** GoogleAdsClient giả — đủ 4 thứ dayTuKhoa() chạm tới. */
function adsGia(over: Record<string, any> = {}) {
  return {
    daCauHinh: jest.fn(() => true),
    bienConThieu: jest.fn(() => []),
    maTaiKhoan: jest.fn(() => "1234567890"),
    mutate: jest.fn(async () => ({
      results: [{ resourceName: "customers/123/adGroupCriteria/456~789" }],
    })),
    ...over,
  };
}

/**
 * PrismaService giả. `tonTai` là kết quả findMany (bước lọc idempotent); `dayDu`
 * ánh xạ id → dòng đầy đủ mà findUnique trả cho dayTuKhoa(). Dòng không có trong
 * `dayDu` thì tự dựng một keyword đẩy được.
 */
function prismaGia(
  tonTai: Array<{ id: string; trangThaiDongBo: string }>,
  dayDu: Record<string, any> = {},
) {
  return {
    koiAdKeyword: {
      findMany: jest.fn(async () => tonTai),
      findUnique: jest.fn(async (arg: any) => {
        const id = arg?.where?.id;
        return dayDu[id] ?? dongTuKhoa(id);
      }),
      update: jest.fn(async (arg: any) => ({
        id: arg?.where?.id,
        ...arg?.data,
        adsResourceName: "customers/123/adGroupCriteria/456~789",
        loiDongBo: null,
      })),
    },
  };
}

/** Một dòng sổ tay keyword đẩy được (loai=keyword, có adGroupId). */
const dongTuKhoa = (id: string, over: Record<string, any> = {}) => ({
  id,
  tuKhoa: "ví da",
  loai: "keyword",
  phamViNegative: null,
  adGroupId: "111",
  campaignId: null,
  loaiKhop: "exact",
  trangThai: "active",
  trangThaiDongBo: "chua_day",
  adsResourceName: null,
  loiDongBo: null,
  ...over,
});

const dichVu = (prisma: any, ads: any) =>
  new AdsService(prisma as never, ads as never);

const UUID = (n: string) => `${n.repeat(8)}-${n.repeat(4)}-4${n.repeat(3)}-8${n.repeat(3)}-${n.repeat(12)}`;

describe("dayTuKhoaNhieu() — đẩy cả lô từ sổ tay", () => {
  it("chỉ đẩy chua_day|loi, bỏ qua da_day|dang_day (idempotent)", async () => {
    const chua = UUID("1");
    const loi = UUID("2");
    const da = UUID("3");
    const dang = UUID("4");
    const ads = adsGia();
    const prisma = prismaGia(
      [
        { id: chua, trangThaiDongBo: "chua_day" },
        { id: loi, trangThaiDongBo: "loi" },
        { id: da, trangThaiDongBo: "da_day" },
        { id: dang, trangThaiDongBo: "dang_day" },
      ],
      {
        [chua]: dongTuKhoa(chua),
        [loi]: dongTuKhoa(loi, { trangThaiDongBo: "loi" }),
      },
    );

    const kq = await dichVu(prisma, ads).dayTuKhoaNhieu([chua, da, dang, loi]);

    expect(kq.total).toBe(4);
    expect(kq.succeeded).toBe(2);
    expect(kq.failed).toBe(0);
    expect(kq.errors).toEqual([]);
    // Chỉ 2 lần mutate — da_day và dang_day không đụng tới Ads.
    expect(ads.mutate).toHaveBeenCalledTimes(2);
  });

  it("bấm lại lần hai: mọi dòng da_day → succeeded 0, KHÔNG gọi Ads", async () => {
    const a = UUID("1");
    const b = UUID("2");
    const ads = adsGia();
    const prisma = prismaGia([
      { id: a, trangThaiDongBo: "da_day" },
      { id: b, trangThaiDongBo: "da_day" },
    ]);

    const kq = await dichVu(prisma, ads).dayTuKhoaNhieu([a, b]);

    expect(kq.total).toBe(2);
    expect(kq.succeeded).toBe(0);
    expect(kq.failed).toBe(0);
    expect(kq.errors).toEqual([]);
    expect(ads.mutate).not.toHaveBeenCalled();
    expect(prisma.koiAdKeyword.findUnique).not.toHaveBeenCalled();
  });

  it("id không tồn tại → failed kèm {id, loi}, dòng khác vẫn đẩy", async () => {
    const mat = UUID("9");
    const ok = UUID("1");
    const ads = adsGia();
    const prisma = prismaGia(
      [{ id: ok, trangThaiDongBo: "chua_day" }],
      { [ok]: dongTuKhoa(ok) },
    );

    const kq = await dichVu(prisma, ads).dayTuKhoaNhieu([mat, ok]);

    expect(kq.total).toBe(2);
    expect(kq.succeeded).toBe(1);
    expect(kq.failed).toBe(1);
    expect(kq.errors).toEqual([{ id: mat, loi: "Không tìm thấy từ khoá" }]);
  });

  it("Ads lỗi một dòng → ghi {id, loi}, dòng kia vẫn đẩy", async () => {
    const loi = UUID("1");
    const ok = UUID("2");
    const ads = adsGia({
      mutate: jest
        .fn()
        .mockRejectedValueOnce(new Error("Google Ads: rate limit"))
        .mockResolvedValueOnce({
          results: [{ resourceName: "customers/123/adGroupCriteria/456~789" }],
        }),
    });
    const prisma = prismaGia(
      [
        { id: loi, trangThaiDongBo: "chua_day" },
        { id: ok, trangThaiDongBo: "chua_day" },
      ],
      { [loi]: dongTuKhoa(loi), [ok]: dongTuKhoa(ok) },
    );

    const kq = await dichVu(prisma, ads).dayTuKhoaNhieu([loi, ok]);

    expect(kq.succeeded).toBe(1);
    expect(kq.failed).toBe(1);
    expect(kq.errors).toHaveLength(1);
    expect(kq.errors[0].id).toBe(loi);
    expect(kq.errors[0].loi).toContain("rate limit");
  });

  it("validation lỗi (thiếu adGroupId) → bắt thành failed, không ném cả lô", async () => {
    const thieu = UUID("1");
    const ok = UUID("2");
    const ads = adsGia();
    const prisma = prismaGia(
      [
        { id: thieu, trangThaiDongBo: "chua_day" },
        { id: ok, trangThaiDongBo: "chua_day" },
      ],
      {
        [thieu]: dongTuKhoa(thieu, { adGroupId: null }),
        [ok]: dongTuKhoa(ok),
      },
    );

    const kq = await dichVu(prisma, ads).dayTuKhoaNhieu([thieu, ok]);

    expect(kq.succeeded).toBe(1);
    expect(kq.failed).toBe(1);
    expect(kq.errors[0].id).toBe(thieu);
    expect(kq.errors[0].loi).toContain("adGroupId");
  });

  it("dòng loi được thử lại và thành công", async () => {
    const loi = UUID("1");
    const ads = adsGia();
    const prisma = prismaGia(
      [{ id: loi, trangThaiDongBo: "loi" }],
      { [loi]: dongTuKhoa(loi, { trangThaiDongBo: "loi" }) },
    );

    const kq = await dichVu(prisma, ads).dayTuKhoaNhieu([loi]);

    expect(kq.total).toBe(1);
    expect(kq.succeeded).toBe(1);
    expect(kq.failed).toBe(0);
    expect(ads.mutate).toHaveBeenCalledTimes(1);
  });
});
