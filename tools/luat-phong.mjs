/**
 * Bảng sửa LỐI VIẾT THỔI PHỒNG trong mô tả sản phẩm — đợt 2.
 *
 * Mon ràng "không replace cơ học, đọc từng câu". Cách em giữ đúng ràng buộc đó
 * mà vẫn làm được 341 câu: luật ở đây chỉ là cách SINH RA bản nháp; bắt buộc
 * phải chạy `xem-phong.mjs` in ra TOÀN BỘ câu trước/sau và đọc hết, rồi mới
 * ghi. Cái được đọc là câu tiếng Việt thành phẩm, không phải cái regex.
 *
 * Nguyên tắc không được phá:
 *  - Chỉ CẮT chữ rỗng. Không thêm sự kiện, thông số, chất liệu, bảo hành.
 *  - Không đụng tên sản phẩm, tên da, tên hãng, giá, kích thước.
 *  - Câu sau khi sửa phải đứng một mình đọc vẫn xuôi.
 */

/** Cụm nào cũng phải để lại một câu đọc được, nên thứ tự dài-trước-ngắn-sau. */
export const LUAT_PHONG = [
  // ---- "lựa chọn lý tưởng / hoàn hảo" (73 + 45 sản phẩm) ----
  // Cấu trúc gần như đồng nhất: "X là (sự) lựa chọn lý tưởng cho Y".
  // "hợp với Y" giữ nguyên ý (món này dành cho ai) mà bỏ được lời tự khen.
  {
    ten: 'lua-chon-cho',
    tim: /(?:là|chính là)\s+(?:sự\s+)?lựa\s+chọn\s+(?:lý tưởng|hoàn hảo|đầu bảng|không thể bỏ qua)\s+(?:dành\s+)?cho(?!:)/gi,
    thay: 'hợp với',
  },
  // "… là lựa chọn lý tưởng cho: Doanh nhân, người đi làm…" — dấu hai chấm mở
  // danh sách, "hợp với:" đọc vẫn xuôi.
  {
    ten: 'lua-chon-danh-sach',
    tim: /(?:là|chính là)\s+(?:sự\s+)?lựa\s+chọn\s+(?:lý tưởng|hoàn hảo|đầu bảng|không thể bỏ qua)\s+(?:dành\s+)?cho:/gi,
    thay: 'hợp với:',
  },
  {
    ten: 'lua-chon-de',
    tim: /(?:là|chính là)\s+(?:sự\s+)?lựa\s+chọn\s+(?:lý tưởng|hoàn hảo|đầu bảng)\s+để/gi,
    thay: 'dùng được để',
  },
  // Câu cụt kiểu "… thì một chiếc ốp lưng da thật thủ công là lựa chọn hoàn hảo."
  // Bỏ hẳn tính từ, giữ "là lựa chọn" thì câu vẫn đứng được.
  {
    ten: 'lua-chon-tron',
    tim: /(?:là|chính là)\s+(?:sự\s+)?lựa\s+chọn\s+(?:lý tưởng|hoàn hảo|đầu bảng)(?=\s*[.,;])/gi,
    thay: 'là lựa chọn phù hợp',
  },

  // ---- "tuyên ngôn" (67 sản phẩm) ----
  // Gần như luôn nằm trong khuôn "không chỉ là X – mà (còn) là tuyên ngôn của
  // A, B và C". Bỏ cả vế sau vì nó không nói gì về sản phẩm.
  // "X không chỉ là A – mà (còn) là tuyên ngôn về B."
  //
  // Bản đầu em chỉ cắt vế sau, ra "X không chỉ là A." — "không chỉ" là nửa của
  // một cặp liên từ, cắt mất nửa kia thì câu treo. Phải nuốt cả "không chỉ" và
  // hạ xuống thành câu khẳng định thường.
  // ĐÃ BỎ luật 'khong-chi-tuyen-ngon'.
  //
  // Hạ "X không chỉ là Y mà còn là tuyên ngôn về Z" xuống "X là Y" thì đúng ngữ
  // pháp nhưng ĐỔI NGHĨA: bản gốc nói "không chỉ đơn thuần là vật đựng đồ", bản
  // rút gọn nói "là vật đựng đồ" — nói ngược lại ý người viết. Sai kiểu này tệ
  // hơn sáo rỗng. 8 chỗ, sửa tay từng chỗ trong bang-phong.mjs.
  // Khuôn không có "không chỉ" đi kèm thì cắt vế sau là đủ.
  //
  // Lookbehind độ dài thay đổi (JS cho phép) để bỏ qua đúng những câu có "không
  // chỉ" đứng trước trong cùng câu — cắt vế sau ở đó sẽ để "không chỉ" treo một
  // mình. Nhóm ấy sửa tay.
  {
    ten: 'tuyen-ngon-cua',
    tim: /(?<!không\s+chỉ[^.!?<]{0,160})\s*(?:–|—|-|,)?\s*mà\s+(?:còn\s+)?là\s+tuyên\s+ngôn\s+(?:của|về)\s+[^.!?<]{0,140}(?=[.!?<])/gi,
    thay: '',
  },
  // Cụm dài phải đứng trước cụm ngắn trong nhánh lựa chọn, và phải chốt đuôi.
  // Bản đầu để "phong cách" trước nên "tuyên ngôn phong cách sống" chỉ bị ăn
  // hai chữ đầu, còn lại "là dấu ấn riêng sống".
  {
    ten: 'tuyen-ngon-ca-nhan',
    tim: /tuyên\s+ngôn\s+(?:phong cách cá nhân|phong cách sống|cá nhân|đẳng cấp|phong cách)(?![a-zà-ỹ])/gi,
    thay: 'dấu ấn riêng',
  },
  // Phải nuốt luôn "là (một)" ở trước. Bản đầu chỉ thay "tuyên ngôn về" nên ra
  // "là một thể hiện gu thẩm mỹ" — không phải tiếng Việt.
  { ten: 'tuyen-ngon-con-lai', tim: /là\s+(?:một\s+)?tuyên\s+ngôn\s+(?:của|về)\s+/gi, thay: 'thể hiện ' },
  // GIỮ giới từ. "trở thành tuyên ngôn về sự chỉn chu" mà thay thành "trở thành
  // dấu ấn sự chỉn chu" là rụng mất chữ "của", câu cộc.
  { ten: 'tuyen-ngon-vet', tim: /tuyên\s+ngôn\s+(?:của|về)\s+/gi, thay: 'dấu ấn của ' },

  // ---- nhóm "đẳng cấp / xa xỉ / thượng lưu" ----
  // "được giới thượng lưu tin dùng" mà chỉ xoá cụm "giới thượng lưu" thì còn
  // "Chất liệu xa xỉ tin dùng" — mất chủ thể, hoá ra chất liệu đi tin dùng ai
  // đó. Phải xử theo cả vế.
  { ten: 'thuong-luu-tin-dung', tim: /được\s+giới\s+thượng\s+lưu\s+(tin dùng|ưa chuộng|lựa chọn|săn đón)/gi, thay: 'được ưa chuộng' },
  { ten: 'thuong-luu-va', tim: /giới\s+thượng\s+lưu\s+(?:và|cùng)\s+/gi, thay: '' },
  { ten: 'nang-tam-dang-cap', tim: /nâng\s+tầm\s+đẳng\s+cấp/gi, thay: 'nâng tầm tổng thể' },
  // Khi ngay sau là "của …" thì cần thêm "riêng", không thì ra "tạo dấu ấn của
  // họ" — đọc cộc.
  { ten: 'the-hien-dang-cap-cua', tim: /(?:thể hiện|khẳng định)\s+đẳng\s+cấp(?=\s+của)/gi, thay: 'tạo dấu ấn riêng' },
  { ten: 'the-hien-dang-cap', tim: /(?:thể hiện|khẳng định)\s+đẳng\s+cấp/gi, thay: 'tạo dấu ấn' },
  // Hai ngữ cảnh khác hẳn nhau, gộp một mẫu là hỏng một cái:
  //  - "Đỉnh cao của sự sang trọng" (tiêu đề) -> bỏ cả cụm, còn "sang trọng".
  //  - "tay nghề bespoke đỉnh cao của KOI Leather" -> chỉ bỏ "đỉnh cao", PHẢI
  //    giữ "của". Mẫu gộp đã ăn mất chữ "của" và ra "tay nghề bespoke KOI
  //    Leather".
  { ten: 'dinh-cao-cua-su', tim: /[Đđ]ỉnh\s+cao\s+của\s+sự\s+/g, thay: '' },
  { ten: 'dinh-cao-truoc-cua', tim: /\s+đỉnh\s+cao(?=\s+của\s+)/g, thay: '' },

  // ---- nhóm nói thay cảm xúc người mua ----
  // ĐÃ BỎ luật 'biet-minh-la-ai': mẫu nuốt luôn "những người" nên "là lựa chọn
  // của những người biết rõ mình là ai…" thành "là lựa chọn của." — cụt chủ thể.
  // 3 chỗ, sửa tay.
  // ĐÃ BỎ luật 'ban-dong-hanh'.
  //
  // 11 chỗ, mỗi chỗ một kiểu ngữ pháp khác nhau: "trở thành người bạn đồng hành
  // THANH LỊCH TRÊN CỔ TAY", "đủ đẹp để trở thành bạn đồng hành MỖI NGÀY",
  // "là người bạn đồng hành CÙNG BẠN bước ra thế giới". Một cụm thay chung cho
  // cả ba thì chỗ nào cũng dính chữ vào nhau ("dùng được lâu dàimỗi ngày") hoặc
  // sai nghĩa. Sửa tay trong bang-phong.mjs.
  // Chỉ bỏ "cùng bạn", GIỮ động từ "đồng hành". Bản đầu bỏ cả cụm nên câu
  // "truyền cảm hứng và đồng hành cùng bạn qua từng hành trình" thành "truyền
  // cảm hứng từng hành trình" — mất hẳn vị ngữ.
  { ten: 'dong-hanh-cung-ban', tim: /đồng\s+hành\s+cùng\s+bạn(?![a-zà-ỹ])/gi, thay: 'đồng hành' },

  // ---- câu dẫn của blog lọt vào mô tả sản phẩm ----
  //
  // ĐÃ BỎ hai luật ở đây. Câu duy nhất dính là "Hãy cùng Koi Leather tìm hiểu
  // về sản phẩm L!M ToteBag qua bài viết dưới đây." — và TÊN SẢN PHẨM có dấu
  // chấm than ("L!M"). Mẫu `[^.!?]{0,80}` của em dừng ngay tại đó, cắt nửa câu
  // rồi luật sau ăn nốt phần đuôi, ra "…cuối tuần.M ToteBag .". Một câu thì
  // sửa tay, không đáng viết luật. Xem bang-phong.mjs.

  // ---- khẳng định không kiểm chứng được ----
  // Nhóm này nguy hiểm nhất về mặt pháp lý/quảng cáo, không chỉ là văn phong.
  // Khuôn "không chỉ là A mà còn là B <nhất toàn quốc>" phải cắt CẢ HAI vế của
  // cặp "không chỉ… mà còn…", nếu không thì bỏ vế sau xong vế trước treo lủng
  // lẳng ("… không chỉ là đơn vị sản xuất ví da đà điểu thật mà."). Rút gọn về
  // một câu khẳng định thường.
  {
    ten: 'nhat-toan-quoc',
    tim: /không\s+chỉ\s+là\s+((?:(?!mà còn)[^.!?])+?)\s*mà\s+còn\s+là\s+(?:đơn vị|nơi|địa chỉ)\s+[^.!?]{0,70}(?:uy tín|cao cấp|tốt|chất lượng)\s+nhất\s+(?:trên\s+)?(?:toàn quốc|thị trường|Việt Nam)/gi,
    thay: (_m, a) => `là ${a.trim()}`,
  },
  { ten: 'nhat-vet', tim: /\s+(?:uy tín|tốt|đẹp|sang trọng|cao cấp)\s+nhất\s+(?:trên\s+)?(?:toàn quốc|thị trường|Việt Nam)/gi, thay: '' },

  // ---- LUẬT VÉT, chạy sau cùng ----
  //
  // Sau đợt sửa đầu còn 25 biến thể lẻ của "tuyên ngôn" (thời trang, tinh tế,
  // cá tính, nghệ thuật, ngắn gọn, "lời tuyên ngôn nhẹ nhàng"…) và 9 biến thể
  // của "lựa chọn lý tưởng" không có chữ "là" đứng ngay trước. Mỗi cái một câu,
  // không cái nào lặp — nhưng phép thay thì giống hệt nhau ở mọi chỗ và không
  // đụng vào ngữ pháp quanh nó, nên vét được bằng luật.
  { ten: 'tuyen-ngon-vet-cuoi', tim: /(?:lời\s+)?tuyên\s+ngôn(?![a-zà-ỹ])/gi, thay: 'dấu ấn' },
  // GIỮ kiểu chữ gốc. Cờ /i làm mẫu khớp cả "Lựa chọn hoàn hảo" đầu câu lẫn
  // "Là Lựa Chọn Hoàn Hảo" trong tiêu đề Title Case; thay bằng chuỗi viết
  // thường cứng thì đầu câu mất chữ hoa và tiêu đề gãy kiểu. Bắt lại hai chữ
  // đầu rồi lắp lại đúng như cũ.
  //
  // Bỏ qua khi ngay sau là dấu hỏi — đó là tiêu đề dạng câu hỏi ("…Là Lựa Chọn
  // Hoàn Hảo?"), cắt tính từ xong còn "Là Lựa Chọn?" cụt nghĩa. Một chỗ, sửa
  // tay trong bang-phong.mjs.
  {
    ten: 'lua-chon-vet-cuoi',
    tim: /([Ll])ựa\s+([Cc])họn\s+(?:lý tưởng|hoàn hảo|đầu bảng)(?![a-zà-ỹ])(?!\s*\?)/gi,
    thay: (_m, a, b) => `${a}ựa ${b}họn`,
  },
  { ten: 'dinh-cao-vet', tim: /\s+đỉnh\s+cao(?![a-zà-ỹ])/g, thay: '' },
  // Còn 8 chỗ nữa nằm trong TIÊU ĐỀ H2, viết hoa đầu cụm: "Da Alligator – Đỉnh
  // cao của vật liệu thủ công xa xỉ". Mẫu ở trên đòi chữ thường nên không thấy.
  // Lookahead chữ thường để không đụng "đỉnh cao của KOI Leather" (đã xử ở luật
  // dinh-cao-truoc-cua, ở đó phải giữ chữ "của").
  { ten: 'dinh-cao-tieu-de', tim: /[Đđ]ỉnh\s+cao\s+(?:của\s+)?(?=[a-zà-ỹ])/g, thay: '' },
];
