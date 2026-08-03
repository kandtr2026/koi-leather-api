export const meta = {
  name: 'koi-landing-dat-rieng-v3',
  description: 'Soạn layout + content cho landing "đặt riêng" của koileather.com, chia nhỏ 3 phần mỗi trang',
  whenToUse: 'Khi cần bộ landing page hướng khách đặt riêng cho koileather.com, bám số liệu thật',
  phases: [
    { title: 'Soạn phần 1-2', detail: 'Mở đầu+giá+quy trình và bằng chứng+FAQ, chạy song song' },
    { title: 'Soạn phần 3', detail: 'Liên kết nội bộ, JSON-LD, đường chuyển đổi' },
    { title: 'Phản biện', detail: 'Một agent đối kháng mỗi landing: soi số bịa, slug bịa, hứa suông' },
    { title: 'Sửa lỗi chặn', detail: 'Chỉ chạy khi phản biện tìm được lỗi chặn/nặng' },
  ],
}

const KB = 'E:/Claude A Khoa Processing/Koi Backend/.kb-khaosat'
const RA = 'E:/Claude A Khoa Processing/Koi Backend/.kb-landing'

// ---------------------------------------------------------------------------
// BA LẦN CHẠY TRƯỚC ĐỀU TẮC. Nguyên nhân thật đã tìm ra ở lần 3:
// transcript của agent chỉ có 6 dòng — prompt, đọc BRIEF.md, rồi
// [Request interrupted by user]. Đó KHÔNG phải user bấm dừng, mà là cơ chế
// hết-180-giây-không-tiến-triển của harness. Agent chết trong lúc đang sinh
// MỘT lệnh Write ~30.000 ký tự: một lệnh gọi công cụ duy nhất, quá dài để
// xong trong cửa sổ 180 giây, nên không bao giờ báo được tiến triển.
//
// Cắt input không cứu được (điểm chết còn dịch SỚM hơn: 234KB → 90KB → 54KB).
// Cách chữa đúng: cắt ĐẦU RA. Mỗi landing chia 3 file, mỗi file ~6–11k ký tự,
// mỗi agent ghi ĐÚNG MỘT Write vừa cỡ đó.
// ---------------------------------------------------------------------------

const NGUON = `
Đọc DUY NHẤT một file để lấy số liệu: ${KB}/BRIEF.md — đọc hết, mọi con số phải lấy từ đây.

CẤM đọc các file khác trong ${KB}/ (tu-khoa.md, doi-thu-chuan.md, trung-tu-khoa.md,
chuyen-doi.md). Nội dung của chúng đã được chắt lọc và kiểm chứng lại vào BRIEF.md; đọc
thêm chỉ làm bạn quá tải. Cũng CẤM truy vấn database — sẽ vượt pool kết nối Supabase.
CẤM đọc mã nguồn koi-storefront: mọi thứ cần biết về component đã chép sẵn ở dưới.

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
`

// Đã đọc mã nguồn thật một lần và chép ra đây, để không agent nào phải đi đọc lại.
const COMPONENT = `
COMPONENT ĐANG CÓ (đã kiểm chứng từ mã nguồn thật, dùng đúng như mô tả, đừng đi đọc lại):

- ContactBar, gọi \`<ContactBar productName={...} />\` — src/components/contact-bar.tsx.
  MỘT component, HAI hình dạng tự đổi theo cỡ màn: điện thoại = thanh ngang dính đáy 3 ô
  (Gọi · Zalo · Messenger); máy tính = cột dọc dán mép phải, canh giữa chiều cao.
  ĐÃ CÓ SẴN — chỉ render một lần ở cuối trang. TUYỆT ĐỐI không dựng thanh liên hệ riêng,
  sẽ thành hai thanh chồng nhau.
- ContactLink, gọi \`<ContactLink kind="zalo" productName="..." className="..." />\` với
  kind là zalo | messenger | phone — client component, giao diện hoàn toàn do className của
  nơi gọi quyết định, nên dùng được cho MỌI nút CTA trong bài. Nó tự dựng href, tự gọi
  trackContactClick() và ghiNhanLienHe(). Mọi nút Zalo phải dùng component này, không viết
  thẻ a href="https://zalo.me/..." bằng tay.
- Tin nhắn Zalo: KHÔNG tự nối chuỗi. zaloLink() trong src/lib/contact.ts đã lo hết. Nó sinh
  "Chào shop, mình quan tâm sản phẩm: {productName} ({productUrl})" cộng dòng
  "(Mã tư vấn: ...)" nếu khách đến từ quảng cáo; không có productName thì ra
  "Chào shop, mình cần tư vấn." Việc của bạn là viết ra chuỗi productName nên truyền vào
  cho landing này (ví dụ "đặt làm túi da theo yêu cầu"), KHÔNG phải viết URL zalo.me.
- LeadForm, gọi \`<LeadForm productId={...} productName="..." />\` — hiện chỉ có 3 trường
  (name, phone, message) cộng bẫy spam. Form 4 trường ở mục 4 BRIEF.md là thứ CẦN THÊM;
  hãy ghi rõ đó là việc phải làm, đừng viết như thể đã có.
- ProductCard, gọi \`<ProductCard p={...} />\` — dùng cho lưới sản phẩm. Tự link tới
  /cua-hang/{slug}/, tự lấy ảnh bìa. Lưới hiện dùng class
  "grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4".
- PostList, gọi \`<PostList posts={...} />\` — dùng cho khối bài liên quan.
- Số liên hệ thật: điện thoại/Zalo 0901 678 999 · Messenger koileathercraft ·
  email koi.leather19@gmail.com · địa chỉ "Số 2/16 Nguyễn Bặc, Tân Sơn Hòa, TP. HCM".
  Dùng prettyPhone() để hiện "0901 678 999".
- Thẻ main đã có class "pb-16 md:pb-0" trong src/app/layout.tsx → đừng đặt CTA cuối trong
  64px cuối trang, sẽ bị thanh đáy che.
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

// args = danh sách mã landing cần làm. Không truyền = làm hết.
const chon = Array.isArray(args) && args.length ? args : null
const DANH_SACH = chon ? LANDINGS.filter((l) => chon.includes(l.ma)) : LANDINGS
if (!DANH_SACH.length) throw new Error(`Không khớp landing nào với args: ${JSON.stringify(args)}`)
log(`Soạn ${DANH_SACH.length} landing × 3 phần: ${DANH_SACH.map((l) => l.ma).join(', ')}`)

// Nhắc chung cho mọi agent soạn: chết vì ĐẦU RA quá dài, nên phải ngắn và ghi thẳng.
const KY_LUAT_GHI = `
KỶ LUẬT GHI FILE — đọc kỹ, ba lần chạy trước chết ở đúng chỗ này:
- Ghi bằng ĐÚNG MỘT lệnh Write. File của bạn dài 6.000–11.000 ký tự, KHÔNG được dài hơn.
  Agent nào cố ghi một file 30.000 ký tự trong một lệnh đều bị hệ thống ngắt giữa đường
  vì quá 180 giây không báo tiến triển. Ngắn và xong quan trọng hơn dài và chết.
- Đừng viết dàn bài ra phần text trước rồi mới Write. Đừng giải thích bạn sắp làm gì.
  Đọc BRIEF.md, rồi Write ngay. Mọi chữ ngoài lệnh Write là phí ngân sách.
- Nội dung khối phải là CHỮ KHÁCH SẼ ĐỌC, không phải mô tả "ở đây nên viết về...".
  Đó là lỗi loại bỏ khi phản biện.
`

const PHAN_VAI_3_FILE = `
MỖI LANDING CHIA BA FILE. Bạn chỉ viết một file. Biết phần của người khác để không viết trùng:
- Phần 1 (…-1-mo-dau.md): thẻ meta + phân vai chống tự cắn từ khoá, rồi khối 1–6
  (Hero · Mở đầu · KHOẢNG GIÁ · Quy trình · Bảng chất liệu · Thông số + một câu hạn chế thật thà).
- Phần 2 (…-2-bang-chung.md): khối 7–12
  (Lưới sản phẩm · Cam kết giá-thời gian-MOQ · Nghệ nhân · FAQ · CTA cuối + form · Case study).
- Phần 3 (…-3-ky-thuat.md): liên kết nội bộ · JSON-LD · đường chuyển đổi · việc người bán phải điền.

Khối 3 và khối 8 khác nhau, đừng viết trùng: khối 3 là KHOẢNG GIÁ đặt sớm để khách khỏi
thoát (chỉ số tiền, vì sao chênh); khối 8 là BẢNG CAM KẾT (thời gian làm, cọc, MOQ, đổi trả)
— phần lớn là [NGƯỜI BÁN ĐIỀN].
`

const CHOT_KIEN_TRUC = `
KIẾN TRÚC ĐÃ CHỐT, KHÔNG LẬT LẠI: landing này là URL ĐANG TỒN TẠI được viết lại, giữ
nguyên đường dẫn. Không đề xuất URL mới. Không đề xuất 301. Lý do ở mục 0 BRIEF.md:
bảng đo traffic mới sống 1,5 ngày nên "0 organic" là CHƯA ĐO, không phải trang chết.
`

const PHAN_BIEN_SCHEMA = {
  type: 'object',
  required: ['loi', 'ket_luan'],
  properties: {
    loi: {
      type: 'array',
      items: {
        type: 'object',
        required: ['muc_do', 'file', 'cho', 'van_de', 'sua_the_nao'],
        properties: {
          muc_do: { type: 'string', enum: ['chan', 'nang', 'nhe'] },
          file: { type: 'string', description: 'đường dẫn file chứa lỗi' },
          cho: { type: 'string', description: 'khối hoặc dòng cụ thể' },
          van_de: { type: 'string' },
          sua_the_nao: { type: 'string' },
        },
      },
    },
    ket_luan: { type: 'string', enum: ['dung-duoc', 'phai-sua'] },
    so_tu_uoc: { type: 'integer', description: 'tổng số từ nội dung biên tập đếm được cả 3 file' },
  },
}

// ---------------------------------------------------------------------------
// Pha 1: hai phần đầu chạy song song (mỗi phần một file vừa cỡ)
// ---------------------------------------------------------------------------
const DAU = (l) => `Soạn nội dung cho một landing page "đặt riêng" của koileather.com — xưởng đồ da thủ công
cao cấp ở TP.HCM. Mục tiêu: kể câu chuyện dẫn khách tới việc ĐẶT RIÊNG (bespoke), và bắt
organic view từ Google.

${NGUON}
${COMPONENT}
${KY_LUAT_GHI}
${PHAN_VAI_3_FILE}
${CHOT_KIEN_TRUC}

LANDING CỦA BẠN — mọi thông tin dưới đây đã kiểm chứng từ database, dùng thẳng, đừng nghi ngờ:
${JSON.stringify(l, null, 1)}
`

const ketQua = await pipeline(
  DANH_SACH,

  // --- Phần 1 và phần 2, song song ---
  (l) =>
    parallel([
      () =>
        agent(
          `${DAU(l)}
VIỆC CỦA BẠN: viết PHẦN 1. Ghi bằng Write vào đúng file:
${RA}/${l.ma}-1-mo-dau.md
(thư mục đã tồn tại, ghi thẳng, không cần mkdir)

CẤU TRÚC PHẢI CÓ, đúng thứ tự:

## 0. Thẻ meta và phân vai
- URL, H1, title (≤60 ký tự, có động từ hành động), meta description (≤155 ký tự, phải trả
  lời cái lo lớn nhất của khách ngay trên trang kết quả), từ khoá đích.
- Bảng phân vai: landing này vs /san-pham/{slug}/ tương ứng — khác nhau ở H1, title, từ
  khoá, nội dung, link chéo. Đây là chỗ chống tự cắn từ khoá, viết cho rõ và cụ thể.
  Nếu ghi_chu nhắc trang tĩnh nào đang gần trùng, phân vai cả với trang đó.
- URL này ĐANG có nội dung cũ (xem do_dai_cu): nói rõ phần nào giữ, phần nào bỏ, và cảnh
  báo phải đọc Google Search Console trước khi đổi title.

## 1. Hero
## 2. Mở đầu (2–3 đoạn)
## 3. Khoảng giá
## 4. Quy trình 4–6 bước
## 5. Bảng chất liệu
## 6. Thông số + một câu hạn chế thật thà

Với MỖI khối 1–6 phải có đủ ba thứ, ghi rõ ba tiêu đề con này:
- **Nội dung thật** — chữ khách sẽ đọc. Đây là phần chiếm hầu hết độ dài.
- **Ảnh cần** — ảnh nào, chú thích gì. Đúng MỘT ảnh trên khung nhìn đầu (ảnh LCP).
- **Ghi chú dựng** — dùng lại component nào, CTA đặt ở đâu. Xem khối COMPONENT ở trên.

Tổng nội dung biên tập của riêng phần 1: 600–850 từ. Sàn cứng 550 từ.

Khối 3 KHOẢNG GIÁ: nêu đúng số trong gia_noi. Cấm "từ 0đ". Nói vì sao chênh (da gì, khoá gì,
kích cỡ, thủ công tới đâu) — đây là chỗ khách quyết định ở lại hay thoát.
Khối 4 QUY TRÌNH: dạy khách việc họ phải làm ở mỗi bước, không chỉ kể việc xưởng làm.
Thời gian mỗi bước là [NGƯỜI BÁN ĐIỀN].
Khối 5 CHẤT LIỆU: mỗi tên da nối tới bài giải thích CÓ THẬT trong mục 2 BRIEF.md (nhóm
chất liệu 40 bài: da-togo, da-epsom-la-gi, da-ca-sau-that, da-de-alran, da-de-thuoc,
da-da-dieu, so-sanh-da-cuu-va-da-de, da-togo-vs-da-clemence…). Đây là khối SEO nặng nhất.
Khối 6 HẠN CHẾ THẬT THÀ: đúng một câu nói thật về giới hạn của xưởng. Đây là thứ Bulltino
thắng nhờ (mục 5 BRIEF.md) — phải thật, không phải nhược điểm giả kiểu "chúng tôi quá tỉ
mỉ nên hơi chậm".

Trả về (phần text, KHÔNG phải nội dung file): 3 dòng — đường dẫn file đã ghi, số từ nội
dung biên tập đếm được, và điều đáng chú ý nhất bạn phát hiện khi soạn.`,
          { label: `soan1:${l.ma}`, phase: 'Soạn phần 1-2' },
        ),

      () =>
        agent(
          `${DAU(l)}
VIỆC CỦA BẠN: viết PHẦN 2. Ghi bằng Write vào đúng file:
${RA}/${l.ma}-2-bang-chung.md
(thư mục đã tồn tại, ghi thẳng, không cần mkdir)

CẤU TRÚC PHẢI CÓ, đúng thứ tự:

## 7. Lưới sản phẩm
## 8. Bảng cam kết: giá · thời gian làm · MOQ · đổi trả
## 9. Nghệ nhân
## 10. FAQ
## 11. CTA cuối + form
## 12. Case study và bài liên quan

Với MỖI khối phải có đủ ba thứ, ghi rõ ba tiêu đề con này:
- **Nội dung thật** — chữ khách sẽ đọc, KHÔNG phải mô tả "ở đây nên viết về...".
- **Ảnh cần** — ảnh nào, chú thích gì. Mật độ 1 ảnh / 150–250 từ.
- **Ghi chú dựng** — dùng lại component nào, CTA đặt ở đâu. Xem khối COMPONENT ở trên.

Tổng nội dung biên tập của riêng phần 2: 550–800 từ. Sàn cứng 500 từ.

Khối 7 LƯỚI: chọn 6–12 món từ danh mục ở trên, dùng ProductCard. 0 sản phẩm ACTIVE nào
thiếu ảnh nên lưới an toàn. Nói rõ tiêu chí chọn món nào lên lưới (dải giá phải trải rộng
để khách tự định vị mình, không dồn hết hàng đắt).
Khối 8 CAM KẾT: phần lớn là [NGƯỜI BÁN ĐIỀN] — thời gian làm, % cọc, bảo hành, đổi trả,
MOQ nếu là B2B. Viết ra khuôn bảng sẵn để người bán chỉ việc điền, đừng bỏ trống.
Khối 9 NGHỆ NHÂN: tên và vai trò là [NGƯỜI BÁN ĐIỀN]. Viết khuôn: mỗi người cần ảnh gì,
một câu nói gì, thợ chính làm khâu nào. Đây là khối E-E-A-T.
Khối 10 FAQ: 6–9 câu. Câu hỏi phải là chuyện khách hỏi thật — suy ra từ nội dung đã tồn
tại trên site (danh sách bài ở ho_tro là bằng chứng khách quan tâm gì), không tự nghĩ câu
vô thưởng vô phạt. Trả lời thẳng, mỗi câu 2–4 dòng, có số nếu có số thật.
Khối 11 CTA CUỐI: dùng LeadForm. Nhớ main có pb-16 md:pb-0 → đừng đặt trong 64px cuối.
Khối 12 CASE STUDY: chỉ dùng tên khách/bài CÓ THẬT trong ho_tro. Dùng PostList.

Trả về (phần text, KHÔNG phải nội dung file): 3 dòng — đường dẫn file đã ghi, số từ nội
dung biên tập đếm được, và điều đáng chú ý nhất bạn phát hiện khi soạn.`,
          { label: `soan2:${l.ma}`, phase: 'Soạn phần 1-2' },
        ),
    ]).then((hai) => ({
      ...l,
      f1: `${RA}/${l.ma}-1-mo-dau.md`,
      f2: `${RA}/${l.ma}-2-bang-chung.md`,
      f3a: `${RA}/${l.ma}-3a-lien-ket-jsonld.md`,
      f3b: `${RA}/${l.ma}-3b-chuyen-doi.md`,
      tomTat1: hai[0],
      tomTat2: hai[1],
    })),

  // --- Phần 3 chia ĐÔI. Lần chạy trước phần 3 vẫn chết vì đúng bệnh cũ: agent
  // phải đọc BRIEF + cả hai phần trước (~58KB) rồi ghi một file 24KB — file lớn
  // nhất cả bộ. Nay tách 3a (liên kết + JSON-LD) và 3b (chuyển đổi + câu hỏi),
  // và BỎ luôn việc đọc hai phần trước: danh sách khối đã nằm trong prompt.
  (r) =>
    parallel([
      () =>
        agent(
          `${DAU(r)}
VIỆC CỦA BẠN: viết PHẦN 3A — liên kết nội bộ và JSON-LD. Ghi bằng Write vào đúng file:
${r.f3a}

KHÔNG cần đọc hai phần đã soạn. Bạn chỉ cần biết bố cục khối của chúng:
phần 1 có khối 0–6 (meta · hero · mở đầu · giá · quy trình · chất liệu · thông số),
phần 2 có khối 7–12 (lưới SP · cam kết · nghệ nhân · FAQ · CTA cuối+form · case study).

CẤU TRÚC PHẢI CÓ, đúng thứ tự:

## 13. Liên kết nội bộ
Bảng: URL đích | chữ neo | đặt ở khối nào | vì sao. Mọi URL phải có thật trong BRIEF.md.
Kèm chiều ngược: bài/trang nào nên thêm link TRỎ VỀ landing này (dùng danh sách ho_tro),
và chữ neo cụ thể cho từng cái.

## 14. JSON-LD
Viết mã thật, dán được. Service + ItemList + BreadcrumbList + FAQPage.
KHÔNG khai Product. KHÔNG khai aggregateRating, review, ratingValue. LocalBusiness chỉ
tham chiếu @id https://koileather.com/lien-he/#localbusiness.
Ghi rõ: Google đã bỏ FAQ rich result khỏi Search từ 7/5/2026 → FAQ giữ cho người đọc và
AI Overviews, đừng mong rich result.

Phần này ít văn, nhiều bảng và mã. JSON-LD phải dán được và mọi URL phải thật.
File này 5.000–9.000 ký tự, ghi bằng ĐÚNG MỘT lệnh Write.

Trả về (phần text): 2 dòng — đường dẫn file đã ghi và số link nội bộ đã đề xuất.`,
          { label: `soan3a:${r.ma}`, phase: 'Soạn phần 3' },
        ),

      () =>
        agent(
          `${DAU(r)}
VIỆC CỦA BẠN: viết PHẦN 3B — đường chuyển đổi và việc người bán phải điền. Ghi bằng Write
vào đúng file: ${r.f3b}

KHÔNG cần đọc hai phần đã soạn. Bạn chỉ cần biết bố cục khối của chúng:
phần 1 có khối 0–6 (meta · hero · mở đầu · giá · quy trình · chất liệu · thông số),
phần 2 có khối 7–12 (lưới SP · cam kết · nghệ nhân · FAQ · CTA cuối+form · case study).

CẤU TRÚC PHẢI CÓ, đúng thứ tự:

## 15. Đường chuyển đổi
5 điểm chạm CTA (hero · sau khối GIÁ · sau khối QUY TRÌNH · sau FAQ · ContactBar dính đáy)
với chữ nút cụ thể cho landing này + dòng gỡ lo dưới mỗi nút. Chữ nút phải là động từ +
cái khách nhận, không phải "Xem thêm" hay "Liên hệ".
Tin nhắn Zalo soạn sẵn: viết ra chuỗi productName nên truyền vào ContactLink cho landing
này. KHÔNG tự viết URL zalo.me — zaloLink() đã lo (xem khối COMPONENT).
Form: 4 trường + 1 textarea theo mục 4 BRIEF.md, giá trị select cụ thể cho landing này.
Nêu rõ khuôn ghép vào cột message — bảng leads KHÔNG có cột riêng cho ngân sách/món/mốc,
nên mọi thứ đó phải nối chuỗi vào message.
Nhắc rõ: LeadForm hiện chỉ có 3 trường, form 4 trường là việc CẦN THÊM.

## 16. Người bán phải điền
Liệt kê mọi câu hỏi người bán cần trả lời cho landing này, nhóm theo chủ đề
(thời gian & tiền · bảo hành & đổi trả · xưởng & nghệ nhân · B2B nếu có · giấy tờ da đặc biệt).
Suy ra từ ghi_chu và loại hàng của landing này — mọi con số mà xưởng chưa công bố đều phải
nằm trong danh sách. Nêu ĐẦU TIÊN: năm thành lập đang tự mâu thuẫn ba chỗ trên site
(2017 / "hơn 10 năm" / "hơn 7 năm") — phải chốt một số trước khi viết.

File này 5.000–9.000 ký tự, ghi bằng ĐÚNG MỘT lệnh Write.

Trả về (phần text): 2 dòng — đường dẫn file đã ghi và số câu hỏi người bán phải trả lời.`,
          { label: `soan3b:${r.ma}`, phase: 'Soạn phần 3' },
        ),
    ]).then((hai) => ({ ...r, tomTat3a: hai[0], tomTat3b: hai[1] })),

  // --- Phản biện đối kháng: đọc cả ba phần ---
  (r) =>
    agent(
      `Bạn là người phản biện đối kháng. Việc của bạn là TÌM LỖI trong một bộ tài liệu landing
page, không phải khen nó. Mặc định nghi ngờ.

Đọc bốn file cần soi:
- ${r.f1}
- ${r.f2}
- ${r.f3a}
- ${r.f3b}
Đọc để đối chiếu: ${KB}/BRIEF.md (mục 1 = bảng số SP và giá; mục 2 = danh sách URL có thật)
CẤM đọc file khác trong ${KB}/ và CẤM truy vấn database.

Số liệu đúng của landing này (đã kiểm chứng từ database):
${JSON.stringify({ url: r.url, danh_muc: r.danh_muc, gia_noi: r.gia_noi }, null, 1)}

SOI ĐÚNG BẢY THỨ, theo thứ tự nặng dần:

1. SỐ BỊA. Mọi con số phải khớp bảng mục 1 BRIEF.md / khối số liệu trên, hoặc là
   [NGƯỜI BÁN ĐIỀN]. Sai một chữ số cũng là lỗi "chan". Đặc biệt soi: số SP, giá
   min/trung vị/max, số loại da, số bài viết. Có "từ 0đ" hay giá 0 ở đâu không.
2. SLUG BỊA. Mọi URL nội bộ phải có thật trong mục 2 BRIEF.md, hoặc /san-pham/{slug}/ với
   slug trong bảng mục 1. Tìm từng link, đối chiếu từng cái. Link chết là lỗi "chan".
3. HỨA SUÔNG. Thời gian làm, % cọc, bảo hành, năm kinh nghiệm, số khách hàng, đổi trả —
   có số nào không phải [NGƯỜI BÁN ĐIỀN] mà cũng không có nguồn không? Năm thành lập site
   đang tự mâu thuẫn (2017 vs "hơn 10 năm" vs "hơn 7 năm") — có nhân bản mâu thuẫn đó không.
4. TỰ CẮN TỪ KHOÁ. Bảng phân vai ở phần 1 có thật sự tách được landing khỏi
   /san-pham/{slug}/ và khỏi trang tĩnh gần trùng không, hay chỉ nói suông.
5. MỎNG hoặc TRÙNG. Đếm số từ nội dung biên tập thật (không tính ghi chú dựng, không tính
   JSON-LD, không tính bảng liên kết). Phần 1 + phần 2 cộng lại dưới 1.050 từ là lỗi "chan".
   Có khối nào chỉ là mô tả "ở đây nên viết về..." thay vì chữ thật không — lỗi "chan".
   Phần 1 và phần 2 có viết trùng nội dung không (đặc biệt khối 3 vs khối 8 về giá).
6. THIẾU KHỐI. Phần 1 phải có mục 0 và khối 1–6. Phần 2 phải có khối 7–12. Phần 3a phải có
   mục 13–14. Phần 3b phải có mục 15–16. Thiếu khối nào là lỗi "chan".
7. VI PHẠM RÀNG BUỘC. Có nhắm tên thương hiệu người khác cho sản phẩm thay thế không
   (dịch vụ sửa/thay thì được, sản phẩm thay thế thì không). Có khai Product hay
   aggregateRating trong JSON-LD không. Có doorway page theo quận không. Có nhắc
   Shopee/kitleather không. Có popup không. Có dựng thanh liên hệ riêng thay vì dùng
   ContactBar không (sẽ thành hai thanh chồng nhau).

Mức độ: "chan" = không xuất bản được. "nang" = sai nhưng sửa được nhanh. "nhe" = góp ý.
Trường "file" phải ghi đường dẫn file chứa lỗi để người sửa biết mở file nào.
Nếu không tìm được lỗi chan/nang nào thì trả ket_luan "dung-duoc" — nhưng hãy chắc là bạn
đã thật sự đối chiếu từng con số và từng link, không phải đọc lướt.`,
      { label: `phan-bien:${r.ma}`, phase: 'Phản biện', schema: PHAN_BIEN_SCHEMA },
    ).then((pb) => ({ ...r, pb })),

  // --- Sửa: chỉ khi có lỗi chặn hoặc nặng ---
  (r) => {
    const loi = (r.pb && r.pb.loi) || []
    const phaiSua = loi.filter((x) => x.muc_do === 'chan' || x.muc_do === 'nang')
    if (!phaiSua.length) return { ...r, daSua: false, soLoiSua: 0 }
    return agent(
      `Sửa bộ tài liệu landing page theo kết quả phản biện. Sửa TẠI CHỖ bằng công cụ Edit,
giữ nguyên cấu trúc file, chỉ vá đúng chỗ sai. KHÔNG viết lại cả file bằng Write — vừa
mất nội dung đúng, vừa quá dài và bị hệ thống ngắt giữa đường.

Bốn file: ${r.f1} · ${r.f2} · ${r.f3a} · ${r.f3b}
Đối chiếu: ${KB}/BRIEF.md. CẤM đọc file khác trong ${KB}/ và CẤM truy vấn database.

Số liệu đúng của landing này:
${JSON.stringify({ url: r.url, danh_muc: r.danh_muc, gia_noi: r.gia_noi }, null, 1)}

LỖI PHẢI SỬA (trường "file" cho biết mở file nào):
${JSON.stringify(phaiSua, null, 1)}

Nguyên tắc khi sửa:
- Số sai → thay bằng số đúng ở trên hoặc từ bảng mục 1 BRIEF.md. Không tìm được số đúng
  thì đổi thành [NGƯỜI BÁN ĐIỀN: cần gì].
- Link chết → thay bằng URL có thật gần nghĩa nhất trong mục 2 BRIEF.md. Không có cái nào
  gần thì bỏ hẳn link, giữ lại chữ.
- Nội dung mỏng → viết THÊM chữ thật cho khối đang thiếu, không nhồi chữ vô nghĩa. Thêm
  bằng nhiều lệnh Edit nhỏ, đừng gom một lệnh khổng lồ.
- Hứa suông → đổi thành [NGƯỜI BÁN ĐIỀN: ...].

Trả về 2–4 dòng: đã sửa những gì, còn sót gì không sửa được và vì sao.`,
      { label: `sua:${r.ma}`, phase: 'Sửa lỗi chặn' },
    ).then((ghiChu) => ({ ...r, daSua: true, soLoiSua: phaiSua.length, ghiChuSua: ghiChu }))
  },
)

const xong = ketQua.filter(Boolean)
log(`Xong ${xong.length}/${DANH_SACH.length} landing. Đã sửa: ${xong.filter((r) => r.daSua).length}`)

return {
  soLanding: xong.length,
  danhSach: xong.map((r) => ({
    ma: r.ma,
    thu_tu: r.thu_tu,
    url: r.url,
    loai: r.loai,
    file: [r.f1, r.f2, r.f3a, r.f3b],
    bang_chung: r.bang_chung,
    gia_noi: r.gia_noi,
    ket_luan_phan_bien: r.pb && r.pb.ket_luan,
    so_tu: r.pb && r.pb.so_tu_uoc,
    so_loi_da_sua: r.soLoiSua || 0,
    loi_con_lai: ((r.pb && r.pb.loi) || []).filter((x) => x.muc_do === 'nhe').map((x) => x.van_de),
  })),
  tomTat: xong.map((r) => [r.tomTat1, r.tomTat2, r.tomTat3a, r.tomTat3b, r.ghiChuSua].filter(Boolean).join('\n')),
}
