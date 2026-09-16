/**
 * MÔ TẢ CHO 18 SẢN PHẨM ĐANG RỖNG (thêm ngày 05/09/2026 từ hoá đơn, externalId
 * BILL-xxx). Viết ngày 16/09/2026 theo ĐÚNG ẢNH THẬT của từng món (Claude xem
 * tận mắt 3 ảnh/món) + dữ kiện chung của xưởng. Không bịa số đo, không bịa
 * loại da khi ảnh không cho thấy rõ; chỗ nào là suy đoán hợp lý thì viết
 * chung chung ("da vân hạt") thay vì tên da cụ thể.
 *
 * `metaTitle`: null = để storefront rơi về `name`; đặt chuỗi khi `name` trong DB
 * là ghi chú nội bộ ("(Mimi Ly) …", "Da khao sat_…") không nên ra Google.
 * `metaDescription` ≤ 160 ký tự, câu sạch (không "Nhãn: giá trị") để
 * moTaMetaSanPham bên storefront dùng nguyên.
 *
 * KHÔNG CÓ trong danh sách: tui-andiamo-messenger-bottega-venta — món có khoá
 * kim loại khắc tên hãng khác, chờ A Khoa quyết (giữ/ẩn/đổi tên) rồi mới viết.
 */
export const MO_TA = [
  {
    slug: 'moneyclip-e98a',
    metaTitle: 'Money clip da bê Epsom đen',
    metaDescription:
      'Kẹp tiền money clip da bê Epsom đen, nam châm giấu trong da, khâu tay tại xưởng KOI Sài Gòn. Khắc tên theo yêu cầu, bảo hành đường chỉ 1 năm.',
    html:
      '<p>Kẹp tiền phom chuẩn của xưởng: hai mặt da bê vân Epsom màu đen, nam châm giấu trong lớp da, tờ tiền gập đôi kẹp giữa là xong. Không nắp, không khoá, để túi trước quần không cộm.</p>' +
      '<p>Đường may tay chạy viền quanh mép, cạnh da được đánh bo. Epsom vân hạt nhỏ, mặt đứng, ít lộ xước và giữ nét dấu khắc sắc nếu bạn muốn dập tên hoặc chữ ký lên mặt kẹp.</p>' +
      '<ul><li>Chất liệu: da bê vân Epsom, màu đen</li><li>Kẹp nam châm, khâu tay tại xưởng KOI</li><li>Khắc tên, gắn tag kim loại theo yêu cầu</li><li>Bảo hành đường chỉ 1 năm</li></ul>',
  },
  {
    slug: 'mimi-ly-tui-kelly-san-lam-day-de-kem',
    metaTitle: 'Túi mini hồng phấn kèm dây đeo da dê kem làm riêng',
    metaDescription:
      'Túi mini hồng phấn khoá xoay kèm dây đeo da dê màu kem làm riêng, khâu tay tại xưởng KOI Sài Gòn. Nhận làm dây đeo theo túi có sẵn của khách.',
    html:
      '<p>Túi mini màu hồng phấn khoá xoay, phụ kiện vàng, là mẫu có sẵn của xưởng; sợi dây đeo da dê màu kem được làm riêng theo ý khách để hợp tông mà không trùng màu. Dây có khoá điều chỉnh mạ vàng, hai đầu móc tháo rời, chỉ hồng nhạt chạy viền.</p>' +
      '<p>Da dê mỏng, nhẹ và dai nên dây đeo vai không nặng, không làm xệ nắp túi mini. Cả túi lẫn dây đều khâu tay tại xưởng.</p>' +
      '<ul><li>Túi mini hồng phấn, khoá xoay, phụ kiện vàng</li><li>Dây đeo da dê màu kem: khoá điều chỉnh, móc tháo rời</li><li>Nhận làm dây đeo cho túi mọi cỡ, gửi ảnh túi để xưởng báo giá</li></ul>',
  },
  {
    slug: 'da-khao-sat-cover-hop-ngan-giay',
    metaTitle: 'Bọc hộp khăn giấy bằng da làm theo kích thước',
    metaDescription:
      'Bọc hộp khăn giấy bằng da may theo kích thước, màu xám ngà vân hạt, khe rút giấy trên nắp. Đồ da cho nhà và văn phòng làm tại xưởng KOI Sài Gòn.',
    html:
      '<p>Vỏ bọc hộp khăn giấy bằng da, may theo đúng kích thước hộp giấy khách đang dùng: khối vuông ôm sát bốn mặt, khe rút giấy cắt gọn trên nắp, đáy hở để thay lõi giấy. Màu xám ngà, vân hạt nhỏ, đường may tay chạy dọc bốn cạnh.</p>' +
      '<p>Món này thuộc nhóm đồ da cho nhà và văn phòng xưởng làm theo đơn. Khách gửi ba số đo dài, rộng, cao của hộp giấy hoặc ảnh hộp, xưởng cắt đúng cỡ và chọn màu da theo nội thất.</p>' +
      '<ul><li>Làm theo kích thước hộp khăn giấy của khách</li><li>Da vân hạt, may tay, đáy hở thay lõi</li><li>Dập logo cho khách sạn, văn phòng khi đặt số lượng</li></ul>',
  },
  {
    slug: 'da-khao-sat-bao-da-thung-rac',
    metaTitle: 'Bọc da thùng rác cảm ứng theo kích thước',
    metaDescription:
      'Bọc da thùng rác cảm ứng theo kích thước máy, ôm sát thân và nắp, chừa nút và mắt cảm biến. Đồ da nội thất làm tại xưởng KOI Sài Gòn.',
    html:
      '<p>Bọc da cho thùng rác cảm ứng: thân và nắp đều được bọc da màu be, ôm sát khối máy, chừa đúng vị trí nút và mắt cảm biến nên vẫn mở nắp tự động như thường. Từ một thùng rác nhựa thành một khối da đứng gọn trong phòng làm việc hay phòng khách.</p>' +
      '<p>Xưởng đo trực tiếp trên máy của khách hoặc theo số đo gửi qua Zalo, cắt da theo từng mặt rồi may tay ghép mép. Màu da chọn theo nội thất; da vân hạt nhỏ dễ lau, ít lộ xước.</p>' +
      '<ul><li>Bọc theo đúng máy của khách, giữ nguyên nút và cảm biến</li><li>Da vân hạt màu be, may tay</li><li>Nhận bọc các đồ gia dụng khác: hộp, khay, tay nắm</li></ul>',
  },
  {
    slug: 'boc-tay-nam-cua-chinh-4-cai',
    metaTitle: 'Bọc da tay nắm cửa chính, bộ 4 cái',
    metaDescription:
      'Bọc da tay nắm cửa chính theo số đo, bộ 4 cái, da màu vàng cát may tay khép mí. Đồ da nội thất làm tại xưởng KOI Sài Gòn.',
    html:
      '<p>Bộ bốn tay nắm cửa chính được bọc da màu vàng cát, ôm trọn thân thanh kim loại, đầu chốt khía để lộ. Cầm vào tay nắm là chạm da thay vì kim loại lạnh, và bộ cửa ăn theo tông gỗ, đồng của nội thất.</p>' +
      '<p>Xưởng đo đường kính và chiều dài từng tay nắm, cắt da theo cỡ rồi may tay khép mí dọc thân. Màu da và màu chỉ chọn theo cửa; da trơn hay vân hạt đều làm được.</p>' +
      '<ul><li>Bộ 4 tay nắm, bọc theo số đo từng thanh</li><li>Da màu vàng cát, may tay khép mí</li><li>Nhận bọc tay nắm cửa, tay vịn, tay cầm tủ theo đơn</li></ul>',
  },
  {
    slug: 'name-tag',
    metaTitle: 'Name tag da vân hạt đen, thẻ tên hành lý',
    metaDescription:
      'Name tag hành lý bằng da vân hạt đen, ngăn nhét thẻ tên, quai da luồn qua tay xách vali. Dập tên viết tắt theo yêu cầu tại xưởng KOI Sài Gòn.',
    html:
      '<p>Thẻ tên hành lý bằng da vân hạt màu đen, dáng chữ nhật bo góc, mặt trước là ngăn nhét thẻ tên hoặc danh thiếp có khuyết ngón để rút thẻ, quai da luồn qua tay xách vali, túi du lịch. Trong ảnh tag đang gắn trên túi weekender da xanh rêu của xưởng.</p>' +
      '<p>Da vân hạt che xước, chịu được va đập trên băng chuyền sân bay. Có thể dập nóng tên viết tắt lên mặt tag, hoặc làm bộ nhiều cái cùng màu cho gia đình, đoàn công tác.</p>' +
      '<ul><li>Da vân hạt màu đen, may tay</li><li>Ngăn nhét thẻ tên, quai da luồn tay xách</li><li>Dập tên viết tắt theo yêu cầu, đặt số lượng dập logo</li></ul>',
  },
  {
    slug: 'tui-da-nu',
    metaTitle: 'Túi cầm tay da vân hạt đỏ rượu, hai ngăn khoá kéo',
    metaDescription:
      'Túi cầm tay da vân hạt đỏ rượu, hai ngăn khoá kéo, quai tay tháo rời, phụ kiện vàng. Khâu tay tại xưởng KOI Sài Gòn, đặt riêng màu da theo ý.',
    html:
      '<p>Túi cầm tay dáng phẳng màu đỏ rượu, da vân hạt mềm, hai ngăn khoá kéo song song để tách điện thoại, ví với đồ trang điểm. Quai xách tay tháo rời móc vàng, đầu kéo bọc da cùng màu.</p>' +
      '<p>Dáng này cầm tay đi tiệc, kẹp nách đi làm, hay bỏ vào tote làm túi trong đều hợp. Khâu tay tại xưởng; có thể đổi màu da, thêm dây đeo chéo hoặc dập tên lên mặt túi khi đặt riêng.</p>' +
      '<ul><li>Da vân hạt màu đỏ rượu, phụ kiện vàng</li><li>Hai ngăn khoá kéo, quai xách tay tháo rời</li><li>Đặt riêng: đổi màu da, thêm dây đeo chéo, khắc tên</li></ul>',
  },
  {
    slug: 'cardholder-bo-goc-tren',
    metaTitle: 'Card holder da vân hạt cam, ngăn thẻ bo góc',
    metaDescription:
      'Card holder da vân hạt màu cam, ngăn thẻ cắt vát góc rút thẻ một ngón, mỏng vừa túi áo. Khâu tay tại xưởng KOI Sài Gòn, khắc tên theo yêu cầu.',
    html:
      '<p>Card holder phẳng màu cam, da vân hạt mềm tay, hai ngăn thẻ phía trước cắt vát góc để rút thẻ bằng một ngón, kèm ngăn giữa cho tiền gập hoặc thẻ ít dùng. Mỏng vừa túi áo sơ mi.</p>' +
      '<p>Đường may tay chạy viền ba cạnh, cạnh da đánh bo. Màu cam nổi giữa các tông đen nâu quen thuộc, hợp làm quà. Có thể dập tên hoặc chữ ký lên mặt trước.</p>' +
      '<ul><li>Da vân hạt màu cam, may tay</li><li>2 ngăn thẻ vát góc, 1 ngăn giữa</li><li>Khắc tên theo yêu cầu, làm màu khác khi đặt riêng</li></ul>',
  },
  {
    slug: '1-tam-lot-ban-1-hop-but-to-1-hop-but-nho-2-khay-nho',
    metaTitle: 'Bộ đồ da để bàn: lót bàn, hộp bút, khay danh thiếp',
    metaDescription:
      'Bộ đồ da để bàn làm việc: tấm lót bàn, hộp bút, khay danh thiếp da nâu sô-cô-la, làm theo kích thước bàn tại xưởng KOI Sài Gòn. Dập logo theo yêu cầu.',
    html:
      '<p>Bộ đồ da để bàn làm việc màu nâu sô-cô-la, gồm tấm lót bàn có hai mép gập giữ giấy, một hộp bút lớn có ngăn danh thiếp, một hộp bút nhỏ và hai khay nhỏ đựng thẻ, kẹp giấy. Da trơn, may viền, đặt lên bàn gỗ là gọn cả mặt bàn.</p>' +
      '<p>Bộ này làm theo kích thước bàn và thói quen của người dùng: khách chọn cỡ lót bàn, số hộp và khay, màu da và có dập logo hay không. Xưởng báo giá theo bộ sau khi chốt cấu hình.</p>' +
      '<ul><li>Da trơn màu nâu sô-cô-la, may tay viền</li><li>Cấu hình theo yêu cầu: lót bàn, hộp bút, khay</li><li>Dập logo, đặt số lượng cho phòng giám đốc, phòng họp</li></ul>',
  },
  {
    slug: 'magsafe',
    metaTitle: 'Ví MagSafe da đà điểu xám dán lưng iPhone',
    metaDescription:
      'Ví MagSafe da đà điểu xám dán từ tính lưng iPhone, đựng vài thẻ hay dùng, may tay tại xưởng KOI Sài Gòn. Đặt riêng màu và loại da theo ý.',
    html:
      '<p>Ví thẻ MagSafe bằng da đà điểu màu xám, dán từ tính vào lưng iPhone hoặc ốp có MagSafe, đựng vài thẻ hay dùng. Vân chân lông đặc trưng của da đà điểu nổi rõ trên nền xám, mỗi miếng một vân khác nhau.</p>' +
      '<p>Nam châm giấu giữa hai lớp da, mép may tay, ngăn thẻ cắt hở để rút thẻ bằng ngón cái. Da đà điểu mềm và dai, dùng lâu lên bóng theo tay.</p>' +
      '<ul><li>Da đà điểu màu xám, nam châm MagSafe giấu trong da</li><li>Ngăn thẻ phía trước, may tay tại xưởng</li><li>Làm màu khác, da khác (Epsom, cá sấu) khi đặt riêng</li></ul>',
  },
  {
    slug: 'bao-chia-khoa-land-rover',
    metaTitle: 'Bao chìa khoá Land Rover da đà điểu đỏ',
    metaDescription:
      'Bao chìa khoá Land Rover da đà điểu đỏ đô, may tay ôm phom remote, kèm dây da và khoen. Xưởng KOI Sài Gòn làm bao chìa theo đời xe khi gửi ảnh.',
    html:
      '<p>Bao da cho chìa khoá thông minh Land Rover, làm bằng da đà điểu màu đỏ đô, ôm sát phom remote và chừa đúng vị trí logo, nút bấm. Kèm dây da cùng màu và khoen tròn để móc chìa khác.</p>' +
      '<p>Xưởng làm theo từng đời chìa: khách gửi ảnh mặt trước, mặt sau và cạnh remote, xưởng dựng rập riêng rồi may tay. Nhận làm cho các hãng xe khác; da đà điểu, cá sấu, Epsom hay Togo tuỳ chọn.</p>' +
      '<ul><li>Da đà điểu màu đỏ đô, may tay theo phom chìa</li><li>Dây da và khoen kèm theo</li><li>Làm theo đời chìa của hãng xe khác khi gửi ảnh</li></ul>',
  },
  {
    slug: 'card-holder',
    metaTitle: 'Card holder gập da Epsom màu etoupe',
    metaDescription:
      'Card holder gập da bê Epsom màu etoupe, 3 ngăn thẻ vát và 1 ngăn dài, mỏng gọn. Khâu tay tại xưởng KOI Sài Gòn, khắc tên theo yêu cầu.',
    html:
      '<p>Card holder dáng gập bằng da bê Epsom màu etoupe, mở ra là ba ngăn thẻ cắt vát một bên và một ngăn dài bên kia cho tiền gập hoặc danh thiếp. Gập lại mỏng như một chiếc ví thẻ thường, để túi áo hay túi quần trước đều gọn.</p>' +
      '<p>Epsom vân hạt nhỏ, mặt đứng, ít lộ xước và giữ nét dấu khắc sắc. Mép da may tay, cạnh đánh bo ăn với mặt da.</p>' +
      '<ul><li>Da bê Epsom màu etoupe, may tay</li><li>3 ngăn thẻ vát + 1 ngăn dài</li><li>Khắc tên, đổi màu da khi đặt riêng</li></ul>',
  },
  {
    slug: 'may-card-vao-vali',
    metaTitle: 'May túi thẻ tên bằng da lên vali, dập tên viết tắt',
    metaDescription:
      'May túi da đựng thẻ tên lên thân vali vải, dập tên viết tắt nhũ bạc, da navy ăn với vali. Dịch vụ cá nhân hoá hành lý tại xưởng KOI Sài Gòn.',
    html:
      '<p>Dịch vụ may một túi da đựng thẻ tên thẳng lên thân vali vải: miếng da trơn màu xanh navy ăn với vali, khe nhét danh thiếp phía trên, tên viết tắt dập nhũ bạc ở góc dưới. Không cần tag treo, không rơi mất, và nhận ra vali của mình trên băng chuyền từ xa.</p>' +
      '<p>Xưởng may trực tiếp lên vali khách mang tới, chọn màu da theo vali và kiểu chữ theo ý. Làm được trên vali vải và túi du lịch mềm; vali nhựa cứng thì xưởng tư vấn tag rời.</p>' +
      '<ul><li>Da trơn màu navy, may tay lên thân vali</li><li>Dập tên viết tắt nhũ bạc hoặc vàng</li><li>Mang vali tới xưởng hoặc gửi tới, xưởng hẹn ngày trả</li></ul>',
  },
  {
    slug: 'balo-nam',
    metaTitle: 'Balo nam da bò trơn màu nâu, lót canvas, dập tên',
    metaDescription:
      'Balo nam da bò trơn màu nâu, khoá kéo bạc, lót canvas, tag da dập tên riêng. Khâu tay tại xưởng KOI Sài Gòn, đặt riêng cỡ và màu theo ý.',
    html:
      '<p>Balo nam dáng hộp bằng da bò trơn màu nâu, khoá kéo hai đầu kim loại bạc mở rộng miệng túi, quai xách trên và hai quai đeo lưng bản rộng. Mặt da trơn để lộ vân tự nhiên, dùng lâu lên bóng và đậm màu ở chỗ hay chạm tay.</p>' +
      '<p>Bên trong lót vải canvas nâu, có ngăn khoá kéo riêng và một miếng da dập tên chủ nhân theo yêu cầu. Toàn bộ khâu tay tại xưởng; đặt riêng có thể đổi cỡ, đổi màu da hoặc thêm ngăn laptop.</p>' +
      '<ul><li>Da bò trơn màu nâu, phụ kiện bạc, may tay</li><li>Lót canvas, ngăn khoá kéo trong, tag da dập tên</li><li>Đặt riêng: đổi cỡ, màu da, thêm ngăn laptop</li></ul>',
  },
  {
    slug: '5-hop-mat-kinh',
    metaTitle: 'Hộp mắt kính da dáng ống, đặt theo bộ',
    metaDescription:
      'Hộp mắt kính da trơn dáng ống, nắp cuộn cài thanh mạ vàng, đặt theo bộ nhiều màu, dập tên riêng. Làm tay tại xưởng KOI Sài Gòn.',
    html:
      '<p>Hộp đựng mắt kính dáng ống bằng da trơn, nắp cuộn quấn dây da cài thanh kim loại mạ vàng, mở ra bằng một tay. Đơn này khách đặt bộ năm hộp, mỗi hộp một màu: cam, rêu xám, đen và các màu khác.</p>' +
      '<p>Lớp da dày giữ phom, bảo vệ gọng kính khi bỏ túi xách. Da trơn lên màu bóng theo thời gian; có thể dập tên viết tắt lên nắp để mỗi hộp là của một người.</p>' +
      '<ul><li>Da trơn nhiều màu, thanh cài mạ vàng, may tay</li><li>Đặt theo bộ, mỗi hộp một màu, dập tên riêng</li><li>Làm hộp đơn lẻ hoặc số lượng làm quà công ty</li></ul>',
  },
  {
    slug: 'an-lam-tag-money-clip-sirkunkun',
    metaTitle: 'Money clip da Caviar may trám, tag tên mạ vàng',
    metaDescription:
      'Money clip da Caviar đen may trám, tag kim loại mạ vàng khắc tên riêng, kẹp nam châm. Khâu tay tại xưởng KOI Sài Gòn, làm quà cá nhân hoá.',
    html:
      '<p>Money clip da Caviar màu đen may trám ô quả trám, gắn tag kim loại mạ vàng khắc tên riêng theo chữ ký của chủ nhân. Kẹp nam châm giấu trong da, tờ tiền gập đôi kẹp giữa hai mặt.</p>' +
      '<p>Caviar vân hạt sần nổi, bám tay và khó lộ xước, hợp kiểu may trám nổi khối. Tag tên cắt theo file chữ ký khách gửi, gắn chắc vào mặt da; cách cá nhân hoá này hay được chọn làm quà sinh nhật, quà đối tác.</p>' +
      '<ul><li>Da Caviar đen may trám, kẹp nam châm</li><li>Tag kim loại mạ vàng khắc tên hoặc chữ ký</li><li>Đặt riêng: đổi màu da, tag bạc, dập tên nhiệt</li></ul>',
  },
  {
    slug: 'bao-kinh-etoupe',
    metaTitle: 'Bao kính da Epsom etoupe có dây đeo, dập tên',
    metaDescription:
      'Bao kính da bê Epsom màu etoupe, nắp nút bấm, dây đeo cổ tháo rời, dập tên nhũ bạc. Khâu tay tại xưởng KOI Sài Gòn, đặt riêng màu theo ý.',
    html:
      '<p>Bao đựng kính bằng da bê Epsom màu etoupe, nắp gài nút bấm, kèm dây đeo cổ dài tháo rời móc bạc để đeo kính trước ngực khi không dùng. Tên chủ nhân dập nhũ bạc dọc thân bao.</p>' +
      '<p>Epsom vân hạt nhỏ, mặt đứng, ít lộ xước, giữ nét chữ dập sắc. Bao ôm gọng kính vừa vặn, đường may tay quanh viền. Tháo dây đeo ra là thành bao kính bỏ túi thường.</p>' +
      '<ul><li>Da bê Epsom màu etoupe, may tay</li><li>Nắp nút bấm, dây đeo cổ tháo rời, phụ kiện bạc</li><li>Dập tên nhũ bạc theo yêu cầu, làm màu khác khi đặt riêng</li></ul>',
  },
  {
    slug: 'tam-lot-ban-nau-choco',
    metaTitle: 'Tấm lót bàn da trơn màu nâu sô-cô-la',
    metaDescription:
      'Tấm lót bàn da trơn màu nâu sô-cô-la, may viền, cắt theo kích thước bàn. Đồ da văn phòng làm tại xưởng KOI Sài Gòn, dập logo theo yêu cầu.',
    html:
      '<p>Tấm lót bàn làm việc bằng da trơn màu nâu sô-cô-la, mặt phẳng để viết và đặt laptop, mép may viền quanh bốn cạnh, góc bo nhẹ. Đặt lên bàn gỗ là có ngay một khoảng làm việc ấm, không trơn, không ồn khi đặt cốc và chuột.</p>' +
      '<p>Xưởng cắt theo kích thước bàn hoặc cỡ khách chọn; có bản thêm hai mép gập giữ giấy ở hai đầu. Da trơn dùng lâu lên bóng nhẹ; lau khô hằng ngày là đủ.</p>' +
      '<ul><li>Da trơn màu nâu sô-cô-la, may viền tay</li><li>Cắt theo kích thước bàn, tuỳ chọn mép gập</li><li>Dập logo, đặt số lượng cho văn phòng</li></ul>',
  },
];
