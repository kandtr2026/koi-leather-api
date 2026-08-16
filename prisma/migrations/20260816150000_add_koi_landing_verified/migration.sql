-- Verified pool cua cum Landing-SEO: tu khoa DA DAY len Google Ads, ghi theo
-- tung URL landing. Lan cham diem sau, heoiu doc bang nay va loc tu da day ra
-- khoi danh sach can duyet lai. Chi luu quyet dinh 'pushed' -- tu bi loai
-- KHONG duoc ghi.
--
-- AN TOAN: chi tao bang/index moi, khong cham bang hien co.
--
-- Migration nay duoc CHAY TAY vao DB production TRUOC khi deploy code, nen moi
-- cau lenh deu IF NOT EXISTS de chay lai khong loi (idempotent).
CREATE TABLE IF NOT EXISTS "koi_free_style"."koi_landing_verified" (
  "id"         TEXT NOT NULL,
  "urlLanding" TEXT NOT NULL,
  "tuKhoa"     TEXT NOT NULL,
  -- Phase 1 chi co 'pushed'. Kiem tra o tang DTO/service chu khong dung CHECK
  -- constraint: them quyet dinh moi thi chi phai sua code, khong phai ra thu
  -- tuc migration cho mot bang chi co vai tram dong (cung cach koi_ad_keywords
  -- xu ly loaiKhop).
  "quyetDinh"  TEXT NOT NULL,
  "chienDich"  TEXT,
  -- Upsert khong de truong nay bi de: giu lan dau tu duoc day.
  "taoLuc"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "koi_landing_verified_pkey" PRIMARY KEY ("id")
);

-- Mot tu chi co mot quyet dinh tren moi landing (upsert theo cap nay). Dung
-- UNIQUE INDEX chu khong phai UNIQUE CONSTRAINT -- cung cach cac migration khac
-- trong du an sinh cho @@unique (keyword_pool, keyword_campaign_link).
CREATE UNIQUE INDEX IF NOT EXISTS "koi_landing_verified_urlLanding_tuKhoa_key"
  ON "koi_free_style"."koi_landing_verified" ("urlLanding", "tuKhoa");
