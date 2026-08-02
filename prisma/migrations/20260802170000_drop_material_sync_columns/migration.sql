-- Gỡ 2 cột đồng bộ khỏi koi_raw_materials.
--
-- Hai cột này sinh ra cho module inventory-sync đẩy nguyên liệu qua
-- kitleather.vn. Module đó đã bị gỡ (kitleather là dự án riêng, repo và
-- database riêng), nên không còn gì đọc hay ghi hai cột nữa: syncStatus chỉ
-- được set lúc tạo rồi nằm im, lastSyncedAt chưa bao giờ được ghi.
--
-- Bảng đang 0 dòng nên không mất dữ liệu nào.

ALTER TABLE "koi_free_style"."koi_raw_materials"
  DROP COLUMN IF EXISTS "syncStatus",
  DROP COLUMN IF EXISTS "lastSyncedAt";
