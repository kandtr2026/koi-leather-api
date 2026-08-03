# Landing "Làm ví da theo yêu cầu" — PHẦN 1 (khối 0–6)

Mã: `vi-da-dat-rieng` · thứ tự 4 · loại A (URL đang có organic, viết lại tại chỗ)

---

## 0. Thẻ meta và phân vai

**URL** `/lam-vi-da-theo-yeu-cau/` — GIỮ NGUYÊN. Không tạo URL mới, không 301.

**H1** Làm ví da theo yêu cầu — chọn da, chọn khoá, khắc tên tại xưởng ở TP.HCM

**Title** (58 ký tự) `Đặt làm ví da theo yêu cầu, khắc tên — KOI Leather`

**Meta description** (152 ký tự) `Đặt ví da thủ công theo ý bạn: chọn da, số ngăn, khắc tên. Ví nam 3,3–11,8 triệu, ví nữ 1,8–28 triệu. Nhắn Zalo xem mẫu da thật trước khi quyết.`

**Từ khoá đích**: làm ví da theo yêu cầu · đặt ví da khắc tên · ví da thủ công đặt riêng · ví da cá sấu đặt làm. ★ Chưa có công cụ đo volume (BRIEF mục 5) — thứ tự ưu tiên trên đây là phỏng đoán từ dữ liệu organic nội bộ, không phải số liệu tìm kiếm.

### Bảng phân vai (chống tự cắn từ khoá)

| | Landing này `/lam-vi-da-theo-yeu-cau/` | `/san-pham/vi-da-cho-nam/` và `/san-pham/vi-da-cho-nu/` | Bài `/khac-ten-len-vi-da/` |
|---|---|---|---|
| Vai | Ý định **đặt riêng**: chưa có mẫu nào vừa ý, muốn tự quyết da/khoá/ngăn | Duyệt **hàng có sẵn** | Ý định hẹp: **khắc tên** lên ví |
| H1 | Làm ví da theo yêu cầu… | Tên danh mục thuần (Ví da cho nam / Ví da cho nữ) | Khắc tên lên ví da |
| Title | có động từ *đặt làm* | không động từ, chỉ tên danh mục + chất liệu | có *khắc tên* |
| Từ khoá | làm ví da theo yêu cầu, ví da thủ công đặt riêng | ví da nam da thật, ví da nữ handmade | khắc tên lên ví da, ví da khắc tên |
| Nội dung | quy trình, khoảng giá, chất liệu, cam kết, form đặt riêng | mô tả ngắn + lưới sản phẩm, **không viết văn dài** | chỉ nói kỹ thuật khắc, phông chữ, giới hạn ký tự |
| Link chéo | trỏ xuống 2 danh mục ví + trỏ sang bài khắc tên | trỏ ngược lên landing bằng một dòng "không tìm thấy mẫu vừa ý? đặt riêng" | trỏ về landing ở phần "muốn đổi cả kiểu ví, không chỉ khắc tên" |

Nhóm bài khắc tên đang có sẵn (`vi-da-khac-ten`, `vi-nam-khac-ten-thu-cong`, `khac-chu-len-vi-da-ky-thuat-dap-nhiet-cao-cap`, `dich-vu-khac-ten-len-san-pham-khac-ten-theo-yeu-cau`, `vi-khac-ten-cao-cap-qua-tang-da-that-thu-cong-tai-tp-hcm`) **giữ nguyên vai chuyên sâu về khắc**. Landing tuyệt đối không viết lại kỹ thuật khắc thành một mục dài — chỉ nhắc một câu rồi link ra.

### URL này đang có nội dung cũ (8.028 ký tự)

- **Giữ**: mọi đoạn nói về công đoạn thủ công, khâu tay, mô tả chất liệu — nếu có, biên tập lại giọng, không xoá ý.
- **Bỏ**: mọi câu tự khen chung chung không kiểm chứng được, mọi mốc năm kinh nghiệm (BRIEF 3.12: ba trang đang nói ba số khác nhau), mọi lời hứa bảo hành/thời gian làm không có số.
- **CẢNH BÁO**: đây là URL loại A đang hút organic trong cụm. **Phải đọc Google Search Console (16 tháng) trước khi đổi title/H1** — bảng `koi_page_views` chỉ sống 1,5 ngày nên "0 organic" là *chưa đo*, không phải trang chết. Nếu Search Console cho thấy title cũ đang có impression cho một truy vấn nào đó, giữ cụm từ đó lại trong title mới.

---

## 1. Hero

**Nội dung thật**

# Làm ví da theo yêu cầu — chọn da, chọn khoá, khắc tên tại xưởng ở TP.HCM

Bạn nói kiểu ví bạn cần, chúng tôi cắt tấm da riêng cho nó. Từ số ngăn thẻ, màu chỉ, cho tới cái tên khắc ở góc trong.

[ Xem mẫu da thật qua Zalo ]

Nhắn để hỏi thôi cũng được — chưa cần quyết gì.

**Ảnh cần** — MỘT ảnh, ảnh LCP duy nhất trên khung nhìn đầu: bàn làm việc nhìn từ trên, một chiếc ví đang khâu dở kẹp trên pony, kim và chỉ lệch nhau, vài tấm da mẫu xếp bên cạnh. Chú thích: "Ví da hai gấp đang khâu tay tại xưởng, đường chỉ chưa ép nóng."

**Ghi chú dựng** — Nút chính dùng `<ContactLink kind="zalo" productName="đặt làm ví da theo yêu cầu" className="..." />`. Không viết `a href="https://zalo.me/..."` bằng tay; `zaloLink()` tự soạn tin nhắn và tự nối mã tư vấn. Đây là điểm chạm CTA số 1/5.

---

## 2. Mở đầu

**Nội dung thật**

Có hai kiểu khách tìm tới xưởng. Kiểu thứ nhất đã xem hết mẫu có sẵn mà vẫn thiếu một thứ: ví đẹp nhưng ít hơn hai ngăn thẻ so với nhu cầu, hoặc màu chuẩn nhưng khoá không phải kiểu mình thích. Kiểu thứ hai đến để tặng — và muốn trên món quà có tên người nhận, không phải tên thương hiệu.

Cả hai việc đó chúng tôi làm được, vì ví ở đây không đi qua khuôn đúc. Mỗi chiếc được rập trên giấy trước, cắt từ tấm da bạn tự chọn, khâu tay bằng chỉ lanh, rồi đánh cạnh và ép nóng. Nghĩa là đổi số ngăn, đổi bố cục, đổi màu chỉ đều là đổi bản rập — không phải chờ một dây chuyền nào cả.

Đổi lại, việc này chậm hơn mua hàng sẵn, và có những thứ chúng tôi không nhận: xem khối 6.

**Ảnh cần** — Không ảnh. Giữ đúng một ảnh trên khung nhìn đầu.

**Ghi chú dựng** — Chữ thuần, không CTA. Câu "xem khối 6" khi dựng đổi thành anchor link nội trang tới mục hạn chế.

---

## 3. Khoảng giá

**Nội dung thật**

### Ví đặt riêng ở đây nằm trong khoảng nào

**Ví nam**: 3,3 – 11,8 triệu. Phần lớn khách chốt quanh **4,8 triệu**.
**Ví nữ**: 1,8 – 28,0 triệu. Phần lớn khách chốt quanh **6,8 triệu**.
**Kẹp tiền (money clip)**: 1,2 – 3,8 triệu, phần lớn quanh 1,4 triệu.
**Ví zip mini**: 2,2 – 2,9 triệu.

Số này là khoảng giá thật của những chiếc ví đang bán trên web, không phải giá khuyến mại.

Vì sao chênh tới mấy lần? Bốn thứ quyết định:

1. **Loại da.** Da bò thuộc thảo mộc hoặc da dê là chân giá dưới. Da cá sấu, da đà điểu đẩy giá lên đỉnh khoảng — vì giá tấm da nguyên liệu đã khác nhau nhiều lần, và một chiếc ví cá sấu phải cắt chọn vùng vảy đều nhau, phần da còn lại không dùng được cho món khác.
2. **Khoá và phụ kiện.** Ví trơn khâu tay rẻ hơn ví có khoá zip, khoá gài hay bọ kim loại. Phụ kiện đặt riêng theo mẫu của bạn là một hạng mục tính thêm.
3. **Kích cỡ và số ngăn.** Mỗi ngăn thẻ là thêm một lớp da vát mỏng và thêm một đường khâu. Ví long wallet dài ăn da gần gấp đôi ví hai gấp.
4. **Mức thủ công.** Khâu tay toàn bộ, đánh cạnh nhiều nước, trám chần hoặc đan lát ở mặt ngoài — đều là giờ người, và là phần đắt nhất trong một chiếc ví.

Khắc tên: kỹ thuật và giới hạn số ký tự xem `[NGƯỜI BÁN ĐIỀN: kỹ thuật khắc dùng cho ví — dập nóng hay khắc laser, giới hạn số ký tự, phông chữ có sẵn, phụ phí nếu có]`.

[ Nhắn Zalo để nghệ nhân báo giá theo ý bạn ]
Không cần cọc để được tư vấn.

**Ảnh cần** — Ba chiếc ví đặt cạnh nhau cùng khung: một da bò trơn, một da dê, một da cá sấu. Chú thích: "Cùng bản rập ví hai gấp, ba loại da khác nhau — đây là phần lớn khoảng chênh giá."

**Ghi chú dựng** — CTA điểm chạm 2/5, dùng `ContactLink kind="zalo"` với cùng `productName`. Bốn lý do chênh giá nên dựng dạng danh sách có số, không phải bảng — mobile chiếm 64% khách.

---

## 4. Quy trình

**Nội dung thật**

### Từ lúc bạn nhắn tới lúc cầm ví

**Bước 1 — Bạn kể ví bạn đang dùng thiếu gì.** Việc của bạn: chụp chiếc ví hiện tại, hoặc gửi ảnh mẫu bạn thích, và nói rõ mỗi ngày bạn cắm mấy thẻ, có gập tiền giấy hay không. Không cần biết tên loại da. Thời gian: `[NGƯỜI BÁN ĐIỀN]`.

**Bước 2 — Chọn da.** Việc của bạn: chọn giữa các tấm da xưởng đang có. Chúng tôi chụp trực tiếp tấm da thật dưới ánh sáng ban ngày và gửi qua Zalo — ảnh chụp lại trên máy khách vẫn lệch màu, nên nếu bạn ở TP.HCM, ghé xưởng xem tận tay là chắc nhất. Thời gian: `[NGƯỜI BÁN ĐIỀN]`.

**Bước 3 — Chốt bản rập và bố cục.** Việc của bạn: xác nhận số ngăn thẻ, vị trí ngăn tiền, màu chỉ, và nội dung khắc tên nếu có. **Đây là bước cuối cùng còn sửa được miễn phí** — sau khi cắt da thì đổi bố cục là làm lại từ đầu. Đọc lại nội dung khắc thật kỹ ở bước này. Thời gian: `[NGƯỜI BÁN ĐIỀN]`.

**Bước 4 — Đặt cọc và vào xưởng.** Việc của bạn: chuyển cọc `[NGƯỜI BÁN ĐIỀN: % cọc]`. Sau đó cắt da, vát mỏng, dán biên, khâu tay, đánh cạnh. Thời gian làm: `[NGƯỜI BÁN ĐIỀN: thời gian làm ví nam / ví nữ / ví cá sấu]`.

**Bước 5 — Bạn nghiệm thu.** Việc của bạn: xem ảnh thành phẩm chúng tôi gửi trước khi giao, soi đúng ba chỗ — chính tả tên khắc, số ngăn thẻ, và độ đều của đường chỉ ở góc. Sai ở ba chỗ này là lỗi của xưởng và xưởng sửa. Thời gian: `[NGƯỜI BÁN ĐIỀN]`.

[ Bắt đầu đặt riêng ]
Tin nhắn đã soạn sẵn, bạn chỉ cần bấm gửi.

**Ảnh cần** — Bốn ảnh, mỗi ảnh có bàn tay thật trong khung: (1) tay lật hai tấm da cạnh nhau — "Chọn da ở bước 2"; (2) bản rập giấy và dao trên tấm da — "Rập trước, cắt sau"; (3) tay khâu kim lệch trên pony — "Khâu tay bằng chỉ lanh"; (4) tay đánh cạnh bằng con lăn — "Đánh cạnh, công đoạn tốn giờ nhất".

**Ghi chú dựng** — CTA điểm chạm 3/5 sau bước 5, `ContactLink kind="zalo"`. Năm bước dựng dạng danh sách dọc có số lớn, không dùng lưới ngang (mobile).

---

## 5. Bảng chất liệu

**Nội dung thật**

### Da nào cho ví nào

Mỗi tên da dưới đây có một bài riêng giải thích kỹ hơn — bấm vào nếu bạn muốn hiểu trước khi chọn.

| Loại da | Phù hợp với ví thế nào | Đọc thêm |
|---|---|---|
| **Da Togo** | Da bò dập vân hạt nổi, mềm, vân che vết xước nhỏ — ví dùng hằng ngày, hay nhét túi sau. | [Da Togo](/da-togo/) · [Da Togo có bền không](/da-togo-co-ben-khong/) · [Cách bảo quản da Togo](/cach-bao-quan-da-togo/) |
| **Da Epsom** | Vân dập chìm, mặt da cứng và giữ nếp — ví muốn góc cạnh sắc, chữ khắc nổi rõ. | [Da Epsom là gì](/da-epsom-la-gi/) · [Da Epsom có bền không](/da-epsom-co-ben-khong/) · [Bảo quản da Epsom](/cach-bao-quan-da-epsom-dung-cach-it-nguoi-biet/) |
| **Togo hay Epsom?** | Câu hỏi hay gặp nhất khi chọn da cho ví. | [Da Togo và da Epsom](/da-togo-va-da-epsom/) · [Da Togo vs da Clemence](/da-togo-vs-da-clemence/) |
| **Da cá sấu** | Vảy bụng đều, đắt nhất trong bảng, thường dùng cho ví quà tặng hoặc ví nữ cỡ dài. | [Da cá sấu thật](/da-ca-sau-that/) · [Ví da cá sấu cao cấp](/vi-da-ca-sau-cao-cap/) · [Đặt làm ví da cá sấu](/dat-lam-vi-da-ca-sau/) |
| **Da đà điểu** | Nốt chân lông nổi đặc trưng, nhẹ và dai. | [Da đà điểu](/da-da-dieu/) · [Da cá sấu và da đà điểu](/da-ca-sau-va-da-da-dieu/) |
| **Da dê Alran** | Da dê Pháp, mặt vân nhỏ mịn, rất hay dùng làm **lớp lót** ví vì mỏng mà bền. | [Da dê Alran](/da-de-alran/) · [Da dê thuộc](/da-de-thuoc/) |
| **Da dê / da cừu / da bò** | So sánh ba nhóm phổ thông trước khi quyết. | [So sánh da cừu và da dê](/so-sanh-da-cuu-va-da-de/) · [Da dê và da bò nên chọn chất liệu nào](/da-de-va-da-bo-nen-chon-chat-lieu-nao/) |

Chưa biết bắt đầu từ đâu thì đọc [hướng dẫn chọn ví da handmade cho nam giới](/huong-dan-cach-lua-chon-vi-da-handmade-cuc-xin-cho-nam-gioi/) và [kiến thức cần biết khi chọn đồ da thủ công](/kien-thuc-can-biet-khi-chon-do-da-thu-cong/).

Với ví cá sấu, giấy tờ nguồn gốc là chuyện phải hỏi trước khi đặt: `[NGƯỜI BÁN ĐIỀN: giấy tờ CITES cho da cá sấu — có xuất kèm không, thủ tục khi khách mang ra nước ngoài]`.

**Ảnh cần** — Một ảnh: sáu ô da xếp thành lưới, chụp nghiêng lấy ánh sáng tạt để thấy vân nổi. Chú thích: "Vân da nhìn rõ nhất dưới ánh sáng tạt ngang — ảnh chụp thẳng thường làm mất vân."

**Ghi chú dựng** — **Không đặt CTA trong khối này** (BRIEF mục 4: khách đang đọc để học, chen nút vào là cắt mạch). Bảng dùng cấu trúc cuộn ngang trên mobile hoặc gập thành thẻ dọc. Mọi link trong bảng là slug bài có thật; kiểm lại từng cái trước khi lên sóng.

---

## 6. Thông số + một câu hạn chế thật thà

**Nội dung thật**

### Thông số

- **Khâu**: khâu tay, chỉ lanh. Kiểu mũi và số mũi/inch: `[NGƯỜI BÁN ĐIỀN]`
- **Cạnh**: đánh cạnh nhiều nước rồi ép nóng. Số nước: `[NGƯỜI BÁN ĐIỀN]`
- **Lót**: da thật (thường là [da dê](/da-de-thuoc/)), không dùng lót vải hay giả da
- **Số ngăn thẻ**: theo yêu cầu. Giới hạn tối đa theo từng bản rập: `[NGƯỜI BÁN ĐIỀN]`
- **Khắc tên**: `[NGƯỜI BÁN ĐIỀN: kỹ thuật, giới hạn ký tự, phông]`
- **Xưởng**: Số 2/16 Nguyễn Bặc, Tân Sơn Hòa, TP. HCM — xem tận tay được, giờ mở cửa `[NGƯỜI BÁN ĐIỀN]`
- **Sửa về sau**: xưởng có [dịch vụ sửa chữa ví da](/dich-vu-sua-chua-vi-da-cao-cap/) cho ví đã dùng lâu. Phạm vi bảo hành cho ví đặt riêng: `[NGƯỜI BÁN ĐIỀN]`

### Một câu nói thật

Chúng tôi không nhận sao lại ví của thương hiệu khác — kể cả khi bạn đưa ảnh và chấp nhận trả thêm; nếu bạn cần đúng chiếc ví đó thì mua chính hãng sẽ đúng hơn, còn ở đây chúng tôi chỉ làm ví theo bố cục của bạn.

**Ảnh cần** — Không ảnh. Khối này là chữ và số, để trống cho mắt nghỉ trước khối lưới sản phẩm ở phần 2.

**Ghi chú dựng** — Không CTA. Địa chỉ hiển thị bằng chuỗi thật ở trên; số điện thoại nếu hiện thì qua `prettyPhone()` để ra "0901 678 999". `ContactBar` render **một lần duy nhất ở cuối trang** (xem phần 3) — đừng dựng thanh liên hệ nào khác trong sáu khối này.
