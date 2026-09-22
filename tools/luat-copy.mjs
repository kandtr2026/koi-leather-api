/**
 * Bộ luật sửa văn phong mô tả sản phẩm — dùng CHUNG cho cả bản ghi thật
 * (sua-copy-sp.mjs) lẫn bản xem trước (xem-sua.mjs).
 *
 * Tách ra một chỗ vì lý do rất cụ thể: nếu bản xem và bản ghi giữ hai bản sao
 * của cùng bộ luật thì sớm muộn sẽ lệch, và lúc đó em sẽ duyệt một đằng còn DB
 * nhận một nẻo.
 */
/**
 * CHE TRƯỚC KHI SỬA.
 *
 * "bạn" trong "bạn bè / bạn gái / bạn trai / bạn đời / người bạn đồng hành"
 * là DANH TỪ, không phải đại từ xưng hô. Em đã đo: 112/498 lần khớp trong mô tả
 * sản phẩm rơi vào nhóm này — 22%. Thay máy móc là ra "khách hàng bè".
 * Tương tự "mình" trong "mang theo bên mình", "biết mình là ai" là phản thân.
 *
 * Nên che chúng lại bằng ký tự không bao giờ có trong nội dung, chạy luật xong
 * mới mở ra.
 */
export const CHE = [
  /(?<![a-zà-ỹ])[Bb]ạn\s+(bè|gái|trai|đời|trẻ|thân(?![a-zà-ỹ])|đọc(?![a-zà-ỹ]))/g,
  /(người|một)\s+bạn\s+đồng\s+hành/gi,
  /(mang theo|giữ|để|ở)\s+bên\s+mình/gi,
  /biết\s+mình\s+là\s+ai/gi,
  /của\s+mình(?![a-zà-ỹ])/gi,
  /chính\s+mình(?![a-zà-ỹ])/gi,
];

/**
 * Mỗi dòng là MỘT quyết định biên tập, không phải một lệnh sed.
 *
 * Thứ tự có ý nghĩa: luật cụm dài chạy trước luật cụm ngắn, nếu không thì cụm
 * ngắn ăn mất phần đầu của cụm dài.
 */
export const LUAT = [
  // --- tên thương hiệu: theo quyết định A Khoa đã chốt đợt trước là "KOI" ---
  // Mon duyệt đồng bộ trong DB cho khớp phần git. Không đụng tên miền và email
  // (đều viết thường nên không khớp mẫu này).
  { ten: 'brand-loi', nhom: 'brand', tim: /(?<![a-zà-ỹ])Loi\s+Leather/g, thay: 'KOI Leather' },
  { ten: 'brand-koi', nhom: 'brand', tim: /(?<![A-Za-zÀ-ỹ])Koi\s+Leather/g, thay: 'KOI Leather' },

  // --- "xưởng" làm CHỦ NGỮ -> KOI. Giữ khi là nơi chốn hoặc cụm danh từ.
  // "xưởng đồ da", "tại xưởng", "ghé xưởng" là từ khoá thật (17 truy vấn
  // GSC/Ads) — xoá là mất traffic. Mon cấm CÁCH XƯNG, không cấm chữ.
  // Không dùng \b sau động từ: chữ có dấu (đã, sẽ, đề) kết thúc bằng ký tự mà
  // JS không coi là word char nên \b không khớp — lỗi đã dính một lần ở đợt
  // sửa phía git, mất 32 chỗ.
  {
    ten: 'xung-xuong',
    // Nhóm RIÊNG, không nằm chung 'xung'. Trên mô tả sản phẩm và trang bán hàng
    // thì 'xưởng <động từ>' gần như luôn là Koi tự xưng. Nhưng trong BÀI BLOG
    // thì ngược lại: bài viết bàn về cả ngành, nên 'xưởng' là danh từ chung —
    // 'Xưởng may đồ da → thiên về quy trình công nghiệp', 'chọn đúng xưởng có
    // tay nghề', và có bài còn liệt kê nguyên cụm từ khoá người ta hay search
    // ('xưởng thiết kế đồ da, xưởng làm đồ da'). Soi tay 10 chỗ trong blog thì
    // chỉ 4 chỗ thật sự là Koi. Nên blog KHÔNG chạy luật này, sửa tay.
    nhom: 'xuong',
    // Lượng từ đứng trước => "xưởng" là DANH TỪ CHUNG số nhiều, nói về các
    // xưởng nói chung chứ không phải KOI. Bản đầu thiếu chốt này và đã suýt
    // ghi "chất lượng giữa các xưởng có thể khác biệt" thành "giữa các KOI có
    // thể khác biệt" trong một bài viết về da dê thuộc.
    tim: /(?<!(?:tại|ở|về|tới|đến|ghé|qua|từ|trong|ngoài|của|cảnh|thăm|xuất|với|các|những|nhiều|mọi|từng|mỗi|hai|ba)\s)(?<![a-zà-ỹ])([Xx])ưởng(\s+)(làm|nhận|nói|báo|gửi|đọc|sửa|đã|sẽ|xuất|đề|gọi|trả|dập|trao|cắt|xem|tư|vẫn|chọn|xử|có|bảo|đều|mới|xác|biết|vẽ|dùng|cần|xếp|cam|không|dành|đối|hoàn|chỉnh|bắt|kể|luôn|nhập|cho|lên|hoạt|chưa|quay|kiểm|tính|chốt|ghép|khâu|may|thường|phải|chỉ|giữ|đặt|tạo|đo)(?![a-zà-ỹ])/g,
    thay: (_m, _hoa, khoang, dt) => `KOI${khoang}${dt}`,
  },

  // --- xưng hô ---
  // Hoa/thường phải mở ở CẢ HAI chữ. Bản đầu em viết `[Qq]uý\s+khách` nên
  // "quý Khách" và "Quý Khách" lọt hết — 16 chỗ vẫn sống trên web sau khi em
  // tưởng đã dọn xong. Bản quét DB không thấy vì nó dùng cùng một mẫu sai.
  { ten: 'quy-khach', nhom: 'xung', tim: /(?<![a-zà-ỹ])[Qq]uý\s+[Kk]hách(?![a-zà-ỹ])/g, thay: 'khách hàng' },
  // "dập nóng": 0 truy vấn trong snapshot GSC/Ads, trong khi "khắc tên" có 127.
  // Đổi tên gọi không mất traffic, mà lại là chữ khách thật sự gõ.
  // KHÔNG đổi khi câu đang ĐỐI CHIẾU hai kỹ thuật với nhau: "Dập nóng hoặc
  // khắc laser" mà đổi thì ra "Khắc hoặc khắc laser" — vừa lặp vừa xoá mất sự
  // phân biệt kỹ thuật đang là nội dung chính của câu. Ở đó "dập nóng" là TÊN
  // KỸ THUẬT chứ không phải cách gọi dịch vụ.
  { ten: 'dap-nong', nhom: 'xung', tim: /(?<![a-zà-ỹ])([Dd])ập\s+nóng(?!\s*(hoặc|hay|và|,)\s*(khắc|in))(?![a-zà-ỹ])/g, thay: (_m, h) => (h === 'D' ? 'Khắc' : 'khắc') },
  // ĐÃ BỎ luật 'ben-minh' ("bên mình" -> "KOI").
  //
  // Lý do: không máy móc nào tách được hai nghĩa của "bên mình". Nghĩa Koi tự
  // xưng ("sản phẩm bên mình") thì phải sửa; nghĩa phản thân ("mang theo bên
  // mình") thì không. Em từng che nhóm phản thân bằng mẫu "(mang theo|giữ|để|
  // ở) bên mình", nhưng mẫu đó đòi hai cụm ĐỨNG CẠNH nhau — nên câu "mang theo
  // hình ảnh người bạn bốn chân bên mình mỗi ngày" lọt lưới và bị ghi thành
  // "người bạn bốn chân KOI mỗi ngày". Đã hoàn nguyên dòng đó bằng tay.
  //
  // Cả DB chỉ còn 2 chỗ "bên mình", không đáng đánh đổi. Sửa tay ở đợt 2.

  // --- đại từ "bạn" ---
  //
  // BỎ CHỦ NGỮ, ĐỪNG THAY CHỦ NGỮ. Tiếng Việt lược chủ ngữ rất tự nhiên, nên
  // "Nếu đang sở hữu một chiếc đồng hồ cơ…" đọc xuôi y như bản có "bạn".
  //
  // Bản đầu em viết là đổi vế: "Nếu bạn đang sở hữu X thì Y là lựa chọn" ->
  // "Dành cho khách hàng đang sở hữu X thì Y…". Chữ "thì" ở vế sau lập tức mồ
  // côi, câu gãy hẳn. Đọc bản xem trước mới thấy. Lược chủ ngữ giữ nguyên cặp
  // "Nếu… thì…" nên không đụng gì tới vế sau.
  { ten: 'neu-ban', nhom: 'ban', tim: /(?<![a-zà-ỹ])([Nn]ếu|[Kk]hi|[Dd]ù|[Dd]ẫu)\s+bạn(?![a-zà-ỹ])\s+/g, thay: (_m, t) => `${t} ` },
  { ten: 'giup-ban', nhom: 'ban', tim: /(?<![a-zà-ỹ])giúp\s+bạn(?![a-zà-ỹ])/g, thay: 'giúp' },
  { ten: 'cho-ban', nhom: 'ban', tim: /(?<![a-zà-ỹ])(mang lại|đem lại|mang đến|đem đến)\s+cho\s+bạn(?![a-zà-ỹ])/g, thay: (_m, v) => v },
  { ten: 'cua-ban', nhom: 'ban', tim: /(?<![a-zà-ỹ])(phong cách|cá tính|gu|nhu cầu|sở thích|thói quen)\s+của\s+bạn(?![a-zà-ỹ])/g, thay: (_m, n) => `${n} riêng` },
  { ten: 'ban-co-the', nhom: 'ban', tim: /(?<![a-zà-ỹ])([Bb])ạn\s+có\s+thể(?![a-zà-ỹ])/g, thay: (_m, h) => (h === 'B' ? 'Có thể' : 'có thể') },
  { ten: 'de-ban', nhom: 'ban', tim: /(?<![a-zà-ỹ])để\s+bạn(?![a-zà-ỹ])\s+(có thể\s+)?/g, thay: 'để ' },
  { ten: 'ban-se', nhom: 'ban', tim: /(?<![a-zà-ỹ])([Bb])ạn\s+sẽ(?![a-zà-ỹ])/g, thay: (_m, h) => (h === 'B' ? 'Khách hàng sẽ' : 'khách hàng sẽ') },
  { ten: 'chi-ban', nhom: 'ban', tim: /(?<![a-zà-ỹ])(mà\s+)?chỉ\s+bạn\s+sở\s+hữu/g, thay: 'không đụng hàng' },

  // --- ĐỢT 1B: cái đuôi dài của "bạn" ---
  // Sau đợt 1A còn 159 ngữ cảnh riêng biệt, gần hết là sở hữu cách "X của bạn".
  // Tiếng Việt bỏ hẳn "của bạn" là xuôi: "nâng cấp phong cách của bạn" ->
  // "nâng cấp phong cách". Nên mặc định là BỎ, chỉ đổi thành "khách hàng" ở
  // những chỗ câu cần một chủ thể rõ ràng.
  // Hai vai trò ngữ pháp khác nhau, không gộp được:
  //  - bổ nghĩa cho danh từ: "thiết kế riêng của bạn" -> "thiết kế riêng". OK.
  //  - làm VỊ NGỮ: "nhỏ thôi, nhưng là của riêng bạn" -> "nhưng là riêng" thì
  //    câu hỏng hẳn. Ở đây phải là "của riêng mình" ("mình" phản thân chỉ người
  //    đọc, không phải Koi tự xưng).
  // Động từ nối đứng trước => "của riêng bạn" đang làm VỊ NGỮ. Lúc đầu em chỉ
  // bắt "là", nên "làm chiếc túi thành của riêng bạn" vẫn bị rút thành "thành
  // riêng". Phải liệt kê đủ nhóm động từ nối.
  { ten: 'la-cua-rieng-ban', nhom: 'ban', tim: /(?<![a-zà-ỹ])(là|thành|trở\s+thành)\s+của\s+riêng\s+bạn(?![a-zà-ỹ])/g, thay: (_m, v) => `${v} của riêng mình` },
  { ten: 'cua-rieng-ban', nhom: 'ban', tim: /(?<![a-zà-ỹ])(của\s+riêng\s+bạn|riêng\s+của\s+bạn)(?![a-zà-ỹ])/g, thay: 'riêng' },
  // "cho chính bạn hoặc người thân" -> "cho chính mình…": "mình" ở đây là phản
  // thân chỉ người mua, không phải Koi tự xưng, nên không phạm luật của Mon.
  { ten: 'chinh-ban', nhom: 'ban', tim: /(?<![a-zà-ỹ])chính\s+bạn(?![a-zà-ỹ])/g, thay: 'chính mình' },
  { ten: 'danh-cho-ban', nhom: 'ban', tim: /(?<![a-zà-ỹ])dành\s+(riêng\s+)?cho\s+bạn(?![a-zà-ỹ])/g, thay: (_m, r) => `dành ${r || ''}cho khách hàng` },
  { ten: 'ban-than-ban', nhom: 'ban', tim: /(?<![a-zà-ỹ])bản\s+thân\s+bạn(?![a-zà-ỹ])/g, thay: 'bản thân' },
  { ten: 'cach-ban', nhom: 'ban', tim: /(?<![a-zà-ỹ])cách\s+bạn\s+(định nghĩa|thể hiện|sử dụng|dùng)/g, thay: (_m, v) => `cách ${v}` },
  { ten: 'ban-mong-muon', nhom: 'ban', tim: /(?<![a-zà-ỹ])bạn\s+(mong muốn|yêu thích|lựa chọn|đang dùng)(?![a-zà-ỹ])/g, thay: (_m, v) => `khách hàng ${v}` },
  { ten: 'toi-tay-ban', nhom: 'ban', tim: /(?<![a-zà-ỹ])(trong|tới|đến|trên)\s+tay\s+bạn(?![a-zà-ỹ])/g, thay: (_m, g) => `${g} tay` },
  { ten: 'co-tay-ban', nhom: 'ban', tim: /(?<![a-zà-ỹ])cổ\s+tay\s+bạn(?![a-zà-ỹ])/g, thay: 'cổ tay' },
  { ten: 'ban-khong-chi', nhom: 'ban', tim: /(?<![a-zà-ỹ])([Bb])ạn\s+không\s+chỉ(?![a-zà-ỹ])/g, thay: (_m, h) => `${h === 'B' ? 'K' : 'k'}hách hàng không chỉ` },
  // Luật vét: mọi "của bạn" còn lại. Chạy CUỐI để các luật cụ thể ở trên
  // (của riêng bạn, phong cách của bạn…) được quyền quyết trước.
  //
  // Bản đầu em viết `(?<![a-zà-ỹ])\s+của\s+bạn` và nó chỉ ăn 1 chỗ trong khi DB
  // còn 56. Lý do: lookbehind nằm ngay trước `\s+`, tức là đòi ký tự đứng trước
  // DẤU CÁCH không phải chữ cái — mà trong "ngày của bạn" thì đó là chữ "y".
  // Bản thân `\s+` đã là ranh giới từ rồi, không cần lookbehind nữa.
  { ten: 'cua-ban-vet', nhom: 'ban', tim: /\s+của\s+bạn(?![a-zà-ỹ])/g, thay: '' },
];

export function che(s) {
  const kho = [];
  let ra = s;
  for (const re of CHE) {
    ra = ra.replace(re, (m) => {
      kho.push(m);
      return ` ${kho.length - 1} `;
    });
  }
  return { ra, kho };
}
export const moChe = (s, kho) => s.replace(/ (\d+) /g, (_m, i) => kho[Number(i)]);

