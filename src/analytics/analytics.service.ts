import { Injectable } from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";

/**
 * Theo dõi lưu lượng truy cập storefront.
 *
 * Thay cho VisitsService cũ (một bộ đếm tổng duy nhất cho kitleather.vn, không
 * ngày, không trang, không phân biệt người — không trả lời được câu nào đáng
 * giá cho việc bán hàng).
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

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Băm ẩn danh một lượt truy cập.
   *
   * Gộp NGÀY vào chuỗi băm nên sang ngày mới cùng một người sẽ ra hash khác.
   * Đổi lại: đếm được khách riêng trong ngày, nhưng KHÔNG lần được hành vi dài
   * ngày và không truy ngược ra danh tính. Đây là đánh đổi cố ý.
   */
  private visitorHash(ip: string, ua: string): string {
    const ngay = new Date().toISOString().slice(0, 10);
    return createHash("sha256")
      .update(`${ip}|${ua}|${ngay}|${SALT}`)
      .digest("hex")
      .slice(0, 32);
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

  /** Ghi một lượt xem. Gọi từ storefront, không cần đăng nhập. */
  async track(input: {
    path: string;
    referrer?: string | null;
    ip: string;
    ua: string;
    host: string;
  }) {
    const ua = (input.ua || "").slice(0, 400);

    // Bỏ qua bot: đếm cả bot thì mọi con số đều vô nghĩa, Googlebot một mình
    // có thể quét hàng nghìn trang một đêm.
    if (/bot|crawler|spider|crawling|headless|lighthouse|preview/i.test(ua)) {
      return { tracked: false, reason: "bot" };
    }

    await this.prisma.koiPageView.create({
      data: {
        path: this.chuanHoa(input.path),
        referrer: input.referrer ? input.referrer.slice(0, 500) : null,
        source: this.nguon(input.referrer ?? null, input.host),
        device: this.thietBi(ua),
        visitorHash: this.visitorHash(input.ip, ua),
      },
    });
    return { tracked: true };
  }

  /**
   * Tổng quan cho trang admin.
   *
   * Dùng $queryRaw cho phần gom nhóm theo ngày: Prisma groupBy không cắt được
   * timestamp về ngày, nếu gom ở tầng JS thì phải kéo toàn bộ dòng về máy chủ —
   * vài chục nghìn dòng mỗi lần mở tab là quá đắt.
   */
  async summary(days = 30) {
    const soNgay = Math.min(Math.max(Number(days) || 30, 1), 365);
    const tu = new Date();
    tu.setDate(tu.getDate() - soNgay + 1);
    tu.setHours(0, 0, 0, 0);

    const where = { createdAt: { gte: tu } };

    const [tongLuot, khachRieng, theoNgay, topTrang, theoNguon, theoThietBi] =
      await Promise.all([
        this.prisma.koiPageView.count({ where }),

        this.prisma.koiPageView
          .findMany({ where, select: { visitorHash: true }, distinct: ["visitorHash"] })
          .then((r) => r.length),

        this.prisma.$queryRaw<{ ngay: string; luot: number; khach: number }[]>`
          SELECT to_char("createdAt" AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') AS ngay,
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
      ]);

    // Ngày không có lượt nào vẫn phải có mặt, nếu không biểu đồ sẽ nối liền hai
    // ngày cách xa nhau và nhìn như site lúc nào cũng có khách.
    const mocNgay = new Map(theoNgay.map((r) => [r.ngay, r]));
    const chuoiNgay: { ngay: string; luot: number; khach: number }[] = [];
    for (let i = 0; i < soNgay; i++) {
      const d = new Date(tu);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      chuoiNgay.push(mocNgay.get(key) ?? { ngay: key, luot: 0, khach: 0 });
    }

    return {
      days: soNgay,
      from: tu.toISOString(),
      totals: { views: tongLuot, visitors: khachRieng },
      daily: chuoiNgay,
      topPages: topTrang,
      sources: theoNguon,
      devices: theoThietBi,
    };
  }
}
