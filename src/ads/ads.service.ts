import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { randomInt } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { dauNgayVN } from "../common/ngay-vn";

/**
 * Nối cú bấm quảng cáo Google với hội thoại Zalo.
 *
 * BÀI TOÁN. Google Ads chỉ tối ưu giỏi khi có tín hiệu chuyển đổi gửi về. Site
 * này không bán online — mọi đơn chốt trong hộp thoại Zalo, không có trang
 * "cảm ơn" để tự nối. Không gửi gì về thì Google đấu giá mù: nó biết cú bấm
 * nào rẻ, không biết cú bấm nào ra khách.
 *
 * CÁCH NỐI. Khách vào từ quảng cáo mang theo ?gclid= trên URL. Ta lưu lại,
 * sinh một mã ngắn, nhét mã vào tin nhắn Zalo soạn sẵn. Khách bấm nút liên hệ
 * là dòng đó được TÍNH LUÔN LÀ CHUYỂN ĐỔI, rồi xuất CSV tải lên Google Ads.
 *
 * VÌ SAO TÍNH THEO CÚ BẤM LIÊN HỆ, KHÔNG ĐỢI SỐ TIỀN. Đây là quyết định của
 * chủ tiệm, và nó đúng với thực tế bán hàng ở đây:
 *
 *  · Đơn chốt qua Zalo rồi giao tận tay, KHÔNG có hoá đơn điện tử để đối
 *    chiếu. Muốn có số tiền thì chủ tiệm phải ngồi gõ tay từng đơn — việc đó
 *    không bao giờ được làm đều, và bằng chứng nằm ngay trong bảng: 4 dòng đã
 *    nhắn tin, 0 dòng có tiền.
 *  · Tín hiệu KHÔNG BAO GIỜ GỬI thì tệ hơn hẳn tín hiệu gửi thiếu tiền. Với
 *    tệp rỗng, Google học được đúng con số không.
 *  · Bù lại phải hiểu rõ giới hạn: Google sẽ tối ưu để tìm NGƯỜI CHỊU BẤM
 *    NHẮN TIN, không phải người mua nhiều. Nên phải đấu giá theo số lượt
 *    chuyển đổi (Maximise conversions), KHÔNG dùng tROAS hay Maximise
 *    conversion value — hai chiến lược đó cần số tiền thật mới chạy đúng.
 *
 * Vẫn giữ nguyên đường nhập tiền tay ở admin: chủ tiệm rảnh mà gõ vào thì cột
 * giá trị có số thật thay vì bỏ trắng, báo cáo càng sát. Chỉ là không CHỜ nó
 * nữa.
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
 * Cú bấm phải già bao nhiêu tiếng mới được xuất lên Google.
 *
 * ĐÂY LÀ CÁI BẪY LỚN NHẤT của việc tính chuyển đổi ngay lúc bấm nút. Tài liệu
 * Google ghi: "If any of the conversions you import are within one day of the
 * click, Google Ads may not be able to record them yet." Trước đây chủ tiệm gõ
 * số tiền vài ngày sau khi khách nhắn nên không bao giờ đụng phải; giờ chuyển
 * đổi sinh ra sau cú bấm ĐÚNG VÀI GIÂY, nên MỌI dòng đều rơi vào vùng đó.
 *
 * Hậu quả nếu không chặn: chủ tiệm bấm "Xuất CSV" buổi chiều, Google im lặng
 * bỏ qua nửa tệp — không báo lỗi — mà exportedAt thì đã đóng dấu, nên những
 * dòng đó KHÔNG BAO GIỜ được xuất lại. Mất vĩnh viễn, và không có cách nào
 * biết mình vừa mất.
 *
 * 24 giờ chứ không phải 6: mốc 6 tiếng là điều kiện cho conversion action vừa
 * tạo, không phải cho cú bấm. Với cú bấm thì Google nói hẳn "một ngày".
 */
const CHO_XUAT_GIO = 24;

/**
 * GOOGLE TỰ KHỬ TRÙNG LẶP — và điều này đổi hẳn cách thiết kế đường feed.
 *
 * Khoá nhận dạng một chuyển đổi bên Google là BA THỨ ghép lại: tên conversion
 * action + GIỜ chuyển đổi + gclid. Gửi lại y nguyên một dòng đã gửi hôm qua thì
 * Google chỉ tính MỘT LẦN. Tài liệu của họ còn khuyên gửi chồng lấn thêm ngày
 * hôm trước để vớt những dòng lần đó còn đang xử lý.
 *
 * Hai chuyển đổi trên cùng một gclid chỉ xảy ra khi GIỜ khác nhau — đó là lý do
 * điều kiện `contactedAt: null` ở ghiNhanLienHe vẫn phải giữ nguyên: nó chốt
 * mốc giờ lại, không cho cú bấm thứ hai dịch giờ đi.
 *
 * Nhờ vậy đường feed gửi được CỬA SỔ TRƯỢT thay vì "chỉ dòng chưa gửi", và cách
 * đó chắc chắn hơn hẳn: dòng nào hôm nay Google từ chối (cú bấm còn non, lỗi
 * mạng, lịch chạy hụt một hôm) thì mai tự được gửi lại. Với cách cũ — đóng dấu
 * exportedAt rồi loại khỏi lần sau — một lần từ chối là mất dòng đó vĩnh viễn.
 *
 * 30 ngày: dài hơn hẳn mọi sự cố tưởng tượng được (Vercel sập, Google đổi mật
 * khẩu, chủ tiệm tắt lịch một tuần rồi bật lại), mà vẫn cách hạn 90 ngày rất
 * xa nên không dòng nào bị Google gắn lỗi "click quá cũ".
 */
const CUA_SO_FEED_NGAY = 30;

/**
 * Giữ dòng chưa chuyển đổi bao lâu rồi dọn.
 *
 * 120 ngày = 90 ngày hạn Google + 30 ngày đệm để còn xem lại báo cáo cũ. Quá
 * mốc đó thì dòng chưa chuyển đổi vĩnh viễn vô dụng, giữ chỉ tổ phình bảng.
 *
 * Dòng ĐÃ CHUYỂN ĐỔI thì giữ luôn — kể cả khi không có đồng tiền nào. Từ khi
 * cú bấm nút tự tính là chuyển đổi, phần lớn dòng giữ lại sẽ trắng tiền, và
 * chúng vẫn phải giữ: đó là bằng chứng đối chiếu với con số Google báo, thứ
 * duy nhất kiểm được là mình đã gửi đúng hay chưa.
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
   * Khách vừa bấm nút Zalo/Messenger/Gọi — ĐÂY LÀ CHUYỂN ĐỔI.
   *
   * Tách khỏi ghiNhanBam vì hai việc cách nhau về thời gian: khách vào xem
   * mười phút rồi mới nhắn. Dòng nào không bao giờ tới bước này = quảng cáo
   * kéo được người vào nhưng không ra hội thoại.
   *
   * Đặt LUÔN convertedAt ở đây, không đợi chủ tiệm gõ số tiền. Lý do đầy đủ ở
   * doc comment đầu tệp; ngắn gọn: không đợi thì Google có tín hiệu để học,
   * đợi thì tệp CSV rỗng vĩnh viễn.
   */
  async ghiNhanLienHe(input: {
    token: string;
    channel?: string | null;
    productName?: string | null;
  }): Promise<void> {
    // updateMany chứ không update: khách có thể gửi mã cũ đã bị dọn rác, hoặc
    // mã bịa. update sẽ ném lỗi, updateMany lặng lẽ khớp 0 dòng — đúng thứ ta
    // muốn cho một đường công khai ai gọi cũng được.
    //
    // contactedAt: null trong where — CHỈ ghi lần liên hệ ĐẦU. Đó là lúc quảng
    // cáo thực sự đẻ ra hội thoại, và quan trọng hơn: nó CHỐT MỐC GIỜ lại.
    //
    // Mốc giờ là thứ phải bảo vệ, vì nó nằm trong khoá nhận dạng của Google
    // (tên action + giờ + gclid — xem CUA_SO_FEED_NGAY). Gửi lại y nguyên một
    // dòng thì Google khử trùng lặp, không sao cả; nhưng nếu khách bấm Zalo lần
    // hai (chuyện rất thường: bấm ở đầu trang, cuộn xuống bấm tiếp) mà ta dịch
    // convertedAt lên thì dòng đó thành một GIỜ KHÁC, và Google tính nó là
    // chuyển đổi thứ hai — một cú bấm quảng cáo bị đếm thành hai đơn.
    await this.prisma.koiAdClick.updateMany({
      where: { token: input.token, contactedAt: null },
      data: {
        contactedAt: new Date(),
        // Cùng một mốc giờ với contactedAt là đúng bản chất: cú bấm nút CHÍNH
        // LÀ chuyển đổi, không phải một sự kiện xảy ra sau nó.
        convertedAt: new Date(),
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
      // Đếm sẵn cho admin khỏi phải tự cộng. Bốn con số là toàn bộ câu chuyện:
      // bao nhiêu cú bấm vào, bao nhiêu ra hội thoại (= bao nhiêu chuyển đổi,
      // vì cú bấm nút CHÍNH LÀ chuyển đổi), bao nhiêu đã gửi được sang Google,
      // và bao nhiêu trong số đó có số tiền thật.
      daLienHe: rows.filter((r) => r.contactedAt).length,
      daChot: rows.filter((r) => r.convertedAt).length,
      // daXuat tách riêng vì đây là con số DUY NHẤT cho biết Google đã học được
      // gì. Chuyển đổi nằm trong bảng mà chưa xuất thì với Google là chưa tồn
      // tại — mà đó đúng là chỗ dễ tưởng đã xong nhất.
      daXuat: rows.filter((r) => r.exportedAt).length,
      // Chỉ đếm dòng CÓ tiền, không đếm dòng tiền null: từ khi cú bấm tự tính
      // là chuyển đổi, phần lớn dòng có convertedAt mà không có value. Lấy
      // daChot làm mẫu số cho doanh thu là ra giá trị đơn trung bình gần bằng
      // không, và đó là con số bịa.
      soDonCoTien: rows.filter((r) => r.value !== null).length,
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
   * Chủ tiệm ghi số tiền thật cho một mã.
   *
   * KHÔNG còn là nơi tạo ra chuyển đổi — cú bấm nút Zalo đã làm việc đó rồi.
   * Hàm này giờ chỉ để LÀM GIÀU dòng đã có: thay số 0 bằng số tiền thật, thêm
   * ghi chú, sửa lại giờ chốt nếu đơn chốt lệch ngày với lúc khách bấm.
   *
   * Vẫn cho phép đánh dấu một dòng chưa có convertedAt: khách gọi điện thoại
   * trực tiếp không qua nút nào, hoặc dòng cũ có từ trước bản này.
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

    // "Bỏ đánh dấu" = gửi value rỗng VÀ convertedAt rỗng.
    //
    // Ý nghĩa của nó đổi hẳn kể từ khi cú bấm nút tự tính là chuyển đổi. Trước
    // đây bỏ đánh dấu là xoá cả dòng khỏi báo cáo — hợp lý, vì dòng đó do người
    // gõ tay tạo ra nên gõ nhầm thì xoá. Giờ thì convertedAt sinh ra từ MỘT SỰ
    // KIỆN THẬT: khách có bấm nút, không ai bịa được.
    //
    // Nên bỏ đánh dấu chỉ XOÁ SỐ TIỀN, giữ nguyên convertedAt của lần bấm. Nếu
    // xoá cả convertedAt thì:
    //   · dòng đó biến mất khỏi báo cáo dù cú bấm vẫn có thật, và
    //   · nếu đã xuất lên Google rồi thì bên đó vẫn còn chuyển đổi ấy — hai
    //     bên lệch nhau vĩnh viễn mà không cách nào đối chiếu ra.
    // Dòng nào KHÔNG có contactedAt (khách gọi trực tiếp, chủ tiệm tự đánh dấu)
    // thì mới xoá được cả convertedAt, vì đó đúng là dòng do người tạo.
    const bo = input.convertedAt === null && input.value === null;
    const doKhachBam = Boolean(r.contactedAt);

    await this.prisma.koiAdClick.update({
      where: { token },
      data: {
        convertedAt: bo
          ? doKhachBam
            ? r.convertedAt // giữ: khách bấm nút thật, không xoá được
            : null
          : input.convertedAt
            ? new Date(input.convertedAt)
            : (r.convertedAt ?? new Date()),
        value: bo
          ? null
          : input.value === undefined || input.value === null || input.value === ""
            ? r.value
            : BigInt(String(input.value).replace(/\D/g, "") || "0"),
        note: input.note === undefined ? r.note : (input.note?.slice(0, 500) || null),
        // Sửa lại thì có phải cho xuất lại không? KHÔNG cần, và cũng không nên.
        //
        // Từ khi có đường feed tự động (xem feedCsv), exportedAt gần như hết
        // việc: feed gửi cửa sổ trượt 30 ngày bất kể dòng đã gửi hay chưa, nên
        // số tiền vừa gõ vào đây sẽ tự đi theo chuyến kế tiếp — trong vài giờ.
        // Google đọc dòng cùng gclid + cùng giờ + cùng tên action là dòng CŨ và
        // cập nhật giá trị, không đẻ thêm chuyển đổi.
        //
        // Giữ nguyên exportedAt vì nó vẫn là bằng chứng "dòng này đã từng nằm
        // trong một tệp gửi đi". Xoá đi là mất mốc đối chiếu mà chẳng được gì.
        exportedAt: r.exportedAt,
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
   *  3. Chờ 4-6 tiếng sau khi TẠO ACTION rồi mới tải lên lần đầu. Mốc này là
   *     của action, khác với mốc chờ của từng cú bấm — xem CHO_XUAT_GIO.
   *
   * KHÔNG CÓ TIỀN THÌ BỎ TRẮNG CỘT, KHÔNG GHI SỐ 0. Hai cách này nhìn giống
   * nhau mà Google hiểu khác hẳn: bỏ trắng là "tôi không khai", Google lấy giá
   * trị mặc định đã đặt ở conversion action; ghi 0 là "đơn này trị giá không
   * đồng", và con số đó ĐÈ luôn giá trị mặc định.
   *
   * Hồi mọi dòng đều có tiền gõ tay thì ghi 0 không bao giờ xảy ra nên không
   * hại gì. Giờ gần như dòng nào cũng trắng tiền, mà ghi 0 thì:
   *
   *  · cột doanh thu trong Google Ads đứng ở 0 vĩnh viễn, chủ tiệm mở báo cáo
   *    ra thấy quảng cáo không sinh ra đồng nào;
   *  · giá trị mặc định đặt ở action thành vô nghĩa — mà đặt một con số trung
   *    bình cho mỗi lượt nhắn tin là việc NÊN làm;
   *  · vài dòng có tiền thật lẫn với một rừng số 0, giá trị trung bình sai
   *    hoàn toàn, và nếu sau này đổi sang đấu giá theo giá trị thì những số 0
   *    đó dạy Google đúng điều ngược lại.
   *
   * Cột Conversion Currency cũng bỏ trắng theo: khai tiền tệ mà không khai
   * tiền là vô nghĩa. Dòng nào chủ tiệm gõ tiền tay thì ghi đủ cả hai.
   *
   * MẶC ĐỊNH CHỈ LẤY DÒNG CHƯA XUẤT. Không phải vì sợ Google đếm hai lần — nó
   * khử trùng lặp, xem CUA_SO_FEED_NGAY — mà vì đây là đường TẢI TAY: chủ tiệm
   * bấm nút là để xem "có gì mới", và cần một tệp nhỏ nhìn được bằng mắt. Dựng
   * tệp 30 ngày mỗi lần bấm thì không đọc nổi, cũng không biết dòng nào vừa
   * thêm. Đóng dấu exportedAt cũng là cách duy nhất trả lời được câu "Google đã
   * biết những đơn nào rồi" trên trang admin.
   *
   * Đường TỰ ĐỘNG (feedCsv) làm ngược hẳn: cửa sổ trượt, không nhìn exportedAt.
   * Bên đó máy đọc nên tệp to không sao, và gửi lại được thì lần gửi hụt tự
   * lành.
   *
   * Đặt lai = true khi cần dựng lại tệp đầy đủ: Google báo lỗi, hoặc muốn đối
   * chiếu lại từ đầu.
   *
   * TRẢ VỀ { csv, dangCho }: csv rỗng thì dangCho cho biết còn bao nhiêu dòng
   * chưa đủ 24 giờ. Phân biệt "hết đơn thật" với "đơn còn non" — hai chuyện
   * khác nhau hoàn toàn với người đang ngồi chờ số liệu.
   */
  async xuatCsv(
    conversionName: string,
    lai = false,
  ): Promise<{ csv: string; dangCho: number }> {
    const rows = await this.prisma.koiAdClick.findMany({
      where: {
        convertedAt: { not: null },
        gclid: { not: null },
        // Quá 90 ngày thì Google lặng lẽ bỏ qua — lọc sẵn ở đây để file không
        // chứa dòng vô dụng và con số đối chiếu sau này khỏi lệch.
        clickedAt: {
          gte: new Date(Date.now() - HAN_GOOGLE_NGAY * 86_400_000),
          // Và phải ĐỦ GIÀ: cú bấm mới dưới 24 giờ thì Google chưa ghi nhận
          // được, xuất ra là mất dòng đó vĩnh viễn. Xem CHO_XUAT_GIO.
          lte: new Date(Date.now() - CHO_XUAT_GIO * 3_600_000),
        },
        ...(lai ? {} : { exportedAt: null }),
      },
      orderBy: { convertedAt: "asc" },
    });

    // Không có dòng nào xuất được. Trả rỗng để nơi gọi phân biệt với file có
    // dữ liệu (đưa file chỉ có hai dòng tiêu đề lên Google là báo lỗi vô nghĩa,
    // mà chủ tiệm lại tưởng đã tải xong).
    //
    // NHƯNG rỗng giờ có HAI nguyên nhân khác nhau, và chủ tiệm phải biết mình
    // đang gặp cái nào: (a) hết đơn mới thật, (b) có đơn nhưng cú bấm chưa đủ
    // 24 giờ. Trường hợp (b) mà báo "hết đơn mới" là chủ tiệm tưởng hệ thống
    // hỏng — hoặc tệ hơn, tưởng quảng cáo không ra khách nào. Nên đếm luôn số
    // dòng đang chờ để nơi gọi nói đúng chuyện.
    if (!rows.length) {
      const dangCho = await this.prisma.koiAdClick.count({
        where: {
          convertedAt: { not: null },
          gclid: { not: null },
          clickedAt: { gt: new Date(Date.now() - CHO_XUAT_GIO * 3_600_000) },
          ...(lai ? {} : { exportedAt: null }),
        },
      });
      return { csv: "", dangCho };
    }

    const dong = [
      `Parameters:TimeZone=${LECH_GIO}`,
      "Google Click ID,Conversion Name,Conversion Time,Conversion Value,Conversion Currency,Order ID",
    ];

    for (const r of rows) {
      dong.push(this.dongCsv(r, conversionName));
    }

    // Đánh dấu đã xuất SAU khi dựng xong file: dựng lỗi thì không được phép
    // đánh dấu, nếu không những dòng đó biến mất khỏi lần xuất sau.
    await this.prisma.koiAdClick.updateMany({
      where: { token: { in: rows.map((r) => r.token) } },
      data: { exportedAt: new Date() },
    });

    return { csv: dong.join("\r\n"), dangCho: 0 };
  }

  /**
   * Tệp cho Google Ads TỰ TẢI theo lịch — không ai phải bấm gì.
   *
   * VÌ SAO CÓ HÀM NÀY. Bản đầu bắt chủ tiệm mỗi ngày mở admin, bấm "Xuất CSV",
   * rồi vào Google Ads tải tệp lên. Đó là việc của máy: một hôm quên là hôm đó
   * Google mù, mà đúng những hôm bận nhất — hôm nhiều khách nhất — mới là hôm
   * dễ quên nhất. Google Ads có sẵn mục Uploads → Schedules, tự đi lấy tệp từ
   * một địa chỉ HTTPS mỗi ngày. Hàm này là địa chỉ đó.
   *
   * KHÁC xuatCsv ở ĐÚNG MỘT ĐIỂM, nhưng là điểm quan trọng nhất: nó gửi CỬA SỔ
   * TRƯỢT 30 ngày và KHÔNG đóng dấu exportedAt. Google khử trùng lặp theo tên
   * action + giờ + gclid nên gửi lại là vô hại, và tài liệu của Google còn
   * khuyên gửi chồng lấn. Đổi lại được ba thứ:
   *
   *  · dòng nào hôm nay bị từ chối vì cú bấm còn non thì mai tự vào lại;
   *  · lịch chạy hụt một hôm (Vercel sập, mật khẩu sai) không mất dòng nào;
   *  · số tiền chủ tiệm gõ vào admin sau khi dòng đã gửi vẫn tự đi theo chuyến
   *    kế tiếp, thay vì phải sửa tay bên Google Ads.
   *
   * KHÔNG bao giờ trả tệp rỗng-hoàn-toàn. Google Ads coi tệp không đọc được là
   * lịch hỏng, gắn cảnh báo trong tài khoản và gửi mail. Ngày nào chưa có khách
   * nhắn tin thì vẫn phải trả hai dòng tiêu đề — với Google đó là "tệp hợp lệ,
   * không có dòng mới", đúng sự thật. Đây là chỗ khác xuatCsv thứ hai: bên kia
   * trả rỗng để trang admin biết mà báo "hết đơn mới", ở đây rỗng là báo động.
   *
   * ghiDau = false LÀ MẶC ĐỊNH, VÀ ĐÓ LÀ CHỦ Ý. Địa chỉ này sẽ bị MỞ RA XEM,
   * không chỉ được Google gọi: chủ tiệm mở bằng trình duyệt để kiểm tệp có gì
   * (đó là lý do có header WWW-Authenticate), lập trình viên gọi curl khi sửa
   * lỗi, và máy local nối thẳng database production nên một lần thử là chạm vào
   * số liệu thật — chuyện đã xảy ra đúng một lần khi làm hàm này.
   *
   * Nếu mặc định là ghi thì mỗi lần xem thử lại đóng dấu "đã gửi Google" lên
   * những dòng Google chưa từng nhận. Con số trên admin thành số bịa, mà tệ hơn
   * là đường tải tay sẽ báo "hết đơn mới" trong khi Google vẫn chưa có gì.
   *
   * Nên chỉ URL nạp vào lịch Google Ads mang thêm ghi=1, và trang admin dựng
   * sẵn URL đó kèm nút chép để không ai phải gõ tay.
   */
  async feedCsv(conversionName: string, ghiDau = false): Promise<string> {
    const rows = await this.prisma.koiAdClick.findMany({
      where: {
        convertedAt: { not: null },
        gclid: { not: null },
        clickedAt: {
          // Cửa sổ trượt: 30 ngày gần nhất, và vẫn phải đủ già 24 giờ. Điều
          // kiện 24 giờ ở đây KHÔNG làm mất dòng nào như bên xuatCsv — dòng non
          // hôm nay chỉ là chưa tới lượt, mai chuyến sau nó nằm trong cửa sổ.
          gte: new Date(Date.now() - CUA_SO_FEED_NGAY * 86_400_000),
          lte: new Date(Date.now() - CHO_XUAT_GIO * 3_600_000),
        },
      },
      orderBy: { convertedAt: "asc" },
    });

    const dong = [
      `Parameters:TimeZone=${LECH_GIO}`,
      "Google Click ID,Conversion Name,Conversion Time,Conversion Value,Conversion Currency,Order ID",
    ];
    for (const r of rows) {
      dong.push(this.dongCsv(r, conversionName));
    }

    // Đóng dấu exportedAt cho dòng chưa có, nhưng KHÔNG dùng nó để lọc.
    //
    // Nghe ngược, mà cần: trang admin có ô "đã gửi Google" và chủ tiệm đọc con
    // số đó để tin hệ thống đang chạy. Feed tự động mà không đóng dấu thì ô đó
    // đứng ở 0 mãi trong khi Google vẫn nhận đủ — chủ tiệm sẽ tưởng hỏng rồi đi
    // bấm tải tay, đúng việc ta vừa bỏ.
    //
    // Chỉ ghi dòng chưa có dấu (exportedAt: null) để mốc giữ nguyên là LẦN GỬI
    // ĐẦU. Ghi đè mỗi chuyến thì mọi dòng luôn hiện "vừa gửi xong", không còn
    // đối chiếu được với báo cáo bên Google.
    if (ghiDau && rows.length) {
      await this.prisma.koiAdClick.updateMany({
        where: { token: { in: rows.map((r) => r.token) }, exportedAt: null },
        data: { exportedAt: new Date() },
      });
    }

    return dong.join("\r\n");
  }

  /**
   * Một dòng dữ liệu CSV. Dùng chung cho cả tải tay và feed tự động — hai đường
   * đó khác nhau ở chỗ CHỌN dòng nào, còn khuôn dòng thì bắt buộc phải giống
   * hệt: lệch một cột là Google từ chối cả tệp.
   */
  private dongCsv(
    r: { gclid: string | null; convertedAt: Date | null; value: bigint | null; token: string },
    conversionName: string,
  ): string {
    // Bỏ trắng CẢ HAI cột khi không có tiền — xem phần giải thích ở doc xuatCsv.
    // Không dấu chấm phân cách nghìn: Excel bản tiếng Việt hay tự chèn
    // "1.250.000" và Google đọc thành 1,25 — hụt một nghìn lần.
    const tien = r.value === null ? "" : r.value.toString();
    return [
      r.gclid ?? "",
      this.boc(conversionName),
      this.gioGoogle(r.convertedAt as Date),
      tien,
      tien === "" ? "" : "VND",
      r.token,
    ].join(",");
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

  // ─── Sổ tay từ khoá quảng cáo ────────────────────────────────────────────

  /**
   * Trả toàn bộ danh sách từ khoá, active trước rồi paused.
   *
   * Không phân trang: shop nhỏ, cỡ vài trăm từ khoá là nhiều nhất; lấy hết
   * một lượt đơn giản hơn là quản lý cursor ở phía admin.
   */
  async danhSachTuKhoa() {
    return this.prisma.koiAdKeyword.findMany({
      orderBy: [{ trangThai: "asc" }, { taoLuc: "desc" }],
    });
  }

  /**
   * Thêm một từ khoá mới vào sổ tay.
   *
   * Không cho trùng tuKhoa + loaiKhop + chienDich để tránh nhập đôi vô tình.
   * Nếu muốn cùng từ khoá ở hai chiến dịch khác nhau thì điền chienDich.
   */
  async themTuKhoa(input: {
    tuKhoa: string;
    chienDich?: string;
    loaiKhop?: string;
    trangThai?: string;
    ghiChu?: string;
  }) {
    const tuKhoa = input.tuKhoa.trim();
    if (!tuKhoa) throw new BadRequestException("Từ khoá không được để trống");

    const chienDich = input.chienDich?.trim() || null;
    const loaiKhop = input.loaiKhop?.trim() || null;

    const LOAI_HOP_LE = ["broad", "phrase", "exact", "negative"];
    if (loaiKhop && !LOAI_HOP_LE.includes(loaiKhop)) {
      throw new BadRequestException(`Loại khớp không hợp lệ: ${loaiKhop}`);
    }

    const TRANG_THAI_HOP_LE = ["active", "paused"];
    const trangThai = input.trangThai?.trim() || "active";
    if (!TRANG_THAI_HOP_LE.includes(trangThai)) {
      throw new BadRequestException(`Trạng thái không hợp lệ: ${trangThai}`);
    }

    // Chặn trùng lặp ở tầng service thay vì dùng unique constraint DB, vì
    // null != null trong SQL (mỗi NULL là một giá trị riêng) nên unique index
    // nhiều cột chứa NULL không hoạt động như mong đợi.
    //
    // Truyền thẳng null chứ không `?? undefined`: undefined làm Prisma bỏ hẳn
    // điều kiện khỏi câu WHERE, nên thêm "ví da" không chiến dịch sẽ khớp với
    // "ví da" của chiến dịch bất kỳ rồi báo trùng oan. null mới ra IS NULL.
    const trung = await this.prisma.koiAdKeyword.findFirst({
      where: { tuKhoa, chienDich, loaiKhop },
    });
    if (trung) throw new BadRequestException("Từ khoá này đã tồn tại trong sổ tay");

    return this.prisma.koiAdKeyword.create({
      data: {
        tuKhoa,
        chienDich,
        loaiKhop,
        trangThai,
        ghiChu: input.ghiChu?.trim().slice(0, 500) || null,
      },
    });
  }

  /**
   * Cập nhật từ khoá theo id.
   *
   * Chỉ cập nhật trường nào được gửi lên; các trường bỏ qua giữ nguyên.
   */
  async suaTuKhoa(
    id: string,
    input: {
      tuKhoa?: string;
      chienDich?: string | null;
      loaiKhop?: string | null;
      trangThai?: string;
      ghiChu?: string | null;
    },
  ) {
    const ton = await this.prisma.koiAdKeyword.findUnique({ where: { id } });
    if (!ton) throw new NotFoundException("Không tìm thấy từ khoá");

    const data: Record<string, unknown> = {};

    if (input.tuKhoa !== undefined) {
      const tuKhoa = input.tuKhoa.trim();
      if (!tuKhoa) throw new BadRequestException("Từ khoá không được để trống");
      data.tuKhoa = tuKhoa;
    }

    if (input.chienDich !== undefined) {
      data.chienDich = input.chienDich?.trim() || null;
    }

    if (input.loaiKhop !== undefined) {
      const LOAI_HOP_LE = ["broad", "phrase", "exact", "negative"];
      if (input.loaiKhop && !LOAI_HOP_LE.includes(input.loaiKhop)) {
        throw new BadRequestException(`Loại khớp không hợp lệ: ${input.loaiKhop}`);
      }
      data.loaiKhop = input.loaiKhop || null;
    }

    if (input.trangThai !== undefined) {
      const TRANG_THAI_HOP_LE = ["active", "paused"];
      if (!TRANG_THAI_HOP_LE.includes(input.trangThai)) {
        throw new BadRequestException(`Trạng thái không hợp lệ: ${input.trangThai}`);
      }
      data.trangThai = input.trangThai;
    }

    if (input.ghiChu !== undefined) {
      data.ghiChu = input.ghiChu?.trim().slice(0, 500) || null;
    }

    return this.prisma.koiAdKeyword.update({ where: { id }, data });
  }

  /**
   * Xoá vĩnh viễn một từ khoá khỏi sổ tay.
   *
   * Đây là sổ tay nội bộ nên xoá thật sự là ổn — không ảnh hưởng lịch sử
   * cú bấm hay báo cáo doanh thu vốn nằm ở bảng koi_ad_clicks.
   */
  async xoaTuKhoa(id: string): Promise<{ ok: boolean }> {
    const ton = await this.prisma.koiAdKeyword.findUnique({ where: { id } });
    if (!ton) throw new NotFoundException("Không tìm thấy từ khoá");
    await this.prisma.koiAdKeyword.delete({ where: { id } });
    return { ok: true };
  }
}
