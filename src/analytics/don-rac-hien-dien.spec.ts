/**
 * Bộ dọn rác bảng koi_presence phải ké đường GHI, không ké đường ĐỌC.
 *
 * Vì sao cần test: trước đây dọn rác nằm trong realtime() — chỉ chạy khi có
 * người mở tab admin. Báo cáo lưu lượng đã dời sang Heoiu nên đường đọc đó gần
 * như không còn ai gọi; giữ dọn rác ở đấy là bảng phình vô hạn mà không ai thấy
 * (hash đổi mỗi nửa đêm nên dòng hôm qua vĩnh viễn không ai ghi đè).
 *
 * Bốn điều phải giữ:
 *  1. Có dọn khi bốc thăm trúng.
 *  2. KHÔNG dọn mọi lượt ghi — mỗi lượt thêm một DELETE là trả tiền vô ích.
 *  3. Không await: khách đang đợi trang, không phải đợi việc dọn nhà.
 *  4. DELETE lỗi thì lượt ghi vẫn thành công.
 */
import { AnalyticsService } from "./analytics.service";

/** Prisma giả, chỉ đủ cho đường ghi. Ghi lại mọi lần gọi để soi. */
function prismaGia(deleteManyTraVe?: () => Promise<unknown>) {
  const goi = { upsert: 0, create: 0, deleteMany: 0 };
  const dieuKienXoa: unknown[] = [];
  return {
    goi,
    dieuKienXoa,
    koiPresence: {
      upsert: async () => {
        goi.upsert++;
      },
      deleteMany: (arg: unknown) => {
        goi.deleteMany++;
        dieuKienXoa.push(arg);
        return deleteManyTraVe ? deleteManyTraVe() : Promise.resolve({ count: 0 });
      },
    },
    koiPageView: {
      create: async () => {
        goi.create++;
      },
    },
  };
}

/** Ghi một lượt xem thật (không phải nhịp tim). */
function luotXem() {
  return {
    path: "/shop/epsom",
    referrer: null,
    host: "koileather.com",
    ip: "1.2.3.4",
    ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
  };
}

describe("dọn rác koi_presence", () => {
  const bocTham = jest.spyOn(Math, "random");
  afterAll(() => bocTham.mockRestore());

  it("bốc thăm trúng thì gọi deleteMany", async () => {
    const p = prismaGia();
    const sv = new AnalyticsService(p as never);
    bocTham.mockReturnValue(0); // luôn trúng
    await sv.track(luotXem());
    expect(p.goi.deleteMany).toBe(1);
    expect(p.goi.create).toBe(1); // lượt xem vẫn được ghi
  });

  it("bốc thăm trượt thì KHÔNG gọi deleteMany", async () => {
    const p = prismaGia();
    const sv = new AnalyticsService(p as never);
    bocTham.mockReturnValue(0.99); // luôn trượt
    await sv.track(luotXem());
    expect(p.goi.deleteMany).toBe(0);
    expect(p.goi.upsert).toBe(1); // vẫn ghi hiện diện bình thường
  });

  it("tỉ lệ dọn nằm trong khoảng 0 < x < 1 — không phải mọi lượt, cũng không phải không bao giờ", async () => {
    // Chốt ngưỡng thật: 0.02. Trượt ở 0.02 nhưng trúng ở 0.019.
    const trung = prismaGia();
    const svTrung = new AnalyticsService(trung as never);
    bocTham.mockReturnValue(0.019);
    await svTrung.track(luotXem());
    expect(trung.goi.deleteMany).toBe(1);

    const truot = prismaGia();
    const svTruot = new AnalyticsService(truot as never);
    bocTham.mockReturnValue(0.02);
    await svTruot.track(luotXem());
    expect(truot.goi.deleteMany).toBe(0);
  });

  it("DELETE lỗi thì lượt ghi vẫn thành công, không nổi lỗi ra ngoài", async () => {
    const p = prismaGia(() => Promise.reject(new Error("mất kết nối")));
    const sv = new AnalyticsService(p as never);
    bocTham.mockReturnValue(0);
    const kq = await sv.track(luotXem());
    expect(kq).toEqual({ tracked: true });
    // Nhường một nhịp cho promise bị từ chối kịp bị .catch() nuốt. Không có
    // .catch() thì đây là unhandled rejection.
    await new Promise((r) => setImmediate(r));
  });

  it("chỉ xóa dòng quá hạn, không xóa dòng đang online", async () => {
    const p = prismaGia();
    const sv = new AnalyticsService(p as never);
    bocTham.mockReturnValue(0);
    const truoc = Date.now();
    await sv.track(luotXem());
    const dk = p.dieuKienXoa[0] as { where: { lastSeenAt: { lt: Date } } };
    const moc = dk.where.lastSeenAt.lt.getTime();
    // Mốc phải lùi đúng 24 giờ, không phải 0 (xóa sạch) hay tương lai.
    expect(truoc - moc).toBeGreaterThanOrEqual(24 * 60 * 60 * 1000 - 50);
    expect(truoc - moc).toBeLessThanOrEqual(24 * 60 * 60 * 1000 + 50);
  });

  it("nhịp tim cũng dọn được — khách ngồi im vẫn ghé đường ghi", async () => {
    const p = prismaGia();
    const sv = new AnalyticsService(p as never);
    bocTham.mockReturnValue(0);
    await sv.track({ ...luotXem(), ping: true });
    expect(p.goi.deleteMany).toBe(1);
    expect(p.goi.create).toBe(0); // nhịp tim không tạo lượt xem
  });

  it("bot bị chặn trước khi tới chỗ dọn — không để Googlebot điều khiển nhịp dọn", async () => {
    const p = prismaGia();
    const sv = new AnalyticsService(p as never);
    bocTham.mockReturnValue(0);
    const kq = await sv.track({ ...luotXem(), ua: "Googlebot/2.1" });
    expect(kq).toEqual({ tracked: false, reason: "bot" });
    expect(p.goi.deleteMany).toBe(0);
  });
});
