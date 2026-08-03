# Phần 3B — Đường chuyển đổi & việc người bán phải điền
URL: `/san-xuat-qua-tang-doanh-nghiep-va-su-kien/` (giữ nguyên, viết lại tại chỗ)

---

## 15. Đường chuyển đổi

Một hành động duy nhất: **nhắn Zalo**. Năm điểm chạm, không thêm. Không popup, không chặn số sau form.
Mọi nút Zalo dùng `<ContactLink kind="zalo" productName="..." className="..." />` — không viết thẻ `a href="https://zalo.me/..."` bằng tay.

### 15.1 Năm điểm chạm

**(1) Hero — dưới H1**

> Nút: **Gửi yêu cầu quà tặng qua Zalo**
> Dòng gỡ lo: *Gửi số lượng và ngân sách, shop báo giá theo bậc số lượng. Chưa cần quyết gì.*

```tsx
<ContactLink kind="zalo" productName="đặt quà tặng doanh nghiệp bằng da"
  className="inline-flex items-center justify-center rounded-full bg-neutral-900 px-7 py-3.5 text-sm font-medium text-white" />
```

**(2) Sau khối 3 (KHOẢNG GIÁ)** — khách vừa thấy số, đây là lúc hỏi bậc giá.

> Nút: **Hỏi bậc giá theo số lượng**
> Dòng gỡ lo: *Nói giúp shop số lượng dự kiến và mốc cần giao, shop tính giúp bậc giá.*

**(3) Sau khối 4 (QUY TRÌNH)** — khách vừa đọc các bước, lo nhất là mốc giao.

> Nút: **Đặt mẫu duyệt trước khi sản xuất**
> Dòng gỡ lo: *Duyệt mẫu rồi mới chạy số lượng lớn — sai gì sửa ở bước mẫu, không sửa ở lô hàng.*

**(4) Sau khối 10 (FAQ)** — đã trả lời hết thắc mắc.

> Nút: **Kể yêu cầu quà tặng của công ty bạn**
> Dòng gỡ lo: *Tin nhắn đã soạn sẵn, bạn chỉ cần bấm gửi.*

**(5) `ContactBar` dính đáy** — render **đúng một lần** ở cuối trang. Không dựng thanh liên hệ riêng, sẽ thành hai thanh chồng nhau.

```tsx
<ContactBar productName="đặt quà tặng doanh nghiệp bằng da" />
```

Điện thoại: thanh ngang 3 ô (Gọi · Zalo · Messenger). Máy tính: cột dọc mép phải. 64% khách là mobile (99/154 khách riêng) nên thanh này là đường chuyển đổi chính, không phải phụ.

**Không** đặt CTA trong khối 5 (bảng chất liệu) — khách đang đọc để học, chen nút vào là cắt mạch.
**Không** đặt CTA cuối trong 64px cuối trang — `main` có `pb-16 md:pb-0`, sẽ bị thanh đáy che.

### 15.2 Chuỗi `productName` truyền vào ContactLink

`zaloLink()` trong `src/lib/contact.ts` tự sinh "Chào shop, mình quan tâm sản phẩm: {productName} ({productUrl})" cộng dòng "(Mã tư vấn: ...)" nếu khách đến từ quảng cáo. Việc của người dựng trang chỉ là chọn chuỗi:

| Điểm chạm | `productName` |
|---|---|
| Hero | `đặt quà tặng doanh nghiệp bằng da` |
| Sau khối GIÁ | `bậc giá quà tặng doanh nghiệp số lượng lớn` |
| Sau khối QUY TRÌNH | `mẫu duyệt quà tặng doanh nghiệp khắc logo` |
| Sau FAQ | `đặt quà tặng doanh nghiệp bằng da` |
| ContactBar | `đặt quà tặng doanh nghiệp bằng da` |
| Nút trong khối 12 (case study) | `quà tặng sự kiện bằng da thật` |

Giữ chuỗi ngắn — nó nằm trong query string, dài quá thì một số máy cắt mất. Không tự nối thêm số lượng hay giá vào chuỗi này.

### 15.3 Form — 4 trường + 1 textarea

**LeadForm hiện chỉ có 3 trường (`name`, `phone`, `message`) cộng bẫy spam. Form 4 trường dưới đây là VIỆC CẦN THÊM, chưa tồn tại.** Đừng viết nội dung trang như thể form đã có select ngân sách.

Kèm theo, phải sửa lỗi 3.1 BRIEF.md trước khi form này có nghĩa: `lead-form.tsx:24` render `name="product_id"` nhưng `actions.ts:19` đọc `formData.get('product_name')` → tên sản phẩm **luôn rỗng**. Đổi thành `name="product_name"` với `value={productName}`.

Thứ tự trường bắt buộc theo mục 4 BRIEF.md:

**1. `wish` — select, bắt buộc.** Nhãn: "Bạn muốn đặt làm gì?"
- Ví da khắc tên
- Ví đựng thẻ / card holder
- Bao da passport
- Ốp điện thoại da
- Móc khoá da
- Sổ tay bọc da
- Bộ quà tặng nhiều món
- Món khác, mô tả bên dưới

**2. `budget` — select, KHÔNG bắt buộc.** Nhãn: "Ngân sách bạn nghĩ tới"
- Chưa rõ, nhờ shop tư vấn ← phải có, để mặc định
- Dưới 500 nghìn / phần
- 500 nghìn – 1 triệu / phần
- 1 – 3 triệu / phần
- Trên 3 triệu / phần
- Tính theo tổng ngân sách, sẽ nói qua Zalo

**3. `phone` — tel, bắt buộc.** Nhãn: "Số điện thoại (Zalo)"

**4. `name` — text, bắt buộc.** Nhãn: "Shop gọi bạn là gì?"

**5. `message` — textarea, không bắt buộc.** Nhãn: "Mô tả thêm (nếu có)". Chỗ giữ: "Số lượng dự kiến, ngày cần giao, có logo sẵn hay chưa."

Nút submit: **Để lại số, shop gọi lại**. Không dùng "Gửi" / "Đăng ký" / "Submit".
Dòng dưới form: *Shop không gửi email quảng cáo. Số điện thoại chỉ dùng để gọi lại về đơn này.*
Không hỏi email, địa chỉ, chức danh, "bạn biết KOI từ đâu".

### 15.4 Khuôn ghép vào cột `message`

Bảng `leads` **không có cột riêng** cho món / ngân sách / mốc thời gian / trang / mã quảng cáo. Tất cả phải nối chuỗi vào `message` theo đúng một khuôn, nếu không thì về sau không lọc được:

```
Món: {wish} | Ngân sách: {budget || 'chưa chọn'} | Mốc: {mocThoiGian || 'chưa nêu'} | Trang: /san-xuat-qua-tang-doanh-nghiep-va-su-kien/ | Mã: {koi_ad_token || '—'} | Ghi chú KH: {textarea || '—'}
```

Ba lưu ý khi dựng:
- `Mốc` chưa có trường riêng trong form 4 trường → tạm để `chưa nêu` và nhắc khách nêu trong textarea. Nếu người bán muốn trường mốc riêng thì đó là trường thứ 5, phải xin quyết định (xem mục 16).
- `Mã` đọc từ `localStorage` khoá `koi_ad_token`. Không có thì ghi `—`, đừng bỏ trống ô, giữ khuôn cố định số ô.
- Đặt dấu `|` đúng như trên, chỉ một khoảng trắng hai bên. Về sau tách bằng `split(' | ')`.

**Chưa ai đọc được lead.** Chỉ có `POST /shop/leads`, không có `GET`, không có tab Leads, không có nodemailer/webhook (3.2 BRIEF.md). Form đẹp mà không ai mở ra đọc thì vẫn là 0 lead. Thêm `GET` **dưới `/analytics`, không dưới `/shop`** — `auth.guard.ts:35` mở toàn bộ `/shop` cho khách vãng lai.

---

## 16. Người bán phải điền

Landing này là B2B: người mua là bộ phận hành chính / marketing của công ty. Họ không hỏi "đẹp không", họ hỏi "bao nhiêu cái thì có giá này, có hoá đơn không, ngày X có hàng không". Mỗi câu dưới đây thiếu là một lý do họ đi hỏi chỗ khác.

### A. Chốt trước tiên — mâu thuẫn đang có trên site
1. **Năm thành lập chính thức là năm nào?** Site đang tự mâu thuẫn ba chỗ: `/koi-leather-nha-san-xuat.../` nói **2017**, `/sua-chua-do-da/` nói **"hơn 10 năm"**, `/nha-san-xuat-do-da-thu-cong/` nói **"hơn 7 năm"**. 2017 → 2026 là 9 năm. Chốt một số, rồi sửa cả ba trang. Chưa chốt thì landing ghi `[NGƯỜI BÁN ĐIỀN: năm thành lập chính thức]`, tuyệt đối không nhân bản mâu thuẫn.
2. **Trang `/qua-tang-doanh-nghiep-va-su-kien/` (22.418 ký tự) xử lý thế nào?** Nó gần trùng landing này. Ba lựa chọn: cắt ngắn thành trang giới thiệu trỏ lên landing · đặt `canonical` về landing · hay giữ nguyên và phân vai khác hẳn. Phải đọc Search Console trước — không được 301 dựa trên dữ liệu 1,5 ngày.

### B. Thời gian & tiền
3. Thời gian làm cho lô 50 / 100 / 300 phần, tính từ lúc duyệt mẫu?
4. Có làm gấp được không, phụ phí bao nhiêu %, gấp nhất là mấy ngày?
5. % cọc là bao nhiêu, cọc theo giá trị đơn hay theo số phần?
6. Chấp nhận hình thức thanh toán nào — chuyển khoản công ty, tiền mặt, công nợ 30 ngày?
7. Phí giao hàng nội thành TP.HCM và giao tỉnh tính thế nào?

### C. Bảo hành & đổi trả
8. **"Bảo dưỡng trọn đời" trên thanh header nghĩa là gì?** Đang hứa mà không có trang nào định nghĩa. Gồm những gì, không gồm những gì, khách phải mang tới xưởng hay gửi được?
9. Bảo hành đường chỉ / khoá kim loại / lớp lót bao lâu?
10. Hàng đặt riêng khắc logo có đổi trả được không? Câu trả lời phải khớp `/chinh-sach-hoan-tien-doi-tra/` (đang chỉ 1.943 ký tự — có thể phải viết thêm mục cho hàng đặt riêng).
11. Nếu một số phần trong lô bị lỗi thì xử lý ra sao — làm bù, giảm giá, hay hoàn?

### D. Xưởng & nghệ nhân
12. Tên và vai trò thật của 2–3 nghệ nhân cho khối 9 (E-E-A-T). Ai phụ trách khắc, ai phụ trách may?
13. Xưởng có mấy người làm, chạy được bao nhiêu phần một tuần cho hàng số lượng lớn?
14. Địa chỉ xưởng (nếu khác `Số 2/16 Nguyễn Bặc, Tân Sơn Hòa, TP. HCM`), giờ mở cửa, toạ độ cho `LocalBusiness`.
15. Khách doanh nghiệp có tới xem xưởng được không, cần hẹn trước bao lâu?
16. Thời gian phản hồi Zalo trong giờ làm việc — trả lời trong bao lâu?

### E. B2B — bắt buộc cho landing này
17. **MOQ tối thiểu là bao nhiêu phần**, và MOQ có khác nhau theo món không (móc khoá chắc khác ví da)?
18. **Bậc giá theo số lượng**: mốc nào thì giảm, giảm bao nhiêu? Ví dụ 50 / 100 / 300 / 500 phần.
19. Có xuất **hoá đơn VAT** không? Bao lâu sau khi giao? Giá niêm yết đã gồm VAT hay chưa?
20. Có ký **hợp đồng** và **báo giá có đóng dấu** cho phòng mua hàng không?
21. Nhận **đấu thầu / so sánh báo giá** nhiều nhà cung cấp không, cần hồ sơ gì?
22. Làm **mẫu duyệt (sample)** trước lô lớn: mất bao lâu, thu phí không, phí có trừ vào đơn không?
23. Đặt hộp / túi đựng / thiệp kèm theo được không, tính riêng hay gộp?
24. Kỹ thuật khắc nào có sẵn (dập nhiệt, khắc laser, dập chìm) và **giới hạn số ký tự** mỗi kiểu?
25. Logo nhận file gì (AI, PDF, PNG), yêu cầu tối thiểu về file? Logo nhiều màu xử lý thế nào trên da?
26. Có làm được logo dập khuôn riêng cho khách không, phí làm khuôn bao nhiêu, khuôn thuộc về ai?
27. **Mốc chốt đơn cuối năm**: đơn Tết phải đặt trước ngày nào để chắc chắn giao đúng hạn? Đây là câu khách B2B hỏi nhiều nhất và landing đang không trả lời được.
28. Có cần trường "Mốc cần giao" riêng trong form không (thành trường thứ 5), hay để khách ghi trong textarea?

### F. Giấy tờ da đặc biệt
29. Có **giấy tờ CITES** cho da cá sấu / kỳ đà / trăn không? Đơn quà tặng doanh nghiệp dùng da đặc biệt thì khách có được cấp bản sao để lưu hồ sơ không?
30. Xuất hoá đơn cho hàng da đặc biệt có ràng buộc gì thêm không?
31. Da nào **luôn có sẵn** đủ cho lô lớn, da nào phải đặt trước và đặt trước bao lâu?

### G. Case study — cần xin phép
32. Tám bài case study khách thật (MobiFone, CGV, Bentley, Vasta Stone, Nam Long, Lộc Trời, Vingroup, Cao Fine Jewellery) đã có **văn bản đồng ý** nêu tên chưa? Nếu chưa, phần nào được nêu công khai, phần nào phải giấu?

**Tổng: 32 câu.** Chưa có câu trả lời thì viết `[NGƯỜI BÁN ĐIỀN: ...]` ngay tại chỗ trên trang — không đoán, không hứa. Không huy hiệu giải thưởng, không "10.000 khách hàng", không "15 năm kinh nghiệm" nếu không có bằng chứng.
