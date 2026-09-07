# Thư viện ảnh — Backend NhatKy (GĐ1)

**Người làm:** Claude (tự code trực tiếp, KHÔNG qua OpenCode — A Khoa yêu cầu). **Ngày:** 2026-09-07.

## Đã tạo
- `src/image-library/image-library.module.ts` — module (PrismaModule là @Global nên không import lại).
- `src/image-library/image-library.controller.ts` — `@Controller("image-library")`, 4 GET: `/stats`, `/duplicates`, `/` (list), `/:id`. Khai `stats` + `duplicates` TRƯỚC `:id` để route tĩnh không bị `:id` nuốt.
- `src/image-library/image-library.service.ts` — truy vấn KoiImageVision: stats (count + groupBy + isEmpty + having _count>1), danhSach (findMany+count có lọc/tìm/sort/phân trang), chiTiet (row + trungLap theo noiDungHash), trungLap (nhóm trùng).
- `src/image-library/dto/query-images.dto.ts` — query DTO; cờ lọc để dạng CHUỖI (không boolean) vì enableImplicitConversion ép "false"→true; service diễn giải bằng `bat()`.

## Đã sửa
- `src/app.module.ts` — import + đăng ký `ImageLibraryModule` (+2 dòng).
- `src/auth/auth.guard.ts` — thêm `laMediaReadToken()` + nhánh service token `KOI_MEDIA_READ_TOKEN` (chỉ GET/HEAD, chỉ prefix `/image-library`), đặt sau nhánh token ghi Heoiu, trước nhánh GET chung; fail-closed + timing-safe; từ chối nếu trùng giá trị HEOIU_*.

## RÀNG BUỘC đã giữ
- KHÔNG đổi `prisma/schema.prisma`, KHÔNG `prisma db push`. Chỉ đọc KoiImageVision.
- Không đổi hành vi endpoint cũ.
- Token chỉ đọc `process.env.KOI_MEDIA_READ_TOKEN`, không hardcode.

## Kiểm chứng (đã chạy thật)
- `npx prisma generate && npm run build` → **XANH** (chỉ warning tailwind/browserslist).
- Probe Prisma trên DB thật (`_probe_imglib.tmp.mjs`, đã xoá): mọi truy vấn khó chạy OK (isEmpty, having _count>1, orderBy nulls-last, groupBy orderBy _count, OR insensitive, in[hashes]).
- Smoke-test HTTP (server local port 3007, token tạm):
  - `GET /image-library/stats` + token → **200** (`{"tong":336, watermark:82, khacTen:69, lifestyle:47, chuaGan:66, trung:63, theoNguon:[supabase:336], theoLoai:[blog:336]}`).
  - Không token → **401**. `GET /storage/database` bằng media token → **401** (scope đúng, chỉ /image-library).
  - `GET /image-library` (list, watermark=true), `/duplicates`, `/:id` → **200** đúng dữ liệu.
  - `POST /image-library/stats` → **404** (không có route ghi → token không ghi được gì).

## ⚠️ Lưu ý cho A Khoa / Claude (chưa xong hẳn ở khâu người)
1. **Env production:** đặt `KOI_MEDIA_READ_TOKEN` (chuỗi ≥32 ký tự) trên Vercel project `koi-leather-api` — GIỐNG HỆT giá trị đặt bên storefront. Chưa đặt thì storefront gọi vào sẽ 401.
2. **Dữ liệu:** bảng `KoiImageVision` trên DB hiện có **336 dòng, TOÀN ảnh blog** (không phải ~5.622 như comment schema; CHƯA có ảnh sản phẩm). Code đúng — thư viện sẽ hiện đủ khi lượt quét vision sản phẩm được nạp vào DB.
3. **Deploy:** commit chọn lọc CHỈ file feature (cây làm việc còn nhiều WIP khác chưa commit — KHÔNG gộp).

---
## GĐ2 — Alt ảnh sản phẩm bằng AI (08/09/2026, Claude tự code)
- Mới: `src/image-library/dto/product-alt.dto.ts`, `src/image-library/product-alt.service.ts` (list SP + stats alt + sinhAlt qua OpenAiClient.sinhJson + apDungAlt qua MediaService.updateImageMetadata).
- Sửa: `image-library.controller.ts` (route products/stats, products, products/:id/images, POST generate-alt, POST apply-alt — khai trước :id), `image-library.module.ts` (import KoiMediaModule + AiEditModule), `auth.guard.ts` (nhánh KOI_MEDIA_WRITE_TOKEN, chỉ 2 POST).
- Tái dùng: OpenAiClient (AiEditModule export), MediaService (KoiMediaModule export). KHÔNG đổi schema.
- Verify: build XANH; HTTP DB thật: GET products/stats/images 200 (read token); POST generate-alt (write token) → 201 alt AI thật gpt-4.1-mini (12 ảnh, alt phân biệt chất lượng); read POST→401, write GET→401, apply id giả→soDaGhi:0 (không đụng data), không token→401.
- Review đối nghịch (workflow) fix: stats() loại altText "" khỏi nhóm trùng cho khớp filter chiTrung.
- Stats thật: 4.696 ảnh SP, 314 thiếu alt, 2.688 ảnh alt trùng (317 nhóm).
- ⚠️ Cần đặt `KOI_MEDIA_WRITE_TOKEN` trên Vercel koi-leather-api (khác read token). OPENAI_API_KEY đã có sẵn prod.
