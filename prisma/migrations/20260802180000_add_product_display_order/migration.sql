-- Thứ tự hiện sản phẩm ở cửa hàng.
--
-- Danh sách /cua-hang đang xếp theo "basePrice" giảm dần, nên 24 ô đầu toàn
-- hàng 19–79 triệu (trung bình 30,7tr) trong khi trung vị cả cửa hàng chỉ 4tr.
-- Khách xem trang 1 rồi kết luận shop chỉ bán đồ đắt đỏ.
--
-- Hai cột thay thế:
--   isFeatured  — hàng "đinh", người bán tự tick trong admin, luôn nằm đầu.
--   displayRank — điểm xếp sẵn cho phần còn lại, do
--                 scripts/compute-display-rank.js tính: ưu tiên món được đầu
--                 tư nhiều (nhiều ảnh, nhiều biến thể, đã gán màu) rồi cài
--                 răng lược 3 dải giá để trang nào cũng có đủ mức giá.
--                 Tính sẵn thành số vì bước cài răng lược không diễn đạt được
--                 bằng ORDER BY, còn xếp trong RAM thì phân trang sẽ nhảy.
--
-- Mặc định displayRank = 999999: sản phẩm mới thêm mà chưa chạy lại script thì
-- rơi xuống cuối chứ không chen ngang lên đầu.

ALTER TABLE "koi_free_style"."koi_products"
  ADD COLUMN IF NOT EXISTS "isFeatured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "displayRank" INTEGER NOT NULL DEFAULT 999999;

-- Chỉ mục phủ đúng thứ tự ORDER BY của danh sách cửa hàng.
CREATE INDEX IF NOT EXISTS "koi_products_isFeatured_displayRank_idx"
  ON "koi_free_style"."koi_products" ("isFeatured", "displayRank");
