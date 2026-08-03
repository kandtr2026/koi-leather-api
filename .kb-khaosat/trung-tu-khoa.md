# Kiểm kê tự cắn từ khoá & kiến trúc URL — koileather.com

> Số liệu traffic dưới đây tôi truy vấn lại trực tiếp từ `koi_free_style.koi_page_views` (90 ngày), nên lệch nhẹ so với brief (thời gian đã trôi): `/cua-hang/` 165 lượt, `/` 145. Quan trọng hơn, tôi tách được **organic Google theo từng trang** — đây là căn cứ duy nhất để quyết định 301 hay giữ. Tổng nguồn: direct 313, internal 214, **google 145**, facebook 90, instagram 17, search khác 5.

---

## 0. Ba phát hiện phải xử lý TRƯỚC khi bàn tới landing page

Không xử lý ba việc này thì mọi landing page mới đều xây trên nền lún.

### 0.1 NGHIÊM TRỌNG NHẤT — `/san-pham/[...path]/` sinh vô hạn URL, mỗi URL tự nhận canonical

`koi-storefront/src/app/san-pham/[...path]/page.tsx` lấy **đoạn cuối** làm slug danh mục (dòng ~19), nhưng canonical lại đặt bằng **toàn bộ đường dẫn**:

```ts
const slug = path[path.length - 1];          // chỉ lấy đoạn CUỐI
...
alternates: { canonical: `/san-pham/${path.join('/')}/` },   // nhưng canonical = TOÀN BỘ
```

Hệ quả: mọi tiền tố bất kỳ đều trả 200 và **tự trỏ canonical về chính nó**:

| URL | Kết quả |
|---|---|
| `/san-pham/card-holder/` | 200, canonical chính nó |
| `/san-pham/phu-kien-bang-da/card-holder/` | 200, canonical **chính nó** (không gộp) |
| `/san-pham/xyz-bat-ky/card-holder/` | 200, canonical **chính nó** |

Đây không phải giả thuyết. Trong log có `/san-pham/do-da-thu-cong-cao-cap-danh-cho-nam/day-lung-cho-nam/` (2 lượt) — tiền tố `do-da-thu-cong-cao-cap-danh-cho-nam` **không tồn tại** trong cả `public.categories` (hệ cũ) lẫn `koi_free_style.koi_categories` (hệ mới). URL rác vẫn sống, vẫn indexable.

**Sửa (bắt buộc, ~5 dòng):** canonical luôn dùng 1 đoạn, và URL nhiều đoạn thì 301 về bản 1 đoạn.

```ts
// Trong generateMetadata: canonical LUÔN là dạng một đoạn
const slug = path[path.length - 1];
alternates: { canonical: `/san-pham/${slug}/` },

// Trong CategoryPage: URL nhiều đoạn -> 301 về bản chuẩn
if (path.length > 1) permanentRedirect(`/san-pham/${path[path.length - 1]}/`);
```

Giữ catch-all (đúng, để link WordPress cũ không 404) nhưng buộc nó **hội tụ** thay vì nhân bản.

### 0.2 Năm URL danh mục cũ đang 404 — hai trong số đó từng gánh ~90 sản phẩm

Diff `public.categories` (cũ) với `koi_free_style.koi_categories` (mới, `isActive=true`):

| URL cũ | Tên | SP cũ | Trạng thái |
|---|---|---|---|
| `/san-pham/do-da-nam/` | For Men | 89 | **404** (danh mục CHA) |
| `/san-pham/do-da-cao-cap-cho-nu/` | For Women | 94 | **404** (danh mục CHA) |
| `/san-pham/phu-kien-khac/` | Phụ Kiện Khác | 30 | **404** |
| `/san-pham/leather-material/` | Leather Material | 1 | **404** |
| `/san-pham/thu-cong-bespoke/` | Thủ công bespoke | 1 | **404** (đã ẩn) |

Trang tĩnh `/san-pham/` (3.732 ký tự chữ thật) vẫn đang link tới `/san-pham/do-da-nam/` và `/san-pham/do-da-cao-cap-cho-nu/` — tức site đang tự trỏ vào 404.

### 0.3 Trang tĩnh "dày" thực ra rất mỏng, và số ký tự trong brief là HTML chứ không phải chữ

Tôi bóc thẻ để đếm chữ thật. Chênh lệch 10–30 lần vì đây là trang dựng bằng page builder:

| URL | HTML | **Chữ thật** | Ghi chú |
|---|---|---|---|
| `/do-da-danh-cho-nu/` | 303.465 | **10.160** | |
| `/day-da-dong-ho/` | 202.270 | **10.081** | |
| `/tui-da-nu/` | 190.013 | **9.276** | |
| `/tui-da-nam/` | 132.003 | **7.901** | |
| `/do-da-danh-cho-nam/` | 195.339 | **6.808** | |
| `/san-pham/` | 115.924 | **3.732** | chỉ hero + lưới cũ |
| `/phu-kien-bang-da/` | 31.111 | **1.351** | mỏng thật sự |
| `/san-xuat-qua-tang-doanh-nghiep-va-su-kien/` | 445.424 | **22.688** | tài sản nội dung tốt nhất |

**Và đây là điểm chốt của toàn bộ báo cáo:** cả 6 trang tĩnh trùng danh mục — `/day-da-dong-ho/`, `/tui-da-nam/`, `/tui-da-nu/`, `/do-da-danh-cho-nam/`, `/do-da-danh-cho-nu/`, `/phu-kien-bang-da/` — có **0 lượt xem, 0 organic** trong 90 ngày. Không phải "ít". Là **không có lượt nào**.

→ Nỗi lo "301 đi sẽ mất tuổi URL / mất backlink" trong trường hợp này **không có cơ sở dữ liệu**. Chúng chưa từng xếp hạng cho bất cứ truy vấn nào tạo ra click.

### 0.4 Hai trang RÁC phải xử lý ngay

- **`/3961-2/`** (tiêu đề "Signature Items", 2.978 ký tự chữ) — nội dung là **demo theme tiếng Anh chưa xoá**: *"It has Finally started… HUGE SALE UP TO 70% OFF … Mens Clothing … This is an awesome video banner … This can easily be edited"*. Đang nằm trong sitemap. Xoá hoặc `noindex` + 301 ngay.
- **`/nha-san-xuat-do-da-thu-cong/`** — **lỗi dữ liệu**: mở đầu là mục lục bài tai nghe ("Khi Nào Cần Vệ Sinh Hoặc Thay Đệm Tai Nghe? / Bước 1: Tháo đệm tai nghe…") lọt vào trang giới thiệu nhà sản xuất. Nội dung đã bị lẫn, đừng gộp — 301 thẳng.
- **`/7657-2/`** — tiêu đề **rỗng**, 2.612 ký tự, trùng chủ đề sửa chữa.

---

## 1. Kiểm kê từng cụm tự cắn từ khoá

Ký hiệu: **[CL]** = trang chủ lực (canonical winner). Cột "organic 90n" là lượt từ Google — 0 nghĩa là 301 đi không mất gì.

### Cụm A — Dây da đồng hồ (cụm lớn nhất site, cắn nhau 4 tầng)

| URL | Loại | Organic 90n | Xử lý |
|---|---|---|---|
| `/san-pham/day-da-dong-ho/` | Danh mục, 43 SP | 0 | **[CL] lưới** — giữ, mô tả hiện chỉ 177 ký tự |
| `/dat-lam/day-da-dong-ho/` | *chưa có* | — | **[CL] đặt riêng** — tạo mới (xem §3) |
| `/day-da-dong-ho/` | Trang tĩnh, 10.081 chữ | **0** | Bóc phần hay → nhập vào landing mới, rồi **301 → `/dat-lam/day-da-dong-ho/`** |
| `/lam-day-da-dong-ho-handmade-theo-yeu-cau-koi-leather/` | Bài | 0 | **301 → `/dat-lam/day-da-dong-ho/`** (trùng ý định gần 100%) |
| `/thay-day-dong-ho/` | Bài | 0 | Giữ, đổi góc → "thay dây, đo size, thay chốt" (ý định sửa/thay, khác đặt làm) |
| 25 bài `thay-day-da-dong-ho-{hãng}` | Bài | 0 | **Giữ tất cả**, gắn hub — xem cảnh báo dưới |
| `/cach-do-size-day-dong-ho-cuc-chuan…/` | Bài | 0 | Giữ — ý định thông tin, hỗ trợ chuyển đổi |
| `/dich-vu-sua-con-dia-day-dong-ho/` | Bài | **1** | Giữ nguyên (ý định sửa, rất hẹp) |
| `/tu-khoa-san-pham/day-da-dong-ho/` | Tag SP, 31 SP | 0 | **noindex** (trùng 100% với danh mục cùng tên) |
| 10 tag blog dây da | Tag | 0 | **noindex + 301** — xem §2 |

**Đo thật trên 25 bài theo hãng:** trung bình 4.653 ký tự chữ, trùng lặp đoạn-6-từ **trung bình 11,2%**, cặp cao nhất **43,2%** (`thay-day-da-cho-dong-ho-versace` ↔ `thay-day-da-dong-ho-salvatore-ferragamo`).

→ 11% là ngưỡng an toàn — **đừng 301 chúng**. Mỗi bài nhắm một truy vấn hãng riêng ("thay dây da đồng hồ Omega") không cắn nhau. Nhưng cặp Versace/Ferragamo ở 43% thì phải viết lại phần thân, không xoá. Việc cần làm: cả 25 bài trỏ ngược về `/dat-lam/day-da-dong-ho/` bằng một khối "Đặt làm dây riêng" chèn cuối bài — biến 25 bài rời rạc thành một cụm có trung tâm.

### Cụm B — Túi nữ

| URL | Loại | Organic 90n | Xử lý |
|---|---|---|---|
| `/san-pham/tui-da-cho-nu/` | Danh mục, 48 SP, giá TV 11,5tr | 0 | **[CL] lưới** |
| `/dat-lam/tui-da-cho-nu/` | *chưa có* | — | **[CL] đặt riêng** — tạo mới |
| `/tui-da-nu/` | Trang tĩnh, 9.276 chữ | **0** | Gộp nội dung → **301 → `/dat-lam/tui-da-cho-nu/`** |
| `/do-da-danh-cho-nu/` | Trang tĩnh, 10.160 chữ | **0** | **301 → `/san-pham/tui-da-cho-nu/`** (nội dung là hero + lưới, ít prose dùng được) |
| `/san-pham/do-da-cao-cap-cho-nu/` | **404** | 0 | **301 → `/san-pham/tui-da-cho-nu/`** — đang chảy máu |
| `/dich-vu-lam-tui-da-theo-yeu-cau/` | Bài | **5** (5 khách) | ⚠️ **GIỮ NGUYÊN** — xem cảnh báo §4 |
| `/bo-sua-tap-tui-da-nu-cao-cap-rubellite-koi-leather/` | Bài BST | 0 | Giữ — BST có tên riêng, không cắn |
| `/bo-suu-tap-tui-da-cao-cap-mettique-koi-leather/` | Bài BST | 0 | Giữ |
| `/goi-y-nhung-mau-tui-thoi-trang-handmade-hut-hon-chi-em-cong-so/` | Bài | 0 | Giữ, đổi góc → "túi đi làm/công sở" |
| `/tu-khoa-san-pham/`: `vi-da-nu`, `vi-da-nu-cao-cap`, `vi-da-nu-thu-cong`, `tui-nu-da`, `tui-da-nu`, `tui-nu-da-cao-cap`, `tui-da-nu-thu-cong` | 7 tag SP | 0 | **noindex toàn bộ** — 7 URL cho 1 ý định |

### Cụm C — Túi nam

| URL | Loại | Organic 90n | Xử lý |
|---|---|---|---|
| `/san-pham/tui-da-cho-nam/` | Danh mục, 14 SP, giá TV 16tr | 0 | **[CL] lưới** |
| `/dat-lam/tui-da-cho-nam/` | *chưa có* | — | **[CL] đặt riêng** — tạo mới |
| `/tui-da-nam/` | Trang tĩnh, 7.901 chữ | **0** | Gộp → **301 → `/dat-lam/tui-da-cho-nam/`** |
| `/do-da-danh-cho-nam/` | Trang tĩnh, 6.808 chữ | **0** | **301 → `/san-pham/tui-da-cho-nam/`** |
| `/san-pham/do-da-nam/` | **404**, 89 SP cũ | 0 | **301 → `/san-pham/tui-da-cho-nam/`** — đang chảy máu |
| `/san-pham/clutch-cho-nam/` | Danh mục, 6 SP, giá TV 31tr | 0 | Giữ riêng — giá cao nhất site, ý định khác |
| `/5-nguyen-tac-lua-chon-cap-da-phu-hop-cho-cac-quy-ong/` | Bài | 0 | Giữ — ý định "cặp da", khác túi |

### Cụm D — Ví nam + Khắc tên (hai cụm phải gỡ rối cùng nhau)

Đây là chỗ rối nhất: 6 bài khắc tên đang cắn nhau, và cắn cả sang ví nam.

| URL | Loại | Organic 90n | Xử lý |
|---|---|---|---|
| `/san-pham/vi-da-cho-nam/` | Danh mục, 27 SP | 0 | **[CL] lưới** |
| `/dat-lam/vi-da-cho-nam/` | *chưa có* | — | **[CL] đặt riêng** — tạo mới |
| `/khac-ten-len-vi-da/` | Bài | **7** (5 khách) | ⚠️ **[CL] khắc tên** — GIỮ NGUYÊN URL, chỉ nâng nội dung |
| `/dich-vu-khac-ten-len-san-pham-khac-ten-theo-yeu-cau/` | Bài | **2** | Giữ, đổi góc → khắc tên trên **mọi loại SP** (không chỉ ví) |
| `/cach-khac-ten-len-vi-da-dep-ben-y-nghia-lam-qua-tang/` | Bài | 0 | **301 → `/khac-ten-len-vi-da/`** |
| `/khac-chu-len-vi-da-ky-thuat-dap-nhiet-cao-cap/` | Bài | 0 | Gộp phần kỹ thuật dập nhiệt → **301 → `/khac-ten-len-vi-da/`** |
| `/vi-da-khac-ten/` | Bài | 0 | **301 → `/khac-ten-len-vi-da/`** |
| `/vi-nam-khac-ten-thu-cong/` | Bài | 0 | **301 → `/khac-ten-len-vi-da/`** |
| `/vi-khac-ten-cao-cap-qua-tang-da-that-thu-cong-tai-tp-hcm/` | Bài | 0 (1 lượt direct) | **301 → `/khac-ten-len-vi-da/`** |
| `/lam-vi-da-theo-yeu-cau/` | Bài | 0 (1 lượt) | Gộp → **301 → `/dat-lam/vi-da-cho-nam/`** |
| `/dich-vu-sua-chua-vi-da-cao-cap/` | Bài | **1** | Giữ — ý định sửa |
| `/huong-dan-cach-lua-chon-vi-da-handmade-cuc-xin-cho-nam-gioi/` | Bài | 0 | Giữ — ý định thông tin |
| `/snap-wallet-vi-snap-cao-cap/`, `/vi-da-ca-sau-cao-cap/`, `/dat-lam-vi-da-ca-sau/` | Bài | 0 | Giữ — nhắm kiểu ví / chất da cụ thể |
| `/tu-khoa-san-pham/`: `vi-da-nam`, `vi-nam`, `vi`, `vi-da-nam-cao-cap`, `vi-da-nam-thu-cong` | 5 tag | 0 | **noindex** |

**6 bài khắc tên → 1 trang chủ lực.** Chọn `/khac-ten-len-vi-da/` vì nó là bài duy nhất có organic đáng kể (7 lượt/5 khách) — không phải vì nó dài nhất.

### Cụm E — Ví nữ

| URL | Loại | Organic 90n | Xử lý |
|---|---|---|---|
| `/san-pham/vi-da-cho-nu/` | Danh mục, 28 SP | 0 | **[CL] lưới** — chưa có bài/trang nào cắn |
| `/san-pham/vi-zip-mini/` | Danh mục, 2 SP, mô tả 11 ký tự | 0 | **noindex** (quá mỏng) hoặc gộp vào ví nữ |

Cụm này **sạch**. Không cần 301. Nếu làm landing, `/dat-lam/vi-da-cho-nu/` là đất trống.

### Cụm F — Dây lưng

| URL | Loại | Organic 90n | Xử lý |
|---|---|---|---|
| `/san-pham/day-lung-cho-nam/` | Danh mục, 20 SP | 0 | **[CL] lưới nam** |
| `/dat-lam/day-lung-cho-nam/` | *chưa có* | — | **[CL] đặt riêng** — tạo mới |
| `/san-pham/day-lung-cho-nu/` | Danh mục, 9 SP, mô tả 954 ký tự (dài nhất) | 0 | **[CL] lưới nữ** — giữ riêng |
| `/dinh-vu-do-va-cat-day-lung-chuyen-nghiep/` | Bài | **7** (6 khách) | ⚠️ **[CL] dịch vụ đo/cắt** — GIỮ NGUYÊN (slug sai chính tả "dinh-vu" — **đừng sửa**, xem §4) |
| `/dat-lam-day-nit-that-lung-da-theo-yeu-cau/` | Bài | 0 | Gộp → **301 → `/dat-lam/day-lung-cho-nam/`** |
| `/dat-lam-that-lung-theo-yeu-cau-koi-leather/` | Bài | 0 | **301 → `/dat-lam/day-lung-cho-nam/`** |
| `/huong-dan-cach-cat-day-nit-tai-nha/` | Bài | 0 | Giữ — ý định tự làm |
| `/cat-day-nit-o-dau-uy-tin-tai-tp-hcm/` | Bài | 0 | **301 → `/dinh-vu-do-va-cat-day-lung-chuyen-nghiep/`** (cùng ý định "cắt dây nịt ở đâu") |
| `/sua-that-lung-da-bi-hong-cat-sai-co-khac-phuc-duoc-khong/` | Bài | 0 | Giữ — ý định sửa lỗi |
| `/dat-lam-day-lung-da-ca-sau/` | Bài | **1** | Giữ — nhắm chất da riêng |
| `/dat-lam-day-lung-hermes/`, `/dat-lam-day-lung-khoa-chu-h/` | Bài | 0 (2 lượt direct) | **Cảnh báo pháp lý**, xem §4 |
| `/lua-chon-that-lung-da-nam-cao-cap-cung-koi-leather/` | Bài | 0 | **301 → `/san-pham/day-lung-cho-nam/`** |
| `/5-cach-tot-nhat-de-bao-quan-that-lung-da-cao-cap…/` | Bài | 0 | Giữ — bảo quản |
| `/tu-khoa-san-pham/`: `that-lung`, `that-lung-nam`, `that-lung-nam-cao-cap`, `that-lung-nam-thu-cong` | 4 tag | 0 | **noindex** |

### Cụm G — Phụ kiện (danh mục cha đang cắn 12 danh mục con)

| URL | Loại | Organic 90n | Xử lý |
|---|---|---|---|
| `/san-pham/phu-kien-bang-da/` | Danh mục, 33 SP | 0 | **[CL]** — làm **trang trung tâm** trỏ xuống 12 danh mục con |
| `/phu-kien-bang-da/` | Trang tĩnh, **1.351 chữ** | **0** | **301 → `/san-pham/phu-kien-bang-da/`** (mỏng, không có gì để gộp) |
| `/san-pham/phu-kien-khac/` | **404**, 30 SP cũ | 0 | **301 → `/san-pham/san-pham-khac/`** |
| `/san-pham/card-holder/` | Danh mục, 14 SP | **3** (3 khách) | ⚠️ Giữ — 24 lượt tổng, danh mục hút nhất |
| `/san-pham/bao-da-ipad/` | Danh mục, 6 SP | **3** (2 khách) | ⚠️ Giữ — 24 lượt tổng |
| `/san-pham/boc-da-tai-nghe/` | Danh mục, 3 SP | **2** | ⚠️ Giữ |
| `/san-pham/boc-khoa-o-to/` | Danh mục, 7 SP | **1** | ⚠️ Giữ |
| `/san-pham/charm-deo-tui-bang-da/` | Danh mục, 12 SP | **1** | Giữ |
| `/tu-khoa-san-pham/phu-kien`, `phu-kien-da`, `card-holder`, `kep-tien`, `money-clip`, `op-dien-thoai`, `phonecase` | 7 tag | 0 | **noindex** (`kep-tien` + `money-clip` trùng hệt danh mục `kep-tien-money-clip`) |

**Danh mục mỏng cần `noindex`** (mô tả ≤ 17 ký tự, ≤ 3 SP): `watch-case` (1 SP, mô tả 17 ký tự), `cham-khac-tren-da` (1 SP, mô tả **0**), `hop-da`, `doppkit`, `charm-dung-son` (3 SP), `vi-zip-mini` (2 SP), `may-tram-chan` (mô tả 0), `an-lat-woven` (0), `trademark` (0), `phu-kien-rieng-customize-hardware` (0), `qua-tang-su-kien` (0).
→ 11 trong 29 danh mục có mô tả **≤ 17 ký tự**. Đây là 11 trang mỏng đang ở sitemap.

### Cụm H — Bọc da tai nghe (cụm nhỏ nhưng organic khá tốt)

| URL | Loại | Organic 90n | Xử lý |
|---|---|---|---|
| `/dich-vu-boc-da-tai-nghe-cao-cap/` | Bài | **4** (3 khách) | ⚠️ **[CL]** — GIỮ NGUYÊN URL |
| `/san-pham/boc-da-tai-nghe/` | Danh mục, 3 SP, mô tả **0** | **2** | Giữ (lưới), viết mô tả, trỏ lên [CL] |
| `/thay-da-tai-nghe-sony-wh-1000xm4-va-marshall…/` | Bài | **1** | Giữ — nhắm model cụ thể, mạnh |
| `/huong-dan-ve-sinh-va-thay-dem-tai-nghe/` | Bài | 0 | Giữ — ý định tự làm |
| `/thay-mut-dem-tai-nghe-hcm/` | Bài | 0 (2 lượt) | Trùng ý định địa phương với [CL] → gộp → **301** |

### Cụm I — Bao da iPad / Macbook

| URL | Loại | Organic 90n | Xử lý |
|---|---|---|---|
| `/san-pham/bao-da-ipad/` | Danh mục, 6 SP | **3** | **[CL]** — giữ, mô tả 179 ký tự → viết dày lên |
| `/boc-da-ipad-boc-da-ban-phim-ipad-smart-keyboard/` | Bài | 0 (2 lượt) | Giữ, đổi góc → **bàn phím Smart Keyboard** (ngách riêng, không cắn) |

### Cụm J — Quà tặng doanh nghiệp (cụm cannibalization TỆ NHẤT về số lượng URL)

Đếm được: **1 chuyên mục blog + 2 trang tĩnh + ~35 bài + 10 tag trùng hệt nhau** = trên 45 URL cho một cụm ý định.

| URL | Loại | Organic 90n | Xử lý |
|---|---|---|---|
| `/san-xuat-qua-tang-doanh-nghiep-va-su-kien/` | Trang tĩnh, **22.688 chữ** | 0 | **[CL]** — tài sản nội dung tốt nhất site, có tên khách thật (PNJ, MobiFone, Carlsberg, Masterise, Lộc Trời) |
| `/qua-tang-doanh-nghiep-va-su-kien/` | Trang tĩnh, 10.325 chữ | 0 | Trùng **18,1%** đoạn-5-từ với [CL], cùng ý định → gộp → **301 → [CL]** |
| `/category/qua-tang-doanh-nghiep/` | Chuyên mục, 39 bài | 0 | Giữ — vai trò **mục lục**, không nhắm từ khoá thương mại |
| `/qua-tang-doanh-nghiep-cuoi-nam/` | Bài | **14 (13 khách)** | 🚨 **organic cao nhất toàn site** — TUYỆT ĐỐI GIỮ, xem §4 |
| `/qua-tang-doanh-nghiep-cao-cap/` | Bài | 0 | **301 → [CL]** |
| `/qua-tang-doanh-nghiep-y-nghia/`, `/qua-tang-doanh-nghiep-doc-dao/`, `/qua-tang-doanh-nghiep-brandgift/`, `/goi-y-9-mon-qua-tang-doanh-nghiep-cao-cap-y-nghia/` | 4 bài | 0 | Chọn **1** giữ làm bài "gợi ý/listicle", **301** 3 bài còn lại về nó |
| `/qua-tet-doanh-nghiep/`, `/qua-tang-tet-doanh-nghiep/`, `/goi-y-qua-tang-dip-tet-va-cuoi-nam-y-nghia-sang-trong/` | 3 bài | 0 | Gộp còn **1** bài mùa Tết → 301 hai bài kia |
| `/qua-tang-nhan-vien-y-nghia/`, `/qua-tang-nhan-vien-y-nghia-ly-tuong-cho-doanh-nghiep/`, `/qua-tang-nhan-vien-cuoi-nam/`, `/qua-tang-tri-an-nhan-vien/`, `/qua-tet-nhan-vien/` | 5 bài | 0 | Gộp còn **1** trang "quà tặng nhân viên" → 301 bốn bài kia |
| `/qua-tang-khach-hang-cuoi-nam/`, `/giai-phap-qua-tang-cao-cap-tri-an-khach-hang/`, `/qua-tang-doi-tac/`, `/qua-tang-doanh-nhan/` | 4 bài | 0 | Gộp còn **1–2** (khách hàng / đối tác) |
| 9 bài case study khách thật: `-mobifone`, `-tap-doan-vingroup`, `-tap-doan-loc-troi` (×2), `-tap-doan-bds-nam-long`, `-tap-doan-pelitromex`, `-cao-fine-jewellery`, `-su-kien-cgv`, `-su-kien-bentley`, `-vasta-stone` | Bài | 0 | **GIỮ TẤT CẢ** — không cắn nhau (tên riêng), là bằng chứng xã hội. Gom thành khối "Khách hàng đã tin dùng" trên [CL] |
| 9 bài loại quà cụ thể: `moc-khoa-da-`, `so-tay-`, `tag-vali-`, `bao-da-dung-passport-`, `bao-da-dung-the-nhan-vien-`, `bao-da-dien-thoai-`, `vi-dung-the-card-holder-`, `tui-da-`, `cau-chuyen-ve-nhung-chiec-hop-` | Bài | 2 (`bao-da-dien-thoai-`), 1 (`bao-da-dung-passport-`) | **GIỮ TẤT CẢ** — mỗi bài một loại SP, ý định thật khác nhau |
| 10 tag `/tag/…` **giống hệt nhau** | Tag | 0 | **noindex toàn bộ**, xem §2 |

**Ước tính:** cụm này gọn từ **~45 URL xuống ~22 URL** mà không mất một lượt organic nào (trừ 1 bài phải giữ nguyên).

### Cụm K — Sửa chữa / Spa đồ da

| URL | Loại | Organic 90n | Xử lý |
|---|---|---|---|
| `/sua-chua-do-da/` | Trang tĩnh, 10.238 chữ | **1** | **[CL] trung tâm dịch vụ** — đã có "hơn 10 năm kinh nghiệm" trong nội dung sẵn |
| `/7657-2/` | Trang tĩnh, tiêu đề **rỗng** | 0 | **301 → [CL]** (trùng 2,6%, nhưng cùng chủ đề + slug rác) |
| `/dich-vu-sua-chua-spa-do-da-cao-cap/` | Bài | **1** | Trùng ý định với [CL] → **301 → [CL]** |
| `/dich-vu-sua-chua-spa-tui-da-hang-hieu/` | Bài | **2** (2 khách) | ⚠️ Giữ — [CL] nhánh **túi hàng hiệu** |
| `/spa-tui-hieu/` | Bài | **1** | Trùng ý định trên → gộp → **301 → `/dich-vu-sua-chua-spa-tui-da-hang-hieu/`** |
| `/sua-tui-xach-hang-hieu/` | Bài | 0 | **301 → `/dich-vu-sua-chua-spa-tui-da-hang-hieu/`** |
| `/sua-tui-hieu-gan-day-tai-tp-hcm/`, `/sua-tui-xach-hang-hieu-quan-phu-nhuan/`, `/top-dia-chi-sua-tui-hang-hieu/` | 3 bài | 0 | Cùng ý định "ở đâu/gần đây" → gộp còn **1** bài địa phương, 301 hai bài kia |
| `/sua-tui-gucci/`, `/sua-tui-lv/` (1 organic), `/sua-tui-dior-tp-hcm/`, `/sua-tui-chanel/` | 4 bài | 1 | **GIỮ TẤT CẢ** — nhắm hãng riêng. Cảnh báo pháp lý §4 |
| `/phuc-hoi-da-tui-xach/`, `/thay-day-tui-xach-hang-hieu/`, `/tui-bi-moc-o-vang-xin-mau/`, `/cach-ve-sinh-tui-hang-hieu/` | 4 bài | 0 | Giữ — mỗi bài một hư hỏng cụ thể |
| `/gia-spa-tui-hieu-2025/` | Bài | 0 | ⚠️ Giữ nhưng **năm 2025 đã cũ** → cập nhật hoặc bỏ năm khỏi tiêu đề |
| `/sua-chua-balo/` | Bài | **2** | Giữ — ngách riêng |
| `/dich-vu-sua-chua-vi-da-cao-cap/` | Bài | **1** | Giữ — ngách riêng |

### Cụm L — Xưởng / nhà sản xuất / thiết kế theo yêu cầu (cắn nhau 7 URL)

| URL | Loại | Organic 90n | Xử lý |
|---|---|---|---|
| `/koi-leather-nha-san-xuat-do-da-thu-cong-cao-cap-tai-viet-nam/` | Trang tĩnh, 4.938 chữ, "About Koi Leather" | 0 | **[CL] giới thiệu** — nội dung sạch, có mốc **thành lập 2017** |
| `/nha-san-xuat-do-da-thu-cong/` | Trang tĩnh, 5.220 chữ | 0 | 🚨 **nội dung BỊ LẪN bài tai nghe** — meta_title gần trùng [CL] → **301 → [CL]**, đừng gộp |
| `/xuong-thiet-ke-do-da-thu-cong-theo-moi-yeu-cau-tai-tp-ho-chi-minh/` | Bài | 0 (3 lượt) | **[CL] xưởng/OEM** — dài nhất trong nhóm |
| `/xuong-thiet-ke-do-da/` | Bài | 0 | **301 → [CL] xưởng** |
| `/thiet-ke-do-da-theo-yeu-cau/` | Bài | 0 | **301 → [CL] xưởng** |
| `/custom-handcrafted-leather-in-ho-chi-minh-city/` | Bài **tiếng Anh** | 0 (2 lượt) | Giữ — khác ngôn ngữ, không cắn tiếng Việt |
| `/%ed%98%b8…/` (bài **tiếng Hàn**) | Bài | 0 | Giữ — khác ngôn ngữ |
| `/shop-do-da-tphcm/`, `/danh-gia-top-5-cua-hang-do-da-thu-cong…/` | 2 bài | 0 | Giữ — ý định "shop ở đâu", khác "xưởng sản xuất" |
| `/do-da-cao-cap-do-da-that-koi-leather/`, `/kien-thuc-can-biet-khi-chon-do-da-thu-cong/` | 2 bài | 0 | Giữ — thông tin chung |

### Cụm M — Chất liệu da (cụm SẠCH — mẫu mực, đừng đụng)

22 bài về da (Epsom, Togo, cá sấu, đà điểu, dê Alran, Clemence, cừu…). `/da-de-alran/` có **1 organic**.

Kiểm tra: `da-togo` / `da-togo-co-ben-khong` / `cach-bao-quan-da-togo` / `da-togo-va-da-epsom` / `da-togo-vs-da-clemence` / `tui-hermes-da-togo` — **5 ý định khác nhau thật** (là gì / có bền / bảo quản / so sánh A-B / ứng dụng). **Không cắn nhau. Giữ nguyên toàn bộ.**

Việc duy nhất: nối 22 bài này vào các landing `/dat-lam/…` ở khối "Chọn chất da" — hiện chúng là đảo cô lập. Dữ liệu chất liệu đã có sẵn (Epsom 91 SP, Cá sấu 48, Da bò Ý 44, Togo 32…).

### Cụm N — Charm, móc khoá, phụ kiện nhỏ

| URL | Organic | Xử lý |
|---|---|---|
| `/san-pham/charm-deo-tui-bang-da/` (12 SP) | **1** | **[CL] lưới** |
| `/san-xuat-charm-da-theo-yeu-cau-phu-kien-tui-xach/` | 0 (1 lượt) | **[CL] đặt riêng charm** — giữ |
| `/san-pham/charm-dung-son/` (3 SP) | 0 | **noindex** hoặc gộp vào charm |
| `/lipstick-bag-charm-son-bao-ve-chiec-son-xinh-xan-cua-ban/` | 0 (1 lượt) | Trùng charm đựng son → **301 → `/san-xuat-charm-da-theo-yeu-cau…/`** |
| `/charm-noel-koi-leather-qua-tang-y-nghia-cho-mua-le-hoi/` | 0 (2 lượt) | Giữ — theo mùa |
| `/moc-khoa-da-qua-tang-doanh-nghiep/` | 0 | Giữ — thuộc cụm J |

---

## 2. Tag — 129 URL rác đang được khai báo vào sitemap

`src/app/sitemap.ts` khai tag ≥3 bài/SP. Con số thật:

- **Tag blog:** 63 tổng → **35 vào sitemap**
- **Tag sản phẩm:** 430 tổng → **94 vào sitemap**
- Tổng: **129 URL tag** trong sitemap, không một URL nào có organic.

Tôi so tập bài của từng tag. Có những **nhóm tag chứa CHÍNH XÁC cùng một tập bài** — tức nhiều URL, nội dung giống 100%:

| Số tag trùng khớp tuyệt đối | Danh sách |
|---|---|
| **10** | `qua-khai-truong`, `qua-tang-khai-truong`, `qua-tet-doanh-nghiep`, `bo-qua-tang-doanh-nghiep`, `qua-tang-doanh-nghiep-brandgift`, `qua-tang-doanh-nghiep-cao-cap`, `qua-tang-doanh-nghiep-doc-dao`, `qua-tang-tet-doanh-nghiep`, `qua-tang-trong-to-chuc-su-kien`, `qua-tet-cho-doanh-nghiep` |
| **4** | `day-apple-watch-handmade`, `day-da-apple-watch-handmade`, `day-da-handmade-apple-watch`, `day-da-lon-dong-ho-handmade` |
| **3** | `day-da-ca-sau-handmade`, `day-da-dong-ho-handmade`, `dong-ho-handmade` |
| **3** | `day-da-dong-ho-ca-sau-handmade`, `day-da-handmade`, `lam-day-da-dong-ho-handmade` |
| **3** | `day-deo-dong-ho-handmade`, `day-dong-ho-da-bo-handmade`, `day-dong-ho-handmade` |

**Hành động — 3 dòng sửa, hiệu quả lớn nhất trên mỗi giờ công:**

1. Trong `src/app/sitemap.ts`: **bỏ hoàn toàn** hai khối `productTags` và `blogTerms` với `taxonomy === 'tag'`. Giữ `category` (3 chuyên mục lớn: 57/53/39 bài — đó là cụm nội dung thật).
2. Trong `src/app/tag/[slug]/page.tsx` và `src/app/tu-khoa-san-pham/[slug]/page.tsx`: đặt `robots: { index: false, follow: true }` **cho mọi tag**, không chỉ tag <3 (hiện `/tu-khoa-san-pham/` đã có logic này nhưng ngưỡng ở 3 — nâng thành "tất cả").
3. URL vẫn sống (không mất link cũ), chỉ không vào chỉ mục.

Lý do đủ mạnh: 129 URL tag không organic đang hút hết crawl budget của một site chỉ có 145 lượt Google/90 ngày, đồng thời cạnh tranh trực diện với chính danh mục (`/tu-khoa-san-pham/day-da-dong-ho/` 31 SP vs `/san-pham/day-da-dong-ho/` 43 SP — cùng tên, cùng ý định).

---

## 3. Landing page nên đặt ở ĐƯỜNG DẪN NÀO — cân nhắc 3 lựa chọn

### (a) Nâng cấp `/san-pham/{slug}/` thành landing dài

| Được | Mất |
|---|---|
| URL đã có tuổi, đã trong sitemap | **1 URL gánh 2 ý định**: "xem hàng để mua" vs "đặt làm riêng" — H1 chỉ chọn được một |
| **Đã có organic thật**: card-holder 3, bao-da-ipad 3, boc-da-tai-nghe 2, boc-khoa-o-to 1, charm-deo-tui 1 | **Phân trang nhân bản nội dung**: `?page=2` của `tui-da-cho-nu` (48 SP = 2 trang) lặp lại toàn bộ prose landing → tự tạo duplicate mới, đúng bệnh vừa chữa |
| Đã được internal link từ mega menu, footer, breadcrumb | Danh mục 48 SP + landing dài = trang nặng, cuộn rất xa mới tới lưới → hại tỷ lệ chuyển đổi của khách đã muốn mua |
| Không sinh URL mới, không loãng authority | 11/29 danh mục quá mỏng (≤3 SP) không đáng viết landing → khuôn không áp dụng đều được |

Xử lý được vấn đề phân trang (chỉ render prose khi `page === 1`), nhưng vấn đề "một URL hai ý định" thì không.

### (b) Nhánh mới `/dat-lam/{slug}/`, `/san-pham/` vẫn là lưới ✅ **CHỌN**

| Được | Mất |
|---|---|
| **Tách ý định rạch ròi**: `/san-pham/` nhắm truy vấn duyệt-mua ("túi da nữ cao cấp"), `/dat-lam/` nhắm truy vấn đặt-làm ("đặt làm túi da theo yêu cầu") — hai ý định **thật sự khác nhau** | URL mới = **0 tuổi, 0 backlink**, phải xây từ đầu |
| **Không đụng vào 5 danh mục đang có organic** — rủi ro bằng 0 | Sinh URL mới → nếu không phân vai bằng title/H1 thì **tự cắn với `/san-pham/{slug}/`** |
| Phân trang không nhân bản prose | Cần thêm 1 route + logic nội dung |
| `/dat-lam/` tự thân là tín hiệu chủ đề — 25 bài "thay dây", 22 bài chất da, các bài "đặt làm…" đều có chỗ trỏ về | |
| Làm bao nhiêu cũng được, không bắt buộc đủ 29 | |

**Đánh đổi cốt tử — và đây là lý do quyết định:** lập luận "URL cũ có tuổi, đừng làm mới" chỉ đúng khi URL cũ đang xếp hạng. Dữ liệu nói ngược: toàn site chỉ **145 lượt Google/90 ngày**, và **6 trang tĩnh trùng danh mục có đúng 0 lượt**. Cái gọi là "tuổi URL" ở đây **chưa quy đổi thành thứ hạng nào**. Chi phí tạo URL mới vì vậy gần như bằng không, còn lợi ích (tách ý định, không phá trang đang chạy) là thật.

### (c) Dùng lại slug WordPress cũ (`/tui-da-nam/`)

| Được | Mất |
|---|---|
| Nghe như "thừa hưởng tuổi miền" | **Dữ liệu bác bỏ**: `/tui-da-nam/`, `/tui-da-nu/`, `/day-da-dong-ho/`, `/do-da-danh-cho-nam/`, `/do-da-danh-cho-nu/`, `/phu-kien-bang-da/` — **cả 6 đều 0 lượt, 0 organic**/90 ngày |
| | **Slug không thành khuôn**: `tui-da-nam` vs `do-da-danh-cho-nam` vs danh mục `tui-da-cho-nam` — ba cách gọi cho một thứ, không suy ra được quy tắc cho 29 danh mục |
| | **Nằm ở gốc tên miền, không có thứ bậc** — trộn lẫn với 158 bài viết cũng ở gốc, không mở rộng được |
| | **Công sức lập trình xấu nhất**: `/[slug]/` render HTML thô qua `dangerouslySetInnerHTML`. Muốn có ProductCard / LeadForm / ContactBar phải hoặc viết HTML tay vào DB (mất hết component), hoặc special-case từng slug trong code — 6 nhánh `if` trong một route |
| | `/do-da-danh-cho-nam/` chỉ có 6.808 chữ mà phần lớn là hero + lưới; `/phu-kien-bang-da/` chỉ **1.351 chữ** — gần như không có gì để thừa hưởng |

**→ Loại (c). Chọn (b).** Dùng **`/dat-lam/{slug}/`**, không dùng `/bespoke/{slug}/`: khách Việt tra "đặt làm ví da", "may túi da theo yêu cầu" — không tra "bespoke". Từ `bespoke` chỉ nên xuất hiện trong nội dung, không nên nằm trong URL.

### Điều kiện bắt buộc để (b) không tự cắn — phân vai bằng văn bản

| | `/san-pham/{slug}/` | `/dat-lam/{slug}/` |
|---|---|---|
| **Vai** | Lưới sản phẩm có sẵn | Kể chuyện → dẫn tới đặt riêng |
| **H1** | "Túi Da Cho Nữ" | "Đặt làm túi da nữ theo yêu cầu" |
| **Title** | `Túi Da Cho Nữ — 48 mẫu thủ công \| KOI Leather` | `Đặt Làm Túi Da Nữ Theo Yêu Cầu — Chọn Da, Màu, Kích Thước \| KOI` |
| **Nhắm** | "túi da nữ", "túi da nữ cao cấp", "túi da nữ thủ công" | "đặt làm túi da", "may túi da theo yêu cầu", "túi da đặt riêng" |
| **Nội dung** | Lưới + 2–3 đoạn mở đầu + link nổi bật sang `/dat-lam/` | Quy trình, chọn chất da, khoảng giá, form + Zalo. **Không lặp lưới.** |
| **Liên kết** | → `/dat-lam/{slug}/` | → `/san-pham/{slug}/` ("xem mẫu đã có") |

### Giai đoạn 1 — làm 6 landing, không làm 29

Chọn theo nơi có **cả** chiều sâu sản phẩm **và** cụm nội dung sẵn để trỏ về:

| Landing | SP | Giá TV | Vốn nội dung sẵn có để gộp vào |
|---|---|---|---|
| `/dat-lam/day-da-dong-ho/` | 43 | 2,2tr | Trang tĩnh 10.081 chữ + 25 bài theo hãng + 2 bài đặt làm |
| `/dat-lam/tui-da-cho-nu/` | 48 | 11,5tr | 2 trang tĩnh (9.276 + 10.160 chữ) + 2 bài BST |
| `/dat-lam/vi-da-cho-nam/` | 27 | 4,8tr | Cụm khắc tên (organic 7) + `/lam-vi-da-theo-yeu-cau/` |
| `/dat-lam/day-lung-cho-nam/` | 20 | 4,5tr | 2 bài đặt làm + cụm đo/cắt (organic 7) |
| `/dat-lam/tui-da-cho-nam/` | 14 | 16tr | Trang tĩnh 7.901 chữ |
| `/dat-lam/card-holder/` | 14 | 2,8tr | Danh mục hút nhất (24 lượt, 3 organic) + BST Koi's Card Holder |

**Ba cụm dịch vụ KHÔNG đi vào `/dat-lam/`** — chúng đã có trang chủ lực đang chạy organic, chỉ cần nâng cấp tại chỗ:
- Sửa chữa/spa → `/sua-chua-do-da/`
- Quà tặng doanh nghiệp → `/san-xuat-qua-tang-doanh-nghiep-va-su-kien/`
- Bọc da tai nghe → `/dich-vu-boc-da-tai-nghe-cao-cap/`

### Ghi chú lập trình

- Route mới: `src/app/dat-lam/[slug]/page.tsx`, dùng lại `ProductCard`, `LeadForm`, `ContactBar`, `ContactLink`, `ProductGallery` — không cần component mới.
- `trailingSlash: true` đã bật → đường dẫn `/dat-lam/{slug}/`, đúng khuôn site.
- Thêm `/dat-lam/{slug}/` vào `sitemap.ts` với `priority: 0.8`, đồng thời **rút** trang tĩnh đã 301 khỏi danh sách `pages` (mở rộng `Set` `redirected` — hiện có 8 slug).
- Thêm mục "Đặt làm riêng" vào mega menu (`site-header.tsx`, cột "Khám phá") và footer — nhánh mới cần internal link ngay từ ngày đầu, vì không có tuổi bù lại.
- **Bảng `public.redirects` đang có 0 dòng** nhưng model đã sẵn (`from_path`, `to_path`, `status_code` mặc định 301). Với ~45 redirect, nên nạp vào bảng này + đọc trong `middleware.ts` (storefront **hiện chưa có** middleware), thay vì viết cứng vào `next.config.ts` như 7 redirect hiện tại — để người bán tự thêm được về sau.

---

## 4. 🚨 CẢNH BÁO — những URL TUYỆT ĐỐI không được 301

Đây là phần dễ mất tiền nhất. Mọi URL dưới đây **đang có organic Google thật** trong 90 ngày. 301 chúng đi là xoá đúng phần organic ít ỏi đang có.

| URL | Lượt Google | Khách | Vì sao phải giữ |
|---|---|---|---|
| `/qua-tang-doanh-nghiep-cuoi-nam/` | **14** | **13** | 🚨 **Trang organic mạnh nhất toàn site** sau trang chủ và `/cua-hang/`. 13 khách khác nhau — không phải một người tải lại. Cụm J có 45 URL, sức hút hầu như dồn vào đúng bài này. **Không gộp, không 301, không đổi slug.** Nâng nó lên, và cho nó trỏ về `[CL]` chứ không ngược lại. |
| `/dinh-vu-do-va-cat-day-lung-chuyen-nghiep/` | **7** | 6 | Slug **sai chính tả** ("dinh-vu" đúng ra "dich-vu"). **ĐỪNG SỬA.** Slug xấu nhưng đang xếp hạng; đổi = mất 7 lượt để lấy vẻ đẹp URL mà không ai nhìn. |
| `/khac-ten-len-vi-da/` | **7** | 5 | Là `[CL]` của cụm khắc tên — chọn nó **vì** organic này, dù có bài khác dài hơn. |
| `/dich-vu-lam-tui-da-theo-yeu-cau/` | **5** | 5 | ⚠️ **Điểm cần thận trọng nhất trong kế hoạch.** Bài này cắn trực diện với `/dat-lam/tui-da-cho-nu/` và `/dat-lam/tui-da-cho-nam/` sắp tạo — cùng ý định "làm túi da theo yêu cầu". Nhưng nó đang có organic, còn landing mới thì chưa có gì. **Giữ nguyên**, đổi góc thành trang **tổng quan dịch vụ làm túi** và cho nó trỏ xuống hai landing nam/nữ. Chỉ xét 301 sau khi landing mới đã tự có organic — **theo dõi tối thiểu 3 tháng** rồi mới quyết. |
| `/dich-vu-boc-da-tai-nghe-cao-cap/` | **4** | 3 | `[CL]` cụm tai nghe. Đừng gộp vào `/san-pham/boc-da-tai-nghe/`. |
| `/dich-vu-khac-ten-len-san-pham-khac-ten-theo-yeu-cau/` | **2** | 1 | Giữ, đổi góc sang "khắc tên trên mọi loại SP" để không cắn `[CL]` ví. |
| `/dich-vu-sua-chua-spa-tui-da-hang-hieu/` | **2** | 2 | `[CL]` nhánh túi hàng hiệu. |
| `/bao-da-dien-thoai-op-lung-da-qua-doanh-nghiep-cao-cap/` | **2** | 2 | Giữ dù thuộc cụm J 45 URL. |
| `/sua-chua-balo/` | **2** | 1 | Ngách riêng, không ai cạnh tranh. |
| `/san-pham/card-holder/` | **3** | 3 | Danh mục hút nhất (24 lượt tổng). **Đây là lý do chính không chọn phương án (a)** — nâng cấp nó thành landing dài là mạo hiểm với trang đang chạy tốt nhất. |
| `/san-pham/bao-da-ipad/` | **3** | 2 | 24 lượt tổng. |
| `/san-pham/boc-da-tai-nghe/` | **2** | 1 | Giữ dù mô tả đang **0 ký tự** — viết mô tả, đừng bỏ. |
| `/san-pham/boc-khoa-o-to/` | **1** | 1 | 11 lượt tổng. |
| `/san-pham/charm-deo-tui-bang-da/` | **1** | 1 | |
| `/spa-tui-hieu/`, `/sua-chua-do-da/`, `/sua-tui-lv/`, `/thay-da-tai-nghe-sony…/`, `/bao-da-dung-passport…/`, `/da-de-alran/`, `/dat-lam-day-lung-da-ca-sau/`, `/dich-vu-sua-chua-spa-do-da-cao-cap/`, `/dich-vu-sua-chua-vi-da-cao-cap/`, `/dich-vu-sua-con-dia-day-dong-ho/` | **1** mỗi URL | 1 | Mỗi URL 1 lượt — nhỏ, nhưng trên nền 145 lượt/90 ngày thì **1 lượt ≈ 0,7% toàn bộ organic**. Trong danh sách này tôi vẫn đề xuất 301 hai URL (`/spa-tui-hieu/`, `/dich-vu-sua-chua-spa-do-da-cao-cap/`) vì chúng trùng ý định gần như tuyệt đối với `[CL]` mạnh hơn — nhưng phải **ghi nhận đây là đánh đổi có ý thức**, không phải bỏ sót. |

**Nguyên tắc chốt:** trong 45 redirect đề xuất, **hơn 40 URL có đúng 0 lượt Google** — đó là phần an toàn tuyệt đối, làm ngay. Chỉ 2 URL có 1 lượt là đánh đổi cân nhắc. **Không có URL nào từ 2 lượt trở lên bị 301.**

**Cảnh báo pháp lý (ngoài phạm vi SEO nhưng phải nêu):** các bài `/dat-lam-day-lung-hermes/`, `/dat-lam-day-lung-khoa-chu-h/`, `/thay-day-da-dong-ho-hermes…/`, `/tui-hermes-da-epsom/`, `/tui-hermes-da-togo/`, `/tui-hermes-da-da-dieu/`, `/sua-tui-gucci/`, `/sua-tui-lv/`, `/sua-tui-chanel/`, `/sua-tui-dior-tp-hcm/`, và các danh mục/SP đặt tên `loewe-hammock-hobo-bag…`, `that-lung-montblance…`, `vi-monte…` đang dùng tên thương hiệu được bảo hộ. Với **dịch vụ sửa chữa** thì nêu tên hãng thường được coi là chỉ dẫn hợp lý; nhưng với **"đặt làm dây lưng Hermes"** hay **"khoá chữ H"** thì là mô tả sản phẩm mô phỏng — rủi ro khác hẳn về bản chất. Đây là quyết định của người bán, không phải của SEO. **[NGƯỜI BÁN QUYẾT: giữ nguyên / đổi sang "dây lưng khoá chữ H phong cách cổ điển" / rút bài]**

---

## 5. Thứ tự thi hành

### Tuần 1 — Sửa lỗi kỹ thuật (chưa cần viết chữ, hiệu quả cao nhất)

1. Sửa canonical + 301 URL nhiều đoạn trong `src/app/san-pham/[...path]/page.tsx` (§0.1) — **quan trọng nhất**.
2. `noindex` toàn bộ tag; rút tag khỏi `sitemap.ts` (§2) → 129 URL rác ra khỏi chỉ mục.
3. `noindex` 11 danh mục mỏng (mô tả ≤17 ký tự, ≤3 SP) (§Cụm G).
4. Nạp 5 redirect cứu 404 danh mục (§0.2).
5. Xoá / `noindex` + 301 `/3961-2/` (demo theme tiếng Anh) và `/7657-2/` (tiêu đề rỗng) (§0.4).
6. Tạo `src/middleware.ts` đọc `public.redirects`; nạp bảng redirect từ §1.

### Tuần 2 — Gộp nội dung

7. Bóc chữ thật từ 6 trang tĩnh (đã đo: 1.351–10.160 ký tự) → soạn vào 6 landing `/dat-lam/`.
8. Gộp cụm khắc tên (6→1), cụm quà tặng (~45→~22), cụm sửa chữa, cụm xưởng — **đối chiếu §4 trước mỗi lần 301**.

### Tuần 3–4 — Landing mới

9. Route `src/app/dat-lam/[slug]/page.tsx`.
10. 6 landing giai đoạn 1, phân vai title/H1 theo bảng §3.
11. Nối internal link: 25 bài dây → hub dây; 22 bài chất da → khối "Chọn chất da"; 9 case study → `[CL]` quà tặng.
12. Cập nhật mega menu + footer + sitemap.

### Sau khi lên

13. Gửi lại sitemap; theo dõi GSC riêng cho `/dat-lam/*`.
14. **Mốc 3 tháng:** xét lại `/dich-vu-lam-tui-da-theo-yeu-cau/` (§4) — chỉ 301 nếu landing mới đã tự có organic.

---

## 6. Kết quả dự kiến

| | Trước | Sau |
|---|---|---|
| URL trong sitemap | Sản phẩm + 29 danh mục + 158 bài + 27 trang + **129 tag** + 3 chuyên mục | **bỏ 129 tag**, bỏ ~45 URL đã 301, thêm 6 landing |
| URL/danh mục | **vô hạn** (mọi tiền tố trả 200, tự canonical) | **1** |
| Danh mục 404 | 5 (2 URL từng gánh ~90 SP) | 0 |
| URL cụm quà tặng | ~45 | ~22 |
| URL cụm khắc tên | 6 | 1 (+1 đổi góc) |
| Organic mất do 301 | — | **2 lượt/90 ngày** (đánh đổi có ý thức, §4) |

Điểm mấu chốt: đây **không phải** bài toán "hy sinh trang cũ để lấy trang mới". Sáu trang tĩnh trùng danh mục có **0 organic**, 129 tag có **0 organic**. Phần lớn việc gộp là dọn URL chưa từng mang lại gì. Toàn bộ 145 lượt Google/90 ngày đang tập trung vào ~25 URL, và **không URL nào từ 2 lượt trở lên bị đụng tới**.

---

### Ô cần người bán điền (tôi không suy ra được từ dữ liệu)

- **[NGƯỜI BÁN ĐIỀN: thời gian hoàn thiện hàng đặt riêng theo từng nhóm — dây đồng hồ / ví / túi / dây lưng]**
- **[NGƯỜI BÁN ĐIỀN: khoảng giá khởi điểm cho hàng đặt riêng]** — tôi có giá min/max/trung vị hàng **có sẵn** (ví dụ túi nữ TV 11,5tr; dây đồng hồ TV 2,2tr), nhưng giá đặt riêng là con số khác, không có trong DB.
- **[NGƯỜI BÁN ĐIỀN: chính sách bảo hành/bảo dưỡng]** — thanh thông báo header đang ghi "Bảo dưỡng trọn đời" nhưng không có trang nào định nghĩa phạm vi.
- **[NGƯỜI BÁN ĐIỀN: đặt cọc bao nhiêu %, có sửa lại sau khi nhận không]**
- **[NGƯỜI BÁN ĐIỀN: địa chỉ xưởng/showroom]** — `/lien-he/` chỉ có 483 ký tự.
- **[NGƯỜI BÁN XÁC NHẬN: số năm kinh nghiệm]** — dữ liệu **tự mâu thuẫn**: `/koi-leather-nha-san-xuat…/` ghi thành lập **2017**; `/sua-chua-do-da/` ghi **"hơn 10 năm"**; `/nha-san-xuat-do-da-thu-cong/` ghi **"hơn 7 năm"**. Tính từ 2017 đến nay là 9 năm. Phải chốt **một** con số trước khi viết landing, nếu không sẽ nhân bản mâu thuẫn ra 6 trang mới.
- **[NGƯỜI BÁN QUYẾT: xử lý tên thương hiệu được bảo hộ]** (§4)
- **[NGƯỜI BÁN QUYẾT: `/gia-spa-tui-hieu-2025/`]** — cập nhật giá hay bỏ năm khỏi tiêu đề.