# /day-da-dong-ho/ — PHẦN 2: BẰNG CHỨNG (khối 7–12)

> URL giữ nguyên `/day-da-dong-ho/`. Trang đang có 43.526 ký tự nội dung cũ.
> Phần 2 thay thế toàn bộ đoạn liệt kê chất liệu lặp lại và các đoạn "cam kết" không số ở
> nửa dưới trang cũ. Giữ lại: ảnh sản phẩm thật, các đoạn nói về loại da cụ thể (dồn về
> khối 5 ở phần 1), mọi link nội bộ sang cụm bài thay dây.

---

## 7. Lưới sản phẩm

**Nội dung thật**

### Dây đã làm rồi — xem để hình dung dây của bạn

Đây là những mẫu đang có sẵn tại xưởng. Khách đặt riêng thường bắt đầu bằng cách chỉ vào
một mẫu ở đây rồi nói "giống cái này nhưng đổi màu chỉ", hoặc "giữ kiểu khâu này, làm cho
mặt 20mm của tôi". Dây trong lưới là dây đã hoàn thiện theo cỡ tiêu chuẩn; dây đặt riêng
được cắt theo số đo cổ tay và đúng khoảng càng của đồng hồ bạn đang mang.

Dải giá dây da đồng hồ tại xưởng: 1,4 triệu đến 7,4 triệu, phần lớn quanh 2,2 triệu.
Chênh nhau nằm ở loại da và cách khâu, không nằm ở việc dây "cho đồng hồ đắt hay rẻ".
Nếu cần cả hộp đựng đồng hồ, xưởng có một mẫu watch case 3,8 triệu.

Xem hết 43 mẫu dây tại [dây da đồng hồ](/san-pham/day-da-dong-ho/) ·
[hộp đựng đồng hồ](/san-pham/watch-case/)

**Ảnh cần**

- Không thêm ảnh rời: ProductCard đã tự lấy ảnh bìa của từng món. 0 sản phẩm ACTIVE nào
  thiếu ảnh nên lưới không bị ô trống.
- Một ảnh ngang duy nhất trên tiêu đề khối: 6–8 dây xếp cạnh nhau trên mặt gỗ, thấy rõ
  khác biệt màu chỉ và độ dày. Chú thích: "Cùng một kiểu dây, sáu loại da khác nhau."

**Ghi chú dựng**

- `<ProductCard p={...} />` trong lưới `grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4`.
  Card tự link `/cua-hang/{slug}/`.
- Lấy 8 món: query danh mục `day-da-dong-ho` (43 SP ACTIVE) qua `categoryLinks`, cộng món
  duy nhất của `watch-case`. **Loại bỏ 1 SP giá 0** của `day-da-dong-ho` — không được để
  ô "0 ₫" lên lưới.
- Tiêu chí chọn, ghi cho người dựng làm đúng: **trải giá, không dồn hàng đắt.** 2 món quanh
  1,4–1,8 triệu · 3 món quanh 2,2 triệu (nơi phần lớn khách rơi vào) · 2 món 3,5–5 triệu ·
  1 món 7,4 triệu để neo trên. Khách phải tự định vị được mình ở đâu trong dải giá ngay
  trong một khung nhìn; lưới toàn hàng 7 triệu làm khách nghĩ mình không mua nổi rồi thoát.
- Không đặt CTA trong khối này — khách đang so mẫu.

---

## 8. Bảng cam kết: giá · thời gian làm · MOQ · đổi trả

**Nội dung thật**

### Những gì xưởng cam kết bằng chữ

| Hạng mục | Cam kết |
|---|---|
| Khoảng giá dây da đồng hồ | 1,4 – 7,4 triệu; phần lớn quanh 2,2 triệu |
| Thời gian làm dây da bò / da dê | [NGƯỜI BÁN ĐIỀN: số ngày làm việc] |
| Thời gian làm dây da cá sấu, da đà điểu | [NGƯỜI BÁN ĐIỀN: số ngày làm việc] |
| Đặt cọc | [NGƯỜI BÁN ĐIỀN: % cọc, cọc bằng cách nào] |
| Tư vấn, xem mẫu da, đo size | Không mất phí, không cần cọc |
| Bảo hành | [NGƯỜI BÁN ĐIỀN: bảo hành gì, bao lâu, gồm và không gồm cái gì] |
| "Bảo dưỡng trọn đời" trên header | [NGƯỜI BÁN ĐIỀN: định nghĩa cho đúng — hiện chưa trang nào giải thích] |
| Đổi trả hàng đặt riêng | [NGƯỜI BÁN ĐIỀN: phải khớp /chinh-sach-hoan-tien-doi-tra/] |
| Sai số đo do xưởng | [NGƯỜI BÁN ĐIỀN: làm lại miễn phí hay sửa] |
| Số lượng tối thiểu khi đặt cho doanh nghiệp | [NGƯỜI BÁN ĐIỀN: MOQ + bậc giá] |
| Giấy tờ da cá sấu / kỳ đà / trăn | [NGƯỜI BÁN ĐIỀN: có xuất CITES không, mất bao lâu] |
| Thời gian trả lời Zalo | [NGƯỜI BÁN ĐIỀN: trong giờ nào] |

**Ảnh cần**

Một ảnh: phiếu đặt hàng viết tay của xưởng có ghi số đo và ngày hẹn, chụp cùng cây bút.
Chú thích: "Mỗi đơn đặt riêng đều có phiếu ghi số đo — bạn giữ một bản." Chỉ dùng ảnh này
nếu xưởng thật sự làm phiếu; không có thì bỏ ảnh, đừng dựng cảnh.

**Ghi chú dựng**

Bảng hai cột, không icon. Ô nào còn `[NGƯỜI BÁN ĐIỀN]` thì **xoá cả dòng trước khi xuất
bản** — thà bảng ngắn 6 dòng có thật còn hơn 12 dòng nửa rỗng. Không đặt CTA ngay sau bảng
(CTA đã đứng sau khối giá và khối quy trình ở phần 1).

---

## 9. Nghệ nhân

**Nội dung thật**

### Ai làm dây của bạn

Dây da đồng hồ là món khó nhất trong đồ da nhỏ: sai nửa milimet ở càng là dây không vào,
lệch một mũi khâu là thấy ngay vì dây nằm sát mắt người nhìn. Ở xưởng, mỗi cây dây đi qua
tay có tên, không qua dây chuyền.

- **[NGƯỜI BÁN ĐIỀN: tên]** — [NGƯỜI BÁN ĐIỀN: vai trò, ví dụ thợ chính khâu tay yên ngựa].
  Làm khâu: [NGƯỜI BÁN ĐIỀN: cắt da / vát cạnh / khâu / đánh cạnh].
  Câu của người này: "[NGƯỜI BÁN ĐIỀN: một câu về việc mình làm, nói như nói với khách,
  không phải khẩu hiệu]"
- **[NGƯỜI BÁN ĐIỀN: tên]** — [NGƯỜI BÁN ĐIỀN: vai trò]. Làm khâu: [NGƯỜI BÁN ĐIỀN].
  Câu của người này: "[NGƯỜI BÁN ĐIỀN]"

Xưởng ở Số 2/16 Nguyễn Bặc, Tân Sơn Hòa, TP. HCM. Khách muốn xem người làm việc thì hẹn
trước rồi ghé.

**Ảnh cần**

Mỗi nghệ nhân một ảnh chân dung đang làm việc, chụp ngang tầm mắt, thấy tay và dụng cụ,
**không** chụp kiểu ảnh thẻ. Cộng một ảnh cận bàn tay đang khâu yên ngựa hai kim trên một
cây dây kẹp trong pony. Chú thích ảnh cận: "Khâu tay hai kim — mũi đứt một chỗ, các mũi
còn lại vẫn giữ."

**Ghi chú dựng**

Khối E-E-A-T, ảnh thật là toàn bộ giá trị — ảnh stock làm mất luôn tác dụng. Nếu người bán
chưa cho tên, **giữ khối nhưng dùng ảnh và mô tả khâu việc**, tuyệt đối không bịa tên.
Tên ở đây sau đó dùng lại trong JSON-LD `Service.provider.employee` (xem phần 3).

---

## 10. FAQ

**Nội dung thật**

### Khách hỏi nhiều nhất

**Tôi không biết cỡ dây của mình, đo thế nào?**
Đo hai số: khoảng cách giữa hai càng đồng hồ (tính bằng mm) và chu vi cổ tay. Xưởng có bài
hướng dẫn đo tại nhà kèm hình: [cách đo size dây đồng hồ](/cach-do-size-day-dong-ho-cuc-chuan-chinh-xac-phu-hop-voi-moi-loai-dong-ho/).
Không đo được thì nhắn Zalo ảnh đồng hồ chụp thẳng từ trên, xưởng đọc giúp.

**Đồng hồ tôi hàng hiệu, dây đặt riêng có vào đúng không?**
Vào, miễn bạn cho đúng số đo càng. Xưởng đã viết riêng bài hướng dẫn thay dây cho từng
dòng đồng hồ phổ biến — xem [thay dây đồng hồ](/thay-day-dong-ho/) rồi tìm dòng máy của
bạn. Với đồng hồ có càng liền hoặc chốt lạ, gửi ảnh trước để xưởng xem có làm được không.

**Vì sao dây ở đây đắt hơn dây bán sẵn?**
Vì da và công. Dây ở xưởng khâu tay, cắt theo số đo của bạn, dùng da nguyên miếng chọn theo
tấm. Dải giá 1,4 – 7,4 triệu, phần lớn quanh 2,2 triệu — chênh nhau gần như hoàn toàn do
loại da: da bò và da dê ở dưới, da cá sấu ở trên.

**Dây da cá sấu có giấy tờ không?**
[NGƯỜI BÁN ĐIỀN: có xuất giấy CITES hay không, cho loại nào, mất bao lâu]. Về đặc tính từng
loại da, đọc [da cá sấu thật](/da-ca-sau-that/) và [da đà điểu](/da-da-dieu/).

**Con đĩa (khoá) cũ của tôi bị lỏng, có sửa được không?**
Được, đây là việc xưởng làm thường xuyên — xem [dịch vụ sửa con đĩa dây đồng
hồ](/dich-vu-sua-con-dia-day-dong-ho/). Nhiều khách sửa con đĩa rồi mới đặt dây mới, vì
khoá nguyên bản của đồng hồ thường dùng lại được trên dây mới.

**Khâu tay khác khâu máy chỗ nào?**
Khâu máy dùng một sợi chỉ nối liền: đứt một mũi là cả đường chỉ tuột dần. Khâu tay yên ngựa
dùng hai kim thắt nút từng mũi, đứt một mũi thì các mũi bên cạnh vẫn giữ. Dây đồng hồ đeo
hằng ngày, cọ mồ hôi và cạnh áo, nên xưởng khâu tay.

**Làm bao lâu thì có dây?**
[NGƯỜI BÁN ĐIỀN: số ngày cho da bò/da dê, số ngày cho da cá sấu]. Xưởng chốt ngày hẹn ngay
lúc nhận số đo, không hẹn kiểu "khoảng vài tuần".

**Làm xong mà tôi không vừa ý thì sao?**
Nếu lỗi thuộc về xưởng — sai số đo đã ghi trong phiếu, sai màu da đã chốt, đường khâu không
đạt — xưởng chịu trách nhiệm: [NGƯỜI BÁN ĐIỀN: làm lại / sửa / hoàn tiền, trong bao lâu].
Riêng dây đã cắt theo số đo cổ tay của bạn thì không thể bán lại cho người khác, nên chính
sách đổi trả khác hàng có sẵn: [NGƯỜI BÁN ĐIỀN, phải khớp /chinh-sach-hoan-tien-doi-tra/].

**Ảnh cần**

Một ảnh cận đầu dây đã lắp vào càng đồng hồ, thấy chốt và độ khít. Chú thích: "Đầu dây
được vát đúng bề rộng càng — hở một chút là thấy ngay ở khoảng cách đeo."

**Ghi chú dựng**

8 câu, mở sẵn (không accordion đóng — mobile 64% khách, accordion làm khách bỏ lỡ câu trả
lời). Sau câu cuối đặt điểm chạm CTA thứ tư:
`<ContactLink kind="zalo" productName="đặt làm dây da đồng hồ theo yêu cầu" className="..." />`
với chữ nút **Nhắn Zalo để nghệ nhân tư vấn**, dòng dưới nút: *Nhắn để hỏi thôi cũng được —
chưa cần quyết gì.*

---

## 11. CTA cuối + form

**Nội dung thật**

### Kể ý tưởng của bạn

Bạn cho xưởng ba thứ: đồng hồ đang mang, khoảng tiền bạn nghĩ tới, và cái bạn muốn khác đi
so với dây hiện tại. Xưởng nói lại được loại da nào hợp, giá bao nhiêu, bao lâu xong. Chưa
cần quyết gì ở bước này, và không cần cọc để được tư vấn.

Nhanh nhất là Zalo — nhắn kèm ảnh đồng hồ chụp thẳng từ trên. Không tiện nhắn thì để lại
số, xưởng gọi lại.

Gọi hoặc Zalo: 0901 678 999 · Messenger: koileathercraft · Email: koi.leather19@gmail.com
Xưởng: Số 2/16 Nguyễn Bặc, Tân Sơn Hòa, TP. HCM

**Ảnh cần**

Không ảnh. Khối chốt đơn phải sạch: một tiêu đề, hai câu, một nút, một form.

**Ghi chú dựng**

- Nút chính: `ContactLink kind="zalo"` `productName="đặt làm dây da đồng hồ theo yêu cầu"` —
  chữ nút **Bắt đầu đặt riêng**. Không viết `a href="https://zalo.me/..."` bằng tay; chuỗi
  tin nhắn do `zaloLink()` sinh, kèm mã tư vấn nếu khách đến từ quảng cáo.
- Form: `<LeadForm productName="Đặt làm dây da đồng hồ theo yêu cầu" />`. Đây là trang dịch
  vụ nên không có `productId` — dev xử lý `productId` rỗng, đừng gán id của một cây dây bất kỳ.
  Nút phụ ghi **Để lại số, shop gọi lại**.
- **VIỆC PHẢI LÀM, chưa có:** `LeadForm` hiện chỉ có 3 trường (name, phone, message). Form 4
  trường theo mục 4 BRIEF.md (`wish` bắt buộc · `budget` không bắt buộc, có mục "Chưa rõ, nhờ
  shop tư vấn" · `phone` · `name` · textarea cuối) **cần được thêm**. Bảng `leads` không có
  cột cho món/ngân sách → ghép vào `message` theo khuôn cố định.
  Kèm lỗi chặn 3.1: `lead-form.tsx:24` đang render `name="product_id"` trong khi
  `actions.ts:19` đọc `product_name` → tên sản phẩm luôn rỗng, phải sửa trước khi trang lên.
- `main` có `pb-16 md:pb-0` → **chừa 64px cuối trang trống**, đặt khối 12 phía dưới khối 11
  để nút và form không bị `ContactBar` che trên điện thoại.
- `<ContactBar productName="đặt làm dây da đồng hồ theo yêu cầu" />` render **đúng một lần**
  ở cuối trang. Không dựng thanh liên hệ riêng.

---

## 12. Case study và bài liên quan

**Nội dung thật**

### Một đơn cụ thể

[NGƯỜI BÁN ĐIỀN — khuôn cần điền, mỗi ô một câu, chỉ dùng đơn thật:
đồng hồ khách mang (hãng, đường kính, cỡ càng mm) · khách muốn gì và vì sao dây cũ không
đạt · loại da đã chọn và lý do chọn · số ngày làm · một câu khách nói lại sau khi nhận ·
ảnh trước và sau. Nếu khách không cho nêu tên thì ghi "khách ở Quận …" — đừng bịa tên.]

Xưởng chưa có case study dây đồng hồ nào được khách đồng ý công bố. **Chưa có thì để trống
khối này, không viết chuyện giả.** Đổi lại, phần dưới là những gì xưởng đã viết ra về dây da
đồng hồ — đọc trước khi đặt cũng đủ hiểu xưởng làm việc thế nào.

### Đọc thêm về dây da đồng hồ

**Ảnh cần**

Nếu có case study: bắt buộc một cặp ảnh trước – sau, cùng góc, cùng ánh sáng. Chú thích ảnh
sau ghi loại da và cỡ càng. Không có case study thì khối này không cần ảnh.

**Ghi chú dựng**

- `<PostList posts={...} />` với đúng 5 bài đã kiểm chứng có thật:
  `lam-day-da-dong-ho-handmade-theo-yeu-cau-koi-leather` ·
  `cach-do-size-day-dong-ho-cuc-chuan-chinh-xac-phu-hop-voi-moi-loai-dong-ho` ·
  `thay-day-dong-ho` · `dich-vu-sua-con-dia-day-dong-ho` · `da-ca-sau-that`.
- **Không** đưa `thay-day-da-dong-ho-hermes` vào PostList: bài có cờ thương hiệu, không nhắm
  và không link nổi bật từ landing.
- Cụm 25 bài `thay-day-da-dong-ho-{hãng}` link **một chiều vào landing này** (mỗi bài thêm
  một khối "Đặt làm dây riêng"), landing không liệt kê ngược 25 hãng — liệt kê ra là biến
  khối này thành bảng link và loãng chủ đề. Chi tiết ở phần 3.
- Đặt khối này **sau** khối 11 để 64px cuối trang không nằm dưới nút CTA.
