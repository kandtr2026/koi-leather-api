# BRIEF — Landing "đặt riêng" cho koileather.com (số liệu đã kiểm chứng)

> Mọi số trong file này lấy trực tiếp từ database production ngày 2026-08-03.
> Agent KHÔNG được bịa thêm số. Thiếu số thì viết `[NGƯỜI BÁN ĐIỀN: ...]`.

---

## 0. BA SỰ THẬT ĐỔI CẢ CÁCH THIẾT KẾ

### 0.1 "90 ngày traffic" thực chất là 1,5 ngày

`koi_free_style.koi_page_views` có dòng đầu tiên lúc `2026-08-01 12:23 UTC`, dòng cuối
`2026-08-03 01:40 UTC`. Tổng 790 lượt.

**Hệ quả bắt buộc: "0 lượt organic" KHÔNG phải bằng chứng trang chết — nó là CHƯA ĐO.**
Cấm 301 bất kỳ URL nào dựa trên dữ liệu 1,5 ngày. Muốn 301 thì phải đọc Google Search
Console trước (dữ liệu 16 tháng), không phải đọc bảng này.

### 0.2 Cửa vào organic là BÀI VIẾT DỊCH VỤ, không phải trang danh mục

Khách riêng từ Google (1,5 ngày):

| Khách | Trang | Loại |
|---|---|---|
| 22 | `/` | chủ |
| 13 | `/qua-tang-doanh-nghiep-cuoi-nam/` | bài B2B |
| 10 | `/cua-hang/` | lưới shop |
| 6 | `/dinh-vu-do-va-cat-day-lung-chuyen-nghiep/` | bài dịch vụ (slug sai chính tả "dinh-vu" — **GIỮ NGUYÊN**) |
| 6 | `/dich-vu-lam-tui-da-theo-yeu-cau/` | bài dịch vụ |
| 5 | `/khac-ten-len-vi-da/` | bài dịch vụ |
| 3 | `/san-pham/card-holder/` | danh mục |
| 3 | `/dich-vu-boc-da-tai-nghe-cao-cap/` | bài dịch vụ |
| 3 | `/cua-hang/charm-cuu/` | sản phẩm |
| 2 | `/dich-vu-sua-chua-vi-da-cao-cap/`, `/dich-vu-sua-chua-spa-tui-da-hang-hieu/`, `/sua-chua-do-da/` | sửa chữa |
| 2 | `/bao-da-dien-thoai-op-lung-da-qua-doanh-nghiep-cao-cap/` | bài B2B |
| 2 | `/san-pham/bao-da-ipad/` | danh mục |
| 1 | `/dat-lam-day-lung-da-ca-sau/`, `/da-de-alran/`, `/lookbook/`, `/spa-tui-hieu/`, `/sua-tui-lv/`, `/sua-chua-balo/`, `/dich-vu-khac-ten-len-san-pham-khac-ten-theo-yeu-cau/`, `/dich-vu-sua-con-dia-day-dong-ho/`, `/dich-vu-sua-chua-spa-do-da-cao-cap/`, `/san-pham/boc-da-tai-nghe/`, `/san-pham/boc-khoa-o-to/`, `/san-pham/charm-deo-tui-bang-da/`, `/thay-da-tai-nghe-sony-wh-1000xm4-va-marshall-nen-chon-loai-da-nao-tot-nhat/`, 6 trang `/cua-hang/...` | |

Tổng theo nguồn (khách riêng): direct 115 · google 103 · facebook 60 · internal 58 ·
instagram 12 · search_khac 2.

**Ý định "đặt riêng" đã có URL đang hút organic.** Cho nên KHÔNG dựng cây URL mới
`/dat-lam/{slug}/`. Làm vậy là tạo tầng cạnh tranh nội bộ thứ ba và tự dập tài sản duy
nhất đang chạy.

### 0.3 Quyết định kiến trúc URL: NÂNG CẤP TẠI CHỖ

Mỗi landing = **một URL đã tồn tại, được viết lại**. Ba loại:

- **Loại A — bài dịch vụ đang có organic** → viết lại thành landing, giữ URL 100%.
- **Loại B — trang tĩnh dài, chưa đo được organic** → viết lại thành landing, giữ URL.
  Bắt buộc đọc Search Console trước khi đổi title.
- **Loại C — không có URL nào phù hợp** → mới được tạo URL mới, và phải nói rõ vì sao.

`/san-pham/{slug}/` giữ đúng vai **duyệt hàng có sẵn**: H1 = tên danh mục, mô tả ngắn,
lưới sản phẩm, không viết văn dài. Landing giữ vai **ý định dịch vụ**. Mỗi landing phải
có bảng phân vai nói rõ nó khác `/san-pham/{slug}/` tương ứng ở H1, title, từ khoá đích.

---

## 1. SỐ SẢN PHẨM & GIÁ THẬT THEO DANH MỤC

Đếm qua bảng nối `koi_product_categories` — **đúng cách storefront đếm**
(`shop.service.ts:389` dùng `categoryLinks`, không dùng `p.categoryId`). Chỉ tính
`status='ACTIVE'`. Giá đơn vị triệu đồng, đã loại sản phẩm giá 0.

| slug danh mục | SP | có giá | giá 0 | min | trung vị | max | mô tả (ký tự) |
|---|---|---|---|---|---|---|---|
| tui-da-cho-nu | 49 | 47 | 2 | 3,8 | 11,5 | 79,0 | 140 |
| day-da-dong-ho | 43 | 42 | 1 | 1,4 | 2,2 | 7,4 | 177 |
| phu-kien-bang-da | 34 | 33 | 1 | 0,8 | 1,8 | 7,9 | 184 |
| vi-da-cho-nu | 29 | 29 | 0 | 1,8 | 6,8 | 28,0 | 184 |
| vi-da-cho-nam | 27 | 27 | 0 | 3,3 | 4,8 | 11,8 | 203 |
| san-pham-khac | 24 | 23 | 1 | 0,3 | 3,3 | 46,0 | 152 |
| leather-phonecase | 24 | 23 | 1 | 0,8 | 2,8 | 8,3 | 141 |
| day-lung-cho-nam | 21 | 21 | 0 | 3,5 | 4,5 | 22,0 | 205 |
| kep-tien-money-clip | 15 | 15 | 0 | 1,2 | 1,4 | 3,8 | 157 |
| tui-da-cho-nam | 14 | 14 | 0 | 6,9 | 16,0 | 39,0 | 234 |
| card-holder | 14 | 14 | 0 | 1,8 | 2,8 | 9,5 | 156 |
| trademark | 13 | 12 | 1 | 2,5 | 5,2 | 28,0 | **0** |
| charm-deo-tui-bang-da | 12 | 12 | 0 | 0,7 | 1,8 | 4,6 | 140 |
| phu-kien-rieng-customize-hardware | 11 | 11 | 0 | 1,8 | 9,5 | 28,0 | **0** |
| signature-leather-goods | 11 | 9 | 2 | 2,8 | 11,5 | 79,0 | 168 |
| leather-passport-cover | 10 | 10 | 0 | 1,8 | 2,8 | 4,2 | 171 |
| may-tram-chan | 10 | 10 | 0 | 1,4 | 5,7 | 9,9 | **0** |
| ban-rap-thiet-ke | 9 | 9 | 0 | 0,1 | 0,1 | 0,1 | 240 — **ĐANG BỊ ẨN** khỏi lưới chung (`shop.service.ts:152`) |
| day-lung-cho-nu | 9 | 9 | 0 | 3,9 | 4,2 | 25,0 | 954 |
| clutch-cho-nam | 7 | 7 | 0 | 6,9 | 33,0 | 68,0 | 223 |
| boc-khoa-o-to | 7 | 7 | 0 | 1,5 | 1,8 | 3,5 | 134 |
| bao-da-ipad | 6 | 5 | 1 | 1,8 | 3,3 | 4,8 | 179 |
| an-lat-woven | 4 | 4 | 0 | 4,5 | 6,7 | 11,8 | **0** |
| keychain-moc-khoa | 4 | 4 | 0 | 0,3 | 0,5 | 0,8 | 158 |
| charm-dung-son | 3 | 3 | 0 | 1,2 | 1,8 | 2,8 | 14 |
| boc-da-tai-nghe | 3 | 2 | 1 | 1,8 | 1,8 | 1,8 | **0** |
| vi-zip-mini | 2 | 2 | 0 | 2,2 | 2,5 | 2,9 | 11 |
| watch-case | 1 | 1 | 0 | 3,8 | 3,8 | 3,8 | 17 |
| cham-khac-tren-da | 1 | 1 | 0 | 1,8 | 1,8 | 1,8 | **0** |
| ca-nhan-hoa (ẩn), doppkit, hop-da, qua-tang-su-kien | 0 | — | — | — | — | — | — |

Ghi chú bắt buộc:
- **0 sản phẩm ACTIVE nào thiếu ảnh** — lưới landing an toàn.
- 9 danh mục còn sản phẩm giá 0 → trang khách đang hiện "0 ₫". Không được viết "từ 0đ".
  Dùng min > 0, hoặc chỉ nêu trung vị.
- `may-tram-chan` (10), `an-lat-woven` (4), `cham-khac-tren-da` (1) là **KỸ THUẬT**, không
  phải loại sản phẩm. Giá cao (trám chần trung vị 5,7tr; đan lát 6,7tr) → dùng làm **khối
  bằng chứng tay nghề** nhúng vào landing lớn, không dựng landing riêng.
- `trademark`, `signature-leather-goods`, `phu-kien-rieng-customize-hardware` là khái niệm
  thương hiệu, không có nhu cầu tìm kiếm. Mô tả = 0 ký tự. Không dựng landing.

### 22 loại da (bảng `koi_material_categories`, dùng `code` — KHÔNG có cột `slug`)

Số SP tính qua bảng nối `koi_product_material_categories` (1 SP có thể nhiều loại da:
thân + lót). Đây là khối chứng cứ đối thủ không copy nổi. Agent phải tự truy vấn lại
để lấy đúng `code`, `name`, số SP nếu cần dùng chi tiết.

---

## 2. BÀI VIẾT & TRANG TĨNH THẬT (chỉ được link tới slug trong đây)

### Trang tĩnh (`public.pages`, độ dài TEXT đã lột thẻ HTML)

| ký tự | URL | title hiện tại |
|---|---|---|
| 43.526 | `/day-da-dong-ho/` | Dây Da Đồng Hồ Cao Cấp – Đa Dạng Chất Liệu, Handmade |
| 39.470 | `/san-xuat-qua-tang-doanh-nghiep-va-su-kien/` | Sản xuất quà tặng Doanh Nghiệp và Sự Kiện |
| 33.435 | `/do-da-danh-cho-nu/` | For Women |
| 28.444 | `/tui-da-nu/` | TÚI DA NỮ |
| 27.802 | `/sua-chua-do-da/` | Sửa Chữa – Spa Đồ Hiệu |
| 26.965 | `/tui-da-nam/` | TÚI DA NAM |
| 23.244 | `/do-da-danh-cho-nam/` | For Men |
| 22.418 | `/qua-tang-doanh-nghiep-va-su-kien/` | Quà tặng doanh nghiệp và sự kiện |
| 20.016 | `/nha-san-xuat-do-da-thu-cong/` | Nha san xuat do da thu cong cao cap tai Viet Nam (có nội dung bài tai nghe lẫn vào — **không gộp**) |
| 17.728 | `/3961-2/` | Signature Items — **là bản demo theme tiếng Anh chưa xoá** |
| 17.657 | `/koi-leather-nha-san-xuat-do-da-thu-cong-cao-cap-tai-viet-nam/` | About Koi Leather |
| 16.852 | `/san-pham/` | Sản phẩm |
| 14.005 | `/tin-tuc-su-kien/` | Tin tức & Sự kiện |
| 12.607 | `/phu-kien-bang-da/` | Phụ Kiện Đồ Da Thủ Công |
| 10.782 | `/qua-tang-thay-co-ngay-20-11/` | Quà tặng tri ân thầy cô 20/11 |
| 4.495 | `/bao-mat-thong-tin/` | Bảo Mật Thông Tin |
| 4.060 | `/7657-2/` | **title RỖNG** |
| 1.943 | `/chinh-sach-hoan-tien-doi-tra/` | Chính Sách Hoàn Tiền, Đổi Trả |
| 1.809 | `/chinh-sach-giao-hang/` | Chính Sách Giao Hàng |
| 576 | `/lien-he/` | Liên hệ — **yếu nhất cho local SEO, 0 lượt xem, không có link nào trỏ tới** |
| 383 | `/huong-dan-thanh-toan/` | Thanh Toán — gần như rỗng |

### 158 bài viết (`public.posts`, `is_published = true`) — nhóm theo ý định

**Nhóm "đặt làm" (8 bài)** — đây là ứng viên landing loại A:
`dat-lam-day-lung-da-ca-sau` 9.857 · `lam-vi-da-theo-yeu-cau` 8.028 ·
`dat-lam-day-nit-that-lung-da-theo-yeu-cau` 7.863 · `dat-lam-day-lung-hermes` 7.730 ⚠ ·
`dat-lam-that-lung-theo-yeu-cau-koi-leather` 7.616 · `dat-lam-vi-da-ca-sau` 6.163 ·
`lam-day-da-dong-ho-handmade-theo-yeu-cau-koi-leather` 4.687 ·
`dat-lam-day-lung-khoa-chu-h` 4.269 ⚠

**Nhóm dịch vụ (8 bài)**:
`dich-vu-sua-chua-spa-do-da-cao-cap` 37.385 · `dich-vu-khac-ten-len-san-pham-khac-ten-theo-yeu-cau` 20.129 ·
`dich-vu-sua-chua-spa-tui-da-hang-hieu` 12.129 · `dich-vu-lam-tui-da-theo-yeu-cau` 11.272 ·
`dich-vu-sua-chua-vi-da-cao-cap` 10.280 · `dinh-vu-do-va-cat-day-lung-chuyen-nghiep` 7.697 ·
`dich-vu-boc-da-tai-nghe-cao-cap` 5.601 · `dich-vu-sua-con-dia-day-dong-ho` 2.334

**Nhóm chất liệu / kiến thức da (40 bài)** — kho link nội bộ cho khối chất liệu:
`vi-da-khac-ten` 18.833 · `da-ca-sau-that` 15.679 · `thiet-ke-do-da-theo-yeu-cau` 14.717 ·
`shop-do-da-tphcm` 11.582 · `xuong-thiet-ke-do-da-thu-cong-theo-moi-yeu-cau-tai-tp-ho-chi-minh` 10.272 ·
`da-togo` 9.993 · `tui-hermes-da-togo` 9.814 ⚠ · `vi-da-ca-sau-cao-cap` 9.571 ·
`tui-hermes-da-epsom` 9.291 ⚠ · `khac-chu-len-vi-da-ky-thuat-dap-nhiet-cao-cap` 9.098 ·
`da-epsom-la-gi` 8.983 · `huong-dan-cach-lua-chon-vi-da-handmade-cuc-xin-cho-nam-gioi` 8.335 ·
`da-togo-va-da-epsom` 8.133 · `da-da-dieu` 7.648 · `cau-chuyen-ve-nhung-chiec-hop-do-da-thu-cong` 7.476 ·
`5-nguyen-tac-lua-chon-cap-da-phu-hop-cho-cac-quy-ong` 7.399 · `phuc-hoi-da-tui-xach` 7.126 ·
`da-de-thuoc` 7.114 · `da-de-alran` 6.474 · `da-ca-sau-va-da-da-dieu` 6.325 ·
`kien-thuc-can-biet-khi-chon-do-da-thu-cong` 6.179 · `do-da-cao-cap-do-da-that-koi-leather` 6.133 ·
`da-togo-vs-da-clemence` 6.099 · `tui-hermes-da-da-dieu` 5.840 ⚠ ·
`danh-gia-top-5-cua-hang-do-da-thu-cong-handmade-cuc-chat-tai-sai-gon` 5.675 ·
`san-xuat-charm-da-theo-yeu-cau-phu-kien-tui-xach` 5.637 ·
`5-cach-tot-nhat-de-bao-quan-that-lung-da-cao-cap-ben-bi-theo-thoi-gian` 5.466 ·
`da-de-va-da-bo-nen-chon-chat-lieu-nao` 5.456 · `do-da-cao-cap-duoc-lam-tu-da-ca-sau-ve-tay-thu-cong` 5.219 ·
`cham-soc-bao-quan-do-da-dung-cach-html` 5.115 · `da-togo-co-ben-khong` 4.994 ·
`so-sanh-da-cuu-va-da-de` 4.931 · `boc-da-ipad-boc-da-ban-phim-ipad-smart-keyboard` 4.904 ·
`cach-bao-quan-da-togo` 4.624 · `gioi-tre-viet-nam-va-giac-mo-tro-thanh-tho-do-da-thu-cong` 4.594 ·
`cach-bao-quan-da-epsom-dung-cach-it-nguoi-biet` 4.452 · `da-epsom-co-ben-khong` 4.308 ·
`bo-sua-tap-tui-da-nu-cao-cap-rubellite-koi-leather` 3.978 ·
`lua-chon-that-lung-da-nam-cao-cap-cung-koi-leather` 3.123 ·
`bo-suu-tap-tui-da-cao-cap-mettique-koi-leather` 2.039

**Nhóm thay dây đồng hồ (28 bài)** — 25 bài `thay-day-da-dong-ho-{hãng}`, trung bình
4.653 ký tự. Trùng lặp shingle 6 từ trung bình 11,2% (an toàn); cặp xấu nhất 43,2%
(`versace` ↔ `salvatore-ferragamo`) → viết lại thân bài, **không xoá, không 301**.
Mỗi bài thêm một khối "Đặt làm dây riêng" trỏ về hub dây da.
Hãng có bài: burberry, kronos, raymond-weil, omega, frederique-constant, hublot,
daniel-wellington, ted-baker, franck-muller, fossil, salvatore-ferragamo, kate-spade,
montblanc, vacheron-constantin, maurice-lacroix, swarovski, mido, royal-london,
patek-philippe, versace, hermes ⚠, tissot, longines, cartier. Cộng `thay-day-dong-ho`
8.298 (bài tổng), `thay-day-tui-xach-hang-hieu` 6.993,
`cach-do-size-day-dong-ho-cuc-chuan-chinh-xac-phu-hop-voi-moi-loai-dong-ho` 5.118.

**Nhóm sửa chữa (10 bài)**: `spa-tui-hieu` 9.716 · `sua-tui-xach-hang-hieu` 9.150 ·
`sua-tui-gucci` 8.455 ⚠ · `sua-tui-lv` 7.527 ⚠ · `sua-chua-balo` 7.282 ·
`sua-tui-hieu-gan-day-tai-tp-hcm` 6.950 · `sua-tui-dior-tp-hcm` 6.919 ⚠ ·
`sua-tui-xach-hang-hieu-quan-phu-nhuan` 6.155 · `sua-tui-chanel` 5.199 ⚠ ·
`sua-that-lung-da-bi-hong-cat-sai-co-khac-phuc-duoc-khong` 3.570

**Nhóm quà tặng B2B (45 bài)** — cụm lớn nhất site. Đầu bảng:
`qua-tang-20-10` 22.690 · `qua-tang-nhan-vien-y-nghia-ly-tuong-cho-doanh-nghiep` 21.161 ·
`qua-tang-doi-tac` 17.719 · `qua-tang-doanh-nghiep-cao-cap` 15.114 ·
`qua-tang-doanh-nghiep-y-nghia` 14.231 · `qua-tet-doanh-nghiep` 13.759 ·
`qua-tet-nhan-vien` 12.833 · `tui-da-qua-tang-doanh-nghiep-cao-cap` 11.933 ·
`qua-tang-su-kien-bang-da` 11.761 · `giai-phap-qua-tang-cao-cap-tri-an-khach-hang` 11.680 ·
`qua-tang-nhan-vien-cuoi-nam` 11.109 · `qua-tang-tri-an-nhan-vien` 11.020 ·
`vi-khac-ten-cao-cap-qua-tang-da-that-thu-cong-tai-tp-hcm` 10.247 ·
`qua-tang-khach-hang-cuoi-nam` 10.481 · `bao-da-dien-thoai-op-lung-da-qua-doanh-nghiep-cao-cap` 9.334 ·
`qua-tang-doanh-nghiep-cuoi-nam` 8.800 ← **13 khách Google + 14/40 cú bấm quảng cáo** ·
`vi-dung-the-card-holder-qua-tang-doanh-nghiep-dang-cap` 7.969 ·
`bao-da-dung-passport-giai-phap-qua-doanh-nghiep-cao-cap` 7.508 ·
`bao-da-dung-the-nhan-vien-qua-tang-nhan-vien-cao-cap` 7.353 ·
`so-tay-qua-tang-so-tay-da-thu-cong-cao-cap` 6.000 · `moc-khoa-da-qua-tang-doanh-nghiep` 4.987 ·
`tag-vali-du-lich-the-hanh-ly-qua-tang-doanh-nghiep` 6.174.
Có case study khách thật: `qua-tang-doanh-nghiep-mobifone` 6.430 ·
`qua-tang-su-kien-cgv` 5.143 · `qua-tang-su-kien-bentley` 5.059 ·
`qua-tang-su-kien-doc-dao-vasta-stone` 6.998 ·
`qua-tang-doanh-nghiep-tap-doan-bds-nam-long` 3.058 ·
`qua-tang-su-kien-tap-doan-loc-troi` 3.016 · `qua-tang-doanh-nghiep-tap-doan-loc-troi` 2.744 ·
`qua-tang-doanh-nghiep-tap-doan-pelitromex` 2.834 ·
`qua-tang-doanh-nghiep-tap-doan-vingroup` 1.288 · `qua-tang-doanh-nghiep-cao-fine-jewellery` 4.603

**Nhóm khác (19 bài)**: `vi-nam-khac-ten-thu-cong` 12.942 · `cach-ve-sinh-tui-hang-hieu` 8.451 ·
`custom-handcrafted-leather-in-ho-chi-minh-city` 8.075 · `gia-spa-tui-hieu-2025` 7.833 ·
`tui-bi-moc-o-vang-xin-mau` 7.474 · `xuong-thiet-ke-do-da` 7.357 ·
`top-dia-chi-sua-tui-hang-hieu` 7.131 · `quy-trinh-che-tac-karkarbag` 5.065 ·
`khai-truong-koi-leather-rose-hub_mot-dau-an-kho-phai` 4.638 · `snap-wallet-vi-snap-cao-cap` 4.586 ·
`khac-ten-len-vi-da` 4.268 ← **5 khách Google** · `huong-dan-cach-cat-day-nit-tai-nha` 3.515 ·
`cat-day-nit-o-dau-uy-tin-tai-tp-hcm` 3.436 ·
`lipstick-bag-charm-son-bao-ve-chiec-son-xinh-xan-cua-ban` 3.509 ·
`goi-y-nhung-mau-tui-thoi-trang-handmade-hut-hon-chi-em-cong-so` 2.954 ·
`huong-dan-ve-sinh-va-thay-dem-tai-nghe` 2.915 · `bo-suu-tap-kois-card-holder` 2.840 ·
`%ed%98%b8%ec%b9%98%eb%af%bc-...` (bài tiếng Hàn, slug đã encode)

⚠ = có tên thương hiệu người khác. Xem mục 6.

---

## 3. LỖI KỸ THUẬT PHẢI SỬA — nếu không, landing lên sóng vẫn không ra lead

Xếp theo mức chặn đường.

### 3.1 [CHẶN] Form đặt riêng luôn mất tên sản phẩm
`koi-storefront/src/components/lead-form.tsx:24` render `name="product_id"`, nhưng
`koi-storefront/src/app/actions.ts:19` đọc `formData.get('product_name')` →
**luôn rỗng**. Sửa: đổi thành `name="product_name"` với `value={productName}`.

### 3.2 [CHẶN] Không ai đọc được lead, không có thông báo
Chỉ có `POST /shop/leads` (`Koi Backend/src/shop/shop.controller.ts:157`). Không có
`GET`, không có tab Leads trong `Koi Backend/public/index.html` (6 tab: products,
prodcats, media-types, material-categories, traffic, ads), không có nodemailer/webhook.
Thêm `GET` **dưới `/analytics`, KHÔNG dưới `/shop`** — `auth.guard.ts:35` mở toàn bộ
`/shop` cho khách vãng lai, để ở đó là phơi số điện thoại khách ra internet.
Tiền tố mới thì phải deploy thêm repo `koi-domain-router`.

### 3.3 [CHẶN] `/lien-he/` không có link nào trỏ tới
`LeadForm` chỉ render khi `slug === 'lien-he'`
(`koi-storefront/src/app/[slug]/page.tsx:14`). Không có link ở header
(`src/components/site-header.tsx`) lẫn footer (`src/components/site-footer.tsx`).
`/lien-he/` có **0 lượt xem**. Bảng `leads` rỗng vì **chưa ai thấy form**, không phải form hỏng.

### 3.4 [CHẶN] Vô hạn URL danh mục — lỗi canonical
`koi-storefront/src/app/san-pham/[...path]/page.tsx` lấy đoạn CUỐI làm slug nhưng
canonical là TOÀN BỘ đường dẫn:
```ts
const slug = path[path.length - 1];
alternates: { canonical: `/san-pham/${path.join('/')}/` },
```
Mọi tiền tố bất kỳ trả 200 và tự canonical về chính nó → vô hạn URL cho Google index.
Bằng chứng thật trong log: `/san-pham/do-da-thu-cong-cao-cap-danh-cho-nam/day-lung-cho-nam/`
(2 lượt), tiền tố không tồn tại ở cả `public.categories` lẫn `koi_free_style.koi_categories`.
Sửa ~5 dòng: canonical dùng `slug`, và `if (path.length > 1) permanentRedirect(...)`.

### 3.5 Google tag chưa nạp trên bản chạy thật
Tải `https://koileather.com/` và `/lien-he/`: 0 lần xuất hiện `googletagmanager`/`gtag`/
`dataLayer`. `GoogleTag` trả `null` khi thiếu ID (`src/components/google-tag.tsx:18`) →
`NEXT_PUBLIC_GOOGLE_ADS_ID` và `NEXT_PUBLIC_GA_ID` chưa khai trên Vercel.
`trackContactClick()` thoát ngay ở `if (!window.gtag) return` → **mọi cú bấm Zalo/gọi
hiện không được ghi nhận**.

### 3.6 `ANALYTICS_SALT` chưa đặt → "khách riêng" bị phồng
`analytics.service.ts:14`: thiếu biến thì muối sinh ngẫu nhiên mỗi lần khởi động. Trên
Vercel serverless mỗi cold start là muối mới → cùng một người ra nhiều `visitorHash`.
Dấu hiệu: 86/154 hash chỉ xuất hiện đúng 1 lần. **Đặt biến này trước mọi phép đo.**

### 3.7 Quảng cáo đang thất thoát
`koi_ad_clicks`: 40 dòng, 37 có `gclid`, **1** dòng có `contactedAt`, **0** dòng có
`convertedAt`. Trang đáp: `/` 21 · `/qua-tang-doanh-nghiep-cuoi-nam/` 14 ·
`/khac-ten-len-vi-da/` 4 · `/dinh-vu-do-va-cat-day-lung-chuyen-nghiep/` 1.
40 cú bấm trả tiền → 1 hội thoại. **Đây là chỗ landing phải ra đời, và có sẵn mốc so.**

### 3.8 Chưa ghi nhận cú bấm liên hệ của khách organic
`ghiNhanLienHe()` (`koi-storefront/src/lib/gclid.ts`) thoát ngay nếu không có token
quảng cáo → 103 khách Google có ai bấm Zalo hay không, hệ thống **hoàn toàn không biết**.
Cần bảng `koi_contact_clicks` + `POST /shop/contact-click` (nuốt lỗi, trả 204, theo nếp
`POST /shop/track`), gọi qua `navigator.sendBeacon` trong `ContactLink.onClick`.

### 3.9 Tin nhắn Zalo soạn sẵn chưa được kiểm chứng
Cả cơ chế mã tư vấn đặt cược vào `zalo.me/0901678999?text=...` điền sẵn tin nhắn.
Chưa có bằng chứng nó chạy. **Phải test tay trên 4 tổ hợp** (Android/iPhone × đã cài/chưa
cài app). Nếu thất bại: hiện mã tư vấn trên trang kèm nút chép (mã đã có trong
`localStorage` khoá `koi_ad_token`).

### 3.10 Ảnh vượt hạn Supabase
`koi-storefront/next.config.ts` không khai `images.deviceSizes` → Next mặc định có 3840,
vượt hạn biến đổi ảnh 1–2500 của Supabase. Đặt
`deviceSizes: [640, 750, 828, 1080, 1200, 1600, 1920]` (ảnh gốc chỉ 1080–1600px).

### 3.11 Rác trong sitemap
`koi-storefront/src/app/sitemap.ts` khai 129 URL tag với 0 organic, gồm một nhóm 10 tag
chứa **tập bài giống hệt nhau** (`qua-khai-truong`, `qua-tang-khai-truong`,
`qua-tet-doanh-nghiep`, `bo-qua-tang-doanh-nghiep`, `qua-tang-doanh-nghiep-brandgift`,
`qua-tang-doanh-nghiep-cao-cap`, `qua-tang-doanh-nghiep-doc-dao`,
`qua-tang-tet-doanh-nghiep`, `qua-tang-trong-to-chuc-su-kien`, `qua-tet-cho-doanh-nghiep`).
Bỏ khối `productTags` và `blogTerms` (taxonomy==='tag'), giữ `category`. Đặt
`robots: {index:false, follow:true}` ở `src/app/tag/[slug]/page.tsx` và
`src/app/tu-khoa-san-pham/[slug]/page.tsx`.

### 3.12 Năm thành lập tự mâu thuẫn — PHẢI CHỐT MỘT SỐ TRƯỚC KHI VIẾT
`/koi-leather-nha-san-xuat.../` nói **2017**; `/sua-chua-do-da/` nói **"hơn 10 năm"**;
`/nha-san-xuat-do-da-thu-cong/` nói **"hơn 7 năm"**. 2017 → 2026 là 9 năm.
Landing tuyệt đối không được nhân bản mâu thuẫn này. Dùng
`[NGƯỜI BÁN ĐIỀN: năm thành lập chính thức]` cho tới khi có câu trả lời.

### 3.13 5 URL danh mục cũ đang 404
`/san-pham/do-da-nam/` (từng có 89 SP), `/san-pham/do-da-cao-cap-cho-nu/` (94),
`/san-pham/phu-kien-khac/` (30), `/san-pham/leather-material/`,
`/san-pham/thu-cong-bespoke/`. Trang tĩnh `/san-pham/` vẫn còn link vào hai cái đầu.
`public.redirects` có **0 dòng**; `next.config.ts` chỉ có 7 redirect (giỏ hàng, thanh
toán, tài khoản, shop, blogs, tin tức). **Không có `src/middleware.ts`.**

---

## 4. KHUNG LAYOUT DÙNG CHUNG — 12 khối

Chuẩn chất lượng: 1.200–1.800 từ nội dung biên tập, sàn cứng 900 từ. 1 ảnh / 150–250 từ.
**Đúng một ảnh trên khung nhìn đầu** (ảnh LCP). 64% khách là mobile (99/154 khách riêng
mobile, 54 desktop, 1 tablet).

| # | Khối | Nhiệm vụ | Trả lời lo lắng nào |
|---|---|---|---|
| 1 | **Hero** — H1 + 1 dòng phụ + 1 nút chính + 1 dòng gỡ lo | Bắt khách đến từ truy vấn "đặt làm ..." | *Có xem mẫu trước không* (một dòng) |
| 2 | **Mở đầu** 2–3 đoạn | Nói đúng việc xưởng làm được | |
| 3 | **KHOẢNG GIÁ** | Số thật từ dữ liệu danh mục | **Giá bao nhiêu** — đầy đủ |
| 4 | **Quy trình 4–6 bước**, ảnh thật có bàn tay | | **Làm bao lâu** + **xem mẫu trước** + **thanh toán** |
| 5 | **Bảng chất liệu** + link bài từng loại da | Khối SEO nặng nhất, hút link nội bộ | *vì sao giá chênh* |
| 6 | **Thông số + MỘT câu hạn chế thật thà** | Vượt chuẩn đối thủ | |
| 7 | **Lưới sản phẩm 6–12 món** | | |
| 8 | **Giá / thời gian làm / MOQ** | | |
| 9 | **Nghệ nhân** (tên + vai trò thật) | E-E-A-T | |
| 10 | **FAQ 6–9 câu** | | **Không vừa ý thì sao** — đầy đủ |
| 11 | **CTA cuối + form** | Chốt | |
| 12 | **Case study + bài liên quan** | | |

**CTA: một hành động (nhắn Zalo), năm điểm chạm.** Hero · sau khối GIÁ · sau khối QUY
TRÌNH · sau FAQ · `ContactBar` dính đáy (đã có
`koi-storefront/src/components/contact-bar.tsx` — chỉ cần render, **đừng dựng thanh
riêng, sẽ thành hai thanh chồng nhau**). **Không** đặt CTA giữa khối chất liệu — đang
đọc để học, chen nút vào là cắt mạch. `main` đã có `pb-16 md:pb-0`
(`src/app/layout.tsx`) → không đặt CTA cuối trong 64px cuối, sẽ bị thanh đáy che.

**Chữ nút**: động từ + cái khách nhận. Hero dùng `Nhắn Zalo để nghệ nhân tư vấn` hoặc
`Xem mẫu da thật qua Zalo`. Cuối trang dùng `Bắt đầu đặt riêng` / `Kể ý tưởng của bạn`.
Nút phụ (form): `Để lại số, shop gọi lại`.
**Tránh**: `Liên hệ ngay`, `Tìm hiểu thêm`, `Xem chi tiết`, `Đăng ký`, `Submit`, `Gửi`.

**Dòng gỡ lo dưới nút** (quan trọng hơn chữ trên nút): `Nhắn để hỏi thôi cũng được —
chưa cần quyết gì.` · `Tin nhắn đã soạn sẵn, bạn chỉ cần bấm gửi.` · `Không cần cọc để
được tư vấn.`

**Form: 4 trường + 1 textarea không bắt buộc, theo thứ tự này**
1. `wish` select (bắt buộc) — "Bạn muốn đặt làm gì?"
2. `budget` select (**không** bắt buộc) — "Ngân sách bạn nghĩ tới", phải có mục
   **"Chưa rõ, nhờ shop tư vấn"**
3. `phone` tel (bắt buộc) — "Số điện thoại (Zalo)"
4. `name` text (bắt buộc) — "Shop gọi bạn là gì?"
5. `textarea` cuối — "Mô tả thêm (nếu có)"

Không hỏi email / địa chỉ / giới tính / "bạn biết KOI từ đâu" / số đo.
Bảng `leads` **không có cột** cho ngân sách/món/mốc thời gian → ghép vào `message` theo
khuôn cố định: `Món: ... | Ngân sách: ... | Mốc: ... | Trang: ... | Mã: ... | Ghi chú KH: ...`

**JSON-LD**: landing khai `Service` + `ItemList` + `BreadcrumbList` (+ `FAQPage` tuỳ
chọn), **KHÔNG khai `Product`**. `LocalBusiness` khai đúng một lần tại
`/lien-he/#localbusiness`, chỗ khác tham chiếu bằng `@id`.
**Google đã bỏ FAQ rich result khỏi Search từ 7/5/2026** → giữ FAQ cho người đọc và AI
Overviews, đừng mong rich result, đừng nhồi câu hỏi.
**Không bao giờ khai `aggregateRating` khi chưa có đánh giá thật.**
Trang sản phẩm `cua-hang/[slug]/page.tsx:61-77` đang có lỗi: `price: p.price ?? p.price_min`
phát ra `"price": 0`. Ba nhánh đúng: min≠max → `AggregateOffer`; một giá thật > 0 →
`Offer`; null hoặc 0 → **bỏ hẳn `offers`**. `lowPrice` phải bằng đúng số hiện trên trang.

**Ba thứ cấm**: popup che trang · đẩy nội dung xuống dưới ba tầng CTA · chặn Zalo sau
một bước (bắt điền form mới hiện số).
**Cấm doorway page theo quận/huyện.**

---

## 5. CHUẨN VƯỢT ĐỐI THỦ

0/3 đối thủ (Gento, Aleather, Bulltino) có: FAQ thật · khoảng giá + thời gian làm + MOQ ·
≥4 ảnh quy trình có bàn tay và tên nghệ nhân · bảng chất liệu có số SKU thật ·
case study khách có tên · độ chính xác biên tập (cả ba tự mâu thuẫn năm/địa chỉ;
Aleather còn tự gọi mình là "Eleather"). Bulltino thắng nhờ thông số kiểm chứng được và
**một câu nói thật về hạn chế** — đó là mốc cần vượt.

**Lệch giá quyết định việc chọn từ khoá — cấm nhắm từ khoá giá rẻ**: dây da đồng hồ KOI
trung vị 2,2tr vs đối thủ 350k–1tr · bọc khoá ô tô 1,8tr vs 340–600k · bao da passport
2,8tr vs "từ 90k" · ốp điện thoại 2,8tr vs ~100k POD.
Nhắm cụm định tính: `da thật`, `thủ công`, `đặt riêng`, `cá sấu`, `Epsom`, `theo số đo`.
**Không nhắm** từ chung chung hay "giá rẻ".

**Chưa có công cụ nào cho volume tìm kiếm** (không Keyword Planner/Ahrefs) → mọi quyết
định phụ thuộc volume phải đánh dấu ★ và nói rõ là phỏng đoán.

---

## 6. RÀNG BUỘC PHÁP LÝ & DỮ LIỆU NGƯỜI BÁN

**Cờ thương hiệu (quyết định của người bán, không phải của SEO):** đặt tên hãng khác cho
**dịch vụ sửa/thay** thường là dùng dẫn chiếu hợp pháp; nhưng "đặt làm dây lưng Hermes"
là mô tả **sản phẩm thay thế** — mức rủi ro khác hẳn. Landing mới **không được** nhắm
loại thứ hai. URL liên quan: `/dat-lam-day-lung-hermes/`, `/dat-lam-day-lung-khoa-chu-h/`,
`/thay-day-da-dong-ho-hermes.../`, `/tui-hermes-da-*`, `/sua-tui-gucci/`, `/sua-tui-lv/`,
`/sua-tui-chanel/`, `/sua-tui-dior-tp-hcm/`, và sản phẩm `loewe-hammock-hobo-bag`,
`that-lung-montblance`, `vi-monte`.

**Người bán phải điền trước khi xuất bản** — mọi chỗ khác phải ghi `[NGƯỜI BÁN ĐIỀN]`:
thời gian làm từng nhóm · % cọc · phạm vi bảo hành / "Bảo dưỡng trọn đời" (thanh header
đang hứa mà không có trang nào định nghĩa) · chính sách đổi trả hàng đặt riêng (phải khớp
`/chinh-sach-hoan-tien-doi-tra/` 1.943 ký tự) · giấy tờ CITES cho cá sấu/kỳ đà/trăn ·
MOQ + bậc giá B2B · kỹ thuật khắc + giới hạn số ký tự · địa chỉ xưởng + giờ + toạ độ ·
tên và vai trò nghệ nhân · **năm thành lập** (xem 3.12) · thời gian phản hồi Zalo.

**Không hứa nếu không có số.** Không huy hiệu giải thưởng, không "10.000 khách hàng",
không "15 năm kinh nghiệm" nếu không có bằng chứng.

---

## 7. CÁCH ĐO — mốc hiện tại để so trước/sau

| Chỉ số | Nguồn | Mốc hiện tại |
|---|---|---|
| Khách Google riêng vào landing | `koi_page_views` (source='google') | xem mục 0.2 |
| Tỷ lệ mobile | `koi_page_views.device` | toàn site 99 mobile / 54 desktop / 1 tablet |
| Khách bấm liên hệ / khách vào | cần bảng ở 3.8 | **chưa đo được** |
| Cú bấm quảng cáo → hội thoại | `koi_ad_clicks` | **40 → 1** |
| Hội thoại → đơn chốt | `koi_ad_clicks.convertedAt` | **0** |
| Lead từ form | `leads` | **0** |

**Luôn đọc cột "khách riêng", đừng đọc "lượt xem"** — `/dau-an-rieng/` 50 lượt nhưng chỉ
5 khách; nguồn `internal` 214 lượt / 13 khách. Lượt xem đang bị người trong nhà làm phồng.

`koi_ad_clicks` xoá dòng chưa chốt sau 120 ngày; `koi_presence` sau 24 giờ;
`koi_page_views` **không** có cơ chế dọn → sẽ phình dần.
Hạn 90 ngày của Google Ads tính **từ lúc bấm quảng cáo**, không phải lúc chốt đơn.
