-- Mô tả sản phẩm dạng khối (block) cho trình dựng khối trong admin.
--
-- Bối cảnh: 324/325 mô tả là HTML thô kéo từ WordPress + Flatsome. Đo trên DB
-- thật: 254 bản có <h1> lặp đúng tên sản phẩm (storefront đã tự in <h1> riêng
-- nên khách và Google thấy tiêu đề hai lần), 212 bản còn khung UX Builder,
-- 228 bản có style="" trỏ vào CSS Flatsome không còn tồn tại, 235 bản còn thực
-- thể HTML thô, 196 bản còn nút Facebook cũ, và 38 thẻ <img> trên 14 sản phẩm
-- trỏ về /wp-content đang trả 403 — khách đang thấy ảnh vỡ.
--
-- Vì sao thêm cột mới thay vì sửa "description":
--   koi-storefront render description bằng dangerouslySetInnerHTML, nên cột đó
--   BUỘC phải giữ nguyên là HTML — đổi sang JSON là làm trắng trang sản phẩm.
--   Cột này lưu cấu trúc khối để lần mở sau soạn lại đúng cái người bán đã
--   thấy; HTML trong "description" luôn được in lại TỪ cấu trúc này.
--
-- NULL = mô tả cũ chưa qua trình dựng khối. Không đặt DEFAULT '{}' để phân
-- biệt được "chưa soạn bằng khối bao giờ" với "đã soạn và cố ý để rỗng".

ALTER TABLE "koi_free_style"."koi_products"
  ADD COLUMN IF NOT EXISTS "descriptionBlocks" TEXT;
