/**
 * ĐỔI TÊN SẢN PHẨM MANG NHÃN HIỆU NGƯỜI KHÁC → tên theo KIỂU DÁNG.
 *
 * Chủ shop chốt 29/08/2026: "Dài hạn — đổi tên hàng sang tên kiểu dáng. Kiểu
 * dáng không ai độc quyền được; tên riêng thì có." Tệp này là bản chốt đó.
 *
 * ================================ PHẠM VI ================================
 * Quét 514 sản phẩm chưa xoá, tìm nhãn hiệu trong CẢ 5 trường (name, slug,
 * description, metaTitle, metaDescription) — không chỉ `name`. Vì sao: đổi tên
 * mà thân bài vẫn viết "Bao da iPhone Chanel Quilted được nghệ nhân KOI chế
 * tác…" thì chẳng đổi được gì. Google đọc thân bài, và người xét rủi ro của cổng
 * thanh toán đọc cả trang chứ không đọc riêng H1.
 *
 * Kết quả quét: 118 sản phẩm có nhắc nhãn hiệu. Chia ba mức, xử lý khác nhau:
 *
 *  MỨC 1 — NHẬN LÀ HÀNG CỦA HỌ. Tên hoặc thân bài định vị món hàng là mẫu của
 *    một nhà mốt: "Belt LV", "Ví Chanel", "Túi Constance Slim mini", "lấy cảm
 *    hứng từ dòng Classic Flap", "chiếc dây nịt Montblanc". → SỬA, tệp này.
 *
 *  MỨC 2 — VỪA VỚI MÁY NÀO (nominative use). "dây da cho Rolex, Omega, Patek
 *    Philippe", "bọc da cho tai nghe Marshall", "bao chìa khoá Ford", "dây thay
 *    thế khoá Montblanc". → GIỮ TRONG THÂN BÀI. Đây là cách nói hợp lý và duy
 *    nhất mà khách hiểu được: người tìm "dây da cho Rolex" cần biết dây vừa với
 *    Rolex. Bỏ đi là bỏ luôn khách. Nhưng KHÔNG để trên H1 — xem `tenMoi` của
 *    day-lung-taiga.
 *
 *  MỨC 3 — TÊN LOẠI DA. Epsom, Togo, Swift, Clemence, Box Calf, Caviar,
 *    Saffiano, Taiga, Epi. → GIỮ NGUYÊN HẾT. Đây là tên VÂN DA mà mọi xưởng
 *    thuộc da trên thế giới bán dưới đúng những cái tên đó; khách tìm hàng bằng
 *    chính chúng. Bỏ là catalogue mất đường tìm mà chẳng giảm rủi ro nào: rủi ro
 *    nằm ở chỗ NHẬN LÀ HÀNG CỦA HỌ, không nằm ở chỗ gọi đúng tên vân da.
 *    (Epsom/Togo/Swift/Clemence/Box Calf gốc Hermès, Saffiano gốc Prada, Taiga
 *    và Epi gốc Louis Vuitton — nay đều là từ chung của ngành.)
 *
 * ============================== KHÔNG ĐỔI SLUG ==============================
 * 20 slug còn chứa nhãn hiệu (vi-chanel, belt-lv, tui-loewe-hammock…). Lượt này
 * CỐ Ý KHÔNG chạm. Đổi slug là đổi URL Google đang giữ chỉ mục — phải kèm 301
 * trong next.config.ts của koi-storefront, và sai một dòng là một địa chỉ đang
 * có hạng thành 404. Tách thành lượt riêng, verify từng đường sau khi deploy.
 * Danh sách nằm ở SLUG_CON_NHAN_HIEU cuối tệp.
 *
 * ĐỔI TÊN THÌ HOÀN TÁC ĐƯỢC (tenCu nằm ngay đây, và script chụp bản gốc trước
 * khi ghi). ĐỔI SLUG THÌ KHÔNG — link ngoài và chỉ mục đã trỏ vào đường cũ.
 * Đó là lý do hai việc không đi cùng một commit.
 */

/**
 * `muc`:
 *   'xoa'      — chỉ bỏ chữ nhãn hiệu, phần còn lại của tên đã tả đúng món
 *   'ten-moi'  — tên cũ KHÔNG CÓ GÌ ngoài nhãn hiệu, phải đặt tên từ kiểu dáng
 *   'than-bai' — tên đã sạch, chỉ sửa thân bài
 *
 * `thay`: các cặp [tìm, thay] áp vào description + metaTitle + metaDescription.
 *   Thay theo CHUỖI THẬT chứ không regex chung: "Chanel" trong "phong cách
 *   Chanel kinh điển" và trong "Bao Da iPhone Chanel" cần hai câu khác nhau.
 *
 * `phaiSach`: nhãn hiệu phải biến mất khỏi MỌI trường sau khi sửa. Script kiểm
 *   lại sau khi thay; còn sót là dừng, không ghi.
 */
export const DOI_TEN = [
  /* ------------------------------ MỨC 1 · xoá ------------------------------ */
  {
    slug: 'day-da-ong-ho-hermes-da-be-epsom-cream',
    muc: 'xoa',
    tenCu: 'Dây Da Đồng Hồ Hermes – Da Bê Epsom – Cream',
    tenMoi: 'Dây Da Đồng Hồ – Da Bê Epsom – Cream',
    vi: 'Bỏ "Hermes" khỏi H1. "Da Bê Epsom" giữ lại — đó là tên vân da, không phải tên hãng.',
    thay: [
      ['Dây Đồng Hồ Nữ Da Bê Epsom phong cách Hermes', 'Dây Đồng Hồ Nữ Da Bê Epsom'],
      ['Dây Da Đồng Hồ Hermes', 'Dây Da Đồng Hồ'],
    ],
    thayNhan: [
      ['xa xỉ của Hermes', 'xa xỉ'],
      ['các dòng túi Hermès', 'các dòng túi da'],
      ['Dáng dây Hermes', 'Dáng dây'],
      ['phong cách Hermes', 'phong cách tối giản'],
    ],
    phaiSach: ['Hermes', 'Hermès'],
  },
  {
    slug: 'tui-da-nu-celine-da-swift-black',
    muc: 'xoa',
    tenCu: 'Túi Da Nữ Celine – Da Swift – Black',
    tenMoi: 'Túi Da Nữ Phom Mềm – Da Swift – Black',
    vi: 'Thân bài đã tả "phom dáng mềm mại, thiết kế tối giản" — lấy đúng chữ đó thay cho tên hãng.',
    thay: [
      ['Túi Da Nữ Celine – Da Swift – Black', 'Túi Da Nữ Phom Mềm – Da Swift – Black'],
      ['đúng tinh thần thiết kế Celine', 'đúng tinh thần thiết kế tối giản'],
    ],
    thayNhan: [
      ['Thiết kế Celine', 'Thiết kế tối giản'],
      ['Celine Bag', 'túi da nữ phom mềm'],
      ['Celine', 'mẫu túi này'],
    ],
    phaiSach: ['Celine', 'Céline'],
  },
  {
    slug: 'tui-crossbody-da-bo-van-togo-xanh-navy-phong-cach-celine-dion',
    muc: 'xoa',
    tenCu: 'Túi Crossbody Da Bò Vân Togo Xanh Navy – Phong Cách Celine Dion',
    tenMoi: 'Túi Crossbody Da Bò Vân Togo – Xanh Navy',
    vi: '"Celine Dion" là tên một người thật, không phải kiểu dáng. Bỏ cả cụm "Phong Cách …".',
    thay: [
      ['sản phẩm thủ công cao cấp mang phong cách Celine Dion', 'sản phẩm thủ công cao cấp phom gọn tối giản'],
      ['Túi Crossbody Da Bò Vân Togo Xanh Navy – Phong Cách Celine Dion', 'Túi Crossbody Da Bò Vân Togo – Xanh Navy'],
    ],
    phaiSach: ['Celine', 'Céline'],
  },
  {
    slug: 'tui-deo-cheo-prada-xanh-reu',
    muc: 'xoa',
    tenCu: 'túi đeo chéo Prada xanh rêu',
    tenMoi: 'Túi Đeo Chéo Nam – Da Epsom – Xanh Rêu',
    vi: 'Thân bài tả rõ: túi đeo chéo cho nam, da Epsom. Tên mới chỉ nói đúng thứ đó.',
    thay: [['túi đeo chéo Prada', 'túi đeo chéo nam']],
    thayNhan: [['túi đeo chéo Prada', 'túi đeo chéo nam']],
    phaiSach: ['Prada'],
  },
  {
    slug: 'versace-watchstraps-da-ky-a-blue',
    muc: 'xoa',
    tenCu: 'Versace WatchStraps – Da Kỳ Đà – Blue',
    tenMoi: 'Dây Đồng Hồ Da Kỳ Đà – Blue',
    vi: 'Da kỳ đà là thứ đáng nói ở đây, không phải tên hãng.',
    thay: [
      ['Versace WatchStraps – Da Kỳ Đà – Blue', 'Dây Đồng Hồ Da Kỳ Đà – Blue'],
      [
        'là lựa chọn dành cho những ai yêu thích phong cách thời trang táo bạo và cá tính đặc trưng của Versace',
        'là lựa chọn dành cho những ai yêu thích phong cách táo bạo và cá tính',
      ],
    ],
    thayNhan: [
      ['đồng hồ Versace', 'đồng hồ'],
      ['Phong cách Versace', 'Phong cách riêng'],
    ],
    phaiSach: ['Versace'],
  },
  {
    slug: 'that-lung-montblance-da-epsom-black',
    muc: 'xoa',
    tenCu: 'Thắt Lưng Montblance – Da Epsom – Black',
    tenMoi: 'Thắt Lưng Nam – Da Epsom – Black',
    vi: 'Thân bài đang gọi thẳng "chiếc dây nịt Montblanc" — tức nhận là hàng của họ. Nhắc 6 lần, mỗi lần dùng tên hãng thay cho tên món.',
    thay: [
      ['Thắt lưng Montblance da Epsom', 'Thắt lưng nam da Epsom'],
      ['Thắt Lưng Montblance', 'Thắt Lưng Nam'],
    ],
    thayNhan: [
      // Cụm ĐẦU CÂU đặt trước: khớp không phân biệt hoa thường nên nếu để cụm
      // chung chạy trước, "Thắt lưng Montblanc da Epsom là lựa chọn…" thành
      // "thắt lưng da Epsom…" — chữ thường ngay sau dấu chấm.
      ['Thắt lưng Montblanc da Epsom là', 'Thắt lưng nam da Epsom là'],
      ['dây nịt Montblanc', 'dây nịt'],
      ['thắt lưng Montblanc', 'thắt lưng'],
    ],
    phaiSach: ['Montblanc', 'Montblance', 'Mont Blanc'],
  },
  {
    slug: 'bao-da-iphone-chanel-da-epsom-mau-o-burgundy-quilted',
    muc: 'xoa',
    tenCu: 'Bao Da iPhone Chanel Da Epsom Màu Đỏ Burgundy – Quilted',
    tenMoi: 'Bao Da iPhone Chần Trám – Da Epsom – Đỏ Burgundy',
    vi: 'Thay tên hãng bằng KỸ THUẬT làm ra nó: chần trám. Đó cũng là danh mục món này đang nằm (may-tram-chan).',
    thay: [
      ['Bao da iPhone Chanel Quilted', 'Bao da iPhone chần trám'],
      [
        'Thiết kế lấy cảm hứng từ dòng Classic Flap huyền thoại với đường chần chéo diamond quilting đều tay',
        'Thiết kế nắp gập với đường chần chéo hình thoi đều tay',
      ],
    ],
    thayNhan: [
      ['kiểu dáng Chanel Classic quilted', 'kiểu dáng chần trám'],
      ['Bao da iPhone Chanel', 'Bao da iPhone chần trám'],
    ],
    phaiSach: ['Chanel', 'Classic Flap'],
  },
  {
    slug: 'bao-da-iphone-da-epsom-phoi-mau-noir-rouge-h-hoa-tiet-ngua',
    muc: 'xoa',
    tenCu: 'Bao Da iPhone Da Epsom Phối Màu Noir – Rouge H Họa Tiết Ngựa',
    tenMoi: 'Bao Da iPhone Da Epsom Phối Đen – Đỏ Bordeaux, Hoạ Tiết Ngựa',
    vi: '"Rouge H" là tên MÀU riêng của Hermès. Màu thật là đỏ bordeaux — thân bài đã tự ghi thế trong ngoặc.',
    thay: [['Rouge H (đỏ bordeaux)', 'đỏ bordeaux']],
    thayNhan: [
      ['Noir (đen) và Rouge H', 'đen và đỏ bordeaux'],
      ['Rouge H', 'đỏ bordeaux'],
    ],
    phaiSach: ['Rouge H'],
  },

  /* ---------------------------- MỨC 1 · tên mới ---------------------------- */
  {
    slug: 'belt-lv',
    muc: 'ten-moi',
    tenCu: 'Belt LV',
    tenMoi: 'Thắt Lưng Nam – Da Epsom – Đen, Khoá Chốt',
    vi: 'Tên cũ không tả gì. Thân bài: "khóa dạng chốt kim loại mạ sáng bóng, tạo hình tối giản" — khoá chốt là kiểu dáng, ai cũng làm được.',
    thay: [['Dây lưng nam BELT', 'Thắt lưng nam da Epsom']],
    phaiSach: ['LV', 'Louis Vuitton'],
  },
  {
    slug: 'belt-lv-1',
    muc: 'ten-moi',
    tenCu: 'Belt LV',
    tenMoi: 'Thắt Lưng Nam Vân Ô Vuông – Khoá Chữ',
    vi: 'Thân bài: "họa tiết ô vuông đặc trưng", "khóa kim loại hình chữ cái cách điệu". Hai chi tiết đó là tên món.',
    thay: [],
    phaiSach: ['LV', 'Louis Vuitton'],
    canhBao:
      'Thân bài món này ghi "da tổng hợp" nhưng materialCategory ghi Epsom (da bê thật), giá 4.800.000₫. Một trong hai đang sai — đây là lời khai về CHẤT LIỆU nên nặng hơn lỗi SEO. Không sửa ở lượt này vì phải hỏi xưởng; đã ghi vào việc D-loai-da-lech.',
  },
  {
    slug: 'clutch-lv',
    muc: 'ten-moi',
    tenCu: 'Clutch LV',
    tenMoi: 'Clutch Da Bò Ý Phom Đứng – Xám',
    vi: 'Thân bài: "kiểu dáng chữ nhật đứng phom cứng cáp", da bò Ý thuộc thảo mộc, màu xám.',
    thay: [],
    phaiSach: ['LV', 'Louis Vuitton'],
  },
  {
    slug: 'day-lung-cartier',
    muc: 'ten-moi',
    tenCu: 'dây lưng cartier',
    tenMoi: 'Thắt Lưng Nam Da Bò – Khoá Vuông Bo Góc – Đen',
    vi: 'Thân bài: "khóa kim loại hình vuông bo góc được đánh bóng", mặt ngoài đen mặt trong nâu.',
    thay: [['Dây lưng Cartier được chế tác', 'Thắt lưng nam được chế tác']],
    phaiSach: ['Cartier'],
  },
  {
    slug: 'tui-celine-dion',
    muc: 'ten-moi',
    tenCu: 'Túi Celine Dion',
    tenMoi: 'Túi Đeo Chéo Da Vân Hạt – Navy',
    vi: 'Thân bài: "dáng chữ nhật thẳng", "quai đeo mảnh, có thể điều chỉnh", da vân hạt, navy.',
    thay: [['Túi Celine Dion là mẫu túi thời trang', 'Túi đeo chéo da vân hạt là mẫu túi thời trang']],
    phaiSach: ['Celine', 'Céline'],
  },
  {
    slug: 'tui-constance-slim-mini',
    muc: 'ten-moi',
    tenCu: 'Túi Constance Slim mini',
    tenMoi: 'Túi Đeo Chéo Nắp Gập – Da Epsom',
    vi: '"Constance" là tên mẫu túi của Hermès. Thân bài còn tả "khoá cài kim loại hình chữ H" — chữ H cũng là dấu của họ, phải bỏ nốt.',
    thay: [
      ['Đây là túi Constance Slim mini được làm từ', 'Đây là túi đeo chéo nắp gập được làm từ'],
      ['khoá cài kim loại hình chữ H mạ vàng', 'khoá cài kim loại mạ vàng'],
    ],
    thayNhan: [['hình chữ H mạ vàng', 'mạ vàng']],
    phaiSach: ['Constance', 'chữ H'],
  },
  {
    slug: 'tui-loewe-hammock',
    muc: 'ten-moi',
    tenCu: 'Túi Loewe Hammock',
    tenMoi: 'Túi Da Phom Lục Giác – Đen',
    vi: 'Thân bài: "kiểu dáng đặc biệt hình lục giác". Đó là hình khối, không ai độc quyền được.',
    thay: [],
    phaiSach: ['Loewe', 'Hammock'],
  },
  {
    slug: 'loewe-hammock-hobo-bag-da-togo-navy',
    muc: 'ten-moi',
    tenCu: 'Loewe Hammock Hobo Bag – Da Togo – Navy',
    tenMoi: 'Túi Hobo Dây Võng – Da Togo – Navy',
    vi: '"Hobo" là tên kiểu túi chung của ngành; "dây võng" là dịch nghĩa cách quai rủ, tả đúng phom mà không mượn tên ai.',
    thay: [['Loewe Hammock Hobo Bag – Da Togo – Navy', 'Túi Hobo Dây Võng – Da Togo – Navy']],
    thayNhan: [
      ['Loewe Hammock Hobo Bag', 'Túi Hobo Dây Võng'],
      ['Loewe Hammock', 'Túi Hobo Dây Võng'],
    ],
    phaiSach: ['Loewe', 'Hammock'],
  },
  {
    slug: 'tui-lot-birkin',
    muc: 'ten-moi',
    tenCu: 'Túi lót Birkin',
    tenMoi: 'Túi Lót Định Hình Cho Túi Xách – Kem',
    vi: 'Món này là tấm lót đặt TRONG một túi khác. Tên mới nói đúng công dụng; kích thước vừa túi nào thì để thân bài nói.',
    thay: [
      ['Túi lót Birkin là sản phẩm', 'Túi lót định hình là sản phẩm'],
      ['phù hợp với cấu trúc túi Birkin', 'phù hợp với cấu trúc túi xách phom đứng'],
    ],
    thayNhan: [
      ['form túi Birkin', 'form túi xách phom đứng'],
      ['túi Birkin', 'túi xách phom đứng'],
    ],
    phaiSach: ['Birkin'],
  },
  {
    slug: 'tui-tote-chanel',
    muc: 'ten-moi',
    tenCu: 'Túi tote Chanel',
    tenMoi: 'Túi Tote Da Bò Ý – Quai Da Phối Xích – Đen',
    vi: 'Thân bài: "quai đeo sử dụng dây da kết hợp xích kim loại", tote vát nhẹ miệng túi.',
    thay: [],
    phaiSach: ['Chanel'],
  },
  {
    slug: 'tui-tote-longchamp-da-bo-van-togo-nau-chocolate',
    muc: 'ten-moi',
    tenCu: 'Túi Tote Longchamp Da Bò Vân Togo Nâu Chocolate',
    tenMoi: 'Túi Tote Da Bò Vân Togo – Nâu Chocolate',
    vi: 'Bỏ tên hãng, giữ đủ chất liệu và màu — vốn đã là phần tả thật của tên cũ.',
    thay: [
      ['Túi Tote Longchamp – Da Bò – Nâu Chocolate', 'Túi Tote Da Bò Vân Togo – Nâu Chocolate'],
      ['Túi Tote Longchamp Da Bò Vân Togo Nâu Chocolate', 'Túi Tote Da Bò Vân Togo – Nâu Chocolate'],
      ['Túi Tote Longchamp', 'Túi Tote Da Bò'],
    ],
    phaiSach: ['Longchamp'],
  },
  {
    slug: 'vi-chanel',
    muc: 'ten-moi',
    tenCu: 'Ví Chanel',
    tenMoi: 'Ví Nữ Chần Trám – Hoa Nổi – Đen',
    vi: 'Thân bài: "đường chỉ may dạng đường chéo tạo thành từng ô", "chi tiết hoa nổi da cùng màu". Chần trám + hoa nổi là tên món.',
    thay: [],
    phaiSach: ['Chanel'],
  },
  {
    slug: 'op-lung-iphone-15pro-goyard',
    muc: 'ten-moi',
    tenCu: 'Ốp lưng iphone 15pro Goyard',
    tenMoi: 'Ốp Lưng iPhone 15 Pro – Da Bò Thảo Mộc Phối Vải',
    vi: '"iPhone 15 Pro" GIỮ LẠI — đó là máy mà ốp vừa, khách tìm bằng chính chữ đó (mức 2). Chỉ bỏ "Goyard".',
    thay: [],
    phaiSach: ['Goyard'],
  },
  {
    slug: 'day-lung-taiga-den-day-thay-the-mont-blanc-ko-gom-buckle-zin-cua-hang',
    muc: 'ten-moi',
    tenCu: 'Dây lưng taiga đen - Dây thay thế Mont Blanc (Ko gồm buckle zin của hãng)',
    tenMoi: 'Dây Thắt Lưng Thay Thế – Da Taiga Đen (Không Kèm Khoá)',
    vi: 'Đây là dây rời bán cho người đã CÓ khoá — nói được là thay thế cho khoá nào mới bán được. Nhưng chuyện tương thích thuộc thân bài, không thuộc H1: H1 mang tên hãng trông như hàng của hãng.',
    thay: [],
    phaiSach: [],
    canhBao:
      'CỐ Ý GIỮ "Montblanc" trong thân bài (mức 2 — nói dây vừa với khoá nào). Bỏ hẳn là khách không biết mua để làm gì. Chỉ rút khỏi tên.',
  },

  /* --------------------------- MỨC 1 · chỉ thân bài ---------------------------
   * Tên đã sạch, nhưng thân bài đang định vị món hàng là bản sao. Đây là chỗ dễ
   * bỏ sót nhất: nhìn danh sách sản phẩm trong admin thì thấy tên ổn cả.        */
  {
    slug: 'vi-nu-da-da-carvia-black',
    muc: 'than-bai',
    tenCu: 'Ví Nữ Da – Da Carvia – Black',
    tenMoi: 'Ví Nữ Da – Da Carvia – Black',
    vi: 'Câu MỞ ĐẦU thân bài: "mang hơi thở cổ điển của dòng ví Chanel mini". Câu đầu là câu Google trích và khách đọc trước nhất.',
    thay: [
      [
        'là thiết kế mang hơi thở cổ điển của dòng ví Chanel mini, sử dụng',
        'là thiết kế nhỏ gọn mang hơi thở cổ điển, sử dụng',
      ],
    ],
    phaiSach: ['Chanel'],
  },
  {
    slug: 'tui-xach-nu-da-bo-swift-en-phong-cach-chanel',
    muc: 'than-bai',
    tenCu: 'Túi Xách Nữ Chần Trám – Da Cừu – Đen',
    tenMoi: 'Túi Xách Nữ Chần Trám – Da Cừu – Đen',
    vi: 'Tên đã đổi sang kiểu dáng từ trước, nhưng thân bài vẫn "lấy cảm hứng từ phong cách Chanel kinh điển" và slug vẫn còn "chanel".',
    thay: [
      [
        'Thiết kế lấy cảm hứng từ phong cách Chanel kinh điển với các đường quilted hình thoi nổi bật',
        'Thiết kế chần trám với các đường quilted hình thoi nổi bật',
      ],
    ],
    phaiSach: ['Chanel'],
  },
  {
    slug: 'day-lung-da-bo-swift-en-nau-khoa-cartier-bac',
    muc: 'than-bai',
    tenCu: 'Dây Lưng Da Box Calf Đen Nâu – Khoá Bạc',
    tenMoi: 'Dây Lưng Da Box Calf Đen Nâu – Khoá Bạc',
    vi: 'Thân bài: "Khóa kim loại kiểu Santos de Cartier" — Santos là tên mẫu đồng hồ của Cartier. Tả hình khoá thì không cần mượn tên đó.',
    thay: [
      [
        'Khóa kim loại kiểu Santos de Cartier mạ bạc palladium sáng bóng, dáng vuông cá tính với các chi tiết vis trang trí đặc trưng',
        'Khóa kim loại mạ bạc palladium sáng bóng, dáng vuông bo góc với các chi tiết vis trang trí',
      ],
    ],
    thayNhan: [
      ['khóa kiểu Cartier', 'khoá vuông bo góc'],
      ['Santos de Cartier', 'vuông bo góc'],
    ],
    phaiSach: ['Cartier'],
  },
  {
    slug: 'card-holder-vi-ung-the-da-epsom-orange',
    muc: 'than-bai',
    tenCu: 'Card Holder Ví Đựng Thẻ – Da Epsom – Orange',
    tenMoi: 'Card Holder Ví Đựng Thẻ – Da Epsom – Orange',
    vi: '"mang phong cách cam Hermes" — dùng tên hãng để gọi một màu. Gọi thẳng màu là xong.',
    thay: [
      ['mang phong cách cam Hermes – rực rỡ', 'mang sắc cam rực rỡ'],
      ['thường dùng trong các dòng túi và phụ kiện của Hermès', 'thường dùng trong các dòng túi và phụ kiện cao cấp'],
    ],
    phaiSach: ['Hermes', 'Hermès'],
  },
  {
    slug: 'travel-watch-case-da-clemence-orange',
    muc: 'than-bai',
    tenCu: 'Travel Watch Case – Da Clemence – Orange',
    tenMoi: 'Travel Watch Case – Da Clemence – Orange',
    vi: 'Cùng lỗi: "sắc cam Hermès đặc trưng".',
    thay: [['Orange – sắc cam Hermès đặc trưng – là màu thể hiện', 'Orange – sắc cam rực – là màu thể hiện']],
    phaiSach: ['Hermes', 'Hermès'],
  },
  {
    slug: 'passport-cover-da-epsom-oldlace-x-orange',
    muc: 'than-bai',
    tenCu: 'Passport Cover – Da Epsom – OldLace x Orange',
    tenMoi: 'Passport Cover – Da Epsom – OldLace x Orange',
    vi: 'Cùng lỗi: "Orange (cam Hermes)".',
    thay: [['Orange (cam Hermes)', 'Orange (cam rực)']],
    phaiSach: ['Hermes', 'Hermès'],
  },
  {
    slug: 'tiffany-bag-da-epi-aqua',
    muc: 'ten-moi',
    tenCu: 'Tiffany Bag – Da Epi – Aqua',
    tenMoi: 'Túi Da Vân Nổi Dọc – Aqua',
    vi: '"Tiffany" là nhà kim hoàn, và màu xanh Tiffany còn được họ đăng ký riêng — nên tên này chạm cả hai. "Epi" là tên vân da của Louis Vuitton nên cũng rút khỏi H1, đổi thành cách tả vân thật: nổi dọc.',
    thay: [
      ['Tiffany Bag – Da Epi – Aqua', 'Túi Da Vân Nổi Dọc – Aqua'],
      [
        'Da Epi là loại da bò được dập vân nổi đặc trưng theo chiều ngang – từng được Louis Vuitton chọn làm chất liệu chủ lực cho nhiều dòng túi kinh điển',
        'Da vân nổi là loại da bò được dập vân nổi chạy theo một chiều, thường thấy ở các dòng túi giữ phom cứng',
      ],
      ['Da Epi', 'da vân nổi'],
    ],
    thayNhan: [
      ['Thiết kế Tiffany Bag', 'Thiết kế túi da vân nổi'],
      ['Tiffany Bag', 'túi da vân nổi'],
    ],
    phaiSach: ['Tiffany', 'Louis Vuitton', 'Vuitton'],
  },
];

/**
 * SLUG CÒN CHỨA NHÃN HIỆU — LƯỢT SAU, kèm 301 trong koi-storefront.
 *
 * Đổi tên (ở trên) chỉ đổi thứ khách ĐỌC. Đổi slug là đổi ĐỊA CHỈ, mà địa chỉ
 * thì Google đang giữ chỉ mục và người khác đang đặt link. Nên hai việc phải đi
 * hai lượt: nếu đổi tên làm sập gì thì `tenCu` ngay trên đây là bản hoàn tác;
 * còn đổi slug mà quên 301 thì một trang đang có hạng thành 404, không hoàn tác
 * bằng dữ liệu được.
 *
 * Quy trình cho lượt sau, đúng thứ tự này:
 *   1. ghi slug mới vào DB
 *   2. thêm { source: '/cua-hang/<slug-cũ>', destination: '/cua-hang/<slug-mới>',
 *      permanent: true } vào redirects() trong koi-storefront/next.config.ts
 *   3. deploy CẢ HAI, rồi curl từng đường cũ xem có đúng 301 → 200 không
 * Làm bước 1 mà chưa có bước 2 trên production là 20 trang 404 trong lúc chờ.
 */
export const SLUG_CON_NHAN_HIEU = [
  'bao-da-iphone-chanel-da-epsom-mau-o-burgundy-quilted',
  'belt-lv',
  'belt-lv-1',
  'clutch-lv',
  'day-da-ong-ho-hermes-da-be-epsom-cream',
  'day-lung-cartier',
  'day-lung-da-bo-swift-en-nau-khoa-cartier-bac',
  'day-lung-taiga-den-day-thay-the-mont-blanc-ko-gom-buckle-zin-cua-hang',
  'loewe-hammock-hobo-bag-da-togo-navy',
  'op-lung-iphone-15pro-goyard',
  'tiffany-bag-da-epi-aqua',
  'tui-celine-dion',
  'tui-constance-slim-mini',
  'tui-crossbody-da-bo-van-togo-xanh-navy-phong-cach-celine-dion',
  'tui-da-nu-celine-da-swift-black',
  'tui-deo-cheo-prada-xanh-reu',
  'tui-loewe-hammock',
  'tui-lot-birkin',
  'tui-tote-chanel',
  'tui-tote-longchamp-da-bo-van-togo-nau-chocolate',
  'tui-xach-nu-da-bo-swift-en-phong-cach-chanel',
  'versace-watchstraps-da-ky-a-blue',
  'vi-chanel',
];

/**
 * PHÁT HIỆN THÊM trong lúc đọc — KHÔNG phải chuyện nhãn hiệu, đừng sửa ở đây.
 * Ghi lại vì đọc xong mới thấy, và không ghi thì lần sau không ai đọc lại.
 *
 *  · money-clip-da-caviar-turquoise — tên ghi "Da Saffiano", slug ghi "caviar",
 *    thân bài ghi "Da Caviar", materialCategory ghi Safiano. Bốn chỗ, hai câu
 *    trả lời khác nhau.
 *  · tui-thiet-ke-rieng-hoa-tra-da-epsom-22-x-15-pink — tên ghi "Da Saffiano",
 *    slug và thân bài ghi Epsom. Món 22.000.000₫.
 *  · tui-xach-nu-da-bo-swift-en-phong-cach-chanel — tên và materialCategory ghi
 *    da cừu, thân bài ghi "da bò vân Swift".
 *  · belt-lv-1 — thân bài ghi "da tổng hợp", materialCategory ghi Epsom.
 *
 * Cả bốn thuộc việc D-loai-da-lech (21 món thân bài lệch loại da) và cần xưởng
 * xác nhận đâu là da thật, vì đây là lời khai về chất liệu — sai thì nặng hơn
 * lệch SEO. KHÔNG đoán.
 */
