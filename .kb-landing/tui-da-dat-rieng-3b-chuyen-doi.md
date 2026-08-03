# tui-da-dat-rieng — PHẦN 3B: đường chuyển đổi & việc người bán phải điền

URL: `/dich-vu-lam-tui-da-theo-yeu-cau/` (giữ nguyên, viết lại tại chỗ)

---

## 15. Đường chuyển đổi

Một hành động duy nhất: **nhắn Zalo**. Năm điểm chạm. Không popup, không chặn số sau form.

### 15.1 Năm điểm chạm

**Điểm 1 — Hero (khối 1)**

Nút chính, `<ContactLink kind="zalo" productName="đặt làm túi da theo yêu cầu" className="..." />`

> Chữ nút: **Xem mẫu da thật qua Zalo**
> Dòng gỡ lo dưới nút: *Nhắn để hỏi thôi cũng được — chưa cần quyết gì.*

**Điểm 2 — ngay sau khối KHOẢNG GIÁ (khối 3)**

Khách vừa đọc con số túi nữ 3,8 – 79,0 triệu / túi nam 6,9 – 39,0 triệu. Đây là lúc câu
hỏi trong đầu họ là "cái tôi muốn nằm ở đâu trong khoảng đó".

> Chữ nút: **Gửi ảnh mẫu, nhận khoảng giá riêng**
> Dòng gỡ lo: *Không cần cọc để được tư vấn.*

**Điểm 3 — ngay sau khối QUY TRÌNH (khối 4)**

> Chữ nút: **Đặt lịch xem da tại xưởng**
> Dòng gỡ lo: *Xưởng ở Số 2/16 Nguyễn Bặc, Tân Sơn Hòa, TP. HCM — nhắn trước để có người
> mở tủ da.*
> Nút phụ dạng chữ, `kind="phone"`: **Gọi 0901 678 999** (hiện qua `prettyPhone()`).

**Điểm 4 — ngay sau FAQ (khối 10)**

> Chữ nút: **Kể ý tưởng của bạn**
> Dòng gỡ lo: *Tin nhắn đã soạn sẵn, bạn chỉ cần bấm gửi.*

**Điểm 5 — `ContactBar` dính đáy**

`<ContactBar productName="đặt làm túi da theo yêu cầu" />` — render **đúng một lần** ở
cuối trang. Không dựng thanh liên hệ nào khác.

**KHÔNG đặt CTA giữa khối chất liệu (khối 5)** — khách đang đọc để học, chen nút là cắt
mạch. Và khối 11 (CTA cuối + form) không được nằm trong 64px cuối trang: `main` có
`pb-16 md:pb-0`, thanh đáy sẽ che.

### 15.2 Tin nhắn Zalo soạn sẵn

Không tự nối chuỗi, không viết `zalo.me/...` bằng tay. `zaloLink()` trong
`src/lib/contact.ts` đã sinh sẵn phần *"Chào shop, mình quan tâm sản phẩm: {productName}
({productUrl})"* cộng dòng *"(Mã tư vấn: ...)"* khi khách đến từ quảng cáo.

Việc duy nhất phải làm ở landing này là chọn chuỗi `productName` truyền vào:

| Điểm chạm | `productName` truyền vào |
|---|---|
| Hero, ContactBar | `đặt làm túi da theo yêu cầu` |
| Sau khối GIÁ | `đặt làm túi da theo yêu cầu — hỏi khoảng giá` |
| Sau khối QUY TRÌNH | `đặt làm túi da theo yêu cầu — xem da tại xưởng` |
| Sau FAQ | `đặt làm túi da theo yêu cầu` |
| Lưới sản phẩm (khối 7) | tên sản phẩm thật của thẻ đó, do `ProductCard` lo |

Giữ nguyên tiếng Việt có dấu — `zaloLink()` tự `encodeURIComponent`.

> ⚠ Lỗi 3.9 BRIEF: **chưa có bằng chứng** Zalo điền sẵn được tin nhắn. Phải test tay 4 tổ
> hợp (Android/iPhone × đã cài/chưa cài app) trước khi tin vào cơ chế mã tư vấn. Nếu
> thất bại: hiện mã tư vấn ra trang kèm nút chép (mã có trong `localStorage`, khoá
> `koi_ad_token`).

> ⚠ Lỗi 3.5 BRIEF: `NEXT_PUBLIC_GOOGLE_ADS_ID` và `NEXT_PUBLIC_GA_ID` chưa khai trên
> Vercel → `trackContactClick()` thoát ở `if (!window.gtag) return`. Mọi cú bấm ở năm
> điểm chạm trên **hiện không được ghi nhận**. Khai biến trước khi đo bất cứ thứ gì.

### 15.3 Form — 4 trường + 1 textarea

> ⚠ **`LeadForm` hiện chỉ có 3 trường** (name, phone, message) cộng bẫy spam. Form dưới
> đây là **việc CẦN THÊM**, chưa tồn tại. Đừng viết nội dung landing như thể đã có.

Thứ tự bắt buộc — món trước, tiền sau, số điện thoại rồi mới tên:

**1. `wish` — select, bắt buộc** — "Bạn muốn đặt làm gì?"
- Túi nữ đặt riêng
- Túi nam / cặp da đặt riêng
- Clutch nam
- Làm lại theo mẫu túi tôi đang có
- Túi da số lượng cho doanh nghiệp
- Món khác (mô tả bên dưới)

**2. `budget` — select, KHÔNG bắt buộc** — "Ngân sách bạn nghĩ tới"
- Chưa rõ, nhờ shop tư vấn ← **phải có, đặt đầu tiên, làm giá trị mặc định**
- Dưới 8 triệu
- 8 – 15 triệu
- 15 – 30 triệu
- Trên 30 triệu

Bậc này dựng theo số thật mục 1 BRIEF: túi nữ trung vị 11,5 triệu, túi nam trung vị
16,0 triệu — hai mốc đó nằm giữa hai bậc giữa, không nằm ở rìa.

**3. `phone` — tel, bắt buộc** — "Số điện thoại (Zalo)"

**4. `name` — text, bắt buộc** — "Shop gọi bạn là gì?"

**5. `message` — textarea, không bắt buộc** — "Mô tả thêm (nếu có)"

Không hỏi email, địa chỉ, giới tính, "bạn biết KOI từ đâu", số đo.

Chữ nút gửi: **Để lại số, shop gọi lại**. Dòng dưới nút: *Không cần cọc để được tư vấn.*

### 15.4 Khuôn ghép vào cột `message`

Bảng `leads` **không có cột riêng** cho ngân sách / món / mốc thời gian. Mọi thứ đó phải
nối chuỗi vào `message` theo khuôn cố định, một dòng, phân tách bằng ` | `:

```
Món: {wish} | Ngân sách: {budget hoặc "không chọn"} | Mốc: {deadline hoặc "không nêu"} | Trang: /dich-vu-lam-tui-da-theo-yeu-cau/ | Mã: {koi_ad_token hoặc "-"} | Ghi chú KH: {textarea}
```

Quy tắc: **luôn ghi đủ 6 nhãn**, kể cả khi rỗng — điền `"không chọn"` / `"không nêu"` /
`"-"`. Có vậy mới đọc được lead bằng mắt và tách được bằng chuỗi sau này.

Landing này không có trường `deadline` riêng (5 trường là đủ, thêm nữa là rơi tỷ lệ điền)
→ `Mốc:` lấy từ textarea nếu khách tự nói, không thì `"không nêu"`.

> ⚠ **Lỗi 3.1 BRIEF chồng lên đúng chỗ này.** `lead-form.tsx:24` render
> `name="product_id"`, nhưng `actions.ts:19` đọc `formData.get('product_name')` → **luôn
> rỗng**. Nếu chỉ thêm 2 trường mà không đổi thành `name="product_name"` với
> `value={productName}`, lead từ landing giá trị cao nhất site vẫn về **không có nguồn**.
> Và vì bảng `leads` hiện rỗng, mọi lead đầu tiên đều trông "bình thường" — sẽ không ai
> phát hiện ra sai.

Ba việc chặn khác phải xong trước khi tin vào form (mục 3 BRIEF):
- **3.2** — chưa có `GET` lead, chưa có tab Leads, chưa có thông báo. Thêm `GET` dưới
  `/analytics`, **KHÔNG** dưới `/shop` (`auth.guard.ts:35` mở toàn bộ `/shop` cho khách
  vãng lai → để ở đó là phơi số điện thoại khách ra internet).
- **3.6** — `ANALYTICS_SALT` chưa đặt, "khách riêng" đang bị phồng. Đặt trước mọi phép đo.
- **3.8** — chưa có bảng `koi_contact_clicks`, nên không biết trong 6 khách Google vào
  URL này có ai bấm Zalo hay không.

Mốc so trước/sau cho landing này: **6 khách Google riêng trong 1,5 ngày**; toàn site
**40 cú bấm quảng cáo → 1 hội thoại → 0 đơn chốt**; **0 lead** trong bảng `leads`.

---

## 16. Người bán phải điền

19 câu. Không câu nào được đoán hộ.

### 16.0 Chốt trước tiên — năm thành lập đang tự mâu thuẫn ba chỗ

1. **[NGƯỜI BÁN ĐIỀN: năm thành lập chính thức của KOI Leather]**
   Site đang nói ba số khác nhau: `/koi-leather-nha-san-xuat-do-da-thu-cong-cao-cap-tai-viet-nam/`
   ghi **2017**; `/sua-chua-do-da/` ghi **"hơn 10 năm"**; `/nha-san-xuat-do-da-thu-cong/`
   ghi **"hơn 7 năm"**. 2017 → 2026 là 9 năm, không khớp cái nào. **Chưa có câu trả lời
   thì landing không được nhắc tới năm hay số năm kinh nghiệm** — nhân bản mâu thuẫn này
   ra trang đang có organic là tự hại. Đây là đúng lỗi khiến cả ba đối thủ mất điểm
   (mục 5 BRIEF); chốt một số là thắng miễn phí.

### 16.1 Thời gian & tiền

2. **[NGƯỜI BÁN ĐIỀN: thời gian làm một túi nữ đặt riêng, tính từ khi chốt mẫu]**
3. **[NGƯỜI BÁN ĐIỀN: thời gian làm một túi nam / cặp da đặt riêng]** — nêu riêng, vì kho
   mẫu nam mỏng hơn nên khả năng phải làm rập mới cao hơn.
4. **[NGƯỜI BÁN ĐIỀN: có làm gấp không, phụ phí bao nhiêu]**
5. **[NGƯỜI BÁN ĐIỀN: % cọc khi đặt riêng, và cọc có hoàn không]**
6. **[NGƯỜI BÁN ĐIỀN: các hình thức thanh toán nhận]** — `/huong-dan-thanh-toan/` chỉ có
   383 ký tự, gần như rỗng.
7. **[NGƯỜI BÁN ĐIỀN: có tính phí làm rập riêng không, bao nhiêu]** — mục 1 BRIEF cho
   thấy danh mục `ban-rap-thiet-ke` có **9 SP, giá 0,1 triệu**, đang bị ẩn khỏi lưới chung
   (`shop.service.ts:152`). Nếu 0,1 triệu chính là phí rập, câu này trả lời được bằng số
   thật thay vì để trống — chỉ cần người bán xác nhận.
8. **[NGƯỜI BÁN ĐIỀN: chi phí phát sinh khi khách sửa mẫu sau lúc đã chốt rập]**
9. **[NGƯỜI BÁN ĐIỀN: phí ship, có giao tận nơi ngoài TP. HCM không]** —
   `/chinh-sach-giao-hang/` chỉ 1.809 ký tự.

### 16.2 Bảo hành & đổi trả

10. **[NGƯỜI BÁN ĐIỀN: "Bảo dưỡng trọn đời" ở thanh header nghĩa là gì cụ thể]** — hiện
    không có trang nào định nghĩa. Gồm những gì, miễn phí phần nào, thu phí phần nào.
11. **[NGƯỜI BÁN ĐIỀN: bảo hành túi đặt riêng — thời hạn, và những gì KHÔNG được bảo hành]**
12. **[NGƯỜI BÁN ĐIỀN: hàng đặt riêng có được đổi/trả không]** — phải khớp với
    `/chinh-sach-hoan-tien-doi-tra/` (1.943 ký tự). Nếu chính sách hiện tại không nói tới
    hàng đặt riêng thì phải bổ sung ở đó **trước**, rồi landing mới trích lại.
13. **[NGƯỜI BÁN ĐIỀN: khách không vừa ý ở buổi thử mẫu thì xử lý thế nào]** — đây là lo
    lắng "không vừa ý thì sao" mà khối 10 phải trả lời đầy đủ.

### 16.3 Xưởng & nghệ nhân

14. **[NGƯỜI BÁN ĐIỀN: tên và vai trò của nghệ nhân được nêu ở khối 9]** — cần tên thật,
    không phải "đội ngũ nghệ nhân giàu kinh nghiệm". 0/3 đối thủ có thứ này.
15. **[NGƯỜI BÁN ĐIỀN: giờ mở cửa xưởng + có cần hẹn trước không]** — địa chỉ đã có
    (Số 2/16 Nguyễn Bặc, Tân Sơn Hòa, TP. HCM), giờ thì chưa.
16. **[NGƯỜI BÁN ĐIỀN: thời gian phản hồi Zalo trong giờ làm việc]** — cần số này mới
    dám viết dòng gỡ lo dạng "shop nhắn lại trong ...".
17. **[NGƯỜI BÁN ĐIỀN: khách tới xưởng xem được bao nhiêu mẫu túi thật]** — dữ liệu cho
    thấy kho mẫu túi nam chỉ **14 SP** so với **49 SP** túi nữ; câu hạn chế thật thà ở
    khối 6 dựa vào đây, nhưng cần người bán xác nhận số mẫu thực đang có mặt tại xưởng.

### 16.4 B2B

18. **[NGƯỜI BÁN ĐIỀN: MOQ và bậc giá cho đơn túi da doanh nghiệp]** — cần vì select
    `wish` có mục "Túi da số lượng cho doanh nghiệp", mà cụm B2B là cụm bài lớn nhất site
    và `/qua-tang-doanh-nghiep-cuoi-nam/` đang là trang hút organic mạnh thứ hai. Không
    có MOQ thì lead B2B vào rồi tắc.

### 16.5 Giấy tờ da đặc biệt

19. **[NGƯỜI BÁN ĐIỀN: giấy tờ CITES cho da cá sấu / kỳ đà / trăn — có cấp cho khách
    không, dạng gì]** — túi là món hay dùng da đặc biệt nhất, và mức giá cao nhất danh
    mục (79,0 triệu) gần chắc thuộc nhóm này. Khách mua tầm giá đó sẽ hỏi. Cũng là điều
    kiện nếu khách mang túi ra nước ngoài.

---

**Cấm trong lúc chờ**: không hứa nếu không có số. Không "hơn 10.000 khách hàng", không
"15 năm kinh nghiệm", không huy hiệu giải thưởng, không `aggregateRating`. Chỗ nào chưa
có câu trả lời thì để nguyên nhãn `[NGƯỜI BÁN ĐIỀN: ...]` — thà trống còn hơn bịa, vì
đây là landing của danh mục giá trị cao nhất site.
