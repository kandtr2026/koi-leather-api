/**
 * Bảng viết tay — những câu KHÔNG giao cho luật được.
 *
 * Ba nhóm, đều đã thử viết luật và đều hỏng:
 *  - "bạn đồng hành": 14 chỗ, mỗi chỗ một cấu trúc khác ("trở thành người bạn
 *    đồng hành THANH LỊCH TRÊN CỔ TAY", "đủ đẹp để trở thành bạn đồng hành MỖI
 *    NGÀY", "là người bạn đồng hành BƯỚC RA THẾ GIỚI"). Một cụm thay chung thì
 *    chỗ nào cũng dính chữ hoặc sai nghĩa.
 *  - "biết mình là ai": 4 chỗ, cắt cụm là mất luôn chủ thể của vế.
 *  - câu dẫn blog lọt vào mô tả: 3 chỗ, trong đó một câu có TÊN SẢN PHẨM chứa
 *    dấu chấm than ("L!M ToteBag") làm mọi mẫu cắt câu đều đứt giữa chừng.
 *
 * Nguyên tắc vẫn như cũ: chỉ cắt chữ rỗng, không thêm sự kiện mới.
 */
export const BANG = [
  // ---- "bạn đồng hành" ----
  // Thẻ đóng </a> nằm SAU dấu cách ("…KOI Leather</strong> </a>sẽ là…"), nên
  // đoạn chữ thuần duy nhất dùng được là phần sau thẻ.
  {
    slug: 'vi-clutch-da-bo-nappa-da-swift-black',
    truoc: 'sẽ là người bạn đồng hành hoàn hảo.',
    sau: 'là lựa chọn phù hợp.',
  },
  { slug: 'vi-monte-xl-da-bo', truoc: 'Monte hứa hẹn sẽ trở thành người bạn đồng hành lý tưởng – từ', sau: 'Monte dùng được từ' },
  {
    slug: 'vi-da-nu-edda-x-da-ca-sau',
    truoc: 'mà còn trở thành bạn đồng hành thân thuộc, càng dùng',
    sau: 'mà càng dùng',
  },
  {
    slug: 'tui-da-nam-da-alligator-brown',
    truoc: 'xứng đáng trở thành người bạn đồng hành lâu dài, sang trọng và khác biệt của mọi quý ông hiện đại.',
    sau: 'dùng được lâu, sang và khác biệt.',
  },
  {
    slug: 'that-lung-da-nam-da-togo-midnightblue',
    truoc: 'xứng đáng trở thành người bạn đồng hành bền bỉ trong',
    sau: 'dùng bền trong',
  },
  {
    slug: 'tui-da-nam-alligator-africa-den',
    truoc: 'sẽ là người bạn đồng hành hoàn hảo.',
    sau: 'là lựa chọn phù hợp.',
  },
  {
    slug: 'passport-cover-da-butero-navy-x-darkcyan',
    truoc: 'đây là người bạn đồng hành bước ra thế giới – với phong thái lịch lãm, tự tin và đậm chất riêng.',
    sau: 'đây còn là món đi cùng mỗi chuyến đi – lịch lãm, tự tin và đậm chất riêng.',
  },
  { slug: 'tui-loom-tui-xach-da-bo', truoc: 'LOOM hứa hẹn sẽ trở thành người bạn đồng hành lý tưởng – từ', sau: 'LOOM dùng được từ' },
  {
    slug: 'day-da-ong-ho-da-alligator-white',
    truoc: 'xứng đáng trở thành người bạn đồng hành thanh lịch trên cổ tay',
    sau: 'là lựa chọn thanh lịch cho cổ tay',
  },
  {
    slug: 'tote-bag-da-togo-saddlebrown',
    truoc: 'mà là người bạn đồng hành bền bỉ với bạn trong mọi',
    sau: 'mà còn bền bỉ trong mọi',
  },
  {
    slug: 'passport-cover-da-pueblo-rosybrown',
    truoc: '– như một người bạn đồng hành, bền bỉ và giàu ký ức.',
    sau: '– bền bỉ và giàu ký ức.',
  },
  {
    slug: 'natawell-bag-da-togo-black',
    truoc: 'đủ đẹp để trở thành bạn đồng hành mỗi ngày.',
    sau: 'đủ đẹp để dùng mỗi ngày.',
  },
  {
    slug: 'vi-nu-gap-da-taurillon-black-x-moccasin',
    truoc: 'mà còn bền – một người bạn đồng hành đẳng cấp theo năm tháng.',
    sau: 'mà còn bền theo năm tháng.',
  },

  // ---- "biết mình là ai" ----
  {
    slug: 'vi-nu-long-wallet-da-alligator-darkred-x-dimgray',
    truoc: 'tất cả đều toát lên khí chất của một người phụ nữ biết mình là ai và luôn nổi bật đúng cách.',
    sau: 'tất cả đều được làm kỹ.',
  },
  {
    slug: 'vi-da-nam-da-be-red',
    truoc: 'nó dành cho những người biết mình là ai và không cần phô trương để nổi bật.',
    sau: 'nó dành cho người thích sự kín đáo.',
  },
  {
    slug: 'phonecase-p-lung-pueblo-mix-color',
    truoc: 'là lựa chọn của những người biết rõ mình là ai và không ngại thể hiện điều đó.',
    sau: 'dành cho người thích sự khác biệt.',
  },
  {
    slug: 'phonecase-p-lung-da-pueblo-mix-color',
    truoc: 'là lựa chọn của những người biết rõ mình là ai và không ngại thể hiện điều đó.',
    sau: 'dành cho người thích sự khác biệt.',
  },

  // ---- tiêu đề dạng câu hỏi ----
  // "Là Lựa Chọn Hoàn Hảo?" mà chỉ cắt tính từ thì còn "Là Lựa Chọn?" — cụt.
  // Viết lại cả tiêu đề cho thành một câu hỏi bình thường.
  {
    slug: 'boc-keyboard-da-bo-olive',
    truoc: 'Vì Sao Bọc Da Keyboard Của KOI Leather Là Lựa Chọn Hoàn Hảo?',
    sau: 'Vì Sao Nên Chọn Bọc Da Keyboard Của KOI Leather?',
  },
  {
    slug: 'lipstick-case-da-bo-darkred',
    truoc: 'Vì Sao Lipstick Case Từ KOI Leather Là Lựa Chọn Hoàn Hảo?',
    sau: 'Vì Sao Nên Chọn Lipstick Case Của KOI Leather?',
  },

  // ---- tiêu đề H2 viết Title Case ----
  // Luật vét dùng mẫu chữ thường nên không thấy nhóm này. Chỉ 5 chỗ, và mỗi
  // tiêu đề phải giữ đúng kiểu Title Case của nó nên viết tay gọn hơn viết luật.
  {
    slug: 'clutch-da-nam-alligator-henglong-black',
    truoc: 'Da Cá Sấu Alligator Henglong – Đỉnh Cao Của Da Thượng Hạng',
    sau: 'Da Cá Sấu Alligator Henglong',
  },
  {
    slug: 'that-lung-da-nam-da-alligator-henglong-black',
    truoc: 'Da Alligator – Đỉnh Cao Của Dòng Da Thủ Công Cao Cấp',
    sau: 'Da Alligator – Dòng Da Thủ Công Cao Cấp',
  },
  {
    slug: 'that-lung-da-nam-da-alligator-black',
    truoc: 'Da Alligator – Đỉnh Cao Của Dòng Da Thủ Công Cao Cấp',
    sau: 'Da Alligator – Dòng Da Thủ Công Cao Cấp',
  },
  // (that-lung-da-nam-da-alligator-black-1 KHÔNG có tiêu đề này — em đã thêm
  // theo slug cắt cụt trong bản in màn hình rồi kiểm lại thấy sai, nên bỏ.)
  {
    slug: 'that-lung-da-nu-da-alligator-himalaya-white-x-sandybrown',
    truoc: 'Da Cá Sấu Himalaya – Biểu Tượng Của Giới Thượng Lưu',
    sau: 'Da Cá Sấu Himalaya',
  },
  {
    slug: 'kep-tien-da-bo-van-caviar-en-money-clip-quilted',
    truoc: 'mang đậm phong cách cổ điển thượng lưu.',
    sau: 'mang đậm phong cách cổ điển.',
  },

  // ---- câu dẫn blog lọt vào mô tả sản phẩm ----
  // Tên sản phẩm nằm trong <strong> ngay giữa câu, nên phải khớp cả thẻ.
  {
    slug: 'lm-totebag-tui-tote-da-bo-nappa-2-side-reverse',
    truoc: ' Hãy cùng KOI Leather tìm hiểu về sản phẩm <strong>L!M ToteBag </strong>qua bài viết dưới đây.',
    sau: '',
  },
  {
    slug: 'bifold-wallet-vi-nam-da-da-dieu',
    truoc: ' Hãy cùng <strong>KOI Leather</strong> – thương hiệu đồ da cao cấp hàng đầu Việt Nam – khám phá ngay dưới đây.',
    sau: '',
  },
  {
    slug: 'phonecase-p-lung-da-alligator-whitesmoke',
    truoc: 'Hãy cùng khám phá một sự kết hợp tinh tế giữa sự sang trọng và sự tỉ mỉ trong ốp điện thoại da cá sấu thủ công.',
    sau: 'Ốp điện thoại da cá sấu, làm thủ công và tỉ mỉ.',
  },
];
