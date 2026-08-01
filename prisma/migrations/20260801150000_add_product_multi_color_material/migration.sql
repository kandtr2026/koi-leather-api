-- Nhiều màu + nhiều loại da cho một sản phẩm.
--
-- Trước: mỗi SP chỉ giữ ĐÚNG MỘT colorFamily/colorHex và MỘT materialCategoryId
-- ngay trên koi_products. Thực tế hàng phối hai tông (thân Epsom đen, viền vàng
-- bò) không biểu diễn được, và trang khách lọc màu bị sót.
--
-- Sau: hai bảng nối kiểu nhiều–nhiều, cùng khuôn với koi_product_categories đã
-- chạy sẵn. Các cột cũ trên koi_products GIỮ NGUYÊN làm "màu chính"/"loại da
-- chính" — vừa tương thích ngược cho code chưa kịp đọc bảng nối, vừa cho
-- storefront lấy chấm màu đầu tiên mà không cần join.

CREATE TABLE IF NOT EXISTS "koi_free_style"."koi_product_colors" (
  "productId"   TEXT NOT NULL,
  "colorFamily" TEXT NOT NULL,
  "colorHex"    TEXT,
  "sortOrder"   INTEGER NOT NULL DEFAULT 0,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "koi_product_colors_pkey" PRIMARY KEY ("productId", "colorFamily")
);

CREATE TABLE IF NOT EXISTS "koi_free_style"."koi_product_material_categories" (
  "productId"          TEXT NOT NULL,
  "materialCategoryId" TEXT NOT NULL,
  "sortOrder"          INTEGER NOT NULL DEFAULT 0,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "koi_product_material_categories_pkey" PRIMARY KEY ("productId", "materialCategoryId")
);

CREATE INDEX IF NOT EXISTS "koi_product_colors_colorFamily_idx"
  ON "koi_free_style"."koi_product_colors"("colorFamily");

CREATE INDEX IF NOT EXISTS "koi_product_material_categories_materialCategoryId_idx"
  ON "koi_free_style"."koi_product_material_categories"("materialCategoryId");

-- ON DELETE CASCADE: xoá sản phẩm thì liên kết đi theo, không để lại rác.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'koi_product_colors_productId_fkey'
  ) THEN
    ALTER TABLE "koi_free_style"."koi_product_colors"
      ADD CONSTRAINT "koi_product_colors_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "koi_free_style"."koi_products"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'koi_product_material_categories_productId_fkey'
  ) THEN
    ALTER TABLE "koi_free_style"."koi_product_material_categories"
      ADD CONSTRAINT "koi_product_material_categories_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "koi_free_style"."koi_products"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'koi_product_material_categories_materialCategoryId_fkey'
  ) THEN
    ALTER TABLE "koi_free_style"."koi_product_material_categories"
      ADD CONSTRAINT "koi_product_material_categories_materialCategoryId_fkey"
      FOREIGN KEY ("materialCategoryId") REFERENCES "koi_free_style"."koi_material_categories"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Backfill: chuyển màu / loại da đang có sang bảng nối làm mục thứ nhất.
-- ON CONFLICT DO NOTHING để chạy lại migration không nhân đôi dữ liệu.
INSERT INTO "koi_free_style"."koi_product_colors" ("productId", "colorFamily", "colorHex", "sortOrder")
SELECT "id", "colorFamily", "colorHex", 0
FROM "koi_free_style"."koi_products"
WHERE "colorFamily" IS NOT NULL
ON CONFLICT ("productId", "colorFamily") DO NOTHING;

INSERT INTO "koi_free_style"."koi_product_material_categories" ("productId", "materialCategoryId", "sortOrder")
SELECT "id", "materialCategoryId", 0
FROM "koi_free_style"."koi_products"
WHERE "materialCategoryId" IS NOT NULL
ON CONFLICT ("productId", "materialCategoryId") DO NOTHING;
