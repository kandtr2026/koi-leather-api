# Cover ảnh danh mục — Thêm trường `coverImage` cho KoiCategory

**Ngày:** 2026-09-02  
**Giao:** OpenCode  
**Mục tiêu:** Chủ shop paste URL ảnh cover cho từng danh mục qua admin, thay vì hệ thống tự lấy ảnh SP đầu tiên.

---

## Sự thật đã đo

- `KoiCategory` (schema.prisma dòng 219-239) KHÔNG có trường ảnh.
- `shop.service.ts` dòng 302-339: `categoriesWithCover()` query sản phẩm đầu tiên (isFeatured desc, displayRank asc) rồi lấy `thumbnailUrl || url` của ảnh đầu → `coverByCat` map → trả `cover_image` trong response.
- `mapCategory()` dòng 228-243: nhận `cover` từ param, trả `cover_image: cover ?? null`.
- Admin category (CRUD): `src/category/category.service.ts` + `category.controller.ts` — endpoint `PATCH /categories/:id` nhận `UpdateCategoryDto` (PartialType of CreateCategoryDto). Chưa có field `coverImage`.
- Admin UI: `public/index.html` dòng 4545-4660 — modal chỉnh danh mục có `pcName`, `pcDesc`, schema builder. Chưa có input ảnh.
- Storefront: `src/lib/types.ts` dòng 15 `cover_image?: string | null`; trang chủ VI `(vi)/page.tsx` dòng 197 `imageUrl(c.cover_image)`; trang EN shop `(en)/en/shop/[slug]/page.tsx` dòng 35 `imageUrl(cover.storage_path)` (khác field — không dùng `cover_image`).

---

## Việc 1 — Prisma schema: thêm trường `coverImage`

**File:** `prisma/schema.prisma`  
**Dòng:** 225 (sau `specsSchema`)  
**Thêm:**
```prisma
  coverImage      String?
```

Sau đó chạy:
```bash
npx prisma db push --accept-data-loss
```
(hoặc `npx prisma migrate dev --name add-category-cover-image` nếu muốn migration file)

**Test:** `npx prisma validate` pass.

---

## Việc 2 — DTO: thêm `coverImage` vào CreateCategoryDto

**File:** `src/category/dto/create-category.dto.ts`  
**Thêm sau `metaDescription` (dòng ~50):**
```typescript
  @ApiPropertyOptional({ description: 'URL ảnh bìa danh mục (paste từ Supabase/Cloudinary)' })
  @IsOptional()
  @IsString()
  coverImage?: string;
```

`UpdateCategoryDto` extends `PartialType(CreateCategoryDto)` → tự có.

---

## Việc 3 — Service: lưu `coverImage` khi create/update

**File:** `src/category/category.service.ts`

### 3a. `create()` (dòng ~99):
Trong object `data` truyền cho `prisma.koiCategory.create`, thêm:
```typescript
        coverImage: dto.coverImage ?? null,
```

### 3b. `update()` (dòng ~126):
Sau dòng `if (dto.isActive !== undefined) data.isActive = dto.isActive;` (dòng ~154), thêm:
```typescript
    if (dto.coverImage !== undefined) data.coverImage = dto.coverImage;
```

### 3c. `findAll()` (dòng ~17):
Trong `select`, thêm `coverImage: true` để admin list thấy được.

---

## Việc 4 — Shop service: ưu tiên `coverImage` thủ công, fallback auto

**File:** `src/shop/shop.service.ts`

### 4a. `categoriesWithCover()` (dòng ~302):
Trong `prisma.koiCategory.findMany`, thêm vào `select` (nếu dùng select) hoặc nó đã `include` rồi thì Prisma tự trả field mới.

Kiểm tra: nếu dùng `findMany` không có `select` → Prisma trả hết field → OK, không cần sửa query.

### 4b. `mapCategory()` (dòng ~228):
Thay dòng:
```typescript
      cover_image: cover ?? null,
```
thành:
```typescript
      cover_image: c.coverImage || cover || null,
```

Tức: ưu tiên URL thủ công từ DB (`c.coverImage`), fallback về ảnh SP tự động (`cover` param).

**⚠️ CHÚ Ý:** Phải truyền `c` (object category gốc) vào `mapCategory`. Hiện tại signature là `mapCategory(c: any, cover?: string | null)` — `c` đã có rồi, chỉ cần dùng `c.coverImage`.

---

## Việc 5 — Admin UI: thêm input ảnh bìa vào modal danh mục

**File:** `public/index.html`

### 5a. Thêm input vào modal (sau ô Mô tả `pcDesc`):
```html
<div class="mb-4">
  <label class="block text-xs font-semibold text-gray-600 mb-1">Ảnh bìa (URL)</label>
  <div class="flex gap-2">
    <input id="pcCoverImage" type="url" placeholder="Paste URL ảnh từ Supabase hoặc Cloudinary"
      class="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-amber-500 focus:border-amber-500">
    <button type="button" onclick="previewCoverImage()" class="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-xs text-gray-600">Xem</button>
  </div>
  <div id="pcCoverPreview" class="mt-2 hidden">
    <img id="pcCoverImg" src="" alt="Preview" class="w-32 h-20 object-cover rounded border border-gray-200">
  </div>
</div>
```

### 5b. Hàm preview:
```javascript
function previewCoverImage() {
  const url = document.getElementById('pcCoverImage').value.trim();
  const preview = document.getElementById('pcCoverPreview');
  const img = document.getElementById('pcCoverImg');
  if (url) { img.src = url; preview.classList.remove('hidden'); }
  else { preview.classList.add('hidden'); }
}
```

### 5c. `editProdCat()` — load giá trị:
Sau `document.getElementById('pcDesc').value = c.description || '';` thêm:
```javascript
  document.getElementById('pcCoverImage').value = c.coverImage || '';
  document.getElementById('pcCoverPreview').classList.add('hidden');
```

### 5d. `saveProdCat()` — gửi giá trị:
Trong object `body`, thêm:
```javascript
    coverImage: document.getElementById('pcCoverImage').value.trim() || null,
```

### 5e. Bảng danh sách (tuỳ chọn, nhỏ): thêm thumbnail nhỏ 32×32 bên cạnh tên danh mục trong `renderProdCats()`. Nếu phức tạp quá thì BỎ QUA — chỉ cần modal là đủ.

---

## Không cần sửa storefront

Storefront đọc `cover_image` từ API response → đã hoạt động sẵn vì `mapCategory` trả field đó. Không cần đổi code frontend.

---

## Quy trình

1. `git checkout -b feat/category-cover-image`
2. Làm Việc 1 → 5 tuần tự
3. `npx prisma validate` + `npx prisma generate`
4. Chạy `npm run build` (tsc) — phải pass
5. Test thủ công: start server → vào admin → sửa 1 danh mục → paste URL → save → GET /categories xem `cover_image` trả URL mới
6. Commit: `feat: add coverImage field to categories for custom cover photos`
7. Push + deploy

---

## Nhật ký

Ghi vào `KoiCoverImage-NhatKy.md` khi bắt đầu mỗi việc, đặc biệt ghi rõ nếu KẸT (lỗi nguyên văn + đã thử gì + câu hỏi). Kẹt 2 lần thì ghi rồi chuyển việc kế.

---

## URL cover đã chọn sẵn (A Khoa paste sau khi feature lên prod)

| Danh mục | URL |
|---|---|
| Túi nữ | `https://stdkeltylgakfvqejugz.supabase.co/storage/v1/object/public/products/1787908384380.webp` |
| Ví nam | `https://stdkeltylgakfvqejugz.supabase.co/storage/v1/object/public/products/1786441990579.webp` |
| Dây đồng hồ | `https://stdkeltylgakfvqejugz.supabase.co/storage/v1/object/public/products/df9f98c119b7c8e991a6.webp` |
