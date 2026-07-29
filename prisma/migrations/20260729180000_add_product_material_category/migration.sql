-- Danh mục loại da của sản phẩm (single-select).
--
-- Trước đây admin UI đã có picker và gửi `materialCategoryId` trong payload,
-- DTO cũng nhận field này (kèm comment "[Bypass] ... should not be here") chỉ
-- để lọt qua `forbidNonWhitelisted`, nhưng KoiProduct không có cột tương ứng
-- và service bỏ qua field. Kết quả: API trả 200, UI báo "Đã cập nhật", nhưng
-- không có gì được lưu — mở lại thì picker rỗng.
--
-- Nullable + ON DELETE SET NULL: sản phẩm cũ giữ NULL, và xoá một danh mục da
-- không kéo theo xoá sản phẩm.
ALTER TABLE "koi_free_style"."koi_products"
  ADD COLUMN IF NOT EXISTS "materialCategoryId" TEXT;

CREATE INDEX IF NOT EXISTS "koi_products_materialCategoryId_idx"
  ON "koi_free_style"."koi_products"("materialCategoryId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'koi_products_materialCategoryId_fkey'
  ) THEN
    ALTER TABLE "koi_free_style"."koi_products"
      ADD CONSTRAINT "koi_products_materialCategoryId_fkey"
      FOREIGN KEY ("materialCategoryId")
      REFERENCES "koi_free_style"."koi_material_categories"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
