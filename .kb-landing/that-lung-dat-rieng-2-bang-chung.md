# that-lung-dat-rieng — PHẦN 2: BẰNG CHỨNG (khối 7–12)

URL: `/dat-lam-that-lung-theo-yeu-cau-koi-leather/` (viết lại tại chỗ, giữ nguyên đường dẫn)
Chuỗi truyền vào mọi CTA: `productName="đặt làm thắt lưng da theo yêu cầu"`

---

## 7. Lưới sản phẩm

**Nội dung thật**

### Vài chiếc đã ra khỏi xưởng

Đây không phải danh sách để bấm mua. Đây là để bạn thấy tay nghề trước khi kể ý tưởng của mình: khổ bản, kiểu khoá, đường khâu, cách gấp mép. Chiếc của bạn sẽ khác — vì số đo và khoá là của bạn — nhưng chuẩn hoàn thiện thì đúng như những chiếc này.

Thắt lưng nam ở xưởng đang có 21 mẫu, giá 3,5 đến 22,0 triệu, phần lớn quanh 4,5 triệu. Thắt lưng nữ có 9 mẫu, 3,9 đến 25,0 triệu, phần lớn quanh 4,2 triệu. Chênh lệch nằm ở loại da và bộ khoá, không ở công khâu.

Xem hết: [thắt lưng nam](/san-pham/day-lung-cho-nam/) · [thắt lưng nữ](/san-pham/day-lung-cho-nu/)

**Ảnh cần**
- Không cần ảnh rời: `ProductCard` tự lấy ảnh bìa sản phẩm. 0 sản phẩm ACTIVE nào thiếu ảnh nên lưới an toàn.
- Một ảnh ngang đặt trên lưới: 5–6 chiếc thắt lưng xếp cạnh nhau trên mặt gỗ, khác nhau rõ về màu và khổ bản. Chú thích: "Cùng một xưởng, năm khổ bản khác nhau — bản rộng chọn theo khuy quần của bạn."

**Ghi chú dựng**
- Dùng `<ProductCard p={...} />` trong lưới `grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4`. ProductCard tự link `/cua-hang/{slug}/`, không viết thẻ `a` tay.
- **Tiêu chí chọn 8 món (dev truy vấn, đừng chọn cảm tính):** 6 từ `day-lung-cho-nam` + 2 từ `day-lung-cho-nu`, sắp theo giá tăng dần, và **phải trải dải giá**: 2 món ở vùng 3,5–4,0tr, 3 món quanh trung vị 4,2–4,5tr, 2 món 6–10tr, đúng 1 món ở vùng cao nhất. Loại mọi sản phẩm `price = 0`. Dồn hết hàng đắt lên lưới là cách nhanh nhất đẩy khách 4,5 triệu ra khỏi trang.
- [DEV: chốt danh sách 8 slug sản phẩm thật rồi dán vào đây — phần 2 không được bịa slug.]
- Không đặt CTA trong khối này; CTA gần nhất nằm sau khối 8.

---

## 8. Bảng cam kết: giá · thời gian làm · MOQ · đổi trả

**Nội dung thật**

### Những gì xưởng dám viết ra thành cam kết

| Hạng mục | Cam kết |
|---|---|
| Khoảng giá thắt lưng nam | 3,5 – 22,0 triệu (phần lớn quanh 4,5 triệu) |
| Khoảng giá thắt lưng nữ | 3,9 – 25,0 triệu (phần lớn quanh 4,2 triệu) |
| Bộ khoá đặt riêng | 1,8 – 28,0 triệu, phần lớn quanh 9,5 triệu — tính riêng ngoài giá dây |
| Thời gian làm — da bò/da dê | [NGƯỜI BÁN ĐIỀN: số ngày làm việc] |
| Thời gian làm — da cá sấu | [NGƯỜI BÁN ĐIỀN: số ngày làm việc] |
| Thời gian làm — có khoá đúc riêng | [NGƯỜI BÁN ĐIỀN: số ngày, tính thêm thời gian đúc khoá] |
| Cọc | [NGƯỜI BÁN ĐIỀN: % cọc, và cọc có được trừ vào tiền cuối không] |
| Sửa cỡ sau khi nhận | [NGƯỜI BÁN ĐIỀN: miễn phí trong bao lâu, mấy lần] |
| Bảo hành đường khâu / khoá | [NGƯỜI BÁN ĐIỀN: phạm vi và thời hạn — thanh header đang hứa "bảo dưỡng trọn đời", cần định nghĩa rõ] |
| Đổi trả hàng đặt riêng | [NGƯỜI BÁN ĐIỀN: phải khớp với /chinh-sach-hoan-tien-doi-tra/] |
| Đặt số lượng cho doanh nghiệp | [NGƯỜI BÁN ĐIỀN: MOQ tối thiểu và bậc giá] |
| Giấy tờ da cá sấu | [NGƯỜI BÁN ĐIỀN: có cấp giấy CITES kèm sản phẩm hay không] |
| Thời gian trả lời Zalo | [NGƯỜI BÁN ĐIỀN: trong bao lâu, giờ nào] |

**Ảnh cần**
- Một ảnh phiếu đặt hàng viết tay trên mặt bàn cùng thước dây và mẫu da. Chú thích: "Số đo, loại da, kiểu khoá — ghi hết trước khi cắt miếng đầu tiên."

**Ghi chú dựng**
- Đây là bảng cam kết, khác khối 3 (khoảng giá). Khối 3 chỉ trả lời "bao nhiêu tiền"; bảng này trả lời "bao lâu, cọc mấy phần, không vừa thì sao".
- **Điểm chạm CTA thứ hai** ngay dưới bảng: `<ContactLink kind="zalo" productName="đặt làm thắt lưng da theo yêu cầu" className="..." />` với chữ nút **"Nhắn Zalo để nghệ nhân tư vấn"**, dòng gỡ lo dưới nút: *"Nhắn để hỏi thôi cũng được — chưa cần quyết gì."*
- Không xuất bản khi bảng còn ô `[NGƯỜI BÁN ĐIỀN]`: cam kết trống tệ hơn không có bảng.

---

## 9. Nghệ nhân

**Nội dung thật**

### Ai thật sự khâu chiếc thắt lưng của bạn

Ở xưởng, một chiếc thắt lưng đi qua tay ba người: người chọn và cắt da, người vê mép và khâu, người lắp khoá cùng dập chữ. Không có dây chuyền, không có bên thứ ba gia công.

- **[NGƯỜI BÁN ĐIỀN: tên]** — [NGƯỜI BÁN ĐIỀN: vai trò, ví dụ cắt da và chọn tấm]. Câu nói của chính người này về việc mình làm: [NGƯỜI BÁN ĐIỀN: 1–2 câu, giọng nói thật, không viết hộ].
- **[NGƯỜI BÁN ĐIỀN: tên]** — thợ chính khâu tay và vê mép. Câu nói: [NGƯỜI BÁN ĐIỀN].
- **[NGƯỜI BÁN ĐIỀN: tên]** — lắp khoá, dập chữ, kiểm cuối. Câu nói: [NGƯỜI BÁN ĐIỀN].

Xưởng ở Số 2/16 Nguyễn Bặc, Tân Sơn Hòa, TP. HCM. Bạn đến xem người ta làm được, hẹn trước qua Zalo 0901 678 999.

**Ảnh cần**
- Ba ảnh chân dung tại chỗ làm, mỗi người một ảnh, **phải thấy bàn tay đang làm việc** — không ảnh thẻ, không ảnh kho. Chú thích ghi tên + đúng khâu người đó phụ trách.
- [NGƯỜI BÁN ĐIỀN: xin phép từng người trước khi đưa mặt và tên lên web.]

**Ghi chú dựng**
- Khối E-E-A-T. Tên và ảnh thật là thứ 0/3 đối thủ có; đừng thay bằng ảnh stock, mất sạch giá trị.
- Số điện thoại hiển thị qua `prettyPhone()`. Không đặt CTA nút ở khối này — khách đang đọc để tin, chưa phải để bấm.

---

## 10. FAQ

**Nội dung thật**

**Tôi ở xa, không đến xưởng đo được thì làm sao?**
Bạn tự đo tại nhà rồi gửi số qua Zalo. Cách đo đúng nằm ở khối quy trình phía trên — đo theo chiếc thắt lưng đang dùng, không đo vòng bụng. Xưởng đọc lại số đo cho bạn xác nhận trước khi cắt.

**Thắt lưng cũ của tôi dài quá, cắt ngắn được không?**
Được, và đó là việc xưởng làm hằng ngày: [định vị lỗ và cắt dây lưng chuyên nghiệp](/dinh-vu-do-va-cat-day-lung-chuyen-nghiep/). Nếu bạn muốn tự làm, đọc [hướng dẫn cắt dây nịt tại nhà](/huong-dan-cach-cat-day-nit-tai-nha/) trước khi động dao.

**Tôi cắt sai cỡ rồi, còn cứu được không?**
Phần lớn trường hợp còn cứu. Xưởng đã viết riêng về chuyện này: [thắt lưng da bị hỏng, cắt sai cỡ có khắc phục được không](/sua-that-lung-da-bi-hong-cat-sai-co-khac-phuc-duoc-khong/). Gửi ảnh hai đầu dây qua Zalo, xưởng nói thẳng cứu được hay không.

**Vì sao giá chênh từ 3,5 triệu tới 22 triệu?**
Chênh ở da và khoá. Da bò, da dê thuộc nằm vùng dưới; da cá sấu đẩy giá lên vùng trên. Bộ khoá đặt riêng tính tách ra, 1,8 – 28,0 triệu, phần lớn quanh 9,5 triệu.

**Đặt thắt lưng da cá sấu thì khác gì?**
Khác ở chỗ chọn tấm: vảy phải cân theo chiều dài dây, nên không phải tấm nào cũng ra được cỡ của bạn. Chi tiết ở bài [đặt làm dây lưng da cá sấu](/dat-lam-day-lung-da-ca-sau/). Giấy tờ kèm theo: [NGƯỜI BÁN ĐIỀN: có cấp CITES không].

**Khoá riêng có làm được không?**
Được. Xưởng có [danh mục khoá và phụ kiện riêng](/san-pham/phu-kien-rieng-customize-hardware/) với 11 lựa chọn, 1,8 – 28,0 triệu. Bạn gửi hình dáng khoá muốn có, xưởng nói được hay không trước khi nhận cọc.

**Nên chọn khổ bản bao nhiêu?**
Đo khuy quần bạn hay mặc, đó là giới hạn trên. Cách chọn kỹ hơn ở bài [lựa chọn thắt lưng da nam cao cấp](/lua-chon-that-lung-da-nam-cao-cap-cung-koi-leather/).

**Dùng lâu có bị gãy nếp không?**
Có, nếu cuộn sai và phơi nắng. Xưởng viết sẵn [5 cách bảo quản thắt lưng da cao cấp](/5-cach-tot-nhat-de-bao-quan-that-lung-da-cao-cap-ben-bi-theo-thoi-gian/).

**Nhận về không vừa ý thì sao?**
[NGƯỜI BÁN ĐIỀN: chính sách sửa/đổi cho hàng đặt riêng, phải khớp /chinh-sach-hoan-tien-doi-tra/.] Đây là câu khách lo nhất — để trống là mất lead.

**Ảnh cần**
- Không cần ảnh trong FAQ (chữ ngắn, ảnh chen vào làm loãng). Nếu muốn một ảnh: cận cảnh hàng lỗ đã định vị trên dây đã cắt. Chú thích: "Lỗ định vị theo số đo của bạn, không theo cỡ có sẵn."

**Ghi chú dựng**
- 9 câu. Giữ FAQ cho người đọc và AI Overviews — Google đã bỏ FAQ rich result từ 7/5/2026, đừng nhồi thêm câu.
- **Điểm chạm CTA thứ tư** ngay sau câu cuối: `ContactLink kind="zalo"`, chữ nút **"Kể ý tưởng của bạn"**, dòng dưới: *"Tin nhắn đã soạn sẵn, bạn chỉ cần bấm gửi."*

---

## 11. CTA cuối + form

**Nội dung thật**

### Bắt đầu đặt riêng

Kể cho xưởng ba thứ: bạn đeo với quần nào, thích khoá kiểu gì, và số đo chiếc thắt lưng đang dùng. Bấy nhiêu là đủ để xưởng báo giá và mốc thời gian. Chưa cần cọc để được tư vấn.

Nhắn Zalo 0901 678 999 · Messenger koileathercraft · email koi.leather19@gmail.com
Hoặc để lại số, xưởng gọi lại.

**Ảnh cần**
- Một ảnh cuối: bàn tay nghệ nhân đưa chiếc thắt lưng đã gói cho khách. Chú thích: "Chiếc cuối cùng của tháng này — chiếc tiếp theo có thể là của bạn."

**Ghi chú dựng**
- `<LeadForm productId={...} productName="đặt làm thắt lưng da theo yêu cầu" />`. [DEV: landing không gắn một sản phẩm cụ thể → chốt cách truyền `productId` (để trống/null) trước khi dựng.]
- **LeadForm hiện chỉ có 3 trường (name, phone, message) + bẫy spam. Form 4 trường ở mục 4 BRIEF.md là VIỆC PHẢI THÊM, chưa có:** `wish` select bắt buộc, `budget` select không bắt buộc (phải có mục "Chưa rõ, nhờ shop tư vấn"), `phone`, `name`, rồi textarea "Mô tả thêm (nếu có)". Bảng `leads` không có cột cho món/ngân sách → ghép vào `message` theo khuôn `Món: ... | Ngân sách: ... | Mốc: ... | Trang: ... | Mã: ... | Ghi chú KH: ...`.
- Nút form: **"Để lại số, shop gọi lại"**. Nút Zalo cạnh form dùng `ContactLink`, không viết `a href="https://zalo.me/..."` tay.
- `main` có `pb-16 md:pb-0` → **không đặt nút nào trong 64px cuối trang**, thanh đáy mobile sẽ che. Chèn khối 12 xuống dưới, hoặc thêm đệm dưới form.
- `<ContactBar productName="đặt làm thắt lưng da theo yêu cầu" />` render **đúng một lần** ở cuối trang. Không dựng thanh liên hệ riêng.

---

## 12. Case study và bài liên quan

**Nội dung thật**

### Một ca cụ thể

[NGƯỜI BÁN ĐIỀN: chọn một ca đặt thắt lưng thật đã làm xong — khách muốn gì, xưởng xử lý ra sao, vướng chỗ nào, mất bao lâu, kết quả. Cần: 3–4 ảnh của chính chiếc đó (da lúc chưa cắt, lúc khâu, thành phẩm), và câu xác nhận của khách. Nếu khách không cho nêu tên thì ghi nghề và thành phố, tuyệt đối không mượn tên doanh nghiệp từ nhóm quà tặng — họ không đặt thắt lưng.]

### Đọc thêm về thắt lưng da

Bốn bài dưới đây là kiến thức xưởng viết ra từ việc làm hằng ngày, không phải bài SEO chép lại.

**Ảnh cần**
- 3–4 ảnh của đúng ca case study, theo trình tự thời gian. Chú thích mỗi ảnh nói rõ đang ở bước nào.

**Ghi chú dựng**
- Dùng `<PostList posts={...} />` với đúng các slug đã kiểm chứng: `dinh-vu-do-va-cat-day-lung-chuyen-nghiep` (giữ nguyên chính tả "dinh-vu"), `dat-lam-day-nit-that-lung-da-theo-yeu-cau`, `dat-lam-day-lung-da-ca-sau`, `cat-day-nit-o-dau-uy-tin-tai-tp-hcm`, `5-cach-tot-nhat-de-bao-quan-that-lung-da-cao-cap-ben-bi-theo-thoi-gian`, `sua-that-lung-da-bi-hong-cat-sai-co-khac-phuc-duoc-khong`.
- **CỜ THƯƠNG HIỆU:** PostList tuyệt đối không được nạp `dat-lam-day-lung-hermes` và `dat-lam-day-lung-khoa-chu-h`. Nếu khối bài liên quan lấy tự động theo tag/danh mục thì phải loại tay hai slug này. Số phận hai bài đó là quyết định của người bán (xem phần 3).
- Không đặt CTA nút ở khối này — `ContactBar` đã phủ.
