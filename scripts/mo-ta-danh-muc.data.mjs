/**
 * Mô tả cho các danh mục còn TRỐNG chữ — bản chốt tay, không do AI sinh.
 *
 * Xoá được sau khi ghi, nhưng ĐỪNG xoá: đây là bản gốc để đối chiếu nếu ai đó
 * sửa mô tả trong admin rồi muốn biết chữ ban đầu là gì. KoiContentRevision chỉ
 * chụp mô tả SẢN PHẨM, không chụp mô tả DANH MỤC.
 *
 * VÌ SAO KHÔNG NHỜ AI VIẾT NHƯ 167 MÔ TẢ SẢN PHẨM:
 * Sáu danh mục này KHÔNG phải dòng sản phẩm — chúng là KỸ THUẬT chế tác cắt
 * ngang mọi dòng hàng (may trám, đan lát, chạm khắc, phần cứng riêng), cộng một
 * danh mục kênh bán (quà tặng sự kiện) và một danh mục món lẻ (bọc tai nghe).
 * AI đọc tên danh mục rồi viết như thể đó là một dòng sản phẩm — sai bản chất,
 * và mô tả sẽ trùng ý với danh mục dòng hàng thật (Ví, Túi, Dây lưng).
 *
 * MỖI ĐOẠN BÁM HÀNG THẬT ĐANG CÓ TRONG DANH MỤC (đã đọc từ DB 29/08/2026):
 *   may-tram-chan   11 món · Epsom, Caviar, Togo, da cừu, da bò Ý
 *   an-lat-woven     4 món · Nappa, da bò Ý
 *   cham-khac-tren-da 4 món · Buttero, da bò thảo mộc (toàn bộ là charm)
 *   phu-kien-rieng   16 món · 8 loại da, trải từ money clip tới thắt lưng cá sấu
 *   qua-tang-su-kien  2 món · da bò Ý (Masterise, Eco Village — đơn doanh nghiệp)
 *   boc-da-tai-nghe   3 món · da bò Ý, Togo, da bò vân Mill
 *
 * KHÔNG viết cho `trademark` (16 món) — xem ghi chú ở cuối tệp.
 * KHÔNG viết cho `ca-nhan-hoa` — isActive=false, trang không hiện.
 *
 * ĐỘ DÀI: giữ 300–320 ký tự mỗi mô tả. Ngưỡng cắt của CategoryIntro là 320 ký
 * tự (src/components/category-intro.tsx) — dưới ngưỡng thì khách đọc trọn chữ
 * mà không phải bấm "Đọc thêm", và meta description (cắt 160) vẫn lấy được hai
 * câu đầu trọn nghĩa.
 *
 * KHÔNG nhắc MOQ: chủ shop chốt "MOQ liên hệ, không có mức rõ ràng vì range
 * giữa các dòng hàng quá lớn". Một món trong qua-tang-su-kien có "(MOQ 20 pcs)"
 * trong TÊN — đó là mức của riêng đơn đó, không phải luật của xưởng.
 *
 * KHÔNG nhắc tỉ lệ cọc: chủ shop chốt để ngỏ, mời khách inbox.
 */

/** slug → { description, metaTitle, metaDescription } */
export const MO_TA = {
  'may-tram-chan': {
    description:
      '<p>May trám — hay chần quả trám — là khâu những đường chỉ chéo cắt nhau trên nền da đã lót, để mặt da phồng thành từng ô hình thoi. Ô phải đều tuyệt đối vì mắt nhìn ra ngay một ô lệch, mà da đã đâm kim thì không sửa được. KOI trám trên da vân hạt giữ nếp: Epsom, Caviar, Togo, da cừu — ví, kẹp tiền, ốp lưng.</p>',
    metaTitle: 'May Trám – Chần Quả Trám Trên Da | KOI Leather',
    metaDescription:
      'Kỹ thuật may trám (chần quả trám) thủ công trên da Epsom, Caviar, Togo, da cừu — ví, kẹp tiền, ốp lưng. Từng ô hình thoi canh đều tay, da đâm kim là không sửa được.',
  },

  'an-lat-woven': {
    description:
      '<p>Đan lát là cắt da thành sợi rồi đan tay thành mặt phẳng — không khuôn, không máy, nhịp đan đều hay lệch là do tay người thợ. Mặt da đan mềm hơn da nguyên tấm, bắt sáng theo từng sợi nên màu trông sâu hơn. KOI đan trên da Nappa và da bò Ý: clutch, túi du lịch, đồ trang trí. Mỗi tấm đan dựng riêng một lần.</p>',
    metaTitle: 'Đan Lát – Woven Da Thủ Công | KOI Leather',
    metaDescription:
      'Da cắt sợi đan tay hoàn toàn, không khuôn không máy — clutch, túi du lịch, đồ trang trí trên da Nappa và da bò Ý. Mỗi tấm đan dựng riêng một lần.',
  },

  'cham-khac-tren-da': {
    description:
      '<p>Chạm khắc là ấn và gọt trực tiếp lên mặt da để hình nổi khối, khác hẳn in hay dập — nét nằm trong thân da nên không bong, không phai. Phải là da thuộc thảo mộc như Buttero mới ăn nét: da thuộc crôm quá đàn hồi, ấn xong nó nhả về phẳng. Hiện là charm đeo túi, phần nhiều chạm pet cưng theo ảnh khách gửi.</p>',
    metaTitle: 'Chạm Khắc Trên Da Thủ Công | KOI Leather',
    metaDescription:
      'Chạm khắc thủ công trên da thuộc thảo mộc Buttero — nét nổi khối trong thân da, không bong không phai. Charm đeo túi chạm chân dung pet cưng theo ảnh riêng.',
  },

  'phu-kien-rieng-customize-hardware': {
    description:
      '<p>Phần cứng riêng là phần kim loại làm theo yêu cầu khách chứ không lấy sẵn: tag khắc tên hoặc logo, khoá, khuy, ri-vê, đầu dây. Đây là chỗ một món da thành món của riêng một người — cùng mẫu ví, đổi cái tag là đổi chủ. Danh mục gom hàng làm theo lối này trên 8 dòng da, từ kẹp tiền tới thắt lưng cá sấu.</p>',
    metaTitle: 'Phụ Kiện Riêng – Customize Hardware | KOI Leather',
    metaDescription:
      'Tag khắc tên/logo, khoá, khuy, ri-vê làm riêng theo yêu cầu — kẹp tiền, ốp lưng, bìa hồ sơ, túi, thắt lưng. Cùng một mẫu, đổi phần cứng là đổi chủ.',
  },

  'qua-tang-su-kien': {
    description:
      '<p>Quà tặng sự kiện là hàng KOI làm theo đơn doanh nghiệp: quà khai trương, tri ân khách hàng, hội nghị, quà cho cư dân dự án. Xưởng đã làm thẻ da chìa khoá cho Masterise và charm da cho Eco Village. Kiểu da, màu, cách đặt logo và hạn giao quyết định báo giá, nên gửi yêu cầu để xưởng tính riêng.</p>',
    metaTitle: 'Quà Tặng Sự Kiện Bằng Da Thật, Đặt Theo Đơn | KOI Leather',
    metaDescription:
      'Quà tặng sự kiện bằng da thật làm theo đơn doanh nghiệp: khai trương, tri ân khách hàng, hội nghị, cư dân dự án. Đã làm cho Masterise, Eco Village.',
  },

  'boc-da-tai-nghe': {
    description:
      '<p>Bọc da tai nghe phải dựng theo đúng một mẫu máy — đo từ vỏ tai nghe thật, chừa cổng sạc và khe mic, ôm khít để không xoay khi dùng. Chưa có hàng sẵn cho mọi model nên phần lớn là đặt riêng: khách cho biết tên máy, xưởng dựng rập rồi mới cắt da. Hiện có mẫu cho Marshall trên da bò Ý, Togo, vân Mill.</p>',
    metaTitle: 'Bọc Da Tai Nghe Đặt Riêng Theo Model | KOI Leather',
    metaDescription:
      'Bọc da tai nghe dựng rập theo đúng model máy — chừa cổng sạc, khe mic, ôm khít không xoay. Đã có mẫu cho Marshall trên da bò Ý, Togo, da bò vân Mill.',
  },
};

/**
 * `trademark` (16 món) — CỐ Ý KHÔNG VIẾT. Đây là việc của chủ shop, không phải
 * việc thiếu chữ.
 *
 * Danh mục này đang chứa hàng mang tên thương hiệu của người khác: "Belt LV",
 * "Loewe Hammock Hobo Bag", "Túi Tote Longchamp", "Túi Constance Slim mini"
 * (tên mẫu túi của Hermès), "Rouge H Họa Tiết Ngựa" (tên màu của Hermès). Trong
 * may-tram-chan còn một món "Bao Da iPhone Chanel".
 *
 * Viết mô tả SEO cho danh mục này là chủ động xin xếp hạng trên tên thương hiệu
 * của người khác. Ba cái giá phải trả, theo thứ tự khả năng xảy ra:
 *
 *  1. CỔNG THANH TOÁN. Site đang dựng để nhận tiền quốc tế qua PayPal và
 *     Visa/Master. Cả hai đều đóng tài khoản người bán khi thấy hàng mang nhãn
 *     hiệu người khác — và tiền đang nằm trong tài khoản bị giữ lại. Đây là rủi
 *     ro trực tiếp lên đúng thứ cả site đang được dựng ra để làm.
 *  2. YÊU CẦU HẠ TỪ CHỦ NHÃN HIỆU. Hermès, LV, Chanel đều có đội quét chủ động;
 *     một khiếu nại là mất trang, kèm khả năng mất cả tên miền ở tầng registrar.
 *  3. GOOGLE. Trang xếp hạng trên tên nhãn hiệu người khác bị hạ khi có khiếu
 *     nại, và hồ sơ tên miền xấu đi.
 *
 * ĐỀ XUẤT (chủ shop quyết, đã đưa vào tab Việc cần làm — mã D-trademark):
 *  · Ngắn hạn: cho `trademark` vào EXCLUDED_CATEGORY_SLUGS ở src/lib/config.ts
 *    → noindex + rớt khỏi sitemap. Trang vẫn xem được, chỉ không mời Google vào.
 *  · Dài hạn: đổi tên hàng sang tên mô tả kiểu dáng ("Túi Hobo dây võng",
 *    "Thắt lưng khoá chữ", "Túi tote quai dài"). Kiểu dáng không ai độc quyền
 *    được — tên riêng thì có. Đổi tên là đổi H1 và slug Google đang giữ nên phải
 *    chủ shop chốt từng món, giống việc D-ten-co-ten-khach.
 *
 * KHÔNG tự đổi tên hàng, KHÔNG tự noindex trong lượt này: cả hai đều thay đổi
 * thứ Google đang thấy.
 */
export const KHONG_VIET = ['trademark', 'ca-nhan-hoa'];
