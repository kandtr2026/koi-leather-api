# PHẦN 2 — BẰNG CHỨNG · landing `/san-xuat-qua-tang-doanh-nghiep-va-su-kien/`

Khối 7–12. Khách đích: người mua hàng doanh nghiệp (HR, marketing, trợ lý ban giám đốc),
cần MOQ, bậc giá, hoá đơn VAT, mốc giao đúng ngày sự kiện.

---

## 7. Lưới sản phẩm

**Nội dung thật**

> ### Những món đang làm quà tặng nhiều nhất
>
> Đây là hàng thật đang có trên kệ xưởng, không phải ảnh mẫu. Đặt số lượng thì vẫn là
> những dáng này — thay màu da, thay chỉ, khắc logo và tên từng người nhận. Xem để bạn ước
> được tầm tiền một phần quà trước khi nhắn hỏi.
>
> - **Ví đựng card** — 1,8 đến 9,5 triệu, phần lớn quanh 2,8 triệu. Món được chọn nhiều
>   nhất cho quà đối tác vì mỏng, bỏ túi áo được, mặt trước đủ chỗ khắc logo.
> - **Bao da hộ chiếu** — 1,8 đến 4,2 triệu. Hợp quà cho ban lãnh đạo, khách đi công tác
>   nước ngoài, hoặc sự kiện có chủ đề du lịch.
> - **Ốp điện thoại da** — 0,8 đến 8,3 triệu. Chênh lệch nằm ở loại da: da bò thuộc thảo
>   mộc ở tầng dưới, da cá sấu ở tầng trên.
> - **Móc khoá da** — 0,3 đến 0,8 triệu. Món để phủ số lượng lớn: hội nghị, khai trương,
>   quà cho toàn thể nhân viên.
>
> Không thấy dáng bạn cần? Xưởng làm được cả sổ tay, tag vali, bao đựng thẻ nhân viên —
> nhắn Zalo mô tả là được.

**Ảnh cần** — 2 ảnh. (1) Ảnh nhóm 4 món trên nền da mộc, mỗi món một tầng giá, chú thích
"Bốn tầm tiền quà tặng, từ móc khoá tới ví card da cá sấu". (2) Ảnh cận một chiếc ví card
đã khắc logo, chú thích "Logo khắc chìm trên da bò thuộc thảo mộc — khắc thật, không in".

**Ghi chú dựng**

- `<ProductCard p={...} />` trong lưới `grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4`.
  Lấy 12 món: 4 từ `card-holder`, 3 từ `leather-passport-cover`, 3 từ `leather-phonecase`,
  2 từ `keychain-moc-khoa`.
- **Tiêu chí chọn, làm đúng đừng lệch**: mỗi danh mục lấy ít nhất một món ở nửa dưới dải
  giá và một món ở nửa trên. Khách B2B tự định vị mình bằng cách so ngân sách/đầu người với
  món rẻ nhất trên lưới; dồn toàn hàng đắt là đẩy họ thoát trang. Loại ngay 1 sản phẩm giá
  0 trong `leather-phonecase` — nó hiện "0 ₫" trên card.
- Bốn tên danh mục trong đoạn trên link tới `/san-pham/card-holder/`,
  `/san-pham/leather-passport-cover/`, `/san-pham/leather-phonecase/`,
  `/san-pham/keychain-moc-khoa/`. Không link `/san-pham/qua-tang-su-kien/` — danh mục đó
  đang 0 sản phẩm.
- Không đặt CTA ở khối này. Nút gần nhất nằm ở khối 8.

---

## 8. Bảng cam kết: giá · thời gian làm · MOQ · đổi trả

**Nội dung thật**

> ### Bốn con số bạn cần trước khi trình ngân sách
>
> Mua hàng doanh nghiệp là mua theo mốc thời gian. Bảng dưới là cam kết của xưởng, ghi ra
> để bạn đưa vào tờ trình mà không phải gọi hỏi lại.

| Hạng mục | Cam kết |
|---|---|
| Số lượng tối thiểu (MOQ) | [NGƯỜI BÁN ĐIỀN: MOQ theo từng món — móc khoá, ví card, bao passport, ốp điện thoại] |
| Bậc giá số lượng lớn | [NGƯỜI BÁN ĐIỀN: các mốc số lượng và mức giảm tương ứng] |
| Thời gian làm | [NGƯỜI BÁN ĐIỀN: số ngày làm việc, tính từ lúc duyệt mẫu hay lúc cọc] |
| Thời gian làm mẫu duyệt | [NGƯỜI BÁN ĐIỀN: bao nhiêu ngày ra mẫu, có tính phí mẫu không] |
| Đặt cọc | [NGƯỜI BÁN ĐIỀN: % cọc, thời điểm thanh toán phần còn lại] |
| Hoá đơn VAT | [NGƯỜI BÁN ĐIỀN: có/không, thời gian xuất] |
| Hình thức thanh toán | [NGƯỜI BÁN ĐIỀN: chuyển khoản công ty, hợp đồng, công nợ] |
| Bảo hành | [NGƯỜI BÁN ĐIỀN: phạm vi và thời hạn — phải khớp lời hứa "bảo dưỡng trọn đời" ở header] |
| Đổi trả hàng khắc tên | [NGƯỜI BÁN ĐIỀN: phải khớp `/chinh-sach-hoan-tien-doi-tra/`] |
| Giao hàng ngoài TP.HCM | [NGƯỜI BÁN ĐIỀN: đơn vị vận chuyển, phí, ai chịu] |

> Mốc giao cuối năm và trước Tết là hai mùa xưởng kín lịch sớm nhất. Nếu quà của bạn phải
> có mặt đúng ngày tiệc, nhắn trước để xưởng giữ chỗ trên lịch sản xuất.

**Ảnh cần** — 1 ảnh: lịch sản xuất treo tường của xưởng, có ghi tay tên đơn và mốc giao,
chú thích "Lịch sản xuất tháng — đơn quà tặng được giữ chỗ theo ngày sự kiện".

**Ghi chú dựng**

- Bảng dựng bằng HTML thật, đừng dùng ảnh — Google cần đọc được.
- CTA thứ hai đặt ngay dưới bảng:
  `<ContactLink kind="zalo" productName="đặt quà tặng doanh nghiệp bằng da" className="..." />`
  chữ nút **Hỏi MOQ và bậc giá qua Zalo**, dòng gỡ lo dưới nút: *Nhắn để hỏi thôi cũng
  được — chưa cần quyết gì.*
- Ô nào người bán chưa trả lời thì **ẩn cả dòng** trước khi xuất bản. Để nguyên chữ
  `[NGƯỜI BÁN ĐIỀN]` trên trang khách là lỗi nặng hơn thiếu thông tin.

---

## 9. Nghệ nhân

**Nội dung thật**

> ### Ai thật sự làm quà của bạn
>
> Đơn quà tặng doanh nghiệp không chạy qua dây chuyền. Một người phụ trách cắt và định
> hình, một người khâu, một người khắc logo — cùng một nhóm làm từ chiếc đầu đến chiếc
> cuối, nên chiếc thứ 300 không lệch chiếc thứ nhất.
>
> **[NGƯỜI BÁN ĐIỀN: tên] — [NGƯỜI BÁN ĐIỀN: vai trò, ví dụ thợ chính khâu tay]**
> [NGƯỜI BÁN ĐIỀN: một câu người này tự nói về công đoạn mình làm, không phải câu marketing]
>
> **[NGƯỜI BÁN ĐIỀN: tên] — [NGƯỜI BÁN ĐIỀN: vai trò, ví dụ phụ trách khắc và dập nhiệt]**
> [NGƯỜI BÁN ĐIỀN: một câu về giới hạn thật của kỹ thuật khắc — cỡ chữ nhỏ nhất, loại da
> nào không nhận nhiệt tốt]
>
> Xưởng ở Số 2/16 Nguyễn Bặc, Tân Sơn Hòa, TP. HCM. Đơn từ [NGƯỜI BÁN ĐIỀN: mốc số lượng]
> trở lên, bạn ghé xem trực tiếp mẻ đang làm.

**Ảnh cần** — 2 ảnh chân dung tại chỗ làm, người thật, đang làm việc, không nhìn ống kính,
thấy rõ bàn tay và dụng cụ. Chú thích = tên + công đoạn. **Không dùng ảnh stock** — đây là
khối E-E-A-T, ảnh mua sẵn phá hết giá trị của nó.

**Ghi chú dựng** — không CTA trong khối này. Ảnh dùng `next/image`, `sizes` hợp lý cho
mobile vì 64% khách vào bằng điện thoại.

---

## 10. FAQ

**Nội dung thật**

> ### Câu khách hàng doanh nghiệp hỏi nhiều nhất
>
> **Đặt tối thiểu bao nhiêu chiếc?**
> [NGƯỜI BÁN ĐIỀN: MOQ]. Móc khoá và ví card là hai món dễ đạt số lượng nhất; đơn dưới mức
> tối thiểu xưởng vẫn nhận nhưng tính theo giá lẻ.
>
> **Ngân sách một phần quà nên tính bao nhiêu?**
> Móc khoá da 0,3 – 0,8 triệu. Ví đựng card 1,8 – 9,5 triệu, phần lớn quanh 2,8 triệu. Bao
> hộ chiếu 1,8 – 4,2 triệu. Ốp điện thoại 0,8 – 8,3 triệu. Nói ngân sách mỗi đầu người,
> xưởng đề xuất món vừa khung — nhanh hơn là chọn món rồi mới xem giá.
>
> **Khắc logo công ty và tên riêng từng người được không?**
> Được, đó là việc xưởng làm hằng ngày. Khắc chìm trên da hoặc dập nhiệt, không phải in
> decal nên không bong. Mỗi chiếc một tên khác nhau vẫn làm được.
> [NGƯỜI BÁN ĐIỀN: giới hạn số ký tự, cỡ chữ nhỏ nhất, có phụ phí cho tên riêng không]
>
> **Có xuất hoá đơn VAT không?**
> [NGƯỜI BÁN ĐIỀN: có/không và thời điểm xuất]
>
> **Xem mẫu thật trước khi chốt cả lô được không?**
> Được, và nên làm. Xưởng làm một chiếc mẫu đúng màu da, đúng chỉ, đúng vị trí logo để bạn
> trình lên cấp trên duyệt trước khi vào sản xuất.
> [NGƯỜI BÁN ĐIỀN: thời gian làm mẫu, phí mẫu có trừ vào đơn không]
>
> **Đơn quà cuối năm và quà Tết nên đặt trước bao lâu?**
> Đây là hai mùa cao điểm, lịch xưởng kín trước ngày sự kiện khá lâu.
> [NGƯỜI BÁN ĐIỀN: mốc đặt trước tối thiểu cho mùa cuối năm và mùa Tết]
>
> **Có hộp và túi đựng để trao tại sự kiện chưa?**
> [NGƯỜI BÁN ĐIỀN: hộp/túi có sẵn hay tính riêng, có in logo lên hộp được không]
>
> **Đặt da cá sấu cho quà cấp lãnh đạo thì thủ tục thế nào?**
> Xưởng làm được, giá nằm ở tầng trên của dải. Hàng da cá sấu cần giấy tờ nguồn gốc.
> [NGƯỜI BÁN ĐIỀN: giấy tờ CITES kèm theo đơn hay không]
>
> **Nhận rồi thấy không đúng mẫu duyệt thì sao?**
> [NGƯỜI BÁN ĐIỀN: cách xử lý — làm lại, sửa, hay hoàn tiền; phải khớp
> `/chinh-sach-hoan-tien-doi-tra/`]

**Ảnh cần** — 1 ảnh: khay mẫu khắc thử nhiều cỡ chữ trên nhiều loại da, chú thích "Mẫu
khắc thử — chọn cỡ chữ trước khi vào lô".

**Ghi chú dựng** — dựng bằng `<details>` hoặc heading + đoạn, **đừng ẩn nội dung sau
JavaScript**. CTA thứ tư đặt sau câu cuối: `<ContactLink kind="zalo" productName="đặt quà
tặng doanh nghiệp bằng da" />`, chữ nút **Gửi số lượng và mốc sự kiện qua Zalo**.

---

## 11. CTA cuối + form

**Nội dung thật**

> ### Kể cho xưởng nghe về đơn quà của bạn
>
> Bạn chỉ cần ba thứ: số lượng, ngân sách mỗi phần, và ngày quà phải có mặt. Từ đó xưởng
> báo lại được món phù hợp, bậc giá và mốc giao.
>
> Nhanh nhất là nhắn Zalo — tin nhắn đã soạn sẵn, bạn chỉ cần bấm gửi. Đang trong giờ họp
> thì để lại số, xưởng gọi lại.
>
> Zalo và điện thoại 0901 678 999 · Messenger koileathercraft ·
> koi.leather19@gmail.com · Số 2/16 Nguyễn Bặc, Tân Sơn Hòa, TP. HCM.

**Ảnh cần** — 1 ảnh: một lô quà đã đóng hộp xếp chồng chờ giao, chú thích "Một lô quà đã
hoàn thiện, chờ giao trước ngày sự kiện". Đây là ảnh duy nhất trong khối, đặt trên form.

**Ghi chú dựng**

- Nút chính: `<ContactLink kind="zalo" productName="đặt quà tặng doanh nghiệp bằng da" />`,
  chữ **Bắt đầu đặt riêng**. Hai nút phụ `kind="phone"` và `kind="messenger"`.
  Số hiện qua `prettyPhone()`.
- Form: `<LeadForm productId={...} productName="đặt quà tặng doanh nghiệp bằng da" />`,
  nút **Để lại số, shop gọi lại**.
- **LeadForm hiện chỉ có 3 trường (name, phone, message) — chưa đủ.** Phải làm trước khi
  xuất bản: thêm `wish` select (bắt buộc), `budget` select (không bắt buộc, có mục "Chưa
  rõ, nhờ shop tư vấn"), giữ `phone`, `name`, textarea cuối; ghép vào `message` theo khuôn
  `Món: ... | Ngân sách: ... | Mốc: ... | Trang: ... | Mã: ... | Ghi chú KH: ...`. Với
  landing B2B, mục `wish` nên có sẵn "Quà tặng số lượng lớn" và `budget` nên tính theo mỗi
  phần quà, không phải tổng đơn.
- `main` có `pb-16 md:pb-0` → **khối 12 nằm dưới khối 11**, nhờ đó form không rơi vào 64px
  cuối trang và không bị `ContactBar` che trên mobile.
- `<ContactBar productName="đặt quà tặng doanh nghiệp bằng da" />` render **đúng một lần**
  ở cuối trang. Tuyệt đối không dựng thanh liên hệ riêng.

---

## 12. Case study và bài liên quan

**Nội dung thật**

> ### Những đơn xưởng đã làm
>
> Tên dưới đây là khách thật, mỗi đơn có một bài riêng kể loại da đã chọn, cách khắc và
> mốc giao. Đọc để hình dung đơn của bạn sẽ chạy thế nào.
>
> - MobiFone · CGV · Bentley · Vasta Stone · Tập đoàn Lộc Trời · Vingroup · Cao Fine
>   Jewellery · Tập đoàn Nam Long
>
> Đang lên kế hoạch quà theo mùa? Xem thêm quà cuối năm, quà Tết doanh nghiệp, quà 20/10
> và quà tri ân thầy cô 20/11.

**Ảnh cần** — 1 ảnh: cận cảnh logo một khách đã khắc trên da (chọn khách đã đồng ý cho
dùng hình), chú thích "Logo khách hàng khắc chìm trên da — mỗi đơn một khuôn riêng".
[NGƯỜI BÁN ĐIỀN: đã có văn bản cho phép dùng tên và logo khách chưa]

**Ghi chú dựng**

- `<PostList posts={...} />` với **đúng** các slug sau, mỗi slug ở `/{slug}/`:
  `qua-tang-doanh-nghiep-mobifone`, `qua-tang-su-kien-cgv`, `qua-tang-su-kien-bentley`,
  `qua-tang-su-kien-doc-dao-vasta-stone`, `qua-tang-su-kien-tap-doan-loc-troi`,
  `qua-tang-doanh-nghiep-tap-doan-vingroup`, `qua-tang-doanh-nghiep-cao-fine-jewellery`,
  `qua-tang-doanh-nghiep-tap-doan-bds-nam-long`.
- Slug Nam Long là `qua-tang-doanh-nghiep-tap-doan-bds-nam-long` (có `bds` ở giữa), không
  phải `qua-tang-doanh-nghiep-tap-doan-nam-long`. Kiểm lại trước khi build.
- Khối mùa vụ: `PostList` thứ hai với `qua-tang-doanh-nghiep-cuoi-nam`,
  `qua-tet-doanh-nghiep`, `qua-tang-20-10`, cộng trang tĩnh
  `/qua-tang-thay-co-ngay-20-11/`. `qua-tang-doanh-nghiep-cuoi-nam` là trang đang giữ
  traffic quảng cáo — chỉ thêm link, **không đổi title của nó**.
- Không CTA sau khối này; `ContactBar` đã đảm nhiệm.
