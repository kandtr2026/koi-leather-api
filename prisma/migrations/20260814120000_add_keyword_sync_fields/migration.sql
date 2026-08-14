-- Chin cot dong bo Google Ads cho so tay tu khoa: bien bang koi_ad_keywords
-- thanh GOC cau hinh day duoc xuong Google Ads (Phase 0 cua feature "heoiu lam
-- goc -> ghi xuong Ads").
--
-- AN TOAN DU LIEU: bang nay dang phuc vu CRUD so tay chay that. Moi cot them
-- deu nullable hoac co DEFAULT nen migration khong lam vo dong cu -- dong cu tu
-- dong nhan default (loai='keyword', trangThaiDongBo='chua_day', nguon='tool').
-- Postgres 11+ them NOT NULL DEFAULT hang so la thao tac metadata, khong rewrite
-- ca bang. Khong co thao tac pha du lieu.

ALTER TABLE "koi_free_style"."koi_ad_keywords"
  -- keyword | negative. TACH khoi loaiKhop (truoc day loaiKhop tron ca negative).
  ADD COLUMN IF NOT EXISTS "loai"            TEXT NOT NULL DEFAULT 'keyword',
  -- Ad group / campaign dich (id so dang chuoi). Nullable: dong so tay cu chua gan dich.
  ADD COLUMN IF NOT EXISTS "adGroupId"       TEXT,
  ADD COLUMN IF NOT EXISTS "campaignId"      TEXT,
  -- Chi cho negative: adgroup | campaign | shared. Quyet dinh service mutate nao.
  ADD COLUMN IF NOT EXISTS "phamViNegative"  TEXT,
  -- chua_day | dang_day | da_day | loi. dang_day la khoa lac quan chong bam don.
  ADD COLUMN IF NOT EXISTS "trangThaiDongBo" TEXT NOT NULL DEFAULT 'chua_day',
  -- Thong diep loi day gan nhat (tooltip tren panel). Null khi on.
  ADD COLUMN IF NOT EXISTS "loiDongBo"       TEXT,
  -- Resource name ben Ads (customers/123/adGroupCriteria/456~789). Khoa doi chieu.
  ADD COLUMN IF NOT EXISTS "adsResourceName" TEXT,
  -- Lan day/khop thanh cong gan nhat.
  ADD COLUMN IF NOT EXISTS "dongBoLuc"       TIMESTAMP(3),
  -- tool = tao trong heoiu | imported = hut tu Ads o Phase 0.
  ADD COLUMN IF NOT EXISTS "nguon"           TEXT NOT NULL DEFAULT 'tool';

-- BACKFILL: dong cu de loaiKhop='negative' la "tu khoa loai tru" theo nghia cu
-- (khi loaiKhop con tron ca negative). Tach nghia sang cot moi:
--   loai            -> 'negative'
--   phamViNegative  -> 'campaign'  (mac dinh da chot §7: negative muc campaign)
--   loaiKhop        -> NULL        ('negative' khong con la match type hop le;
--                                   khong suy ra duoc match type negative cu the)
UPDATE "koi_free_style"."koi_ad_keywords"
SET "loai" = 'negative',
    "phamViNegative" = 'campaign',
    "loaiKhop" = NULL
WHERE "loaiKhop" = 'negative';

-- Nut "day ca lo" quet nhanh dong chua_day|loi theo cot nay.
CREATE INDEX IF NOT EXISTS "koi_ad_keywords_trangThaiDongBo_idx"
  ON "koi_free_style"."koi_ad_keywords"("trangThaiDongBo");

-- Import idempotent: chay lai nhieu lan khong de trung. adsResourceName nullable
-- -> Postgres cho nhieu NULL trong unique index, nen dong so tay tu tao (nguon
-- 'tool', resource name NULL) khong dung rang buoc nay.
CREATE UNIQUE INDEX IF NOT EXISTS "koi_ad_keywords_adsResourceName_key"
  ON "koi_free_style"."koi_ad_keywords"("adsResourceName");
