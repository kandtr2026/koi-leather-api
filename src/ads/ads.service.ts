import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { randomInt, randomUUID } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import { dauNgayVN, ngayVNCuaDate, ngayVNString } from "../common/ngay-vn";
import { GoogleAdsClient } from "./google-ads.client";

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

/**
 * Google giới hạn ~20 từ khoá gốc cho mỗi lần generateKeywordIdeas.
 *
 * Quá số này Google từ chối CẢ request (không cắt hộ), nên phải tự cắt trước
 * khi gọi. Cắt an toàn còn hơn để cả lượt hỏng vì một seed thừa.
 */
const GIOI_HAN_SEED = 20;

/**
 * Ngưỡng "nhiều bấm" để gợi ý một cụm tìm kiếm nên thêm thành từ khoá.
 *
 * Shop nhỏ, lưu lượng thấp: 5 cú bấm trong 30 ngày mà chưa xử lý là đủ tín hiệu
 * để chủ shop ngó tới. Đây chỉ là GỢI Ý, người quyết vẫn là chủ shop — nên đặt
 * thấp để không bỏ sót còn hơn đặt cao rồi im lặng.
 */
const NGUONG_NHIEU_BAM = 5;

/**
 * Chỉ gclid khớp khuôn này mới được nhét vào câu GAQL click_view.
 *
 * gclid đi vào DB từ ?gclid= trên URL (input công khai, bị slice 512 ký tự).
 * Gclid THẬT của Google là base64url — chỉ chữ số, chữ cái và . _ - ~. Lọc
 * trắng trước khi nội suy: một gclid rác chứa nháy đơn / xuống dòng / dấu ngoặc
 * có thể phá vỡ chuỗi literal và làm hỏng cả lô 20 gclid.
 */
const GCLID_HOP_LE = /^[A-Za-z0-9._~-]+$/;

@Injectable()
export class AdsService {
  constructor(
    private prisma: PrismaService,
    private ads: GoogleAdsClient,
  ) {}

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
   *
   * MỖI CON SỐ CẮT THEO ĐÚNG CỘT THỜI GIAN CỦA VIỆC NÓ ĐẾM. Đây là chỗ từng sai
   * và sai rất kín: cả năm con số đều đếm trên `rows` — tập đã cắt theo
   * `clickedAt` — nên chúng trả lời "trong số quảng cáo BẤM trong kỳ này, bao
   * nhiêu về sau chốt được". Đó là câu hỏi về chất lượng quảng cáo, không phải
   * câu hỏi "hôm nay chốt được mấy đơn", mà nhãn trên panel thì chủ shop đọc
   * thành câu thứ hai.
   *
   * Chênh lệch đó không nhỏ, vì chuyển đổi LUÔN xảy ra sau cú bấm, thường vài
   * ngày: khách bấm quảng cáo hôm 06/08 rồi 09/08 mới nhắn Zalo. Đo trên dữ liệu
   * thật: mã SW6RNQ bấm 06/08 11:45, chốt 09/08 21:17. Chọn "Ngày hôm nay" của
   * ngày 09/08 là dòng đó bị `where` loại ngay từ đầu — panel ghi "Đã chốt 0"
   * đúng vào ngày có đơn chốt thật. Kỳ càng ngắn thì càng chắc chắn ra 0, tức
   * thẻ vô dụng đúng lúc cần nhất.
   *
   * Nên: `tongCong` theo `clickedAt`, `daLienHe` theo `contactedAt`, còn
   * `daChot`/`doanhThu`/`daXuat` theo `convertedAt`. Bảng bên dưới vẫn là "click
   * gần nhất" nên vẫn theo `clickedAt` — nó trả lời câu khác, và đó là lý do
   * bảng có thể không chứa dòng nào ứng với thẻ "Đã chốt".
   *
   * Đếm bằng count() của cơ sở dữ liệu chứ không phải filter() trên `rows`:
   * `rows` bị chặn `take: 500`, nên khi lưu lượng lớn hơn thì mọi con số lặng lẽ
   * dừng ở 500 mà không có gì báo.
   *
   * `chiTiet` = true (heoiu truyền chiTiet=1) bật phần GỌI RA GOOGLE ADS API:
   *   · `chiPhi` — tổng tiền Google tự ghi nhận cho kênh trong kỳ, để thẻ "Chi
   *     phí" cấp kênh không còn là lỗ hổng so với Meta Ads.
   *   · Nối gclid → từ khoá TRÚNG (click_view.keyword_info.text) cho 20 dòng
   *     đầu — mối nối lead ↔ từ khoá mà báo cáo tổng không có. Chữ khách GÕ
   *     theo từng cú bấm thì Google không trả (xem nguonGocCuaClick).
   * Chỉ khi chiTiet mới làm việc này vì nó chậm (cold start + token + GAQL);
   * bảng Liên hệ gọi danhSach() thường để lấy con số nhanh, không trả giá đó.
   * Cả hai phần đều tự hạ về null khi chưa cấu hình Ads API hoặc Google từ
   * chối — không được phép làm hỏng toàn bộ phản hồi vì một phần làm giàu.
   */
  async danhSach(days = 90, chiTiet = false): Promise<unknown> {
    // Math.trunc trước khi kẹp: `?days=7.9` mà không cắt phần thập phân thì
    // xuống tới dauNgayVN(6.9), và hàm đó trừ `luiNgay * 86_400_000` nên mốc rơi
    // vào 02:24 sáng chứ không phải 00:00. Cả tệp này cắt theo NGÀY LỊCH, một
    // mốc lệch 2,4 tiếng là phá đúng cái bảo đảm đó — mà nhìn số trên panel thì
    // không cách nào thấy. Số âm kẹp lên 1 (kỳ hẹp nhất), không bao giờ ra mốc
    // ở tương lai.
    const soNgay = Math.min(Math.max(Math.trunc(Number(days)) || 90, 1), 365);
    const tu = dauNgayVN(soNgay - 1);

    // Dòng không có mã Google thì vĩnh viễn không tải lên được — loại khỏi MỌI
    // con số, không riêng bảng, nếu không thẻ và bảng đếm hai tập khác nhau.
    const locMaGoogle = {
      OR: [
        { gclid: { not: null } },
        { gbraid: { not: null } },
        { wbraid: { not: null } },
      ],
    };

    const [rows, tongCong, daLienHe, daChot, daXuat, soDonCoTien, tongTien] =
      await Promise.all([
        this.prisma.koiAdClick.findMany({
          where: { clickedAt: { gte: tu }, ...locMaGoogle },
          orderBy: { clickedAt: "desc" },
          take: 500,
        }),
        this.prisma.koiAdClick.count({
          where: { clickedAt: { gte: tu }, ...locMaGoogle },
        }),
        this.prisma.koiAdClick.count({
          where: { contactedAt: { gte: tu }, ...locMaGoogle },
        }),
        this.prisma.koiAdClick.count({
          where: { convertedAt: { gte: tu }, ...locMaGoogle },
        }),
        // daXuat tách riêng vì đây là con số DUY NHẤT cho biết Google đã học được
        // gì. Chuyển đổi nằm trong bảng mà chưa xuất thì với Google là chưa tồn
        // tại — mà đó đúng là chỗ dễ tưởng đã xong nhất.
        //
        // Cắt theo `convertedAt` chứ không theo `exportedAt`: thẻ này đọc là
        // "trong số đơn chốt của kỳ, bao nhiêu đã gửi", nên mẫu số phải là cùng
        // một tập với `daChot`. Cắt theo `exportedAt` là đếm cả đơn chốt từ
        // tháng trước vừa được chuyến feed hôm nay gửi kèm.
        this.prisma.koiAdClick.count({
          where: {
            convertedAt: { gte: tu },
            exportedAt: { not: null },
            ...locMaGoogle,
          },
        }),
        // Chỉ đếm dòng CÓ tiền, không đếm dòng tiền null: từ khi cú bấm tự tính
        // là chuyển đổi, phần lớn dòng có convertedAt mà không có value. Lấy
        // daChot làm mẫu số cho doanh thu là ra giá trị đơn trung bình gần bằng
        // không, và đó là con số bịa.
        this.prisma.koiAdClick.count({
          where: {
            convertedAt: { gte: tu },
            value: { not: null },
            ...locMaGoogle,
          },
        }),
        // Cộng tiền bằng aggregate, không cộng tay trên `rows`: cùng lý do
        // `take: 500` ở trên, và ở đây hậu quả nặng hơn — doanh thu thiếu hụt
        // trông vẫn như một con số hợp lệ.
        this.prisma.koiAdClick.aggregate({
          _sum: { value: true },
          where: { convertedAt: { gte: tu }, ...locMaGoogle },
        }),
      ]);

    // ----- Phần làm giàu gọi ra Google Ads API (chỉ khi chiTiet) -----
    //
    // Hai việc chạy SONG SONG bằng allSettled: một cái hỏng (Google từ chối,
    // token chết) chỉ mất phần đó — chi phí về null, cột từ khoá về "—" —
    // còn toàn bộ bảng vẫn trả về bình thường.
    let chiPhi: number | null = null;
    let nguonGoc: Map<string, string | null> = new Map();
    if (chiTiet && this.ads && this.ads.daCauHinh()) {
      // Chỉ nối cho 20 dòng đầu: đúng số dòng panel heoiu đang hiển thị. Nối cả
      // 500 dòng là vài chục câu GAQL — chậm không cần thiết mà đa số dòng chẳng
      // ai xem.
      const [cp, nn] = await Promise.allSettled([
        this.chiPhiKenh(soNgay),
        rows.length
          ? this.nguonGocCuaClick(rows.slice(0, 20))
          : Promise.resolve(new Map<string, string | null>()),
      ]);
      if (cp.status === "fulfilled") chiPhi = cp.value;
      if (nn.status === "fulfilled") nguonGoc = nn.value;
    }

    return {
      days: soNgay,
      from: tu.toISOString(),
      tongCong,
      daLienHe,
      daChot,
      daXuat,
      soDonCoTien,
      doanhThu: (tongTien._sum.value ?? 0n).toString(),
      // Chi phí kênh theo kỳ, đọc từ Google Ads (metrics.cost_micros). null =
      // chưa nối Ads API, hoặc Google từ chối — Front hiện "—" chứ không bịa
      // số 0, vì 0 nghĩa là "không tiêu đồng nào", khác hẳn "không đọc được".
      chiPhi,
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
        // Mối nối lead ↔ từ khoá: từ khoá trúng cú bấm, do Google trả ngược
        // theo gclid. null = không tra được (quá 90 ngày, Google giấu, gclid
        // không hợp lệ, hoặc chưa bật chiTiet).
        tuKhoa: nguonGoc.get(r.gclid || "") ?? null,
      })),
    };
  }

  /**
   * Tổng chi phí kênh Google Ads trong kỳ, đọc từ Google Ads API.
   *
   * KHÔNG đếm từ koi_ad_clicks: bảng đó chỉ có cú bấm có mã Google, còn đây là
   * tiền Google TỰ ghi nhận cho toàn kênh trong khoảng ngày — đúng con số chủ
   * shop trả. Hai nguồn khác nhau nên số có thể lệch với tổng click trong bảng;
   * đã nói rõ trên panel.
   *
   * metrics.cost_micros là micro của đồng tiền tài khoản — chia 1.000.000 mới
   * ra đồng. Dùng BETWEEN hai ngày lịch VN vì DURING chỉ có hằng số cố định
   * (LAST_7/14/30/90_DAYS), không cắt được kỳ tuỳ ý như 1 hay 365 ngày.
   *
   * Ném lỗi nếu Google từ chối — chỗ gọi tự hạ về null để panel vẫn chạy.
   */
  private async chiPhiKenh(soNgay: number): Promise<number> {
    const rows = await this.ads.truyVan(`
      SELECT metrics.cost_micros
      FROM campaign
      WHERE segments.date BETWEEN '${ngayVNString(soNgay - 1)}' AND '${ngayVNString(0)}'
    `);
    let tong = 0;
    for (const r of rows) tong += Number(r.metrics?.costMicros ?? 0);
    return Math.round(tong / 1_000_000);
  }

  /**
   * Tra ngược từ gclid sang từ khoá trúng qua click_view.
   *
   * Đây là mối nối lead ↔ từ khoá mà các báo cáo tổng không có: search_term_view
   * chỉ cho biết CỤM NÀO ra bao nhiêu đơn, không nói ĐƠN CỤ THỂ này tới từ đâu.
   * click_view trả từ khoá trúng (keyword_info.text) cho TỪNG gclid — nối thẳng
   * vào dòng koi_ad_clicks mang đúng gclid đó.
   *
   * Chữ khách THỰC SỰ GÕ thì Google không trả theo từng cú bấm — click_view
   * KHÔNG có field search_term (v23). Muốn xem chữ khách gõ phải đọc báo cáo
   * tổng search_term_view, chính là panel "Khách gõ gì" của heoiu.
   *
   * Ba ràng buộc của click_view phải tôn trọng:
   *   · Mỗi câu truy vấn phải giới hạn đúng MỘT ngày (`segments.date = '...'`)
   *     — Google từ chối hẳn câu có khoảng ngày. Nên nhóm gclid theo ngày lịch
   *     VN của clickedAt rồi hỏi từng ngày.
   *   · Chỉ tra được 90 ngày gần nhất — cú bấm cũ hơn hiện "—".
   *   · gclid phải qua whitelist GCLID_HOP_LE trước khi nhét vào câu IN — nó vốn
   *     là input công khai từ URL, một chuỗi rác có thể phá hỏng cả lô.
   *
   * Múi giờ tài khoản Ads có thể lệch VN: cú bấm sáng sớm VN rơi vào HÔM QUA
   * theo đồng hồ Google. Những gclid chưa tra được thì hỏi lại MỘT lần ở ngày
   * liền trước rồi bỏ qua — không vòng thêm để số câu không bùng nổ.
   *
   * Một ngày bị Google từ chối thì bỏ qua NGÀY ĐÓ, không làm mất kết quả các
   * ngày khác — cùng nguyên tắc "một phần hỏng không hỏng toàn bộ" ở danhSach.
   */
  private async nguonGocCuaClick(
    rows: Array<{ gclid: string | null; clickedAt: Date }>,
  ): Promise<Map<string, string | null>> {
    const theoNgay = new Map<string, string[]>();
    for (const r of rows) {
      const g = r.gclid;
      if (!g || !GCLID_HOP_LE.test(g)) continue;
      const ngay = ngayVNCuaDate(r.clickedAt);
      const ds = theoNgay.get(ngay);
      if (ds) ds.push(g);
      else theoNgay.set(ngay, [g]);
    }

    // 20 dòng đầu trong kỳ bận thường chỉ trải 1-3 ngày; cắt ở 8 ngày gần nhất
    // để khỏi bắn hàng chục câu GAQL song song (serverless có trần thời gian).
    const cacNgay = [...theoNgay.keys()].sort().slice(-8);
    const map = new Map<string, string | null>();
    const CO_LO = 20;

    const cau = (gclids: string[], ngay: string) => `
      SELECT click_view.gclid, click_view.keyword_info.text
      FROM click_view
      WHERE click_view.gclid IN (${gclids.map((g) => `'${g}'`).join(", ")})
        AND segments.date = '${ngay}'
    `;
    // Ghi kết quả vào map, trả về những gclid của lô chưa tra được.
    const ghi = (rowsCv: any[], lo: string[]): string[] => {
      const daThay = new Set<string>();
      for (const r of rowsCv) {
        const cv = r.clickView ?? {};
        if (!cv.gclid) continue;
        const g = String(cv.gclid);
        daThay.add(g);
        map.set(g, cv.keywordInfo?.text ? String(cv.keywordInfo.text) : null);
      }
      return lo.filter((g) => !daThay.has(g));
    };
    const ngayTruoc = (ngay: string): string => {
      const d = new Date(ngay + "T00:00:00Z");
      d.setUTCDate(d.getUTCDate() - 1);
      return d.toISOString().slice(0, 10);
    };

    await Promise.all(
      cacNgay.map(async (ngay) => {
        try {
          const ds = theoNgay.get(ngay) || [];
          for (let i = 0; i < ds.length; i += CO_LO) {
            const lo = ds.slice(i, i + CO_LO);
            const conThieu = ghi(await this.ads.truyVan(cau(lo, ngay)), lo);
            if (conThieu.length) {
              const truoc = ngayTruoc(ngay);
              ghi(await this.ads.truyVan(cau(conThieu, truoc)), conThieu);
            }
          }
        } catch {
          // Ngày này bị Google từ chối — bỏ qua nó, giữ kết quả các ngày khác.
        }
      }),
    );
    return map;
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

  /**
   * Import hiện trạng: hút TOÀN BỘ từ khoá/negative đang chạy trên Google Ads về
   * sổ tay, làm điểm mốc cho việc coi heoiu là gốc đồng bộ (Phase 0).
   *
   * VÌ SAO CHỈ ĐỌC + GHI DB CỦA MÌNH, KHÔNG MUTATE ADS: đây là bước nền, rủi ro
   * thấp, không đụng tiền. Nó KÉO cấu trúc hiện có về để từ đó về sau tool có
   * bản đối chiếu; đường ĐẨY xuống Ads là các phase sau.
   *
   * IDEMPOTENT theo `adsResourceName` (đã có @@unique): chạy lại nhiều lần không
   * đẻ dòng trùng — mỗi criterion bên Ads ứng đúng một dòng, lần sau chỉ cập
   * nhật lại cấu trúc/trạng thái. KHÔNG đụng `ghiChu` (ghi chú tay của chủ shop)
   * ở nhánh update, chỉ ghi các cột cấu trúc + đồng bộ.
   *
   * KHÔNG động tới dòng nguon='tool' (adsResourceName NULL): khoá upsert là
   * resource name nên chúng nằm ngoài phạm vi hàm này. Việc bind một dòng sổ tay
   * cũ với một criterion thật là chuyện của reconcile (Phase 4), không phải import.
   */
  async importTuKhoaTuAds(): Promise<{
    daNoi: boolean;
    thieuBien: string[];
    tong: number;
    themMoi: number;
    capNhat: number;
    keyword: number;
    negative: number;
  }> {
    if (!this.ads.daCauHinh()) {
      return {
        daNoi: false,
        thieuBien: this.ads.bienConThieu(),
        tong: 0,
        themMoi: 0,
        capNhat: 0,
        keyword: 0,
        negative: 0,
      };
    }

    const cid = this.ads.maTaiKhoan();

    // Hai lượt đọc độc lập, chạy SONG SONG (đều gọi ra Internet nên xếp hàng chỉ
    // tổ cộng dồn độ trễ):
    //
    //  1. keyword_view — mọi ad_group_criterion kiểu KEYWORD, gồm CẢ negative
    //     mức ad group (negative=true). KHÔNG có segments.date để lấy cả từ chưa
    //     phát sinh lượt. Lọc REMOVED để bỏ criterion đã xoá.
    //  2. campaign_criterion — negative mức campaign (type KEYWORD, negative).
    //     keyword_view KHÔNG chứa negative mức campaign nên phải query riêng.
    const [rowsAdGroup, rowsCampaign] = await Promise.all([
      this.ads.truyVan(`
        SELECT
          ad_group_criterion.criterion_id,
          ad_group_criterion.resource_name,
          ad_group_criterion.keyword.text,
          ad_group_criterion.keyword.match_type,
          ad_group_criterion.negative,
          ad_group_criterion.status,
          campaign.id,
          campaign.name,
          ad_group.id,
          ad_group.name
        FROM keyword_view
        WHERE ad_group_criterion.status != 'REMOVED'
      `),
      this.ads.truyVan(`
        SELECT
          campaign_criterion.criterion_id,
          campaign_criterion.resource_name,
          campaign_criterion.keyword.text,
          campaign_criterion.keyword.match_type,
          campaign_criterion.negative,
          campaign_criterion.status,
          campaign.id,
          campaign.name
        FROM campaign_criterion
        WHERE campaign_criterion.type = 'KEYWORD'
          AND campaign_criterion.negative = TRUE
          AND campaign_criterion.status != 'REMOVED'
      `),
    ]);

    // Chuẩn hoá cả hai nguồn về một khuôn chung trước khi upsert.
    type DongNhap = {
      adsResourceName: string;
      tuKhoa: string;
      loai: string;
      loaiKhop: string | null;
      trangThai: string;
      chienDich: string | null;
      campaignId: string | null;
      adGroupId: string | null;
      phamViNegative: string | null;
    };

    const dsNhap: DongNhap[] = [];

    for (const r of rowsAdGroup) {
      const agc = r.adGroupCriterion ?? {};
      const kw = agc.keyword ?? {};
      const text = String(kw.text ?? "").trim();
      if (!text) continue; // keyword_view chỉ có KEYWORD nên hiếm, nhưng phòng xa.

      const adGroupId = r.adGroup?.id != null ? String(r.adGroup.id) : null;
      const criterionId =
        agc.criterionId != null ? String(agc.criterionId) : null;
      const rn =
        agc.resourceName ||
        (adGroupId && criterionId
          ? `customers/${cid}/adGroupCriteria/${adGroupId}~${criterionId}`
          : null);
      if (!rn) continue; // Không dựng nổi khoá thì bỏ, tránh upsert mù.

      const negative = Boolean(agc.negative);
      dsNhap.push({
        adsResourceName: rn,
        tuKhoa: text,
        loai: negative ? "negative" : "keyword",
        loaiKhop: this.matchTypeThuong(kw.matchType),
        trangThai: this.trangThaiTuAds(agc.status),
        chienDich: r.campaign?.name ?? null,
        campaignId: r.campaign?.id != null ? String(r.campaign.id) : null,
        adGroupId,
        phamViNegative: negative ? "adgroup" : null,
      });
    }

    for (const r of rowsCampaign) {
      const cc = r.campaignCriterion ?? {};
      const kw = cc.keyword ?? {};
      const text = String(kw.text ?? "").trim();
      if (!text) continue;

      const campaignId = r.campaign?.id != null ? String(r.campaign.id) : null;
      const criterionId =
        cc.criterionId != null ? String(cc.criterionId) : null;
      const rn =
        cc.resourceName ||
        (campaignId && criterionId
          ? `customers/${cid}/campaignCriteria/${campaignId}~${criterionId}`
          : null);
      if (!rn) continue;

      dsNhap.push({
        adsResourceName: rn,
        tuKhoa: text,
        loai: "negative", // query đã lọc negative=TRUE.
        loaiKhop: this.matchTypeThuong(kw.matchType),
        trangThai: this.trangThaiTuAds(cc.status),
        chienDich: r.campaign?.name ?? null,
        campaignId,
        adGroupId: null, // negative mức campaign không thuộc ad group nào.
        phamViNegative: "campaign",
      });
    }

    // Đếm thêm-mới vs cập-nhật cho báo cáo (và để tiêu chí "chạy 2 lần số dòng
    // không đổi" kiểm được): nạp trước tập resource name đã có. Chia LÔ để không
    // bắn một câu IN với hàng chục nghìn tham số — chạm trần tham số Postgres và
    // chậm. Tài khoản thật có thể có ~3970 keyword + ~17675 negative.
    const daCo = new Set<string>();
    const CO_LO_DOC = 1000;
    for (let i = 0; i < dsNhap.length; i += CO_LO_DOC) {
      const lo = dsNhap.slice(i, i + CO_LO_DOC);
      const ton = await this.prisma.koiAdKeyword.findMany({
        where: { adsResourceName: { in: lo.map((d) => d.adsResourceName) } },
        select: { adsResourceName: true },
      });
      for (const t of ton) if (t.adsResourceName) daCo.add(t.adsResourceName);
    }

    const now = new Date();

    // BULK UPSERT theo LÔ thay vì gọi upsert() tuần tự cho từng dòng. Với ~21k
    // dòng, 21k round-trip tuần tự vượt trần 30s của serverless -> function bị
    // Vercel giết giữa chừng ("Task timed out after 30 seconds"). Một câu
    // INSERT ... ON CONFLICT cho mỗi lô ~500 dòng gom lại còn vài chục câu, xong
    // trong vài giây.
    //
    // id: cột TEXT NOT NULL KHÔNG có DB-default (uuid vốn do Prisma client sinh,
    // raw SQL thì không có) -> tự sinh randomUUID() cho mỗi dòng; khi ON CONFLICT
    // thì id mới bị bỏ, không đổi id cũ. taoLuc có DEFAULT CURRENT_TIMESTAMP nên
    // bỏ qua ở INSERT; capNhatLuc phải set now() ở nhánh UPDATE vì @updatedAt là
    // client-side, raw SQL không tự đụng. KHÔNG đụng ghiChu ở UPDATE -> giữ ghi
    // chú tay của chủ shop (INSERT không nêu cột ghiChu nên dòng mới nhận NULL).
    const CO_LO_GHI = 500;
    for (let i = 0; i < dsNhap.length; i += CO_LO_GHI) {
      const lo = dsNhap.slice(i, i + CO_LO_GHI);
      const hang = lo.map(
        (d) => Prisma.sql`(${randomUUID()}, ${d.adsResourceName}, ${d.tuKhoa}, ${d.loai}, ${d.loaiKhop}, ${d.trangThai}, ${d.chienDich}, ${d.campaignId}, ${d.adGroupId}, ${d.phamViNegative}, 'da_day', ${null}, ${now}, 'imported')`,
      );
      await this.prisma.$executeRaw(Prisma.sql`
        INSERT INTO "koi_free_style"."koi_ad_keywords"
          ("id", "adsResourceName", "tuKhoa", "loai", "loaiKhop", "trangThai",
           "chienDich", "campaignId", "adGroupId", "phamViNegative",
           "trangThaiDongBo", "loiDongBo", "dongBoLuc", "nguon")
        VALUES ${Prisma.join(hang)}
        ON CONFLICT ("adsResourceName") DO UPDATE SET
          "tuKhoa"          = EXCLUDED."tuKhoa",
          "loai"            = EXCLUDED."loai",
          "loaiKhop"        = EXCLUDED."loaiKhop",
          "trangThai"       = EXCLUDED."trangThai",
          "chienDich"       = EXCLUDED."chienDich",
          "campaignId"      = EXCLUDED."campaignId",
          "adGroupId"       = EXCLUDED."adGroupId",
          "phamViNegative"  = EXCLUDED."phamViNegative",
          "trangThaiDongBo" = EXCLUDED."trangThaiDongBo",
          "loiDongBo"       = EXCLUDED."loiDongBo",
          "dongBoLuc"       = EXCLUDED."dongBoLuc",
          "nguon"           = EXCLUDED."nguon",
          "capNhatLuc"      = ${now}
      `);
    }

    let themMoi = 0;
    let capNhat = 0;
    for (const d of dsNhap) {
      if (daCo.has(d.adsResourceName)) capNhat += 1;
      else themMoi += 1;
    }

    return {
      daNoi: true,
      thieuBien: [],
      tong: dsNhap.length,
      themMoi,
      capNhat,
      keyword: dsNhap.filter((d) => d.loai === "keyword").length,
      negative: dsNhap.filter((d) => d.loai === "negative").length,
    };
  }

  /**
   * Chuẩn hoá match type của Ads về chữ thường sổ tay dùng: broad|phrase|exact.
   * Trả null cho UNSPECIFIED/UNKNOWN/rỗng để không nhét giá trị rác vào loaiKhop.
   */
  private matchTypeThuong(raw: unknown): string | null {
    const s = String(raw ?? "").toLowerCase();
    return s === "broad" || s === "phrase" || s === "exact" ? s : null;
  }

  /** ENABLED -> active; còn lại (PAUSED...) -> paused. REMOVED đã lọc từ GAQL. */
  private trangThaiTuAds(raw: unknown): string {
    return String(raw ?? "").toUpperCase() === "ENABLED" ? "active" : "paused";
  }

  // ─── Chuẩn hoá số liệu Google Ads ────────────────────────────────────────
  //
  // Năm hàm dưới đây giải cùng một bài: số liệu Ads API cho từ khoá ít dữ liệu
  // rất hay vắng mặt (null/undefined), và nhiều trường là đơn vị micro hoặc
  // phân số 0–1. Ép về đúng kiểu Front cần — và QUAN TRỌNG NHẤT là không bao
  // giờ để lọt NaN ra JSON: NaN vừa không serialize gọn, vừa làm Front không
  // phân biệt được "chưa có dữ liệu" với "tính lỗi". Vắng dữ liệu trả null
  // (Front hiện "—"), tuyệt đối không quy về 0.

  /** Số thật hoặc null. Chuỗi rỗng, undefined, hay parse ra NaN đều thành null. */
  private so(v: unknown): number | null {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }

  /** Micro → đơn vị gốc (chia 1.000.000). Vắng dữ liệu trả null, không phải 0. */
  private micro(v: unknown): number | null {
    const n = this.so(v);
    return n === null ? null : n / 1_000_000;
  }

  /** Phân số 0–1 → phần trăm (nhân 100). Vắng dữ liệu trả null. */
  private phanTram(v: unknown): number | null {
    const n = this.so(v);
    return n === null ? null : n * 100;
  }

  /**
   * Bucket chất lượng của Google (ENUM) → nhãn tiếng Việt gọn.
   *
   * creative_quality_score / post_click_quality_score / search_predicted_ctr
   * KHÔNG trả số mà trả một trong: UNSPECIFIED / UNKNOWN / BELOW_AVERAGE /
   * AVERAGE / ABOVE_AVERAGE. UNSPECIFIED và UNKNOWN nghĩa là "chưa đủ dữ liệu"
   * → trả null để Front hiện "—", không bịa ra một mức nào.
   */
  private nhanChatLuong(v: unknown): string | null {
    switch (v) {
      case "BELOW_AVERAGE":
        return "dưới TB";
      case "AVERAGE":
        return "Trung bình";
      case "ABOVE_AVERAGE":
        return "trên TB";
      default:
        return null;
    }
  }

  /** Mức cạnh tranh của Keyword Planner (ENUM) → nhãn tiếng Việt. */
  private nhanCanhTranh(v: unknown): string | null {
    switch (v) {
      case "LOW":
        return "thấp";
      case "MEDIUM":
        return "trung bình";
      case "HIGH":
        return "cao";
      default:
        return null;
    }
  }

  /**
   * Kéo từ khoá THẬT đang chạy trên Google Ads về, kèm số liệu 30 ngày.
   *
   * Khác `danhSachTuKhoa()`: hàm kia đọc sổ tay trong DB của mình, hàm này đọc
   * tài khoản Ads thật. Cái nào cũng cần: sổ tay giữ ghi chú của chủ shop (từ
   * này đắt, từ kia ra đơn) — thứ Google không có chỗ nào để lưu.
   *
   * TRẢ VỀ CẢ TRẠNG THÁI CẤU HÌNH CHỨ KHÔNG NÉM LỖI khi thiếu env: màn hình
   * admin cần phân biệt "chưa nối Google Ads" với "nối rồi mà tài khoản không
   * có từ khoá nào". Hai cái đó nhìn giống nhau nếu chỉ trả về mảng rỗng, mà
   * cách xử lý thì khác hẳn.
   */
  async tuKhoaThat(): Promise<{
    daNoi: boolean;
    thieuBien: string[];
    // Mã tài khoản Ads (ocid) để Heoiu dựng link sâu mở chiến dịch trên giao
    // diện Google Ads: ads.google.com/aw/campaigns?ocid=...&campaignId=...
    ocid: string | null;
    dsTuKhoa: Array<{
      tuKhoa: string;
      loaiKhop: string;
      trangThai: string;
      chienDich: string;
      chienDichId: string | null;
      nhomQuangCao: string;
      hienThi: number;
      cuBam: number;
      chiPhi: number;
      ctr: number | null;
      cpcTrungBinh: number | null;
      cuChuyenDoi: number | null;
      cuChuyenDoiTatCa: number | null;
      giaTriChuyenDoi: number | null;
      giaMoiChuyenDoi: number | null;
      tyLeChuyenDoi: number | null;
      tyLeHienThi: number | null;
      matViHang: number | null;
      topTuyetDoi: number | null;
      diemChatLuong: number | null;
      chatLuongQuangCao: string | null;
      chatLuongTrangDich: string | null;
      ctrKyVong: string | null;
      ghiChuCuaToi: string | null;
    }>;
  }> {
    if (!this.ads.daCauHinh()) {
      return { daNoi: false, thieuBien: this.ads.bienConThieu(), ocid: null, dsTuKhoa: [] };
    }

    // LAST_30_DAYS thay vì ALL_TIME: từ khoá tắt từ năm ngoái kéo về chỉ làm
    // rối bảng. Ai cần lịch sử xa hơn thì xem trong giao diện Google Ads.
    //
    // metrics.cost_micros là micro đơn vị tiền — chia 1.000.000 mới ra đồng.
    // Quên chia là bảng hiện chi phí gấp một triệu lần, con số vô lý tới mức dễ
    // phát hiện, nhưng vẫn nên nói rõ ở đây.
    // Hai lượt đọc độc lập — chạy SONG SONG: truyVan gọi ra Internet (chậm),
    // sổ tay đọc DB (nhanh). Xếp hàng chỉ tổ cộng thêm độ trễ của cái nhanh vào
    // sau cái chậm mà chẳng được gì.
    const [rows, soTay] = await Promise.all([
      this.ads.truyVan(`
        SELECT
          ad_group_criterion.keyword.text,
          ad_group_criterion.keyword.match_type,
          ad_group_criterion.status,
          ad_group_criterion.negative,
          ad_group_criterion.quality_info.quality_score,
          ad_group_criterion.quality_info.creative_quality_score,
          ad_group_criterion.quality_info.post_click_quality_score,
          ad_group_criterion.quality_info.search_predicted_ctr,
          campaign.name,
          campaign.id,
          ad_group.name,
          metrics.impressions,
          metrics.clicks,
          metrics.ctr,
          metrics.average_cpc,
          metrics.cost_micros,
          metrics.conversions,
          metrics.all_conversions,
          metrics.conversions_value,
          metrics.cost_per_conversion,
          metrics.conversions_from_interactions_rate,
          metrics.search_impression_share,
          metrics.search_rank_lost_impression_share,
          metrics.absolute_top_impression_percentage
        FROM keyword_view
        WHERE segments.date DURING LAST_30_DAYS
          AND ad_group_criterion.status != 'REMOVED'
        ORDER BY metrics.cost_micros DESC
      `),
      // Ghép ghi chú của sổ tay vào từ khoá thật, so theo tuKhoa không phân biệt
      // hoa thường — chủ shop gõ "Ví Da" trong sổ tay còn Google trả "ví da".
      this.prisma.koiAdKeyword.findMany(),
    ]);

    const ghiChuTheoTu = new Map<string, string>();
    for (const d of soTay) {
      if (d.ghiChu) ghiChuTheoTu.set(d.tuKhoa.trim().toLowerCase(), d.ghiChu);
    }

    return {
      daNoi: true,
      thieuBien: [],
      ocid: this.ads.maTaiKhoan() || null,
      dsTuKhoa: rows.map((r) => {
        const kw = r.adGroupCriterion?.keyword ?? {};
        const text = kw.text ?? "";
        const m = r.metrics ?? {};
        const cl = r.adGroupCriterion?.qualityInfo ?? {};
        return {
          tuKhoa: text,
          // negative=true là từ khoá loại trừ. Google không xếp nó thành một
          // match_type riêng, nên phải tự gộp lại để bảng admin hiển thị đúng
          // bốn loại như sổ tay: broad/phrase/exact/negative.
          loaiKhop: r.adGroupCriterion?.negative
            ? "negative"
            : String(kw.matchType ?? "").toLowerCase(),
          trangThai: String(r.adGroupCriterion?.status ?? "").toLowerCase(),
          chienDich: r.campaign?.name ?? "",
          // Id chiến dịch để Heoiu dựng link sâu vào đúng chiến dịch trên Ads.
          chienDichId: r.campaign?.id != null ? String(r.campaign.id) : null,
          nhomQuangCao: r.adGroup?.name ?? "",
          // impressions/clicks/cost là số đếm luôn có mặt (0 là 0 thật) nên giữ
          // 0 mặc định như cũ. Các con số bên dưới thì hay vắng cho từ ít dữ
          // liệu — dùng helper trả null để Front hiện "—".
          hienThi: Number(m.impressions ?? 0),
          cuBam: Number(m.clicks ?? 0),
          chiPhi: Number(m.costMicros ?? 0) / 1_000_000,
          ctr: this.phanTram(m.ctr),
          cpcTrungBinh: this.micro(m.averageCpc),
          // Đọc CẢ hai: conversions là chuyển đổi Primary; nếu action "Zalo Sale"
          // bị đặt Secondary thì nó KHÔNG vào conversions, chỉ vào allConversions.
          // Trả riêng cả hai để Front chọn con số đúng thay vì backend đoán hộ.
          cuChuyenDoi: this.so(m.conversions),
          cuChuyenDoiTatCa: this.so(m.allConversions),
          giaTriChuyenDoi: this.so(m.conversionsValue),
          giaMoiChuyenDoi: this.micro(m.costPerConversion),
          tyLeChuyenDoi: this.phanTram(m.conversionsFromInteractionsRate),
          tyLeHienThi: this.phanTram(m.searchImpressionShare),
          // Search lost IS (budget) CHỈ có ở cấp chiến dịch, không lấy được ở
          // keyword_view — chọn vào là Google trả 503 "metric incompatible".
          // Muốn cảnh báo "hết ngân sách" thì phải query riêng ở campaign.
          matViHang: this.phanTram(m.searchRankLostImpressionShare),
          topTuyetDoi: this.phanTram(m.absoluteTopImpressionPercentage),
          diemChatLuong: this.so(cl.qualityScore),
          chatLuongQuangCao: this.nhanChatLuong(cl.creativeQualityScore),
          chatLuongTrangDich: this.nhanChatLuong(cl.postClickQualityScore),
          ctrKyVong: this.nhanChatLuong(cl.searchPredictedCtr),
          ghiChuCuaToi: ghiChuTheoTu.get(text.trim().toLowerCase()) ?? null,
        };
      }),
    };
  }

  /**
   * Cụm từ tìm kiếm THẬT khách gõ vào Google, kèm số liệu 30 ngày.
   *
   * Khác tuKhoaThat ở bản chất: từ khoá là thứ TA đặt giá thầu; search term là
   * thứ KHÁCH thực sự gõ khi quảng cáo hiện ra. Đây là mỏ để (a) thấy cụm nào
   * nên thêm thành từ khoá, (b) thấy cụm nào đang đốt tiền mà không ra khách để
   * chặn bớt.
   *
   * search_term_view.status của Google: ADDED (đã là từ khoá) / EXCLUDED (đã
   * loại trừ) / ADDED_EXCLUDED (vừa thêm vừa loại trừ ở tầng khác) / NONE hoặc
   * UNKNOWN (chưa xử lý — nhóm cần soi). Chỉ gợi ý cho nhóm CHƯA XỬ LÝ; nhóm đã
   * xử lý để null cho khỏi giục chủ shop làm lại việc đã làm.
   *
   * Trả cùng khuôn { daNoi, thieuBien, dsSearchTerm } với tuKhoaThat để Front
   * xử lý "chưa nối Google Ads" y một kiểu ở mọi màn.
   */
  async searchTermsThat(): Promise<{
    daNoi: boolean;
    thieuBien: string[];
    // Mã tài khoản Ads (ocid) để Heoiu dựng link sâu mở chiến dịch trên giao
    // diện Google Ads: ads.google.com/aw/campaigns?ocid=...&campaignId=...
    ocid: string | null;
    dsSearchTerm: Array<{
      searchTerm: string;
      trangThai: string;
      tuKhoaKhop: string;
      loaiKhop: string;
      chienDich: string;
      // campaign.id của dòng này (string) — Heoiu dựng link mở đúng chiến dịch.
      // Vắng → null để Heoiu không bịa link.
      chienDichId: string | null;
      nhomQuangCao: string;
      hienThi: number;
      cuBam: number;
      chiPhi: number;
      cuChuyenDoi: number | null;
      giaTriChuyenDoi: number | null;
      goiY: string | null;
    }>;
  }> {
    if (!this.ads.daCauHinh()) {
      return {
        daNoi: false,
        thieuBien: this.ads.bienConThieu(),
        ocid: null,
        dsSearchTerm: [],
      };
    }

    const rows = await this.ads.truyVan(`
      SELECT
        search_term_view.search_term,
        search_term_view.status,
        segments.keyword.info.text,
        segments.search_term_match_type,
        campaign.name,
        campaign.id,
        ad_group.name,
        metrics.impressions,
        metrics.clicks,
        metrics.cost_micros,
        metrics.conversions,
        metrics.conversions_value
      FROM search_term_view
      WHERE segments.date DURING LAST_30_DAYS
      ORDER BY metrics.cost_micros DESC
    `);

    // Tài khoản có gắn theo dõi chuyển đổi hay không: nếu KHÔNG cụm nào trả về
    // số chuyển đổi (đều null) thì coi như chưa gắn — lúc đó "0 đơn" là "chưa
    // đo được" chứ không phải "không ra khách", nên không được bắn nhãn đỏ "nên
    // loại trừ". Cùng nguyên tắc với coCotSo() bên panel Heoiu, chỉ khác là xét
    // trên cả tập thay vì từng dòng.
    const coDuLieuChuyenDoi = rows.some(
      (r) => this.so(r.metrics?.conversions) !== null,
    );

    return {
      daNoi: true,
      thieuBien: [],
      ocid: this.ads.maTaiKhoan() || null,
      dsSearchTerm: rows.map((r) => {
        const status = String(r.searchTermView?.status ?? "").toUpperCase();
        const cuBam = Number(r.metrics?.clicks ?? 0);
        const chiPhi = Number(r.metrics?.costMicros ?? 0) / 1_000_000;
        const cuChuyenDoi = this.so(r.metrics?.conversions);
        return {
          searchTerm: r.searchTermView?.searchTerm ?? "",
          trangThai: this.nhanTrangThaiSearchTerm(status),
          tuKhoaKhop: r.segments?.keyword?.info?.text ?? "",
          loaiKhop: String(r.segments?.searchTermMatchType ?? "").toLowerCase(),
          chienDich: r.campaign?.name ?? "",
          chienDichId: r.campaign?.id ? String(r.campaign.id) : null,
          nhomQuangCao: r.adGroup?.name ?? "",
          hienThi: Number(r.metrics?.impressions ?? 0),
          cuBam,
          chiPhi,
          cuChuyenDoi,
          giaTriChuyenDoi: this.so(r.metrics?.conversionsValue),
          goiY: this.goiYSearchTerm(
            status,
            cuBam,
            chiPhi,
            cuChuyenDoi,
            coDuLieuChuyenDoi,
          ),
        };
      }),
    };
  }

  /** search_term_view.status (ENUM) → nhãn tiếng Việt. */
  private nhanTrangThaiSearchTerm(status: string): string {
    switch (status) {
      case "ADDED":
        return "đã thêm";
      case "EXCLUDED":
        return "đã loại trừ";
      case "ADDED_EXCLUDED":
        return "đã thêm & loại trừ";
      default:
        // NONE / UNKNOWN / UNSPECIFIED
        return "chưa xử lý";
    }
  }

  /**
   * Gợi ý hành động cho một cụm tìm kiếm. CHỈ gợi ý cho cụm CHƯA XỬ LÝ.
   *
   *  · "nên thêm": đã ra chuyển đổi — bằng chứng rõ nhất cụm này đáng đặt giá
   *    thầu riêng. (Hoặc: chưa gắn theo dõi chuyển đổi mà kéo được kha khá bấm —
   *    gợi ý NHẸ, tạm tin theo lượt bấm.)
   *  · "xem lại": có theo dõi chuyển đổi, cụm hút NHIỀU bấm và tốn tiền nhưng 0
   *    đơn — đang hút người mà không ra khách, cần soi lại trang đích / ý định
   *    tìm kiếm trước khi quyết thêm hay chặn.
   *  · "nên loại trừ": có theo dõi chuyển đổi, tốn tiền mà 0 đơn và ít bấm —
   *    tiền rơi vào cụm không ra khách, nên cân nhắc chặn.
   *  · null: không đủ tín hiệu để khuyên, hoặc đã xử lý rồi.
   *
   * coDuLieuChuyenDoi = cả tập có ít nhất một cụm đọc được số chuyển đổi. Khi
   * FALSE (tài khoản chưa gắn theo dõi chuyển đổi) thì "0 đơn" là "chưa đo được"
   * chứ không phải "không ra khách" — KHÔNG được bắn nhãn mạnh "xem lại"/"nên
   * loại trừ", vì đó là vu oan cho cụm khi ta còn chưa đo. Đây chính là cái bẫy
   * mà gate coCotSo() bên panel Heoiu dựng ra để tránh.
   *
   * Đây là GỢI Ý cho người đọc, không phải lệnh tự động — hàm này không đụng gì
   * tới tài khoản Ads.
   */
  private goiYSearchTerm(
    status: string,
    cuBam: number,
    chiPhi: number,
    cuChuyenDoi: number | null,
    coDuLieuChuyenDoi: boolean,
  ): string | null {
    const daXuLy =
      status === "ADDED" || status === "EXCLUDED" || status === "ADDED_EXCLUDED";
    if (daXuLy) return null;

    // Có đơn thật thì luôn đáng thêm, bất kể có/chưa gắn theo dõi trên cả tài
    // khoản (một cụm ra đơn tự nó đã là bằng chứng theo dõi chạy).
    if ((cuChuyenDoi ?? 0) > 0) return "nên thêm";

    // Chưa đo được chuyển đổi: chỉ dám gợi ý nhẹ theo lượt bấm, tuyệt đối không
    // kết luận lãng phí.
    if (!coDuLieuChuyenDoi) {
      return cuBam >= NGUONG_NHIEU_BAM ? "nên thêm" : null;
    }

    // Có theo dõi mà cụm này 0 đơn: phân biệt "hút bấm nhưng phí" với "ít bấm
    // lại phí" — hai cái cần hành động khác nhau.
    if (chiPhi > 0 && cuBam >= NGUONG_NHIEU_BAM) return "xem lại";
    if (chiPhi > 0 && cuBam < NGUONG_NHIEU_BAM) return "nên loại trừ";
    return null;
  }

  /**
   * Keyword Planner: gợi ý từ khoá mới từ vài từ gốc, kèm số liệu ước tính.
   *
   * Khác tuKhoaThat/searchTermsThat: hai hàm kia đọc số liệu THẬT của tài khoản;
   * hàm này hỏi Google "với những từ gốc này, còn từ nào đáng chạy nữa" — dữ
   * liệu tham khảo thị trường, không phải hiệu suất tài khoản mình.
   *
   * CHỈ ĐỌC: gọi generateKeywordIdeas, không mutate, không đụng tiền hay cấu
   * hình tài khoản.
   *
   * Trả cùng khuôn { daNoi, thieuBien, dsYTuong } để Front xử lý "chưa nối"
   * thống nhất với các màn kia.
   */
  async yTuongTuKhoa(seeds: string[]): Promise<{
    daNoi: boolean;
    thieuBien: string[];
    dsYTuong: Array<{
      tuKhoa: string;
      luongTimKiem: number | null;
      canhTranh: string | null;
      chiSoCanhTranh: number | null;
      giaThauThap: number | null;
      giaThauCao: number | null;
    }>;
  }> {
    // Làm sạch seed TRƯỚC khi kiểm cấu hình: bỏ chuỗi rỗng/khoảng trắng, gộp
    // trùng, rồi cắt còn tối đa GIOI_HAN_SEED — Google từ chối cả request nếu
    // quá ~20 seed/lần.
    const sach = Array.from(
      new Set((seeds || []).map((s) => (s ?? "").trim()).filter(Boolean)),
    ).slice(0, GIOI_HAN_SEED);

    if (!sach.length) {
      throw new BadRequestException("Cần ít nhất một từ khoá gốc để gợi ý");
    }

    if (!this.ads.daCauHinh()) {
      return { daNoi: false, thieuBien: this.ads.bienConThieu(), dsYTuong: [] };
    }

    const results = await this.ads.yTuongTuKhoa(sach);

    return {
      daNoi: true,
      thieuBien: [],
      dsYTuong: results.map((r) => {
        const m = r.keywordIdeaMetrics ?? {};
        return {
          tuKhoa: r.text ?? "",
          luongTimKiem: this.so(m.avgMonthlySearches),
          canhTranh: this.nhanCanhTranh(m.competition),
          chiSoCanhTranh: this.so(m.competitionIndex),
          giaThauThap: this.micro(m.lowTopOfPageBidMicros),
          giaThauCao: this.micro(m.highTopOfPageBidMicros),
        };
      }),
    };
  }

  /**
   * Cấu trúc tài khoản: danh sách campaign + ad group để làm picker trên heoiu.
   *
   * CHỈ LẤY CAMPAIGN ĐANG BẬT (ENABLED) vì chủ shop chỉ cần đẩy từ khoá vào
   * nơi đang chạy — campaign PAUSED/REMOVED không liên quan.
   *
   * Trả khuôn { daNoi, thieuBien, dsCampaign } để heoiu xử lý "chưa nối" như
   * mọi route Ads khác. Mỗi campaign kèm danh sách ad group con của nó (chỉ
   * ENABLED) để picker có thể chọn campaign → ad group trong hai bước.
   *
   * KHÔNG trả metrics: mục đích duy nhất là cung cấp id + name để chủ shop
   * biết đang đẩy từ khoá vào nhóm nào. Nhẹ, nhanh, không cần segment.
   */
  async layStructure(): Promise<{
    daNoi: boolean;
    thieuBien: string[];
    dsCampaign: Array<{
      id: string;
      ten: string;
      dsAdGroup: Array<{ id: string; ten: string }>;
    }>;
  }> {
    if (!this.ads.daCauHinh()) {
      return { daNoi: false, thieuBien: this.ads.bienConThieu(), dsCampaign: [] };
    }

    // Một câu GAQL join campaign + ad_group: trả mỗi ad group một dòng, kèm
    // campaign cha. Lọc ENABLED ở cả hai mức để không điền picker toàn nhóm
    // chết. ORDER BY campaign.name, ad_group.name để picker hiển thị gọn.
    const rows = await this.ads.truyVan(`
      SELECT
        campaign.id,
        campaign.name,
        ad_group.id,
        ad_group.name
      FROM ad_group
      WHERE campaign.status = 'ENABLED'
        AND ad_group.status = 'ENABLED'
      ORDER BY campaign.name, ad_group.name
    `);

    // Gom ad group theo campaign cha. Dùng Map<campaignId, campaign> để gom
    // đúng thứ tự xuất hiện (rows đã sorted by campaign.name từ GAQL).
    const map = new Map<string, { id: string; ten: string; dsAdGroup: Array<{ id: string; ten: string }> }>();
    for (const r of rows) {
      const cid = r.campaign?.id != null ? String(r.campaign.id) : null;
      const cten = r.campaign?.name ?? "";
      const agid = r.adGroup?.id != null ? String(r.adGroup.id) : null;
      const agten = r.adGroup?.name ?? "";
      if (!cid || !agid) continue;
      if (!map.has(cid)) map.set(cid, { id: cid, ten: cten, dsAdGroup: [] });
      map.get(cid)!.dsAdGroup.push({ id: agid, ten: agten });
    }

    return { daNoi: true, thieuBien: [], dsCampaign: [...map.values()] };
  }

  /**
   * Mở rộng themTuKhoa nhận 4 cột đồng bộ mới: loai, adGroupId, campaignId,
   * phamViNegative. Validate và ghi chính xác vào Prisma.
   *
   * Tách hàm riêng thay vì inline trong controller để logic validate luôn khớp
   * với suaTuKhoa dưới đây (hai nơi đều kiểm LOAI_HOP_LE, PHAM_VI, v.v.).
   */
  async themTuKhoaV2(input: {
    tuKhoa: string;
    chienDich?: string;
    loaiKhop?: string;
    trangThai?: string;
    ghiChu?: string;
    loai?: string;
    adGroupId?: string;
    campaignId?: string;
    phamViNegative?: string;
  }) {
    const tuKhoa = input.tuKhoa.trim();
    if (!tuKhoa) throw new BadRequestException("Từ khoá không được để trống");

    const loai = (input.loai ?? "keyword").trim();
    const LOAI_HOP_LE = ["keyword", "negative"];
    if (!LOAI_HOP_LE.includes(loai)) {
      throw new BadRequestException(`loai không hợp lệ: ${loai}`);
    }

    const loaiKhop = input.loaiKhop?.trim() || null;
    const MATCH_HOP_LE = ["broad", "phrase", "exact"];
    if (loaiKhop && !MATCH_HOP_LE.includes(loaiKhop)) {
      throw new BadRequestException(`Loại khớp không hợp lệ: ${loaiKhop}`);
    }

    const trangThai = input.trangThai?.trim() || "active";
    const TRANG_THAI_HOP_LE = ["active", "paused"];
    if (!TRANG_THAI_HOP_LE.includes(trangThai)) {
      throw new BadRequestException(`Trạng thái không hợp lệ: ${trangThai}`);
    }

    const adGroupId = input.adGroupId?.trim() || null;
    const campaignId = input.campaignId?.trim() || null;

    const phamViNegative = input.phamViNegative?.trim() || null;
    const PHAM_VI_HOP_LE = ["adgroup", "campaign", "shared"];
    if (phamViNegative && !PHAM_VI_HOP_LE.includes(phamViNegative)) {
      throw new BadRequestException(`phamViNegative không hợp lệ: ${phamViNegative}`);
    }

    // Negative mức campaign cần campaignId; keyword và negative mức adgroup cần adGroupId.
    if (loai === "negative" && phamViNegative === "campaign" && !campaignId) {
      throw new BadRequestException("Negative mức campaign cần campaignId");
    }

    const chienDich = input.chienDich?.trim() || null;

    // Chặn trùng lặp (theo tuKhoa + chienDich + loaiKhop như cũ — loai không
    // vào key vì một từ không nên vừa là keyword vừa là negative trong cùng chiến dịch).
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
        loai,
        adGroupId,
        campaignId,
        phamViNegative,
      },
    });
  }

  /**
   * Mở rộng suaTuKhoa nhận 4 cột đồng bộ mới.
   */
  async suaTuKhoaV2(
    id: string,
    input: {
      tuKhoa?: string;
      chienDich?: string | null;
      loaiKhop?: string | null;
      trangThai?: string;
      ghiChu?: string | null;
      loai?: string;
      adGroupId?: string | null;
      campaignId?: string | null;
      phamViNegative?: string | null;
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
      const MATCH_HOP_LE = ["broad", "phrase", "exact"];
      if (input.loaiKhop && !MATCH_HOP_LE.includes(input.loaiKhop)) {
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

    if (input.loai !== undefined) {
      const LOAI_HOP_LE = ["keyword", "negative"];
      if (!LOAI_HOP_LE.includes(input.loai)) {
        throw new BadRequestException(`loai không hợp lệ: ${input.loai}`);
      }
      data.loai = input.loai;
    }

    if (input.adGroupId !== undefined) {
      data.adGroupId = input.adGroupId?.trim() || null;
    }

    if (input.campaignId !== undefined) {
      data.campaignId = input.campaignId?.trim() || null;
    }

    if (input.phamViNegative !== undefined) {
      const PHAM_VI_HOP_LE = ["adgroup", "campaign", "shared"];
      if (input.phamViNegative && !PHAM_VI_HOP_LE.includes(input.phamViNegative)) {
        throw new BadRequestException(`phamViNegative không hợp lệ: ${input.phamViNegative}`);
      }
      data.phamViNegative = input.phamViNegative || null;
    }

    // Khi sửa trangThaiDongBo về chua_day (người dùng tự reset để đẩy lại):
    // xoá loiDongBo cũ đi cho sạch.
    if (data.trangThaiDongBo === "chua_day") {
      data.loiDongBo = null;
    }

    return this.prisma.koiAdKeyword.update({ where: { id }, data });
  }
}
