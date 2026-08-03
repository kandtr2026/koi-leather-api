import { Injectable } from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { MUI_GIO, dauNgayVN, gioHienTaiVN } from "../common/ngay-vn";

/**
 * Theo dõi lưu lượng truy cập storefront.
 *
 * QUYỀN RIÊNG TƯ: không lưu IP thô ở bất cứ đâu. Xem ghi chú ở visitorHash().
 */

/** Muối cho hàm băm. */
const SALT =
  process.env.ANALYTICS_SALT ||
  // Không đặt biến môi trường thì sinh muối ngẫu nhiên mỗi lần khởi động.
  // Hệ quả: sau khi máy chủ khởi động lại, cùng một khách sẽ ra hash khác nên
  // số "khách riêng" hôm đó phồng lên. Chấp nhận được — thà đếm sai chút còn
  // hơn dùng muối cố định lộ trong mã nguồn, vì muối yếu thì IP băm ra vẫn dò
  // ngược được (không gian IPv4 chỉ 4 tỉ, quét vét cạn trong vài giờ).
  randomBytes(32).toString("hex");

/**
 * Bao lâu không nghe nhịp tim thì coi như khách đã rời đi.
 *
 * 5 phút, khớp thói quen của Google Analytics. Nhịp tim gửi mỗi 60 giây nên
 * khách phải lỡ 5 nhịp liên tiếp mới biến mất — mạng 3G chập chờn không đủ để
 * đá nhầm người đang xem ra khỏi danh sách.
 */
const CUA_SO_ONLINE_MS = 5 * 60 * 1000;

/**
 * Giữ dòng hiện diện tối đa 1 ngày rồi dọn.
 *
 * Không dọn thì bảng phình mãi: hash đổi mỗi nửa đêm nên dòng của hôm qua vĩnh
 * viễn không ai ghi đè, nằm lại làm rác.
 */
const HAN_DON_RAC_MS = 24 * 60 * 60 * 1000;

/**
 * Múi giờ để cắt ngày — xem src/common/ngay-vn.ts.
 *
 * Chuyển sang dùng chung với trang quảng cáo: hai trang admin phải cắt khoảng
 * thời gian y hệt nhau, nếu không cùng bấm "1 ngày" mà hai bảng đếm hai khoảng
 * khác nhau.
 */

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Băm ẩn danh một lượt truy cập.
   *
   * Gộp NGÀY vào chuỗi băm nên sang ngày mới cùng một người sẽ ra hash khác.
   * Đổi lại: đếm được khách riêng trong ngày, nhưng KHÔNG lần được hành vi dài
   * ngày và không truy ngược ra danh tính. Đây là đánh đổi cố ý.
   *
   * Ngày cắt theo giờ VIỆT NAM. Dùng toISOString() là cắt theo UTC, tức đổi
   * hash lúc 7 giờ sáng giờ ta: một người vào lúc 6h và 8h sáng bị đếm thành
   * hai khách, còn người vào 23h hôm trước và 1h sáng hôm sau lại gộp làm một.
   * Ranh giới của hash phải trùng ranh giới của ngày trên biểu đồ, nếu không
   * "khách riêng hôm nay" đếm trên một tập ngày khác với "lượt xem hôm nay".
   */
  private visitorHash(ip: string, ua: string): string {
    const ngay = this.ngayVN(new Date());
    return createHash("sha256")
      .update(`${ip}|${ua}|${ngay}|${SALT}`)
      .digest("hex")
      .slice(0, 32);
  }

  /** Ngày YYYY-MM-DD theo đồng hồ Việt Nam, bất kể máy chủ đặt múi giờ nào. */
  private ngayVN(t: Date): string {
    // en-CA cho sẵn định dạng YYYY-MM-DD, khỏi ghép tay từ formatToParts.
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: MUI_GIO,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(t);
  }

  /** Gom referrer về vài nhóm để đếm — tên miền thô thì tãi ra quá vụn. */
  private nguon(referrer: string | null, host: string): string {
    if (!referrer) return "direct";
    let h: string;
    try {
      h = new URL(referrer).hostname.toLowerCase();
    } catch {
      return "other";
    }
    // Khách bấm từ trang này sang trang khác trong cùng site: không phải
    // "nguồn mới", vẫn tính là phiên cũ.
    //
    // KHÔNG tin mỗi header host: request đi qua router proxy nên host lúc tới
    // đây là của backend (koi-leather-api...), không phải koileather.com —
    // so sánh theo host thôi thì mọi lượt điều hướng nội bộ đều rơi vào
    // "other" và bảng nguồn truy cập đọc ra sai hoàn toàn.
    const nhaMinh = ["koileather.com", "koifront.vercel.app"];
    const hostSach = (host || "").replace(/^www\./, "").split(":")[0];
    if (hostSach) nhaMinh.push(hostSach);
    if (nhaMinh.some((d) => h === d || h.endsWith(`.${d}`))) return "internal";
    if (/(^|\.)google\./.test(h)) return "google";
    if (/(^|\.)(facebook|fb)\./.test(h) || h.includes("fbclid")) return "facebook";
    if (/(^|\.)zalo\./.test(h)) return "zalo";
    if (/(^|\.)instagram\./.test(h)) return "instagram";
    if (/(^|\.)tiktok\./.test(h)) return "tiktok";
    if (/(^|\.)(bing|yahoo|duckduckgo|coccoc)\./.test(h)) return "search_khac";
    return "other";
  }

  /** Đoán loại thiết bị từ User-Agent. Đủ dùng để biết tỷ lệ mobile/desktop. */
  private thietBi(ua: string): string {
    const s = ua.toLowerCase();
    if (/ipad|tablet|playbook|silk/.test(s)) return "tablet";
    if (/mobi|android|iphone|ipod|windows phone/.test(s)) return "mobile";
    return "desktop";
  }

  /**
   * Chuẩn hoá đường dẫn trước khi lưu.
   *
   * Bỏ query để /cua-hang/?page=2 và /cua-hang/ không tách thành hai dòng khác
   * nhau trong bảng "trang xem nhiều". Chốt độ dài để một URL rác dài hàng nghìn
   * ký tự không làm phình bảng.
   */
  private chuanHoa(path: string): string {
    const p = (path || "/").split("?")[0].split("#")[0];
    return p.slice(0, 500) || "/";
  }

  /**
   * Ghi một lượt xem. Gọi từ storefront, không cần đăng nhập.
   *
   * `ping = true` là NHỊP TIM: khách vẫn đang mở trang cũ, không phải xem trang
   * mới. Chỉ đụng vào bảng hiện diện, TUYỆT ĐỐI không ghi koi_page_views —
   * ghi thì một người ngồi đọc 10 phút thành 10 lượt xem và mọi số liệu cũ
   * (lượt xem, trang/khách, biểu đồ ngày) đều phồng lên.
   */
  async track(input: {
    path: string;
    referrer?: string | null;
    ip: string;
    ua: string;
    host: string;
    ping?: boolean;
  }) {
    const ua = (input.ua || "").slice(0, 400);

    // Bỏ qua bot: đếm cả bot thì mọi con số đều vô nghĩa, Googlebot một mình
    // có thể quét hàng nghìn trang một đêm.
    if (/bot|crawler|spider|crawling|headless|lighthouse|preview/i.test(ua)) {
      return { tracked: false, reason: "bot" };
    }

    const path = this.chuanHoa(input.path);
    const source = this.nguon(input.referrer ?? null, input.host);
    const device = this.thietBi(ua);
    const visitorHash = this.visitorHash(input.ip, ua);

    // Hiện diện cập nhật cho CẢ nhịp tim lẫn lượt xem thật.
    await this.capNhatHienDien({ visitorHash, path, source, device });

    if (input.ping) return { tracked: true, ping: true };

    await this.prisma.koiPageView.create({
      data: {
        path,
        referrer: input.referrer ? input.referrer.slice(0, 500) : null,
        source,
        device,
        visitorHash,
      },
    });
    return { tracked: true };
  }

  /**
   * Ghi đè dòng "khách này đang ở đâu".
   *
   * Nguồn CHỈ đặt lúc tạo dòng, không đè khi cập nhật. Lý do: từ trang thứ hai
   * trở đi referrer là chính koileather.com nên nguon() trả 'internal' — đè thì
   * khách vào từ Facebook bấm một cái là mất dấu, bảng nguồn realtime chỉ toàn
   * 'Trong site' và không trả lời được câu đáng giá nhất ("khách đang xem đến
   * từ đâu"). Giữ nguồn đầu phiên mới đúng nghĩa quy công.
   */
  private async capNhatHienDien(d: {
    visitorHash: string;
    path: string;
    source: string;
    device: string;
  }) {
    const now = new Date();
    await this.prisma.koiPresence.upsert({
      where: { visitorHash: d.visitorHash },
      create: {
        visitorHash: d.visitorHash,
        path: d.path,
        source: d.source,
        device: d.device,
        firstSeenAt: now,
        lastSeenAt: now,
      },
      update: {
        path: d.path,
        device: d.device,
        lastSeenAt: now,
        // source: cố ý KHÔNG đụng tới. Xem ghi chú trên.
      },
    });
  }

  /**
   * Ai đang ở trên web ngay lúc này.
   *
   * Trả về vừa danh sách trang đang được xem (kèm số khách trên từng trang),
   * vừa cùng số đó gom theo nguồn — để admin biết "3 người đang xem, 2 từ
   * Facebook" chứ không chỉ một con số trống trơn.
   */
  async realtime() {
    const nguong = new Date(Date.now() - CUA_SO_ONLINE_MS);

    const dangOnline = await this.prisma.koiPresence.findMany({
      where: { lastSeenAt: { gte: nguong } },
      orderBy: { lastSeenAt: "desc" },
      // Chốt trần: một đợt khách đổ vào bất thường không được kéo sập trang
      // admin. 500 dòng đã quá đủ để nhìn tình hình.
      take: 500,
    });

    // Dọn rác cơ hội: không có cron trên Vercel serverless nên dọn ké lúc admin
    // mở tab. Lỗi thì kệ — dọn rác hỏng không được làm hỏng số liệu đang xem.
    this.prisma.koiPresence
      .deleteMany({ where: { lastSeenAt: { lt: new Date(Date.now() - HAN_DON_RAC_MS) } } })
      .catch(() => {});

    // Gom theo trang: nhiều khách cùng đứng một trang thì hiện một dòng, đếm số.
    const theoTrang = new Map<
      string,
      { path: string; khach: number; nguon: Record<string, number>; moiNhat: Date }
    >();
    // Gom theo nguồn: cùng tập khách đó, cắt theo chiều khác.
    const theoNguon = new Map<string, number>();
    const theoThietBi = new Map<string, number>();

    for (const k of dangOnline) {
      const t = theoTrang.get(k.path) ?? {
        path: k.path,
        khach: 0,
        nguon: {},
        moiNhat: k.lastSeenAt,
      };
      t.khach++;
      t.nguon[k.source] = (t.nguon[k.source] ?? 0) + 1;
      if (k.lastSeenAt > t.moiNhat) t.moiNhat = k.lastSeenAt;
      theoTrang.set(k.path, t);

      theoNguon.set(k.source, (theoNguon.get(k.source) ?? 0) + 1);
      theoThietBi.set(k.device, (theoThietBi.get(k.device) ?? 0) + 1);
    }

    const trang = [...theoTrang.values()]
      .sort((a, b) => b.khach - a.khach || +b.moiNhat - +a.moiNhat)
      .map((t) => ({
        path: t.path,
        khach: t.khach,
        // Xếp nguồn theo số khách giảm dần để giao diện lấy vài cái đầu là đủ.
        nguon: Object.entries(t.nguon)
          .sort((a, b) => b[1] - a[1])
          .map(([source, khach]) => ({ source, khach })),
        moiNhat: t.moiNhat.toISOString(),
      }));

    return {
      online: dangOnline.length,
      windowMinutes: CUA_SO_ONLINE_MS / 60000,
      pages: trang,
      sources: [...theoNguon.entries()]
        .map(([source, khach]) => ({ source, khach }))
        .sort((a, b) => b.khach - a.khach),
      devices: [...theoThietBi.entries()]
        .map(([device, khach]) => ({ device, khach }))
        .sort((a, b) => b.khach - a.khach),
    };
  }


  /** Mốc 00:00 theo giờ Việt Nam — xem src/common/ngay-vn.ts. */
  private dauNgayVN(luiNgay = 0): Date {
    return dauNgayVN(luiNgay);
  }

  /**
   * Tổng quan cho trang admin.
   *
   * Dùng $queryRaw cho phần gom nhóm theo ngày: Prisma groupBy không cắt được
   * timestamp về ngày, nếu gom ở tầng JS thì phải kéo toàn bộ dòng về máy chủ —
   * vài chục nghìn dòng mỗi lần mở tab là quá đắt.
   *
   * days = 1 trả thêm khoá `hourly` (24 cột theo giờ). Biểu đồ ngày với đúng
   * một ngày chỉ vẽ được MỘT cột — không trả lời được câu "trong ngày hôm nay
   * số liệu ra sao", mà đó chính là lý do có mốc 1 ngày.
   */
  async summary(days = 30) {
    const soNgay = Math.min(Math.max(Number(days) || 30, 1), 365);
    // Đầu ngày của (soNgay - 1) ngày trước, cắt theo giờ Việt Nam.
    const tu = this.dauNgayVN(soNgay - 1);
    const dauHomNay = this.dauNgayVN(0);
    const theoGio = soNgay === 1;

    const where = { createdAt: { gte: tu } };

    const [
      tongLuot,
      khachRieng,
      theoNgay,
      topTrang,
      theoNguon,
      theoThietBi,
      homNay,
      theoGioRaw,
    ] = await Promise.all([
        this.prisma.koiPageView.count({ where }),

        this.prisma.koiPageView
          .findMany({ where, select: { visitorHash: true }, distinct: ["visitorHash"] })
          .then((r) => r.length),

        // createdAt là 'timestamp without time zone' chứa giờ UTC. Phải nói rõ
        // AT TIME ZONE 'UTC' để Postgres hiểu đó là giờ UTC rồi mới đổi sang giờ
        // ta. Thiếu vế đó thì Postgres coi giá trị đang là giờ Việt Nam và TRỪ
        // đi 7 tiếng thay vì cộng — lượt lúc 10h sáng rơi về 3h sáng, còn lượt
        // từ 00:00 đến 07:00 bị đẩy lùi sang hôm trước.
        this.prisma.$queryRaw<{ ngay: string; luot: number; khach: number }[]>`
          SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${MUI_GIO}, 'YYYY-MM-DD') AS ngay,
                 COUNT(*)::int AS luot,
                 COUNT(DISTINCT "visitorHash")::int AS khach
          FROM koi_free_style.koi_page_views
          WHERE "createdAt" >= ${tu}
          GROUP BY 1
          ORDER BY 1 ASC
        `,

        this.prisma.$queryRaw<{ path: string; luot: number; khach: number }[]>`
          SELECT "path",
                 COUNT(*)::int AS luot,
                 COUNT(DISTINCT "visitorHash")::int AS khach
          FROM koi_free_style.koi_page_views
          WHERE "createdAt" >= ${tu}
          GROUP BY 1
          ORDER BY 2 DESC
          LIMIT 20
        `,

        this.prisma.$queryRaw<{ source: string; luot: number; khach: number }[]>`
          SELECT "source",
                 COUNT(*)::int AS luot,
                 COUNT(DISTINCT "visitorHash")::int AS khach
          FROM koi_free_style.koi_page_views
          WHERE "createdAt" >= ${tu}
          GROUP BY 1
          ORDER BY 2 DESC
        `,

        this.prisma.$queryRaw<{ device: string; luot: number }[]>`
          SELECT "device", COUNT(*)::int AS luot
          FROM koi_free_style.koi_page_views
          WHERE "createdAt" >= ${tu}
          GROUP BY 1
          ORDER BY 2 DESC
        `,

        // HÔM NAY: từ 00:00 giờ Việt Nam tới lúc này. Không chặn trần trên —
        // không có dòng nào ở tương lai, thêm điều kiện chỉ tổ chậm.
        this.prisma.koiPageView
          .findMany({
            where: { createdAt: { gte: dauHomNay } },
            select: { visitorHash: true },
          })
          .then((r) => ({
            views: r.length,
            visitors: new Set(r.map((x) => x.visitorHash)).size,
          })),

        // Gom theo GIỜ — chỉ chạy khi xem 1 ngày. Cùng cách đổi múi giờ như
        // phần gom theo ngày ở trên: to_char trên giá trị ĐÃ đổi sang giờ ta.
        // Lấy 'HH24' rồi ép số, không dùng EXTRACT(hour FROM …) trên cột thô —
        // cột thô là giờ UTC nên sẽ lệch đúng 7 tiếng.
        theoGio
          ? this.prisma.$queryRaw<{ gio: number; luot: number; khach: number }[]>`
              SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${MUI_GIO}, 'HH24')::int AS gio,
                     COUNT(*)::int AS luot,
                     COUNT(DISTINCT "visitorHash")::int AS khach
              FROM koi_free_style.koi_page_views
              WHERE "createdAt" >= ${tu}
              GROUP BY 1
              ORDER BY 1 ASC
            `
          : Promise.resolve([] as { gio: number; luot: number; khach: number }[]),
      ]);

    // Ngày không có lượt nào vẫn phải có mặt, nếu không biểu đồ sẽ nối liền hai
    // ngày cách xa nhau và nhìn như site lúc nào cũng có khách.
    //
    // Khoá ngày phải sinh theo giờ VIỆT NAM cho khớp với to_char(...) ở trên.
    // Dùng thẳng toISOString() trên `tu` sẽ ra ngày UTC (lùi một ngày, vì
    // 00:00 giờ ta = 17:00 UTC hôm trước) nên không khoá nào khớp — biểu đồ
    // hiện toàn cột 0 dù bảng có dữ liệu.
    const mocNgay = new Map(theoNgay.map((r) => [r.ngay, r]));
    const chuoiNgay: { ngay: string; luot: number; khach: number }[] = [];
    for (let i = 0; i < soNgay; i++) {
      const mocVN = +tu + (i * 24 + 7) * 60 * 60 * 1000;
      const key = new Date(mocVN).toISOString().slice(0, 10);
      chuoiNgay.push(mocNgay.get(key) ?? { ngay: key, luot: 0, khach: 0 });
    }

    // Đủ 24 cột giờ, kể cả giờ chưa tới. `daQua` cho phía admin tô nhạt phần
    // còn lại của ngày — không có nó thì 3 giờ chiều nhìn xuống thấy 9 cột 0
    // liền nhau và tưởng website chết, trong khi đơn giản là chưa tới giờ đó.
    const gioBayGio = gioHienTaiVN();
    const mocGio = new Map(theoGioRaw.map((r) => [Number(r.gio), r]));
    const chuoiGio = theoGio
      ? Array.from({ length: 24 }, (_, h) => ({
          gio: h,
          luot: mocGio.get(h)?.luot ?? 0,
          khach: mocGio.get(h)?.khach ?? 0,
          daQua: h <= gioBayGio,
        }))
      : null;

    return {
      days: soNgay,
      from: tu.toISOString(),
      totals: { views: tongLuot, visitors: khachRieng },
      today: homNay,
      daily: chuoiNgay,
      // null khi xem nhiều ngày: bản cũ trong sessionStorage không có khoá này,
      // phía admin phải tự chịu được cả hai — xem renderTraffic.
      hourly: chuoiGio,
      nowHour: theoGio ? gioBayGio : null,
      topPages: topTrang,
      sources: theoNguon,
      devices: theoThietBi,
    };
  }
}
