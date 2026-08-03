# PHẦN 3B — Đường chuyển đổi & việc người bán phải điền
URL: `/dat-lam-that-lung-theo-yeu-cau-koi-leather/` (loại A, giữ nguyên đường dẫn)

---

## 15. Đường chuyển đổi

Một hành động duy nhất: **nhắn Zalo**. Năm điểm chạm. Mọi nút dùng `<ContactLink>`, không viết `a href="https://zalo.me/..."` bằng tay. Không đặt CTA giữa khối chất liệu (khối 5) — khách đang đọc để học.

### 15.1 Năm điểm chạm

**Điểm 1 — Hero (khối 1)**
- Nút chính: **Nhắn Zalo gửi số đo, nhận báo giá**
- Dòng gỡ lo: *Chưa biết số đo cũng nhắn được — shop chỉ bạn cách đo bằng sợi dây cũ.*
- Nút phụ (cuộn xuống khối 3, không phải CTA liên hệ): **Xem khoảng giá trước**

**Điểm 2 — ngay sau khối 3 (KHOẢNG GIÁ)**
- Nút: **Nhắn Zalo hỏi giá đúng cho cỡ của bạn**
- Dòng gỡ lo: *Nhắn để hỏi thôi cũng được — chưa cần quyết gì.*

**Điểm 3 — ngay sau khối 4 (QUY TRÌNH, sau bước hướng dẫn tự đo)**
- Nút: **Gửi số đo cho nghệ nhân kiểm lại**
- Dòng gỡ lo: *Tin nhắn đã soạn sẵn, bạn chỉ cần bấm gửi. Đo lệch một chút shop vẫn sửa được trước khi cắt.*
- Đây là điểm chạm mạnh nhất của landing này: cụm thắt lưng có ba bài về cắt sai cỡ, nên nỗi lo "đo sai mất tiền" chính là lúc khách chịu nhắn.

**Điểm 4 — ngay sau khối 10 (FAQ)**
- Nút: **Bắt đầu đặt riêng dây lưng của bạn**
- Dòng gỡ lo: *Không cần cọc để được tư vấn.*

**Điểm 5 — `ContactBar` dính đáy**
- Render đúng một lần ở cuối trang: `<ContactBar productName="đặt làm thắt lưng da theo yêu cầu" />`
- ĐÃ CÓ SẴN. Không dựng thanh liên hệ riêng — sẽ thành hai thanh chồng nhau.
- Điện thoại: thanh ngang 3 ô dính đáy (Gọi · Zalo · Messenger). Máy tính: cột dọc mép phải.
- `main` đã có `pb-16 md:pb-0` → **CTA cuối (khối 11) phải cách đáy trang > 64px**, nếu không bị thanh đáy che trên mobile.

### 15.2 Tin nhắn Zalo soạn sẵn

`zaloLink()` trong `src/lib/contact.ts` tự sinh chuỗi `"Chào shop, mình quan tâm sản phẩm: {productName} ({productUrl})"` cộng dòng `"(Mã tư vấn: ...)"` nếu khách đến từ quảng cáo. Việc cần làm chỉ là truyền đúng `productName`:

| Điểm chạm | `productName` truyền vào |
|---|---|
| Hero | `đặt làm thắt lưng da theo yêu cầu` |
| Sau khối GIÁ | `đặt làm thắt lưng da theo yêu cầu — hỏi giá theo cỡ` |
| Sau khối QUY TRÌNH | `đặt làm thắt lưng da theo số đo — gửi số đo` |
| Sau FAQ | `đặt làm thắt lưng da theo yêu cầu` |
| `ContactBar` | `đặt làm thắt lưng da theo yêu cầu` |

Nếu trong khối chất liệu hoặc khối khoá có nút riêng cho da đặc biệt / khoá đặt riêng, dùng `đặt làm thắt lưng da cá sấu theo yêu cầu` và `đặt làm khoá thắt lưng riêng`. Danh mục `phu-kien-rieng-customize-hardware` (11 SP, 1,8 – 9,5 – 28,0 triệu) là đòn bẩy giá lớn hơn cả dây da trung vị 4,5 triệu, nên nó xứng đáng có một điểm chạm riêng — nhưng đặt ở khối 8 (cam kết) hoặc khối 7 (lưới), **không** chen vào khối 5.

Ba nút gọi/Zalo/Messenger đều đi qua `ContactLink`, nó tự gọi `trackContactClick()` và `ghiNhanLienHe()`. Lưu ý mục 3.5 và 3.9 BRIEF: `trackContactClick()` hiện thoát ngay vì thiếu `NEXT_PUBLIC_GOOGLE_ADS_ID`/`NEXT_PUBLIC_GA_ID`, và cơ chế điền sẵn tin nhắn Zalo **chưa được test tay**. Landing lên sóng mà chưa xử hai việc này thì mọi cú bấm ở năm điểm chạm trên đều không được ghi nhận.

### 15.3 Form (khối 11) — 4 trường + 1 textarea

**LeadForm hiện chỉ có 3 trường (name, phone, message) cộng bẫy spam. Form 4 trường dưới đây là việc CẦN THÊM, chưa tồn tại.** Ngoài ra `lead-form.tsx:24` đang render `name="product_id"` trong khi `actions.ts:19` đọc `product_name` → tên sản phẩm luôn rỗng; phải sửa cùng lúc, nếu không lead từ landing này không phân biệt được với lead từ chỗ khác.

Thứ tự trường bắt buộc theo mục 4 BRIEF (món trước, số điện thoại trước tên):

1. `wish` — select, **bắt buộc** — nhãn "Bạn muốn đặt làm gì?"
   - Thắt lưng nam theo số đo
   - Thắt lưng nữ theo số đo
   - Thắt lưng da cá sấu
   - Chỉ đặt khoá riêng (dùng dây có sẵn)
   - Cắt/định vị lỗ lại cho dây đang dùng
   - Chưa rõ, nhờ shop tư vấn
2. `budget` — select, **không bắt buộc** — nhãn "Ngân sách bạn nghĩ tới"
   - Dưới 4 triệu
   - 4 – 6 triệu
   - 6 – 10 triệu
   - Trên 10 triệu
   - Chưa rõ, nhờ shop tư vấn
   *(Các bậc này bám giá thật: nam 3,5 – 22,0 triệu, phần lớn quanh 4,5 triệu; nữ 3,9 – 25,0 triệu, phần lớn quanh 4,2 triệu.)*
3. `phone` — tel, **bắt buộc** — nhãn "Số điện thoại (Zalo)"
4. `name` — text, **bắt buộc** — nhãn "Shop gọi bạn là gì?"
5. `message` — textarea, không bắt buộc — nhãn "Mô tả thêm (nếu có)", gợi ý trong placeholder: *cỡ bụng đo được, màu da muốn, kiểu khoá.*

Không hỏi email / địa chỉ / giới tính / "bạn biết KOI từ đâu". Không hỏi số đo bằng trường riêng — số đo thuộc cuộc trò chuyện Zalo, hỏi trong form sẽ làm khách bỏ dở.

Nút gửi: **Để lại số, shop gọi lại**. Dòng dưới nút: *Shop nhắn Zalo lại trước, không gọi bất ngờ.* — [NGƯỜI BÁN ĐIỀN: xác nhận có đúng vậy không, và thời gian phản hồi Zalo]

**Khuôn ghép vào cột `message`.** Bảng `leads` KHÔNG có cột riêng cho ngân sách / món / mốc thời gian / trang / mã quảng cáo — mọi thứ đó phải nối chuỗi vào `message` trước khi POST:

```
Món: {wish} | Ngân sách: {budget hoặc "không chọn"} | Mốc: {mốc hoặc "không nêu"} | Trang: /dat-lam-that-lung-theo-yeu-cau-koi-leather/ | Mã: {koi_ad_token trong localStorage hoặc "không có"} | Ghi chú KH: {textarea}
```

Giữ đúng thứ tự và đúng dấu `|` để sau này tách lại được bằng split. `Trang:` phải là đường dẫn thật của landing, không phải tiêu đề. `Mã:` đọc từ `localStorage` khoá `koi_ad_token`.

Và nhắc lại mục 3.2 BRIEF: hiện **không ai đọc được lead** — chỉ có `POST /shop/leads`, không có `GET`, không có tab Leads, không có email/webhook. Thêm `GET` **dưới `/analytics`**, không dưới `/shop` (`auth.guard.ts:35` mở toàn bộ `/shop` cho khách vãng lai → để ở đó là phơi số điện thoại khách ra internet). Chưa làm việc này thì form chỉ là cái hố.

---

## 16. Người bán phải điền

Mọi số dưới đây xưởng chưa công bố ở đâu. Chừng nào chưa có câu trả lời, trên trang phải là `[NGƯỜI BÁN ĐIỀN: ...]`, không được đoán.

### 16.0 CHỐT TRƯỚC MỌI THỨ — năm thành lập
Site đang tự mâu thuẫn ba chỗ: `/koi-leather-nha-san-xuat.../` nói **2017**; `/sua-chua-do-da/` nói **"hơn 10 năm"**; `/nha-san-xuat-do-da-thu-cong/` nói **"hơn 7 năm"**. 2017 → 2026 là 9 năm.
1. Năm thành lập chính thức là năm nào?
2. Sau khi chốt, ai sửa hai trang còn lại, khi nào? (Landing không được nhân bản mâu thuẫn này.)

### 16.1 Thời gian & tiền
3. Thời gian làm một sợi thắt lưng da bò theo số đo, tính từ lúc chốt mẫu?
4. Thời gian làm thắt lưng da cá sấu / da đặc biệt (chắc dài hơn — dài hơn bao nhiêu)?
5. Thời gian làm riêng phần khoá đặt riêng, nếu khách chỉ đặt khoá?
6. Có gói làm nhanh không? Phụ phí bao nhiêu?
7. Cọc bao nhiêu phần trăm? Cọc rồi có hoàn không, trong trường hợp nào?
8. Nhận những hình thức thanh toán nào? Có xuất hoá đơn không?
9. Phí ship trong TP.HCM và đi tỉnh? Có phí đo tại nhà / tại công ty không?

### 16.2 Bảo hành & đổi trả
10. Phạm vi bảo hành một sợi thắt lưng: bao lâu, gồm những gì (chỉ, khoá, mép da, bong da)?
11. Thanh header đang hứa **"Bảo dưỡng trọn đời"** mà không có trang nào định nghĩa — cụ thể là gì, gồm việc gì, miễn phí hay có phí?
12. Đục thêm lỗ / cắt ngắn lại sau khi khách sụt cân — miễn phí trọn đời hay có phí? (Đây là câu quyết định sức thuyết phục của cả landing, vì lợi thế bán chính là số đo.)
13. **Cắt sai cỡ do xưởng đo/cắt lệch thì xử lý thế nào** — làm lại, đổi dây, hay hoàn tiền?
14. Cắt sai do khách gửi sai số đo thì sao? Có được cắt lại một lần không?
15. Hàng đặt riêng có được đổi trả không? Câu trả lời phải khớp `/chinh-sach-hoan-tien-doi-tra/` (đang chỉ 1.943 ký tự) — trang đó có cần sửa cho khớp không?
16. Khách sửa dây đang dùng (không phải hàng KOI) thì có bảo hành gì không?

### 16.3 Xưởng & nghệ nhân
17. Tên và vai trò thật của nghệ nhân đứng tên khối 9 — ai làm khoá, ai làm dây, ai định vị lỗ?
18. Người đó làm nghề bao nhiêu năm? (Chỉ dùng nếu có bằng chứng.)
19. Địa chỉ xưởng có đúng là "Số 2/16 Nguyễn Bặc, Tân Sơn Hòa, TP. HCM" không, hay xưởng và cửa hàng là hai chỗ?
20. Giờ mở cửa từng ngày trong tuần? Toạ độ để khai `LocalBusiness`?
21. Khách tới xem da trực tiếp có cần hẹn trước không?
22. Có ảnh quy trình thật, thấy bàn tay, cho các bước: chọn da · cắt dây · vắt mép/đánh mép · định vị lỗ · lắp khoá? (Cần 4+ ảnh; hiện chưa xác nhận có.)
23. Cho phép nêu tên khách/doanh nghiệp nào trong case study khối 12?

### 16.4 Khoá & khắc
24. Khoá đặt riêng (`phu-kien-rieng-customize-hardware`, 11 SP, 1,8 – 9,5 – 28,0 triệu): làm bằng chất liệu gì, mạ gì, có làm khuôn riêng theo logo khách không?
25. Bao lâu để làm một bộ khoá riêng, và tối thiểu bao nhiêu bộ?
26. Kỹ thuật khắc tên trên dây: dập nhiệt, khắc laser, hay dập chìm? Giới hạn số ký tự?
27. Khắc tên rồi thì còn được đổi/trả không?

### 16.5 B2B
28. MOQ cho đơn thắt lưng quà tặng doanh nghiệp là bao nhiêu sợi?
29. Các bậc giá theo số lượng?
30. Thời gian làm cho đơn số lượng lớn?
31. Có làm hộp/túi đóng gói riêng theo thương hiệu khách không, phụ phí bao nhiêu?

### 16.6 Da đặc biệt & giấy tờ
32. Da cá sấu dùng cho thắt lưng lấy từ nguồn nào, có **giấy tờ CITES** không? Khách có được nhận bản sao?
33. Có làm da kỳ đà / trăn cho thắt lưng không? Giấy tờ tương tự?
34. Gửi hàng da cá sấu ra nước ngoài được không? (Nếu không, phải nói thẳng.)
35. Danh sách loại da thực sự làm được thành thắt lưng — trong 22 loại da của xưởng, loại nào KHÔNG dùng cho dây lưng (da quá mềm)? Cần cho khối 5 và cho câu hạn chế thật thà ở khối 6.

### 16.7 Hai bài vướng thương hiệu — người bán tự quyết
36. `/dat-lam-day-lung-hermes/` (7.730 ký tự) và `/dat-lam-day-lung-khoa-chu-h/` (4.269 ký tự) đang mô tả **sản phẩm thay thế mang tên hãng khác** — mức rủi ro khác hẳn với dịch vụ sửa/thay. Landing này không nhắm từ khoá đó và không link nổi bật tới chúng. Người bán quyết: viết lại bỏ tên hãng, để nguyên, hay bỏ hẳn?
37. Nếu bỏ, có 301 về landing này không? **Chỉ quyết sau khi đọc Google Search Console** (16 tháng dữ liệu) — bảng đo nội bộ mới sống 1,5 ngày, "0 organic" ở đó là CHƯA ĐO, không phải trang chết.
38. Cùng lúc: mô tả danh mục `day-lung-cho-nu` đang dài 954 ký tự (gấp ~5 lần mọi danh mục khác) → `/san-pham/day-lung-cho-nu/` đang tự ngả sang vai "văn dài" và cạnh tranh trực tiếp với landing này. Có đồng ý rút mô tả đó về đúng vai duyệt hàng không?
