# tui-da-dat-rieng — PHẦN 2: BẰNG CHỨNG (khối 7–12)

URL: `/dich-vu-lam-tui-da-theo-yeu-cau/` (giữ nguyên đường dẫn, viết lại nội dung)
Chuỗi `productName` dùng cho mọi CTA của trang này: **`đặt làm túi da theo yêu cầu`**

---

## 7. Lưới sản phẩm

**Nội dung thật**

### Túi đã làm — xem để hình dung dáng và mức đầu tư

Đây là túi thật đã ra khỏi xưởng, không phải ảnh dựng. Bạn không cần chọn đúng chiếc nào trong số này: phần lớn khách chỉ tay vào một chiếc rồi nói "em muốn dáng này nhưng nhỏ hơn, quai dài hơn, đổi qua da nhám". Đó chính là lúc việc đặt riêng bắt đầu.

Túi nữ ở xưởng hiện có 49 mẫu, giá từ 3,8 triệu tới 79 triệu, phần lớn quanh 11,5 triệu. Túi nam có 14 mẫu, từ 6,9 triệu tới 39 triệu, phần lớn quanh 16 triệu. Chênh lệch nằm ở loại da và số giờ khâu tay, không ở thương hiệu.

Muốn xem hết hàng có sẵn thay vì đặt làm mới: [túi da nữ](/tui-da-nu/) · [túi da nam](/tui-da-nam/).

**Ảnh cần**

- Lưới tự lấy ảnh bìa sản phẩm từ `ProductCard` — không cần ảnh rời.
- 1 ảnh ngang phía trên lưới: hai chiếc túi cùng dáng khác cỡ đặt cạnh nhau trên bàn gỗ. Chú thích: "Cùng một dáng, hai cỡ khác nhau — phần lớn đơn đặt riêng bắt đầu từ một thay đổi nhỏ như vậy."

**Ghi chú dựng**

- Dùng `<ProductCard p={...} />` trong lưới `grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4`. 8 món, chia 4 cột trên máy tính (2 hàng cân đối), 2 cột trên điện thoại.
- **Tiêu chí chọn món lên lưới** — trải dải giá để khách tự định vị, tuyệt đối không dồn hàng đắt lên đầu:
  - 2 món dưới 6 triệu (chạm sàn 3,8 triệu của `tui-da-cho-nu`)
  - 3 món quanh trung vị (10–17 triệu, gồm ít nhất 1 túi nam quanh 16 triệu)
  - 2 món 20–40 triệu
  - 1 món cao nhất, để lộ trần thật của xưởng
  - Tỷ lệ 5 túi nữ / 3 túi nam, theo đúng tỷ lệ số mẫu 49/14.
- **Loại trừ**: 2 sản phẩm giá 0 trong `tui-da-cho-nu` (đang hiện "0 ₫" trên trang khách). Query lưới phải có điều kiện giá > 0 và `status='ACTIVE'`.
- `ProductCard` tự link `/cua-hang/{slug}/` — không tự viết thẻ `a`.
- Không đặt CTA trong khối này. Khách đang duyệt hàng, nút chốt nằm ở khối 8 và 11.

---

## 8. Bảng cam kết: giá · thời gian làm · MOQ · đổi trả

**Nội dung thật**

### Những gì xưởng cam kết bằng văn bản

Dưới đây là các con số ràng buộc. Nếu một dòng nào chưa được điền, nghĩa là xưởng chưa chốt, và bạn có quyền hỏi thẳng qua Zalo trước khi cọc.

| Hạng mục | Cam kết |
|---|---|
| Khoảng giá túi nữ đặt riêng | 3,8 – 79 triệu, phần lớn quanh 11,5 triệu |
| Khoảng giá túi nam đặt riêng | 6,9 – 39 triệu, phần lớn quanh 16 triệu |
| Thời gian làm — túi da bò | [NGƯỜI BÁN ĐIỀN: số ngày làm việc] |
| Thời gian làm — túi da cá sấu / da đà điểu | [NGƯỜI BÁN ĐIỀN: số ngày làm việc] |
| Thời gian làm rập thử trước khi cắt da | [NGƯỜI BÁN ĐIỀN: số ngày] |
| Mức cọc | [NGƯỜI BÁN ĐIỀN: % cọc + có hoàn khi huỷ trước lúc cắt da không] |
| Thanh toán phần còn lại | [NGƯỜI BÁN ĐIỀN: mốc thanh toán] |
| Bảo hành đường khâu và khoá | [NGƯỜI BÁN ĐIỀN: thời hạn + phạm vi] |
| "Bảo dưỡng trọn đời" trên header nghĩa là gì | [NGƯỜI BÁN ĐIỀN: định nghĩa cụ thể, gồm gì, không gồm gì] |
| Đổi trả hàng đặt riêng | [NGƯỜI BÁN ĐIỀN: phải khớp với /chinh-sach-hoan-tien-doi-tra/] |
| Sửa lại miễn phí nếu lệch số đo đã chốt | [NGƯỜI BÁN ĐIỀN: có / không, trong bao lâu] |
| Số lượng tối thiểu đơn doanh nghiệp | [NGƯỜI BÁN ĐIỀN: MOQ theo từng dáng] |
| Bậc giá theo số lượng | [NGƯỜI BÁN ĐIỀN: mốc số lượng và mức giảm] |
| Giấy tờ CITES cho da cá sấu | [NGƯỜI BÁN ĐIỀN: có cấp kèm không, dạng nào] |
| Thời gian phản hồi Zalo | [NGƯỜI BÁN ĐIỀN: trong giờ làm việc / ngoài giờ] |

**Ảnh cần**

- 1 ảnh: phiếu đặt hàng viết tay có số đo và chữ ký khách, che thông tin cá nhân. Chú thích: "Số đo và mức cọc được ghi tay, hai bên giữ mỗi người một bản."

**Ghi chú dựng**

- **Điểm chạm CTA thứ 3**: ngay dưới bảng, một nút `<ContactLink kind="zalo" productName="đặt làm túi da theo yêu cầu" className="..." />` với chữ **"Nhắn Zalo hỏi thời gian làm"**, dưới nút là dòng gỡ lo: *"Không cần cọc để được tư vấn."*
- Bảng phải cuộn ngang được trên điện thoại (`overflow-x-auto`) — 64% khách vào bằng điện thoại.
- Dòng MOQ và bậc giá đặt link nội bộ tới [/san-xuat-qua-tang-doanh-nghiep-va-su-kien/](/san-xuat-qua-tang-doanh-nghiep-va-su-kien/).

---

## 9. Nghệ nhân

**Nội dung thật**

### Ai thật sự khâu chiếc túi của bạn

Một chiếc túi đặt riêng đi qua tay nhiều người, và bạn có quyền biết tên họ.

| Vai trò | Người | Làm khâu nào | Ảnh bắt buộc | Một câu của họ |
|---|---|---|---|---|
| Người ra rập & thiết kế | [NGƯỜI BÁN ĐIỀN: tên] | Nghe yêu cầu, dựng rập giấy, chốt số đo | Ảnh đang vẽ rập trên giấy, thấy rõ tay và thước | [NGƯỜI BÁN ĐIỀN: 1 câu về chỗ khó nhất khi ra rập túi] |
| Thợ chính cắt da | [NGƯỜI BÁN ĐIỀN: tên] | Chọn vùng da, cắt, định hướng thớ da | Ảnh dao cắt trên tấm da, thấy bàn tay | [NGƯỜI BÁN ĐIỀN: 1 câu về vì sao vùng da quyết định giá] |
| Thợ chính khâu tay | [NGƯỜI BÁN ĐIỀN: tên] | Khâu yên ngựa, đánh cạnh, gắn khoá | Ảnh đang khâu, thấy kim và chỉ | [NGƯỜI BÁN ĐIỀN: 1 câu về số mũi khâu hoặc lỗi thường phải tháo ra khâu lại] |
| Người kiểm cuối | [NGƯỜI BÁN ĐIỀN: tên] | Soát đường khâu, khoá, lót trước khi giao | Ảnh soi túi dưới đèn | [NGƯỜI BÁN ĐIỀN: 1 câu về tiêu chí bị loại] |

Xưởng ở Số 2/16 Nguyễn Bặc, Tân Sơn Hòa, TP. HCM. Bạn hẹn trước là ghé xem người ta khâu tận mắt được.

**Ảnh cần**

- 4 ảnh chân dung tại chỗ làm việc theo bảng trên, không ảnh thẻ, không ảnh kho.
- Mật độ ảnh khối này cao là chủ ý: đây là khối E-E-A-T, 0/3 đối thủ có ảnh quy trình kèm tên nghệ nhân.

**Ghi chú dựng**

- Không đặt CTA trong khối này.
- Tên nghệ nhân sau khi điền phải dùng lại trong `JSON-LD` ở phần 3 (`Service.provider.employee`), không khai `Person` rời.

---

## 10. FAQ

**Nội dung thật**

### Khách hỏi nhiều nhất

**Đặt riêng một chiếc túi hết bao nhiêu?**
Túi nữ 3,8 – 79 triệu, phần lớn quanh 11,5 triệu. Túi nam 6,9 – 39 triệu, phần lớn quanh 16 triệu. Báo giá chính xác cần biết dáng, cỡ và loại da; nhắn Zalo là có số trong cùng buổi.

**Vì sao hai chiếc trông giống nhau mà giá chênh gấp mấy lần?**
Gần như toàn bộ chênh lệch nằm ở da. Da bò thuộc thảo mộc, da dê Alran, da Togo, da Epsom, da cá sấu — mỗi loại một mức giá nhập và một độ khó khi khâu. Đọc thêm [da Togo](/da-togo/), [da Epsom là gì](/da-epsom-la-gi/), [da dê Alran](/da-de-alran/).

**Xem được da thật trước khi quyết không?**
Được. Xưởng chụp đúng tấm da sẽ cắt cho bạn và gửi qua Zalo, hoặc bạn ghé xưởng sờ trực tiếp. Chưa cần cọc để xem.

**Làm bao lâu?**
[NGƯỜI BÁN ĐIỀN: số ngày làm việc theo từng nhóm da]. Đơn có da cá sấu hoặc khoá đặt riêng lâu hơn — mốc chính xác sẽ ghi vào phiếu đặt hàng.

**Tôi có ảnh một chiếc túi mình thích, xưởng làm giống được không?**
Xưởng làm theo dáng, cỡ, cách chia ngăn bạn muốn, nhưng không nhận sao chép sản phẩm của thương hiệu khác. Cách làm quen thuộc: lấy tinh thần chiếc bạn thích rồi dựng thành bản của riêng bạn. Xem [thiết kế đồ da theo yêu cầu](/thiet-ke-do-da-theo-yeu-cau/).

**Khắc tên lên túi được không?**
Được. Kỹ thuật, vị trí và giới hạn số ký tự: [NGƯỜI BÁN ĐIỀN]. Xem cách xưởng khắc tại [khắc tên lên ví da](/khac-ten-len-vi-da/).

**Nhận xong không vừa ý thì sao?**
[NGƯỜI BÁN ĐIỀN: chính sách với hàng đặt riêng, phải khớp /chinh-sach-hoan-tien-doi-tra/]. Trước khi cắt da, xưởng luôn chốt lại số đo và mẫu da bằng tin nhắn để hai bên cùng giữ.

**Da cá sấu có giấy tờ không?**
[NGƯỜI BÁN ĐIỀN: tình trạng giấy CITES]. Nếu bạn cần mang túi ra nước ngoài, hỏi trước — thủ tục khác với dùng trong nước.

**Đặt số lượng lớn làm quà cho công ty thì sao?**
Có làm, số lượng tối thiểu và bậc giá xem [sản xuất quà tặng doanh nghiệp](/san-xuat-qua-tang-doanh-nghiep-va-su-kien/).

**Ảnh cần**

- 1 ảnh: bốn tấm da khác loại xếp cạnh nhau, có nhãn tên da. Chú thích: "Cùng một dáng túi, bốn loại da này cho ra bốn mức giá khác nhau."

**Ghi chú dựng**

- **Điểm chạm CTA thứ 4**: dưới câu FAQ cuối, `<ContactLink kind="zalo" productName="đặt làm túi da theo yêu cầu" />` với chữ **"Kể ý tưởng của bạn"**, dòng dưới: *"Nhắn để hỏi thôi cũng được — chưa cần quyết gì."*
- `FAQPage` trong JSON-LD là tuỳ chọn (phần 3 quyết). Google đã bỏ FAQ rich result từ 7/5/2026 → viết cho người đọc, đừng nhồi câu.
- Dùng `<details>` gập mở được trên điện thoại, nhưng câu trả lời phải nằm trong HTML sẵn, không nạp bằng JS.

---

## 11. CTA cuối + form

**Nội dung thật**

### Bắt đầu đặt riêng

Cách nhanh nhất là nhắn Zalo — tin nhắn đã soạn sẵn, bạn chỉ cần bấm gửi. Nếu bạn đang ở chỗ không tiện nhắn, để lại số, xưởng gọi lại.

Nói được ba điều này là xưởng báo giá gần đúng ngay: bạn muốn dáng gì, đựng vừa món gì (laptop, A4, chỉ ví và điện thoại), và ngân sách bạn nghĩ tới. Chưa rõ ngân sách cũng không sao, cứ chọn "nhờ shop tư vấn".

Gọi 0901 678 999 · Zalo 0901 678 999 · Messenger koileathercraft · koi.leather19@gmail.com
Xưởng: Số 2/16 Nguyễn Bặc, Tân Sơn Hòa, TP. HCM

**Ảnh cần**

- Không đặt ảnh trong khối này. Ảnh cạnh form làm khách rời mắt khỏi trường nhập.

**Ghi chú dựng**

- **Điểm chạm CTA thứ 5**: một `<ContactLink kind="zalo" productName="đặt làm túi da theo yêu cầu" />` nút to phía trên form, chữ **"Bắt đầu đặt riêng"**. Số điện thoại hiện qua `prettyPhone()`.
- Form: `<LeadForm productId={null} productName="đặt làm túi da theo yêu cầu" />`.
- **VIỆC PHẢI LÀM TRƯỚC KHI XUẤT BẢN — form hiện chưa đủ trường.** `LeadForm` đang có 3 trường (name, phone, message) + bẫy spam. Cần thêm `wish` select bắt buộc và `budget` select không bắt buộc (có mục "Chưa rõ, nhờ shop tư vấn"), theo thứ tự ở mục 4 BRIEF. Bảng `leads` không có cột cho hai trường này → ghép vào `message` theo khuôn `Món: ... | Ngân sách: ... | Mốc: ... | Trang: ... | Mã: ... | Ghi chú KH: ...`.
- Cùng lúc phải sửa lỗi 3.1: `lead-form.tsx:24` đang render `name="product_id"` còn `actions.ts:19` đọc `product_name` → tên sản phẩm luôn rỗng. Không sửa thì lead về không biết khách đến từ landing nào.
- Nút gửi form ghi **"Để lại số, shop gọi lại"**. Không dùng "Gửi" / "Đăng ký".
- `main` có `pb-16 md:pb-0` → chèn một khối đệm dưới form trước khối 12, đừng để nút gửi nằm trong 64px cuối trang, thanh đáy sẽ che.

---

## 12. Case study và bài liên quan

**Nội dung thật**

### Những chiếc đã làm và câu chuyện phía sau

Ba bài dưới đây kể lại việc xưởng làm thật, không phải bài giới thiệu chung: [quy trình chế tác Karkarbag](/quy-trinh-che-tac-karkarbag/) đi theo một chiếc túi từ lúc ra rập tới lúc kiểm cuối; [bộ sưu tập Rubellite](/bo-sua-tap-tui-da-nu-cao-cap-rubellite-koi-leather/) và [bộ sưu tập Mettique](/bo-suu-tap-tui-da-cao-cap-mettique-koi-leather/) là hai lần xưởng tự đặt đề bài rồi làm trọn bộ — dáng, màu, khoá đều dựng từ đầu.

Muốn xem xưởng nghĩ gì trước khi cắt da, đọc [thiết kế đồ da theo yêu cầu](/thiet-ke-do-da-theo-yeu-cau/). Còn nếu bạn đi làm và muốn một chiếc túi vừa hồ sơ vừa laptop, [những mẫu túi thời trang handmade cho chị em công sở](/goi-y-nhung-mau-tui-thoi-trang-handmade-hut-hon-chi-em-cong-so/) là chỗ nên bắt đầu.

[NGƯỜI BÁN ĐIỀN: nếu có khách cá nhân đồng ý nêu tên và cho chụp túi đã dùng một thời gian, thêm 1 case study ngắn ở đây — trước/sau, yêu cầu ban đầu, chỗ phải làm lại. Không tự đặt tên khách.]

**Ảnh cần**

- `PostList` tự lấy ảnh bìa bài.
- 1 ảnh: túi đã dùng vài năm đặt cạnh túi mới cùng dáng. Chú thích: "Cùng một dáng, chiếc bên trái đã dùng [NGƯỜI BÁN ĐIỀN: bao lâu]."

**Ghi chú dựng**

- Dùng `<PostList posts={...} />` với đúng 5 slug: `quy-trinh-che-tac-karkarbag`, `bo-sua-tap-tui-da-nu-cao-cap-rubellite-koi-leather`, `bo-suu-tap-tui-da-cao-cap-mettique-koi-leather`, `thiet-ke-do-da-theo-yeu-cau`, `goi-y-nhung-mau-tui-thoi-trang-handmade-hut-hon-chi-em-cong-so`.
- Render `<ContactBar productName="đặt làm túi da theo yêu cầu" />` **đúng một lần**, sau khối 12, cuối trang. Đây là component duy nhất làm thanh liên hệ — không dựng thêm thanh nào khác.
