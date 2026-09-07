# Thư viện ảnh tổng — GĐ1 (BACKEND API)

**Repo:** koi-leather-api (NestJS + Prisma). **Người giao:** Claude (spec). **Người làm:** OpenCode.
**Bối cảnh chốt với chủ shop:**
- Dựng "thư viện ảnh tổng" cho admin: xem/tìm/lọc TẤT CẢ ảnh website trong một màn.
- GĐ1 = **CHỈ ĐỌC** (inventory + thống kê + chi tiết). Không sửa/xoá/upload ở giai đoạn này.
- Xương sống dữ liệu = bảng **`KoiImageVision`** (`koi_free_style.koi_image_vision`) — 5.622 ảnh đã được AI phân loại sẵn, hiện CHƯA endpoint/màn nào dùng tới. GĐ1 chỉ ĐỌC bảng này, **KHÔNG đổi schema, KHÔNG db push** (bảng có cột generated hay gây lỗi `db push`).
- Giao diện nằm ở repo khác (koi-storefront, trang React `/quan-tri/anh`). Repo này CHỈ lo API + cầu nối auth.

> ⚠️ Đây KHÔNG phải Next.js/Nest bạn quen — đọc `node_modules/next/dist/docs/` (bên storefront) không liên quan repo này; ở repo này theo đúng convention Nest hiện có. Bắt chước y hệt style module `image-category` và `media` đang có.

---

## 0. Nguyên tắc
- **Không đổi Prisma schema. Không chạy `prisma db push`.** Chỉ đọc.
- Chỉ dùng cột CÓ THẬT của `KoiImageVision` (xem `prisma/schema.prisma` model `KoiImageVision`, dòng ~565). Tên field Prisma (camelCase) đã map sẵn sang cột snake_case — dùng tên Prisma.
- Giữ nguyên comment-style tiếng Việt như file quanh đó.
- Build phải XANH: `npx prisma generate && npm run build`.

## 1. Module mới `src/image-library/`
Tạo 4 file, đăng ký vào `src/app.module.ts` (thêm `ImageLibraryModule` vào mảng `imports`, bắt chước cách các module khác được import ở dòng ~39-53):
- `image-library.module.ts` — khai `ImageLibraryController` + `ImageLibraryService`, `imports: [PrismaModule]` (xem cách `image-category.module.ts` làm).
- `image-library.controller.ts` — `@Controller("image-library")`, `@ApiTags("ImageLibrary")`.
- `image-library.service.ts` — mọi truy vấn Prisma nằm ở đây.
- `dto/query-images.dto.ts` — DTO query param (class-validator), bắt chước dto hiện có.

## 2. Endpoint (TẤT CẢ là GET — chỉ đọc)

### 2.1 `GET /image-library/stats`
Trả thống kê toàn bảng (mọi con số tính bằng Prisma `count` / `groupBy`, KHÔNG kéo hết ra rồi đếm trong JS):
```jsonc
{
  "tong": 5622,
  "theoNguon": [ { "nguon": "supabase", "so": 3140 }, { "nguon": "cloudinary", "so": 1174 }, ... ], // groupBy nguon
  "theoLoai":  [ { "loai": "sanpham", "so": 4273 }, { "loai": "blog", "so": 1308 } ],               // groupBy loaiBanGhi
  "watermark": 0,   // count coLogoKoi = true
  "khacTen":   0,   // count coDauTen  = true
  "lifestyle": 0,   // count laLifestyle = true
  "chuaGan":   0,   // count spId = null AND postSlugs = [] (ảnh chưa gắn sp/bài nào)
  "trung":     0    // TỔNG số ảnh nằm trong nhóm trùng: groupBy noiDungHash _count>1, cộng _count (bỏ nhóm hash null)
}
```

### 2.2 `GET /image-library` — danh sách có phân trang + lọc
Query params (tất cả optional; validate bằng DTO):
- `page` (int ≥1, mặc định 1), `pageSize` (int 1..120, mặc định 60)
- `nguon` (string, khớp `nguon` chính xác)
- `loai` (string, khớp `loaiBanGhi`)
- `danhMuc` (string, khớp `danhMuc`)
- `spSlug` (string, khớp `spSlug`)
- `phanLoai` (string, khớp `phanLoai`)
- `watermark` `khacTen` `biaBai` `lifestyle` `chuaGan` `trung` — mỗi cái là bool ("true"/"1"); khi bật thì thêm điều kiện tương ứng (`coLogoKoi`, `coDauTen`, `laBiaBai`, `laLifestyle`; `chuaGan` = spId null & postSlugs empty; `trung` = noiDungHash nằm trong tập hash có count>1 — tính tập hash đó trước bằng groupBy rồi `where noiDungHash in [...]`).
- `q` (string ≤120) — tìm không phân biệt hoa thường trên `spTen` OR `spSlug` OR `moTa` OR `url` (Prisma `contains`, `mode: "insensitive"`).
- `sort` — `moiNhat` (mặc định, `quetLuc desc`) | `nangNhat` (`coTep desc nulls last`) | `to` (`width desc`).

Trả:
```jsonc
{
  "items": [{
    "id","url","nguon","bucket","spSlug","spTen","danhMuc","postSlugs","laBiaBai",
    "phanLoai","coLogoKoi","coDauTen","laLifestyle","width","height","tyLe","coTep",
    "altGoiY","noiDungHash"
  }],
  "total": 1234, "page": 1, "pageSize": 60
}
```
Dùng `prisma.$transaction([findMany(...), count(...)])` để lấy items + total cùng lúc. `select` đúng các field trên (đừng trả cả bảng).

### 2.3 `GET /image-library/:id` — chi tiết 1 ảnh
- Lấy toàn bộ row `KoiImageVision` theo `id` (404 nếu không có).
- Kèm `trungLap`: các row khác cùng `noiDungHash` (nếu hash != null), `select { id, url, spSlug, spTen, nguon }`, tối đa 50.
- Trả `{ ...row, trungLap: [...] }`.
- **KHÔNG** join sang product/post ở GĐ1 — dùng luôn field denormalized sẵn có (`spSlug/spTen/postSlugs/laBiaBai`). (Join sống để lấy vai trò primary/imageType để GĐ2.)

### 2.4 `GET /image-library/duplicates` — nhóm ảnh trùng
- `page`,`pageSize` (mặc định 30). groupBy `noiDungHash` where hash != null having `_count > 1`, sort theo count desc.
- Với mỗi nhóm trả `{ hash, so, items: [{id,url,spSlug,spTen,nguon}] }` (items: findMany theo hash, giới hạn 12/nhóm cho gọn).
- Trả `{ groups: [...], total, page, pageSize }` (total = số NHÓM trùng).

## 3. Cầu nối auth — thêm service token CHỈ-ĐỌC cho storefront
Trang `/quan-tri/anh` bên storefront sẽ gọi các endpoint trên **từ server-side** bằng một service token riêng (trình duyệt không thấy token). Guard mặc định đang KHOÁ mọi GET sau đăng nhập Google (`src/auth/auth.guard.ts`). Thêm nhánh token mới, theo ĐÚNG khuôn các token Heoiu đã có trong file đó:

Trong `auth.guard.ts`:
- Thêm hàm `private laMediaReadToken(token: string)` dùng lại `this.khopToken(token, process.env.KOI_MEDIA_READ_TOKEN)` (đã fail-closed khi thiếu biến hoặc <32 ký tự).
- Trong `canActivate`, **đặt SAU nhánh token ghi Heoiu, TRƯỚC nhánh GET chung** (vì token này không phải JWT — verifyToken sẽ ném lỗi nếu rơi xuống nhánh dưới), thêm:
```ts
// Máy-gọi-máy: trang Thư viện ảnh (storefront /quan-tri/anh) đọc kho ảnh
// bằng service token riêng, không phải người đăng nhập Google. CHỈ đọc, và
// chỉ nhóm /image-library. Token này khác hẳn HEOIU_* (đọc /analytics).
if (token && this.laMediaReadToken(token)) {
  const d = chuanHoaDuong(path);
  if (!["GET", "HEAD"].includes(method)) {
    throw new UnauthorizedException("Media token chỉ được đọc");
  }
  if (d !== "/image-library" && !d.startsWith("/image-library/")) {
    throw new UnauthorizedException("Media token chỉ đọc nhóm /image-library");
  }
  request.user = { service: "koi-media", chiDoc: true };
  return true;
}
```
- (Tùy chọn fail-closed, khuyến khích) trong `laMediaReadToken`, nếu `KOI_MEDIA_READ_TOKEN` trùng y hệt `HEOIU_SERVICE_TOKEN` hoặc `HEOIU_WRITE_TOKEN` thì trả false (tránh dán trùng biến).
- **KHÔNG hardcode giá trị token.** Chỉ đọc `process.env.KOI_MEDIA_READ_TOKEN`. Chủ shop sẽ đặt biến này trên Vercel (cùng giá trị ở cả 2 project).
- Cập nhật `.env` (bản local) thêm dòng comment `# KOI_MEDIA_READ_TOKEN=` (để trống, chỉ nhắc) — KHÔNG ghi giá trị thật.

## 4. Acceptance (tự kiểm trước khi báo xong)
1. `npx prisma generate && npm run build` — XANH.
2. Chạy local (`npm run start:dev` hoặc tương đương), đặt tạm `KOI_MEDIA_READ_TOKEN` = một chuỗi ≥32 ký tự trong môi trường shell, rồi:
   - `curl -s localhost:3000/image-library/stats -H "Authorization: Bearer <token>"` → JSON stats, `tong` > 0.
   - `curl -s "localhost:3000/image-library?pageSize=5&watermark=true" -H "Authorization: Bearer <token>"` → tối đa 5 item, tất cả `coLogoKoi=true` (nếu có ảnh watermark; nếu 0 thì thử filter khác như `loai=blog`).
   - `curl -s "localhost:3000/image-library?trung=true&pageSize=5" -H "..."` → item có `noiDungHash` lặp.
   - `curl -s localhost:3000/image-library/duplicates -H "..."` → groups có `so >= 2`.
   - Không có token: `curl -s localhost:3000/image-library/stats` → 401.
   - Token sai method: `curl -s -X POST localhost:3000/image-library/stats -H "Authorization: Bearer <token>"` → 401 "chỉ được đọc".
3. Không đụng bảng nào khác, không db push, không đổi hành vi các endpoint cũ.

## 5. Ghi nhật ký
Tạo/ghi tiến độ + mọi chỗ KẸT vào `KoiThuVienAnh-Backend-NhatKy.md` (repo này). Ghi: đã tạo file gì, kết quả build, kết quả curl, và mọi giả định phải chọn.

## 6. Commit
Build xanh + acceptance đạt → commit + push `origin main`.
Commit message gợi ý: `feat(image-library): read-only inventory API over KoiImageVision + media read token`.
**Lưu ý deploy (KHÔNG tự làm, để lại cho Claude/chủ shop):** endpoint chỉ hoạt động trên production sau khi biến `KOI_MEDIA_READ_TOKEN` được đặt trên Vercel project `koi-leather-api`. Nêu rõ điều này ở cuối NhatKy.
