export const meta = {
  name: 'koi-landing-dat-rieng',
  description: 'Chốt danh sách landing "đặt riêng" và soạn layout + content cho từng trang, có phản biện',
  whenToUse: 'Khi cần bộ landing page hướng khách đặt riêng cho koileather.com, bám số liệu thật',
  phases: [
    { title: 'Chốt danh sách', detail: 'Một agent đọc brief + 4 bản khảo sát, chốt URL từng landing' },
    { title: 'Soạn nội dung', detail: 'Một agent mỗi landing, ghi ra file .md' },
    { title: 'Phản biện', detail: 'Một agent đối kháng mỗi landing, soi số liệu và slug bịa' },
    { title: 'Sửa lỗi chặn', detail: 'Chỉ chạy khi phản biện tìm được lỗi chặn đường' },
    { title: 'Tổng hợp', detail: 'Gộp thành tài liệu bàn giao' },
  ],
}

const KB = 'E:/Claude A Khoa Processing/Koi Backend/.kb-khaosat'
const RA = 'E:/Claude A Khoa Processing/Koi Backend/.kb-landing'

// Mọi agent đọc file, KHÔNG nhận nội dung qua prompt — lần chạy trước tắc vì
// nhồi ~140k ký tự vào một prompt.
const NGUON = `
Đọc các file sau bằng công cụ Read TRƯỚC KHI viết bất cứ thứ gì:

1. ${KB}/BRIEF.md — BẮT BUỘC, đọc hết. Mọi con số phải lấy từ đây.
2. ${KB}/tu-khoa.md — nghiên cứu từ khoá tiếng Việt, FAQ, layout hook theo danh mục.
3. ${KB}/doi-thu-chuan.md — mổ đối thủ, chuẩn E-E-A-T, số từ, JSON-LD, Core Web Vitals.
4. ${KB}/trung-tu-khoa.md — soát tự cắn từ khoá và kiến trúc URL.
5. ${KB}/chuyen-doi.md — đường chuyển đổi, CTA, form, cách đo.

LUẬT SẮT — vi phạm là sản phẩm bị loại:
- KHÔNG bịa số. Không volume tìm kiếm, không "hơn 10.000 khách", không năm kinh nghiệm,
  không thời gian làm, không % cọc. Thiếu số thì viết [NGƯỜI BÁN ĐIỀN: cần gì].
- KHÔNG bịa slug. Chỉ được link tới URL có trong mục 2 của BRIEF.md hoặc
  /san-pham/{slug}/ với slug có trong bảng mục 1. Trước khi viết một link, tìm lại
  slug đó trong BRIEF.md.
- KHÔNG truy vấn database. Số đã có sẵn trong BRIEF.md. Bắn query song song sẽ vượt
  pool kết nối của Supabase.
- Tiếng Việt tự nhiên, giọng người bán hàng thủ công thật. Không sáo ngữ marketing.
- koileather ≠ kitleather. Không nhắc Shopee, không nhắc kitleather.vn.
`

const CHON_SCHEMA = {
  type: 'object',
  required: ['landings', 'khong_lam', 'canh_bao'],
  properties: {
    landings: {
      type: 'array',
      minItems: 5,
      maxItems: 7,
      items: {
        type: 'object',
        required: ['ma', 'url', 'loai', 'h1', 'title', 'tu_khoa_chinh', 'danh_muc', 'so_sp', 'gia_noi', 'ly_do', 'phan_vai'],
        properties: {
          ma: { type: 'string', description: 'mã ngắn kebab-case dùng làm tên file, ví dụ day-da-dong-ho' },
          url: { type: 'string', description: 'đường dẫn CÓ THẬT, dạng /slug/ — phải là URL đang tồn tại' },
          loai: { type: 'string', enum: ['A-bai-co-organic', 'B-trang-tinh-dai', 'C-url-moi'] },
          h1: { type: 'string' },
          title: { type: 'string', description: 'tối đa 60 ký tự, có động từ hành động' },
          tu_khoa_chinh: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 6 },
          danh_muc: { type: 'string', description: 'slug danh mục /san-pham/{slug}/ tương ứng, hoặc "khong-co"' },
          so_sp: { type: 'integer', description: 'số SP ACTIVE, lấy từ bảng mục 1 BRIEF.md' },
          gia_noi: { type: 'string', description: 'khoảng giá thật sẽ nêu, ví dụ "3,3 – 11,8 triệu, phần lớn quanh 4,8 triệu"' },
          ly_do: { type: 'string' },
          phan_vai: { type: 'string', description: 'landing khác /san-pham/{slug}/ ở điểm gì' },
        },
      },
    },
    khong_lam: {
      type: 'array',
      items: {
        type: 'object',
        required: ['doi_tuong', 'ly_do'],
        properties: {
          doi_tuong: { type: 'string' },
          ly_do: { type: 'string' },
        },
      },
    },
    canh_bao: { type: 'array', items: { type: 'string' }, description: 'điều người bán phải quyết trước khi xuất bản' },
  },
}

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
    so_tu_uoc: { type: 'integer' },
  },
}

// ---------- Pha 1: chốt danh sách ----------
phase('Chốt danh sách')

const chon = await agent(
  `Bạn chốt danh sách landing page "đặt riêng" cho koileather.com — xưởng đồ da thủ công
cao cấp ở TP.HCM. Mục tiêu của người bán: mỗi loại sản phẩm có một trang kể câu chuyện
dẫn khách tới việc ĐẶT RIÊNG (bespoke), và bắt được organic view từ Google.

${NGUON}

QUYẾT ĐỊNH KIẾN TRÚC ĐÃ CHỐT, KHÔNG ĐƯỢC LẬT LẠI (đọc mục 0 BRIEF.md để hiểu vì sao):
Bảng koi_page_views mới sống 1,5 ngày, nên "0 lượt organic" KHÔNG phải bằng chứng trang
chết. Ý định "đặt riêng" ĐÃ có URL đang hút organic (nhóm bài /dich-vu-*/, /dat-lam-*/,
/khac-ten-len-vi-da/...). Vì vậy: landing = NÂNG CẤP URL ĐANG TỒN TẠI, không dựng cây
URL mới /dat-lam/{slug}/. Chỉ được đề xuất loại C (URL mới) khi thật sự không có URL nào
phù hợp, và phải nói rõ vì sao.

VIỆC CỦA BẠN:
1. Chọn 5–7 landing cho giai đoạn 1. Ngưỡng: danh mục phải có ≥8 SP ACTIVE, HOẶC có cụm
   bài viết chứng minh nhu cầu thật. Ưu tiên nơi đã có organic hoặc đã có cú bấm quảng cáo
   (xem mục 0.2 và 3.7 BRIEF.md) để đo được trước/sau ngay trong tuần đầu.
2. Mỗi landing: gán URL CÓ THẬT (kiểm lại trong mục 2 BRIEF.md), H1, title ≤60 ký tự có
   động từ hành động, 2–6 từ khoá đích, slug danh mục tương ứng, số SP, khoảng giá thật,
   và bảng phân vai nói rõ nó khác /san-pham/{slug}/ ở chỗ nào.
3. Liệt kê rõ những gì KHÔNG làm landing và vì sao (kỹ thuật chế tác, khái niệm thương
   hiệu, danh mục quá mỏng, nhóm vướng tên thương hiệu người khác).
4. Cảnh báo những điều người bán phải quyết trước khi xuất bản.

Cấm: nhắm từ khoá kiểu "đặt làm dây lưng Hermes" (mô tả sản phẩm thay thế — rủi ro pháp
lý khác hẳn dịch vụ sửa). Cấm doorway page theo quận. Cấm nhắm từ khoá giá rẻ — giá KOI
cao hơn đối thủ 3–20 lần, xem mục 5 BRIEF.md.`,
  { label: 'chot-danh-sach', schema: CHON_SCHEMA },
)

if (!chon || !chon.landings || !chon.landings.length) {
  log('Pha chốt danh sách không trả về kết quả dùng được — dừng.')
  return { loi: 'khong-chot-duoc-danh-sach', chon }
}

log(`Đã chốt ${chon.landings.length} landing: ${chon.landings.map((l) => l.ma).join(', ')}`)

// ---------- Pha 2-4: soạn → phản biện → sửa, chạy song song theo từng landing ----------
const ketQua = await pipeline(
  chon.landings,

  // Soạn nội dung
  (l) =>
    agent(
      `Soạn TOÀN BỘ layout + nội dung cho một landing page "đặt riêng" của koileather.com.

${NGUON}

LANDING CỦA BẠN:
${JSON.stringify(l, null, 1)}

Ghi kết quả bằng công cụ Write vào đúng file: ${RA}/${l.ma}.md
(thư mục đã tồn tại, ghi thẳng, không cần mkdir)

CẤU TRÚC FILE PHẢI CÓ, theo đúng thứ tự:

## 0. Thẻ meta và phân vai
- URL, H1, title (≤60 ký tự), meta description (≤155 ký tự, phải trả lời trước cái lo lớn
  nhất của khách ngay trên trang kết quả), từ khoá đích.
- Bảng phân vai: landing này vs /san-pham/{slug}/ tương ứng — khác nhau ở H1, title, từ
  khoá, nội dung, link chéo. Đây là chỗ chống tự cắn từ khoá, viết cho rõ.
- Nếu URL này đang có nội dung cũ: nói rõ phần nào giữ, phần nào bỏ, và cảnh báo phải
  đọc Google Search Console trước khi đổi title.

## 1..12. Mười hai khối theo khung ở mục 4 BRIEF.md
Với MỖI khối phải có đủ ba thứ:
- **Nội dung thật** — viết ra chữ khách sẽ đọc, không phải mô tả "ở đây nên viết về...".
  Đây là phần chiếm hầu hết độ dài. Tổng 1.200–1.800 từ nội dung biên tập, sàn cứng 900.
- **Ảnh cần** — mô tả cụ thể ảnh nào, chú thích gì. Đúng MỘT ảnh trên khung nhìn đầu.
  Mật độ 1 ảnh / 150–250 từ.
- **Ghi chú dựng** — dùng lại component nào đang có (ProductCard, ContactBar, ContactLink,
  LeadForm, ProductGallery, ImageLightbox, PostList), CTA đặt ở đâu.

Khối giá: nêu số THẬT từ mục 1 BRIEF.md. Cấm viết "từ 0đ" — 9 danh mục còn SP giá 0.
Khối chất liệu: mỗi tên da nối tới bài giải thích CÓ THẬT trong mục 2 BRIEF.md.
Khối FAQ: 6–9 câu, câu hỏi lấy từ nội dung đã tồn tại trên site (tức là chuyện khách hỏi
thật), không tự nghĩ ra câu vô thưởng vô phạt.
Khối hạn chế thật thà: đúng một câu nói thật về giới hạn — đây là thứ Bulltino thắng nhờ.

## 13. Liên kết nội bộ
Bảng: URL đích | chữ neo | đặt ở khối nào | vì sao. Mọi URL phải có thật trong BRIEF.md.
Kèm chiều ngược: bài/trang nào nên thêm link TRỎ VỀ landing này.

## 14. JSON-LD
Viết mã thật, dán được. Service + ItemList + BreadcrumbList (+ FAQPage nếu có FAQ).
KHÔNG khai Product. KHÔNG khai aggregateRating. LocalBusiness chỉ tham chiếu @id
/lien-he/#localbusiness.

## 15. Đường chuyển đổi
5 điểm chạm CTA với chữ nút cụ thể cho landing này + dòng gỡ lo dưới mỗi nút.
Tin nhắn Zalo soạn sẵn: viết ra nguyên văn chuỗi cho landing này.
Form: 4 trường theo mục 4 BRIEF.md, giá trị select cụ thể cho landing này.

## 16. Người bán phải điền
Liệt kê mọi [NGƯỜI BÁN ĐIỀN] đã dùng trong file, gom một chỗ để người bán trả lời một lượt.

Trả về (phần text, KHÔNG phải nội dung file): 3–5 dòng — mã landing, đường dẫn file đã ghi,
số từ nội dung biên tập ước tính, và điều đáng chú ý nhất bạn phát hiện khi soạn.`,
      { label: `soan:${l.ma}`, phase: 'Soạn nội dung' },
    ).then((tomTat) => ({ ...l, tomTat, file: `${RA}/${l.ma}.md` })),

  // Phản biện đối kháng
  (r) =>
    agent(
      `Bạn là người phản biện đối kháng. Việc của bạn là TÌM LỖI trong một tài liệu landing
page, không phải khen nó. Mặc định nghi ngờ.

Đọc file cần soi: ${r.file}
Đọc để đối chiếu: ${KB}/BRIEF.md (mục 1 là bảng số SP và giá; mục 2 là danh sách URL có thật)

SOI ĐÚNG SÁU THỨ, theo thứ tự nặng dần:

1. SỐ BỊA. Mọi con số trong file phải khớp bảng mục 1 BRIEF.md hoặc là [NGƯỜI BÁN ĐIỀN].
   Sai một chữ số cũng là lỗi "chan". Đặc biệt soi: số SP, giá min/trung vị/max, số loại da,
   số bài viết. Có xuất hiện "từ 0đ" hay giá 0 ở đâu không.
2. SLUG BỊA. Mọi URL nội bộ phải có thật trong mục 2 BRIEF.md (danh sách trang tĩnh + 158
   bài) hoặc là /san-pham/{slug}/ với slug trong bảng mục 1. Tìm từng link, đối chiếu từng
   cái. Link chết là lỗi "chan".
3. HỨA SUÔNG. Thời gian làm, % cọc, bảo hành, năm kinh nghiệm, số khách hàng, đổi trả —
   có số nào không phải [NGƯỜI BÁN ĐIỀN] mà cũng không có nguồn không? Năm thành lập site
   đang tự mâu thuẫn (2017 vs "hơn 10 năm" vs "hơn 7 năm") — file có nhân bản mâu thuẫn đó không.
4. TỰ CẮN TỪ KHOÁ. Bảng phân vai có thật sự tách được landing khỏi /san-pham/{slug}/ không,
   hay chỉ nói suông. Title và H1 có trùng ý định với trang danh mục không.
5. MỎNG. Đếm số từ nội dung biên tập thật (không tính ghi chú dựng, không tính JSON-LD,
   không tính bảng liên kết). Dưới 900 từ là lỗi "chan". Có khối nào chỉ là mô tả
   "ở đây nên viết về..." thay vì chữ thật không — đó là lỗi "chan".
6. VI PHẠM RÀNG BUỘC. Có nhắm tên thương hiệu người khác cho sản phẩm thay thế không.
   Có khai Product hay aggregateRating trong JSON-LD không. Có doorway page theo quận không.
   Có nhắc Shopee/kitleather không. Có popup không.

Mức độ: "chan" = không xuất bản được. "nang" = sai nhưng sửa được nhanh. "nhe" = góp ý.
Nếu không tìm được lỗi chan/nang nào thì trả ket_luan "dung-duoc" — nhưng hãy chắc là bạn
đã thật sự đối chiếu từng con số và từng link, không phải đọc lướt.`,
      { label: `phan-bien:${r.ma}`, phase: 'Phản biện', schema: PHAN_BIEN_SCHEMA },
    ).then((pb) => ({ ...r, pb })),

  // Sửa — chỉ khi có lỗi chặn hoặc nặng
  (r) => {
    const loi = (r.pb && r.pb.loi) || []
    const phaiSua = loi.filter((x) => x.muc_do === 'chan' || x.muc_do === 'nang')
    if (!phaiSua.length) return { ...r, daSua: false, soLoiSua: 0 }
    return agent(
      `Sửa tài liệu landing page theo kết quả phản biện. Sửa TẠI CHỖ bằng công cụ Edit,
giữ nguyên cấu trúc file, chỉ vá đúng chỗ sai.

File: ${r.file}
Đối chiếu số liệu và danh sách URL có thật: ${KB}/BRIEF.md

LỖI PHẢI SỬA:
${JSON.stringify(phaiSua, null, 1)}

Nguyên tắc khi sửa:
- Số sai → thay bằng số đúng từ bảng mục 1 BRIEF.md. Không tìm được số đúng thì đổi thành
  [NGƯỜI BÁN ĐIỀN: cần gì].
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
log(`Xong ${xong.length}/${chon.landings.length} landing. Đã sửa: ${xong.filter((r) => r.daSua).length}`)

// ---------- Pha 5: tổng hợp ----------
phase('Tổng hợp')

const bangKe = xong.map((r) => ({
  ma: r.ma,
  url: r.url,
  loai: r.loai,
  file: r.file,
  ket_luan_phan_bien: r.pb && r.pb.ket_luan,
  so_loi_da_sua: r.soLoiSua || 0,
  loi_con_lai: ((r.pb && r.pb.loi) || []).filter((x) => x.muc_do === 'nhe').map((x) => x.van_de),
}))

const tongHop = await agent(
  `Viết tài liệu bàn giao gộp cho bộ landing page "đặt riêng" của koileather.com.
Người đọc là chủ xưởng — biết rõ đồ da, không biết SEO. Viết tiếng Việt, thẳng, không sáo ngữ.

Ghi bằng công cụ Write vào: ${RA}/00-BAN-GIAO.md

Đọc để lấy nội dung:
- ${KB}/BRIEF.md — mục 0 (ba sự thật), mục 3 (lỗi kỹ thuật), mục 4 (khung layout), mục 6 (ràng buộc), mục 7 (cách đo)
- Từng file landing đã soạn (đường dẫn trong bảng dưới) — đọc phần "## 0" và "## 16" của mỗi file, không cần đọc hết

Bảng kê landing đã soạn:
${JSON.stringify(bangKe, null, 1)}

Danh sách KHÔNG làm landing (từ pha chốt):
${JSON.stringify(chon.khong_lam, null, 1)}

Cảnh báo từ pha chốt:
${JSON.stringify(chon.canh_bao, null, 1)}

CẤU TRÚC TÀI LIỆU:

# Bộ landing "đặt riêng" — tài liệu bàn giao

## 1. Đọc trước: ba điều đổi cách làm
Ba sự thật ở mục 0 BRIEF.md, viết lại cho chủ xưởng hiểu ngay: (a) bảng đo traffic mới
sống 1,5 ngày nên đừng tin con số "0 organic"; (b) khách Google đang vào bằng BÀI DỊCH VỤ
chứ không phải trang danh mục; (c) vì vậy landing là nâng cấp URL đang có, không dựng URL mới.

## 2. Bảng landing — làm cái nào trước
Bảng: URL | landing nói về gì | số SP | khoảng giá | vì sao chọn | thứ tự làm.
Xếp thứ tự theo nguyên tắc: chỗ nào đã có organic hoặc đã có cú bấm quảng cáo thì làm
trước, vì đo được trước/sau ngay trong tuần đầu. Nói rõ nên bắt đầu từ trang nào và vì sao.

## 3. Việc phải làm TRƯỚC khi viết chữ đầu tiên
Danh sách có thứ tự từ mục 3 BRIEF.md, mỗi việc một dòng: làm gì, ở file nào, vì sao
không làm thì landing vô nghĩa. Tách rõ nhóm [CHẶN ĐƯỜNG] và nhóm còn lại.

## 4. Người bán phải trả lời — gom một lượt
Gộp mọi [NGƯỜI BÁN ĐIỀN] từ tất cả file landing, dedupe, nhóm theo chủ đề (thời gian &
tiền · bảo hành & đổi trả · xưởng & nghệ nhân · B2B · giấy tờ da đặc biệt). Đây là danh
sách chủ xưởng ngồi trả lời một lần rồi mọi trang dùng chung.
Nêu riêng và nêu đầu: năm thành lập đang tự mâu thuẫn ba chỗ trên site, phải chốt một số.

## 5. Khung layout dùng chung
12 khối, mỗi khối một dòng: nhiệm vụ + trả lời lo lắng nào. Cộng luật CTA (một hành động,
năm điểm chạm), luật form (4 trường), luật JSON-LD, và ba thứ cấm.

## 6. Những gì KHÔNG làm landing, và vì sao
Từ danh sách khong_lam. Giải thích để chủ xưởng không hỏi lại sau.

## 7. Đo thế nào
Bảng chỉ số + mốc hiện tại từ mục 7 BRIEF.md. Nhấn: luôn đọc cột "khách riêng", đừng đọc
"lượt xem". Nêu rõ mốc để so: quảng cáo 40 cú bấm → 1 hội thoại → 0 đơn chốt; lead 0.

## 8. Còn tồn
Lỗi "nhẹ" chưa sửa trong từng file, và những gì phản biện còn cảnh báo.

Cuối tài liệu: bảng đường dẫn tới từng file landing chi tiết.

Trả về (phần text): 5–8 dòng tóm tắt cho tôi báo lại chủ xưởng — chốt mấy landing, làm cái
nào trước, việc chặn đường nào phải sửa ngay, và người bán cần trả lời mấy câu.`,
  { label: 'ban-giao', phase: 'Tổng hợp' },
)

return {
  soLanding: xong.length,
  danhSach: bangKe,
  khongLam: chon.khong_lam,
  canhBao: chon.canh_bao,
  fileBanGiao: `${RA}/00-BAN-GIAO.md`,
  tomTat: tongHop,
}
