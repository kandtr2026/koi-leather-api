export const meta = {
  name: 'koi-landing-dat-rieng-v2',
  description: 'Soạn layout + content cho 5 landing "đặt riêng" của koileather.com, có phản biện đối kháng',
  whenToUse: 'Khi cần bộ landing page hướng khách đặt riêng cho koileather.com, bám số liệu thật',
  phases: [
    { title: 'Soạn nội dung', detail: 'Một agent mỗi landing, ghi ra file .md' },
    { title: 'Phản biện', detail: 'Một agent đối kháng mỗi landing: soi số bịa, slug bịa, hứa suông' },
    { title: 'Sửa lỗi chặn', detail: 'Chỉ chạy khi phản biện tìm được lỗi chặn/nặng' },
    { title: 'Tổng hợp', detail: 'Gộp thành tài liệu bàn giao cho chủ xưởng' },
  ],
}

const KB = 'E:/Claude A Khoa Processing/Koi Backend/.kb-khaosat'
const RA = 'E:/Claude A Khoa Processing/Koi Backend/.kb-landing'

// Hai lần chạy trước tắc ở đúng ~234KB transcript vì mỗi agent đọc cả 4 bản khảo
// sát gốc (~198k ký tự) rồi ngộp. BRIEF.md ĐÃ là bản chắt lọc đã kiểm chứng của
// chính 4 file đó. Nên: chỉ đọc BRIEF.md, và cấm đọc 4 file kia.
const NGUON = `
Đọc DUY NHẤT một file để lấy số liệu: ${KB}/BRIEF.md — đọc hết, mọi con số phải lấy từ đây.

CẤM đọc các file khác trong ${KB}/ (tu-khoa.md, doi-thu-chuan.md, trung-tu-khoa.md,
chuyen-doi.md). Nội dung của chúng đã được chắt lọc và kiểm chứng lại vào BRIEF.md; đọc
thêm chỉ làm bạn quá tải và tắc. Cũng CẤM truy vấn database — sẽ vượt pool kết nối Supabase.

LUẬT SẮT — vi phạm là sản phẩm bị loại:
- KHÔNG bịa số. Không volume tìm kiếm, không "hơn 10.000 khách", không năm kinh nghiệm,
  không thời gian làm, không % cọc, không bảo hành. Thiếu số thì viết [NGƯỜI BÁN ĐIỀN: cần gì].
- KHÔNG bịa slug. Chỉ được link tới URL có trong mục 2 BRIEF.md, hoặc /san-pham/{slug}/
  với slug có trong bảng mục 1. Trước khi viết một link, tìm lại slug đó trong BRIEF.md.
- Cấm viết "từ 0đ" — 9 danh mục còn sản phẩm giá 0.
- Cấm nhắm tên thương hiệu người khác cho sản phẩm thay thế (kiểu "đặt làm dây lưng
  Hermes"). Cấm doorway page theo quận. Cấm nhắm từ khoá giá rẻ.
- Cấm khai Product hoặc aggregateRating trong JSON-LD.
- Tiếng Việt tự nhiên, giọng người bán đồ da thủ công thật. Không sáo ngữ marketing.
- koileather ≠ kitleather. Không nhắc Shopee, không nhắc kitleather.vn.

CẤM đọc mã nguồn koi-storefront. Mọi thứ bạn cần biết về component đã ghi ở dưới — tôi đã
đọc file thật và chép ra. Lần chạy trước các agent tiêu hết ngân sách đi đọc 7 file .tsx
rồi tắc trước khi viết được chữ nào.
`

// Đã đọc mã nguồn thật một lần và chép ra đây, để không agent nào phải đi đọc lại.
const COMPONENT = `
COMPONENT ĐANG CÓ (đã kiểm chứng từ mã nguồn thật, dùng đúng như mô tả, đừng đi đọc lại):

- \`<ContactBar productName?={string} />\` — koi-storefront/src/components/contact-bar.tsx.
  MỘT component, HAI hình dạng tự đổi theo cỡ màn: điện thoại = thanh ngang dính đáy 3 ô
  (Gọi · Zalo · Messenger); máy tính = cột dọc dán mép phải, canh giữa chiều cao.
  ĐÃ CÓ SẴN — chỉ render \`<ContactBar />\` một lần ở cuối trang. TUYỆT ĐỐI không dựng
  thanh liên hệ riêng, sẽ thành hai thanh chồng nhau.
- \`<ContactLink kind="zalo"|"messenger"|"phone" productName?={string} productUrl?={string}
  className={string}>{children}</ContactLink>\` — client component, giao diện hoàn toàn do
  className của nơi gọi quyết định, nên dùng được cho MỌI nút CTA trong bài. Nó tự dựng
  href, tự gọi trackContactClick() và ghiNhanLienHe(). Mọi nút Zalo trong landing phải
  dùng component này, không viết thẻ <a href="https://zalo.me/..."> tay.
- Tin nhắn Zalo: KHÔNG tự nối chuỗi. \`zaloLink()\` (src/lib/contact.ts) đã lo hết. Nó sinh
  \`Chào shop, mình quan tâm sản phẩm: {productName} ({productUrl})\` + dòng
  \`(Mã tư vấn: ...)\` nếu khách đến từ quảng cáo; không có productName thì ra
  \`Chào shop, mình cần tư vấn.\` Việc của bạn là viết ra chuỗi productName nên truyền vào
  cho landing này (ví dụ "đặt làm túi da theo yêu cầu"), KHÔNG phải viết URL zalo.me.
- \`<LeadForm productId?={number} productName?={string} />\` — hiện có 3 trường
  (name, phone, message) + bẫy spam. Form 4 trường ở mục 4 BRIEF.md là thứ CẦN THÊM;
  hãy ghi rõ đó là việc phải làm, đừng viết như thể đã có.
- \`<ProductCard p={ProductWithImages} />\` — dùng cho lưới sản phẩm. Tự link tới
  \`/cua-hang/{slug}/\`, tự lấy ảnh bìa. Lưới hiện dùng
  \`grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4\`.
- \`<PostList posts={Post[]} />\` — dùng cho khối bài liên quan.
- Số liên hệ thật: điện thoại/Zalo 0901 678 999 · Messenger koileathercraft ·
  email koi.leather19@gmail.com · địa chỉ "Số 2/16 Nguyễn Bặc, Tân Sơn Hòa, TP. HCM".
  Dùng \`prettyPhone()\` để hiện "0901 678 999".
- \`main\` đã có \`pb-16 md:pb-0\` (src/app/layout.tsx) → đừng đặt CTA cuối trong 64px cuối
  trang, sẽ bị thanh đáy che.
`

// Danh sách landing đã chốt từ số liệu mục 0.2, 1 và 2 của BRIEF.md.
// Nguyên tắc xếp thứ tự: nơi ĐÃ có khách organic hoặc ĐÃ có cú bấm quảng cáo thì làm
// trước, vì đo được trước/sau ngay trong tuần đầu.
const LANDINGS = [
  {
    ma: 'tui-da-dat-rieng',
    thu_tu: 1,
    url: '/dich-vu-lam-tui-da-theo-yeu-cau/',
    loai: 'A-bai-co-organic',
    do_dai_cu: '11.272 ký tự',
    bang_chung: '6 khách Google riêng trong 1,5 ngày đo được — cửa organic đã mở',
    danh_muc: ['tui-da-cho-nu (49 SP, 3,8 – 11,5 – 79,0 triệu, 2 SP giá 0)', 'tui-da-cho-nam (14 SP, 6,9 – 16,0 – 39,0 triệu)'],
    gia_noi: 'túi nữ 3,8 – 79,0 triệu, phần lớn quanh 11,5 triệu; túi nam 6,9 – 39,0 triệu, phần lớn quanh 16,0 triệu',
    tu_khoa: ['làm túi da theo yêu cầu', 'đặt làm túi da thật', 'túi da thủ công đặt riêng', 'thiết kế túi da theo mẫu'],
    ho_tro: 'bài liên quan có thật: thiet-ke-do-da-theo-yeu-cau (14.717), goi-y-nhung-mau-tui-thoi-trang-handmade-hut-hon-chi-em-cong-so, quy-trinh-che-tac-karkarbag, bo-sua-tap-tui-da-nu-cao-cap-rubellite-koi-leather, bo-suu-tap-tui-da-cao-cap-mettique-koi-leather. Trang tĩnh /tui-da-nu/ (28.444) và /tui-da-nam/ (26.965) đang tồn tại — phải nói rõ phân vai với chúng.',
    ghi_chu: 'Danh mục giá trị cao nhất site. Đây là landing quan trọng nhất, viết kỹ nhất.',
  },
  {
    ma: 'qua-tang-doanh-nghiep',
    thu_tu: 2,
    url: '/san-xuat-qua-tang-doanh-nghiep-va-su-kien/',
    loai: 'B-trang-tinh-dai',
    do_dai_cu: '39.470 ký tự',
    bang_chung: 'cụm 45 bài lớn nhất site; 14/40 cú bấm quảng cáo rơi vào /qua-tang-doanh-nghiep-cuoi-nam/ trong cụm này, 13 khách Google — chỗ thất thoát tiền quảng cáo lớn nhất',
    danh_muc: ['không có danh mục 1-1: qua-tang-su-kien có 0 SP. Lấy hàng từ card-holder (14 SP, 1,8 – 2,8 – 9,5 triệu), leather-passport-cover (10 SP, 1,8 – 2,8 – 4,2 triệu), keychain-moc-khoa (4 SP, 0,3 – 0,5 – 0,8 triệu), leather-phonecase (24 SP, 0,8 – 2,8 – 8,3 triệu, 1 SP giá 0)'],
    gia_noi: 'theo món: card holder 1,8 – 9,5 triệu · bao passport 1,8 – 4,2 triệu · móc khoá 0,3 – 0,8 triệu · ốp điện thoại 0,8 – 8,3 triệu. MOQ và bậc giá số lượng lớn là [NGƯỜI BÁN ĐIỀN]',
    tu_khoa: ['sản xuất quà tặng doanh nghiệp bằng da', 'quà tặng doanh nghiệp cao cấp khắc tên', 'quà tặng sự kiện bằng da thật', 'đặt quà tặng doanh nghiệp số lượng lớn'],
    ho_tro: 'case study khách CÓ THẬT để dẫn chứng: qua-tang-doanh-nghiep-mobifone, qua-tang-su-kien-cgv, qua-tang-su-kien-bentley, qua-tang-su-kien-doc-dao-vasta-stone, qua-tang-doanh-nghiep-tap-doan-nam-long, qua-tang-su-kien-tap-doan-loc-troi, qua-tang-doanh-nghiep-tap-doan-vingroup, qua-tang-doanh-nghiep-cao-fine-jewellery. Bài mùa vụ: qua-tang-doanh-nghiep-cuoi-nam, qua-tet-doanh-nghiep, qua-tang-20-10 (22.690), qua-tang-thay-co-ngay-20-11.',
    ghi_chu: 'CẨN TRỌNG ĐẶC BIỆT: site có HAI trang tĩnh gần trùng — /san-xuat-qua-tang-doanh-nghiep-va-su-kien/ (39.470) và /qua-tang-doanh-nghiep-va-su-kien/ (22.418). Landing là trang thứ nhất. Phải đề xuất rõ cách xử lý trang thứ hai, và tuyệt đối KHÔNG đổi title của /qua-tang-doanh-nghiep-cuoi-nam/ vì đó là trang đang giữ traffic quảng cáo — chỉ thêm link trỏ lên hub. Đây là landing B2B: khách là người mua hàng doanh nghiệp, cần MOQ, bậc giá, hoá đơn VAT, mốc giao đúng hạn sự kiện — không phải khách lẻ.',
  },
  {
    ma: 'day-da-dong-ho-dat-rieng',
    thu_tu: 3,
    url: '/day-da-dong-ho/',
    loai: 'B-trang-tinh-dai',
    do_dai_cu: '43.526 ký tự — trang dài nhất site',
    bang_chung: '43 SP ACTIVE + cụm 28 bài thay dây đồng hồ theo hãng, kho link nội bộ lớn nhất site',
    danh_muc: ['day-da-dong-ho (43 SP, 1,4 – 2,2 – 7,4 triệu, 1 SP giá 0)', 'watch-case (1 SP, 3,8 triệu)'],
    gia_noi: '1,4 – 7,4 triệu, phần lớn quanh 2,2 triệu',
    tu_khoa: ['đặt làm dây da đồng hồ theo yêu cầu', 'dây da đồng hồ handmade', 'dây da đồng hồ theo số đo', 'dây da đồng hồ da cá sấu'],
    ho_tro: 'bài dịch vụ CÓ THẬT: lam-day-da-dong-ho-handmade-theo-yeu-cau-koi-leather (4.687), dich-vu-sua-con-dia-day-dong-ho (2.334), thay-day-dong-ho (8.298), cach-do-size-day-dong-ho-cuc-chuan-chinh-xac-phu-hop-voi-moi-loai-dong-ho (5.118). Cộng 25 bài thay-day-da-dong-ho-{hãng} (burberry, omega, hublot, tissot, longines, cartier, montblanc, patek-philippe, vacheron-constantin, fossil, mido, versace, swarovski, kate-spade, ted-baker, franck-muller, daniel-wellington, frederique-constant, maurice-lacroix, raymond-weil, royal-london, salvatore-ferragamo, kronos, hermes ⚠).',
    ghi_chu: 'Lệch giá cực lớn: KOI trung vị 2,2 triệu vs đối thủ 350k–1tr → TUYỆT ĐỐI không nhắm từ khoá giá. Bài hãng Hermes có cờ thương hiệu, không nhắm và không link nổi bật. Trang tĩnh này đang có 43.526 ký tự nội dung cũ — phải nói rõ giữ phần nào, bỏ phần nào.',
  },
  {
    ma: 'vi-da-dat-rieng',
    thu_tu: 4,
    url: '/lam-vi-da-theo-yeu-cau/',
    loai: 'A-bai-co-organic',
    do_dai_cu: '8.028 ký tự',
    bang_chung: 'bài cùng cụm /khac-ten-len-vi-da/ có 5 khách Google riêng — ý định khắc tên đã hút organic',
    danh_muc: ['vi-da-cho-nam (27 SP, 3,3 – 4,8 – 11,8 triệu)', 'vi-da-cho-nu (29 SP, 1,8 – 6,8 – 28,0 triệu)', 'kep-tien-money-clip (15 SP, 1,2 – 1,4 – 3,8 triệu)', 'vi-zip-mini (2 SP, 2,2 – 2,5 – 2,9 triệu)'],
    gia_noi: 'ví nam 3,3 – 11,8 triệu, phần lớn quanh 4,8 triệu; ví nữ 1,8 – 28,0 triệu, phần lớn quanh 6,8 triệu',
    tu_khoa: ['làm ví da theo yêu cầu', 'đặt ví da khắc tên', 'ví da thủ công đặt riêng', 'ví da cá sấu đặt làm'],
    ho_tro: 'bài CÓ THẬT: khac-ten-len-vi-da (4.268, 5 khách Google), vi-da-khac-ten (18.833), vi-nam-khac-ten-thu-cong (12.942), khac-chu-len-vi-da-ky-thuat-dap-nhiet-cao-cap (9.098), huong-dan-cach-lua-chon-vi-da-handmade-cuc-xin-cho-nam-gioi (8.335), vi-da-ca-sau-cao-cap (9.571), dat-lam-vi-da-ca-sau (6.163), snap-wallet-vi-snap-cao-cap (4.586), dich-vu-sua-chua-vi-da-cao-cap (10.280), vi-khac-ten-cao-cap-qua-tang-da-that-thu-cong-tai-tp-hcm (10.247), dich-vu-khac-ten-len-san-pham-khac-ten-theo-yeu-cau (20.129).',
    ghi_chu: 'Khắc tên là mũi nhọn: nhiều bài đã có, khách đã tìm. Kỹ thuật khắc và giới hạn số ký tự là [NGƯỜI BÁN ĐIỀN]. Ví cá sấu cần nói rõ giấy tờ CITES là [NGƯỜI BÁN ĐIỀN].',
  },
  {
    ma: 'that-lung-dat-rieng',
    thu_tu: 5,
    url: '/dat-lam-that-lung-theo-yeu-cau-koi-leather/',
    loai: 'A-bai-co-organic',
    do_dai_cu: '7.616 ký tự',
    bang_chung: 'bài cùng cụm /dinh-vu-do-va-cat-day-lung-chuyen-nghiep/ có 6 khách Google riêng',
    danh_muc: ['day-lung-cho-nam (21 SP, 3,5 – 4,5 – 22,0 triệu)', 'day-lung-cho-nu (9 SP, 3,9 – 4,2 – 25,0 triệu)'],
    gia_noi: 'nam 3,5 – 22,0 triệu, phần lớn quanh 4,5 triệu; nữ 3,9 – 25,0 triệu, phần lớn quanh 4,2 triệu',
    tu_khoa: ['đặt làm thắt lưng da theo yêu cầu', 'thắt lưng da theo số đo', 'dây lưng da thật đặt riêng', 'thắt lưng da cá sấu đặt làm'],
    ho_tro: 'bài CÓ THẬT: dinh-vu-do-va-cat-day-lung-chuyen-nghiep (7.697, 6 khách Google — GIỮ NGUYÊN slug sai chính tả "dinh-vu"), dat-lam-day-nit-that-lung-da-theo-yeu-cau (7.863), dat-lam-day-lung-da-ca-sau (9.857), huong-dan-cach-cat-day-nit-tai-nha (3.515), cat-day-nit-o-dau-uy-tin-tai-tp-hcm (3.436), 5-cach-tot-nhat-de-bao-quan-that-lung-da-cao-cap-ben-bi-theo-thoi-gian (5.466), lua-chon-that-lung-da-nam-cao-cap-cung-koi-leather (3.123), sua-that-lung-da-bi-hong-cat-sai-co-khac-phuc-duoc-khong (3.570), phu-kien-rieng-customize-hardware (danh mục khoá 11 SP, 1,8 – 9,5 – 28,0 triệu).',
    ghi_chu: 'CỜ THƯƠNG HIỆU: cụm này có 2 bài vướng — dat-lam-day-lung-hermes (7.730) và dat-lam-day-lung-khoa-chu-h (4.269). Landing TUYỆT ĐỐI không nhắm từ khoá đó, không link nổi bật tới chúng, và phải nêu rõ trong phần cảnh báo rằng người bán cần tự quyết số phận 2 bài đó. Đo số đo là lợi thế riêng: khối quy trình phải dạy khách tự đo đúng.',
  },
]

log(`Soạn ${LANDINGS.length} landing: ${LANDINGS.map((l) => l.ma).join(', ')}`)

const PHAN_BIEN_SCHEMA = {
  type: 'object',
  required: ['loi', 'ket_luan'],
  properties: {
    loi: {
      type: 'array',
      items: {
        type: 'object',
        required: ['muc_do', 'cho', 'van_de', 'sua_the_nao'],
        properties: {
          muc_do: { type: 'string', enum: ['chan', 'nang', 'nhe'] },
          cho: { type: 'string', description: 'khối hoặc dòng cụ thể' },
          van_de: { type: 'string' },
          sua_the_nao: { type: 'string' },
        },
      },
    },
    ket_luan: { type: 'string', enum: ['dung-duoc', 'phai-sua'] },
    so_tu_uoc: { type: 'integer', description: 'số từ nội dung biên tập đếm được' },
  },
}

// ---------- Soạn → phản biện → sửa, chạy song song theo từng landing ----------
const ketQua = await pipeline(
  LANDINGS,

  // Pha 1: soạn nội dung
  (l) =>
    agent(
      `Soạn TOÀN BỘ layout + nội dung cho một landing page "đặt riêng" của koileather.com —
xưởng đồ da thủ công cao cấp ở TP.HCM. Mục tiêu: kể câu chuyện dẫn khách tới việc ĐẶT
RIÊNG (bespoke), và bắt organic view từ Google.

${NGUON}
${COMPONENT}

LANDING CỦA BẠN — mọi thông tin dưới đây đã kiểm chứng từ database, dùng thẳng, đừng nghi ngờ:
${JSON.stringify(l, null, 1)}

KIẾN TRÚC ĐÃ CHỐT, KHÔNG LẬT LẠI: landing này là URL ĐANG TỒN TẠI được viết lại, giữ
nguyên đường dẫn. Không đề xuất URL mới. Không đề xuất 301. Lý do ở mục 0 BRIEF.md:
bảng đo traffic mới sống 1,5 ngày nên "0 organic" là CHƯA ĐO, không phải trang chết.

Ghi kết quả bằng công cụ Write vào đúng file: ${RA}/${l.ma}.md
(thư mục đã tồn tại, ghi thẳng, không cần mkdir)

CẤU TRÚC FILE PHẢI CÓ, theo đúng thứ tự:

## 0. Thẻ meta và phân vai
- URL, H1, title (≤60 ký tự, có động từ hành động), meta description (≤155 ký tự, phải
  trả lời cái lo lớn nhất của khách ngay trên trang kết quả), từ khoá đích.
- Bảng phân vai: landing này vs /san-pham/{slug}/ tương ứng — khác nhau ở H1, title, từ
  khoá, nội dung, link chéo. Đây là chỗ chống tự cắn từ khoá, viết cho rõ và cụ thể.
  Nếu ghi_chu nhắc trang tĩnh nào đang gần trùng, phân vai cả với trang đó.
- URL này ĐANG có nội dung cũ (xem do_dai_cu): nói rõ phần nào giữ, phần nào bỏ, và
  cảnh báo phải đọc Google Search Console trước khi đổi title.

## 1..12. Mười hai khối theo khung ở mục 4 BRIEF.md
Với MỖI khối phải có đủ ba thứ:
- **Nội dung thật** — viết ra chữ khách sẽ đọc, KHÔNG phải mô tả "ở đây nên viết về...".
  Đây là phần chiếm hầu hết độ dài. Tổng 1.200–1.800 từ nội dung biên tập, sàn cứng 900.
- **Ảnh cần** — mô tả cụ thể ảnh nào, chú thích gì. Đúng MỘT ảnh trên khung nhìn đầu
  (ảnh LCP). Mật độ 1 ảnh / 150–250 từ.
- **Ghi chú dựng** — dùng lại component nào đang có, CTA đặt ở đâu. Xem khối COMPONENT
  ở trên; đừng đi đọc mã nguồn.

Khối GIÁ: nêu đúng số trong gia_noi ở trên. Cấm "từ 0đ".
Khối CHẤT LIỆU: mỗi tên da nối tới bài giải thích CÓ THẬT trong mục 2 BRIEF.md (nhóm
  chất liệu 40 bài: da-togo, da-epsom-la-gi, da-ca-sau-that, da-de-alran, da-de-thuoc,
  da-da-dieu, so-sanh-da-cuu-va-da-de, da-togo-vs-da-clemence...).
Khối FAQ: 6–9 câu. Câu hỏi phải là chuyện khách hỏi thật — suy ra từ nội dung đã tồn tại
  trên site (danh sách bài ở ho_tro là bằng chứng khách quan tâm gì), không tự nghĩ câu
  vô thưởng vô phạt.
Khối HẠN CHẾ THẬT THÀ: đúng một câu nói thật về giới hạn của xưởng. Đây là thứ Bulltino
  thắng nhờ (mục 5 BRIEF.md) — phải thật, không phải nhược điểm giả kiểu "chúng tôi quá
  tỉ mỉ nên hơi chậm".
Khối NGHỆ NHÂN: tên và vai trò là [NGƯỜI BÁN ĐIỀN].
Khối LƯỚI SẢN PHẨM: 6–12 món, lấy từ danh mục ở trên. 0 sản phẩm ACTIVE nào thiếu ảnh
  nên lưới an toàn.

## 13. Liên kết nội bộ
Bảng: URL đích | chữ neo | đặt ở khối nào | vì sao. Mọi URL phải có thật trong BRIEF.md.
Kèm chiều ngược: bài/trang nào nên thêm link TRỎ VỀ landing này (dùng danh sách ho_tro).

## 14. JSON-LD
Viết mã thật, dán được. Service + ItemList + BreadcrumbList (+ FAQPage nếu có FAQ).
KHÔNG khai Product. KHÔNG khai aggregateRating. LocalBusiness chỉ tham chiếu @id
https://koileather.com/lien-he/#localbusiness.
Ghi rõ: Google đã bỏ FAQ rich result khỏi Search từ 7/5/2026 → FAQ giữ cho người đọc và
AI Overviews, đừng mong rich result.

## 15. Đường chuyển đổi
5 điểm chạm CTA (hero · sau khối GIÁ · sau khối QUY TRÌNH · sau FAQ · ContactBar dính đáy)
với chữ nút cụ thể cho landing này + dòng gỡ lo dưới mỗi nút.
Tin nhắn Zalo soạn sẵn: viết ra chuỗi productName nên truyền vào ContactLink kind="zalo"
productName="..." cho landing này. KHÔNG tự viết URL zalo.me — zaloLink() đã lo (xem
khối COMPONENT).
Form: 4 trường + 1 textarea theo mục 4 BRIEF.md, giá trị select cụ thể cho landing này.
Nêu rõ khuôn ghép vào cột message (bảng leads không có cột riêng cho ngân sách/món/mốc).

## 16. Người bán phải điền
Liệt kê mọi [NGƯỜI BÁN ĐIỀN] đã dùng trong file, gom một chỗ để người bán trả lời một lượt.

Trả về (phần text, KHÔNG phải nội dung file): 3–5 dòng — mã landing, đường dẫn file đã ghi,
số từ nội dung biên tập đếm được, và điều đáng chú ý nhất bạn phát hiện khi soạn.`,
      { label: `soan:${l.ma}`, phase: 'Soạn nội dung' },
    ).then((tomTat) => ({ ...l, tomTat, file: `${RA}/${l.ma}.md` })),

  // Pha 2: phản biện đối kháng
  (r) =>
    agent(
      `Bạn là người phản biện đối kháng. Việc của bạn là TÌM LỖI trong một tài liệu landing
page, không phải khen nó. Mặc định nghi ngờ.

Đọc file cần soi: ${r.file}
Đọc để đối chiếu: ${KB}/BRIEF.md (mục 1 = bảng số SP và giá; mục 2 = danh sách URL có thật)
CẤM đọc file khác trong ${KB}/ và CẤM truy vấn database.

Số liệu đúng của landing này (đã kiểm chứng từ database):
${JSON.stringify({ url: r.url, danh_muc: r.danh_muc, gia_noi: r.gia_noi }, null, 1)}

SOI ĐÚNG SÁU THỨ, theo thứ tự nặng dần:

1. SỐ BỊA. Mọi con số trong file phải khớp bảng mục 1 BRIEF.md / khối số liệu trên, hoặc
   là [NGƯỜI BÁN ĐIỀN]. Sai một chữ số cũng là lỗi "chan". Đặc biệt soi: số SP, giá
   min/trung vị/max, số loại da, số bài viết. Có "từ 0đ" hay giá 0 ở đâu không.
2. SLUG BỊA. Mọi URL nội bộ phải có thật trong mục 2 BRIEF.md, hoặc /san-pham/{slug}/ với
   slug trong bảng mục 1. Tìm từng link, đối chiếu từng cái. Link chết là lỗi "chan".
3. HỨA SUÔNG. Thời gian làm, % cọc, bảo hành, năm kinh nghiệm, số khách hàng, đổi trả —
   có số nào không phải [NGƯỜI BÁN ĐIỀN] mà cũng không có nguồn không? Năm thành lập site
   đang tự mâu thuẫn (2017 vs "hơn 10 năm" vs "hơn 7 năm") — file có nhân bản mâu thuẫn đó không.
4. TỰ CẮN TỪ KHOÁ. Bảng phân vai có thật sự tách được landing khỏi /san-pham/{slug}/ và
   khỏi trang tĩnh gần trùng không, hay chỉ nói suông. Title và H1 có trùng ý định với
   trang danh mục không.
5. MỎNG. Đếm số từ nội dung biên tập thật (không tính ghi chú dựng, không tính JSON-LD,
   không tính bảng liên kết). Dưới 900 từ là lỗi "chan". Có khối nào chỉ là mô tả
   "ở đây nên viết về..." thay vì chữ thật không — đó là lỗi "chan".
6. VI PHẠM RÀNG BUỘC. Có nhắm tên thương hiệu người khác cho sản phẩm thay thế không
   (dịch vụ sửa/thay thì được, sản phẩm thay thế thì không). Có khai Product hay
   aggregateRating trong JSON-LD không. Có doorway page theo quận không. Có nhắc
   Shopee/kitleather không. Có popup không. Có dựng thanh liên hệ riêng thay vì dùng
   ContactBar không (sẽ thành hai thanh chồng nhau).

Mức độ: "chan" = không xuất bản được. "nang" = sai nhưng sửa được nhanh. "nhe" = góp ý.
Nếu không tìm được lỗi chan/nang nào thì trả ket_luan "dung-duoc" — nhưng hãy chắc là bạn
đã thật sự đối chiếu từng con số và từng link, không phải đọc lướt.`,
      { label: `phan-bien:${r.ma}`, phase: 'Phản biện', schema: PHAN_BIEN_SCHEMA },
    ).then((pb) => ({ ...r, pb })),

  // Pha 3: sửa — chỉ khi có lỗi chặn hoặc nặng
  (r) => {
    const loi = (r.pb && r.pb.loi) || []
    const phaiSua = loi.filter((x) => x.muc_do === 'chan' || x.muc_do === 'nang')
    if (!phaiSua.length) return { ...r, daSua: false, soLoiSua: 0 }
    return agent(
      `Sửa tài liệu landing page theo kết quả phản biện. Sửa TẠI CHỖ bằng công cụ Edit,
giữ nguyên cấu trúc file, chỉ vá đúng chỗ sai.

File: ${r.file}
Đối chiếu: ${KB}/BRIEF.md. CẤM đọc file khác trong ${KB}/ và CẤM truy vấn database.

Số liệu đúng của landing này:
${JSON.stringify({ url: r.url, danh_muc: r.danh_muc, gia_noi: r.gia_noi }, null, 1)}

LỖI PHẢI SỬA:
${JSON.stringify(phaiSua, null, 1)}

Nguyên tắc khi sửa:
- Số sai → thay bằng số đúng ở trên hoặc từ bảng mục 1 BRIEF.md. Không tìm được số đúng
  thì đổi thành [NGƯỜI BÁN ĐIỀN: cần gì].
- Link chết → thay bằng URL có thật gần nghĩa nhất trong mục 2 BRIEF.md. Không có cái nào
  gần thì bỏ hẳn link, giữ lại chữ.
- Nội dung mỏng → viết THÊM chữ thật cho khối đang thiếu, không nhồi chữ vô nghĩa.
- Hứa suông → đổi thành [NGƯỜI BÁN ĐIỀN: ...].

Trả về 2–4 dòng: đã sửa những gì, còn sót gì không sửa được và vì sao.`,
      { label: `sua:${r.ma}`, phase: 'Sửa lỗi chặn' },
    ).then((ghiChu) => ({ ...r, daSua: true, soLoiSua: phaiSua.length, ghiChuSua: ghiChu }))
  },
)

const xong = ketQua.filter(Boolean)
log(`Xong ${xong.length}/${LANDINGS.length} landing. Đã sửa: ${xong.filter((r) => r.daSua).length}`)

// ---------- Tổng hợp ----------
phase('Tổng hợp')

const bangKe = xong.map((r) => ({
  ma: r.ma,
  thu_tu: r.thu_tu,
  url: r.url,
  loai: r.loai,
  file: r.file,
  bang_chung: r.bang_chung,
  gia_noi: r.gia_noi,
  ket_luan_phan_bien: r.pb && r.pb.ket_luan,
  so_tu: r.pb && r.pb.so_tu_uoc,
  so_loi_da_sua: r.soLoiSua || 0,
  loi_con_lai: ((r.pb && r.pb.loi) || []).filter((x) => x.muc_do === 'nhe').map((x) => x.van_de),
}))

const KHONG_LAM = [
  { doi_tuong: 'Sửa chữa / spa đồ da (/sua-chua-do-da/ 27.802 ký tự + 10 bài + bài dài nhất site 37.385)', ly_do: 'Cụm lớn và đang có organic, NHƯNG ý định là sửa món khách đã có, không phải đặt riêng. Phễu khác, khách khác, giá khác. Xứng đáng một bộ landing RIÊNG ở giai đoạn 2, không trộn vào bộ này.' },
  { doi_tuong: 'may-tram-chan (10 SP), an-lat-woven (4 SP), cham-khac-tren-da (1 SP)', ly_do: 'Là KỸ THUẬT chế tác, không phải loại sản phẩm — không ai tìm Google bằng "máy trám chần". Giá lại cao (trám chần trung vị 5,7 triệu; đan lát 6,7 triệu) nên dùng làm khối bằng chứng tay nghề nhúng vào landing lớn.' },
  { doi_tuong: 'trademark (13 SP), signature-leather-goods (11 SP), phu-kien-rieng-customize-hardware (11 SP)', ly_do: 'Khái niệm thương hiệu nội bộ, không có nhu cầu tìm kiếm. Mô tả danh mục = 0 ký tự, tức chưa ai từng viết gì cho chúng.' },
  { doi_tuong: 'Bọc da tai nghe (3 SP) và ốp điện thoại da (24 SP) làm landing riêng', ly_do: 'Lệch giá quá lớn: KOI 2,8 triệu vs POD ~100k. Bài /dich-vu-boc-da-tai-nghe-cao-cap/ có 3 khách Google nên GIỮ nguyên, nhưng landing riêng sẽ nhắm phải khách sai giá. Đưa vào khối món của landing quà tặng B2B thì đúng chỗ hơn.' },
  { doi_tuong: 'Cây URL mới /dat-lam/{slug}/', ly_do: 'Site đã có hai tầng cạnh tranh nội bộ (bài + trang tĩnh + danh mục). Thêm tầng thứ ba là tự dập tài sản duy nhất đang hút organic. Landing = nâng cấp URL đang có.' },
  { doi_tuong: 'Doorway page theo quận/huyện, và từ khoá kiểu "đặt làm dây lưng Hermes"', ly_do: 'Doorway vi phạm hướng dẫn Google. Còn tên hãng khác cho SẢN PHẨM THAY THẾ là mức rủi ro pháp lý khác hẳn dịch vụ sửa/thay — dịch vụ sửa dùng dẫn chiếu hợp pháp, sản phẩm thay thế thì không.' },
  { doi_tuong: 'ban-rap-thiet-ke (9 SP, đang bị ẩn khỏi lưới chung)', ly_do: 'URL được giữ sống có chủ ý cho SEO (shop.service.ts:152) nhưng giá 0,1 triệu đồng loạt — đây là hàng nội bộ/mẫu rập, không phải hàng bán. Không dựng landing.' },
]

const CANH_BAO = [
  'Năm thành lập tự mâu thuẫn BA chỗ trên site: /koi-leather-nha-san-xuat.../ nói 2017, /sua-chua-do-da/ nói "hơn 10 năm", /nha-san-xuat-do-da-thu-cong/ nói "hơn 7 năm". 2017 → 2026 là 9 năm. Phải chốt một số trước khi viết chữ đầu tiên, nếu không landing sẽ nhân bản mâu thuẫn ra 5 trang nữa.',
  'Trước khi đổi title của bất kỳ URL nào đang tồn tại: PHẢI mở Google Search Console đọc dữ liệu 16 tháng. Bảng koi_page_views mới sống 1,5 ngày, không đủ để quyết định gì.',
  'TUYỆT ĐỐI không đổi title /qua-tang-doanh-nghiep-cuoi-nam/ — đó là trang đang nhận 14/40 cú bấm quảng cáo và 13 khách Google. Chỉ thêm link trỏ lên hub.',
  'Hai trang tĩnh gần trùng về quà tặng doanh nghiệp (39.470 và 22.418 ký tự) phải được xử lý dứt điểm, nếu không hub mới sẽ cạnh tranh với chính nó.',
  'Hai bài /dat-lam-day-lung-hermes/ và /dat-lam-day-lung-khoa-chu-h/ vướng tên thương hiệu người khác cho sản phẩm thay thế. Số phận của chúng là quyết định của người bán, không phải của SEO — nhưng landing mới không được nhắm loại từ khoá đó.',
  'Chưa có công cụ nào cho volume tìm kiếm (không Keyword Planner, không Ahrefs). Mọi thứ tự ưu tiên trong tài liệu này dựa trên số SP thật, độ dài nội dung thật, và lượt khách organic đo được trong 1,5 ngày — không dựa trên volume.',
]

const tongHop = await agent(
  `Viết tài liệu bàn giao gộp cho bộ landing page "đặt riêng" của koileather.com.
Người đọc là chủ xưởng — biết rõ đồ da, không biết SEO. Viết tiếng Việt, thẳng, không sáo ngữ.

Ghi bằng công cụ Write vào: ${RA}/00-BAN-GIAO.md

Đọc để lấy nội dung:
- ${KB}/BRIEF.md — mục 0 (ba sự thật), mục 3 (lỗi kỹ thuật), mục 4 (khung layout), mục 6
  (ràng buộc), mục 7 (cách đo). Đọc hết file này.
- Từng file landing đã soạn: chỉ đọc phần "## 0" và "## 16" của mỗi file, KHÔNG đọc hết.
CẤM đọc file khác trong ${KB}/ và CẤM truy vấn database.

Bảng kê landing đã soạn:
${JSON.stringify(bangKe, null, 1)}

Danh sách KHÔNG làm landing:
${JSON.stringify(KHONG_LAM, null, 1)}

Cảnh báo phải nêu:
${JSON.stringify(CANH_BAO, null, 1)}

CẤU TRÚC TÀI LIỆU:

# Bộ landing "đặt riêng" — tài liệu bàn giao

## 1. Đọc trước: ba điều đổi cách làm
Ba sự thật ở mục 0 BRIEF.md, viết lại cho chủ xưởng hiểu ngay: (a) bảng đo traffic mới
sống 1,5 ngày nên đừng tin con số "0 organic" — nó là CHƯA ĐO; (b) khách Google đang vào
bằng BÀI DỊCH VỤ chứ không phải trang danh mục; (c) vì vậy landing là nâng cấp URL đang
có, không dựng URL mới.

## 2. Bảng landing — làm cái nào trước
Bảng: thứ tự | URL | landing nói về gì | số SP | khoảng giá | bằng chứng vì sao chọn.
Giữ đúng thứ tự trong bảng kê. Giải thích nguyên tắc xếp: chỗ nào ĐÃ có khách organic
hoặc ĐÃ có cú bấm quảng cáo thì làm trước, vì đo được trước/sau ngay trong tuần đầu.
Nói rõ nên bắt đầu từ trang nào và vì sao.

## 3. Việc phải làm TRƯỚC khi viết chữ đầu tiên
Danh sách có thứ tự từ mục 3 BRIEF.md, mỗi việc một dòng: làm gì, ở file nào, vì sao
không làm thì landing vô nghĩa. Tách rõ nhóm [CHẶN ĐƯỜNG] và nhóm còn lại.
Ghi rõ hai việc đã sửa xong trong lúc soạn tài liệu này: lỗi form mất tên sản phẩm
(mục 3.1) và lỗi vô hạn URL danh mục (mục 3.4) — cả hai đã sửa và đã kiểm chứng.

## 4. Người bán phải trả lời — gom một lượt
Gộp mọi [NGƯỜI BÁN ĐIỀN] từ phần "## 16" của tất cả file landing, dedupe, nhóm theo chủ
đề (thời gian & tiền · bảo hành & đổi trả · xưởng & nghệ nhân · B2B · giấy tờ da đặc biệt).
Đây là danh sách chủ xưởng ngồi trả lời một lần rồi mọi trang dùng chung.
Nêu riêng và nêu ĐẦU TIÊN: năm thành lập đang tự mâu thuẫn ba chỗ trên site.

## 5. Khung layout dùng chung
12 khối, mỗi khối một dòng: nhiệm vụ + trả lời lo lắng nào. Cộng luật CTA (một hành động,
năm điểm chạm), luật form (4 trường + 1 textarea), luật JSON-LD, và ba thứ cấm.

## 6. Những gì KHÔNG làm landing, và vì sao
Từ danh sách KHÔNG làm. Giải thích để chủ xưởng không hỏi lại sau.

## 7. Đo thế nào
Bảng chỉ số + mốc hiện tại từ mục 7 BRIEF.md. Nhấn: luôn đọc cột "khách riêng", đừng đọc
"lượt xem". Nêu rõ mốc để so: quảng cáo 40 cú bấm → 1 hội thoại → 0 đơn chốt; lead 0.

## 8. Cảnh báo và còn tồn
Danh sách cảnh báo ở trên, cộng lỗi "nhẹ" chưa sửa trong từng file.

Cuối tài liệu: bảng đường dẫn tới từng file landing chi tiết.

Trả về (phần text): 6–10 dòng tóm tắt để tôi báo lại chủ xưởng — chốt mấy landing, làm cái
nào trước và vì sao, việc chặn đường nào phải sửa ngay, và người bán cần trả lời mấy câu.`,
  { label: 'ban-giao', phase: 'Tổng hợp' },
)

return {
  soLanding: xong.length,
  danhSach: bangKe,
  khongLam: KHONG_LAM,
  canhBao: CANH_BAO,
  fileBanGiao: `${RA}/00-BAN-GIAO.md`,
  tomTat: tongHop,
}
