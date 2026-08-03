# vi-da-dat-rieng — PHẦN 3A: liên kết nội bộ + JSON-LD

URL landing: `/lam-vi-da-theo-yeu-cau/` (bài có thật, 8.028 ký tự, viết lại tại chỗ — giữ nguyên đường dẫn).

---

## 13. Liên kết nội bộ

### 13.1 Link ĐI RA từ landing (14 link)

| URL đích | Chữ neo | Khối | Vì sao |
|---|---|---|---|
| `/khac-ten-len-vi-da/` | khắc tên lên ví da | 2 (mở đầu) | Bài duy nhất trong cụm ví đang có 5 khách Google. Nén khắc tên thành một dòng + trỏ ra, để landing không giành từ khoá với chính nó. |
| `/dich-vu-khac-ten-len-san-pham-khac-ten-theo-yeu-cau/` | các kiểu khắc tên chúng tôi làm được | 4 (quy trình, bước chốt bản rập) | Bài dài nhất cụm khắc (20.129 ký tự) và đã có 1 khách Google. Đặt ở bước duyệt mẫu, đúng lúc khách đang chọn chữ. |
| `/khac-chu-len-vi-da-ky-thuat-dap-nhiet-cao-cap/` | kỹ thuật dập nhiệt | 4 | Câu hỏi "khắc bằng gì" không trả lời trong landing (kỹ thuật là `[NGƯỜI BÁN ĐIỀN]`) — đẩy sang bài chuyên. |
| `/san-pham/vi-da-cho-nam/` | 27 mẫu ví nam đang có | 3 (khoảng giá) | Khách đọc giá 3,3–11,8 triệu sẽ muốn kiểm chứng ngay. Link vào lưới duyệt hàng, đúng vai `/san-pham/`. |
| `/san-pham/vi-da-cho-nu/` | 29 mẫu ví nữ đang có | 3 | Cùng lý do; đây cũng là nơi chứng minh biên 1,8–28,0 triệu là thật. |
| `/san-pham/kep-tien-money-clip/` | kẹp tiền | 3 | Bậc giá thấp nhất của cụm (1,2–3,8 triệu) — giữ khách ngân sách nhỏ ở lại thay vì thoát. |
| `/san-pham/vi-zip-mini/` | ví zip mini | 7 (lưới SP) | Chỉ 2 SP, không đủ dựng landing riêng, nhưng là dáng khách hay hỏi. |
| `/vi-da-ca-sau-cao-cap/` | ví da cá sấu | 5 (bảng chất liệu) | Giải thích vì sao ví nữ vọt tới 28,0 triệu. Link đi từ đúng dòng "da cá sấu" trong bảng. |
| `/dat-lam-vi-da-ca-sau/` | đặt riêng ví cá sấu | 5 | Bài cùng ý định đặt làm, hẹp hơn landing. Landing là hub, bài này là nhánh. |
| `/da-ca-sau-that/` | cách nhận biết da cá sấu thật | 5 | 15.679 ký tự, khối kiến thức nặng nhất — chống lo "có thật không". |
| `/da-de-alran/`, `/da-togo/`, `/da-epsom-la-gi/` | tên loại da, đặt ngay ô "loại da" | 5 | Mỗi dòng bảng chất liệu trỏ đúng một bài. Ba bài này đều có thật; `/da-de-alran/` còn có 1 khách Google. |
| `/huong-dan-cach-lua-chon-vi-da-handmade-cuc-xin-cho-nam-gioi/` | cách chọn ví da thủ công | 6 (thông số) | Bài 8.335 ký tự trả lời chuyện dày mỏng, số khe thẻ — nối tự nhiên sau bảng thông số. |
| `/snap-wallet-vi-snap-cao-cap/` | ví snap | 7 | Dáng đặc thù, bài đã có sẵn, giữ khách trong cụm. |
| `/dich-vu-sua-chua-vi-da-cao-cap/` | sửa ví da | 10 (FAQ, câu "dùng lâu bị bung chỉ thì sao") | 10.280 ký tự + 2 khách Google. Trả lời lo dài hạn mà không phải hứa bảo hành (đang là `[NGƯỜI BÁN ĐIỀN]`). |
| `/lien-he/` | địa chỉ xưởng | 11 (CTA cuối) | `/lien-he/` đang **0 lượt xem, không có link nào trỏ tới** (BRIEF 3.3). Đây là chỗ landing trả nợ cho nó, và là nơi `LocalBusiness` được khai. |

Không link tới `/dat-lam-day-lung-hermes/`, `/dat-lam-day-lung-khoa-chu-h/`, `/tui-hermes-da-*` từ landing này — sản phẩm thay thế mang tên hãng khác, BRIEF mục 6.

### 13.2 Link TRỎ VỀ landing (11 bài, mỗi bài một khối "Đặt riêng" cuối thân bài)

| Bài nguồn | Chữ neo trỏ về `/lam-vi-da-theo-yeu-cau/` |
|---|---|
| `/khac-ten-len-vi-da/` | đặt riêng cả chiếc ví, không chỉ khắc tên |
| `/vi-da-khac-ten/` | làm ví da theo yêu cầu |
| `/vi-nam-khac-ten-thu-cong/` | đặt ví nam theo số đo và loại da bạn chọn |
| `/khac-chu-len-vi-da-ky-thuat-dap-nhiet-cao-cap/` | đặt ví da thủ công riêng |
| `/dich-vu-khac-ten-len-san-pham-khac-ten-theo-yeu-cau/` | đặt riêng ví da từ đầu |
| `/huong-dan-cach-lua-chon-vi-da-handmade-cuc-xin-cho-nam-gioi/` | không mẫu nào vừa ý thì đặt riêng một chiếc |
| `/vi-da-ca-sau-cao-cap/` | đặt ví theo yêu cầu |
| `/dat-lam-vi-da-ca-sau/` | xem khoảng giá và quy trình đặt riêng |
| `/snap-wallet-vi-snap-cao-cap/` | đặt ví snap theo dáng riêng |
| `/dich-vu-sua-chua-vi-da-cao-cap/` | làm mới bằng một chiếc đặt riêng |
| `/vi-khac-ten-cao-cap-qua-tang-da-that-thu-cong-tai-tp-hcm/` | đặt ví da theo yêu cầu (đơn lẻ) |

Ghi chú chống tự cắn từ khoá: cả 11 chữ neo trên đều chứa cụm **"đặt riêng / theo yêu cầu"**, không chứa cụm "khắc tên". Ngược lại, chữ neo landing trỏ ra `/khac-ten-len-vi-da/` phải là **"khắc tên"**. Giữ hai vốn từ tách nhau thì Google mới không dồn hai trang vào một truy vấn — chỗ đang có 5 khách Google thật là chỗ không được đánh cược.

**Việc phải làm trước khi xuất bản:** đọc Search Console cho `/khac-ten-len-vi-da/` xem nó đang xếp hạng cho truy vấn nào. Nếu nó đã ăn "đặt ví da khắc tên" thì landing bỏ từ khoá đó khỏi title, chỉ giữ trong thân bài.

---

## 14. JSON-LD

Dán vào `page.tsx` của landing bằng một thẻ `<script type="application/ld+json">` duy nhất (mảng `@graph`). Không khai `Product`. Không khai `aggregateRating`, `review`, `ratingValue` — chưa có đánh giá thật (BRIEF mục 4). `LocalBusiness` chỉ tham chiếu `@id`, bản khai đầy đủ nằm ở `/lien-he/`.

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Service",
      "@id": "https://koileather.com/lam-vi-da-theo-yeu-cau/#service",
      "name": "Làm ví da theo yêu cầu",
      "serviceType": "Đặt riêng ví da thủ công",
      "description": "Xưởng KOI Leather nhận đặt riêng ví da nam, ví da nữ, kẹp tiền và ví zip mini: chọn loại da, dáng ví, số khe thẻ và khắc tên. Ví nam khoảng 3,3 – 11,8 triệu, phần lớn quanh 4,8 triệu; ví nữ 1,8 – 28,0 triệu, phần lớn quanh 6,8 triệu.",
      "url": "https://koileather.com/lam-vi-da-theo-yeu-cau/",
      "provider": { "@id": "https://koileather.com/lien-he/#localbusiness" },
      "areaServed": { "@type": "Country", "name": "Việt Nam" },
      "audience": { "@type": "Audience", "audienceType": "Khách đặt riêng đồ da thủ công" },
      "termsOfService": "https://koileather.com/chinh-sach-hoan-tien-doi-tra/",
      "hasOfferCatalog": {
        "@type": "OfferCatalog",
        "name": "Nhóm ví nhận đặt riêng",
        "itemListElement": [
          { "@type": "OfferCatalog", "name": "Ví da cho nam", "url": "https://koileather.com/san-pham/vi-da-cho-nam/" },
          { "@type": "OfferCatalog", "name": "Ví da cho nữ", "url": "https://koileather.com/san-pham/vi-da-cho-nu/" },
          { "@type": "OfferCatalog", "name": "Kẹp tiền", "url": "https://koileather.com/san-pham/kep-tien-money-clip/" },
          { "@type": "OfferCatalog", "name": "Ví zip mini", "url": "https://koileather.com/san-pham/vi-zip-mini/" }
        ]
      }
    },
    {
      "@type": "ItemList",
      "@id": "https://koileather.com/lam-vi-da-theo-yeu-cau/#danhmuc",
      "name": "Các nhóm ví nhận đặt riêng tại KOI Leather",
      "itemListOrder": "https://schema.org/ItemListOrderAscending",
      "numberOfItems": 4,
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Ví da cho nam (27 mẫu)", "url": "https://koileather.com/san-pham/vi-da-cho-nam/" },
        { "@type": "ListItem", "position": 2, "name": "Ví da cho nữ (29 mẫu)", "url": "https://koileather.com/san-pham/vi-da-cho-nu/" },
        { "@type": "ListItem", "position": 3, "name": "Kẹp tiền (15 mẫu)", "url": "https://koileather.com/san-pham/kep-tien-money-clip/" },
        { "@type": "ListItem", "position": 4, "name": "Ví zip mini (2 mẫu)", "url": "https://koileather.com/san-pham/vi-zip-mini/" }
      ]
    },
    {
      "@type": "BreadcrumbList",
      "@id": "https://koileather.com/lam-vi-da-theo-yeu-cau/#breadcrumb",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Trang chủ", "item": "https://koileather.com/" },
        { "@type": "ListItem", "position": 2, "name": "Ví da cho nam", "item": "https://koileather.com/san-pham/vi-da-cho-nam/" },
        { "@type": "ListItem", "position": 3, "name": "Làm ví da theo yêu cầu", "item": "https://koileather.com/lam-vi-da-theo-yeu-cau/" }
      ]
    },
    {
      "@type": "FAQPage",
      "@id": "https://koileather.com/lam-vi-da-theo-yeu-cau/#faq",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Đặt riêng một chiếc ví da hết bao nhiêu?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Ví nam ở xưởng nằm trong khoảng 3,3 đến 11,8 triệu, phần lớn quanh 4,8 triệu. Ví nữ trải rộng hơn: 1,8 đến 28,0 triệu, phần lớn quanh 6,8 triệu. Kẹp tiền 1,2 đến 3,8 triệu. Đơn đặt riêng tính theo loại da, dáng ví và số khe thẻ bạn chọn."
          }
        },
        {
          "@type": "Question",
          "name": "Vì sao ví nữ chênh nhau tới hơn mười lần, còn ví nam thì không?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Gần như toàn bộ khoảng chênh đó đến từ loại da. Cùng một dáng ví, làm bằng da bò thuộc thảo mộc và làm bằng da cá sấu là hai con số khác hẳn nhau; ví nữ có nhiều mẫu dùng da đặc biệt hơn nên biên giá rộng hơn ví nam."
          }
        },
        {
          "@type": "Question",
          "name": "Có khắc tên lên ví được không?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Được, đây là yêu cầu phổ biến nhất trong các đơn đặt riêng ví. Kỹ thuật khắc và số ký tự tối đa: [NGƯỜI BÁN ĐIỀN: kỹ thuật khắc dùng cho ví + giới hạn số ký tự]."
          }
        },
        {
          "@type": "Question",
          "name": "Ví da cá sấu có giấy tờ hợp pháp không?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "[NGƯỜI BÁN ĐIỀN: giấy tờ CITES cho da cá sấu — loại giấy, cấp cho từng sản phẩm hay cho lô da, khách có được nhận bản sao không]."
          }
        },
        {
          "@type": "Question",
          "name": "Làm một chiếc ví đặt riêng mất bao lâu?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "[NGƯỜI BÁN ĐIỀN: thời gian làm cho nhóm ví, tính từ lúc chốt bản rập; nêu riêng trường hợp da đặc biệt phải chờ nguyên liệu]."
          }
        },
        {
          "@type": "Question",
          "name": "Nhận ví rồi mà không vừa ý thì sao?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "[NGƯỜI BÁN ĐIỀN: chính sách với hàng đặt riêng — sửa lại được những gì, trường hợp nào không nhận đổi; phải khớp với trang Chính Sách Hoàn Tiền, Đổi Trả]."
          }
        }
      ]
    }
  ]
}
```

**Về FAQPage:** Google đã bỏ FAQ rich result khỏi kết quả tìm kiếm từ **7/5/2026**. Khối này giữ lại vì hai lý do khác: người đọc trên điện thoại (64% khách) cần câu trả lời gọn, và AI Overviews vẫn đọc dữ liệu có cấu trúc. **Đừng mong sao/hộp mở rộng trên SERP, đừng nhồi thêm câu hỏi cho đẹp schema.** Sáu câu là đủ; mỗi câu trong JSON-LD phải trùng đúng chữ với FAQ hiển thị ở khối 10 — lệch chữ là lỗi schema.

**Ba điều kiểm trước khi đẩy:**
1. Mọi câu `[NGƯỜI BÁN ĐIỀN]` còn sót thì **xoá cả Question đó khỏi JSON-LD**, đừng để nguyên chữ trong ngoặc vuông lên bản chạy thật.
2. `numberOfItems` phải khớp số phần tử `itemListElement` nếu về sau thêm/bớt nhóm ví.
3. Kiểm `/lien-he/` đã thật sự có `@id` là `https://koileather.com/lien-he/#localbusiness` chưa. Nếu chưa khai thì tham chiếu `provider` ở trên trỏ vào chỗ trống — phải khai `LocalBusiness` ở `/lien-he/` trước, dùng số 0901 678 999 và địa chỉ Số 2/16 Nguyễn Bặc, Tân Sơn Hòa, TP. HCM.
