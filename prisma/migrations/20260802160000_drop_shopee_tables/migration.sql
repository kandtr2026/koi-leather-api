-- Gỡ 4 bảng Shopee khỏi database koileather.
--
-- Shopee là của dự án kitleather.com (repo da-nguyen-shop, database riêng).
-- Nó lọt vào đây ngày 29/07 do nhầm repo; module src/shopee-ads đã bị xoá ngay
-- hôm đó, chỉ còn lại bảng rỗng. Đã kiểm trước khi xoá: cả 4 bảng đều 0 dòng,
-- không khoá ngoại nào trỏ tới, không view nào đọc.
--
-- Hai migration tạo bảng (20260729130000, 20260729140000) được giữ nguyên —
-- xoá file đã apply sẽ làm lệch lịch sử migration như lần trước.

DROP TABLE IF EXISTS "koi_free_style"."koi_shopee_ads_daily";
DROP TABLE IF EXISTS "koi_free_style"."koi_shopee_ads_shop_daily";
DROP TABLE IF EXISTS "koi_free_style"."koi_shopee_ads_sync_state";
DROP TABLE IF EXISTS "koi_free_style"."koi_shopee_credential";
