-- Luot xem trang tren storefront koileather.com.
--
-- Model Visit cu (public schema) chi la MOT bo dem tong cho kitleather.vn:
-- khong ngay, khong trang, khong phan biet nguoi. Khong tra loi duoc cau nao
-- dang gia ("trang nao hut khach", "khach den tu dau"), nen bang nay thay the.
--
-- KHONG luu IP tho. visitorHash = bam(IP + trinh duyet + muoi + ngay):
--   - dem duoc khach rieng biet TRONG NGAY
--   - sang ngay moi cung mot nguoi ra hash khac => khong lan duoc hanh vi dai
--     ngay, khong truy nguoc ra danh tinh
CREATE TABLE IF NOT EXISTS "koi_free_style"."koi_page_views" (
  "id"          TEXT NOT NULL,
  "path"        TEXT NOT NULL,
  "referrer"    TEXT,
  "source"      TEXT NOT NULL,
  "device"      TEXT NOT NULL,
  "visitorHash" TEXT NOT NULL,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "koi_page_views_pkey" PRIMARY KEY ("id")
);

-- createdAt: moi bieu do deu loc theo khoang ngay -> index nay dung nhieu nhat
CREATE INDEX IF NOT EXISTS "koi_page_views_createdAt_idx"
  ON "koi_free_style"."koi_page_views"("createdAt");

CREATE INDEX IF NOT EXISTS "koi_page_views_path_idx"
  ON "koi_free_style"."koi_page_views"("path");

CREATE INDEX IF NOT EXISTS "koi_page_views_source_idx"
  ON "koi_free_style"."koi_page_views"("source");

-- Dem khach rieng biet = COUNT(DISTINCT "visitorHash")
CREATE INDEX IF NOT EXISTS "koi_page_views_visitorHash_idx"
  ON "koi_free_style"."koi_page_views"("visitorHash");
