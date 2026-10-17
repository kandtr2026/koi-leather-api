/**
 * TỆP TẠM — dữ liệu vá thân bài 15 SP lệch loại da. Xoá sau Giai đoạn 0.
 *
 * Mỗi mục:
 *   thay[]   — mổ đúng chỗ, MỖI chuỗi phải khớp đúng 1 lần (nếu không thì dừng)
 *   chung[]  — đổi tên loại da ở các chỗ còn lại, thay tất cả
 *   chot[]   — gỡ chốt giữ chỗ, chạy SAU chung[] (dùng khi cố ý muốn giữ lại
 *              một lần nhắc tên da cũ, vd "ít canxi hơn da cá sấu")
 *   camSot[] — regex: sau khi vá, còn khớp là LỖI, dừng cả lô
 *
 * Chữ về chất da lấy từ koi_material_categories.description (bản ghi ngày
 * 27/08, 341-416 ký tự mỗi loại) — không tự nghĩ ra đặc tính da.
 */
export const DS = [
  /* ---------------- Clemence → Togo ---------------- */
  {
    slug: "vi-nu-da-da-clemence-yellow-x-steelblue",
    thay: [
      [
        "<h2><strong>Da Clemence – Mềm mại, bền đẹp và đậm chất Pháp</strong></h2>",
        "<h2><strong>Da Togo – Vân hạt đều, mềm tay, đứng phom</strong></h2>",
      ],
      [
        "<li>Da bò Clemence nhập khẩu – thuộc dòng da mềm cao cấp được ưa chuộng bởi các thương hiệu xa xỉ</li><li>Vân hạt tự nhiên, đều, mềm tay – chống trầy nhẹ, giữ form tốt</li>",
        "<li>Da bê Togo – vân hạt nhỏ đều, nổi bằng cách vần trong lồng quay nên mỗi tấm một khác</li><li>Mặt mờ, hơi nhám, không bóng – chắc tay mà không cứng, đứng phom tốt và ít nhăn gãy</li>",
      ],
      [
        "<li>Da có độ dày vừa phải – không quá cứng nhưng đủ chắc chắn khi gập</li>",
        "<li>Vân nhỏ che vết trầy khá tốt – mềm dần và lên nước nhẹ theo năm sử dụng</li>",
      ],
      [
        "<li>Chất liệu da bò Clemence cao cấp – mềm, bền, lên màu đẹp</li>",
        "<li>Chất liệu da bê Togo – chắc tay, bền, lên nước nhẹ theo thời gian</li>",
      ],
    ],
    chung: [["Da Clemence", "Da Togo"]],
    camSot: ["clemence"],
  },
  /* ---------------- Clemence → Da bò vân Mill ---------------- */
  {
    slug: "tissue-box-da-clemence-olive-x-orange",
    thay: [
      [
        "<h2><strong>Da Clemence – Mềm mại, bền bỉ và sang trọng</strong></h2>",
        "<h2><strong>Da bò vân Mill – Vân nổi tự nhiên, mềm rũ, giàu chiều sâu</strong></h2>",
      ],
      [
        "<p>Clemence leather là dòng da bê cao cấp, nổi bật với:</p>",
        "<p>Da bò vân Mill được vần lâu trong lồng quay khô cho thớ mềm ra và vân tự nổi lên, nổi bật với:</p>",
      ],
      [
        "<li>Vân tự nhiên, mềm mại nhưng có độ cứng nhẹ, giúp giữ form tốt.</li><li>Chống trầy nhẹ, ít thấm nước và dễ vệ sinh, thuận tiện để sử dụng trong phòng khách, văn phòng.</li><li>Càng dùng càng đẹp – phát triển patina bóng mờ tự nhiên theo thời gian, tôn lên giá trị sử dụng lâu dài.</li>",
        "<li>Vân to nhỏ không đều, mỗi tấm một kiểu – khác hẳn vân dập khuôn.</li><li>Vân nổi che vết trầy và vết cấn tốt, thuận tiện khi để ở phòng khách hay văn phòng.</li><li>Mềm và rũ hơn da chưa vần, cho mặt da có chiều sâu – càng dùng càng dịu mắt.</li>",
      ],
    ],
    chung: [["Da Clemence", "Da bò vân Mill"]],
    camSot: ["clemence"],
  },
  {
    slug: "balo-da-nu-da-clemence-red",
    thay: [
      [
        "<h2><strong>Da Clemence – Mềm mại, bề mặt tự nhiên, dẻo dai</strong></h2>",
        "<h2><strong>Da bò vân Mill – Vân nổi tự nhiên, mềm rũ, dẻo dai</strong></h2>",
      ],
      [
        "<li>Da bê Clemence với vân hạt to tự nhiên – mềm tay, đổ nhẹ, rất dễ chịu khi sử dụng</li>",
        "<li>Da bò vần trong lồng quay khô cho vân tự nổi – vân to nhỏ không đều, mỗi tấm một kiểu</li>",
      ],
      [
        "<li>Không bám vân tay, chống trầy xước nhẹ – phù hợp sử dụng hàng ngày</li>",
        "<li>Vân nổi che vết trầy và vết cấn tốt – phù hợp sử dụng hàng ngày</li>",
      ],
      [
        "<p>Clemence được ưa chuộng bởi độ mềm – cho cảm giác “ôm dáng” mà vẫn đứng túi, phù hợp với balo nữ có gu.</p>",
        "<p>Da vần Mill được ưa chuộng bởi độ mềm rũ – cho cảm giác “ôm dáng”, phù hợp với balo nữ có gu.</p>",
      ],
      [
        "<li>Da Clemence thật – mềm nhưng không nhão, vân tự nhiên đẹp mắt</li>",
        "<li>Da bò vân Mill thật – mềm nhưng không nhão, vân tự nhiên đẹp mắt</li>",
      ],
    ],
    chung: [
      ["Da Clemence", "Da bò vân Mill"],
      ["da Clemence", "da bò vân Mill"],
    ],
    camSot: ["clemence"],
  },
  /* ---------------- Togo → Da bò vân Mill ---------------- */
  {
    slug: "balo-da-nu-da-togo-orangered",
    thay: [
      [
        "<h2><strong>Da Togo – Đứng dáng, vân mềm, lên màu nổi bật</strong></h2>",
        "<h2><strong>Da bò vân Mill – Vân nổi tự nhiên, mềm rũ, lên màu nổi bật</strong></h2>",
      ],
      [
        "<li>Da bê Togo với đặc trưng bề mặt hạt mịn, đều và sang trọng</li><li>Mềm tay nhưng vẫn giữ form – lý tưởng cho thiết kế balo nữ gọn gàng</li>",
        "<li>Da bò vần lâu trong lồng quay khô cho vân tự nổi – vân to nhỏ không đều, mỗi tấm một kiểu</li><li>Mềm và rũ – lý tưởng cho thiết kế balo nữ dáng mềm, gọn gàng</li>",
      ],
      [
        "<li>Dễ vệ sinh, chống trầy xước nhẹ – phù hợp dùng hàng ngày, kể cả thời tiết nóng ẩm</li><li>Càng dùng càng lên patina – giúp da bóng nhẹ, tạo chiều sâu màu sang trọng</li>",
        "<li>Vân nổi che vết trầy và vết cấn tốt – phù hợp dùng hàng ngày</li><li>Mặt da giàu chiều sâu, càng dùng càng dịu mắt</li>",
      ],
      [
        "<p>Da Togo được yêu thích nhờ khả năng kết hợp giữa sự bền bỉ và mềm mại – rất hợp với phom balo hiện đại.</p>",
        "<p>Da vần Mill được yêu thích nhờ kết hợp được độ bền và độ mềm rũ – rất hợp phom balo hiện đại.</p>",
      ],
      [
        "<li>Da Togo thật – mềm nhưng chắc chắn, màu lên đều và sang</li>",
        "<li>Da bò vân Mill thật – mềm nhưng chắc chắn, màu lên đều và sang</li>",
      ],
    ],
    chung: [["Da Togo", "Da bò vân Mill"]],
    camSot: ["togo"],
  },
  {
    slug: "tote-bag-da-togo-saddlebrown",
    thay: [
      [
        "<h2><strong>Da Togo – Vân hạt đẹp, đứng form, mềm bền theo thời gian</strong></h2>",
        "<h2><strong>Da bò vân Mill – Vân nổi tự nhiên, mềm bền theo thời gian</strong></h2>",
      ],
      [
        "<li>Da bê Togo có bề mặt hạt mịn, đều, tự nhiên – vân đẹp và sang</li>",
        "<li>Da bò vần trong lồng quay khô cho vân tự nổi – vân to nhỏ không đều, mỗi tấm một kiểu</li>",
      ],
      [
        "<li>Độ dày vừa đủ – cứng cáp để giữ phom tote, mềm để không nặng vai</li>",
        "<li>Mềm và rũ hơn da chưa vần – tote xuôi dáng tự nhiên, nhẹ vai</li>",
      ],
      [
        "<li>Không bám bụi, chống xước nhẹ – giữ vẻ ngoài lâu bền khi dùng hàng ngày</li><li>Càng dùng càng bóng nhẹ – patina lên đẹp, mang nét vintage tự nhiên</li>",
        "<li>Vân nổi che vết trầy và vết cấn tốt – giữ vẻ ngoài lâu bền khi dùng hàng ngày</li><li>Mặt da giàu chiều sâu – càng dùng càng dịu mắt, mang nét mộc tự nhiên</li>",
      ],
      [
        "<p>Togo là chất liệu lý tưởng cho túi tote thủ công – đứng dáng, đẹp bền và rất “có khí chất”.</p>",
        "<p>Da vần Mill là chất liệu lý tưởng cho tote thủ công – dáng mềm, đẹp bền và rất “có khí chất”.</p>",
      ],
      [
        "<li>Da Togo thật – vân đẹp, mềm tay, đứng form</li>",
        "<li>Da bò vân Mill thật – vân đẹp, mềm tay, giàu chiều sâu</li>",
      ],
    ],
    chung: [["Da Togo", "Da bò vân Mill"]],
    camSot: ["togo"],
  },
  {
    slug: "messenger-bag-da-bo-van-togo-black",
    thay: [
      [
        "<h2><strong>Da Togo – Mềm mại, bền bỉ, giữ form tự nhiên</strong></h2>",
        "<h2><strong>Da bò vân Mill – Mềm mại, bền bỉ, vân nổi tự nhiên</strong></h2>",
      ],
      [
        "<li>Sử dụng <strong>da bò vân Togo cao cấp</strong>, vân hạt tự nhiên, đều và có chiều sâu</li>",
        "<li>Sử dụng <strong>da bò vân Mill cao cấp</strong>, vân nổi tự nhiên, mỗi tấm một kiểu và giàu chiều sâu</li>",
      ],
      [
        "<li>Giữ form ổn định nhưng không cứng, tạo cảm giác thoải mái khi đeo</li>",
        "<li>Mềm và rũ, không cứng – tạo cảm giác thoải mái khi đeo</li>",
      ],
      [
        "<li>Da bò vân Togo cao cấp – bền, đẹp và giữ form tốt</li>",
        "<li>Da bò vân Mill cao cấp – bền, đẹp, mặt da giàu chiều sâu</li>",
      ],
    ],
    chung: [["Da Togo", "Da bò vân Mill"]],
    camSot: ["togo"],
  },
  {
    slug: "tai-nghe-marshall-da-togo-brown-x-black",
    thay: [
      [
        "được độ vỏ ngoài bằng da Togo cao cấp – dòng da nổi tiếng của ngành thời trang xa xỉ –",
        "được độ vỏ ngoài bằng da bò vân Mill cao cấp – mặt da vân nổi tự nhiên, giàu chiều sâu –",
      ],
      [
        "<li>Chất liệu da Togo cao cấp: Nhập khẩu từ Pháp, có độ bền cao, vân da hạt tự nhiên, chống trầy xước, mềm mại nhưng vẫn giữ form cực tốt.</li>",
        "<li>Chất liệu da bò vân Mill cao cấp: vân nổi bằng cách vần trong lồng quay khô nên mỗi tấm một kiểu, vân nổi che vết trầy và vết cấn tốt, mềm và rũ.</li>",
      ],
      [
        "Với chất liệu da Togo đặc trưng, thợ tại",
        "Với chất liệu da bò vân Mill đặc trưng, thợ tại",
      ],
    ],
    chung: [["Da Togo", "Da bò vân Mill"]],
    camSot: ["togo"],
  },
  {
    // Thân bài này còn một lỗi thứ hai, không liên quan loại da: cả bài gọi
    // sản phẩm là "Ví Mama-Mia" (chép từ món khác) trong khi đây là Ví Da Nữ.
    // Sửa luôn vì cùng một loại lỗi — thân bài nói khác tiêu đề.
    slug: "vi-da-nu-da-togo-deeppink-crimson",
    thay: [
      [
        "Với chất liệu da Togo nhập khẩu, cùng thiết kế ví dài thanh lịch",
        "Với chất liệu da bò vân Mill, cùng thiết kế ví dài thanh lịch",
      ],
      [
        "<li>Chất liệu da Togo cao cấp: Loại da Togo nổi tiếng bởi độ mềm tay, vân hạt đều và khả năng giữ phom tốt nhưng không quá cứng. Sờ vào cho cảm giác êm ái nhưng vẫn giữ được cấu trúc sang trọng – một chất liệu được các thương hiệu thời trang cao cấp thế giới yêu thích.</li>",
        "<li>Chất liệu da bò vân Mill cao cấp: da được vần lâu trong lồng quay khô cho thớ mềm ra và vân tự nổi lên, vân to nhỏ không đều nên mỗi tấm một kiểu. Sờ vào mềm và rũ, mặt da giàu chiều sâu, vân nổi che vết trầy và vết cấn tốt.</li>",
      ],
      [
        "Ví Mama-Mia da Togo không chỉ đơn thuần là vật dụng",
        "Ví da nữ vân Mill không chỉ đơn thuần là vật dụng",
      ],
    ],
    chung: [
      ["Da Togo", "Da bò vân Mill"],
      ["Ví Mama-Mia", "Ví Da Nữ"],
      ["ví Mama-Mia", "ví da nữ"],
    ],
    camSot: ["togo", "mama-mia"],
  },
  /* ---------------- Togo → Epsom ---------------- */
  {
    slug: "vi-mama-mia-da-togo-black-brown-orange-darkred",
    thay: [
      [
        "<h2><strong>Da Togo – Mềm tay, vân hạt đều, đứng phom nhưng không cứng</strong></h2>",
        "<h2><strong>Da Epsom – Vân dập đều, nhẹ, đứng phom</strong></h2>",
      ],
      [
        "<li>Da bê Togo có vân hạt mịn, đều, tạo cảm giác sang trọng mà không quá bóng bẩy</li><li>Mềm tay, nhẹ và không trơn trượt – phù hợp khi sử dụng hàng ngày</li><li>Chống trầy xước nhẹ – bảo vệ ví khỏi những va chạm cơ bản</li>",
        "<li>Da bê Epsom có vân dập hình học đều dạng chữ thập nhỏ, mặt phủ nhẹ, không bóng bẩy</li><li>Nhẹ và đứng phom tốt nhất trong các loại da bê vân – không nhăn gãy nếp</li><li>Vân dập tán ánh sáng nên khó thấy vết trầy; nước đọng thành hạt, lau khô là sạch</li>",
      ],
      [
        "<li>Càng dùng càng lên màu bóng nhẹ – tạo hiệu ứng patina sang trọng</li>",
        "<li>Gần như không lên patina – giữ vẻ ban đầu nhiều năm</li>",
      ],
      [
        "<p>Togo là dòng da được nhiều nhà mốt cao cấp lựa chọn bởi sự cân bằng giữa tính thẩm mỹ và độ bền.</p>",
        "<p>Epsom là dòng da được chọn cho những mẫu cần đứng phom và giữ nét cạnh sắc.</p>",
      ],
      [
        "<li>Da Togo thật – mềm, bền, đẹp, càng dùng càng lên màu</li>",
        "<li>Da Epsom thật – nhẹ, bền, đứng phom, giữ vẻ ban đầu lâu</li>",
      ],
    ],
    chung: [
      ["Da Togo", "Da Epsom"],
      ["da bê Togo", "da bê Epsom"],
    ],
    camSot: ["togo"],
  },
  /* ---------------- Epsom → Saffiano ---------------- */
  {
    slug: "tui-thiet-ke-rieng-hoa-tra-da-epsom-22-x-15-pink",
    thay: [
      [
        "<h2><strong>Da Epsom – Chất liệu chuẩn mực cho thiết kế tinh tế</strong></h2>",
        "<h2><strong>Da Saffiano – Chất liệu chuẩn mực cho thiết kế tinh tế</strong></h2>",
      ],
      [
        "<p>Túi được làm từ da Epsom nhập khẩu cao cấp, nổi tiếng với những ưu điểm nổi bật:</p>",
        "<p>Túi được làm từ da Saffiano nhập khẩu cao cấp, nổi tiếng với những ưu điểm nổi bật:</p>",
      ],
      [
        "<li>Bề mặt vân ép chìm đều, chống trầy xước tốt và giữ form túi cực kỳ ổn định.</li>",
        "<li>Mặt da ép nóng thành vân chéo đan nhau rồi phủ sáp – mặt cứng, đều màu và giữ form túi cực kỳ ổn định.</li>",
      ],
      [
        "<li>Lên màu rất chuẩn, đặc biệt là các gam sáng như hồng pastel, giúp tổng thể túi luôn rực rỡ nhưng không phô trương.</li>",
        "<li>Màu lên đều tuyệt đối, đặc biệt là các gam sáng như hồng pastel, giúp tổng thể túi rực rỡ nhưng không phô trương.</li>",
      ],
      [
        "<li>Nhẹ, bền và dễ vệ sinh, phù hợp với các thiết kế nữ tính, thanh lịch.</li>",
        "<li>Vân chéo cộng lớp sáp làm vết trầy khó để lại dấu, lau khăn ẩm là sạch – phù hợp các thiết kế nữ tính, thanh lịch.</li>",
      ],
    ],
    chung: [["Da Epsom", "Da Saffiano"]],
    camSot: ["epsom"],
  },
  /* ---------------- Caviar → Saffiano ---------------- */
  {
    slug: "money-clip-da-caviar-turquoise",
    thay: [
      [
        "<li>Chất liệu da caviar cao cấp – bền chắc, chống nhăn, giữ form lâu dài.</li>",
        "<li>Chất liệu da Saffiano cao cấp – mặt cứng, chống nhăn, giữ form lâu dài.</li>",
      ],
      [
        "<p>Da Cavier là loại cao cấp, nổi tiếng bởi độ bền vượt trội:</p>",
        "<p>Da Saffiano là lớp hoàn thiện cao cấp, nổi tiếng bởi độ bền vượt trội:</p>",
      ],
      [
        "<li>Sử dụng da caviar, nổi bật với bề mặt vân hạt đặc trưng, mềm tay nhưng vẫn chắc chắn.</li>",
        "<li>Sử dụng da Saffiano – mặt ép nóng thành vân chéo đan nhau rồi phủ sáp, gần như không thấm nước.</li>",
      ],
      [
        "<h3><strong>Da thật cao cấp – Sang trọng, bền đẹp </strong></h3>",
        "<h3><strong>Da Saffiano – Mặt cứng, đều màu, không thấm nước</strong></h3>",
      ],
    ],
    chung: [["Da Caviar", "Da Saffiano"]],
    camSot: ["caviar", "cavier"],
  },
  /* ---------------- Swift → Da cừu (Lambskin) ---------------- */
  {
    slug: "vi-card-coin-da-swift-do-ruou",
    thay: [
      [
        "Chất liệu da Swift cao cấp nhập khẩu châu Âu, kết hợp tone màu đỏ rượu",
        "Chất liệu da cừu non cao cấp nhập khẩu châu Âu, kết hợp tone màu đỏ rượu",
      ],
      [
        "<li>Da Swift nhập khẩu châu Âu:<ul><li>Da mềm mịn với bề mặt lì nhẹ, tạo cảm giác mượt mà khi chạm vào.</li><li>Màu sắc lên chuẩn, đậm nét, phù hợp với tông màu đỏ rượu nổi bật.</li><li>Dễ tạo phom đẹp, vừa nhẹ vừa linh hoạt trong sử dụng hàng ngày.</li></ul></li>",
        "<li>Da cừu non nhập khẩu châu Âu:<ul><li>Vân nhỏ mịn, sờ mát và mềm – nhẹ nhất trong các loại da làm đồ.</li><li>Màu sắc lên chuẩn, đậm nét, phù hợp với tông màu đỏ rượu nổi bật.</li><li>Thớ ngắn và thưa nên mềm rũ hoàn toàn – rất nhẹ, linh hoạt cho ví nhỏ dùng hàng ngày.</li></ul></li>",
      ],
      [
        "Da Swift mềm và dễ giãn đòi hỏi sự khéo léo để giữ phom ví nhỏ gọn, tránh phồng mép hoặc lệch khóa.",
        "Da cừu mềm rũ và dễ trầy nên đòi hỏi sự khéo léo để giữ phom ví nhỏ gọn, tránh phồng mép hoặc lệch khóa.",
      ],
      [
        "<li>Da Swift thật nhập khẩu châu Âu, không pha da nhân tạo.</li>",
        "<li>Da cừu thật nhập khẩu châu Âu, không pha da nhân tạo.</li>",
      ],
    ],
    chung: [["Da Swift", "Da Cừu"]],
    camSot: ["swift"],
  },
  /* ---------------- Cá sấu → Kỳ đà ---------------- */
  {
    slug: "day-ong-ho-da-ca-sau-black",
    thay: [
      [
        "khi nói đến chất liệu da cao cấp nhất, da cá sấu thật luôn đứng đầu bảng về sự sang trọng, bền bỉ và độc bản.",
        "khi nói đến chất liệu da vảy, da kỳ đà thật luôn được chọn cho những sợi dây mảnh mà vẫn dẻo.",
      ],
      [
        "<h2><strong>Chất Liệu Da Cá Sấu Thật</strong></h2>",
        "<h2><strong>Chất Liệu Da Kỳ Đà Thật</strong></h2>",
      ],
      [
        "<p>Da cá sấu Alligator là loại da quý hiếm có xuất xứ từ Mỹ, thường được sử dụng trong các sản phẩm thời trang xa xỉ như Hermès, Patek Philippe, Cartier…</p>",
        "<p>Da kỳ đà có hoa văn vảy xếp thành vòng đặc trưng; vảy nhỏ, khít, cứng tay nhưng ít canxi hơn «CASAU» nên tấm da vẫn dẻo.</p>",
      ],
      [
        "<li>Tuyển chọn từ phần bụng cá sấu, bề mặt mềm mại, vân da đều, hạn chế trầy xước.</li>",
        "<li>Mặt vảy dày đặc che vết trầy tốt; bản bóng mát tay, bản lì thì êm hơn.</li>",
      ],
      [
        "<li>Không biến dạng, cực kỳ bền – không bong tróc hay gãy gập.</li>",
        "<li>Tấm da chỉ mỏng 0,4-0,6mm nên gần như không cần lột mỏng, gấp gọn ở món nhỏ.</li>",
      ],
      [
        "<li>Da cá sấu thật 100% – mềm mại, bền bỉ, sang trọng, không trùng lặp.</li>",
        "<li>Da kỳ đà thật 100% – dẻo, bền bỉ, vảy đặc trưng, không sợi nào trùng sợi nào.</li>",
      ],
    ],
    chung: [
      ["Da Cá Sấu", "Da Kỳ Đà"],
      ["da cá sấu", "da kỳ đà"],
    ],
    chot: [["«CASAU»", "da cá sấu"]],
    // Cố ý giữ MỘT lần nhắc "da cá sấu" trong câu so sánh độ canxi — đó là
    // cách phân biệt kỳ đà với cá sấu, không phải nhận vơ chất liệu.
    camSot: ["cá sấu(?! nên tấm da)", "alligator"],
  },
  /* ---------------- Alran + Alligator → Swift ---------------- */
  {
    // Món duy nhất phải gộp HAI khối da thành MỘT: thân bài có riêng một khối
    // "Da Alran" và một khối "Da Alligator", còn xưởng chốt loại da là Swift.
    // Xem ghi chú cuối tệp: đây là ca đáng hỏi lại xưởng nhất.
    slug: "vi-da-nam-da-de-alran-x-da-alligator-black",
    thay: [
      [
        "Với sự kết hợp giữa da dê Alran cao cấp và da cá sấu Alligator quý hiếm, cùng sắc đen lịch lãm, <strong>Ví Da Nam – Da Dê Alran x Da Alligator – Black </strong>tại",
        "Với da bê Swift mặt lì cao cấp và sắc đen lịch lãm, <strong>Ví Da Nam – Da Swift – Black </strong>tại",
      ],
      [
        '<h2><strong>Da Alran – Mềm mại, bền bỉ, màu sắc sang trọng</strong></h2>\n<p>Da dê Alran được thuộc tại Pháp và là chất liệu chuyên dùng cho nội thất của các thương hiệu túi xa xỉ như Hermès nhờ:</p>\n<ul><li>Vân da nhỏ, li ti, tự nhiên, mềm tay nhưng giữ form cực tốt</li><li>Có khả năng chống trầy xước, hạn chế bám bụi, dễ bảo quản và vệ sinh</li><li>Lên màu đẹp và giữ màu cực lâu</li><li>Càng dùng càng bóng nhẹ, đẹp theo thời gian</li></ul>\n<p>Lớp da Alran thường được dùng làm mặt trong ví – phần bạn chạm vào mỗi ngày – mang lại cảm giác mềm mại, thoải mái nhưng không hề kém bền.</p>\n<h2><strong>Da Alligator – Chất liệu đại diện cho đẳng cấp</strong></h2>\n<p>Phần mặt ngoài ví được bọc bằng da Alligator – dòng da cao cấp bậc nhất:</p>\n<ul><li>Vân da đối xứng, rõ nét, tạo hiệu ứng thị giác sang trọng, quý phái</li><li>Độ đàn hồi tốt, độ bền cực cao – không bong, không nứt dù sử dụng lâu</li><li>Mỗi chiếc ví là một sản phẩm độc bản, không trùng lặp vân da</li></ul>\n<p>Da cá sấu Alligator không chỉ thể hiện đẳng cấp mà còn là dấu ấn cá tính riêng, dành cho những ai yêu sự đầu tư nghiêm túc vào phụ kiện da.</p>',
        '<h2><strong>Da Swift – Mặt lì mịn, màu trong và sâu</strong></h2>\n<p>Ví được làm từ da bê Swift, dòng da mặt lì không dập vân:</p>\n<ul><li>Vân tự nhiên rất mịn, mặt để trần nên nhìn thẳng vào chất da</li><li>Nhuộm bán aniline nên màu ăn sâu, lên màu tươi và trong</li><li>Mềm, đàn hồi, dễ gò khối tròn và chi tiết nhỏ – rất hợp ví cỡ nhỏ</li><li>Nhẹ; không đứng phom bằng da dập vân nên ví ôm dần theo tay người dùng</li><li>Càng dùng càng bóng nhẹ; bù lại mặt trần dễ lộ trầy và vết nước hơn da vân</li></ul>\n<p>Chính vì mặt da để trần, Swift đòi hỏi thợ chọn đúng phần da đẹp và cắt cẩn thận – mỗi chiếc ví là một tấm da riêng, không tấm nào giống tấm nào.</p>\n<h2><strong>Mặt da để trần – Cách dùng và cách giữ</strong></h2>\n<p>Da mặt lì không có vân che nên mọi thứ đọng lại trên mặt da đều thấy được. Đó cũng chính là lý do dòng da này lên nước đẹp:</p>\n<ul><li>Vết trầy nhẹ trong thời gian đầu là bình thường – lau và dưỡng nhẹ là chìm dần</li><li>Tránh để ví ướt lâu: mặt trần dễ lộ vết nước hơn da dập vân</li><li>Không áp lâu vào vật dễ phai màu, nhất là bản đen phối mặt trong màu sáng</li><li>Dùng đều tay thì mặt da lên bóng nhẹ tự nhiên, không cần đánh xi</li></ul>\n<p>Giữ đúng cách, chiếc ví da Swift đen sẽ sậm và trong hơn theo từng năm – đó là phần thưởng của người chọn da mặt lì thay vì da vân.</p>',
      ],
      [
        "<p>Trên nền da Alligator và Alran, màu đen trở nên có chiều sâu và sang trọng hơn hẳn những loại da thông thường.</p>",
        "<p>Trên nền da Swift mặt lì, màu đen trở nên có chiều sâu và trong hơn hẳn da dập vân.</p>",
      ],
      [
        "<strong>Ví Da Nam – Da Dê Alran x Da Alligator – Black</strong> là sản phẩm dung hòa giữa chất liệu mềm mại – bền bỉ – và sự đẳng cấp từ vân cá sấu tự nhiên.",
        "<strong>Ví Da Nam – Da Swift – Black</strong> là sản phẩm dung hòa giữa chất da mềm mại – bền bỉ – và vẻ trong sâu của mặt da để trần.",
      ],
    ],
    camSot: ["alran", "alligator", "cá sấu"],
  },
  /* ---------------- Swift → Buttero ---------------- */
  {
    slug: "day-da-ong-ho-nato-strap-da-swift-nau-vang",
    thay: [
      [
        "chế tác thủ công từ da bò vân Swift cao cấp màu nâu vàng (Gold). Bề mặt da trơn mịn, mềm mại với độ bóng nhẹ tự nhiên, mang lại cảm giác êm ái khi đeo hàng ngày.",
        "chế tác thủ công từ da bò Buttero cao cấp màu nâu vàng (Gold). Da thuộc thực vật của xưởng Walpier vùng Tuscany, mặt lì mịn, vân tự nhiên, nhuộm aniline nên màu trong và sâu.",
      ],
      [
        "Mặt sau da có màu vàng tự nhiên, nổi bật sự chân thực của chất liệu da thuộc thủ công.",
        "Da giữ nếp và giữ cạnh rất tốt nên cạnh dây đánh bóng lên mượt; vết trầy nhẹ lúc mới sẽ chìm dần thành patina bóng sậm theo thời gian đeo.",
      ],
    ],
    camSot: ["swift"],
  },
];

/* =====================================================================
 * CÒN PHẢI HỎI XƯỞNG (không sửa được bằng dữ liệu đang có)
 * =====================================================================
 * 1) vi-da-nam-da-de-alran-x-da-alligator-black — tên gốc VÀ thân bài đều nói
 *    da dê Alran phối da Alligator, ảnh cũng là ví vân cá sấu. Tick lại là
 *    Swift. Ở đây đã sửa theo tick (chủ dự án chốt ngày 30/08), nhưng nếu
 *    xưởng xác nhận ví này thật là Alran x Alligator thì phải sửa TICK và
 *    hoàn tác món này.
 * 2) day-ong-ho-da-ca-sau-black — cùng kiểu: tên và bài ghi Cá sấu, tick Kỳ đà.
 *    Đã sửa theo tick. Bảng thông số của SP này (nếu có) cũng cần rà lại.
 * ===================================================================== */

