/**
 * ĐỔI SLUG 23 SẢN PHẨM CÒN MANG NHÃN HIỆU NGƯỜI KHÁC TRONG ĐỊA CHỈ.
 *
 * Tên hàng (H1), thẻ meta, thân bài và alt ảnh đã dọn ở lượt trước
 * (doi-ten-nhan-hieu.mjs, doi-alt-anh.mjs, va-nhan-hieu-con-sot.mjs). Còn lại
 * đúng một chỗ: ĐƯỜNG DẪN. /cua-hang/vi-chanel/ vẫn là "vi-chanel" dù trang đã
 * tên "Ví Nữ Chần Trám – Hoa Nổi – Đen".
 *
 * VÌ SAO ĐỂ LẠI LƯỢT RIÊNG. Đổi tên thì hoàn tác được bằng dữ liệu. Đổi địa chỉ
 * thì không: link ngoài và chỉ mục Google đã trỏ vào đường cũ, mất là mất.
 *
 * SỐ THẬT TRƯỚC KHI QUYẾT (Search Console, 31/07–28/08/2026, 30 ngày):
 *   19/23 trang KHÔNG có một hiển thị nào
 *    4/23 có, tổng 26 hiển thị và 0 nhấp:
 *        17 ht  hạng 5,2  tui-tote-longchamp-da-bo-van-togo-nau-chocolate
 *         5 ht  hạng 5,6  loewe-hammock-hobo-bag-da-togo-navy
 *         2 ht  hạng 1,0  day-lung-da-bo-swift-en-nau-khoa-cartier-bac
 *         2 ht  hạng 2,0  tui-da-nu-celine-da-swift-black
 * Nghĩa là đổi slug ở đây gần như không đánh đổi traffic nào. Vẫn làm 301 đầy
 * đủ cho cả 23 — không phải vì 26 hiển thị, mà vì link ngoài không đo được bằng
 * Search Console.
 *
 * ================================ ĐẶT SLUG MỚI ================================
 * Lấy từ TÊN ĐÃ ĐỔI, bỏ dấu, không nhồi thêm từ khoá. Ba luật riêng:
 *
 *  1. KHÔNG đưa loại da vào slug của món đang lệch loại da. Ba món dưới đây có
 *     tên/materialCategory/thân bài nói ba thứ khác nhau (việc D-loai-da-lech,
 *     chờ xưởng xác nhận): tui-xach-nu-…-chanel, belt-lv-1, tiffany-bag-…
 *     Slug là thứ khó đổi nhất, nên đừng khắc vào đó một lời khai chất liệu
 *     chưa chắc đúng.
 *  2. Giữ tên vân da (Epsom, Togo, Swift, Taiga, Box Calf) — đó là tên vân,
 *     không phải tên hãng, và là từ khoá khách gõ thật. Cùng lý lẽ MỨC 3 trong
 *     doi-ten-nhan-hieu.data.mjs.
 *  3. Bỏ chữ rác của slug cũ ("ko-gom-buckle-zin-cua-hang", "mau-o").
 *
 * `ten`: tên đang có trong DB. Runner so khớp trước khi ghi — lệch là bỏ qua
 *   món đó, vì nghĩa là có người sửa tay sau khi bảng này được soạn.
 */
export const DOI_SLUG = [
  {
    cu: 'bao-da-iphone-chanel-da-epsom-mau-o-burgundy-quilted',
    moi: 'bao-da-iphone-chan-tram-da-epsom-do-burgundy',
    ten: 'Bao Da iPhone Chần Trám – Da Epsom – Đỏ Burgundy',
    vi: 'Bỏ "chanel". "mau-o" là rác của bộ sinh slug cũ (chữ "Ô" rụng dấu), bỏ luôn.',
  },
  {
    cu: 'belt-lv',
    moi: 'that-lung-nam-da-epsom-den-khoa-chot',
    ten: 'Thắt Lưng Nam – Da Epsom – Đen, Khoá Chốt',
    vi: 'Slug cũ chỉ có hai chữ và một trong hai là tên hãng.',
  },
  {
    cu: 'belt-lv-1',
    moi: 'that-lung-nam-van-o-vuong-khoa-chu',
    ten: 'Thắt Lưng Nam Vân Ô Vuông – Khoá Chữ',
    vi: 'KHÔNG đưa loại da vào: thân bài ghi "da tổng hợp", materialCategory ghi Epsom — chưa biết đâu đúng.',
  },
  {
    cu: 'clutch-lv',
    moi: 'clutch-da-bo-y-phom-dung-xam',
    ten: 'Clutch Da Bò Ý Phom Đứng – Xám',
    vi: 'Bỏ "lv".',
  },
  {
    cu: 'day-da-ong-ho-hermes-da-be-epsom-cream',
    moi: 'day-da-dong-ho-da-be-epsom-cream',
    ten: 'Dây Da Đồng Hồ – Da Bê Epsom – Cream',
    vi: 'Bỏ "hermes", và sửa luôn lỗi chính tả "ong-ho" → "dong-ho" của slug cũ.',
  },
  {
    cu: 'day-lung-cartier',
    moi: 'that-lung-nam-da-bo-khoa-vuong-bo-goc-den',
    ten: 'Thắt Lưng Nam Da Bò – Khoá Vuông Bo Góc – Đen',
    vi: 'Slug cũ là "dây lưng" + tên nhà kim hoàn, không tả gì về món.',
  },
  {
    cu: 'day-lung-da-bo-swift-en-nau-khoa-cartier-bac',
    moi: 'day-lung-da-box-calf-den-nau-khoa-bac',
    ten: 'Dây Lưng Da Box Calf Đen Nâu – Khoá Bạc',
    vi: 'Bỏ "cartier". Slug cũ ghi "swift-en" trong khi tên đã là Box Calf — theo tên.',
  },
  {
    cu: 'day-lung-taiga-den-day-thay-the-mont-blanc-ko-gom-buckle-zin-cua-hang',
    moi: 'day-that-lung-thay-the-da-taiga-den-khong-kem-khoa',
    ten: 'Dây Thắt Lưng Thay Thế – Da Taiga Đen (Không Kèm Khoá)',
    vi: 'Bỏ "mont-blanc" và cả đuôi "ko-gom-buckle-zin-cua-hang" — ghi chú nội bộ lọt vào URL.',
  },
  {
    cu: 'loewe-hammock-hobo-bag-da-togo-navy',
    moi: 'tui-hobo-day-vong-da-togo-navy',
    ten: 'Túi Hobo Dây Võng – Da Togo – Navy',
    vi: 'Bỏ "loewe". "Hobo" là tên kiểu dáng, không ai độc quyền.',
  },
  {
    cu: 'op-lung-iphone-15pro-goyard',
    moi: 'op-lung-iphone-15-pro-da-bo-thao-moc-phoi-vai',
    ten: 'Ốp Lưng iPhone 15 Pro – Da Bò Thảo Mộc Phối Vải',
    vi: 'Bỏ "goyard".',
  },
  {
    cu: 'tiffany-bag-da-epi-aqua',
    moi: 'tui-da-van-noi-doc-aqua',
    ten: 'Túi Da Vân Nổi Dọc – Aqua',
    vi: 'Bỏ cả "tiffany" (nhà kim hoàn) và "epi" (tên vân da của Louis Vuitton). Tả vân thật: nổi dọc.',
  },
  {
    cu: 'tui-celine-dion',
    moi: 'tui-deo-cheo-da-van-hat-navy',
    ten: 'Túi Đeo Chéo Da Vân Hạt – Navy',
    vi: 'Slug cũ là tên một người thật, không phải kiểu túi.',
  },
  {
    cu: 'tui-constance-slim-mini',
    moi: 'tui-deo-cheo-nap-gap-da-epsom',
    ten: 'Túi Đeo Chéo Nắp Gập – Da Epsom',
    vi: '"Constance" là tên dòng túi Hermès, không phải tên kiểu dáng chung.',
  },
  {
    cu: 'tui-crossbody-da-bo-van-togo-xanh-navy-phong-cach-celine-dion',
    moi: 'tui-crossbody-da-bo-van-togo-xanh-navy',
    ten: 'Túi Crossbody Da Bò Vân Togo – Xanh Navy',
    vi: 'Chỉ cắt đuôi "phong-cach-celine-dion", phần đầu đã tả đúng món.',
  },
  {
    cu: 'tui-da-nu-celine-da-swift-black',
    moi: 'tui-da-nu-phom-mem-da-swift-black',
    ten: 'Túi Da Nữ Phom Mềm – Da Swift – Black',
    vi: 'Đổi "celine" thành cách tả phom mà thân bài đã dùng.',
  },
  {
    cu: 'tui-deo-cheo-prada-xanh-reu',
    moi: 'tui-deo-cheo-nam-da-epsom-xanh-reu',
    ten: 'Túi Đeo Chéo Nam – Da Epsom – Xanh Rêu',
    vi: 'Bỏ "prada".',
  },
  {
    cu: 'tui-loewe-hammock',
    moi: 'tui-da-phom-luc-giac-den',
    ten: 'Túi Da Phom Lục Giác – Đen',
    vi: 'Bỏ "loewe". Khác món với loewe-hammock-hobo-bag-… nên slug mới cũng phải khác.',
  },
  {
    cu: 'tui-lot-birkin',
    moi: 'tui-lot-dinh-hinh-cho-tui-xach-kem',
    ten: 'Túi Lót Định Hình Cho Túi Xách – Kem',
    vi: '"Birkin" là tên dòng túi Hermès VÀ tên một người thật.',
  },
  {
    cu: 'tui-tote-chanel',
    moi: 'tui-tote-da-bo-y-quai-da-phoi-xich-den',
    ten: 'Túi Tote Da Bò Ý – Quai Da Phối Xích – Đen',
    vi: 'Bỏ "chanel". "Quai da phối xích" là chi tiết thật của món, và là thứ khách tìm.',
  },
  {
    cu: 'tui-tote-longchamp-da-bo-van-togo-nau-chocolate',
    moi: 'tui-tote-da-bo-van-togo-nau-chocolate',
    ten: 'Túi Tote Da Bò Vân Togo – Nâu Chocolate',
    vi: 'Chỉ bỏ "longchamp". Đây là trang có hiển thị cao nhất nhóm (17) nên giữ phần còn lại y nguyên.',
  },
  {
    cu: 'tui-xach-nu-da-bo-swift-en-phong-cach-chanel',
    moi: 'tui-xach-nu-chan-tram-den',
    ten: 'Túi Xách Nữ Chần Trám – Da Cừu – Đen',
    vi: 'KHÔNG đưa loại da vào: tên và materialCategory ghi da cừu, thân bài ghi da bò vân Swift, slug cũ cũng ghi swift — ba nguồn, hai câu trả lời.',
  },
  {
    cu: 'versace-watchstraps-da-ky-a-blue',
    moi: 'day-dong-ho-da-ky-da-blue',
    ten: 'Dây Đồng Hồ Da Kỳ Đà – Blue',
    vi: 'Bỏ "versace", và sửa "ky-a" → "ky-da" (chữ "Đà" rụng dấu ở bộ sinh slug cũ).',
  },
  {
    cu: 'vi-chanel',
    moi: 'vi-nu-chan-tram-hoa-noi-den',
    ten: 'Ví Nữ Chần Trám – Hoa Nổi – Đen',
    vi: 'Slug cũ chỉ có hai chữ và một trong hai là tên hãng.',
  },
];
