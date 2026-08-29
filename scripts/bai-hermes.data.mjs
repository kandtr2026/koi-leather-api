/**
 * VIẾT LẠI 4 BÀI BLOG LẤY TÊN HERMÈS LÀM CHỦ THỂ.
 *
 * Chủ shop giao lại quyết định 30/08/2026 ("m xem xét tự quyết định đi"). Đây là
 * quyết định và lý lẽ, để sau này ai đọc cũng biết vì sao chọn thế.
 *
 * ============================ QUYẾT ĐỊNH ============================
 * GIỮ cả 4 bài, KHÔNG xoá, KHÔNG noindex. Đổi CHỦ THỂ của bài: từ "túi Hermès
 * da X" sang "da X".
 *
 * Vì sao không xoá: bài viết về da Epsom, da Togo, da đà điểu là chuyện KOI có
 * thẩm quyền nói — họ bán đúng những loại da đó. Xoá là mất traffic mà chẳng an
 * toàn hơn, vì rủi ro không nằm ở chỗ bài tồn tại.
 *
 * Vì sao không noindex: mất traffic Y NHƯ xoá, mà chữ vẫn còn nguyên cho người
 * xét rủi ro của cổng thanh toán đọc. Tệ cả hai đầu.
 *
 * Vì sao đổi chủ thể là đủ: rủi ro nằm ở chỗ trang ĐỌC RA thành "KOI bán túi
 * Hermès" — tiêu đề, thẻ meta, và cụm "túi Hermès da Epsom" lặp lại như tên món
 * đang bán. Đổi chủ thể sang loại da thì bài vẫn còn, vẫn lên hạng cho người tìm
 * "da Epsom là gì", "da Togo có bền không" — và không còn xin hạng cho "túi
 * Hermès" nữa.
 *
 * ===================== GIỮ GÌ, BỎ GÌ — RANH GIỚI =====================
 * BỎ  · "túi Hermès da Epsom" dùng như TÊN MÓN ĐANG BÁN
 *     · "KOI Leather cam kết tất cả đều là dây lưng Hermes da thật" ← câu nặng
 *       nhất cả site: khai sản phẩm của mình LÀ hàng của họ
 *     · "đặt làm một chiếc thắt lưng Hermes", "dây lưng Hermes da cá sấu đặt làm"
 * GIỮ · "Hermès lựa chọn da Epsom cho nhiều thiết kế" — câu SỰ THẬT về nhà mốt,
 *       và là lý do người đọc quan tâm tới loại da này ngay từ đầu
 *     · "vừa với khoá Hermès khách đang có" — nói món hàng LẮP VÀO ĐƯỢC cái gì.
 *       Bỏ đi là khách không biết mua để làm gì.
 *
 * Nói cách khác: được phép nói VỀ họ, không được phép nói MÌNH LÀ họ.
 *
 * ========================= KHÔNG ĐỔI SLUG =========================
 * 4 slug vẫn chứa "hermes". Cùng lý lẽ với 20 slug sản phẩm: đổi slug là đổi URL
 * Google đang giữ chỉ mục, phải kèm 301. Gộp vào cùng lượt slug sau.
 */

/**
 * `phaiSachCum` — KHÔNG kiểm bằng tên nhãn trơ.
 *
 * Ba bài này CỐ Ý còn chữ "Hermès" (câu sự thật về nhà mốt), nên đặt
 * phaiSach: ['Hermès'] là bộ chặn báo đỏ ở đúng những câu được phép giữ. Thay vào
 * đó kiểm các CẤU TRÚC SỞ HỮU — "túi Hermès da", "dây lưng Hermes" — tức chỗ tên
 * nhãn đứng làm tên món. Đó mới là thứ phải sạch.
 */
export const BAI_HERMES = [
  {
    slug: 'dat-lam-day-lung-hermes',
    tieuDeCu: 'Đặt Làm Dây Lưng Hermes – Chuẩn Form, Đúng Gu, Đúng Da',
    tieuDeMoi: 'Đặt Làm Dây Thắt Lưng Da Theo Yêu Cầu – Vừa Khoá Rời Sẵn Có',
    excerptMoi:
      'Đặt làm dây thắt lưng da thủ công tại KOI Leather: đo theo vòng eo, chọn loại da, và cắt vừa khoá rời khách đang có.',
    metaDescriptionMoi:
      'Đặt làm dây thắt lưng da thật thủ công tại KOI Leather — đo chuẩn vòng eo, chọn da cá sấu / Epsom / Togo, cắt vừa khoá rời khách đang dùng.',
    vi: 'Bài NẶNG NHẤT: nhắc Hermes 41 lần và có câu "cam kết tất cả đều là dây lưng Hermes da thật". Món hàng thật là DÂY RỜI lắp vào khoá khách đã có — giữ đúng điều đó, bỏ hết chỗ nhận là hàng của họ.',
    thay: [
      // Câu nặng nhất — bỏ hẳn lời cam kết, giữ ý "da thật, không da công nghiệp".
      [
        'KOI Leather cam kết tất cả đều là dây lưng Hermes da thật, không sử dụng da công nghiệp',
        'KOI Leather cam kết tất cả đều là dây da thật, không sử dụng da công nghiệp',
      ],
      ['Đặt làm một chiếc thắt lưng Hermes mang dấu ấn cá nhân', 'Đặt làm một chiếc thắt lưng mang dấu ấn cá nhân'],
      // Cụm NGẮN, vì bản dài hơn đã không khớp do thẻ HTML chen ngang. Câu này
      // hứa giao được "chất Hermes" — vẫn là nhận mình làm ra hàng của họ.
      ['“chất” Hermes', 'form dáng ưa thích'],
    ],
    thayCum: [
      /**
       * HAI CÂU NÀY LỌT LƯỚI LƯỢT ĐẦU, chỉ thấy khi đọc trang thật trên
       * production. Chúng không có cấu trúc "dây lưng Hermes" nên bộ chặn
       * phaiSachCum không bắt, mà lại là LỜI KHAI VỀ CHẤT LƯỢNG — nặng hơn mấy
       * chỗ chỉ mượn tên:
       *   "kiểm tra tỉ mỉ trước khi giao để đảm bảo đạt chuẩn Hermes"
       *   "✅ Chuẩn form Hermes – không sai tỷ lệ"
       * Bài học: kiểm cấu trúc sở hữu là chưa đủ; còn phải đọc bằng mắt.
       */
      ['đạt chuẩn Hermes', 'đạt chuẩn xưởng'],
      ['Chuẩn form Hermes', 'Chuẩn form theo khoá'],
      ['chuẩn form Hermes', 'chuẩn form theo khoá'],
      // Vừa với khoá nào → GIỮ, chỉ chuẩn hoá cách nói.
      ['khóa phong cách Hermes', 'khoá Hermès'],
      ['form Hermes nguyên bản', 'form nguyên bản của khoá'],
      ['form dáng chuẩn phong cách Hermes', 'form dáng chuẩn theo khoá'],
      ['làm dây lưng theo form Hermes', 'làm dây lưng theo form khoá'],
      ['dây lưng theo form Hermes', 'dây lưng theo form khoá'],
      ['form dáng Hermes', 'form dáng của khoá'],
      ['theo form Hermes', 'theo form khoá'],
      // Tên nhãn đứng làm TÊN MÓN → bỏ.
      ['dây lưng Hermes da cá sấu đặt làm', 'dây lưng da cá sấu đặt làm'],
      ['Dây lưng Hermes da Epsom', 'Dây lưng da Epsom'],
      ['Dây lưng Hermes da bê', 'Dây lưng da bê'],
      ['Dây lưng Hermes da Togo', 'Dây lưng da Togo'],
      ['đặt làm dây lưng Hermes da epsom', 'đặt làm dây lưng da Epsom'],
      ['dây lưng phong cách Hermes', 'dây lưng đặt làm'],
      ['dây lưng Hermes đặt làm', 'dây lưng đặt làm'],
      ['dịch vụ đặt làm dây lưng Hermes', 'dịch vụ đặt làm dây thắt lưng'],
      ['Đặt làm dây lưng Hermes', 'Đặt làm dây thắt lưng'],
      ['đặt làm dây lưng Hermes', 'đặt làm dây thắt lưng'],
      ['Đặt Làm Dây Lưng Hermes', 'Đặt Làm Dây Thắt Lưng'],
      ['đặt làm dây nịt Hermes', 'đặt làm dây thắt lưng'],
      ['đặt làm thắt lưng Hermes', 'đặt làm thắt lưng da'],
      ['thắt lưng Hermes', 'thắt lưng da'],
      ['Thắt lưng Hermes', 'Thắt lưng da'],
      ['dây lưng Hermes', 'dây lưng da'],
      ['dây nịt Hermes', 'dây thắt lưng'],
      ['hệ sinh thái Hermes', 'nhóm da cao cấp'],
    ],
    phaiSachCum: [
      'dây lưng Hermes', 'dây nịt Hermes', 'thắt lưng Hermes', 'dây lưng Hermès',
      'thắt lưng Hermès', 'túi Hermes', 'túi Hermès',
    ],
  },
  {
    slug: 'tui-hermes-da-epsom',
    tieuDeCu: 'Túi Hermès Da Epsom – Vì Sao Được Giới Sưu Tầm Ưa Chuộng?',
    tieuDeMoi: 'Da Epsom – Vì Sao Giữ Form Tốt Và Ai Nên Chọn',
    excerptMoi:
      'Da Epsom là da bò dập vân nhiệt, giữ form và ổn định lâu dài. Bài viết phân tích cấu trúc, độ bền và những món đồ da phù hợp với chất liệu này.',
    metaDescriptionMoi:
      'Da Epsom là gì, vì sao giữ form tốt, bền tới đâu và phù hợp làm túi, ví, dây đồng hồ nào — góc nhìn của người làm đồ da thủ công.',
    vi: 'Đổi chủ thể từ "túi Hermès da Epsom" sang "da Epsom". Giữ các câu sự thật rằng Hermès chọn loại da này — đó là lý do người đọc quan tâm ngay từ đầu.',
    thay: [
      // Cụm NGẮN, vì bản dài đã không khớp (thẻ HTML chen ngang giữa câu).
      // Cả hai câu này sau khi bỏ tên nhà mốt thì thành vòng tròn hoặc vô nghĩa
      // — bản chạy thử in ra mới thấy, nên phải viết lại chứ không chỉ xoá chữ.
      ['gắn liền với hình ảnh thương hiệu rõ ràng như', 'có tính cách rõ ràng như'],
      ['Lấy cảm hứng từ tinh thần ổn định của', 'Với cùng tinh thần ổn định của'],
    ],
    thayCum: [
      ['túi Hermes da Epsom', 'túi da Epsom'],
      ['túi Hermès da Epsom', 'túi da Epsom'],
      ['da Epsom Hermes', 'da Epsom'],
      ['da epsom trên túi hermes', 'da Epsom trên túi'],
      ['da Epsom trên túi Hermes', 'da Epsom trên túi'],
      ['Túi Hermes da Epsom', 'Túi da Epsom'],
      ['Túi Hermès da Epsom', 'Túi da Epsom'],
      ['túi hermes da epsom', 'túi da Epsom'],
      ['Túi Hermes da epsom', 'Túi da Epsom'],
      ['da epsom được hermes ưu ái', 'da Epsom được ưa dùng'],
      ['Hermes sử dụng Epsom', 'Hermès sử dụng Epsom'],
      ['việc Hermes sử dụng Epsom', 'việc Hermès chọn Epsom'],
    ],
    phaiSachCum: ['túi Hermes da', 'túi Hermès da', 'túi hermes da'],
  },
  {
    slug: 'tui-hermes-da-togo',
    tieuDeCu: 'Túi Hermès da Togo: Những điều cần biết trước khi lựa chọn',
    tieuDeMoi: 'Da Togo: Những Điều Cần Biết Trước Khi Chọn',
    excerptMoi:
      'Da Togo có vân hạt rõ, bền, nhẹ, ít trầy xước và giữ form tốt. Bài viết phân tích đặc tính và cách chọn đồ da làm từ chất liệu này.',
    metaDescriptionMoi:
      'Da Togo là gì, vân hạt ra sao, bền và giữ form tới đâu, dùng lâu có xuống không — những điều cần biết trước khi chọn đồ da Togo.',
    vi: 'Cùng cách xử lý với bài da Epsom: chủ thể là loại da, không phải nhà mốt.',
    thay: [],
    thayCum: [
      ['túi Hermès da Togo', 'túi da Togo'],
      ['túi Hermes da Togo', 'túi da Togo'],
      ['Túi Hermès da Togo', 'Túi da Togo'],
      ['Túi Hermes da Togo', 'Túi da Togo'],
      ['da Togo Hermes', 'da Togo'],
      ['da Togo của Hermès', 'da Togo'],
      ['túi hermes da togo', 'túi da Togo'],
      ['túi Hermès', 'túi da cao cấp'],
      ['túi Hermes', 'túi da cao cấp'],
    ],
    phaiSachCum: ['túi Hermes', 'túi Hermès', 'túi hermes'],
  },
  {
    slug: 'tui-hermes-da-da-dieu',
    tieuDeCu: 'Túi Hermès da đà điểu có gì đặc biệt mà nhiều người săn tìm?',
    tieuDeMoi: 'Da Đà Điểu Có Gì Đặc Biệt Mà Nhiều Người Săn Tìm?',
    excerptMoi:
      'Da đà điểu nổi bật với vân nốt đặc trưng, chất da mềm nhẹ và độ bền cao. Bài viết phân tích vì sao chất liệu này được săn tìm và cách nhận biết da thật.',
    metaDescriptionMoi:
      'Da đà điểu có vân nốt đặc trưng, mềm nhẹ, bền lâu. Cách nhận biết da đà điểu thật và vì sao chất liệu này luôn được săn tìm trong đồ da cao cấp.',
    vi: 'Cùng cách xử lý. Vân nốt (quill) là thứ đáng nói, không phải tên nhà mốt.',
    thay: [],
    thayCum: [
      ['túi Hermès da đà điểu', 'túi da đà điểu'],
      ['túi Hermes da đà điểu', 'túi da đà điểu'],
      ['Túi Hermès da đà điểu', 'Túi da đà điểu'],
      ['Túi Hermes da đà điểu', 'Túi da đà điểu'],
      ['da đà điểu Hermès', 'da đà điểu'],
      ['da đà điểu Hermes', 'da đà điểu'],
      ['túi Hermès', 'túi da cao cấp'],
      ['túi Hermes', 'túi da cao cấp'],
    ],
    phaiSachCum: ['túi Hermes', 'túi Hermès', 'túi hermes'],
  },
];
