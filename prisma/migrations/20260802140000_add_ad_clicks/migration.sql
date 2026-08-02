-- Mot cu bam quang cao Google, noi voi cuoc tro chuyen Zalo ma no de ra.
--
-- VI SAO CAN BANG NAY:
--
--  Google Ads chi hoc duoc cach tieu tien cho khon neu ta noi lai cho no biet
--  cu bam nao ra DON THAT. Muon noi lai thi phai giu duoc `gclid` -- ma Google
--  gan vao URL luc khach bam quang cao. Site nay khong ban online, moi don
--  chot trong hop thoai Zalo, nen khong co trang "cam on" nao de tu noi.
--  Bang nay la soi day noi thu cong do.
--
--  CACH CHAY: khach vao tu quang cao -> luu gclid, sinh mot MA NGAN -> ma do
--  duoc nhet vao tin nhan Zalo soan san -> chu shop thay ma trong hop thoai ->
--  chot don thi vao admin go ma, dien so tien -> xuat CSV tai len Google Ads.
--
--  HAN 90 NGAY: Google chi nhan doanh so trong vong 90 ngay ke tu cu bam. Qua
--  han thi dong do thanh rac, xem cot "clickedAt".
--
-- token lam khoa chinh: moi tra cuu deu di tu ma ngan chu shop doc duoc trong
-- hop thoai Zalo, khong bao gio tu id noi bo.
CREATE TABLE IF NOT EXISTS "koi_free_style"."koi_ad_clicks" (
  "token"       TEXT NOT NULL,
  "gclid"       TEXT,
  "gbraid"      TEXT,
  "wbraid"      TEXT,
  "landingPath" TEXT,
  "productName" TEXT,
  "channel"     TEXT,
  "clickedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "contactedAt" TIMESTAMP(3),
  "convertedAt" TIMESTAMP(3),
  -- BIGINT cho khop nep gia cua bang products, va vi tien Viet so to: kieu
  -- 32-bit chi toi ~2,1 ti -- mot don buon la tran.
  "value"       BIGINT,
  "note"        TEXT,
  "exportedAt"  TIMESTAMP(3),

  CONSTRAINT "koi_ad_clicks_pkey" PRIMARY KEY ("token")
);

-- Bang xep theo thu tu thoi gian o admin, va ham don rac xoa theo cot nay.
CREATE INDEX IF NOT EXISTS "koi_ad_clicks_clickedAt_idx"
  ON "koi_free_style"."koi_ad_clicks"("clickedAt");

-- Loc nhanh "da chot nhung chua xuat" -- truy van chinh cua nut xuat CSV.
CREATE INDEX IF NOT EXISTS "koi_ad_clicks_convertedAt_idx"
  ON "koi_free_style"."koi_ad_clicks"("convertedAt");
