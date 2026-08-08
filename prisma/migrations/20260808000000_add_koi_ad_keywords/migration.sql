-- So tay tu khoa quang cao: danh sach tu khoa dang chay, kem ghi chu toi uu.
--
-- VI SAO LA SO TAY CHU KHONG PHAI DONG BO GOOGLE ADS:
--
--  Du an chua co Google Ads API client (khong co OAuth refresh token, khong co
--  developer token). Nen bang nay KHONG dong bo voi tai khoan Google Ads: them
--  hay xoa o day khong lam tu khoa that chay hay dung. No la cho ghi lai de con
--  nho da thu gi, tu khoa nao dat, tu nao ra don -- viec truoc day nam trong
--  dau chu shop hoac mot file Excel roi.
--
--  Man hinh admin co canh bao mau ho phach noi dung y nay, de nguoi dung khong
--  tuong minh vua tat mot tu khoa dang dot tien.
--
-- VI SAO KHONG CO UNIQUE INDEX (tuKhoa, chienDich, loaiKhop):
--
--  Trong SQL moi NULL la mot gia tri rieng, NULL != NULL. Ma chienDich va
--  loaiKhop deu duoc phep NULL (chi mot chien dich thi khong can dien ten).
--  Nen unique index nhieu cot o day se cho phep "vi da"/NULL/NULL lot vao ba
--  bon lan ma khong bao trung -- dung cai truong hop pho bien nhat. Viec chan
--  trung nam o AdsService.themTuKhoa() bang findFirst voi null tuong minh.
CREATE TABLE IF NOT EXISTS "koi_free_style"."koi_ad_keywords" (
  "id"         TEXT NOT NULL,
  "tuKhoa"     TEXT NOT NULL,
  "chienDich"  TEXT,
  -- broad | phrase | exact | negative. Kiem tra o tang service chu khong dung
  -- CHECK constraint: them mot loai khop moi thi chi phai sua code, khong phai
  -- ra thu tuc migration cho mot bang chi co vai chuc dong.
  "loaiKhop"   TEXT,
  "trangThai"  TEXT NOT NULL DEFAULT 'active',
  "ghiChu"     TEXT,
  "taoLuc"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "capNhatLuc" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "koi_ad_keywords_pkey" PRIMARY KEY ("id")
);

-- Bang o admin xep active len truoc, paused xuong duoi va lam mo di.
CREATE INDEX IF NOT EXISTS "koi_ad_keywords_trangThai_idx"
  ON "koi_free_style"."koi_ad_keywords"("trangThai");
