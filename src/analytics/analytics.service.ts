import { Injectable } from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { MUI_GIO, dauNgayVN, gioHienTaiVN } from "../common/ngay-vn";
import { gomHanhVi, type HanhViRa, type LuotTho } from "./hanh-vi";
import {
  NHAN_KENH,
  gomKenhLienHe,
  laKenhHopLe,
  type CuBamTho,
  type KenhLienHeRa,
} from "./kenh-lien-he";

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
 * 8 phút. Con số này BUỘC vào nhịp tim phía storefront (NHIP_TIM_MS trong
 * track-page-view.tsx) — đổi một cái phải đổi cái kia, nếu không cửa sổ hẹp hơn
 * nhịp sẽ đá người đang đọc ra khỏi danh sách giữa hai nhịp.
 *
 * Trước đây là 5 phút cho nhịp 60 giây (lỡ 5 nhịp mới mất). Nhịp đã giãn lên
 * 180 giây để cắt số lần gọi hàm, nên cửa sổ phải nới theo: 8 phút = lỡ khoảng
 * 2.7 nhịp. Giữ đúng 5 nhịp thì cửa sổ thành 15 phút, lúc đó "đang xem" đếm cả
 * người đã đóng tab từ lâu, tức là nói dối chủ shop theo chiều khó phát hiện.
 *
 * Không đóng cứng con số này ở nơi khác: hàm realtime() trả nó ra ngoài qua
 * `windowMinutes` để panel Heoiu ghi đúng nhãn.
 */
const CUA_SO_ONLINE_MS = 8 * 60 * 1000;

/**
 * Giữ dòng hiện diện tối đa 1 ngày rồi dọn.
 *
 * Không dọn thì bảng phình mãi: hash đổi mỗi nửa đêm nên dòng của hôm qua vĩnh
 * viễn không ai ghi đè, nằm lại làm rác.
 */
const HAN_DON_RAC_MS = 24 * 60 * 60 * 1000;

/**
 * Tỉ lệ lượt ghi kéo theo một lần dọn rác.
 *
 * Dọn ké đường GHI, không ké đường ĐỌC. Trước đây dọn ké realtime() nên bảng
 * chỉ được dọn khi có người mở tab admin — tức là ngừng dọn đúng lúc không ai
 * nhìn, mà đó mới là lúc rác dồn. Giờ báo cáo đã dời sang Heoiu, đường đọc đó
 * sắp không còn ai gọi nữa.
 *
 * Không dọn mọi lượt ghi: mỗi lượt xem thêm một DELETE là trả tiền vô ích.
 * Không đếm biến trong bộ nhớ: mỗi hàm serverless một tiến trình riêng, biến
 * đếm không dùng chung được nên có instance đếm mãi không tới ngưỡng. Bốc thăm
 * thì không cần trạng thái. 2% của ~400 lượt/ngày là khoảng 8 lần dọn/ngày —
 * thừa sức cho một hạn 24 giờ, kể cả ngày vắng khách.
 */
const TI_LE_DON_RAC = 0.02;

/**
 * Trần số dòng lượt xem thô mà hanhVi() kéo về một lần.
 *
 * Không phải giới hạn hiển thị — mọi LIMIT của phần hiển thị nằm trong hanh-vi.ts
 * theo hợp đồng. Đây là dây bảo hiểm cho hàm serverless: không có trần thì một
 * đợt bot lọt lưới hoặc một ngày bị ghi trùng là kéo cả bảng vào bộ nhớ.
 *
 * 200.000 dòng so với thực tế ~400 lượt/ngày: 90 ngày (mốc lớn nhất cho phép)
 * mới khoảng 36.000, tức còn dư gấp năm lần. Nếu có ngày chạm trần thì số trả về
 * bị hụt phần MỚI NHẤT — ORDER BY createdAt ASC nên phần bị cắt là cuối kỳ.
 * Đổi lại thứ tự tăng dần giữ cho việc cắt phiên đúng ở phần dữ liệu còn lại.
 */
const TRAN_LUOT_HANH_VI = 200_000;

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
   * Có phải bot không.
   *
   * Đếm cả bot thì mọi con số đều vô nghĩa: Googlebot một mình có thể quét hàng
   * nghìn trang một đêm.
   *
   * Để riêng một hàm vì có HAI đường ghi cần lọc — lượt xem và cú bấm liên hệ.
   * Chép regex ra hai chỗ thì một ngày nào đó thêm tên bot vào một chỗ mà quên
   * chỗ kia, và chỗ bị quên lặng lẽ đếm rác.
   */
  private laBot(ua: string): boolean {
    return /bot|crawler|spider|crawling|headless|lighthouse|preview/i.test(ua);
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

    if (this.laBot(ua)) {
      return { tracked: false, reason: "bot" };
    }

    const path = this.chuanHoa(input.path);
    const source = this.nguon(input.referrer ?? null, input.host);
    const device = this.thietBi(ua);
    const visitorHash = this.visitorHash(input.ip, ua);

    // Hiện diện cập nhật cho CẢ nhịp tim lẫn lượt xem thật.
    await this.capNhatHienDien({ visitorHash, path, source, device });

    this.donRacHienDien();

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
   * Ghi một cú bấm nút liên hệ (Zalo / Messenger / Gọi điện) của BẤT KỲ khách nào.
   *
   * VÌ SAO ĐƯỜNG NÀY TỒN TẠI RIÊNG, không gộp vào /shop/ad-contact: đường đó là
   * đường chuyển đổi Google, gọi hụt là mất hẳn một chuyển đổi và không có bước
   * nào vớt lại. Hơn nữa nó chỉ ghi được khi khách có mã quảng cáo, nên khách
   * vào từ Google tự nhiên, Facebook, hay gõ thẳng địa chỉ thì trước đây KHÔNG
   * CÓ DÒNG NÀO Ở ĐÂU CẢ — mà đó là phần đông khách.
   *
   * Storefront gọi CẢ HAI đường khi khách quảng cáo bấm nút. Cố ý trùng: đường
   * này hỏng thì chỉ mất số đo, còn đường kia hỏng là mất tiền.
   *
   * Dùng lại nguyên nguon() / thietBi() / visitorHash() / chuanHoa() của lượt
   * xem. KHÔNG viết lại cách phân nhóm nguồn, nếu không bảng nguồn của hai panel
   * đọc ra hai kết quả khác nhau trên cùng một tập khách.
   */
  async ghiCuBamLienHe(input: {
    channel: string;
    path: string;
    referrer?: string | null;
    ip: string;
    ua: string;
    host: string;
    productName?: string | null;
    adToken?: string | null;
  }) {
    // Đường ghi CÔNG KHAI: ai gọi cũng được, gửi gì cũng được. Không lọc thì
    // bảng đầy rác và ba thẻ kênh trên panel cộng lại không bằng thẻ tổng.
    if (!laKenhHopLe(input.channel)) {
      return { tracked: false, reason: "channel" };
    }

    const ua = (input.ua || "").slice(0, 400);
    if (this.laBot(ua)) {
      return { tracked: false, reason: "bot" };
    }

    await this.prisma.koiContactClick.create({
      data: {
        channel: input.channel,
        path: this.chuanHoa(input.path),
        source: this.nguon(input.referrer ?? null, input.host),
        referrer: input.referrer ? input.referrer.slice(0, 500) : null,
        device: this.thietBi(ua),
        visitorHash: this.visitorHash(input.ip, ua),
        productName: input.productName ? input.productName.slice(0, 200) : null,
        adToken: input.adToken ? input.adToken.slice(0, 64) : null,
      },
    });
    return { tracked: true };
  }

  /**
   * Dọn dòng hiện diện quá hạn. Bốc thăm nên phần lớn lượt gọi không làm gì.
   *
   * KHÔNG await: khách đang đợi trang, không có lý do gì để họ chờ một cái
   * DELETE dọn nhà. Lỗi thì bỏ qua — dọn rác hỏng không được làm hỏng việc ghi
   * nhận lượt xem, lần bốc thăm sau dọn tiếp.
   */
  private donRacHienDien() {
    if (Math.random() >= TI_LE_DON_RAC) return;
    this.prisma.koiPresence
      .deleteMany({ where: { lastSeenAt: { lt: new Date(Date.now() - HAN_DON_RAC_MS) } } })
      .catch(() => {});
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

    // Dọn rác đã chuyển sang đường ghi (donRacHienDien) — xem ghi chú ở
    // TI_LE_DON_RAC. Đường đọc này sắp không còn ai gọi nên không được giữ
    // việc dọn ở đây.

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
        //
        // WHERE cũng phải đổi múi giờ, cùng lý do — xem ghi chú dài ở hanhVi().
        // Chỗ này nguy hiểm hơn hanhVi() vì summary() TRỘN hai đường đọc: tổng
        // `totals.views` đi qua Prisma ORM (Prisma tự gửi đúng kiểu nên luôn
        // đúng), còn biểu đồ `daily` đi qua $queryRaw. Đã đo trên cơ sở dữ liệu
        // thật: phiên đặt Asia/Ho_Chi_Minh cho totals.views = 2186 trong khi
        // tổng các cột daily = 2165 — hai con số lệch nhau NGAY TRONG CÙNG một
        // phản hồi. Máy chủ hiện chạy UTC nên chưa lộ, và DATABASE_URL không
        // ghim TimeZone nên không có gì bảo đảm điều đó không đổi.
        this.prisma.$queryRaw<{ ngay: string; luot: number; khach: number }[]>`
          SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${MUI_GIO}, 'YYYY-MM-DD') AS ngay,
                 COUNT(*)::int AS luot,
                 COUNT(DISTINCT "visitorHash")::int AS khach
          FROM koi_free_style.koi_page_views
          WHERE "createdAt" >= ${tu}::timestamptz AT TIME ZONE 'UTC'
          GROUP BY 1
          ORDER BY 1 ASC
        `,

        this.prisma.$queryRaw<{ path: string; luot: number; khach: number }[]>`
          SELECT "path",
                 COUNT(*)::int AS luot,
                 COUNT(DISTINCT "visitorHash")::int AS khach
          FROM koi_free_style.koi_page_views
          WHERE "createdAt" >= ${tu}::timestamptz AT TIME ZONE 'UTC'
          GROUP BY 1
          ORDER BY 2 DESC
          LIMIT 20
        `,

        this.prisma.$queryRaw<{ source: string; luot: number; khach: number }[]>`
          SELECT "source",
                 COUNT(*)::int AS luot,
                 COUNT(DISTINCT "visitorHash")::int AS khach
          FROM koi_free_style.koi_page_views
          WHERE "createdAt" >= ${tu}::timestamptz AT TIME ZONE 'UTC'
          GROUP BY 1
          ORDER BY 2 DESC
        `,

        this.prisma.$queryRaw<{ device: string; luot: number }[]>`
          SELECT "device", COUNT(*)::int AS luot
          FROM koi_free_style.koi_page_views
          WHERE "createdAt" >= ${tu}::timestamptz AT TIME ZONE 'UTC'
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
              WHERE "createdAt" >= ${tu}::timestamptz AT TIME ZONE 'UTC'
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

  /**
   * Hành vi khách: nguồn -> trang vào -> đường đi. Cho panel Heoiu.
   *
   * Kéo lượt xem THÔ về rồi cắt phiên ở tầng JS, không gom sẵn trong SQL. Lý do:
   * cắt phiên theo khoảng cách 30 phút cần so từng dòng với dòng liền trước
   * (window function + tổng tích luỹ), viết bằng SQL thì vừa dài vừa không test
   * được mà không có cơ sở dữ liệu. Số dòng ở đây nhỏ — 7 ngày khoảng 2.800
   * dòng, 90 ngày cũng chỉ vài chục nghìn — nên kéo về rẻ hơn nhiều so với chi
   * phí bảo trì một câu SQL không ai dám sửa.
   *
   * Toàn bộ phép tính nằm ở hanh-vi.ts (hàm thuần tuý). Hàm này chỉ lấy dữ liệu
   * và cắt múi giờ.
   */
  async hanhVi(days = 7): Promise<HanhViRa> {
    // Kẹp cả hai đầu VÀ cắt phần thập phân. Mẫu `Number(x) || 7` của các route
    // cũ không chặn số âm: days=-5 cho soNgay âm, dauNgayVN() nhảy sang tương
    // lai và bảng rỗng trơn. days=1.9 thì lọt số thực vào LIMIT/vòng lặp.
    const soNgay = Math.min(Math.max(Math.trunc(Number(days) || 7), 1), 90);
    const tu = this.dauNgayVN(soNgay - 1);

    // Cắt ngày/giờ/thứ NGAY TRONG SQL theo giờ Việt Nam. Ba cột này là lý do
    // duy nhất phải đổi múi giờ ở đây; gom lại ở JS bằng giờ máy chủ là lệch 7
    // tiếng (máy chủ Vercel chạy UTC).
    //
    // AT TIME ZONE 'UTC' ở trong là bắt buộc: createdAt là 'timestamp without
    // time zone' chứa giờ UTC, thiếu vế đó thì Postgres coi giá trị đang là giờ
    // ta rồi TRỪ 7 tiếng thay vì cộng.
    //
    // extract(dow ...) cho 0 = Chủ Nhật, khớp luôn quy ước NGAY của Heoiu nên
    // không phải đổi chỉ số. Ép ::int vì dow trả numeric.
    //
    // WHERE cũng phải đổi múi giờ, không chỉ SELECT. Prisma gửi `tu` xuống dưới
    // dạng timestamptz, còn createdAt là 'timestamp without time zone'. So một
    // cặp lệch kiểu như vậy thì Postgres phải ép, và nó ép bằng TimeZone CỦA
    // PHIÊN — tức cùng một câu lệnh cho số khác nhau tuỳ máy chủ đặt múi giờ
    // nào. Đã đo trên cơ sở dữ liệu thật, cùng mốc `tu`: phiên UTC ra 2186 dòng,
    // phiên Asia/Ho_Chi_Minh ra 2165, phiên America/New_York ra 2269.
    //
    // Bọc THAM SỐ (`${tu}::timestamptz AT TIME ZONE 'UTC'`) chứ KHÔNG bọc cột.
    // Bọc cột cũng cho số đúng nhưng biến điều kiện thành hàm của cột, nên index
    // "koi_page_views_createdAt_idx" hết dùng được vĩnh viễn — EXPLAIN cho thấy
    // ước lượng số dòng tụt từ 2131 xuống 922. Bọc tham số thì vế trái vẫn là
    // cột trần, so timestamp với timestamp, không còn dính TimeZone của phiên.
    const dong = await this.prisma.$queryRaw<
      {
        visitorHash: string;
        path: string;
        source: string;
        createdAt: Date;
        ngay: string;
        gio: number;
        thu: number;
      }[]
    >`
      SELECT "visitorHash",
             "path",
             "source",
             "createdAt",
             to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${MUI_GIO}, 'YYYY-MM-DD') AS ngay,
             to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${MUI_GIO}, 'HH24')::int AS gio,
             extract(dow from (("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE ${MUI_GIO}))::int AS thu
      FROM koi_free_style.koi_page_views
      WHERE "createdAt" >= ${tu}::timestamptz AT TIME ZONE 'UTC'
      ORDER BY "createdAt" ASC
      LIMIT ${TRAN_LUOT_HANH_VI}
    `;

    const luot: LuotTho[] = dong.map((r) => ({
      visitorHash: r.visitorHash,
      path: r.path,
      source: r.source,
      luc: +r.createdAt,
      ngay: r.ngay,
      gio: Number(r.gio),
      thu: Number(r.thu),
    }));

    return gomHanhVi(luot, {
      days: soNgay,
      // Chạm trần thì mọi số bên trong chỉ tính trên một phần của kỳ, và phần
      // mất là phần MỚI NHẤT (ORDER BY tăng dần). Không có cờ này thì panel vẽ
      // đủ `days` ngày với vài ngày cuối bằng 0 — nhìn hệt như mất dữ liệu.
      daCat: dong.length >= TRAN_LUOT_HANH_VI,
      // Biên ngày theo LỊCH VIỆT NAM. Dùng tu.toISOString().slice(0,10) là ra
      // ngày UTC, lùi đúng một ngày (00:00 giờ ta = 17:00 UTC hôm trước) nên
      // nhãn khoảng thời gian trên panel lệch so với số bên trong.
      from: this.ngayVN(tu),
      den: this.ngayVN(new Date()),
    });
  }

  /**
   * Số cú bấm nút liên hệ: theo kênh, theo nguồn, chéo hai chiều, và dòng gần nhất.
   *
   * Cắt kỳ bằng dauNgayVN() chứ KHÔNG phải Date.now() - days*86400000. Trừ thẳng
   * là được một cửa sổ 24 giờ trôi, nên panel này và panel lưu lượng cùng ghi
   * "30 ngày" mà đếm hai khoảng khác nhau (ads.service.ts:255 đã có ghi chú về
   * đúng cái bẫy này).
   *
   * Phần gộp số nằm ở kenh-lien-he.ts (hàm thuần tuý, có test). Hàm này chỉ lấy
   * dữ liệu và cắt múi giờ.
   *
   * TRẢ RA NGOÀI: không có visitorHash trong bảng dòng gần nhất. Hash là khoá gom
   * phía server, lộ ra là ai cũng đối chiếu được cú bấm với dòng hiện diện.
   */
  async kenhLienHe(days = 30): Promise<
    KenhLienHeRa & {
      days: number;
      from: string;
      den: string;
      nhanKenh: Record<string, string>;
      ganNhat: {
        channel: string;
        nhan: string;
        source: string;
        path: string;
        device: string;
        productName: string | null;
        luc: string;
      }[];
    }
  > {
    // Kẹp lại y hệt controller — cố ý trùng, vì hàm này công khai còn gọi từ
    // test và từ chỗ khác, không dựa vào cửa controller để an toàn.
    const soNgay = Math.min(Math.max(Math.trunc(Number(days) || 30), 1), 90);
    const tu = this.dauNgayVN(soNgay - 1);

    // Hai truy vấn song song: một để gộp (chỉ lấy cột cần đếm), một lấy dòng gần
    // nhất để hiện bảng. Không dùng chung một lượt kéo về rồi tự cắt: bảng gộp
    // cần cả kỳ, còn bảng hiện chủ shop muốn XEM HẾT mọi cú bấm (heoiu phân
    // trang 100 dòng phía hiển thị) nên cũng cần cả kỳ. Giữ hai truy vấn riêng:
    // bảng gộp chỉ cần bốn cột nhẹ, chở chung thì vừa nặng vừa lẫn việc.
    const [tho, ganNhat] = await Promise.all([
      this.prisma.koiContactClick.findMany({
        where: { createdAt: { gte: tu } },
        select: {
          visitorHash: true,
          channel: true,
          source: true,
          path: true,
        },
      }),
      this.prisma.koiContactClick.findMany({
        where: { createdAt: { gte: tu } },
        orderBy: { createdAt: "desc" },
        // Chặn trên đặt rất rộng so với lưu lượng thật (kỳ tối đa 90 ngày), nên
        // thực tế không cắt mất dòng nào — nó chỉ để một ngày cú bấm tăng đột
        // biến thì đường này không kéo cả bảng về theo. Đụng mức này là dấu hiệu
        // phải phân trang từ phía máy chủ, chứ đừng nâng số lên tiếp.
        take: 5000,
        select: {
          channel: true,
          source: true,
          path: true,
          device: true,
          productName: true,
          createdAt: true,
        },
      }),
    ]);

    // Nhãn nguồn để panel tự dán (heoiu đã có NHAN_NGUON riêng), nên truyền hàm
    // đồng nhất: backend trả giá trị máy, panel lo phần chữ. Trả nhãn từ đây là
    // hai nơi cùng đặt tên cho một thứ, sớm muộn lệch nhau.
    const gop = gomKenhLienHe(tho as CuBamTho[]);

    return {
      ...gop,
      days: soNgay,
      // Biên ngày theo LỊCH VIỆT NAM, không dùng toISOString() — xem ghi chú ở
      // hanhVi(): cắt theo UTC là nhãn lùi đúng một ngày so với số bên trong.
      from: this.ngayVN(tu),
      den: this.ngayVN(new Date()),
      // Nhãn kênh gửi kèm để panel không tự đoán chữ cho giá trị máy. Khác nguồn
      // ở chỗ danh sách kênh do backend chốt (đúng ba giá trị), còn nhãn nguồn
      // panel đã có sẵn.
      nhanKenh: NHAN_KENH,
      ganNhat: ganNhat.map((r) => ({
        channel: r.channel,
        nhan: laKenhHopLe(r.channel) ? NHAN_KENH[r.channel] : r.channel,
        source: r.source,
        path: r.path,
        device: r.device,
        productName: r.productName,
        luc: r.createdAt.toISOString(),
      })),
    };
  }

  // ----- KHÁCH ĐỂ LẠI THÔNG TIN (lead) -----
  //
  // Khách gửi lên qua POST /shop/leads (đường công khai). Trước đây không có
  // đường ĐỌC nào, nên bảng có dữ liệu mà người bán không thấy — lead nằm chết
  // trong cơ sở dữ liệu.
  //
  // Hai hàm dưới đây phục vụ controller /analytics (chỉ admin). KHÔNG được gắn
  // vào nhóm /shop: auth.guard.ts:35 mở toàn bộ /shop cho khách vô danh, đặt
  // sai chỗ là phơi tên và số điện thoại khách cho cả internet.

  /** Trạng thái cho phép. Chốt danh sách để không ai ghi bừa chuỗi lạ vào cột. */
  static readonly TRANG_THAI_LEAD = ["new", "contacted", "won", "lost"] as const;

  /**
   * Danh sách lead, mới nhất trước.
   *
   * `days` cắt theo NGÀY LỊCH giờ Việt Nam (dauNgayVN), giống kenhLienHe() —
   * trừ thẳng Date.now() - days*86400000 là hai panel cùng ghi "30 ngày" mà
   * đếm hai khoảng khác nhau. Không truyền days (hoặc 0) là lấy TOÀN BỘ từ
   * trước đến giờ, giữ nguyên hành vi cũ khi bảng chưa ai lọc theo kỳ.
   *
   * `id` trong bảng là BigInt. JSON.stringify() ném TypeError khi gặp BigInt
   * nên phải đổi sang Number ngay tại đây — để lọt ra ngoài là cả phản hồi
   * thành lỗi 500, không phải chỉ thiếu một trường.
   */
  async leads(input: {
    status?: string;
    limit?: number;
    offset?: number;
    days?: number;
  }) {
    const gioiHan = Math.min(Math.max(Number(input.limit) || 50, 1), 200);
    const boQua = Math.max(Number(input.offset) || 0, 0);

    // Kẹp lại y hệt controller — cố ý trùng, vì hàm này công khai còn gọi từ
    // test và từ chỗ khác, không dựa vào cửa controller để an toàn.
    const soNgay = Math.min(Math.max(Math.trunc(Number(input.days) || 0), 0), 365);

    // Lọc KỲ để riêng khỏi lọc TRẠNG THÁI, vì hai cái đi vào những truy vấn
    // khác nhau: `counts` chỉ nhận lọc kỳ, xem ghi chú ở dưới.
    const locKy = soNgay > 0 ? { created_at: { gte: this.dauNgayVN(soNgay - 1) } } : {};

    // Chỉ nhận trạng thái nằm trong danh sách trên; chuỗi lạ coi như không lọc.
    const loc = {
      ...locKy,
      ...((AnalyticsService.TRANG_THAI_LEAD as readonly string[]).includes(
        String(input.status),
      )
        ? { status: String(input.status) }
        : {}),
    };

    const [dong, tong, theoTrangThai] = await Promise.all([
      this.prisma.leads.findMany({
        where: loc,
        orderBy: { created_at: "desc" },
        take: gioiHan,
        skip: boQua,
      }),
      this.prisma.leads.count({ where: loc }),
      // `counts` PHẢI nhận locKy: thiếu nó là đếm cả bảng từ 2018 trong khi
      // `total` ngay bên cạnh chỉ đếm trong kỳ, và panel Heoiu đặt hai con số đó
      // cạnh nhau trên cùng một hàng thẻ (panel.js:1349 đọc `total` cho thẻ "Qua
      // form", panel.js:1350 đọc `counts.new` cho thẻ "Chưa xử lý"). Chọn kỳ
      // "Ngày hôm nay" là ra "Qua form 0 / Chưa xử lý 12" — hai câu chống nhau
      // trên cùng một hàng, không có cách nào đoán ra con nào tính khoảng nào.
      //
      // Nhưng KHÔNG nhận `loc`: lọc trạng thái vào đây là chọn tab "Chốt được"
      // thì ba tab kia tụt về 0, tức mất luôn cái bảng đếm dùng để bấm sang tab
      // khác. `counts` là "trong kỳ này, mỗi trạng thái bao nhiêu" — độc lập với
      // trạng thái đang xem.
      this.prisma.leads.groupBy({
        by: ["status"],
        _count: { _all: true },
        where: locKy,
      }),
    ]);

    const dem: Record<string, number> = {};
    for (const t of AnalyticsService.TRANG_THAI_LEAD) dem[t] = 0;
    for (const g of theoTrangThai) {
      dem[g.status] = (dem[g.status] ?? 0) + g._count._all;
    }

    return {
      total: tong,
      limit: gioiHan,
      offset: boQua,
      // days = 0 nghĩa là "toàn bộ từ trước đến giờ", không cắt theo ngày.
      days: soNgay,
      counts: dem,
      data: dong.map((l) => ({
        id: Number(l.id),
        name: l.name,
        phone: l.phone,
        email: l.email,
        message: l.message,
        // Khoá ngoại trỏ public.products (BigInt). Sản phẩm đang bán nằm ở
        // koi_free_style dùng UUID nên cột này gần như luôn null — tên món
        // được gộp vào message lúc ghi, xem shop-content.service.ts:createLead.
        productId: l.product_id === null ? null : Number(l.product_id),
        source: l.source,
        status: l.status,
        note: l.note,
        createdAt: l.created_at,
      })),
    };
  }

  /**
   * Đổi trạng thái / ghi chú một lead. Trả về bản ghi đã cập nhật.
   *
   * Trả `null` khi dữ liệu vào không hợp lệ, `"khong-thay"` khi không có lead
   * mang id đó. Không để lỗi Prisma tự bay ra ngoài: thông báo của nó chứa
   * đường dẫn tuyệt đối trên máy chủ và cả đoạn mã nguồn quanh chỗ lỗi.
   */
  async capNhatLead(
    id: number,
    input: { status?: string; note?: string | null },
  ) {
    const dulieu: { status?: string; note?: string | null } = {};

    if (input.status !== undefined) {
      if (
        !(AnalyticsService.TRANG_THAI_LEAD as readonly string[]).includes(
          input.status,
        )
      ) {
        return null;
      }
      dulieu.status = input.status;
    }
    if (input.note !== undefined) {
      const n = input.note === null ? null : String(input.note).trim();
      dulieu.note = n ? n.slice(0, 2000) : null;
    }
    if (!Object.keys(dulieu).length) return null;

    const co = await this.prisma.leads.findUnique({
      where: { id: BigInt(id) },
      select: { id: true },
    });
    if (!co) return "khong-thay" as const;

    const l = await this.prisma.leads.update({
      where: { id: BigInt(id) },
      data: dulieu,
    });
    return {
      id: Number(l.id),
      status: l.status,
      note: l.note,
    };
  }
}
