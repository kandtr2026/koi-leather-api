# Landing `/day-da-dong-ho/` — Phần 3A: liên kết nội bộ & JSON-LD

Mã landing: `day-da-dong-ho-dat-rieng` · URL giữ nguyên `/day-da-dong-ho/` (loại B, nâng cấp tại chỗ).
Tiếp nối khối 1–6 (phần 1) và khối 7–12 (phần 2).

---

## 13. Liên kết nội bộ

### 13.1 Link ĐI RA từ landing (14 link)

Mọi URL dưới đây đã kiểm lại trong BRIEF mục 1 và mục 2. Không thêm URL nào ngoài bảng này.

| URL đích | Chữ neo | Đặt ở khối | Vì sao |
|---|---|---|---|
| `/san-pham/day-da-dong-ho/` | xem 43 mẫu dây da đang có sẵn | 1 Hero (link chữ dưới nút, không phải nút) | Khách muốn duyệt hàng có sẵn thoát sớm sang đúng vai `/san-pham/`, không đọc hết landing rồi mới rời |
| `/cach-do-size-day-dong-ho-cuc-chuan-chinh-xac-phu-hop-voi-moi-loai-dong-ho/` | cách tự đo cỡ dây tại nhà | 4 Quy trình, bước đo | Khách chưa biết cỡ dây là điểm tắc lớn nhất trước khi nhắn tin; đưa lối tự làm ngay tại bước đo |
| `/lam-day-da-dong-ho-handmade-theo-yeu-cau-koi-leather/` | quy trình làm dây handmade theo yêu cầu, kể chi tiết hơn | 4 Quy trình, cuối khối | Bài dịch vụ 4.687 ký tự cùng ý định "đặt làm" — landing là hub, bài này là chiều sâu |
| `/da-ca-sau-that/` | da cá sấu thật, phân biệt thế nào | 5 Bảng chất liệu, dòng cá sấu | Từ khoá đích "dây da đồng hồ da cá sấu" cần chiều sâu chứng minh, không nhồi vào landing |
| `/da-togo/` | da Togo | 5 Bảng chất liệu | Loại da chênh giá rõ; bài 9.993 ký tự |
| `/da-epsom-la-gi/` | da Epsom là gì | 5 Bảng chất liệu | Cụm định tính được phép nhắm (BRIEF mục 5) |
| `/da-de-alran/` | da dê Alran | 5 Bảng chất liệu | Có organic thật (1 khách Google) → link ngược lại có ích cho cả hai |
| `/da-da-dieu/` | da đà điểu | 5 Bảng chất liệu | Loại da đắt, giải thích khoảng giá trên của dải 1,4–7,4 triệu |
| `/da-de-thuoc/` | da dê thuộc | 5 Bảng chất liệu | Cùng nhóm chất liệu mềm cho dây nhỏ |
| `/da-togo-va-da-epsom/` | Togo và Epsom khác nhau ở đâu | 5 Bảng chất liệu, cuối khối | Câu hỏi so sánh khách hỏi thật; giữ khách trong cụm chất liệu |
| `/cham-soc-bao-quan-do-da-dung-cach-html/` | cách chăm dây da cho bền | 6 Thông số | Trả lời "dùng được bao lâu" bằng bài có sẵn thay vì hứa suông |
| `/dich-vu-sua-con-dia-day-dong-ho/` | sửa con đĩa dây đồng hồ | 10 FAQ, câu "con đĩa lỏng" | Bài này CÓ organic thật (1 khách Google) → chứng minh câu FAQ là câu khách hỏi thật |
| `/thay-day-dong-ho/` | thay dây đồng hồ (bài tổng) | 12 Bài liên quan | Bài tổng 8.298 ký tự là đầu cụm 28 bài; link 1 phát tới đầu cụm thay vì kê 25 hãng |
| `/lien-he/` | địa chỉ xưởng và giờ mở cửa | 11 CTA cuối, dòng chữ nhỏ | `/lien-he/` đang có **0 link trỏ tới** (BRIEF 3.3) và giữ `LocalBusiness @id`; landing này phải là nguồn link đầu tiên |

**Không link, có chủ đích:**

- 25 bài `thay-day-da-dong-ho-{hãng}` — **không kê tên hãng nào trong landing**. Kê ra thì (a) khối "bài liên quan" loãng chủ đề, (b) kéo `thay-day-da-dong-ho-hermes` (cờ thương hiệu, BRIEF mục 6) lên vị trí nổi bật. Cụm này chỉ chảy **một chiều vào** landing — xem 13.2.
- `/san-pham/watch-case/` — 1 SP, 3,8 triệu, mô tả 17 ký tự. Nhắc trong lời khối 7 là dịch vụ có làm hộp đựng, nhưng chưa đủ nội dung để đáng một link. `[NGƯỜI BÁN ĐIỀN: có mở rộng watch-case thành nhóm hàng thật không — nếu có mới link]`
- `/3961-2/` và `/7657-2/` — demo theme và title rỗng. Không link.

### 13.2 Link TRỎ VỀ landing (chiều ngược, 29 link)

Đây là tài sản lớn nhất của landing này: kho link nội bộ rộng nhất site. Luồng phải là một chiều — bài con trỏ vào hub, hub không kê ngược.

| Trang/bài nguồn | Chữ neo đặt vào | Đặt ở đâu trong bài |
|---|---|---|
| `/lam-day-da-dong-ho-handmade-theo-yeu-cau-koi-leather/` | đặt riêng dây da đồng hồ theo số đo | Cuối phần mở đầu **và** cuối bài (2 link, đây là bài gần ý định nhất) |
| `/cach-do-size-day-dong-ho-cuc-chuan-chinh-xac-phu-hop-voi-moi-loai-dong-ho/` | đo xong rồi, đặt làm dây theo số đo của bạn | Ngay sau bảng/hướng dẫn đo — khách vừa có số đo là lúc sẵn sàng nhất |
| `/dich-vu-sua-con-dia-day-dong-ho/` | thay hẳn dây mới làm riêng theo cỡ | Cuối bài, sau khi nói xong việc sửa |
| `/thay-day-dong-ho/` | đặt làm dây da riêng thay vì mua dây có sẵn | Giữa bài, ở đoạn nói về chọn dây da |
| 25 bài `thay-day-da-dong-ho-{hãng}` | **dùng chung một chữ neo**: đặt làm dây da đồng hồ theo số đo | Một khối "Đặt làm dây riêng" chèn cuối mỗi bài (BRIEF mục 2 đã chốt việc này) |

Ghi chú cho người dựng: **giữ nguyên một chữ neo cho cả 25 bài hãng** là chủ ý — cụm này đang trùng lặp shingle 11,2% (cặp xấu nhất 43,2%: `versace` ↔ `salvatore-ferragamo`), viết 25 chữ neo khác nhau chỉ làm tăng bề mặt trùng lặp mà không thêm tín hiệu. Khối chèn không được nêu lại tên hãng của bài chứa nó.

Tổng: **14 link đi ra + 29 link trỏ về = 43 link nội bộ**.

---

## 14. JSON-LD

Dán vào `<script type="application/ld+json">` trong trang. Một khối `@graph` duy nhất.

**Ba điều bắt buộc, đã kiểm theo BRIEF mục 4:**
- **KHÔNG** khai `Product`. Landing giữ vai dịch vụ; `Product` thuộc `/cua-hang/{slug}/`.
- **KHÔNG** khai `aggregateRating`, `review`, `ratingValue` — chưa có đánh giá thật nào.
- `LocalBusiness` chỉ **tham chiếu** `@id`, khai thật đúng một lần ở `/lien-he/`.

**Về FAQPage:** Google đã bỏ FAQ rich result khỏi Search từ **7/5/2026**. Giữ `FAQPage` là để người đọc và để AI Overviews trích được, **không phải để lấy rich result** — đừng nhồi thêm câu hỏi vì tưởng sẽ có ngôi sao trên kết quả tìm kiếm.

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Service",
      "@id": "https://koileather.com/day-da-dong-ho/#service",
      "name": "Đặt làm dây da đồng hồ theo yêu cầu",
      "serviceType": "Đặt làm dây da đồng hồ thủ công theo số đo",
      "url": "https://koileather.com/day-da-dong-ho/",
      "provider": { "@id": "https://koileather.com/lien-he/#localbusiness" },
      "areaServed": { "@type": "Country", "name": "Việt Nam" },
      "availableChannel": [
        {
          "@type": "ServiceChannel",
          "serviceUrl": "https://koileather.com/day-da-dong-ho/",
          "servicePhone": { "@type": "ContactPoint", "telephone": "+84901678999", "contactType": "customer service" }
        }
      ],
      "hasOfferCatalog": {
        "@type": "OfferCatalog",
        "name": "Dây da đồng hồ đặt riêng",
        "itemListElement": [
          { "@type": "OfferCatalog", "name": "Dây da bò đặt theo số đo" },
          { "@type": "OfferCatalog", "name": "Dây da cá sấu đặt theo số đo" },
          { "@type": "OfferCatalog", "name": "Dây da dê, da đà điểu đặt theo số đo" }
        ]
      }
    },
    {
      "@type": "ItemList",
      "@id": "https://koileather.com/day-da-dong-ho/#danhsach",
      "name": "Mẫu dây da đồng hồ đã làm tại xưởng KOI Leather",
      "itemListOrder": "https://schema.org/ItemListUnordered",
      "numberOfItems": 6,
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "url": "https://koileather.com/cua-hang/[NGƯỜI DỰNG ĐIỀN: slug SP 1]/" },
        { "@type": "ListItem", "position": 2, "url": "https://koileather.com/cua-hang/[NGƯỜI DỰNG ĐIỀN: slug SP 2]/" },
        { "@type": "ListItem", "position": 3, "url": "https://koileather.com/cua-hang/[NGƯỜI DỰNG ĐIỀN: slug SP 3]/" },
        { "@type": "ListItem", "position": 4, "url": "https://koileather.com/cua-hang/[NGƯỜI DỰNG ĐIỀN: slug SP 4]/" },
        { "@type": "ListItem", "position": 5, "url": "https://koileather.com/cua-hang/[NGƯỜI DỰNG ĐIỀN: slug SP 5]/" },
        { "@type": "ListItem", "position": 6, "url": "https://koileather.com/cua-hang/[NGƯỜI DỰNG ĐIỀN: slug SP 6]/" }
      ]
    },
    {
      "@type": "BreadcrumbList",
      "@id": "https://koileather.com/day-da-dong-ho/#breadcrumb",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Trang chủ", "item": "https://koileather.com/" },
        { "@type": "ListItem", "position": 2, "name": "Dây da đồng hồ", "item": "https://koileather.com/san-pham/day-da-dong-ho/" },
        { "@type": "ListItem", "position": 3, "name": "Đặt làm dây da đồng hồ theo yêu cầu", "item": "https://koileather.com/day-da-dong-ho/" }
      ]
    },
    {
      "@type": "FAQPage",
      "@id": "https://koileather.com/day-da-dong-ho/#faq",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Đặt làm dây da đồng hồ riêng giá bao nhiêu?",
          "acceptedAnswer": { "@type": "Answer", "text": "Dây da đồng hồ tại xưởng hiện từ 1,4 triệu đến 7,4 triệu đồng, phần lớn quanh 2,2 triệu. Chênh lệch nằm ở loại da: da bò và da dê ở dải dưới, da cá sấu và da đà điểu ở dải trên." }
        },
        {
          "@type": "Question",
          "name": "Tôi không biết cỡ dây đồng hồ của mình thì làm sao?",
          "acceptedAnswer": { "@type": "Answer", "text": "Bạn chỉ cần đo bề rộng chỗ dây gắn vào vỏ đồng hồ và độ dài dây cũ. Xưởng có bài hướng dẫn tự đo tại nhà; nếu vẫn không chắc, nhắn Zalo gửi ảnh đồng hồ là nghệ nhân đọc được thông số." }
        },
        {
          "@type": "Question",
          "name": "Con đĩa dây đồng hồ bị lỏng, có phải làm lại cả dây không?",
          "acceptedAnswer": { "@type": "Answer", "text": "Không nhất thiết. Xưởng có nhận sửa riêng con đĩa. Trường hợp phần da đã giãn hoặc nứt chân dây thì làm dây mới mới bền, lúc đó nghệ nhân sẽ nói thẳng thay vì cố sửa." }
        },
        {
          "@type": "Question",
          "name": "Dây da cá sấu đặt riêng có giấy tờ nguồn gốc không?",
          "acceptedAnswer": { "@type": "Answer", "text": "[NGƯỜI BÁN ĐIỀN: giấy tờ CITES cho da cá sấu — có cấp cho khách lẻ hay chỉ áp dụng đơn xuất khẩu]" }
        },
        {
          "@type": "Question",
          "name": "Làm một chiếc dây riêng mất bao lâu?",
          "acceptedAnswer": { "@type": "Answer", "text": "[NGƯỜI BÁN ĐIỀN: thời gian làm dây da đồng hồ, tính từ lúc chốt mẫu; nếu da cá sấu lâu hơn thì ghi riêng]" }
        },
        {
          "@type": "Question",
          "name": "Đặt riêng rồi không vừa ý thì sao?",
          "acceptedAnswer": { "@type": "Answer", "text": "[NGƯỜI BÁN ĐIỀN: chính sách đổi trả hàng đặt riêng — phải khớp trang Chính Sách Hoàn Tiền, Đổi Trả]" }
        }
      ]
    }
  ]
}
```

### 14.1 Việc người dựng phải làm trước khi dán

1. **6 slug trong `ItemList`** — lấy đúng 6 sản phẩm hiện trên lưới khối 7 (danh mục `day-da-dong-ho`), **bỏ sản phẩm giá 0** (danh mục này có 1 SP giá 0). `ListItem` ở đây chỉ khai `url`, cố tình không khai `name`/`image`/`offers` để không biến thành `Product` gián tiếp.
2. **Ba câu FAQ còn `[NGƯỜI BÁN ĐIỀN]`** — nếu tới ngày xuất bản vẫn chưa có câu trả lời thì **xoá hẳn câu đó khỏi cả JSON-LD lẫn khối 10**, không dán chỗ trống lên trang.
3. **Chữ trong `acceptedAnswer` phải trùng chữ hiển thị ở khối 10.** Lệch nhau là schema sai lệch nội dung.
4. `/lien-he/` phải có khối `LocalBusiness` với `@id` đúng `https://koileather.com/lien-he/#localbusiness` **trước** khi landing lên sóng, nếu không `provider` trỏ vào hư không.
5. Không thêm `datePublished`/`author` cho `Service`. Không thêm `offers`, `price`, `priceRange` vào bất kỳ nút nào trong graph này — giá đã nói bằng chữ ở khối 3, khai giá trong schema mà không có `Product` hợp lệ là mở đường cho lỗi Search Console.
