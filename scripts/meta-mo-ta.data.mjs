/**
 * THẺ MÔ TẢ (meta description) CHO CÁC TRANG KIẾM ĐƯỢC NHIỀU NHẤT.
 *
 * ============================ VÌ SAO LÀM VIỆC NÀY ============================
 * Đọc Search Console 90 ngày: 15/18 trang kiếm nhiều nhất có thẻ mô tả TRỐNG
 * hoặc là ĐOẠN ĐẦU THÂN BÀI bị cắt giữa câu. Trong đó 5 trang trống hẳn, gồm cả
 * trang số 1 và số 2 của cả site:
 *   /dich-vu-lam-tui-da-theo-yeu-cau/    877 hiển thị · 86 nhấp · TRỐNG
 *   /dich-vu-boc-da-tai-nghe-cao-cap/    972 hiển thị · 69 nhấp · TRỐNG
 *
 * Thẻ mô tả là dòng chữ Google in dưới tiêu đề — câu quảng cáo duy nhất mình
 * được viết trong kết quả tìm kiếm. Trống thì Google tự cắt một đoạn thân bài,
 * và nó cắt giữa câu.
 *
 * BẰNG CHỨNG NGAY TRONG SỐ CỦA SITE, không phải lý thuyết:
 *   /sua-tui-lv/     319 hiển thị · 16 nhấp · CTR 5,0%  ← mô tả VIẾT TAY
 *   /tag-vali-…/     398 hiển thị ·  6 nhấp · CTR 1,5%  ← mô tả đổ thân bài
 * Cùng cỡ hiển thị, gấp 3,3 lần nhấp. Ba trang duy nhất có mô tả tử tế
 * (/sua-tui-lv/, /dinh-vu-do-va-cat-day-lung/, /da-togo-va-da-epsom/) đều là ba
 * trang có CTR cao nhất nhóm.
 *
 * ======================== VIẾT THEO BỐN NGUYÊN TẮC ========================
 *  1. ĐÚNG CỤM KHÁCH GÕ, không phải cụm mình muốn. Lấy từ GSC: "bọc tai nghe"
 *     (610 hiển thị) chứ không phải "bọc da tai nghe cao cấp".
 *  2. NÓI VIỆC LÀM ĐƯỢC, không nói cảm xúc. "Bọc lại da đệm tai và headband"
 *     thắng "nâng tầm trải nghiệm nghe của bạn".
 *  3. CÓ TP.HCM. Gần hết các cụm này là tìm kiếm địa phương ("thay đệm tai nghe
 *     ở đâu" 127 hiển thị) — người gõ đang cần biết chỗ.
 *  4. 120–158 KÝ TỰ. Dưới 120 là bỏ trống chỗ; trên 158 Google cắt bằng "…" và
 *     câu cuối mất nghĩa. Script kiểm và CHẶN nếu lệch khoảng.
 */
export const META = [
  {
    slug: 'dich-vu-lam-tui-da-theo-yeu-cau',
    hien: 877, nhap: 86,
    cum: 'làm túi da theo yêu cầu · may túi da theo yêu cầu tphcm · làm túi da handmade',
    moTa:
      'Nhận làm túi da theo yêu cầu tại TP.HCM: chọn mẫu, kích thước, loại da và dập tên riêng. Xưởng làm trực tiếp, khâu tay, không qua trung gian.',
  },
  {
    slug: 'dich-vu-boc-da-tai-nghe-cao-cap',
    hien: 972, nhap: 69,
    cum: 'bọc tai nghe (610) · thay da tai nghe (239) · bọc da tai nghe (221)',
    moTa:
      'Bọc lại da đệm tai và headband cho Sony, Marshall, Beats, Sennheiser, JBL bị bong tróc. Da thật, khâu tay tại xưởng TP.HCM, xem máy trước khi báo giá.',
  },
  {
    slug: 'dich-vu-khac-ten-len-san-pham-khac-ten-theo-yeu-cau',
    hien: 533, nhap: 29,
    cum: 'khắc tên (212) · khắc tên theo yêu cầu (131) · dịch vụ khắc tên',
    moTa:
      'Khắc tên, chữ và logo lên ví, thắt lưng, sổ da và quà tặng doanh nghiệp. Dập nóng hoặc khắc laser trên da thật, xem mẫu chữ trước khi làm. Xưởng tại TP.HCM.',
  },
  {
    slug: 'dich-vu-sua-chua-vi-da-cao-cap',
    hien: 206, nhap: 20,
    cum: 'sửa ví da (17) · sửa ví da tphcm (19)',
    moTa:
      'Sửa ví da bị bong tróc, nứt gãy, rách viền, hỏng khoá — kể cả ví da cá sấu. Phục hồi màu và đường chỉ bằng tay tại xưởng TP.HCM, báo giá sau khi xem ví.',
  },
  {
    slug: 'dich-vu-sua-chua-spa-do-da-cao-cap',
    hien: 275, nhap: 16,
    cum: 'sửa đồ da (139) · phục hồi túi da (13) · spa đồ da',
    moTa:
      'Spa và sửa đồ da: vệ sinh, dưỡng, vá da, phục hồi màu, thay lót cho túi, ví, thắt lưng, vali. Làm thủ công theo từng loại da, xưởng tại TP.HCM.',
  },
  {
    slug: 'thay-mut-dem-tai-nghe-hcm',
    hien: 326, nhap: 15,
    cum: 'thay đệm tai nghe (197) · thay đệm tai nghe ở đâu (127)',
    moTa:
      'Thay mút đệm tai nghe tại TP.HCM cho Sony, Beats, JBL, Marshall: chọn da thật hoặc da lộn, đo đúng cỡ máy. Thay tại xưởng, đợi lấy trong ngày.',
  },
  {
    slug: 'boc-da-ipad-boc-da-ban-phim-ipad-smart-keyboard',
    hien: 161, nhap: 31,
    cum: 'bọc da ipad · bọc da bàn phím ipad · smart keyboard',
    moTa:
      'Bọc da iPad và bàn phím Smart Keyboard bằng da thật, đo theo từng đời máy. Chọn màu da, khâu tay, dập tên riêng. Xưởng làm trực tiếp tại TP.HCM.',
  },
  {
    slug: 'san-xuat-charm-da-theo-yeu-cau-phu-kien-tui-xach',
    hien: 281, nhap: 27,
    cum: 'charm da (20) · charm túi xách · sản xuất charm da',
    moTa:
      'Sản xuất charm da theo yêu cầu cho túi xách, ví, balo: cắt theo hình riêng, dập logo thương hiệu, làm số lượng nhỏ. Xưởng da thủ công tại TP.HCM.',
  },
  {
    slug: 'cat-day-nit-o-dau-uy-tin-tai-tp-hcm',
    hien: 483, nhap: 18,
    cum: 'cắt dây nịt (15) · sửa dây nịt (191) · cắt dây nịt ở đâu',
    moTa:
      'Cắt ngắn dây nịt, đục thêm lỗ và sửa thắt lưng da tại TP.HCM — làm được cả dây hàng hiệu và dây khoá rời. Đợi lấy ngay, xem dây trước khi cắt.',
  },
  {
    slug: 'sua-chua-balo',
    hien: 231, nhap: 12,
    cum: 'sửa balo (150) · spa balo · sửa vali',
    moTa:
      'Sửa balo, túi và vali bị đứt quai, hỏng dây kéo, rách lớp lót hoặc bong đáy. Thay phụ kiện đúng cỡ và khâu lại bằng tay. Xưởng tại TP.HCM.',
  },
  {
    slug: 'bao-da-dien-thoai-op-lung-da-qua-doanh-nghiep-cao-cap',
    hien: 130, nhap: 12,
    cum: 'phone case (59) · bao da điện thoại · ốp lưng da',
    moTa:
      'Bao da và ốp lưng điện thoại làm từ da thật, đo theo từng đời máy, dập tên hoặc logo. Nhận cả đơn lẻ và đơn quà tặng doanh nghiệp. Xưởng tại TP.HCM.',
  },
  {
    slug: 'tag-vali-du-lich-the-hanh-ly-qua-tang-doanh-nghiep',
    hien: 398, nhap: 6,
    cum: 'tag vali (399, vị trí 7,6)',
    moTa:
      'Tag vali da thật khắc tên hoặc dập logo, làm quà tặng nhân viên và đối tác. Chọn màu da, kiểu chữ và số lượng. Xưởng da thủ công tại TP.HCM.',
  },
  {
    slug: 'sua-tui-xach-hang-hieu',
    hien: 112, nhap: 0,
    cum: 'sửa túi xách (125, vị trí 18,8) · sửa túi xách hàng hiệu tphcm (126)',
    moTa:
      'Sửa túi xách hàng hiệu bị bong tróc, sờn góc, hỏng khoá hoặc mất form. Phục hồi màu và khâu lại bằng tay tại TP.HCM, xem túi trước khi báo giá.',
  },
  {
    slug: 'da-togo',
    hien: 101, nhap: 0,
    cum: 'da togo (172, vị trí 5,5) · da togo là da gì (164)',
    moTa:
      'Da Togo là da bê vân hạt nổi của Pháp: mềm, nhẹ, ít trầy và giữ form lâu. Cách nhận biết da Togo thật và những món đồ da phù hợp với chất liệu này.',
  },
  {
    slug: 'da-de-va-da-bo-nen-chon-chat-lieu-nao',
    hien: 102, nhap: 0,
    cum: 'da dê (102, vị trí 7,6)',
    moTa:
      'Da dê và da bò khác nhau ở độ mềm, trọng lượng, độ bền và giá. So sánh từng mặt để biết nên chọn loại nào cho ví, túi hay thắt lưng.',
  },
];
