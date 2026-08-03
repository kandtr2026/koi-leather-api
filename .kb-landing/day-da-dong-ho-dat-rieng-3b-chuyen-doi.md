# /day-da-dong-ho/ — PHẦN 3B: đường chuyển đổi & việc người bán phải điền

Landing: `/day-da-dong-ho/` (trang tĩnh đang tồn tại, giữ nguyên URL).
Khối 1–6 ở phần 1, khối 7–12 ở phần 2, liên kết + JSON-LD ở phần 3a.

---

## 15. Đường chuyển đổi

Một hành động duy nhất: **nhắn Zalo**. Form chỉ là đường phụ cho người không muốn chat.
Năm điểm chạm, không thêm điểm thứ sáu, không popup.

### 15.1 Năm điểm chạm

| # | Vị trí | Chữ trên nút | Dòng gỡ lo ngay dưới nút | Component |
|---|---|---|---|---|
| 1 | Hero (khối 1) | **Gửi ảnh đồng hồ, nhận tư vấn dây** | Nhắn để hỏi thôi cũng được — chưa cần quyết gì. | `ContactLink kind="zalo"` |
| 2 | Ngay sau khối GIÁ (khối 3) | **Hỏi giá cho mẫu đồng hồ của bạn** | Tin nhắn đã soạn sẵn, bạn chỉ cần bấm gửi. | `ContactLink kind="zalo"` |
| 3 | Ngay sau khối QUY TRÌNH (khối 4) | **Xem mẫu da thật qua Zalo** | Không cần cọc để được tư vấn. | `ContactLink kind="zalo"` |
| 4 | Ngay sau FAQ (khối 10) | **Bắt đầu đặt dây riêng** | Chưa biết cỡ dây cũng nhắn được — shop chỉ cách đo. | `ContactLink kind="zalo"` |
| 5 | Dính đáy / mép phải toàn trang | (Gọi · Zalo · Messenger — nút do component tự dựng) | — | `ContactBar` |

Ghi chú dựng:

- Điểm 5 render **đúng một lần** ở cuối trang: `<ContactBar productName="đặt làm dây da đồng hồ theo yêu cầu" />`. Không dựng thanh liên hệ nào khác — sẽ thành hai thanh chồng nhau.
- Điểm 1–4 dùng `ContactLink`, giao diện do `className` nơi gọi quyết định. Không viết `<a href="https://zalo.me/...">` bằng tay ở bất kỳ đâu trên trang.
- **Không** đặt CTA trong khối 5 (bảng chất liệu) và khối 6 (thông số): khách đang đọc để học, chen nút vào là cắt mạch. Vì vậy thứ tự 3-4-5 là bắt buộc — ba điểm chạm 1/2/3 phải nằm trước khối chất liệu.
- CTA cuối (khối 11) **không** được đặt trong 64px cuối trang: `main` đã có `pb-16 md:pb-0`, thanh đáy sẽ che. Chèn một khối đệm hoặc để khối 12 (case study + bài liên quan) nằm dưới.
- Nút phụ cạnh form: chữ **Để lại số, shop gọi lại**. Tránh: "Liên hệ ngay", "Tìm hiểu thêm", "Xem chi tiết", "Đăng ký", "Submit", "Gửi".

### 15.2 Chuỗi `productName` truyền vào ContactLink

`zaloLink()` trong `src/lib/contact.ts` đã tự sinh tin nhắn
`Chào shop, mình quan tâm sản phẩm: {productName} ({productUrl})` cộng dòng
`(Mã tư vấn: ...)` nếu khách đến từ quảng cáo. Việc của người dựng chỉ là truyền đúng chuỗi:

| Điểm chạm | `productName` |
|---|---|
| 1 — Hero | `đặt làm dây da đồng hồ theo yêu cầu` |
| 2 — sau khối GIÁ | `hỏi giá dây da đồng hồ đặt riêng` |
| 3 — sau khối QUY TRÌNH | `xem mẫu da làm dây đồng hồ` |
| 4 — sau FAQ | `đặt làm dây da đồng hồ theo số đo` |
| 5 — ContactBar | `đặt làm dây da đồng hồ theo yêu cầu` |

Chuỗi viết thường, không dấu chấm cuối, vì nó nằm giữa câu tin nhắn.
Không nối thêm URL — `zaloLink()` tự chèn `productUrl`.

⚠ Trước khi xuất bản phải test tay tin nhắn soạn sẵn trên 4 tổ hợp
(Android/iPhone × đã cài/chưa cài app Zalo). Nếu tin nhắn không điền được, hiện mã tư vấn
trên trang kèm nút chép. Đây là điều kiện chặn, không phải việc làm sau.

### 15.3 Form ở khối 11 — 4 trường + 1 textarea

**LeadForm hiện chỉ có 3 trường (`name`, `phone`, `message`) cộng bẫy spam. Form dưới đây
là việc CẦN THÊM, chưa tồn tại.** Đừng viết nội dung landing như thể form đã có.

Thứ tự trường không được đảo (câu dễ trước, số điện thoại sau):

1. `wish` — select, **bắt buộc**. Nhãn: "Bạn muốn đặt làm gì?"
   - `Dây da đồng hồ theo số đo`
   - `Dây da cá sấu / da đặc biệt`
   - `Đổi dây cho đồng hồ có ngàm lạ (không rời)`
   - `Sửa / thay con đĩa, khoá dây cũ`
   - `Hộp đựng đồng hồ`
   - `Chưa rõ, nhờ shop tư vấn`
2. `budget` — select, **không bắt buộc**. Nhãn: "Ngân sách bạn nghĩ tới"
   - `Dưới 2 triệu`
   - `2 – 3 triệu`
   - `3 – 5 triệu`
   - `Trên 5 triệu`
   - `Chưa rõ, nhờ shop tư vấn` ← bắt buộc phải có mục này
3. `phone` — tel, **bắt buộc**. Nhãn: "Số điện thoại (Zalo)"
4. `name` — text, **bắt buộc**. Nhãn: "Shop gọi bạn là gì?"
5. `message` — textarea, không bắt buộc. Nhãn: "Mô tả thêm (nếu có)".
   Placeholder: "Hãng và mẫu đồng hồ, cỡ ngàm nếu biết, màu da bạn thích."

Không hỏi email, địa chỉ, giới tính, "bạn biết KOI từ đâu", số đo cổ tay.
Bậc ngân sách trên bám khoảng giá thật của danh mục `day-da-dong-ho`
(1,4 – 2,2 – 7,4 triệu) và `watch-case` (3,8 triệu) — nếu người bán muốn đổi bậc thì đổi cả
ở khối 3 để hai chỗ không lệch nhau.

**Khuôn ghép vào cột `message`.** Bảng `leads` **không có cột riêng** cho món / ngân sách /
mốc thời gian / trang / mã quảng cáo, nên mọi thứ đó phải nối chuỗi vào `message` theo đúng
một khuôn cố định, thứ tự không đổi (để sau này còn tách lại được bằng máy):

```
Món: {wish} | Ngân sách: {budget hoặc "không chọn"} | Mốc: {mốc hoặc "không nêu"} | Trang: /day-da-dong-ho/ | Mã: {koi_ad_token hoặc "không có"} | Ghi chú KH: {nội dung textarea hoặc "trống"}
```

Trường nào khách bỏ trống vẫn phải in ra với giá trị mặc định, không được bỏ nhãn — mất
nhãn là mất khả năng tách chuỗi. `Mã` lấy từ `localStorage` khoá `koi_ad_token`.

Hai lỗi chặn phải sửa trước khi form này có nghĩa (chi tiết ở mục 3 BRIEF):
`lead-form.tsx` đang render `name="product_id"` nhưng `actions.ts` đọc `product_name` nên
tên sản phẩm **luôn rỗng**; và chưa có `GET` lead nào — không ai đọc được lead gửi về.
Form đẹp mà không ai đọc thì vẫn là 0 lead.

---

## 16. Người bán phải điền

Mọi mục dưới đây hiện **không có số**. Cấm đoán, cấm mượn số của trang khác. Chỗ nào chưa
có câu trả lời thì giữ đúng chữ `[NGƯỜI BÁN ĐIỀN: ...]` trên bản nháp.

### 16.0 Chốt trước tiên — năm thành lập đang tự mâu thuẫn ba chỗ

1. **Năm thành lập chính thức là năm nào?** Site đang nói ba số khác nhau:
   `/koi-leather-nha-san-xuat-do-da-thu-cong-cao-cap-tai-viet-nam/` ghi **2017**;
   `/sua-chua-do-da/` ghi **"hơn 10 năm"**; `/nha-san-xuat-do-da-thu-cong/` ghi
   **"hơn 7 năm"**. 2017 đến 2026 là 9 năm. Landing này tuyệt đối không được nhân bản mâu
   thuẫn đó — phải chốt một số, rồi sửa lại ba trang kia cho khớp.

### 16.1 Thời gian & tiền

2. Thời gian làm một dây da đồng hồ theo số đo, tính từ lúc chốt mẫu (bao nhiêu ngày làm việc)?
3. Thời gian làm dây da cá sấu / da đặc biệt — có dài hơn dây da bò không, dài hơn bao nhiêu?
4. Thời gian làm hộp đựng đồng hồ (`watch-case`)?
5. Có làm gấp không? Phụ phí làm gấp bao nhiêu, gấp nhất được mấy ngày?
6. Cọc bao nhiêu phần trăm, và với đơn giá trị bao nhiêu thì mới cần cọc?
7. Cọc có được hoàn khi khách đổi ý trước lúc cắt da không?
8. Phụ phí phát sinh nào khách hay gặp mà chưa nêu trên trang (khắc tên, đổi chỉ, làm ngàm riêng, gia công con đĩa)?
9. Phí gửi hàng đi tỉnh và ai trả — có khác gì `/chinh-sach-giao-hang/` đang ghi không?
10. Nhận những hình thức thanh toán nào?
11. Thời gian phản hồi Zalo trong giờ làm việc (để viết đúng một câu, không hứa "phản hồi ngay")?

### 16.2 Bảo hành & đổi trả

12. Bảo hành dây đặt riêng gồm những gì, trong bao lâu? Có tính đường chỉ và cạnh da không?
13. **"Bảo dưỡng trọn đời"** đang hứa trên thanh header nghĩa là gì cụ thể — làm những việc gì, miễn phí phần nào, có giới hạn số lần không? Hiện không có trang nào định nghĩa.
14. Hàng đặt riêng có được đổi/trả không? Nếu có thì điều kiện gì? Câu trả lời phải khớp `/chinh-sach-hoan-tien-doi-tra/` (đang chỉ có 1.943 ký tự) — nếu lệch thì phải sửa trang chính sách, không phải sửa landing.
15. Nếu dây làm ra không vừa cỡ ngàm hoặc không vừa cổ tay, xưởng xử lý thế nào và ai chịu phí?
16. Sửa lại dây do khách đổi ý về màu/kiểu sau khi đã cắt da: có nhận không, tính phí thế nào?
17. Dây da cá sấu / da đặc biệt có bị loại khỏi chính sách đổi trả không?

### 16.3 Xưởng & nghệ nhân

18. Tên và vai trò thật của nghệ nhân đứng làm dây đồng hồ (khối 9 cần tên người, không cần ảnh chân dung nếu họ không muốn).
19. Người đó có được nêu tên công khai trên web không?
20. Giờ mở cửa của xưởng ở "Số 2/16 Nguyễn Bặc, Tân Sơn Hòa, TP. HCM" và toạ độ chính xác.
21. Khách có ghé xem trực tiếp được không, có cần hẹn trước không?
22. Có bao nhiêu người trực tiếp làm dây (số thật, dùng để nói về năng lực, không để làm số PR)?
23. Máy / kỹ thuật riêng nào dùng cho dây đồng hồ mà khách nên biết (khâu tay chỉ nào, đánh cạnh, làm ngàm cong)?

### 16.4 Giấy tờ da đặc biệt

24. Có giấy CITES cho da cá sấu không? Ai cấp, khách có được xem bản sao không?
25. Kỳ đà / trăn có làm không, giấy tờ thế nào?
26. Da cá sấu dùng làm dây là phần nào (bụng, gù, đuôi) và giá chênh nhau ra sao?
27. Khách gửi da tự có tới nhờ gia công thì có nhận không, điều kiện gì?
28. Khách mang đồng hồ tới có được giữ lại đồng hồ hay chỉ cần gửi số đo ngàm?

### 16.5 Khắc tên & B2B

29. Khắc tên/chữ trên dây làm bằng kỹ thuật gì, giới hạn bao nhiêu ký tự?
30. Phông chữ nào có sẵn, khắc được cả mặt trong dây không?
31. Có nhận đơn số lượng cho doanh nghiệp không? MOQ tối thiểu bao nhiêu dây?
32. Bậc giá theo số lượng (nếu có) — mốc nào bắt đầu giảm?
33. Đơn số lượng thời gian làm là bao lâu, và có xuất hoá đơn không?

### 16.6 Nội dung cũ trên URL này — cần một quyết định, không phải một con số

34. `/day-da-dong-ho/` đang có **43.526 ký tự** nội dung cũ, dài nhất site. Người bán cần
    duyệt: phần nào giữ (đoạn nói về chất liệu, cách chọn dây — gộp vào khối 5), phần nào bỏ
    (đoạn trùng với 25 bài `thay-day-da-dong-ho-{hãng}`, đoạn liệt kê tên hãng). Không xoá
    trắng rồi viết lại từ đầu — URL này là tài sản organic chưa đo được, `koi_page_views`
    mới sống 1,5 ngày nên "0 organic" là **chưa đo**, không phải trang chết. Phải mở Google
    Search Console (16 tháng dữ liệu) trước khi đổi title.

---

**Tổng: 34 câu người bán phải trả lời.** Chưa trả lời hết vẫn xuất bản được, nhưng mọi chỗ
thiếu phải để nguyên `[NGƯỜI BÁN ĐIỀN: ...]` — thà trống còn hơn bịa, vì đúng cái "một câu
nói thật về hạn chế" là chỗ đối thủ đang thua.
