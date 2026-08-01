-- Màu sắc sản phẩm cho bộ lọc trang cửa hàng.
--
-- colorFamily: mã nhóm màu chuẩn (DEN, NAU_DAM, VANG_BO...) — dùng để LỌC.
--   Gom mọi sắc độ về ~12 nhóm để thanh lọc không loãng thành hàng chục chấm
--   nâu gần giống nhau.
-- colorHex: mã màu thật của sản phẩm — chỉ để hiện chấm màu trên thẻ.
--
-- Cả hai nullable: sản phẩm cũ giữ NULL cho tới khi được gán màu (script backfill
-- hoặc admin). Index colorFamily để lọc nhanh.
ALTER TABLE "koi_free_style"."koi_products"
  ADD COLUMN IF NOT EXISTS "colorFamily" TEXT;

ALTER TABLE "koi_free_style"."koi_products"
  ADD COLUMN IF NOT EXISTS "colorHex" TEXT;

CREATE INDEX IF NOT EXISTS "koi_products_colorFamily_idx"
  ON "koi_free_style"."koi_products"("colorFamily");
