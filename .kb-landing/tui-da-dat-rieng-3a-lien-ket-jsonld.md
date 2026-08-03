# tui-da-dat-rieng — PHẦN 3A: Liên kết nội bộ & JSON-LD

URL: `/dich-vu-lam-tui-da-theo-yeu-cau/` (giữ nguyên, viết lại tại chỗ)

---

## 13. Liên kết nội bộ

### 13.1 Link ĐI RA từ landing (17 link)

Mọi URL dưới đây đã đối chiếu lại với mục 1 và mục 2 BRIEF.md.

| URL đích | Chữ neo | Khối | Vì sao |
|---|---|---|---|
| `/tui-da-nu/` | xem 49 mẫu túi nữ đang có sẵn | 1 Hero (dòng gỡ lo) | Khách "đặt riêng" vẫn muốn sờ mẫu trước. Trả ý định "duyệt hàng" về trang tĩnh, giữ landing sạch cho ý định dịch vụ |
| `/tui-da-nam/` | 14 mẫu túi nam đang có sẵn | 1 Hero (dòng gỡ lo) | Cùng lý do; đồng thời là chỗ nói thật kho mẫu nam mỏng hơn |
| `/san-pham/tui-da-cho-nu/` | lưới túi nữ theo giá | 3 Khoảng giá | Khách vừa đọc "3,8 – 79,0 triệu" cần thấy món cụ thể ở từng mức |
| `/san-pham/tui-da-cho-nam/` | lưới túi nam theo giá | 3 Khoảng giá | Như trên, cho dải 6,9 – 39,0 triệu |
| `/thiet-ke-do-da-theo-yeu-cau/` | cách xưởng dựng thiết kế từ mô tả của khách | 4 Quy trình, bước 1–2 | Bài dài nhất trong nhóm đặt làm (14.717 ký tự) — gánh phần lý thuyết để landing không phình |
| `/quy-trinh-che-tac-karkarbag/` | một chiếc túi đi qua bàn nghệ nhân như thế nào | 4 Quy trình, cuối khối | Case chế tác có thật, thay cho việc bịa mô tả quy trình |
| `/da-togo/` | da Togo | 5 Bảng chất liệu | Neo đúng tên loại da, không neo "xem thêm" |
| `/da-epsom-la-gi/` | da Epsom | 5 Bảng chất liệu | Như trên |
| `/da-ca-sau-that/` | da cá sấu thật | 5 Bảng chất liệu | Cụm định tính BRIEF mục 5 cho phép nhắm |
| `/da-de-alran/` | da dê Alran | 5 Bảng chất liệu | Có 1 khách Google riêng — đã có tín hiệu |
| `/da-de-thuoc/` | da dê thuộc | 5 Bảng chất liệu | Làm lót túi, giải thích chênh giá |
| `/da-togo-vs-da-clemence/` | Togo khác Clemence ở đâu | 5 Bảng chất liệu | Trả lời "vì sao giá chênh" bằng bài so sánh sẵn có |
| `/cach-bao-quan-da-togo/` | cách giữ da Togo lâu bền | 5 Bảng chất liệu (chân bảng) | Hậu mãi — giữ khách đọc thêm sau khi chốt chất liệu |
| `/bo-sua-tap-tui-da-nu-cao-cap-rubellite-koi-leather/` | bộ sưu tập Rubellite | 7 Lưới sản phẩm | Bằng chứng xưởng tự thiết kế trọn bộ, không chỉ nhận gia công |
| `/bo-suu-tap-tui-da-cao-cap-mettique-koi-leather/` | bộ sưu tập Mettique | 7 Lưới sản phẩm | Như trên |
| `/chinh-sach-hoan-tien-doi-tra/` | chính sách đổi trả | 8 Bảng cam kết | Khối cam kết bắt buộc trỏ về văn bản thật, không tự phát minh điều khoản |
| `/goi-y-nhung-mau-tui-thoi-trang-handmade-hut-hon-chi-em-cong-so/` | gợi ý mẫu túi cho chị em công sở | 12 Bài liên quan | Ý định "chưa biết đặt gì" — đưa vào `PostList` |
| `/lien-he/` | địa chỉ xưởng và giờ mở cửa | 11 CTA cuối | `/lien-he/` hiện **0 link trỏ tới** (BRIEF 3.3). Landing này là link đầu tiên |

Ghi chú dựng:
- 18 dòng bảng nhưng `/lien-he/` là link kỹ thuật (địa chỉ), 17 link nội dung.
- `/san-pham/tui-da-cho-nu/` và `/san-pham/tui-da-cho-nam/` phải viết **đúng một đoạn path**, không thêm tiền tố — lỗi 3.4 (canonical vô hạn URL) chưa sửa, viết `/san-pham/do-da-.../tui-da-cho-nu/` là tự sinh URL rác.
- Bốn bài `tui-hermes-da-*` bị loại khỏi mọi link ở đây: BRIEF mục 6 cấm dẫn khách đặt-riêng sang trang mang tên thương hiệu khác.
- Không link `/3961-2/`, `/7657-2/` (rác theme), không link tag.

### 13.2 Link TRỎ VỀ landing (chiều ngược — 5 việc)

Việc sửa nằm ở trang nguồn, không nằm trong landing này.

| Trang nguồn | Chữ neo đặt ở nguồn | Đặt chỗ nào trong bài nguồn |
|---|---|---|
| `/thiet-ke-do-da-theo-yeu-cau/` (14.717) | đặt làm túi da theo yêu cầu tại xưởng | Cuối phần nói về túi — bài này rộng cả đồ da, landing là nhánh túi |
| `/goi-y-nhung-mau-tui-thoi-trang-handmade-hut-hon-chi-em-cong-so/` (2.954) | không thấy mẫu nào vừa ý? đặt làm túi da riêng theo phom bạn muốn | Kết bài, sau danh sách mẫu |
| `/quy-trinh-che-tac-karkarbag/` (5.065) | quy trình đặt làm túi da theo yêu cầu | Mở bài, câu dẫn |
| `/bo-sua-tap-tui-da-nu-cao-cap-rubellite-koi-leather/` (3.978) | đổi da, đổi màu chỉ, đổi khoá cho mẫu này | Ngay dưới phần mô tả biến thể |
| `/bo-suu-tap-tui-da-cao-cap-mettique-koi-leather/` (2.039) | đặt riêng một chiếc theo số đo của bạn | Kết bài |

Hai trang tĩnh `/tui-da-nu/` (28.444) và `/tui-da-nam/` (26.965) cũng nên trỏ về, nhưng **chữ neo phải khác nhau** để không tự cắn từ khoá với landing: `/tui-da-nu/` neo `đặt làm túi da nữ theo phom riêng`, `/tui-da-nam/` neo `đặt làm túi da nam theo số đo`. Landing giữ cụm gốc `làm túi da theo yêu cầu`. Bảng phân vai đầy đủ ở phần 1.

---

## 14. JSON-LD

Dán vào `<script type="application/ld+json">` trong page của URL này. Một khối `@graph`, không tách nhiều thẻ.

**Google đã bỏ FAQ rich result khỏi Search từ 7/5/2026.** `FAQPage` dưới đây giữ lại **cho người đọc và cho AI Overviews / trích dẫn của LLM**, không phải để lấy ngôi sao trên SERP. Đừng nhồi thêm câu hỏi vì lý do rich result — không còn rich result nào để lấy.

Không khai `Product`. Không khai `aggregateRating`, `review`, `ratingValue` — chưa có đánh giá thật (BRIEF mục 4). `LocalBusiness` chỉ tham chiếu bằng `@id`, khai đúng một lần ở `/lien-he/`.

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Service",
      "@id": "https://koileather.com/dich-vu-lam-tui-da-theo-yeu-cau/#service",
      "name": "Đặt làm túi da thủ công theo yêu cầu",
      "serviceType": "Đặt riêng túi da thủ công",
      "description": "Xưởng đồ da thủ công KOI Leather nhận đặt làm túi da nữ và túi da nam theo phom, số đo và chất liệu do khách chọn. Túi nữ khoảng 3,8 – 79,0 triệu đồng, phần lớn quanh 11,5 triệu; túi nam khoảng 6,9 – 39,0 triệu đồng, phần lớn quanh 16,0 triệu.",
      "provider": { "@id": "https://koileather.com/lien-he/#localbusiness" },
      "areaServed": { "@type": "Country", "name": "Việt Nam" },
      "url": "https://koileather.com/dich-vu-lam-tui-da-theo-yeu-cau/",
      "termsOfService": "https://koileather.com/chinh-sach-hoan-tien-doi-tra/",
      "hasOfferCatalog": {
        "@type": "OfferCatalog",
        "name": "Túi da đặt riêng",
        "itemListElement": [
          {
            "@type": "OfferCatalog",
            "name": "Túi da nữ",
            "url": "https://koileather.com/san-pham/tui-da-cho-nu/"
          },
          {
            "@type": "OfferCatalog",
            "name": "Túi da nam",
            "url": "https://koileather.com/san-pham/tui-da-cho-nam/"
          }
        ]
      }
    },
    {
      "@type": "ItemList",
      "@id": "https://koileather.com/dich-vu-lam-tui-da-theo-yeu-cau/#quytrinh",
      "name": "Quy trình đặt làm túi da theo yêu cầu",
      "itemListOrder": "https://schema.org/ItemListOrderAscending",
      "numberOfItems": 5,
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Nhắn Zalo kể ý tưởng, gửi ảnh tham khảo" },
        { "@type": "ListItem", "position": 2, "name": "Chọn da và phụ kiện, xem da thật tại xưởng hoặc qua ảnh" },
        { "@type": "ListItem", "position": 3, "name": "Dựng rập và chốt phom, số đo" },
        { "@type": "ListItem", "position": 4, "name": "Nghệ nhân cắt, may, hoàn thiện thủ công" },
        { "@type": "ListItem", "position": 5, "name": "Kiểm tra cùng khách và giao hàng" }
      ]
    },
    {
      "@type": "BreadcrumbList",
      "@id": "https://koileather.com/dich-vu-lam-tui-da-theo-yeu-cau/#breadcrumb",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Trang chủ",
          "item": "https://koileather.com/"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Túi da nữ",
          "item": "https://koileather.com/tui-da-nu/"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": "Đặt làm túi da theo yêu cầu"
        }
      ]
    },
    {
      "@type": "FAQPage",
      "@id": "https://koileather.com/dich-vu-lam-tui-da-theo-yeu-cau/#faq",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Đặt làm túi da theo yêu cầu giá bao nhiêu?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Túi da nữ ở xưởng dao động 3,8 – 79,0 triệu đồng, phần lớn quanh 11,5 triệu. Túi da nam 6,9 – 39,0 triệu đồng, phần lớn quanh 16,0 triệu. Túi đặt riêng nằm cùng dải này; chênh lệch đến từ loại da, kích cỡ và phụ kiện kim khí."
          }
        },
        {
          "@type": "Question",
          "name": "Tôi có được xem da thật trước khi đặt không?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Được. Bạn tới xưởng ở số 2/16 Nguyễn Bặc, Tân Sơn Hòa, TP. HCM để sờ trực tiếp, hoặc nhắn Zalo 0901 678 999 để xưởng gửi ảnh và video từng tấm da đang có."
          }
        },
        {
          "@type": "Question",
          "name": "Xưởng có sẵn bao nhiêu mẫu túi để tham khảo?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Hiện có 49 mẫu túi nữ và 14 mẫu túi nam đang bán. Kho mẫu nam mỏng hơn nhiều so với nữ, nên khách nam thường phải làm từ ảnh tham khảo thay vì sờ thử mẫu tại xưởng."
          }
        },
        {
          "@type": "Question",
          "name": "Làm một chiếc túi đặt riêng mất bao lâu?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "[NGƯỜI BÁN ĐIỀN: thời gian làm túi da đặt riêng, tính theo ngày làm việc, nêu riêng túi nữ và túi nam]"
          }
        },
        {
          "@type": "Question",
          "name": "Đặt riêng có phải cọc trước không?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "[NGƯỜI BÁN ĐIỀN: % cọc và thời điểm thu; nhắn Zalo tư vấn thì không cần cọc]"
          }
        },
        {
          "@type": "Question",
          "name": "Nhận túi mà không vừa ý thì xử lý thế nào?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "[NGƯỜI BÁN ĐIỀN: chính sách sửa/đổi cho hàng đặt riêng — phải khớp trang chinh-sach-hoan-tien-doi-tra, đừng viết lệch]"
          }
        }
      ]
    }
  ]
}
```

Kiểm trước khi đẩy:
1. Ba ô `[NGƯỜI BÁN ĐIỀN]` trong `FAQPage` phải điền xong mới xuất bản — schema chứa dấu ngoặc vuông là lỗi nhìn thấy được trên AI Overviews.
2. Câu trả lời trong JSON-LD phải **giống chữ hiện trên trang** ở khối 10. Sửa một bên thì sửa cả hai.
3. Không thêm `offers`/`price` vào bất kỳ node nào ở đây — landing không phải trang bán một món.
4. `numberOfItems` phải khớp số bước thật ở khối 4 sau khi phần 1 chốt.
5. `/lien-he/#localbusiness` phải tồn tại thật trước khi dán, nếu không `provider` là tham chiếu treo. Nếu chưa có, tạm bỏ cả khoá `provider`, đừng khai `LocalBusiness` lần hai ở đây.
