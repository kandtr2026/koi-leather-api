Đã đọc mã nguồn hai repo, schema Prisma, và truy vấn trực tiếp database (chỉ đọc) để đối chiếu. Có vài chỗ trong bối cảnh được giao lệch với thực tế đang chạy — nêu ở mục 0 vì nó đổi cả cách thiết kế.

---

# Đường dẫn chuyển đổi cho landing "đặt làm riêng" — koileather.com

## 0. Sáu phát hiện phải xử lý trước khi bàn nội dung

Đọc mã và số liệu thật, năm chỗ sau đang chặn đứng mọi chuyển đổi. Viết landing đẹp mà không sửa chúng thì lead vẫn bằng 0.

### 0.1 "Traffic 90 ngày" thực chất là 2 ngày — site KHÔNG phải chưa có organic

Bảng `koi_page_views` có dòng đầu tiên lúc `2026-08-01 19:23`. Truy vấn 90 ngày nhưng bảng mới sống 2 ngày:

| Ngày | Lượt xem | Khách riêng |
|---|---|---|
| 2026-08-02 | 636 | 91 |
| 2026-08-03 | 148 | 63 |
| **Tổng** | **784** | **154** |

Nguồn (lượt / khách riêng): `direct` 313/42 · `internal` 214/13 · `google` **145/75** · `facebook` 90/29 · `instagram` 17/4 · `search_khac` 5/5.

75 khách từ Google trong 2 ngày. Đây không phải "site gần như chưa có organic" — đây là **site chưa được đo**. Kết luận đổi hoàn toàn: bài toán không phải xây organic từ số không, mà là **đừng làm hỏng organic đang có** khi gộp trang, và bắt lấy dòng khách Google đang chảy vào mà chưa ai hứng.

Trang Google đang đẩy khách vào (khách riêng): `/` 22 · `/qua-tang-doanh-nghiep-cuoi-nam/` 13 · `/cua-hang/` 10 · `/dinh-vu-do-va-cat-day-lung-chuyen-nghiep/` 6 · `/khac-ten-len-vi-da/` 5 · `/dich-vu-lam-tui-da-theo-yeu-cau/` 5 · `/dich-vu-boc-da-tai-nghe-cao-cap/` 3.

**Cửa vào organic hiện nay là BÀI VIẾT WordPress ở gốc tên miền, không phải trang danh mục.** Landing "đặt riêng" phải nối vào đúng những bài đó, không phải dựng ở chỗ khác rồi chờ Google tự tìm.

### 0.2 Trang có form đặt riêng đang không có đường nào dẫn tới

`LeadForm` chỉ được render tại một chỗ duy nhất: `/lien-he/`, và chỉ khi `slug === 'lien-he'`.

- `E:\Claude A Khoa Processing\koi-storefront\src\app\[slug]\page.tsx:14` — `const CONTACT_SLUG = 'lien-he'`
- `/lien-he/` **không có link nào** trong header (`src\components\site-header.tsx`) hay footer (`src\components\site-footer.tsx`). Footer chỉ có `ContactLink` phone/zalo/messenger.
- Số liệu xác nhận: `/lien-he/` có **0 lượt xem** trong bảng.

Bảng `leads` rỗng **không phải vì form hỏng, mà vì chưa một ai nhìn thấy nó.** Đây là câu trả lời cho câu hỏi 3 của bạn.

### 0.3 Lead có vào cũng không ai biết — không có nơi đọc, không có thông báo

- Không có endpoint `GET /shop/leads`. Chỉ có `POST` tại `E:\Claude A Khoa Processing\Koi Backend\src\shop\shop.controller.ts:157`.
- Admin (`Koi Backend\public\index.html`) có 6 tab: products, prodcats, media-types, material-categories, traffic, ads. **Không có tab Leads.**
- Không có nodemailer / webhook / telegram trong `src/` — không có thông báo nào khi có lead.

Bật form lên mà không làm mục 0.3 là tạo ra một hố đen: khách gửi thông tin, hệ thống trả "Shop sẽ liên hệ lại trong thời gian sớm nhất", rồi không ai gọi. Tệ hơn cả việc không có form.

### 0.4 Lỗi thật: tên sản phẩm luôn bị mất khỏi lead

`E:\Claude A Khoa Processing\koi-storefront\src\components\lead-form.tsx:24` render hidden input tên `product_id`:

```tsx
{productId ? <input type="hidden" name="product_id" value={productId} /> : null}
```

Nhưng `E:\Claude A Khoa Processing\koi-storefront\src\app\actions.ts:19` đọc một tên khác:

```ts
const productName = String(formData.get('product_name') ?? '').trim();
```

`product_name` không tồn tại trong form → `productName` **luôn** rỗng → `productName: null` gửi sang API. Còn `product_id` thì `actions.ts` không đọc, và `createLead` cũng cố ý để `product_id: null` (`Koi Backend\src\shop\shop-content.service.ts:182`). Kết quả: mọi lead đến sẽ **không mang thông tin sản phẩm nào**, dù `LeadForm` có nhận prop `productName`.

Sửa: đổi hidden input thành `name="product_name"` và truyền `value={productName}`.

### 0.5 Google tag chưa nạp trên bản chạy thật

Tải `https://koileather.com/` và `https://koileather.com/lien-he/`: **0 lần** xuất hiện `googletagmanager`, `gtag`, `dataLayer`. `GoogleTag` tự trả `null` khi thiếu ID (`src\components\google-tag.tsx:18`) — nghĩa là `NEXT_PUBLIC_GOOGLE_ADS_ID` và `NEXT_PUBLIC_GA_ID` chưa khai trên Vercel.

Hệ quả: `trackContactClick()` chạy nhưng thoát ngay ở dòng `if (!window.gtag) return`. **Mọi cú bấm Zalo/gọi hiện không được ghi nhận ở Google Ads lẫn GA4.** Chỉ còn đường tự làm (`ghiNhanLienHe` → `koi_ad_clicks`) là còn sống.

### 0.6 Quảng cáo đang chạy và đang thất thoát gần hết

`koi_ad_clicks`: **40 dòng**, 37 có `gclid`, **1 dòng có `contactedAt`**, **0 dòng có `convertedAt`**.

Trang đáp của quảng cáo: `/` 21 · `/qua-tang-doanh-nghiep-cuoi-nam/` 14 · `/khac-ten-len-vi-da/` 4 · `/dinh-vu-do-va-cat-day-lung-chuyen-nghiep/` 1.

40 cú bấm trả tiền → 1 hội thoại. Quảng cáo đang đổ vào trang chủ và bài viết cũ, không có landing nào hứng. **Đây chính là chỗ landing "đặt riêng" phải ra đời, và có sẵn đích để đo hiệu quả trước/sau.**

Kèm một rủi ro chưa ai kiểm chứng: cả cơ chế "mã tư vấn" đặt cược vào việc `zalo.me/0901678999?text=...` điền sẵn tin nhắn. Với 1/40 dòng chạm tới `ad-contact`, chưa có bằng chứng nào là nó hoạt động. **Phải test thật trên điện thoại Android và iPhone trước khi tin.** Cách phòng ở mục 5.4.

---

## 1. Hành trình khách: Google → landing → chốt Zalo

Bảy bước. Mỗi bước ghi ma sát thật và cách giảm.

### Bước 1 — Khách gõ tìm trên Google

Ý định thật của người sắp đặt riêng không phải "đồ da thủ công". Nó là một trong ba dạng, đọc được từ chính các bài đang hút organic:

- **Dạng dịch vụ**: "đặt làm ví da theo yêu cầu", "làm dây lưng theo số đo", "khắc tên lên ví da"
- **Dạng quà tặng**: "quà tặng doanh nghiệp cao cấp", "quà tặng khách hàng cuối năm"
- **Dạng chất liệu**: "da epsom là gì", "da togo có bền không", "da cá sấu thật"

Ma sát: tiêu đề trên kết quả tìm kiếm không nói được "làm được theo ý tôi" nên khách bấm sang đối thủ.

Giảm: `title` của landing phải chứa **động từ hành động của khách**, không phải tên danh mục. So sánh:

- Yếu: `Ví Da Cho Nam | KOI Leather`
- Mạnh: `Đặt Làm Ví Da Nam Theo Yêu Cầu — Chọn Da, Màu, Khắc Tên | KOI Leather`

`meta_description` phải trả lời trước cái lo lắng lớn nhất, ngay trên trang kết quả: "Xem mẫu da thật trước khi làm. Nghệ nhân tư vấn qua Zalo. [NGƯỜI BÁN ĐIỀN: khoảng giá từ — đến]."

### Bước 2 — Khách đáp xuống landing, có 3 giây

Ma sát lớn nhất và bị coi nhẹ nhất: **64% khách là mobile** (99/154 khách riêng là mobile, 54 desktop, 1 tablet). Trên mobile, khung nhìn đầu chỉ vừa một tiêu đề, một dòng phụ, một nút. Ảnh hero to đẹp sẽ đẩy nút xuống dưới màn hình.

Giảm:

- Khung nhìn đầu tiên trên mobile phải chứa đủ: H1 + một dòng "làm gì cho bạn" + **một** nút chính + một dòng gỡ lo (xem 2.1).
- Ảnh hero: `priority` cho ảnh đầu, `sizes` đúng — hiện `ProductCard` và `ProductGallery` đã làm, landing mới phải làm theo.
- Thanh `ContactBar` dính đáy đã có sẵn (`src\components\contact-bar.tsx`) — landing chỉ cần render `<ContactBar />` là có nút Zalo trong tầm ngón cái suốt trang. Đừng dựng thanh nút riêng, sẽ thành hai thanh chồng nhau.
- `main` đã có `pb-16 md:pb-0` (`src\app\layout.tsx`) chừa chỗ cho thanh đáy. Landing không được đặt CTA cuối trang trong 64px cuối, sẽ bị thanh đáy che.

### Bước 3 — Khách tự hỏi "bao nhiêu tiền"

Ma sát nặng nhất của hàng thủ công giá cao. Trung vị giá toàn shop dao động rất rộng: `keychain-moc-khoa` trung vị 450.000đ, `clutch-cho-nam` trung vị 31.000.000đ. Khách không biết mình đang ở vùng nào thì không dám nhắn, vì sợ hỏi giá rồi bỏ đi thì bất tiện.

Giảm: nêu khoảng giá **có thật, lấy từ dữ liệu danh mục**, ngay khối thứ hai. Có sẵn `giaMin`/`giaTV`/`giaMax` cho từng danh mục. Ví dụ cho landing ví nam (`vi-da-cho-nam`: 27 SP, min 3.300.000, trung vị 4.800.000, max 11.800.000):

> Ví da nam đặt riêng tại KOI dao động **3,3 – 11,8 triệu**, phần lớn quanh **4,8 triệu**. Chênh nhau ở loại da và độ phức tạp của cấu trúc bên trong, không ở tên gọi.

Lưu ý khi lấy số: nhiều danh mục có `giaMin = 0` (hàng chưa điền giá) — **không được viết "từ 0đ"**. Dùng giá nhỏ nhất lớn hơn 0, hoặc chỉ nêu trung vị.

### Bước 4 — Khách so KOI với xưởng khác

Ma sát: mọi xưởng đều nói "thủ công", "da thật", "cao cấp". Không có gì phân biệt được.

Giảm: dùng thứ **đối thủ không copy nổi vì họ không có** — bảng chất liệu thật. 22 loại da, có số lượng: Epsom 91 SP, Cá sấu 48, Da bò Ý 44, Togo 32, Da dê Alran Pháp 15, Đà điểu 12, Swift 12, Caviar 11, Da bò vân Mill 11, Buttero 9, Kỳ đà 5, Da Trăn Python 1...

Một xưởng gia công không có 91 sản phẩm Epsom và 48 sản phẩm da cá sấu. Bảng này là bằng chứng, và nó **nối thẳng vào 158 bài viết đã có** — mỗi tên da là một link nội bộ tới bài giải thích (`da-epsom-la-gi`, `da-togo`, `da-de-alran`, `da-ca-sau-that`, `da-da-dieu`, `da-togo-va-da-epsom`, `da-togo-vs-da-clemence`, `so-sanh-da-cuu-va-da-de`, `cach-bao-quan-da-epsom-dung-cach-it-nguoi-biet`, `cach-bao-quan-da-togo`, `da-de-thuoc`, `da-ca-sau-va-da-da-dieu`, `da-de-va-da-bo-nen-chon-chat-lieu-nao`).

Đây là mũi khoan đôi: gỡ lo cho khách, đồng thời dồn liên kết nội bộ vào landing.

### Bước 5 — Khách quyết định nhắn hay không

Ma sát: bấm Zalo là mở hộp thoại với người lạ. Khách sợ ba thứ — bị đeo bám bán hàng, không biết mở lời thế nào, và bị đánh giá vì hỏi món rẻ.

Giảm:

- **Soạn sẵn tin nhắn** — đã có (`src\lib\contact.ts`, hàm `zaloLink`). Đây là đòn giảm ma sát mạnh nhất của cả trang: khách chỉ cần bấm Gửi.
- Nhưng tin soạn sẵn hiện nay là `"Chào shop, mình cần tư vấn."` cho trang không có sản phẩm. Với landing đặt riêng phải cụ thể hơn nhiều — xem 2.4.
- Ghi thẳng cạnh nút một dòng hạ rào: *"Nhắn để hỏi thôi cũng được — chưa cần quyết gì."*
- Ghi rõ giờ trả lời: *"Thường trả lời trong [NGƯỜI BÁN ĐIỀN: khoảng thời gian, ví dụ 'giờ hành chính, trong vòng 30 phút']."* Không được bịa.

### Bước 6 — Trong hộp thoại Zalo

Ma sát nằm ngoài web nhưng quyết định tiền: nghệ nhân phải hỏi lại 6-7 câu (làm gì, cho ai, da nào, màu, ngân sách, khi nào cần), khách trả lời nhỏ giọt rồi nguội.

Giảm: **để landing hỏi trước, Zalo chỉ xác nhận.** Đây là lý do form đặt riêng tồn tại song song với nút Zalo, không thay thế nó (mục 3).

### Bước 7 — Chốt đơn, và nối tiền về Google

Ma sát: chốt xong không ai nhập mã, `koi_ad_clicks.convertedAt` mãi bằng 0 (đang đúng là 0/40), Google Ads mãi không học được.

Giảm: mã tư vấn 6 ký tự đã có (`Koi Backend\src\ads\ads.service.ts`, `BANG_CHU_CAI = "23456789BCDFGHJKMNPQRSTVWXYZ"` — đã bỏ 0/O/1/I/L/U/A/E). Cần đúng một việc thủ công: chốt đơn thì mở `/admin/ads`, dán mã, điền số tiền. **Hạn 90 ngày tính từ lúc bấm quảng cáo, không phải lúc chốt** — quá là Google lặng lẽ bỏ qua.

### Sơ đồ ma sát tóm gọn

```
Google (75 khách/2 ngày)
  │  ma sát: title không nói "đặt riêng được"
  ▼
Landing — khung nhìn đầu (64% mobile)
  │  ma sát: nút bị ảnh đẩy xuống
  ▼
Khối giá  →  Khối chất liệu  →  Khối quy trình
  │  ma sát: không biết mình ở vùng giá nào
  ▼
Ngã ba quyết định
  ├── Nhắn Zalo ngay (tin soạn sẵn)  ── 80% khách đi lối này
  └── Điền form (ngoài giờ / muốn nghĩ thêm)
        │  ma sát 0.2: form hiện không ai thấy được
        │  ma sát 0.3: lead vào rồi không ai đọc
        ▼
      Hộp thoại Zalo + mã tư vấn
        ▼
      Chốt đơn → nhập mã ở /admin/ads → CSV → Google Ads
```

---

## 2. Lời gọi hành động: bao nhiêu, ở đâu, chữ gì

### 2.1 Số lượng: một hành động chính, năm điểm chạm

Nguyên tắc: **một** hành động (nhắn Zalo), lặp lại tại các mốc trang, cộng một đường phụ (form) cho người chưa muốn nhắn. Không được có 4 hành động ngang nhau — khách phải chọn là khách thoát.

Trang đủ dài để đặt CTA ở 5 chỗ:

| # | Vị trí | Dạng | Nhiệm vụ |
|---|---|---|---|
| 1 | Hero, ngay dưới dòng phụ | Nút chính đầy màu + 1 dòng gỡ lo dưới nút | Bắt khách đã sẵn sàng (đến từ truy vấn "đặt làm ...") |
| 2 | Sau khối GIÁ | Nút viền, chữ nhắc lại ngưỡng giá | Bắt khách vừa thấy giá vừa tầm |
| 3 | Sau khối QUY TRÌNH | Nút chính + form thu gọn cạnh bên (desktop) / dưới (mobile) | Bắt khách đã hiểu cách làm |
| 4 | Sau khối FAQ | Nút chính + form đầy đủ | Bắt khách đã gỡ hết lo |
| 5 | `ContactBar` dính đáy/mép phải | Đã có sẵn, chỉ cần render | Lưới an toàn ở mọi độ cuộn |

Ngoài ra: **không** đặt CTA giữa khối chất liệu. Khách đang đọc để học, chen nút vào là cắt mạch và giảm thời gian trên trang — thứ Google có đo.

### 2.2 Chữ trên nút chính — nhiều phương án

Nguyên tắc chữ nút: **động từ + cái khách nhận được**, không phải cái ta muốn. "Gửi thông tin" là ta nhận. "Nhận tư vấn" là khách nhận.

Nhóm A — nhấn vào việc được tư vấn (an toàn nhất, nên dùng cho hero):
- `Nhắn Zalo để nghệ nhân tư vấn`
- `Hỏi nghệ nhân qua Zalo`
- `Nhắn Zalo — nghệ nhân tư vấn miễn phí` (chỉ dùng nếu tư vấn thật sự không thu phí)
- `Tư vấn đặt riêng qua Zalo`

Nhóm B — nhấn vào việc xem mẫu da (mạnh với khách sợ mua hớ):
- `Xem mẫu da thật qua Zalo`
- `Nhắn Zalo xem mẫu da`
- `Gửi tôi ảnh mẫu da`

Nhóm C — nhấn vào báo giá (mạnh với khách đã biết mình muốn gì):
- `Nhắn Zalo nhận báo giá`
- `Báo giá cho mẫu của tôi`
- `Hỏi giá mẫu này qua Zalo`

Nhóm D — nhấn vào việc bắt đầu (dùng cho CTA cuối trang):
- `Bắt đầu đặt riêng`
- `Đặt riêng món của tôi`
- `Kể ý tưởng của bạn`

Nhóm E — chữ cho nút phụ (form):
- `Để lại số, shop gọi lại`
- `Gửi yêu cầu, shop liên hệ`
- `Nhắn ngoài giờ — để lại số`

**Tránh**: `Liên hệ ngay`, `Tìm hiểu thêm`, `Xem chi tiết`, `Đăng ký`, `Submit`, `Gửi`. Cái nào cũng mơ hồ hoặc gợi cảm giác bị bán hàng.

### 2.3 Chữ đi kèm nút (dòng gỡ lo) — thường quan trọng hơn chữ trên nút

Đặt ngay dưới nút, cỡ chữ nhỏ, màu nhạt:

- `Nhắn để hỏi thôi cũng được — chưa cần quyết gì.`
- `Tin nhắn đã soạn sẵn, bạn chỉ cần bấm gửi.`
- `Không cần cọc để được tư vấn.`
- `Thường trả lời trong [NGƯỜI BÁN ĐIỀN: khung giờ/thời gian phản hồi].`
- `Chưa biết chọn da nào? Nhắn ảnh mẫu bạn thích, nghệ nhân gợi ý.`

### 2.4 Tin nhắn soạn sẵn — phải viết lại cho landing đặt riêng

Hiện `zaloLink()` không truyền `productName` thì ra `"Chào shop, mình cần tư vấn."` (`src\lib\contact.ts`). Quá chung, nghệ nhân vẫn phải hỏi lại từ đầu.

Với landing đặt riêng, truyền vào `productName` một chuỗi mô tả ngữ cảnh landing, và soạn tin theo khuôn có **chỗ trống dẫn dắt** — khách hoặc điền, hoặc gửi luôn, cả hai đều tốt hơn hiện tại:

```
Chào shop, mình muốn đặt riêng một chiếc ví da nam.
- Mình thích: (dán ảnh hoặc tên mẫu)
- Ngân sách khoảng: 
- Cần trước ngày: 
(Mã tư vấn: K7F2QM)
```

Mã tư vấn tự chèn khi khách đến từ quảng cáo — cơ chế đã chạy (`src\lib\gclid.ts` + `ContactLink`). Nhưng xem cảnh báo 5.4 về việc `?text=` có thật sự điền sẵn hay không.

Cách làm: truyền `productName="một chiếc ví da nam"` vào `ContactLink` là hàm `zaloLink` tự ghép. Nếu muốn khuôn nhiều dòng như trên thì cần thêm một nhánh trong `zaloLink()` cho landing — ví dụ tham số `kieu: 'bespoke'`.

### 2.5 Hình thức nút: dùng lại đúng thứ đang có

Trang sản phẩm đã có cặp nút chuẩn (`src\app\cua-hang\[slug]\page.tsx:124-147`): nút chính `bg-koi-orange` full width, dưới là lưới 2 cột Messenger + số điện thoại. Landing nên dùng **cùng hình thức** để khách nhận ra ngay đó là nút hành động, và để không phải nuôi hai hệ thống nút.

Một điều chỉnh: trên landing đặt riêng, **Messenger và số điện thoại nên xuống hàng phụ nhỏ hơn**, không ngang cỡ với Zalo. Zalo là kênh chính ở Việt Nam; ba nút bằng nhau là bắt khách chọn kênh trước khi chọn hành động.

---

## 3. Form thu thông tin đặt riêng

### 3.1 Trước tiên: kiểm tra form hiện tại có chạy không

Bảng `leads` rỗng. Đây là cách phân biệt "hỏng" với "không ai thấy", theo thứ tự — dừng ở bước nào ra kết quả thì đó là nguyên nhân.

**Bước 1 — Đã có ai đến trang có form chưa?** Vào `/admin/traffic`, hoặc chạy trực tiếp:

```sql
SELECT COUNT(*) FROM koi_free_style.koi_page_views WHERE path = '/lien-he/';
```

Chạy rồi: **0**. Kết luận ngay tại đây — form chưa hỏng, chỉ là không một ai từng nhìn thấy nó (xem 0.2). Ba bước dưới là để xác nhận đường ống còn tốt trước khi mở cửa cho khách.

**Bước 2 — API còn nhận không?** Gọi thẳng, không qua trình duyệt:

```bash
# Payload sai — phải trả 400 kèm thông báo tiếng Việt
curl -i -X POST https://koi-leather-api.vercel.app/shop/leads \
  -H "Content-Type: application/json" -d '{"name":"","phone":"123"}'

# Payload đúng — phải trả 200 {"ok":true} và đẻ 1 dòng trong leads
curl -i -X POST https://koi-leather-api.vercel.app/shop/leads \
  -H "Content-Type: application/json" \
  -d '{"name":"TEST XOA SAU","phone":"0901000000","message":"kiem tra duong ong"}'
```

Đã chạy lệnh đầu: trả `400 {"message":"Tên không hợp lệ"}` — **route sống, validation đúng**. Lệnh thứ hai chưa chạy vì nó ghi vào database thật; bạn tự chạy rồi xoá dòng test.

**Bước 3 — Server Action của Next có tới được API không?** `submitLead` là `'use server'` nên chạy trên máy chủ Next, không đụng CORS. Rủi ro duy nhất: `NEXT_PUBLIC_API_URL` thiếu trên Vercel → rơi về `http://localhost:3000` → `fetch` fail → khách thấy *"Gửi không thành công"*. Kiểm tra biến này trong Vercel project `koileather`.

**Bước 4 — Submit thật trên trình duyệt**, mở tab Network, xem request `POST` tới `/lien-he/` trả 200 và giao diện đổi sang khối `lead-success`.

### 3.2 Hỏi những trường gì — 4 trường, không hơn

Với hàng thủ công giá cao, mỗi trường thêm vào là một cái cớ để khách bỏ dở. Nhưng hỏi quá ít thì nghệ nhân phải gọi lại để hỏi mọi thứ, và lead nguội. Điểm cân bằng: **hỏi đúng những gì quyết định được BÁO GIÁ, còn lại để Zalo.**

Ba câu quyết định báo giá: *làm món gì*, *ngân sách khoảng bao nhiêu*, *khi nào cần*. Cộng cách liên lạc.

| # | Trường | Kiểu | Bắt buộc | Nhãn (chữ đúng) |
|---|---|---|---|---|
| 1 | `wish` | select | Có | **Bạn muốn đặt làm gì?** |
| 2 | `budget` | select | Không | **Ngân sách bạn nghĩ tới** |
| 3 | `phone` | tel | Có | **Số điện thoại (Zalo)** |
| 4 | `name` | text | Có | **Shop gọi bạn là gì?** |

Cộng một `textarea` **không bắt buộc, đặt CUỐI**: `Mô tả thêm (nếu có)`.

Vì sao thứ tự này:

- **Trường dễ nhất và vui nhất đứng đầu.** `select` một cú bấm, không phải gõ. Bấm xong là đã "bắt đầu" — hiệu ứng cam kết dần khiến khách điền nốt. Đặt "Tên" đầu tiên như form hiện tại là bắt khách khai danh tính trước khi biết mình nhận được gì.
- **Ngân sách đứng thứ hai, và không bắt buộc.** Đứng sau "muốn gì" thì khách đã ở tâm thế mô tả nhu cầu nên trả lời tự nhiên. Bắt buộc thì mất khách. Dùng `select` khoảng giá chứ không phải ô số — chọn khoảng dễ hơn cam kết một con số, và số thật cũng chỉ chốt được ở Zalo.
- **Số điện thoại trước tên.** Số là thứ shop cần; tên chỉ để gọi cho lịch sự. Nếu khách bỏ dở ở trường cuối, ta vẫn còn số. Ghi rõ "(Zalo)" để khách hiểu vì sao cần số, và biết mình sẽ được nhắn chứ không bị gọi bất ngờ.
- **Mô tả thêm để cuối và không bắt buộc.** Textarea là trường đắt nhất về công sức. Khách nào muốn kể thì kể; ai không thì bấm gửi.

Giá trị cho `select` — lấy từ dữ liệu thật, gộp cho gọn:

`wish`: Ví da · Túi da · Dây lưng · Dây da đồng hồ · Card holder / Kẹp tiền · Bao da điện thoại / iPad · Charm, móc khoá, phụ kiện nhỏ · Quà tặng doanh nghiệp (nhiều sản phẩm) · Sửa chữa / spa đồ da · Khác — mình kể ở dưới

`budget` (thang bám theo trung vị thật, min 100.000 của `ban-rap-thiet-ke` tới max 79.000.000 của `signature-leather-goods`/`tui-da-cho-nu`): Dưới 1 triệu · 1 – 3 triệu · 3 – 5 triệu · 5 – 10 triệu · 10 – 30 triệu · Trên 30 triệu · Chưa rõ, nhờ shop tư vấn

**"Chưa rõ, nhờ shop tư vấn" là lựa chọn quan trọng nhất trong danh sách.** Không có nó, khách chưa biết giá sẽ bỏ trường trống hoặc bỏ luôn form.

**Không hỏi**: email (khách Việt mua đồ da không dùng email; cột `leads.email` cứ để trống), địa chỉ, giới tính, nguồn biết shop ("Bạn biết KOI từ đâu?" là câu hỏi cho ta, không cho khách — và `koi_page_views.source` đã trả lời rồi), kích thước/số đo (thuộc Zalo, sau khi đã có người thật nói chuyện).

### 3.3 Chữ trên nút gửi và thông báo

Nút gửi hiện là `Gửi thông tin` (`lead-form.tsx:14`). Đổi sang chữ nói cái khách nhận:

- `Nhận tư vấn từ nghệ nhân`
- `Gửi yêu cầu — shop liên hệ lại`
- `Nhờ shop tư vấn`

Thông báo thành công hiện là *"Đã nhận thông tin. Shop sẽ liên hệ lại trong thời gian sớm nhất."* — "thời gian sớm nhất" là hứa suông, và nó **chỉ đúng nếu đã làm mục 0.3**. Viết lại kèm đường thoát:

> Đã nhận yêu cầu của bạn. Nghệ nhân sẽ nhắn Zalo vào số **09xx xxx xxx** trong [NGƯỜI BÁN ĐIỀN: khung thời gian cam kết được].
> Cần gấp hơn? Nhắn thẳng Zalo tại đây → [nút Zalo]

Nút Zalo trong khối thành công là chi tiết đáng giá nhất của cả form: khách vừa thể hiện ý định mạnh nhất, đúng lúc để mời sang kênh chốt nhanh.

### 3.4 Làm form đáng tin hơn

Những gì đã tốt, giữ nguyên: honeypot `website` (`lead-form.tsx:24`), validate số Việt Nam hai lớp (client `actions.ts:22` + server `shop.controller.ts:166`), dòng cam kết không chia sẻ cho bên thứ ba, `useFormStatus` chặn bấm đôi, `autoComplete` đúng chuẩn (`name`/`tel`) để mobile tự điền.

Bảy việc cần thêm, xếp theo mức độ chặn đường:

1. **[Chặn đường] Sửa lỗi 0.4** — đổi `name="product_id"` thành `name="product_name"` với `value={productName}` trong `lead-form.tsx`. Không sửa thì mọi lead mất ngữ cảnh sản phẩm.

2. **[Chặn đường] Có nơi đọc lead và có thông báo.** Thêm `GET /shop/leads` (đặt dưới controller admin, KHÔNG dưới `/shop` — `auth.guard.ts:35` mở toàn bộ `/shop` cho khách vãng lai, để ở đó là phơi số điện thoại khách cho cả internet). Cụ thể: thêm vào `AnalyticsController` hoặc controller mới dưới tiền tố `/analytics`, vì `koi-domain-router` chỉ chuyển tiếp danh sách tiền tố cố định (ghi chú tại `Koi Backend\src\ads\ads.controller.ts`) — tiền tố mới là phải deploy thêm một repo. Kèm tab "Khách để lại thông tin" trong `Koi Backend\public\index.html`, đặt cạnh tab Quảng cáo, dùng lại nếp `adsLoaded` / lazy-load.

3. **[Chặn đường] Đặt form vào chỗ khách đến được.** Landing đặt riêng phải render `LeadForm`. Và trong khi chờ landing: thêm link `/lien-he/` vào footer.

4. **Ghi lại lead đến từ đâu.** Hiện `createLead` đóng cứng `source: "koifront"` (`shop-content.service.ts:199`) — mọi lead giống nhau, không biết trang nào đẻ ra. Truyền thêm đường dẫn trang và mã tư vấn (`koi_ad_token` trong localStorage) rồi ghép vào `message`, hoặc thêm cột. Có mã tư vấn trong lead là **nối được lead với `gclid`** → biết quảng cáo nào ra lead thật.

5. **Chặn spam theo tần suất.** Không có `ThrottlerModule` trong `Koi Backend\package.json`; `POST /shop/leads` mở hoàn toàn, chỉ có honeypot. Bot đọc HTML sẽ bỏ qua honeypot dễ dàng. Thêm giới hạn theo IP (ví dụ [NGƯỜI BÁN ĐIỀN: n] lần / 10 phút). Đây là việc cần làm **trước** khi form có traffic thật, không phải sau.

6. **Dấu hiệu tin cậy đặt quanh form, không đặt xa.** Ngay trên form: một dòng đếm được từ dữ liệu thật, ví dụ *"Xưởng đang có [số] mẫu đã làm, trên 22 loại da khác nhau"* (số sản phẩm lấy từ danh mục, 22 là số loại da thật). Ngay dưới form: ảnh thật của xưởng/nghệ nhân đang làm — không phải ảnh stock. Tuyệt đối không thêm huy hiệu giải thưởng, con số "10.000 khách hàng", "15 năm kinh nghiệm" nếu không có bằng chứng.

7. **Giữ lại cái khách đã gõ khi lỗi.** `useActionState` render lại form là **mất trắng** những gì đã điền, vì các input không có `defaultValue` từ state. Khách gõ xong, sai số điện thoại một ký tự, mất hết → thoát. Trả lại các giá trị đã nhập trong `LeadState` và bơm vào `defaultValue`.

### 3.5 Ràng buộc schema cần biết trước khi thiết kế form

Bảng `leads` (`Koi Backend\prisma\schema.prisma:33`) chỉ có: `name`, `phone`, `email`, `message`, `product_id`, `source`, `status`, `note`, `created_at`. **Không có cột cho ngân sách, món muốn đặt, mốc thời gian.**

Hai đường:

- **Nhanh, không migration**: ghép vào `message` theo khuôn cố định để sau này bóc lại được — `Món: Ví da | Ngân sách: 3-5 triệu | Mốc: [...] | Trang: /dat-lam-vi-da/ | Mã: K7F2QM | Ghi chú KH: ...`. `createLead` đã có nếp ghép chuỗi bằng `parts.join(" ")`, chỉ cần mở rộng.
- **Sạch, nên làm nếu đã chắc bộ trường**: thêm cột `wish`, `budget`, `deadline`, `landing_path`, `ad_token`. Có cột riêng thì mới thống kê được "ngân sách nào ra đơn nhiều nhất" mà không phải bóc chuỗi.

Khuyến nghị: chạy đường ghép chuỗi để mở form ra ngay, đo [NGƯỜI BÁN ĐIỀN: số] lead đầu tiên, rồi mới migration khi đã biết trường nào thật sự có người điền.

---

## 4. Những lo lắng phải trả lời, và đặt ở khối nào

Năm lo lắng bạn nêu đều đúng. Thứ tự dưới đây là thứ tự chúng nảy ra trong đầu khách, và **không phải cả năm đều nên nằm trong FAQ** — cái nào chặn đường sớm thì phải trả lời sớm, trước khi khách kịp bỏ đi.

### Bố cục landing với vị trí từng câu trả lời

| Khối | Tên khối | Trả lời lo lắng nào | Vì sao đặt ở đây |
|---|---|---|---|
| 1 | **Hero** — H1 + dòng phụ + CTA + dòng gỡ lo | *Có xem mẫu trước không* (một dòng: "Xem mẫu da thật trước khi làm") | Đây là lo lắng khiến khách rời ngay giây đầu. Phải chặn trước khi nó thành lý do thoát. |
| 2 | **Khoảng giá** | **Giá bao nhiêu** — đầy đủ | Câu hỏi số một. Đặt ở FAQ cuối trang là quá muộn: khách không cuộn tới, họ thoát ở giữa vì "chắc đắt". |
| 3 | **Chất liệu** (bảng 22 loại da + link bài viết) | *Giá bao nhiêu* (phần "vì sao chênh lệch") | Giải thích được chênh lệch giá thì con số ở khối 2 mới đáng tin thay vì trông như bịa. Đồng thời là khối SEO nặng nhất. |
| 4 | **Quy trình 4-5 bước** | **Làm bao lâu** + **Có xem mẫu trước không** + **Thanh toán thế nào** | Cả ba đều là câu hỏi "chuyện gì xảy ra sau khi tôi nhắn". Nhét chúng vào đúng bước tương ứng thì khách hiểu mà không phải đọc điều khoản. |
| 5 | **Tác phẩm đã làm** (ảnh thật, nối `/dau-an-rieng/` và `/lookbook/`) | *Không vừa ý thì sao* (gián tiếp: bằng chứng làm được) | Chứng cứ đặt sau lời hứa quy trình. |
| 6 | **FAQ** | **Không vừa ý thì sao** — đầy đủ, cộng các câu ngách | Đây là lo lắng cuối cùng, chỉ nảy ra khi khách đã gần quyết. Đặt sớm là gieo nghi ngờ không cần thiết. |
| 7 | **CTA cuối + form** | — | Chốt sau khi đã gỡ hết. |

### Nội dung từng câu trả lời

**Giá bao nhiêu (khối 2).** Nêu khoảng thật từ dữ liệu danh mục, cộng lời giải thích cái gì làm giá chênh. Ba yếu tố giải thích được bằng dữ liệu có thật: loại da (Epsom vs cá sấu vs đà điểu — có trong bảng chất liệu), độ phức tạp cấu trúc, và kỹ thuật thủ công đặc biệt (có sẵn 3 danh mục làm bằng chứng: `may-tram-chan` 10 SP, `an-lat-woven` 4 SP, `cham-khac-tren-da` 1 SP). Không đưa bảng giá chi tiết theo mẫu — sẽ sai và sẽ lỗi thời.

**Làm bao lâu (khối 4, bước cuối).** Ràng buộc bất di bất dịch: **không hứa nếu không có số.** Viết: *"Thời gian làm tuỳ độ phức tạp và loại da — nghệ nhân báo mốc cụ thể ngay khi chốt mẫu. [NGƯỜI BÁN ĐIỀN: khoảng thời gian trung bình cho từng nhóm sản phẩm, ví dụ: ví 2-3 tuần, túi 4-6 tuần]."* Có một mốc thật, dù rộng, vẫn tốt hơn im lặng: khách im lặng sẽ tự đoán con số tệ nhất.

**Không vừa ý thì sao (khối 6).** Đây là lo lắng đắt nhất với đơn 10-30 triệu, và là chỗ dễ hứa quá. Hai chính sách đã có trên site — `/chinh-sach-hoan-tien-doi-tra/` (1.923 ký tự) và `/chinh-sach-giao-hang/` (1.803 ký tự) — **đọc hai trang đó rồi mới viết câu trả lời**, không được viết mới rồi mâu thuẫn với trang chính sách. Cách trả lời an toàn nhất là mô tả *cơ chế phòng ngừa* thay vì hứa *đền bù*: chốt mẫu bằng ảnh/bản vẽ trước khi cắt da, gửi ảnh tiến độ giữa chặng, khách xác nhận từng mốc. Kèm: *"Chính sách đổi trả với hàng đặt riêng: [NGƯỜI BÁN ĐIỀN, phải khớp với /chinh-sach-hoan-tien-doi-tra/]."*

**Có xem mẫu trước không (khối 1 nhắc, khối 4 nói rõ).** Đây là **thế mạnh mạnh nhất mà site đang không dùng.** Xưởng có 22 loại da thật trong tay — đưa mẫu da cho khách xem là việc gần như miễn phí với xưởng nhưng gỡ được lo lắng lớn nhất của khách. Trả lời cụ thể: gửi ảnh/video mẫu da qua Zalo, và [NGƯỜI BÁN ĐIỀN: có nhận khách tới xưởng xem mẫu trực tiếp không? địa chỉ và giờ nếu có]. Nếu có xem trực tiếp, đưa nó lên hero — đối thủ bán online không có.

**Thanh toán thế nào (khối 4, bước 2-3).** Có `/huong-dan-thanh-toan/` nhưng chỉ 381 ký tự — gần như rỗng, cần viết lại. Nêu ba điều: cọc bao nhiêu phần trăm, trả nốt khi nào, hình thức nào nhận. Tất cả `[NGƯỜI BÁN ĐIỀN]`. Một dòng gỡ lo đáng thêm nếu đúng: *"Tư vấn và báo giá không mất phí — chỉ đặt cọc khi bạn đã chốt mẫu."*

**Bốn câu FAQ nữa nên có** (dựa trên nội dung đã tồn tại trên site, tức là chuyện khách hỏi thật):

- *Có làm quà tặng doanh nghiệp số lượng lớn không?* → có, nối `/san-xuat-qua-tang-doanh-nghiep-va-su-kien/` (32.619 ký tự, trang dài nhất site) và `/qua-tang-doanh-nghiep-va-su-kien/` (16.361)
- *Có khắc tên / dập logo được không?* → có, nối `/dau-an-rieng/` và các bài `khac-ten-len-vi-da`, `vi-nam-khac-ten-thu-cong`, `khac-chu-len-vi-da-ky-thuat-dap-nhiet-cao-cap`
- *Dùng hỏng thì sửa được không?* → nối `/sua-chua-do-da/` (21.463 ký tự)
- *Bảo quản thế nào?* → nối `cham-soc-bao-quan-do-da-dung-cach-html`, `cach-bao-quan-da-epsom-dung-cach-it-nguoi-biet`, `cach-bao-quan-da-togo`

FAQ nên đánh dấu `FAQPage` JSON-LD. Hiện toàn site chỉ có đúng một khối JSON-LD (`Product` ở `src\app\cua-hang\[slug]\page.tsx:60`) — không có `FAQPage`, không có `BreadcrumbList`, không có `Service`. Landing đặt riêng nên khai cả ba.

---

## 5. Đẩy khách sang Zalo mà không làm rỗng nội dung

Xung đột tưởng là có: nút Zalo mọi nơi thì trang thành trang đích quảng cáo, Google coi là mỏng. Thực tế hai thứ không đánh nhau nếu tách đúng vai.

### 5.1 Nội dung nuôi organic, nút chỉ đứng ở đường ranh giữa các khối

Google đọc chữ, không đọc nút. Trang có 1.500 từ nội dung thật cộng 5 nút vẫn là trang dày. Trang có 200 từ cộng 1 nút là trang mỏng. **Vấn đề không bao giờ là số nút, mà là lượng nội dung.**

Chỗ hay hỏng: đặt nút *bên trong* mạch đọc, cắt một khối văn thành hai nửa vụn. Đặt nút ở **đường ranh giữa hai khối** thì cả hai khối vẫn liền mạch.

### 5.2 Cùng một chữ vừa là nội dung vừa là chuyển đổi

Ba khối phục vụ cả hai mục tiêu, không phải chọn một:

- **Khối chất liệu**: khách cần để tự tin; Google đọc thấy 22 tên da cùng ngữ cảnh — đây là chữ mà đối thủ không có. Đồng thời hút link nội bộ từ 13+ bài về da đã tồn tại.
- **Khối quy trình**: khách cần để hết lo; Google đọc thấy quy trình dịch vụ, khớp truy vấn "đặt làm ... theo yêu cầu".
- **Khối FAQ**: khách cần để gỡ nốt; Google có thể lấy làm rich result nếu khai `FAQPage`.

Không cần khối nào chỉ để "nhồi chữ cho Google". Nếu một khối không giúp khách quyết, xoá nó — chữ vô dụng không xếp hạng, nó chỉ pha loãng.

### 5.3 Đường tự cắn từ khoá phải xử lý, không thì đẩy Zalo cũng vô nghĩa

Landing đặt riêng thêm vào giữa lúc đã có `/tui-da-nam/` (11.613 ký tự) + `/do-da-danh-cho-nam/` (11.393) + `/san-pham/tui-da-cho-nam/` là **thêm trang thứ tư cùng ý định**. Bốn trang chia nhau tín hiệu thì không trang nào lên được, và nút Zalo trên trang không xếp hạng thì không ai bấm.

Phân vai dứt điểm, mỗi ý định một trang duy nhất:

- `/san-pham/{slug}/` — **duyệt hàng có sẵn**. Giữ nguyên vai. H1 là tên danh mục, mô tả ngắn, lưới sản phẩm.
- **Landing đặt riêng** — **ý định dịch vụ** ("đặt làm ...", "theo yêu cầu"). Đây là trang mới.
- Trang tĩnh WordPress trùng ý định (`/tui-da-nam/`, `/tui-da-nu/`, `/do-da-danh-cho-nam/`, `/do-da-danh-cho-nu/`, `/day-da-dong-ho/`, `/phu-kien-bang-da/`) — **301 về landing đặt riêng tương ứng**, sau khi đã bốc phần nội dung dùng được sang landing.

Bảng `redirects` đang **0 dòng** (đã kiểm tra) và `next.config.ts` chỉ có 7 redirect (giỏ hàng, thanh toán, tài khoản, shop, blogs, tin tức). Chưa có chuyển hướng nào cho nhóm trùng chủ đề. `src\app\sitemap.ts:16` đã có sẵn `Set` tên `redirected` để loại slug đã 301 khỏi sitemap — **thêm redirect thì phải thêm slug vào Set này**, không thì sitemap vẫn khai báo trang đã chết.

Cảnh báo: `/day-da-dong-ho/` có 18.881 ký tự. Trang này có thể đang xếp hạng cho từ khoá giá trị. **Đừng 301 trước khi kiểm tra Google Search Console** xem nó có thứ hạng gì. Nếu đang có, đường an toàn là biến chính nó thành landing đặt riêng (giữ URL, viết lại nội dung, thêm CTA) thay vì 301 sang URL mới.

### 5.4 Rủi ro chưa kiểm chứng: tin nhắn soạn sẵn có thật sự điền sẵn?

Cả cơ chế "mã tư vấn" — và qua đó cả việc nối doanh số về Google Ads — đặt cược vào việc `https://zalo.me/0901678999?text=...` mở hộp thoại với tin nhắn đã điền. Số liệu không xác nhận điều đó: 40 cú bấm quảng cáo, 1 dòng `contactedAt`, 0 dòng `convertedAt`.

**Phải test bằng tay trước khi tin**, trên cả bốn tổ hợp: Android + app Zalo đã cài, Android chưa cài, iPhone + app đã cài, iPhone chưa cài.

Nếu `?text=` không được tôn trọng, phương án lui — làm được ngay và không phụ thuộc Zalo:

- Hiện mã tư vấn **trên trang**, ngay cạnh nút Zalo, kèm nút chép: *"Mã tư vấn của bạn: **K7F2QM** — gửi kèm giúp shop nhé [Chép mã]"*. Mã đã có trong `localStorage` (`koi_ad_token`) và `ContactLink` đã đọc được qua `useSyncExternalStore` — chỉ cần hiện nó ra thay vì chỉ nhét vào URL.
- Chỉ hiện khi có mã (khách đến từ quảng cáo). Khách vào thẳng không thấy gì, không rối.

### 5.5 Ba thứ không được làm

- **Popup che trang.** Ăn điểm Core Web Vitals (CLS + INP), và trên mobile — 64% khách — thường không đóng được. Thanh `ContactBar` dính đáy đã làm đúng việc mà không che nội dung.
- **Đẩy nội dung xuống dưới ba tầng CTA.** Nếu 60% khung nhìn đầu là nút, Google đọc ra ý đồ.
- **Chặn Zalo sau một bước.** Bắt điền form mới hiện số Zalo là mất phần lớn khách. Zalo phải mở ngay, không điều kiện.

---

## 6. Đo hiệu quả bằng hệ thống đang có

Hai bảng và một trang admin có thật: `koi_page_views` (path, referrer, source, device, visitorHash, createdAt), `koi_ad_clicks` (token, gclid, landingPath, channel, clickedAt, contactedAt, convertedAt, value, exportedAt), `/admin/traffic` (`analytics.summary` trả `totals`, `today`, `daily`, `hourly`, `topPages`, `sources`, `devices`).

### 6.1 Trước khi đo: hai cái bẫy trong số liệu hiện tại

**Bẫy 1 — Luôn đọc "khách riêng", đừng đọc "lượt xem".** `/dau-an-rieng/` có 50 lượt xem nhưng chỉ **5 khách riêng**. `/blog/` 21 lượt / 4 khách. `/cua-hang/day-lung-da-bo-khong-khoa-en-swift-nau-togo/` 12 lượt / **1 khách**. Nguồn `internal` 214 lượt / 13 khách. Số lượt xem đang bị chính người trong nhà (chủ shop, người sửa nội dung) làm phồng. `summary()` đã trả cả hai cột — **luôn nhìn cột `khach`**.

**Bẫy 2 — `ANALYTICS_SALT` chưa được đặt.** Không có biến này trong `Koi Backend\.env` lẫn `.env.local`. Theo `analytics.service.ts:14`, thiếu nó thì **muối sinh ngẫu nhiên mỗi lần khởi động**. Trên Vercel serverless, mỗi cold start là một muối mới → cùng một người ra nhiều `visitorHash` khác nhau → **"khách riêng" bị phồng, không biết phồng bao nhiêu**.

Phân bố xác nhận dấu hiệu này: 86/154 hash chỉ xuất hiện đúng 1 lần. Với site có menu và điều hướng nội bộ, tỷ lệ khách xem đúng 1 trang rồi đi mà cao như vậy là đáng ngờ.

**Việc phải làm trước mọi việc đo lường khác**: đặt `ANALYTICS_SALT` (chuỗi ngẫu nhiên ≥32 byte) trong Environment Variables của project `koi-leather-api` trên Vercel. Chưa làm thì mọi con số "khách riêng" — kể cả để so trước/sau — đều không so được với nhau.

### 6.2 Sáu chỉ số đo được ngay, không cần thêm gì

**1. Khách riêng vào landing, tách theo nguồn.** Đây là chỉ số SEO. Chạy được ngay:

```sql
SELECT source, COUNT(DISTINCT "visitorHash") AS khach
FROM koi_free_style.koi_page_views
WHERE path = '/dat-lam-vi-da-nam/'
  AND "createdAt" >= now() - interval '30 days'
GROUP BY 1 ORDER BY 2 DESC;
```

Chỉ theo dòng `source = 'google'`. Đó là organic thật, không lẫn khách bấm từ Facebook hay đi từ trang khác trong site.

**2. Landing có giữ được khách hay không** — so `khach` của landing với `khach` của `/cua-hang/` cùng khoảng thời gian. Landing kém hơn hẳn một trang danh mục trơ thì tiêu đề hoặc khung nhìn đầu sai.

**3. Tỷ lệ mobile của landing** (`device`). Toàn site đang 99 khách mobile / 54 desktop. Nếu landing lệch desktop nhiều so với tỷ lệ đó, gần như chắc chắn trải nghiệm mobile của nó đang hỏng.

**4. Cú bấm quảng cáo → hội thoại** (`koi_ad_clicks`, có sẵn trên `/admin/ads`, service đã đếm giúp ba con số `tongCong` / `daLienHe` / `daChot`). Mốc hiện tại để so: **40 / 1 / 0**. Chia theo `landingPath` để biết trang nào biến cú bấm thành hội thoại:

```sql
SELECT "landingPath",
       COUNT(*) AS bam,
       COUNT("contactedAt") AS ra_hoi_thoai,
       COUNT("convertedAt") AS chot
FROM koi_free_style.koi_ad_clicks
WHERE "clickedAt" >= now() - interval '90 days'
GROUP BY 1 ORDER BY 2 DESC;
```

Đây là **chỉ số tin cậy nhất trong toàn hệ thống**, vì nó đo hành động thật (bấm nút liên hệ) chứ không đo lượt xem.

**5. Kênh nào khách chọn** (`koi_ad_clicks.channel`) — zalo / messenger / phone. Quyết định trực tiếp việc nên cho nút nào to hơn ở mục 2.5.

**6. Số lead và nguồn lead.** Cần mục 0.3 (endpoint đọc + tab admin) trước. Mốc hiện tại: **0**.

### 6.3 Ba việc cần bổ sung, xếp theo tỷ lệ lợi ích trên công sức

**Việc 1 — Đặt `ANALYTICS_SALT` trên Vercel.** Công: một biến môi trường. Lợi: mọi con số khách riêng từ nay so sánh được. Đây là việc rẻ nhất và quan trọng nhất trong cả danh sách.

**Việc 2 — Khai `NEXT_PUBLIC_GOOGLE_ADS_ID` + `NEXT_PUBLIC_GA_ID` trên Vercel project `koileather`.** Công: hai biến, cộng ba biến nhãn chuyển đổi (`NEXT_PUBLIC_ADS_LABEL_ZALO`, `..._MESSENGER`, `..._PHONE`) lấy trong Google Ads. Lợi: mở lại toàn bộ đường đo `trackContactClick` đang chết (mục 0.5), và có GA4 để đọc những thứ `koi_page_views` không đo được (thời gian trên trang, độ sâu cuộn, luồng đi giữa các trang). Lưu ý cách viết trong `gtag.ts`: các nhãn phải viết thẳng từng biến, truy cập động cho ra `undefined` — mã đã làm đúng, chỉ cần khai biến.

**Việc 3 — Ghi nhận cú bấm liên hệ cho MỌI khách, không chỉ khách quảng cáo.** Đây là lỗ hổng lớn nhất còn lại trong hệ đo tự làm. `ghiNhanLienHe()` thoát ngay ở dòng đầu nếu không có token (`src\lib\gclid.ts`):

```ts
export function ghiNhanLienHe(channel: string, productName?: string): void {
  const token = docMa();
  if (!token) return;   // ← khách organic bấm Zalo: không ghi lại gì cả
```

Nghĩa là: **75 khách Google trong 2 ngày, có ai bấm Zalo hay không — hệ thống hoàn toàn không biết.** Cả câu hỏi trung tâm của bạn ("landing có khiến khách đặt riêng không") hiện không có cách nào trả lời cho khách organic, vì organic không có `gclid`.

Cách bổ sung, gọn nhất và không phải sửa router (`koi-domain-router` chỉ chuyển tiếp danh sách tiền tố cố định — phải nằm dưới `/shop`):

- Bảng mới `koi_contact_clicks`: `id`, `channel` (zalo/messenger/phone), `path` (trang lúc bấm), `source` (gom từ referrer như `analytics.service.ts` đang làm), `device`, `visitorHash` (dùng lại đúng hàm băm để nối được với `koi_page_views`), `adToken` (nullable — có thì nối được sang `koi_ad_clicks`), `createdAt`.
- Endpoint `POST /shop/contact-click`, nuốt lỗi im lặng, trả 204 — theo đúng nếp `POST /shop/track` và `POST /shop/ad-contact` đang có.
- Phía storefront: gọi trong `ContactLink.onClick`, dùng `navigator.sendBeacon` với `fetch` làm đường lui, y như `gui()` trong `track-page-view.tsx`.
- Trên `/admin/traffic`, thêm một cột vào bảng `topPages`: **"khách bấm liên hệ"**.

Có bảng đó thì đúng một truy vấn trả lời được câu hỏi trung tâm:

```sql
-- Tỷ lệ khách bấm liên hệ, theo trang, chỉ tính khách organic
SELECT v.path,
       COUNT(DISTINCT v."visitorHash") AS khach_google,
       COUNT(DISTINCT c."visitorHash") AS khach_bam_lien_he
FROM koi_free_style.koi_page_views v
LEFT JOIN koi_free_style.koi_contact_clicks c
       ON c."visitorHash" = v."visitorHash" AND c.path = v.path
WHERE v.source = 'google'
  AND v."createdAt" >= now() - interval '30 days'
GROUP BY 1
ORDER BY 2 DESC;
```

Cột thứ ba chia cột thứ hai chính là **tỷ lệ chuyển đổi organic của từng trang**. Đó là con số duy nhất nói được landing đặt riêng có làm đúng việc của nó hay không — và là con số dùng để xếp hạng landing nào viết tiếp, landing nào viết lại.

### 6.4 Bảng theo dõi để chạy hàng tuần

| Chỉ số | Nguồn | Mốc hiện tại | Đích |
|---|---|---|---|
| Khách Google riêng vào landing | `koi_page_views` (source='google') | landing chưa tồn tại | [NGƯỜI BÁN ĐIỀN] |
| Tỷ lệ mobile của landing | `koi_page_views.device` | toàn site 99/154 khách | không lệch quá xa mức site |
| Khách bấm liên hệ / khách vào landing | cần bảng ở việc 3 | **chưa đo được** | [NGƯỜI BÁN ĐIỀN] |
| Cú bấm quảng cáo → hội thoại | `koi_ad_clicks` | **40 → 1** | [NGƯỜI BÁN ĐIỀN] |
| Hội thoại → đơn chốt | `koi_ad_clicks.convertedAt` | **0** | [NGƯỜI BÁN ĐIỀN] |
| Lead từ form | `leads` | **0** | [NGƯỜI BÁN ĐIỀN] |
| Doanh số đã tải lên Google Ads | `koi_ad_clicks` (`exportedAt`) | **0đ** | [NGƯỜI BÁN ĐIỀN] |

Hai lưu ý về dữ liệu tự dọn: `koi_ad_clicks` xoá dòng **chưa chốt** sau 120 ngày (`HAN_DON_RAC_NGAY`), `koi_presence` sau 24 giờ. `koi_page_views` **không** có cơ chế dọn — sẽ phình dần, tính trước.

---

## Thứ tự thi hành

Trước khi viết một chữ nội dung nào:

1. Đặt `ANALYTICS_SALT` trên Vercel `koi-leather-api` — không có thì mọi phép so sánh về sau đều vô nghĩa (0.6.3, việc 1)
2. Sửa `name="product_id"` → `name="product_name"` trong `koi-storefront\src\components\lead-form.tsx` (0.4)
3. Thêm `GET` lead (dưới `/analytics`, **không** dưới `/shop`) + tab Leads ở `Koi Backend\public\index.html` + một kênh thông báo (0.3)
4. Test `zalo.me/...?text=` trên 4 tổ hợp thiết bị; nếu thất bại thì hiện mã tư vấn trên trang (5.4)
5. Khai `NEXT_PUBLIC_GOOGLE_ADS_ID` / `NEXT_PUBLIC_GA_ID` + 3 nhãn chuyển đổi trên Vercel `koileather` (0.5)
6. Đọc Google Search Console cho 6 trang tĩnh trùng chủ đề **trước khi** quyết 301 hay giữ URL (5.3)

Sau đó mới dựng landing đầu tiên. Chọn `/qua-tang-doanh-nghiep-cuoi-nam/` hoặc nhóm ví/túi nam làm bản thí điểm: nhóm quà tặng đang nhận 14/40 cú bấm quảng cáo và 13 khách Google riêng, tức đã có traffic thật để đo trước/sau ngay trong tuần đầu — không phải chờ Google lập chỉ mục trang mới.

Việc thêm bảng `koi_contact_clicks` (6.3, việc 3) nên làm **song song với landing đầu tiên**, không để sau: không có nó thì landing lên sóng mà không ai biết nó có tạo ra hội thoại nào hay không.