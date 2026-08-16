/**
 * Tách Google Ads khỏi Google tìm kiếm trong nguon().
 *
 * Vì sao cần test: referrer google giống hệt nhau cho ads lẫn organic, tín hiệu
 * duy nhất là mã quảng cáo (gclid / gbraid / wbraid) nằm trên query của URL.
 * Quên truyền path gốc (đã chuanHoa mất query) là mọi lượt ads rơi vào
 * google_organic và chủ shop tưởng quảng cáo không đem ai về.
 */
import { AnalyticsService } from "./analytics.service";

/** Prisma giả: ghi lại lượt xem cuối cùng để soi source. */
function prismaGia() {
  const daGhi: unknown[] = [];
  return {
    daGhi,
    koiPresence: {
      upsert: async () => {},
      // track() gọi donRacHienDien() — bốc thăm Math.random() (tỉ lệ 0.02) rồi
      // gọi deleteMany. Mock thiếu hàm này thì cứ ~2% lượt test ném TypeError
      // "deleteMany is not a function" — test đỏ ngẫu nhiên, không liên quan
      // thứ đang kiểm (nguon). Xem don-rac-hien-dien.spec.ts.
      deleteMany: async () => ({ count: 0 }),
    },
    koiPageView: {
      create: async (arg: unknown) => {
        daGhi.push(arg);
      },
    },
    koiContactClick: {
      create: async (arg: unknown) => {
        daGhi.push(arg);
      },
    },
  };
}

const luot = (path: string, referrer: string | null = null) => ({
  path,
  referrer,
  host: "koileather.com",
  ip: "1.2.3.4",
  ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
});

const bam = (path: string, referrer: string | null = null) => ({
  channel: "zalo",
  path,
  referrer,
  host: "koileather.com",
  ip: "1.2.3.4",
  ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)",
});

const dau = (p: { daGhi: unknown[] }) => p.daGhi[0] as { data: { source: string } };

describe("nguon() — tách Google Ads khỏi Google tìm kiếm", () => {
  it("google + gclid trên URL -> google_ads", async () => {
    const p = prismaGia();
    const sv = new AnalyticsService(p as never);
    await sv.track(luot("/?gclid=abc123", "https://www.google.com/"));
    expect(dau(p).data.source).toBe("google_ads");
  });

  it("google + gbraid trên URL -> google_ads (nhánh campaign khác cũng phải nhận)", async () => {
    const p = prismaGia();
    const sv = new AnalyticsService(p as never);
    await sv.track(luot("/?gbraid=xyz", "https://www.google.com/"));
    expect(dau(p).data.source).toBe("google_ads");
  });

  it("google không có mã quảng cáo -> google_organic", async () => {
    const p = prismaGia();
    const sv = new AnalyticsService(p as never);
    await sv.track(luot("/", "https://www.google.com/"));
    expect(dau(p).data.source).toBe("google_organic");
  });

  it("có gclid kể cả khi referrer rỗng -> google_ads (trình duyệt chặn referrer)", async () => {
    const p = prismaGia();
    const sv = new AnalyticsService(p as never);
    await sv.track(luot("/?gclid=abc123", null));
    expect(dau(p).data.source).toBe("google_ads");
  });

  it("có gclid nhưng referrer là trang mình -> vẫn google_ads (query còn trên URL)", async () => {
    const p = prismaGia();
    const sv = new AnalyticsService(p as never);
    await sv.track(luot("/cua-hang/?gclid=abc123", "https://koileather.com/"));
    expect(dau(p).data.source).toBe("google_ads");
  });

  it("cú bấm liên hệ cũng tách như lượt xem", async () => {
    const p = prismaGia();
    const sv = new AnalyticsService(p as never);
    await (sv as unknown as { ghiCuBamLienHe: (i: unknown) => Promise<unknown> }).ghiCuBamLienHe(
      bam("/?gclid=abc123", "https://www.google.com/"),
    );
    expect(dau(p).data.source).toBe("google_ads");
  });

  it("facebook vẫn là facebook, không bị ảnh hưởng", async () => {
    const p = prismaGia();
    const sv = new AnalyticsService(p as never);
    await sv.track(luot("/", "https://www.facebook.com/"));
    expect(dau(p).data.source).toBe("facebook");
  });
});