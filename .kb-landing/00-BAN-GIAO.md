# Bộ landing "đặt riêng" — tài liệu bàn giao

Soạn ngày 3/8/2026. Nguồn số liệu: `.kb-khaosat/BRIEF.md` (bản chắt lọc đã kiểm chứng từ
database thật + 4 bản khảo sát). Mọi con số trong bộ tài liệu này đến từ database, không
từ phỏng đoán. Chỗ nào chưa có số thật thì ghi `[NGƯỜI BÁN ĐIỀN: ...]` — đó là câu hỏi
dành cho anh, không phải chỗ bỏ quên.

---

## 1. Đọc trước: ba điều đổi cách làm

**(a) Đừng tin con số "0 organic".** Bảng đo traffic nội bộ (`koi_page_views`) mới sống từ
1/8/2026 12:23 tới 3/8/2026 01:40 — tức khoảng một ngày rưỡi, 790 lượt xem. Một trang hiện
"0 khách Google" trong bảng đó nghĩa là **CHƯA ĐO ĐƯỢC**, không phải trang chết. Kết luận
"trang này vô dụng, xoá đi" dựa trên bảng này là kết luận sai. Muốn biết trang nào thật sự
chết, phải mở Google Search Console và đọc dữ liệu 16 tháng.

**(b) Khách Google đang vào bằng BÀI DỊCH VỤ, không phải trang danh mục.** Trong một ngày
rưỡi đo được, cửa organic mở ở: `/dinh-vu-do-va-cat-day-lung-chuyen-nghiep/` (6 khách),
`/dich-vu-lam-tui-da-theo-yeu-cau/` (6), `/khac-ten-len-vi-da/` (5),
`/dich-vu-boc-da-tai-nghe-cao-cap/` (3). Trang danh mục `/san-pham/...` gần như không có
khách organic — cao nhất là `/san-pham/card-holder/` với 3 khách. Nghĩa là: khách tìm Google
bằng **việc họ muốn làm** ("đặt làm túi da theo yêu cầu"), không bằng **tên kệ hàng**
("túi da cho nữ").

**(c) Vì vậy landing là NÂNG CẤP URL ĐANG CÓ, không dựng URL mới.** Tôi đã cân nhắc dựng
một cây URL mới kiểu `/dat-lam/tui-da/` và **quyết định không làm**. Site hiện đã có ba tầng
tự cạnh tranh nhau (bài viết + trang tĩnh + trang danh mục) cho cùng một chủ đề. Thêm tầng
thứ tư là tự dập chính tài sản duy nhất đang hút được khách. Cả 5 landing dưới đây đều giữ
nguyên đường dẫn cũ — chỉ viết lại nội dung bên trong.

---

## 2. Bảng landing — làm cái nào trước

| # | URL (giữ nguyên) | Landing nói về gì | Số SP | Khoảng giá | Vì sao chọn |
|---|---|---|---|---|---|
| 1 | `/dich-vu-lam-tui-da-theo-yeu-cau/` | Đặt làm túi da theo yêu cầu | 49 nữ + 14 nam | nữ 3,8–79,0tr (phần lớn ~11,5tr) · nam 6,9–39,0tr (~16,0tr) | **6 khách Google riêng** trong 1,5 ngày — cửa organic đã mở. Danh mục giá trị cao nhất site. |
| 2 | `/san-xuat-qua-tang-doanh-nghiep-va-su-kien/` | Quà tặng doanh nghiệp & sự kiện (B2B) | card holder 14 · passport 10 · móc khoá 4 · ốp ĐT 24 | 0,3 – 9,5tr tuỳ món | Cụm 45 bài lớn nhất site. **14/40 cú bấm quảng cáo** rơi vào cụm này + 13 khách Google → chỗ thất thoát tiền quảng cáo lớn nhất. |
| 3 | `/day-da-dong-ho/` | Đặt làm dây da đồng hồ | 43 | 1,4–7,4tr (~2,2tr) | 43 SP + **cụm 28 bài** thay dây theo hãng — kho link nội bộ lớn nhất site. |
| 4 | `/lam-vi-da-theo-yeu-cau/` | Đặt làm ví da, khắc tên | 27 nam + 29 nữ + 15 kẹp tiền + 2 ví zip | nam 3,3–11,8tr (~4,8tr) · nữ 1,8–28,0tr (~6,8tr) | Bài cùng cụm `/khac-ten-len-vi-da/` có **5 khách Google** — ý định khắc tên đã hút organic. |
| 5 | `/dat-lam-that-lung-theo-yeu-cau-koi-leather/` | Đặt làm thắt lưng theo số đo | 21 nam + 9 nữ | nam 3,5–22,0tr (~4,5tr) · nữ 3,9–25,0tr (~4,2tr) | Bài cùng cụm có **6 khách Google**. Đo số đo là lợi thế riêng của xưởng. |

**Nguyên tắc xếp thứ tự:** chỗ nào **ĐÃ** có khách organic hoặc **ĐÃ** có cú bấm quảng cáo
thì làm trước. Không phải vì nó quan trọng nhất về doanh thu, mà vì **đo được ngay trong
tuần đầu**: có sẵn con số trước để so với con số sau. Làm một trang chưa ai vào thì sửa xong
cũng không biết sửa có tác dụng hay không.

**Bắt đầu từ số 1** (`/dich-vu-lam-tui-da-theo-yeu-cau/`): đã có khách organic, giá trị đơn
cao nhất site, và cấu trúc nội dung ở đây dùng lại được cho 4 trang còn lại.

Chi tiết từng trang nằm ở 3 file riêng (xem bảng cuối tài liệu).

---

## 3. Việc phải làm TRƯỚC khi viết chữ đầu tiên

Landing viết hay tới đâu, nếu 4 lỗi dưới đây còn thì khách vẫn không tới được và lead vẫn
không về. Đây không phải việc SEO, là việc kỹ thuật.

### Nhóm [CHẶN ĐƯỜNG] — chưa xong thì đừng xuất bản

| | Việc | Ở đâu | Không làm thì sao |
|---|---|---|---|
| 3.1 | ~~Form mất tên sản phẩm~~ **ĐÃ SỬA** | `koi-storefront/src/components/lead-form.tsx` | *Đã sửa: thêm `name="product_name"`. Lead giờ mang được tên sản phẩm.* |
| 3.4 | ~~Vô hạn URL danh mục~~ **ĐÃ SỬA** | `koi-storefront/src/app/san-pham/[...path]/page.tsx` | *Đã sửa và đã kiểm chứng trên server thật — xem ghi chú dưới bảng.* |
| 3.2 | **Không ai đọc được lead** | `Koi Backend/src/shop/shop.controller.ts` + `public/index.html` | Chỉ có `POST /shop/leads`, không có `GET`, không có tab Leads trong admin, không có email/thông báo. Khách gửi form xong thông tin nằm im trong database, không ai biết. Landing ra lead cũng vô nghĩa. ⚠ **Phải thêm `GET` dưới `/analytics`, TUYỆT ĐỐI không dưới `/shop`** — `auth.guard.ts:35` mở toàn bộ `/shop` cho khách vãng lai, để ở đó là phơi số điện thoại khách ra internet. Thêm tiền tố mới thì phải deploy thêm repo `koi-domain-router`. |
| 3.3 | **`/lien-he/` không có link nào trỏ tới** | `src/components/site-header.tsx`, `site-footer.tsx` | Form chỉ hiện ở `/lien-he/`, mà trang đó **0 lượt xem** và không có link ở header lẫn footer. Bảng `leads` rỗng **vì chưa ai thấy form**, không phải vì form hỏng. |

**Hai việc đã sửa xong trong lúc soạn tài liệu này:**

- **3.1 — form mất tên sản phẩm.** `lead-form.tsx` render `name="product_id"` còn
  `actions.ts` đọc `product_name` → tên sản phẩm luôn rỗng. Đã thêm ô `product_name`.
  Lưu ý: fix này đúng nhưng **chưa phát huy**, vì hiện `<LeadForm />` chỉ được gọi ở
  `/lien-he/` mà không truyền prop nào. Khi dựng landing phải truyền `productName` vào.
- **3.4 — vô hạn URL danh mục.** Canonical trước đây khai toàn bộ đường dẫn nên mọi tiền tố
  bịa ra đều trả 200 và tự canonical về chính nó → vô hạn URL cho Google lập chỉ mục.
  Đã sửa và **kiểm chứng bằng server thật**: `/san-pham/day-lung-cho-nam/` → 200 với
  canonical một cấp; `/san-pham/do-da-thu-cong-cao-cap-danh-cho-nam/day-lung-cho-nam/`
  (URL rác có thật trong log) → chuyển hướng về URL một cấp, giữ cả `?page=2`;
  `/san-pham/khong-he-ton-tai-abc/` vẫn **404** đúng như mong muốn.
  *Một điểm khác BRIEF: Next.js phát 308 chứ không phải 301 như BRIEF §3.4 ghi. Cùng tác
  dụng SEO, chỉ khác mã số.*

### Nhóm còn lại — nên xong trước hoặc ngay sau khi xuất bản

| | Việc | Vì sao cần cho landing |
|---|---|---|
| 3.5 | Đặt `NEXT_PUBLIC_GOOGLE_ADS_ID` + `NEXT_PUBLIC_GA_ID` + 3 nhãn chuyển đổi trên Vercel dự án `koileather` | Google tag chưa nạp trên bản chạy thật → không đo được landing có ra chuyển đổi hay không |
| 3.6 | Đặt `ANALYTICS_SALT` trên Vercel dự án `koi-leather-api` | Chưa có → cột "khách riêng" bị phồng, so trước/sau sẽ lệch |
| 3.8 | Thêm bảng `koi_contact_clicks` + `POST /shop/contact-click` | Chưa ghi nhận được cú bấm Zalo/gọi của khách organic → không biết landing có đẩy được khách sang liên hệ |
| 3.9 | Thử tay tin nhắn Zalo soạn sẵn trên 4 kiểu máy | Chưa ai kiểm chứng `zalo.me/...?text=` có thật sự điền được tin nhắn hay không. Nếu không, cả 5 điểm chạm CTA đều hỏng |
| 3.10 | Thêm `images.deviceSizes` vào `next.config.ts` | Ảnh vượt hạn Supabase; landing nào cũng nhiều ảnh |
| 3.11 | Bỏ trang tag khỏi sitemap + đặt `robots:{index:false}` | Rác trong sitemap làm loãng ngân sách quét của Google |
| 3.13 | Thêm chuyển hướng cho 5 URL danh mục đang 404 | `/san-pham/do-da-nam/` (từng 89 SP), `/do-da-cao-cap-cho-nu/` (94), `/phu-kien-khac/` (30), `/leather-material/`, `/thu-cong-bespoke/`. Trang `/san-pham/` **vẫn còn link vào hai cái đầu** → khách bấm vào là gặp 404 |

---

## 4. Người bán phải trả lời — gom một lượt

Anh ngồi trả lời một lần, cả 5 landing dùng chung. Chưa có câu trả lời thì trang vẫn viết
được, nhưng chỗ đó sẽ để trống và khách sẽ hỏi qua Zalo — tức là mất một cơ hội tự chốt.

### ⚠ Câu số 0, quan trọng nhất: XƯỞNG THÀNH LẬP NĂM NÀO?

Site đang tự nói ba con số khác nhau:
`/koi-leather-nha-san-xuat.../` nói **2017** · `/sua-chua-do-da/` nói **"hơn 10 năm"** ·
`/nha-san-xuat-do-da-thu-cong/` nói **"hơn 7 năm"**. Từ 2017 tới 2026 là **9 năm**.

Ba con số này đang nằm trên ba trang khách đọc được. Phải chốt **một** số trước khi viết chữ
đầu tiên, nếu không 5 landing mới sẽ nhân bản mâu thuẫn đó ra thêm 5 trang nữa. Đây cũng là
thứ Google dùng để đánh giá độ tin cậy (E-E-A-T).

### Thời gian và tiền

- Thời gian làm từng nhóm hàng: túi da bò · túi da cá sấu/đà điểu · ví · dây đồng hồ · thắt lưng
- Thời gian làm rập thử trước khi cắt da
- % cọc, và có hoàn cọc nếu khách huỷ trước lúc cắt da không
- Mốc thanh toán phần còn lại
- Thời gian phản hồi Zalo trong giờ và ngoài giờ
- Giờ mở cửa xưởng

### Bảo hành và đổi trả

- Phạm vi + thời hạn bảo hành đường khâu và khoá
- **"Bảo dưỡng trọn đời"** trên thanh header nghĩa là gì: gồm gì, không gồm gì
- Chính sách đổi trả với **hàng đặt riêng** (phải khớp `/chinh-sach-hoan-tien-doi-tra/`)
- Có sửa lại miễn phí nếu lệch số đo đã chốt không, trong bao lâu

### Xưởng và nghệ nhân

- Tên + vai trò 4 người: ra rập · cắt da · khâu tay · kiểm cuối
- Mỗi người một câu về chỗ khó nhất trong việc của họ
- Có cho khách hẹn tới xem khâu tận mắt không
- Có gửi mẫu da nhỏ về nhà cho khách xem trước không
- Có tính phí làm rập riêng không

### B2B (cho landing quà tặng doanh nghiệp)

- MOQ theo từng dáng hàng
- Bậc giá theo số lượng: mốc số lượng nào, giảm bao nhiêu
- Có xuất hoá đơn VAT không
- Cam kết mốc giao đúng hạn sự kiện — trễ thì sao

### Giấy tờ da đặc biệt

- Giấy CITES cho da cá sấu: có cấp kèm không, dạng nào
- Khách mang ra nước ngoài thì thủ tục thế nào
- Kỹ thuật khắc tên, vị trí khắc được, và **giới hạn số ký tự**

---

## 5. Khung layout dùng chung — 12 khối

Cả 5 landing dùng chung khung này. Mỗi khối có một nhiệm vụ và trả lời một cái lo cụ thể
của khách — không có khối nào chỉ để cho dài.

| # | Khối | Nhiệm vụ | Trả lời cái lo nào |
|---|---|---|---|
| 1 | **Hero** — H1 + 1 dòng phụ + 1 nút + 1 dòng gỡ lo | Bắt khách đến từ truy vấn "đặt làm ..." | *Có được xem mẫu trước không* |
| 2 | **Mở đầu** 2–3 đoạn | Nói đúng việc xưởng làm được, và **không** làm được | |
| 3 | **Khoảng giá** | Số thật từ database, đặt sớm để khách khỏi thoát | **Giá bao nhiêu** |
| 4 | **Quy trình 4–6 bước**, ảnh có bàn tay | Dạy khách việc họ phải làm ở mỗi bước | **Làm bao lâu** · xem mẫu trước · thanh toán |
| 5 | **Bảng chất liệu** + link bài từng loại da | Khối SEO nặng nhất, hút link nội bộ | *Vì sao giá chênh nhau* |
| 6 | **Thông số + MỘT câu hạn chế thật thà** | Vượt chuẩn đối thủ | |
| 7 | **Lưới sản phẩm 6–12 món** | Cho khách tự định vị mình ở dải giá nào | |
| 8 | **Bảng cam kết**: thời gian · cọc · MOQ · đổi trả | Phần lớn là `[NGƯỜI BÁN ĐIỀN]` | |
| 9 | **Nghệ nhân** (tên + vai trò thật) | E-E-A-T | |
| 10 | **FAQ 6–9 câu** | Câu hỏi khách hỏi thật, suy từ bài đã có trên site | **Không vừa ý thì sao** |
| 11 | **CTA cuối + form** | Chốt | |
| 12 | **Case study + bài liên quan** | | |

**Luật CTA — một hành động, năm điểm chạm.** Chỉ có **một** hành động chính trên cả trang
(nhắn Zalo), lặp lại ở 5 chỗ: hero · sau khối giá · sau khối quy trình · sau FAQ · thanh
liên hệ dính đáy. Mỗi nút phải là **động từ + cái khách nhận** ("Nhắn Zalo để nghệ nhân tư
vấn"), kèm một dòng gỡ lo bên dưới ("Nhắn để hỏi thôi cũng được — chưa cần quyết gì").
**Không** chen CTA vào giữa khối chất liệu — khách đang đọc để học, chen nút vào là cắt mạch.

**Luật form — 4 trường + 1 textarea.** Hiện `LeadForm` chỉ có 3 trường (tên, điện thoại,
nội dung). Cần thêm ô chọn **món muốn đặt** (bắt buộc) và ô chọn **ngân sách** (không bắt
buộc, có mục "Chưa rõ, nhờ shop tư vấn"). Bảng `leads` **không có cột riêng** cho hai thứ
này → phải nối chuỗi vào cột `message` theo một khuôn cố định. Nút gửi ghi **"Để lại số,
shop gọi lại"**, không ghi "Gửi" hay "Đăng ký".

**Luật JSON-LD.** Khai `Service` + `ItemList` + `BreadcrumbList` (+ `FAQPage` nếu có FAQ).
**KHÔNG** khai `Product` (không phải trang bán một món cụ thể). **KHÔNG** khai
`aggregateRating` (chưa có đánh giá thật — khai là vi phạm). `LocalBusiness` chỉ tham chiếu
`@id`. Google đã bỏ FAQ rich result khỏi Search từ **7/5/2026** → FAQ giữ cho người đọc và
cho AI Overviews, đừng trông vào rich result.

**Ba thứ cấm.** (1) Không popup — khách đang đọc thì đừng chặn mặt. (2) Không dựng thanh
liên hệ riêng: `ContactBar` đã có sẵn và tự đổi hình dạng theo cỡ màn, dựng thêm là thành
hai thanh chồng nhau. (3) Không đặt CTA cuối trong 64px cuối trang — thẻ `main` có
`pb-16 md:pb-0`, thanh đáy sẽ che.

**Ảnh:** đúng **một** ảnh trên khung nhìn đầu (ảnh LCP), mật độ 1 ảnh / 150–250 từ.
**64% khách vào bằng điện thoại** (99 mobile / 54 desktop / 1 tablet) — mọi bảng phải cuộn
ngang được.

---

## 6. Những gì KHÔNG làm landing, và vì sao

Để anh không phải hỏi lại sau. Mỗi mục dưới đây tôi đã cân nhắc và **cố ý bỏ**.

| Không làm | Vì sao |
|---|---|
| **Sửa chữa / spa đồ da** (`/sua-chua-do-da/` 27.802 ký tự + 10 bài + bài dài nhất site 37.385) | Cụm này lớn và đang có khách organic thật, nhưng ý định của khách là **sửa món họ đã có**, không phải đặt món mới. Phễu khác, khách khác, giá khác. Xứng đáng một bộ landing **RIÊNG** ở giai đoạn 2 — trộn vào bộ này là làm hỏng cả hai. |
| **May trám chần, đan lát, chạm khắc trên da** (10 + 4 + 1 SP) | Là **kỹ thuật chế tác**, không phải loại sản phẩm — không ai tìm Google bằng "máy trám chần". Giá lại cao (trám chần trung vị 5,7tr, đan lát 6,7tr) nên dùng làm **khối bằng chứng tay nghề** nhúng vào landing lớn thì đúng chỗ hơn. |
| **Trademark, Signature, Phụ kiện riêng** (13 + 11 + 11 SP) | Khái niệm thương hiệu nội bộ, không có nhu cầu tìm kiếm. Mô tả danh mục = **0 ký tự**, tức chưa ai từng viết gì cho chúng. |
| **Bọc da tai nghe (3 SP) và ốp điện thoại (24 SP) làm landing riêng** | Lệch giá quá lớn: KOI 2,8tr vs hàng in theo yêu cầu ~100k. Bài `/dich-vu-boc-da-tai-nghe-cao-cap/` có 3 khách Google nên **giữ nguyên**, nhưng landing riêng sẽ hút toàn khách sai tầm giá. Đưa vào khối món của landing quà tặng B2B thì đúng chỗ. |
| **Cây URL mới `/dat-lam/{slug}/`** | Site đã có ba tầng tự cạnh tranh (bài + trang tĩnh + danh mục). Thêm tầng thứ tư là tự dập tài sản duy nhất đang hút organic. Landing = nâng cấp URL đang có. |
| **Trang riêng theo quận/huyện** | Vi phạm hướng dẫn Google (doorway page). Rủi ro bị phạt cao hơn lợi ích. |
| **Từ khoá kiểu "đặt làm dây lưng Hermes"** | Tên hãng khác cho **sản phẩm thay thế** là mức rủi ro pháp lý khác hẳn dịch vụ sửa/thay. Dịch vụ sửa dùng dẫn chiếu hợp pháp ("thay dây cho đồng hồ Omega") — sản phẩm thay thế thì không. |
| **`ban-rap-thiet-ke` (9 SP)** | URL được giữ sống có chủ ý cho SEO (`shop.service.ts:152` ẩn khỏi lưới nhưng URL vẫn 200) nhưng giá 0,1tr đồng loạt — đây là hàng nội bộ / mẫu rập, không phải hàng bán. |

---

## 7. Đo thế nào

| Chỉ số | Nguồn | Mốc hiện tại để so |
|---|---|---|
| Khách Google riêng vào landing | `koi_page_views` (source='google') | túi 6 · thắt lưng 6 · ví 5 · quà tặng 13 |
| Tỷ lệ điện thoại | `koi_page_views.device` | 99 mobile / 54 desktop / 1 tablet |
| Khách bấm liên hệ / khách vào | cần bảng ở việc 3.8 | **chưa đo được** |
| Cú bấm quảng cáo → hội thoại | `koi_ad_clicks` | **40 → 1** |
| Hội thoại → đơn chốt | `koi_ad_clicks.convertedAt` | **0** |
| Lead từ form | `leads` | **0** |

**Luôn đọc cột "khách riêng", đừng đọc "lượt xem".** `/dau-an-rieng/` có 50 lượt xem nhưng
chỉ **5 khách**; nguồn `internal` có 214 lượt / 13 khách. Lượt xem đang bị người trong nhà
làm phồng — nhìn vào đó sẽ tưởng trang đang chạy tốt.

**Ba mốc nhớ kỹ:** 40 cú bấm quảng cáo → 1 hội thoại → **0 đơn chốt**. Và lead từ form: **0**.
Đây là điểm khởi đầu. Bất kỳ con số nào lớn hơn 0 sau khi xuất bản đều là tiến bộ thật.

**Lưu ý kỹ thuật về dữ liệu:** `koi_ad_clicks` tự xoá dòng chưa chốt sau 120 ngày;
`koi_presence` sau 24 giờ; `koi_page_views` **không** có cơ chế dọn nên sẽ phình dần. Hạn 90
ngày của Google Ads tính **từ lúc bấm quảng cáo**, không phải từ lúc chốt đơn — chốt muộn
hơn 90 ngày là mất dấu chuyển đổi.

---

## 8. Cảnh báo và còn tồn

1. **Năm thành lập tự mâu thuẫn ba chỗ** — xem mục 4 câu số 0. Chốt trước khi viết.
2. **Trước khi đổi title của bất kỳ URL nào đang tồn tại: PHẢI mở Google Search Console đọc
   dữ liệu 16 tháng.** Bảng đo nội bộ mới sống 1,5 ngày, không đủ để quyết định gì.
3. **TUYỆT ĐỐI không đổi title `/qua-tang-doanh-nghiep-cuoi-nam/`** — đó là trang đang nhận
   14/40 cú bấm quảng cáo và 13 khách Google. Chỉ **thêm** link trỏ lên trang hub, không sửa
   gì khác. Đổi title trang này là tự cắt nguồn traffic đang có.
4. **Hai trang tĩnh gần trùng về quà tặng doanh nghiệp** — `/san-xuat-qua-tang-doanh-nghiep-va-su-kien/`
   (39.470 ký tự) và `/qua-tang-doanh-nghiep-va-su-kien/` (22.418 ký tự). Phải xử lý dứt
   điểm một trong hai, nếu không trang hub mới sẽ cạnh tranh với chính nó.
5. **Hai bài vướng tên thương hiệu người khác** — `/dat-lam-day-lung-hermes/` (7.730 ký tự)
   và `/dat-lam-day-lung-khoa-chu-h/` (4.269). Đây là **sản phẩm thay thế** mang tên hãng
   khác, không phải dịch vụ sửa. Số phận hai bài đó là quyết định của anh, không phải quyết
   định SEO — nhưng landing mới **không được** nhắm loại từ khoá đó và không link nổi bật
   tới chúng. Tương tự với bài `thay-day-da-dong-ho-hermes` trong cụm dây đồng hồ.
6. **Lệch giá với đối thủ ở dây đồng hồ:** KOI trung vị 2,2tr vs đối thủ 350k–1tr. Landing
   dây đồng hồ **tuyệt đối không** nhắm từ khoá về giá — hút khách sai tầm giá là tốn tiền
   quảng cáo mà không ra đơn.
7. **Chưa có công cụ nào cho volume tìm kiếm** — không Keyword Planner, không Ahrefs. Mọi
   thứ tự ưu tiên trong tài liệu này dựa trên **số SP thật, độ dài nội dung thật, và lượt
   khách organic đo được trong 1,5 ngày** — không dựa trên volume. Khi có công cụ, nên xem
   lại thứ tự.
8. **Fix form (3.1) đúng nhưng chưa phát huy** — hiện `<LeadForm />` chỉ được gọi ở
   `/lien-he/` và không truyền prop nào. Khi dựng landing phải truyền `productName` vào, nếu
   không lead về vẫn không biết khách đến từ trang nào.

---

## 9. Đường dẫn tới từng landing chi tiết

Mỗi landing gồm 4 file: phần 1 là thẻ meta + khối 1–6, phần 2 là khối 7–12, phần 3a là liên
kết nội bộ + JSON-LD, phần 3b là đường chuyển đổi + việc người bán phải điền.

| # | Landing | File (tiền tố `.kb-landing/`) |
|---|---|---|
| 1 | Túi da đặt riêng | `tui-da-dat-rieng-1-mo-dau.md`<br>`tui-da-dat-rieng-2-bang-chung.md`<br>`tui-da-dat-rieng-3a-lien-ket-jsonld.md`<br>`tui-da-dat-rieng-3b-chuyen-doi.md` |
| 2 | Quà tặng doanh nghiệp | `qua-tang-doanh-nghiep-1-mo-dau.md`<br>`qua-tang-doanh-nghiep-2-bang-chung.md`<br>`qua-tang-doanh-nghiep-3a-lien-ket-jsonld.md`<br>`qua-tang-doanh-nghiep-3b-chuyen-doi.md` |
| 3 | Dây da đồng hồ đặt riêng | `day-da-dong-ho-dat-rieng-1-mo-dau.md`<br>`day-da-dong-ho-dat-rieng-2-bang-chung.md`<br>`day-da-dong-ho-dat-rieng-3a-lien-ket-jsonld.md`<br>`day-da-dong-ho-dat-rieng-3b-chuyen-doi.md` |
| 4 | Ví da đặt riêng | `vi-da-dat-rieng-1-mo-dau.md`<br>`vi-da-dat-rieng-2-bang-chung.md`<br>`vi-da-dat-rieng-3a-lien-ket-jsonld.md`<br>`vi-da-dat-rieng-3b-chuyen-doi.md` |
| 5 | Thắt lưng đặt riêng | `that-lung-dat-rieng-1-mo-dau.md`<br>`that-lung-dat-rieng-2-bang-chung.md`<br>`that-lung-dat-rieng-3a-lien-ket-jsonld.md`<br>`that-lung-dat-rieng-3b-chuyen-doi.md` |

*Đã kiểm tra máy toàn bộ 20 file: 63 đường dẫn nội bộ đều tồn tại trong khảo sát, không có
URL bịa; không file nào khai `Product` hay `aggregateRating`/`review`; không có `zalo.me`
viết tay; không nhắc Shopee/kitleather; mọi con số tiền đều khớp bảng giá thật; 0 câu trùng
lặp giữa các phần.*
