import { Injectable } from "@nestjs/common";
import { randomInt } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { dauNgayVN } from "../common/ngay-vn";

/**
 * Nối cú bấm quảng cáo Google với đơn hàng chốt trên Zalo.
 *
 * BÀI TOÁN. Google Ads chỉ tối ưu giỏi khi biết cú bấm nào ra tiền thật. Site
 * này không bán online — mọi đơn chốt trong hộp thoại Zalo, không có trang
 * "cảm ơn" để tự nối. Nếu chỉ đếm "khách bấm nút Zalo" rồi bảo Google tối ưu
 * theo đó, Google sẽ đi tìm NGƯỜI THÍCH BẤM NÚT, không phải người mua hàng.
 *
 * CÁCH NỐI. Khách vào từ quảng cáo mang theo ?gclid= trên URL. Ta lưu lại,
 * sinh một mã ngắn, nhét mã vào tin nhắn Zalo soạn sẵn. Chủ shop thấy mã ngay
 * trong hộp thoại. Chốt đơn thì gõ mã vào admin + điền số tiền, rồi xuất CSV
 * tải lên Google Ads. Từ đó Google học theo DOANH SỐ chứ không theo cú bấm.
 *
 * XEM THÊM: ads.controller.ts (đường công khai vs đường admin) và
 * src/lib/gclid.ts bên koi-storefront (phần bắt gclid trên trình duyệt).
 */

/**
 * Bảng chữ cái sinh mã.
 *
 * Bỏ hẳn 0/O/1/I/L và nguyên âm. Hai lý do, cả hai đều thật:
 *
 *  1. Chủ shop ĐỌC MÃ BẰNG MẮT từ hộp thoại Zalo rồi GÕ TAY vào admin. Để cả
 *     0 lẫn O trong bảng là bảo đảm có ngày gõ nhầm, tra không ra, và mất luôn
 *     đơn đó khỏi báo cáo — không có cách nào biết mình vừa mất.
 *  2. Bỏ nguyên âm thì mã không vô tình ghép thành từ bậy tiếng Việt hay tiếng
 *     Anh. Mã này hiện trong tin nhắn khách gửi, không phải chỗ để rủi ro.
 *
 * Còn 28 ký tự: 8 chữ số (2-9) và 20 phụ âm.
 */
const BANG_CHU_CAI = "23456789BCDFGHJKMNPQRSTVWXYZ";

/**
 * Độ dài mã.
 *
 * 6 ký tự trên bảng 28 chữ = ~482 triệu tổ hợp. Shop này cỡ vài nghìn cú bấm
 * quảng cáo một tháng, nên xác suất đụng mã gần như không có; mà có đụng thì
 * hàm sinh cũng thử lại. Ngắn hơn nữa (5) thì tiết kiệm được đúng một ký tự
 * trong tin nhắn, không đáng đánh đổi.
 */
const DAI_MA = 6;

/**
 * Google chỉ nhận doanh số trong 90 ngày kể từ cú bấm.
 *
 * Quá hạn là Google bỏ qua dòng đó hoàn toàn — không báo lỗi, không vào báo
 * cáo. Nên phải cảnh báo TRƯỚC ở admin, không đợi tới lúc tải lên mới biết.
 */
export const HAN_GOOGLE_NGAY = 90;

/**
 * Giữ dòng chưa chốt bao lâu rồi dọn.
 *
 * 120 ngày = 90 ngày hạn Google + 30 ngày đệm để còn xem lại báo cáo cũ. Quá
 * mốc đó thì dòng chưa chốt vĩnh viễn vô dụng, giữ chỉ tổ phình bảng.
 * Dòng ĐÃ CHỐT thì giữ luôn: đó là lịch sử doanh thu, không phải rác.
 */
const HAN_DON_RAC_NGAY = 120;

/**
 * Múi giờ cắt ngày và xuất CSV.
 *
 * Máy chủ Vercel chạy giờ UTC, cửa hàng bán ở Việt Nam. Xuất CSV theo giờ UTC
 * là mọi đơn chốt buổi sáng bị Google ghi lùi về hôm trước. Google nhận hậu tố
 * dạng "+0700" (bốn chữ số, KHÔNG có dấu hai chấm — "+07:00" là định dạng của
 * API, file CSV mà viết vậy là hỏng).
 */
const LECH_GIO = "+0700";
const LECH_GIO_PHUT = 7 * 60;

@Injectable()
export class AdsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Sinh mã ngắn chưa ai dùng.
   *
   * Dùng randomInt của node:crypto chứ không phải Math.random: mã này đi vào
   * tin nhắn của khách và là khoá tra cứu đơn hàng, không nên đoán được.
   */
  private async sinhMa(): Promise<string> {
    // Thử 5 lần rồi mới chịu thua. Với 244 triệu tổ hợp thì lần một gần như
    // luôn trúng; vòng lặp này chỉ để phòng trường hợp bảng phình bất thường.
    for (let i = 0; i < 5; i++) {
      let ma = "";
      for (let j = 0; j < DAI_MA; j++) {
        ma += BANG_CHU_CAI[randomInt(BANG_CHU_CAI.length)];
      }
      const trung = await this.prisma.koiAdClick.findUnique({
        where: { token: ma },
        select: { token: true },
      });
      if (!trung) return ma;
    }
    // Hết lượt thử: nối thêm ký tự cho chắc chắn không đụng, thà mã dài một
    // ký tự còn hơn ném lỗi làm hỏng nút Zalo của khách.
    return (
      Array.from({ length: DAI_MA + 2 }, () => BANG_CHU_CAI[randomInt(BANG_CHU_CAI.length)]).join("")
    );
  }

  /**
   * Khách vừa đáp xuống từ một quảng cáo — ghi lại và trả về mã ngắn.
   *
   * Gọi từ storefront ngay lúc trang nạp, TRƯỚC khi khách bấm gì. Phải sớm vì
   * gclid chỉ có trên URL của lần vào đầu tiên: khách bấm sang trang thứ hai
   * là tham số biến mất, không lấy lại được nữa.
   */
  async ghiNhanBam(input: {
    gclid?: string | null;
    gbraid?: string | null;
    wbraid?: string | null;
    landingPath?: string | null;
  }): Promise<{ token: string }> {
    const token = await this.sinhMa();
    await this.prisma.koiAdClick.create({
      data: {
        token,
        // Cắt ngắn phòng URL bị nhồi rác: gclid thật cỡ 90-100 ký tự.
        gclid: input.gclid?.slice(0, 512) || null,
        gbraid: input.gbraid?.slice(0, 512) || null,
        wbraid: input.wbraid?.slice(0, 512) || null,
        landingPath: input.landingPath?.slice(0, 512) || null,
      },
    });
    return { token };
  }

  /**
   * Khách vừa bấm nút Zalo/Messenger — đánh dấu vào dòng đã có.
   *
   * Tách khỏi ghiNhanBam vì hai việc cách nhau về thời gian: khách vào xem
   * mười phút rồi mới nhắn. Dòng nào không bao giờ tới bước này = quảng cáo
   * kéo được người vào nhưng không ra hội thoại.
   */
  async ghiNhanLienHe(input: {
    token: string;
    channel?: string | null;
    productName?: string | null;
  }): Promise<void> {
    // updateMany chứ không update: khách có thể gửi mã cũ đã bị dọn rác, hoặc
    // mã bịa. update sẽ ném lỗi, updateMany lặng lẽ khớp 0 dòng — đúng thứ ta
    // muốn cho một đường công khai ai gọi cũng được.
    await this.prisma.koiAdClick.updateMany({
      where: { token: input.token },
      data: {
        // Giữ lần liên hệ ĐẦU: đó là lúc quảng cáo thực sự đẻ ra hội thoại.
        contactedAt: new Date(),
        channel: input.channel?.slice(0, 32) || null,
        productName: input.productName?.slice(0, 255) || null,
      },
    });
  }

  /** Còn bao nhiêu ngày nữa thì hết hạn tải lên Google. Âm = đã quá hạn. */
  private conLaiNgay(clickedAt: Date): number {
    const troi = (Date.now() - clickedAt.getTime()) / 86_400_000;
    return Math.floor(HAN_GOOGLE_NGAY - troi);
  }

  /**
   * Danh sách cho admin xem.
   *
   * Chỉ trả dòng CÓ gclid (hoặc braid): dòng không có thì vĩnh viễn không tải
   * lên Google được, hiện ra chỉ làm nhiễu bảng.
   *
   * Cắt theo NGÀY LỊCH giờ Việt Nam, không phải 24 giờ trượt. Trước đây dùng
   * `Date.now() - days * 86_400_000`: bấm "1 ngày" lúc 9 giờ sáng thì bảng gộp
   * cả từ 9 giờ sáng HÔM QUA, trong khi trang /admin/traffic ngay cạnh lại cắt
   * từ 00:00 hôm nay — hai trang cùng ghi "1 ngày" mà đếm hai khoảng khác nhau,
   * đối chiếu cú bấm với lượt xem là ra số vênh không giải thích được.
   */
  async danhSach(days = 90): Promise<unknown> {
    const soNgay = Math.min(Math.max(Number(days) || 90, 1), 365);
    const tu = dauNgayVN(soNgay - 1);
    const rows = await this.prisma.koiAdClick.findMany({
      where: {
        clickedAt: { gte: tu },
        OR: [
          { gclid: { not: null } },
          { gbraid: { not: null } },
          { wbraid: { not: null } },
        ],
      },
      orderBy: { clickedAt: "desc" },
      take: 500,
    });

    return {
      days: soNgay,
      from: tu.toISOString(),
      tongCong: rows.length,
      // Đếm sẵn cho admin khỏi phải tự cộng: ba con số này là toàn bộ câu
      // chuyện — bao nhiêu cú bấm, bao nhiêu ra hội thoại, bao nhiêu ra tiền.
      daLienHe: rows.filter((r) => r.contactedAt).length,
      daChot: rows.filter((r) => r.convertedAt).length,
      doanhThu: rows
        .reduce((s, r) => s + (r.value ?? 0n), 0n)
        .toString(),
      items: rows.map((r) => ({
        token: r.token,
        // Cắt gclid khi hiện: chuỗi 100 ký tự làm vỡ bảng, mà admin không bao
        // giờ cần đọc nó bằng mắt — chỉ cần biết CÓ.
        gclid: r.gclid ? `${r.gclid.slice(0, 16)}…` : null,
        coGclid: Boolean(r.gclid || r.gbraid || r.wbraid),
        landingPath: r.landingPath,
        productName: r.productName,
        channel: r.channel,
        clickedAt: r.clickedAt,
        contactedAt: r.contactedAt,
        convertedAt: r.convertedAt,
        // BigInt không serialize được sang JSON — phải đổi sang chuỗi, nếu
        // không cả phản hồi ném lỗi "Do not know how to serialize a BigInt".
        value: r.value?.toString() ?? null,
        note: r.note,
        exportedAt: r.exportedAt,
        conLaiNgay: this.conLaiNgay(r.clickedAt),
      })),
    };
  }

  /** Tra một mã — dùng cho ô tìm kiếm khi chủ shop cầm mã từ hộp thoại Zalo. */
  async tra(token: string): Promise<unknown> {
    const r = await this.prisma.koiAdClick.findUnique({
      where: { token: this.chuanHoaMa(token) },
    });
    if (!r) return { found: false };
    return {
      found: true,
      token: r.token,
      coGclid: Boolean(r.gclid || r.gbraid || r.wbraid),
      landingPath: r.landingPath,
      productName: r.productName,
      channel: r.channel,
      clickedAt: r.clickedAt,
      contactedAt: r.contactedAt,
      convertedAt: r.convertedAt,
      value: r.value?.toString() ?? null,
      note: r.note,
      exportedAt: r.exportedAt,
      conLaiNgay: this.conLaiNgay(r.clickedAt),
    };
  }

  /**
   * Chuẩn hoá mã người gõ tay.
   *
   * Chủ shop chép mã từ Zalo nên hay dính khoảng trắng và gõ chữ thường. Bảng
   * chữ cái đã bỏ hẳn O/I/L/0/1 nên KHÔNG cần đoán ý người gõ nhầm: gõ sai một
   * ký tự thì tra ra rỗng và họ gõ lại. Cố "sửa hộ" bằng cách map O→0 chỉ đẻ
   * thêm đường cho một mã sai vô tình khớp nhầm dòng của khách khác.
   */
  private chuanHoaMa(token: string): string {
    return (token || "").trim().toUpperCase();
  }

  /**
   * Chủ shop đánh dấu một mã đã chốt đơn.
   *
   * convertedAt mặc định là BÂY GIỜ, nhưng cho phép truyền vào: đơn thường
   * chốt trước lúc chủ shop ngồi nhập liệu, mà Google tính theo giờ chốt thật.
   */
  async danhDauChot(input: {
    token: string;
    value?: number | string | null;
    note?: string | null;
    convertedAt?: string | null;
  }): Promise<{ ok: boolean }> {
    const token = this.chuanHoaMa(input.token);
    const r = await this.prisma.koiAdClick.findUnique({ where: { token } });
    if (!r) return { ok: false };

    // Cho phép xoá đánh dấu bằng cách gửi value rỗng và convertedAt rỗng —
    // chủ shop ghi nhầm mã thì phải sửa được, không thì dòng sai nằm đó vĩnh
    // viễn và bơm số ảo cho Google.
    const bo = input.convertedAt === null && input.value === null;

    await this.prisma.koiAdClick.update({
      where: { token },
      data: {
        convertedAt: bo
          ? null
          : input.convertedAt
            ? new Date(input.convertedAt)
            : (r.convertedAt ?? new Date()),
        value: bo
          ? null
          : input.value === undefined || input.value === null || input.value === ""
            ? r.value
            : BigInt(String(input.value).replace(/\D/g, "") || "0"),
        note: input.note === undefined ? r.note : (input.note?.slice(0, 500) || null),
        // Sửa lại thì coi như chưa xuất: số đã đổi, phải cho xuất lại.
        exportedAt: bo ? null : r.exportedAt,
      },
    });
    return { ok: true };
  }

  /**
   * Định giờ theo đúng khuôn Google: "yyyy-MM-dd HH:mm:ss+0700".
   *
   * Tự cộng lệch giờ thay vì dùng toLocaleString: hàm đó trả chuỗi theo locale
   * của máy chủ, thứ tự ngày/tháng đổi theo môi trường. Google đọc nhầm 08/03
   * thành mùng 8 tháng 3 là sai lệch cả tháng doanh số mà không ai thấy.
   */
  private gioGoogle(d: Date): string {
    const t = new Date(d.getTime() + LECH_GIO_PHUT * 60_000);
    const p = (n: number, w = 2) => String(n).padStart(w, "0");
    return (
      `${t.getUTCFullYear()}-${p(t.getUTCMonth() + 1)}-${p(t.getUTCDate())} ` +
      `${p(t.getUTCHours())}:${p(t.getUTCMinutes())}:${p(t.getUTCSeconds())}${LECH_GIO}`
    );
  }

  /**
   * Xuất CSV đúng khuôn Google Ads nhận.
   *
   * KHUÔN FILE (đã kiểm chứng với tài liệu Google 2026):
   *   dòng 1: Parameters:TimeZone=+0700
   *   dòng 2: tên cột, viết hoa/thường phải khớp CHÍNH XÁC
   *   dòng 3+: dữ liệu
   *
   * BA ĐIỀU KIỆN PHÍA GOOGLE, thiếu một là file bị từ chối:
   *  1. Trong Google Ads phải có sẵn conversion action nguồn "Import from
   *     clicks" (KHÔNG dùng được action của website). Tạo ở phần
   *     "Conversions offline".
   *  2. Tên trong cột Conversion Name phải khớp từng chữ với tên action đó.
   *  3. Chờ 4-6 tiếng sau khi tạo action rồi mới tải lên lần đầu, và cú bấm
   *     phải cũ hơn 6 tiếng.
   *
   * MẶC ĐỊNH CHỈ LẤY DÒNG CHƯA XUẤT. Google CỘNG DỒN chứ không thay thế: tải
   * cùng một gclid hai lần là doanh số nhân đôi, mà Google lại tự tối ưu theo
   * con số đó nên tiền quảng cáo sẽ đổ nhầm chỗ. Chủ shop bấm tải hai lần
   * trong một buổi là chuyện thường, không thể trông vào việc họ nhớ.
   *
   * Đặt lai = true khi Google báo lỗi và cần tải lại — lúc đó lần trước KHÔNG
   * vào được nên xuất lại là đúng.
   */
  async xuatCsv(conversionName: string, lai = false): Promise<string> {
    const rows = await this.prisma.koiAdClick.findMany({
      where: {
        convertedAt: { not: null },
        gclid: { not: null },
        // Quá 90 ngày thì Google lặng lẽ bỏ qua — lọc sẵn ở đây để file không
        // chứa dòng vô dụng và con số đối chiếu sau này khỏi lệch.
        clickedAt: { gte: new Date(Date.now() - HAN_GOOGLE_NGAY * 86_400_000) },
        ...(lai ? {} : { exportedAt: null }),
      },
      orderBy: { convertedAt: "asc" },
    });

    // Không còn đơn mới nào: trả chuỗi rỗng để nơi gọi phân biệt được với file
    // có dữ liệu. Đưa file chỉ có hai dòng tiêu đề lên Google là báo lỗi vô
    // nghĩa, mà chủ shop lại tưởng đã tải xong.
    if (!rows.length) return "";

    const dong = [
      `Parameters:TimeZone=${LECH_GIO}`,
      "Google Click ID,Conversion Name,Conversion Time,Conversion Value,Conversion Currency,Order ID",
    ];

    for (const r of rows) {
      dong.push(
        [
          r.gclid ?? "",
          this.boc(conversionName),
          this.gioGoogle(r.convertedAt as Date),
          // Không dấu chấm phân cách nghìn: Excel bản tiếng Việt hay tự chèn
          // "1.250.000" và Google đọc thành 1,25 — hụt một nghìn lần.
          (r.value ?? 0n).toString(),
          "VND",
          r.token,
        ].join(","),
      );
    }

    // Đánh dấu đã xuất SAU khi dựng xong file: dựng lỗi thì không được phép
    // đánh dấu, nếu không những dòng đó biến mất khỏi lần xuất sau.
    await this.prisma.koiAdClick.updateMany({
      where: { token: { in: rows.map((r) => r.token) } },
      data: { exportedAt: new Date() },
    });

    return dong.join("\r\n");
  }

  /** Bọc ô CSV nếu có dấu phẩy/nháy — tên action do người gõ, không tin được. */
  private boc(s: string): string {
    if (!/[",\r\n]/.test(s)) return s;
    return `"${s.replace(/"/g, '""')}"`;
  }

  /**
   * Dọn dòng chưa chốt đã quá hạn dùng.
   *
   * Chỉ xoá dòng CHƯA chốt: dòng đã chốt là lịch sử doanh thu, giữ lại.
   */
  async donRac(): Promise<{ deleted: number }> {
    const r = await this.prisma.koiAdClick.deleteMany({
      where: {
        convertedAt: null,
        clickedAt: { lt: new Date(Date.now() - HAN_DON_RAC_NGAY * 86_400_000) },
      },
    });
    return { deleted: r.count };
  }
}
