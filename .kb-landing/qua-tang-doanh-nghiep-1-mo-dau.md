# Landing "Quà tặng doanh nghiệp & sự kiện" — PHẦN 1 (khối 0–6)

## 0. Thẻ meta và phân vai

- **URL (giữ nguyên, không tạo mới, không 301):** `/san-xuat-qua-tang-doanh-nghiep-va-su-kien/`
- **H1:** Sản xuất quà tặng doanh nghiệp và sự kiện bằng da thật, khắc tên theo yêu cầu
- **Title (58 ký tự):** `Đặt quà tặng doanh nghiệp bằng da khắc tên | KOI Leather`
- **Meta description (152 ký tự):** `Xưởng da thủ công TP.HCM nhận sản xuất quà tặng doanh nghiệp: ví card, bao passport, móc khoá, ốp da. Có khoảng giá thật, khắc logo, giao đúng mốc sự kiện.`
- **Từ khoá đích:** sản xuất quà tặng doanh nghiệp bằng da · quà tặng doanh nghiệp cao cấp khắc tên · quà tặng sự kiện bằng da thật · đặt quà tặng doanh nghiệp số lượng lớn.

### Bảng phân vai (chống tự cắn từ khoá)

| | Landing này | `/san-pham/card-holder/` (và `/leather-passport-cover/`, `/keychain-moc-khoa/`, `/leather-phonecase/`) | `/qua-tang-doanh-nghiep-va-su-kien/` (22.418 ký tự) | `/qua-tang-doanh-nghiep-cuoi-nam/` |
|---|---|---|---|---|
| Vai | Ý định **dịch vụ B2B**: sản xuất theo đơn, khắc logo, MOQ, VAT, mốc giao | Duyệt **hàng có sẵn** | Không nên tồn tại song song | Bài **mùa vụ cuối năm** |
| H1 | Sản xuất quà tặng doanh nghiệp… | Tên danh mục (Ví đựng thẻ / Bao da passport…) | — | Giữ nguyên |
| Từ khoá | "sản xuất/đặt quà tặng doanh nghiệp bằng da", "số lượng lớn" | "ví đựng thẻ da", "bao da passport" | — | "quà tặng doanh nghiệp cuối năm" |
| Nội dung | Văn dài, quy trình, chất liệu, cam kết, case study | Mô tả ngắn + lưới sản phẩm, **không viết văn dài** | — | Giữ thân bài mùa vụ |
| Link chéo | Trỏ xuống 4 danh mục trên | Mỗi danh mục thêm một dòng "Đặt số lượng lớn cho doanh nghiệp →" trỏ về landing | — | **Chỉ thêm một link trỏ lên landing** |

**Xử lý trang gần trùng `/qua-tang-doanh-nghiep-va-su-kien/`:** hai trang cùng ý định, đang chia đôi tín hiệu. Đề xuất: giữ URL, **rút ngắn** trang thứ hai thành trang giới thiệu bộ sưu tập quà tặng (giữ ảnh + danh sách món, bỏ toàn bộ đoạn trùng về dịch vụ, quy trình, chất liệu), đặt `canonical` của nó về chính nó nhưng thêm một liên kết nổi bật ở đầu trang: "Đặt sản xuất theo yêu cầu →" trỏ về landing. **Không 301** — dữ liệu traffic mới sống 1,5 ngày nên "0 organic" là *chưa đo*, không phải trang chết.

**⚠ TUYỆT ĐỐI KHÔNG đổi title `/qua-tang-doanh-nghiep-cuoi-nam/`** — trang đó đang nhận 13 khách Google và 14/40 cú bấm quảng cáo, là chỗ thất thoát tiền quảng cáo lớn nhất. Chỉ thêm link trỏ lên landing này.

**Nội dung cũ 39.470 ký tự — giữ gì, bỏ gì:**
- **Giữ:** mọi ảnh sản phẩm đã có (không SP nào thiếu ảnh); các đoạn kể về khách doanh nghiệp thật; phần liệt kê món quà.
- **Bỏ:** các đoạn giới thiệu chung về thương hiệu lặp lại, mọi câu nêu số năm kinh nghiệm (site đang tự mâu thuẫn 2017 / "hơn 7 năm" / "hơn 10 năm"), mọi lời hứa không có số kèm.
- **⚠ Đọc Google Search Console (dữ liệu 16 tháng) trước khi đổi title.** Nếu title hiện tại "Sản xuất quà tặng Doanh Nghiệp và Sự Kiện" đang có impression tốt, chỉ thêm phần sau dấu `|`, đừng viết lại đầu title.

---

## 1. Hero

**Nội dung thật**

# Sản xuất quà tặng doanh nghiệp và sự kiện bằng da thật, khắc tên theo yêu cầu

Xưởng da thủ công tại TP.HCM. Bạn gửi số lượng, logo và ngày sự kiện — chúng tôi báo giá theo bậc số lượng và chốt mốc giao.

> [Nhắn Zalo để nghệ nhân tư vấn]
>
> Nhắn để hỏi thôi cũng được — chưa cần quyết gì.

**Ảnh cần** — **ảnh LCP, đúng một ảnh trên khung nhìn đầu.** Ảnh chụp trên bàn gỗ: một lô ví đựng thẻ và bao passport cùng màu xếp thành hàng, mỗi cái đã dập tên khác nhau. Chú thích: "Một lô ví đựng thẻ dập tên riêng từng người, chuẩn bị cho một hội nghị khách hàng."

**Ghi chú dựng** — nút dùng `<ContactLink kind="zalo" productName="đặt quà tặng doanh nghiệp bằng da" className="..." />`. Không viết `a href="https://zalo.me/..."` bằng tay. Đây là điểm chạm CTA thứ 1/5.

---

## 2. Mở đầu

**Nội dung thật**

Quà tặng doanh nghiệp bằng da khó ở chỗ nó phải giống nhau ở dáng và khác nhau ở tên. Sáu mươi cái ví đựng thẻ phải cùng một sắc da, cùng một đường chỉ, nhưng mỗi cái dập một tên. Đó là việc xưởng thủ công làm được mà dây chuyền in ép không làm được — và cũng là lý do chúng tôi tính giá theo món, không theo cân.

Chúng tôi nhận sản xuất bốn nhóm món hay được chọn nhất cho doanh nghiệp và sự kiện: ví đựng thẻ, bao da passport, móc khoá da, và ốp da điện thoại. Cùng với đó là khắc tên người nhận, dập logo công ty, và làm hộp đựng cho từng phần quà. Nếu công ty bạn cần một món chưa có trong danh sách — sổ tay, tag vali, bao đựng thẻ nhân viên — cứ nói, xưởng làm rập mới được.

Việc bạn cần biết trước khi nhắn: số lượng dự kiến, món muốn làm, ngày phải có quà trong tay, và công ty có cần hoá đơn VAT hay không. Bốn thông tin đó đủ để chúng tôi báo giá lần đầu.

**Ảnh cần** — Ảnh cận cảnh mặt sau một chiếc ví da đã dập logo công ty chìm, ánh sáng chếch để thấy độ sâu vết dập. Chú thích: "Logo dập chìm trên da, không phải in — không bong theo thời gian."

**Ghi chú dựng** — Thuần văn bản, không CTA (CTA kế tiếp nằm sau khối giá).

---

## 3. Khoảng giá

**Nội dung thật**

Đây là giá bán lẻ từng món đang có tại xưởng, để bạn ước lượng ngân sách trước khi nhắn. Bậc giá cho đơn số lượng lớn thấp hơn, tính riêng theo từng đơn.

| Món | Khoảng giá | Mức phổ biến |
|---|---|---|
| Ví đựng thẻ (card holder) | 1,8 – 9,5 triệu | 2,8 triệu |
| Bao da passport | 1,8 – 4,2 triệu | 2,8 triệu |
| Móc khoá da | 300.000 – 800.000đ | 500.000đ |
| Ốp da điện thoại | 800.000 – 8,3 triệu | 2,8 triệu |

Vì sao cùng một món mà chênh tới bốn, năm lần:

- **Loại da.** Một chiếc ví đựng thẻ da bò thuộc thảo mộc và một chiếc cùng dáng làm từ da cá sấu chênh nhau phần lớn ở giá tấm da, không phải ở công.
- **Da khâu tay hay khâu máy.** Khâu tay bằng chỉ lanh sáp, mỗi mũi hai kim, tốn nhiều giờ hơn và bền hơn ở góc.
- **Khoá và phụ kiện.** Khoá mạ thường và khoá đặt riêng theo mẫu của công ty bạn là hai mức giá khác nhau.
- **Kích cỡ và số ngăn.** Thêm một ngăn là thêm một lớp da lót, một đường lược, một lần vê cạnh.
- **Mức cá nhân hoá.** Dập chung một logo cho cả lô rẻ hơn dập tên riêng từng người.

`[NGƯỜI BÁN ĐIỀN: bậc giá theo số lượng — ví dụ 20–49 cái, 50–99, 100+ giảm bao nhiêu %]`

> [Nhắn Zalo nhận báo giá theo số lượng]
>
> Gửi số lượng và món, shop báo giá bậc — không cần cọc để được tư vấn.

**Ảnh cần** — Ảnh ba chiếc ví đựng thẻ cùng dáng, ba loại da khác nhau, đặt cạnh nhau. Chú thích: "Cùng một rập, ba loại da — chênh giá nằm ở đây."

**Ghi chú dựng** — CTA điểm chạm 2/5, `<ContactLink kind="zalo" productName="báo giá quà tặng doanh nghiệp theo số lượng" />`.

---

## 4. Quy trình 4–6 bước

**Nội dung thật**

**Bước 1 — Bạn gửi yêu cầu.** Nhắn Zalo bốn thông tin: món, số lượng dự kiến, ngày phải có quà, có cần hoá đơn VAT hay không. Nếu đã có logo, gửi luôn file vector (.ai, .eps hoặc .pdf); ảnh chụp logo từ file Word không dập được. `[NGƯỜI BÁN ĐIỀN: thời gian phản hồi Zalo]`

**Bước 2 — Chọn da và chốt báo giá.** Xưởng gửi ảnh các tấm da đang có kèm giá theo bậc số lượng. **Việc của bạn:** chọn màu da và màu chỉ, xác nhận số lượng cuối. Nếu công ty cần xem da thật trước, hẹn qua xưởng ở Số 2/16 Nguyễn Bặc, Tân Sơn Hòa, TP. HCM. `[NGƯỜI BÁN ĐIỀN: thời gian báo giá]`

**Bước 3 — Làm mẫu duyệt.** Xưởng làm một cái hoàn chỉnh, đúng da đúng khoá đúng vị trí logo. **Việc của bạn:** duyệt hoặc yêu cầu sửa bằng văn bản trên Zalo — sửa sau khi đã vào sản xuất lô sẽ phát sinh chi phí. `[NGƯỜI BÁN ĐIỀN: thời gian làm mẫu, số lần sửa mẫu miễn phí]`

**Bước 4 — Bạn gửi danh sách tên.** Nếu dập tên riêng, gửi danh sách dưới dạng bảng, đúng chính tả và đúng dấu. **Đây là bước hay làm chậm cả đơn nhất** — xưởng không thể vào sản xuất khi danh sách còn thiếu người. `[NGƯỜI BÁN ĐIỀN: giới hạn số ký tự khắc được]`

**Bước 5 — Sản xuất lô.** Cắt, lược, khâu, vê cạnh, dập tên. **Việc của bạn:** không có, ngoài việc giữ liên lạc để xưởng gửi ảnh tiến độ. `[NGƯỜI BÁN ĐIỀN: thời gian sản xuất theo bậc số lượng]`

**Bước 6 — Nghiệm thu và giao.** Xưởng gửi ảnh toàn lô trước khi đóng gói để bạn đối chiếu danh sách tên. **Việc của bạn:** xác nhận đủ số lượng và đúng tên trước khi xuất kho. `[NGƯỜI BÁN ĐIỀN: điều kiện xuất hoá đơn VAT, hình thức giao]`

**Ảnh cần** — Bốn ảnh thật có bàn tay: bàn tay đặt rập lên tấm da; bàn tay khâu hai kim; bàn tay vê cạnh bằng con lăn; bàn tay xếp lô hàng thành phẩm vào hộp. Chú thích ảnh cuối: "Đối chiếu danh sách tên trước khi đóng hộp."

**Ghi chú dựng** — CTA điểm chạm 3/5 ngay sau bước 6: `<ContactLink kind="zalo" productName="đặt quà tặng doanh nghiệp bằng da" />`, chữ nút "Kể ý tưởng của bạn".

---

## 5. Bảng chất liệu

**Nội dung thật**

Da quyết định phần lớn giá và phần lớn cảm giác khi khách nhận quà. Dưới đây là những loại xưởng dùng nhiều nhất cho đơn doanh nghiệp, kèm bài giải thích riêng cho từng loại nếu bạn muốn đọc kỹ trước khi chọn.

| Loại da | Phù hợp món nào | Đặc điểm cần biết |
|---|---|---|
| [Da Togo](/da-togo/) | Ví đựng thẻ, bao passport | Hạt da nổi rõ, chịu xước tốt — chọn khi quà sẽ bị dùng hằng ngày. Xem thêm: [Da Togo có bền không](/da-togo-co-ben-khong/) |
| [Da Epsom](/da-epsom-la-gi/) | Ví đựng thẻ, ốp điện thoại | Vân dập đều, giữ nếp gọn, dập logo lên rất sắc nét |
| [Da dê Alran](/da-de-alran/) | Bao passport, ví mỏng | Mềm, nhẹ, mặt da mịn — [da dê thuộc](/da-de-thuoc/) là lựa chọn cho món cần mỏng |
| [Da cá sấu thật](/da-ca-sau-that/) | Quà tặng cấp lãnh đạo, số lượng ít | Đắt nhất, đẹp nhất. `[NGƯỜI BÁN ĐIỀN: giấy tờ CITES]` |
| [Da đà điểu](/da-da-dieu/) | Món quà muốn khác biệt | Vân nốt chân lông đặc trưng, so sánh tại [da cá sấu và da đà điểu](/da-ca-sau-va-da-da-dieu/) |

Hai bài nên đọc nếu bạn đang cân giữa các lựa chọn: [So sánh da cừu và da dê](/so-sanh-da-cuu-va-da-de/) và [Da Togo vs da Clemence](/da-togo-vs-da-clemence/). Nếu muốn hiểu sâu hơn cách chọn, có bài [Kiến thức cần biết khi chọn đồ da thủ công](/kien-thuc-can-biet-khi-chon-do-da-thu-cong/).

**Ảnh cần** — Ảnh trên xuống, năm mẩu da của năm loại trên xếp thành dải, có thẻ tên nhỏ đặt cạnh từng mẩu. Chú thích: "Năm loại da dùng nhiều nhất cho đơn quà tặng doanh nghiệp."

**Ghi chú dựng** — **Không đặt CTA trong hay ngay sau khối này** — khách đang đọc để học, chen nút vào là cắt mạch. Bảng phải cuộn ngang được trên điện thoại (64% khách là mobile).

---

## 6. Thông số + một câu hạn chế thật thà

**Nội dung thật**

**Thông số**

- Xưởng: Số 2/16 Nguyễn Bặc, Tân Sơn Hòa, TP. HCM. `[NGƯỜI BÁN ĐIỀN: giờ mở cửa]`
- Zalo / điện thoại: 0901 678 999 · Messenger: koileathercraft · Email: koi.leather19@gmail.com
- Kỹ thuật cá nhân hoá: dập chìm logo, dập tên. `[NGƯỜI BÁN ĐIỀN: các kỹ thuật khắc khác + giới hạn ký tự]`
- Chỉ khâu: chỉ lanh sáp, khâu tay hai kim hoặc khâu máy tuỳ món
- Số lượng nhận: `[NGƯỜI BÁN ĐIỀN: MOQ tối thiểu từng món]`
- Hoá đơn VAT: `[NGƯỜI BÁN ĐIỀN: có/không, điều kiện]`
- Năm thành lập: `[NGƯỜI BÁN ĐIỀN: năm thành lập chính thức]`

**Một câu nói thật về giới hạn của xưởng**

Xưởng làm thủ công nên năng lực có hạn: mùa cao điểm cuối năm và trước Tết, nếu bạn nhắn quá sát ngày sự kiện thì chúng tôi sẽ nói thẳng là không kịp thay vì nhận rồi giao trễ.

**Ảnh cần** — Ảnh mặt tiền xưởng hoặc góc bàn làm việc có bảng tên xưởng, để khách doanh nghiệp thấy đây là địa chỉ thật. Chú thích: "Xưởng tại Tân Sơn Hòa, TP. HCM — khách doanh nghiệp có thể hẹn qua xem da thật."

**Ghi chú dựng** — Không CTA ở khối này. Kết thúc phần 1 tại đây; phần 2 tiếp tục từ khối 7 (lưới sản phẩm dùng `<ProductCard p={...} />`).
