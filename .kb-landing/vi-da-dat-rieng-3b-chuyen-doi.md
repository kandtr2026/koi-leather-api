# vi-da-dat-rieng — PHẦN 3B: đường chuyển đổi & việc người bán phải điền

URL: `/lam-vi-da-theo-yeu-cau/` (giữ nguyên, viết lại tại chỗ)

---

## 15. Đường chuyển đổi

Một hành động duy nhất: **nhắn Zalo**. Năm điểm chạm. Không popup, không bắt điền form
mới hiện số, không chen nút vào giữa khối chất liệu (khối 5) — khách đang đọc để học.

### 15.1 Năm điểm chạm

**Điểm 1 — Hero (khối 1)**

Nút chính:

> **Nhắn Zalo xem mẫu ví da thật**

Dòng gỡ lo ngay dưới nút:

> Nhắn để hỏi thôi cũng được — chưa cần quyết gì.

```tsx
<ContactLink kind="zalo" productName="đặt làm ví da theo yêu cầu"
  className="inline-flex items-center justify-center rounded-full bg-neutral-900 px-7 py-3.5 text-[15px] font-medium text-white" />
```

**Điểm 2 — ngay sau khối KHOẢNG GIÁ (khối 3)**

Khách vừa đọc con số, đây là lúc lo "ví của tôi rơi vào khoảng nào".

> **Gửi mẫu ví bạn thích, shop báo giá**

> Bạn gửi ảnh chụp màn hình cũng được. Không cần cọc để được tư vấn.

`productName="báo giá ví da đặt riêng"`

**Điểm 3 — ngay sau khối QUY TRÌNH (khối 4)**

Khách vừa hiểu các bước, lo "mất bao lâu, có được xem trước".

> **Chốt kiểu ví với nghệ nhân**

> Tin nhắn đã soạn sẵn, bạn chỉ cần bấm gửi.

`productName="đặt ví da theo yêu cầu — chốt kiểu"`

**Điểm 4 — ngay sau FAQ (khối 10)**

Đây là khách đã đọc gần hết trang. Cường độ cao nhất, và là nơi đặt form.

Nút chính:

> **Bắt đầu đặt ví riêng**

> Nhắn Zalo là nhanh nhất. Không thích nhắn thì để lại số bên dưới.

Nút phụ (nút gửi của form):

> **Để lại số, shop gọi lại**

`productName="đặt làm ví da theo yêu cầu"`

**Điểm 5 — `ContactBar` dính đáy**

```tsx
<ContactBar productName="đặt làm ví da theo yêu cầu" />
```

Render **đúng một lần** ở cuối trang. Điện thoại thành thanh ngang 3 ô ở đáy, máy tính
thành cột dọc mép phải — cùng một component. Tuyệt đối không dựng thanh liên hệ riêng.

Vì `main` đã có `pb-16 md:pb-0` (`src/app/layout.tsx`), khối CTA cuối (điểm 4) **không**
được nằm trong 64px cuối trang — chèn khối 12 (case study + bài liên quan) xuống dưới nó
là đủ khoảng đệm.

### 15.2 Tin nhắn Zalo soạn sẵn

Không tự viết URL `zalo.me`. `zaloLink()` trong `src/lib/contact.ts` đã sinh sẵn
"Chào shop, mình quan tâm sản phẩm: {productName} ({productUrl})" cộng dòng
"(Mã tư vấn: ...)" nếu khách đến từ quảng cáo. Việc của trang này chỉ là chọn chuỗi
`productName`:

| Điểm chạm | `productName` truyền vào |
|---|---|
| Hero | `đặt làm ví da theo yêu cầu` |
| Sau khối GIÁ | `báo giá ví da đặt riêng` |
| Sau khối QUY TRÌNH | `đặt ví da theo yêu cầu — chốt kiểu` |
| Sau FAQ | `đặt làm ví da theo yêu cầu` |
| `ContactBar` | `đặt làm ví da theo yêu cầu` |

Nếu trang có nút riêng cho nhánh khắc tên hoặc nhánh da cá sấu, dùng
`ví da khắc tên đặt riêng` và `đặt làm ví da cá sấu` — vẫn để `zaloLink()` dựng chuỗi.

Cảnh báo còn treo (mục 3.9 BRIEF): **cơ chế điền sẵn tin nhắn chưa được kiểm chứng.**
Phải test tay trên 4 tổ hợp Android/iPhone × đã cài/chưa cài app Zalo trước khi tin vào
dòng "Tin nhắn đã soạn sẵn, bạn chỉ cần bấm gửi." Nếu thất bại thì bỏ dòng gỡ lo đó và
hiện mã tư vấn trên trang kèm nút chép.

Thêm hai lỗi đang chặn việc đo (mục 3.5, 3.8): `NEXT_PUBLIC_GOOGLE_ADS_ID` /
`NEXT_PUBLIC_GA_ID` chưa khai trên Vercel nên `trackContactClick()` thoát ngay ở
`if (!window.gtag) return`; `ghiNhanLienHe()` cũng thoát nếu khách không có token quảng
cáo. Nghĩa là hôm nay mọi cú bấm Zalo của khách organic **không được ghi lại**. Landing
vẫn chạy được, nhưng sẽ không chứng minh được nó chạy.

### 15.3 Form (khối 11)

**LeadForm hiện chỉ có 3 trường** (`name`, `phone`, `message`) cộng bẫy spam. Form 4
trường + 1 textarea dưới đây là **việc cần thêm**, chưa tồn tại. Đừng viết nội dung như
thể form đã có.

Thứ tự trường đúng theo mục 4 BRIEF:

1. `wish` — select, **bắt buộc** — nhãn "Bạn muốn đặt làm gì?"
   - `Ví nam` · `Ví nữ` · `Kẹp tiền (money clip)` · `Ví zip mini` ·
     `Ví khắc tên làm quà` · `Ví da cá sấu / da đặc biệt` · `Khác, mình kể ở dưới`
2. `budget` — select, **không** bắt buộc — nhãn "Ngân sách bạn nghĩ tới"
   - `Chưa rõ, nhờ shop tư vấn` (đặt làm mục đầu tiên) · `Dưới 2 triệu` ·
     `2 – 4 triệu` · `4 – 7 triệu` · `7 – 12 triệu` · `Trên 12 triệu`
   - Các bậc này bám giá thật: ví nam 3,3 – 11,8 triệu (phần lớn quanh 4,8 triệu),
     ví nữ 1,8 – 28,0 triệu (phần lớn quanh 6,8 triệu), kẹp tiền 1,2 – 3,8 triệu,
     ví zip mini 2,2 – 2,9 triệu.
3. `phone` — tel, **bắt buộc** — nhãn "Số điện thoại (Zalo)"
4. `name` — text, **bắt buộc** — nhãn "Shop gọi bạn là gì?"
5. `message` — textarea, không bắt buộc — nhãn "Mô tả thêm (nếu có)", placeholder
   "Ví bạn đang dùng bị gì, muốn mấy khe thẻ, có cần khắc chữ gì..."

Không hỏi email, địa chỉ, giới tính, "bạn biết KOI từ đâu", số đo.

Nút gửi: **Để lại số, shop gọi lại**. Dưới nút: "Shop trả lời trong
[NGƯỜI BÁN ĐIỀN: thời gian phản hồi Zalo]."

**Khuôn ghép vào cột `message`.** Bảng `leads` **không có cột** cho món / ngân sách /
mốc thời gian, nên ba thứ đó phải nối chuỗi vào `message` theo đúng khuôn cố định:

```
Món: {wish} | Ngân sách: {budget hoặc "chưa chọn"} | Mốc: {mốc hoặc "chưa nêu"} | Trang: /lam-vi-da-theo-yeu-cau/ | Mã: {koi_ad_token hoặc "-"} | Ghi chú KH: {textarea}
```

Ví dụ một dòng thật:

```
Món: Ví khắc tên làm quà | Ngân sách: 4 – 7 triệu | Mốc: chưa nêu | Trang: /lam-vi-da-theo-yeu-cau/ | Mã: - | Ghi chú KH: cần khắc 3 chữ cái, tặng sinh nhật
```

Hai việc sửa kèm, không sửa thì lead vẫn vô dụng:

- `lead-form.tsx:24` render `name="product_id"` nhưng `actions.ts:19` đọc
  `formData.get('product_name')` → tên sản phẩm **luôn rỗng**. Đổi thành
  `name="product_name"` với `value={productName}`.
- Chưa có `GET` nào đọc lead, chưa có tab Leads, chưa có thông báo. Thêm `GET`
  **dưới `/analytics`, không dưới `/shop`** — `auth.guard.ts:35` mở toàn bộ `/shop` cho
  khách vãng lai, để ở đó là phơi số điện thoại khách ra internet.

Mốc để so trước/sau: lead từ form hiện là **0**, cú bấm quảng cáo → hội thoại hiện là
**40 → 1**, hội thoại → đơn chốt hiện là **0**.

---

## 16. Người bán phải điền

Không có câu trả lời thì để nguyên `[NGƯỜI BÁN ĐIỀN: ...]` trên trang. Không đoán.

### A. Chốt trước tiên — năm thành lập (đang tự mâu thuẫn ba chỗ)

1. **Năm thành lập chính thức là năm nào?** Site đang nói ba kiểu khác nhau:
   `/koi-leather-nha-san-xuat.../` ghi **2017**; `/sua-chua-do-da/` ghi **"hơn 10 năm"**;
   `/nha-san-xuat-do-da-thu-cong/` ghi **"hơn 7 năm"**. 2017 → 2026 là 9 năm. Chốt một số
   rồi sửa cả ba trang; landing này không được nhân bản mâu thuẫn.

### B. Thời gian & tiền

2. Thời gian làm một chiếc **ví nam** đặt riêng — bao nhiêu ngày?
3. Thời gian làm một chiếc **ví nữ** đặt riêng?
4. Thời gian làm **kẹp tiền** và **ví zip mini** (món nhỏ, có nhanh hơn không)?
5. Thêm **khắc tên** thì cộng thêm bao lâu?
6. Ví **da cá sấu / da đặc biệt** cần chờ da bao lâu trước khi bắt đầu?
7. **% cọc** khi đặt ví riêng là bao nhiêu?
8. Cọc có được hoàn nếu khách đổi ý **trước** khi cắt da không?
9. Có phụ phí cho **làm gấp** không, bao nhiêu?
10. Phí **giao hàng** với đơn ví (tỉnh khác có khác không)?
11. Có nhận **thanh toán chuyển khoản trước / COD / trả sau khi xem ảnh thành phẩm** không?

### C. Bảo hành & đổi trả

12. **Phạm vi bảo hành** ví đặt riêng gồm những gì (chỉ, khoá, bong keo, mép sơn)?
13. Bảo hành **bao lâu**?
14. Thanh header đang hứa **"Bảo dưỡng trọn đời"** — cụ thể là làm gì, bao lâu một lần,
    miễn phí hay có phí? Hiện **không có trang nào định nghĩa** cụm này.
15. Chính sách **đổi trả hàng đặt riêng** ra sao, và nó khớp thế nào với
    `/chinh-sach-hoan-tien-doi-tra/` (trang này chỉ 1.943 ký tự)?
16. Ví **đã khắc tên** có nhận đổi trả không? (đây là câu khách lo nhất khi đặt làm quà)
17. Làm xong khách **không vừa ý** thì xử lý thế nào — sửa lại, làm lại, hay hoàn tiền?
18. Có **sửa lại miễn phí** trong bao lâu sau khi nhận (chật khe thẻ, chỉnh mép)?

### D. Khắc tên (mũi nhọn của landing này)

19. Kỹ thuật khắc đang dùng là gì — **dập nhiệt, dập nguội, hay khắc laser**?
20. **Giới hạn số ký tự** cho mỗi vị trí khắc?
21. Khắc được những gì: chữ cái, chữ có dấu tiếng Việt, số, logo, chữ ký tay?
22. Có bao nhiêu **màu foil** (vàng, bạc, không màu) và có phụ phí không?
23. Khắc **miễn phí** hay tính thêm bao nhiêu tiền?
24. Khắc rồi có **bỏ được** không, hay hỏng là làm lại từ đầu?

### E. Xưởng & nghệ nhân

25. **Tên và vai trò thật** của nghệ nhân làm ví (khối 9 cần E-E-A-T, không được để trống)?
26. Người đó làm nghề bao nhiêu năm, học ở đâu?
27. **Địa chỉ xưởng** có phải "Số 2/16 Nguyễn Bặc, Tân Sơn Hòa, TP. HCM" không, hay xưởng
    tách khỏi cửa hàng?
28. **Giờ mở cửa** và **toạ độ** (cần cho `LocalBusiness` ở `/lien-he/#localbusiness`)?
29. Khách **đến xem trực tiếp** được không, có cần hẹn trước?
30. **Thời gian phản hồi Zalo** trong giờ làm việc là bao lâu?
31. Có **ảnh quy trình thật có bàn tay** cho khối 4 chưa (cần 4 ảnh trở lên: cắt da, vê
    mép, khâu tay, khắc tên)?

### F. B2B — đặt ví số lượng

32. **MOQ** cho đơn ví doanh nghiệp là bao nhiêu chiếc?
33. **Bậc giá theo số lượng** như thế nào?
34. Đơn số lượng thì thời gian làm là bao lâu?
35. Có làm được **logo doanh nghiệp** trên ví không, bằng kỹ thuật nào?
36. Có **hoá đơn VAT** và hợp đồng không?
37. Có **case study đơn ví** nào của khách doanh nghiệp có tên được phép công bố không?
    Hiện toàn bộ case study có tên khách thật đều thuộc cụm quà tặng — **không có case
    study nào thuộc cụm ví**, nên khối 12 phải để trống chỗ này thay vì kể lệch một đơn
    quà tặng thành đơn ví.

### G. Da đặc biệt — giấy tờ

38. **Giấy tờ CITES** cho da cá sấu: có không, ai cấp, khách có được xem bản sao không?
39. Nếu khách mang ví cá sấu **ra nước ngoài** thì cần giấy gì, xưởng có hỗ trợ không?
40. Da cá sấu nguồn ở đâu (trại nuôi trong nước, nhập khẩu)?
41. Các loại da đặc biệt khác đang nhận làm ví — **kỳ đà, trăn, đà điểu** — có giấy tờ
    tương tự không?
42. Da đặc biệt có **thời gian chờ đặt tấm da** riêng không, và cọc có khác không?

### H. Một câu hạn chế thật thà (khối 6)

43. Có việc gì liên quan tới ví mà xưởng **không nhận làm** hoặc làm không tốt? (Ví dụ:
    không copy nguyên mẫu thương hiệu khác, không làm ví siêu mỏng dưới một độ dày nào
    đó, không nhận da khách tự mang tới.) Đây là chỗ vượt đối thủ — 0/3 đối thủ dám nói
    hạn chế, và Bulltino thắng chính nhờ một câu như thế.
