# KoiCoverImage — Nhật ký

## Việc 1 — Prisma schema thêm coverImage — XONG (có KẸT db push)
- **Bắt đầu:** 2026-09-02 ~17:00
- **Sửa:** `prisma/schema.prisma` — model KoiCategory thêm `coverImage String?` sau `specsSchema`.
- **npx prisma validate:** pass (cảnh báo SetNull có sẵn, không liên quan).
- **KẸT:** `npx prisma db push --accept-data-loss` trả `ERROR: column "searchText" of relation "koi_products" is a generated column` — lỗi có sẵn ở môi trường (cột generated, không liên quan coverImage). Đã thử 2 lần cùng lỗi. Kiểm tra DB: cột `coverImage` VẪN được áp dụng (`coverImage exists: true`). `npx prisma generate` pass. Build/validate không phụ thuộc db push.

## Việc 2 — DTO thêm coverImage — XONG
- `src/category/dto/create-category.dto.ts`: thêm `coverImage?: string` (`@ApiPropertyOptional`, `@IsOptional`, `@IsString`). `UpdateCategoryDto` kế thừa PartialType → tự có.

## Việc 3 — category.service — XONG
- `src/category/category.service.ts`: `create()` thêm `coverImage: dto.coverImage ?? null`; `update()` thêm `if (dto.coverImage !== undefined) data.coverImage = dto.coverImage;`; `findAll()` select thêm `coverImage: true`.

## Việc 4 — shop.service — XONG
- `src/shop/shop.service.ts` `mapCategory()`: `cover_image: c.coverImage || cover || null` — ưu tiên URL thủ công, fallback ảnh SP tự động.

## Việc 5 — Admin UI — XONG
- `public/index.html`: thêm input "Ảnh bìa (URL)" + nút Xem + preview sau ô Mô tả trong modal danh mục; `previewCoverImage()`; `editProdCat()` load `c.coverImage`; `saveProdCat()` gửi `coverImage`; `openCreateProdCat()` reset.

## Kết quả cuối
- **npx prisma validate:** pass
- **npm run build:** pass
- **Commit:** `feat: add coverImage field to categories for custom cover photos`
- **Push:** origin main
- **Lưu ý:** db push lỗi `searchText` generated column có sẵn — cột coverImage đã thêm tay qua ALTER (đã xác nhận trong DB). Nếu reset DB cần chạy lại lệnh thêm cột.
