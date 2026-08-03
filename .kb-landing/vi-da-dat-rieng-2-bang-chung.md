# PHẦN 2 — Khối 7–12 · landing `/lam-vi-da-theo-yeu-cau/`

> Loại A: URL đã tồn tại (8.028 ký tự), viết lại tại chỗ, giữ nguyên đường dẫn.
> Cụm hỗ trợ: `/khac-ten-len-vi-da/` đã có 5 khách Google riêng.

---

## 7. Lưới sản phẩm

**Nội dung thật**

### Mẫu ví đã làm — xem để hình dung, không phải để chọn sẵn

Mỗi chiếc dưới đây từng là một đơn đặt riêng. Bạn có thể lấy nguyên một mẫu rồi đổi màu da, đổi số ngăn thẻ, thêm dòng khắc tên; hoặc chỉ mượn dáng rồi làm lại từ đầu. Ví nam của xưởng đang trải từ 3,3 triệu tới 11,8 triệu, phần lớn quanh 4,8 triệu. Ví nữ trải rộng hơn nhiều: 1,8 triệu tới 28,0 triệu, phần lớn quanh 6,8 triệu — chênh đó gần như hoàn toàn nằm ở loại da. Kẹp tiền money clip là món nhẹ nhất để bắt đầu, 1,2 – 3,8 triệu. Ví zip mini 2,2 – 2,9 triệu.

Bấm vào một mẫu là sang trang riêng của nó, có đủ ảnh chi tiết và giá. Nếu không thấy dáng nào giống thứ bạn đang hình dung, nhắn Zalo kèm ảnh chụp chiếc ví cũ của bạn — thường vậy nhanh hơn tả bằng lời.

**Ảnh cần**

Không cần ảnh rời — `ProductCard` tự lấy ảnh bìa của từng sản phẩm (0 sản phẩm ACTIVE nào thiếu ảnh). Cần đúng một ảnh dẫn khối: bốn chiếc ví xếp cạnh nhau trên mặt gỗ, thấy rõ độ dày khác nhau. Chú thích: *"Bốn chiếc ví, bốn loại da khác nhau — cùng một kiểu khâu tay."*

**Ghi chú dựng**

`<ProductCard p={...} />` trong lưới `grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4` — 8 món, 2 hàng trên desktop.

Tiêu chí chọn 8 món, phải theo đúng thứ tự này, KHÔNG dồn hàng đắt lên đầu:
- 2 món từ `kep-tien-money-clip` ở vùng 1,2 – 1,4 triệu (bậc thấp nhất, để khách ngân sách nhỏ không thoát)
- 1 món từ `vi-zip-mini` quanh 2,5 triệu
- 2 món từ `vi-da-cho-nam` quanh trung vị 4,8 triệu
- 2 món từ `vi-da-cho-nu` quanh trung vị 6,8 triệu
- 1 món cao nhất, ví nữ vùng 20 – 28 triệu (đặt cuối lưới, làm mốc trên)

Chọn món có mô tả dài nhất trong mỗi nhóm. Không hardcode slug ở đây: truy vấn theo `categoryLinks` + `status='ACTIVE'` + `price > 0` như `shop.service.ts:389`. `ProductCard` tự link `/cua-hang/{slug}/`. Không đặt CTA trong khối này — CTA gần nhất là sau khối FAQ.

---

## 8. Bảng cam kết: giá · thời gian làm · MOQ · đổi trả

**Nội dung thật**

### Những gì xưởng cam kết bằng số

| Hạng mục | Cam kết |
|---|---|
| Giá chốt | Báo giá bằng số cụ thể trước khi làm, không phát sinh sau |
| Ví nam | 3,3 – 11,8 triệu (phần lớn quanh 4,8 triệu) |
| Ví nữ | 1,8 – 28,0 triệu (phần lớn quanh 6,8 triệu) |
| Kẹp tiền | 1,2 – 3,8 triệu |
| Thời gian làm — ví da bò | [NGƯỜI BÁN ĐIỀN: số ngày làm việc] |
| Thời gian làm — ví da cá sấu | [NGƯỜI BÁN ĐIỀN: số ngày làm việc] |
| Thêm khắc tên | [NGƯỜI BÁN ĐIỀN: cộng thêm mấy ngày, có tính thêm phí không] |
| Cọc | [NGƯỜI BÁN ĐIỀN: % cọc, cọc bằng gì, có hoàn không] |
| Bảo hành | [NGƯỜI BÁN ĐIỀN: bảo hành mấy tháng, gồm chỉ khâu / khoá / da] |
| Bảo dưỡng về sau | [NGƯỜI BÁN ĐIỀN: header đang hứa "bảo dưỡng trọn đời" — định nghĩa rõ gồm gì] |
| Đổi trả hàng đặt riêng | [NGƯỜI BÁN ĐIỀN: phải khớp `/chinh-sach-hoan-tien-doi-tra/`, đừng viết lệch] |
| Số lượng tối thiểu | 1 chiếc. Đơn quà tặng doanh nghiệp: [NGƯỜI BÁN ĐIỀN: MOQ và bậc giá theo số lượng] |
| Giấy tờ da cá sấu | [NGƯỜI BÁN ĐIỀN: có xuất giấy CITES kèm sản phẩm không] |

**Ảnh cần**

Một ảnh: phiếu đặt hàng viết tay đặt cạnh miếng da mẫu và cuộn chỉ. Chú thích: *"Mỗi đơn có một phiếu riêng — số đo, màu chỉ, dòng chữ khắc đều ghi trên đó."*

**Ghi chú dựng**

Bảng HTML thường, không component. Đặt ngay sau lưới sản phẩm để khách vừa xem giá xong là thấy điều kiện. Đây là bảng ĐIỀU KIỆN — khác khối 3 (khoảng giá) ở chỗ khối 3 chỉ có tiền, khối này có thời gian, cọc, đổi trả. Ô nào chưa điền thì **giữ nguyên chữ [NGƯỜI BÁN ĐIỀN], đừng xuất bản khi còn ô trống**, và đừng đoán thay người bán. Không đặt CTA ở đây.

---

## 9. Nghệ nhân

**Nội dung thật**

### Ai làm chiếc ví của bạn

Ví là món khó ẩn lỗi nhất trong nghề da: nó mỏng, gập vào mở ra mỗi ngày, và mọi đường khâu đều nằm trong tầm mắt. Nên xưởng để bạn biết tên người làm.

- **[NGƯỜI BÁN ĐIỀN: tên]** — [NGƯỜI BÁN ĐIỀN: vai trò, ví dụ thợ chính khâu tay]. Phụ trách: gọt mép, vát cạnh, khâu tay đường viền ví. Một câu của người này: *[NGƯỜI BÁN ĐIỀN: một câu người này thật sự nói về việc mình làm]*
- **[NGƯỜI BÁN ĐIỀN: tên]** — [NGƯỜI BÁN ĐIỀN: vai trò]. Phụ trách: chọn và cắt da, đảm bảo thớ da hai mặt ví cân nhau. Một câu: *[NGƯỜI BÁN ĐIỀN]*
- **[NGƯỜI BÁN ĐIỀN: tên]** — phụ trách khắc tên và dập nhiệt. Một câu: *[NGƯỜI BÁN ĐIỀN]*

Xưởng ở Số 2/16 Nguyễn Bặc, Tân Sơn Hòa, TP. HCM. Bạn ghé được, xem tận tay khay da rồi hãy quyết.

**Ảnh cần**

Ba ảnh, mỗi người một tấm — chụp lúc đang làm, thấy bàn tay và dụng cụ, KHÔNG chụp kiểu ảnh thẻ. Chú thích ghi tên thật + việc đang làm trong ảnh, ví dụ *"[tên] đang gọt mép chiếc ví nam da bò"*. Nếu người bán chưa cho dùng tên, ghi *[NGƯỜI BÁN ĐIỀN: xin phép dùng tên và ảnh của thợ]* và **đừng dùng ảnh stock thay thế** — thà bỏ khối còn hơn đắp ảnh mua.

**Ghi chú dựng**

HTML thường, ảnh dùng `next/image`. Đây là khối E-E-A-T, đối thủ không có (0/3 đối thủ nêu tên nghệ nhân) nên đừng làm loãng bằng chữ chung chung. Không đặt CTA ở đây.

---

## 10. FAQ

**Nội dung thật**

**Khắc tên thì khắc được bao nhiêu chữ?**
[NGƯỜI BÁN ĐIỀN: giới hạn số ký tự, các phông chữ có sẵn, có khắc được tiếng Việt có dấu không]. Xưởng khắc bằng kỹ thuật dập nhiệt; cách làm mô tả kỹ ở bài [khắc chữ lên ví da — kỹ thuật dập nhiệt](/khac-chu-len-vi-da-ky-thuat-dap-nhiet-cao-cap/).

**Khắc tên có tính thêm tiền không, làm chậm thêm bao lâu?**
[NGƯỜI BÁN ĐIỀN: phí khắc và số ngày cộng thêm].

**Khắc rồi mà sai chữ thì sao?**
Da đã dập nhiệt thì không xoá được. Nên xưởng gửi bạn xem lại đúng chuỗi ký tự và duyệt trước khi dập. [NGƯỜI BÁN ĐIỀN: nếu lỗi do xưởng thì xử lý thế nào].

**Ví da cá sấu có giấy tờ hợp pháp không?**
[NGƯỜI BÁN ĐIỀN: có xuất giấy CITES không, xuất cho những loại da nào]. Chi tiết về loại da này ở [ví da cá sấu cao cấp](/vi-da-ca-sau-cao-cap/) và [đặt làm ví da cá sấu](/dat-lam-vi-da-ca-sau/).

**Vì sao ví nữ chênh từ 1,8 tới 28 triệu?**
Gần như toàn bộ khoảng chênh là loại da. Cùng một dáng ví, làm bằng da bò và làm bằng da cá sấu là hai con số khác nhau hẳn. Kiểu khâu và số ngăn thẻ ảnh hưởng ít hơn nhiều.

**Không biết chọn kiểu ví nào thì làm sao?**
Nhắn ảnh chiếc ví bạn đang dùng, kể chỗ nào bạn thấy bất tiện — dày quá, ít ngăn thẻ, không có ngăn tiền lẻ. Bài [hướng dẫn chọn ví da handmade cho nam](/huong-dan-cach-lua-chon-vi-da-handmade-cuc-xin-cho-nam-gioi/) đi qua đủ các dáng.

**Ví cũ của tôi sờn rồi, sửa được không hay phải làm mới?**
Nhiều trường hợp sửa được và rẻ hơn làm mới. Xem [dịch vụ sửa chữa ví da cao cấp](/dich-vu-sua-chua-vi-da-cao-cap/), gửi ảnh trước để xưởng nói thẳng nên sửa hay nên thay.

**Đặt một lô ví khắc tên làm quà cho công ty được không?**
Được. Số lượng tối thiểu và bậc giá ở bảng cam kết phía trên. Bài [ví khắc tên làm quà tặng tại TP. HCM](/vi-khac-ten-cao-cap-qua-tang-da-that-thu-cong-tai-tp-hcm/) mô tả cách xưởng chạy đơn nhiều chiếc.

**Nhận rồi mà không vừa ý thì sao?**
[NGƯỜI BÁN ĐIỀN: chính sách sửa lại / đổi trả cho hàng đặt riêng — phải khớp `/chinh-sach-hoan-tien-doi-tra/`].

**Ảnh cần**

Một ảnh: cận cảnh dòng chữ khắc trên mặt da, đọc rõ từng ký tự. Chú thích: *"Chữ dập nhiệt ăn vào da, không phai — cũng không sửa lại được, nên duyệt kỹ trước khi dập."*

**Ghi chú dựng**

Dùng `<details>` gập mở, mở sẵn câu đầu. Chín câu, chọn theo bài đã có organic trong cụm khắc tên chứ không tự nghĩ. Ngay dưới FAQ đặt điểm chạm CTA thứ tư:

```tsx
<ContactLink kind="zalo" productName="đặt làm ví da theo yêu cầu" className="..." />
```
Chữ nút: `Nhắn Zalo để nghệ nhân tư vấn`. Dòng dưới nút: *Nhắn để hỏi thôi cũng được — chưa cần quyết gì.*

---

## 11. CTA cuối + form

**Nội dung thật**

### Kể ý tưởng của bạn

Nhanh nhất là nhắn Zalo **0901 678 999** — tin nhắn đã soạn sẵn, bạn chỉ cần bấm gửi. Nếu đang không tiện nhắn, để lại số, xưởng gọi lại.

*Không cần cọc để được tư vấn.*

**Ảnh cần**

Không thêm ảnh. Khối chốt cần ít thứ gây phân tán.

**Ghi chú dựng**

Nút Zalo dùng `<ContactLink kind="zalo" productName="đặt làm ví da theo yêu cầu" />`, nút gọi dùng `kind="phone"` với `prettyPhone()`. Không viết thẻ `a href="https://zalo.me/..."` bằng tay, không tự nối chuỗi tin nhắn — `zaloLink()` đã lo.

Form: `<LeadForm productId={...} productName="đặt làm ví da theo yêu cầu" />`. **Chú ý — `LeadForm` hiện chỉ có 3 trường (name, phone, message). Form 4 trường ở mục 4 BRIEF.md là việc CẦN LÀM, chưa có:** thêm `wish` select bắt buộc, `budget` select không bắt buộc (phải có mục "Chưa rõ, nhờ shop tư vấn"), rồi mới tới phone và name, textarea cuối. Bảng `leads` không có cột cho hai trường mới → ghép vào `message` theo khuôn `Món: ... | Ngân sách: ... | Mốc: ... | Trang: ... | Mã: ... | Ghi chú KH: ...`. Đồng thời sửa lỗi 3.1: `lead-form.tsx:24` đang render `name="product_id"` nhưng `actions.ts:19` đọc `product_name` → tên sản phẩm luôn rỗng.

Chữ nút submit: `Để lại số, shop gọi lại`. Sau khối này còn khối 12, nên khối 11 không nằm ở 64px cuối trang; vẫn phải chèn `mb-20 md:mb-0` để thanh `ContactBar` trên mobile không che nút submit.

---

## 12. Case study và bài liên quan

**Nội dung thật**

### Đọc thêm trước khi quyết

Khắc tên là việc xưởng làm nhiều nhất trong nhóm ví, nên phần lớn câu khách hỏi đã được trả lời sẵn ở các bài dưới: kỹ thuật dập nhiệt, cách chọn dáng ví cho nam, ví da cá sấu và giấy tờ, ví snap, và cả trường hợp nên sửa ví cũ thay vì làm mới.

Đơn quà tặng có tên khách thật: [NGƯỜI BÁN ĐIỀN: chỉ dẫn case study khi người bán xác nhận được đơn ví cụ thể — hiện các bài case study có tên khách trên site đều thuộc cụm quà tặng doanh nghiệp, không phải cụm ví, nên KHÔNG kể lệch sang đây].

**Ảnh cần**

Không thêm ảnh — `PostList` đã có ảnh bìa từng bài.

**Ghi chú dựng**

`<PostList posts={...} />`, truyền đúng 6 slug đã kiểm chứng có thật, theo thứ tự:
`khac-ten-len-vi-da` · `khac-chu-len-vi-da-ky-thuat-dap-nhiet-cao-cap` · `vi-nam-khac-ten-thu-cong` · `dat-lam-vi-da-ca-sau` · `snap-wallet-vi-snap-cao-cap` · `dich-vu-sua-chua-vi-da-cao-cap`.

Cuối trang render `<ContactBar productName="đặt làm ví da theo yêu cầu" />` **đúng một lần** — component đã có sẵn, tự đổi hình dạng theo cỡ màn (mobile: thanh ngang dính đáy 3 ô; desktop: cột dọc mép phải). Tuyệt đối không dựng thanh liên hệ riêng.
