-- Mot cu bam nut lien he -- Zalo, Messenger, hay Goi dien -- cua BAT KY khach nao.
--
-- VI SAO CAN BANG NAY:
--
--  Truoc bang nay, cu bam nut lien he chi duoc ghi o koi_ad_clicks.contactedAt,
--  ma dong do chi ton tai khi khach den tu quang cao Google (phai co gclid).
--  Khach vao tu Google tu nhien, tu Facebook, hay go thang dia chi roi bam Zalo
--  thi KHONG CO DONG NAO O DAU CA -- ma do la phan dong khach. So thuc do duoc
--  luc lam bang nay: 212 dong trong koi_ad_clicks, tuc chi dem duoc khach quang
--  cao, con lai mu hoan toan.
--
--  Bang nay ghi MOI cu bam, kem NGUON dan khach vao. Do la thu tra loi duoc cau
--  "khach nhan tin cho minh den tu dau" -- koi_ad_clicks khong luu nguon, vi voi
--  no moi dong deu den tu quang cao.
--
-- VI SAO KHONG NHOI CO VAO koi_page_views: cung ly do koi_presence phai tach ra.
-- Nhoi mot loai dong khac vao bang luot xem la moi con so cu -- luot xem,
-- trang/khach, bieu do theo ngay -- phong len va khong con tin duoc.
--
-- MOI CU BAM MOT DONG, KHONG GOP. Khach bam Zalo o dau trang roi cuon xuong bam
-- tiep la hai dong, vi ca hai deu la cu bam that. Nen so dong la SO LAN lien he,
-- khong phai so nguoi -- muon so nguoi thi dem visitorHash rieng biet.
CREATE TABLE IF NOT EXISTS "koi_free_style"."koi_contact_clicks" (
  "id"          TEXT NOT NULL,
  -- zalo | messenger | phone. Chi nhan dung ba gia tri nay -- duong ghi la duong
  -- cong khai nen phai loc o tang ung dung, khong thi ai gui gi vao cung nam day.
  "channel"     TEXT NOT NULL,
  "path"        TEXT NOT NULL,
  -- Gom nhom bang CHINH ham nguon() cua luot xem: direct | google | facebook |
  -- zalo | instagram | tiktok | search_khac | internal | other.
  "source"      TEXT NOT NULL,
  -- Referrer tho, giu lai de con truy duoc khi nhom o tren gom vao 'other'.
  "referrer"    TEXT,
  "device"      TEXT NOT NULL,
  -- Bam an danh, doi moi ngay. Khong luu IP tho o bat cu dau.
  "visitorHash" TEXT NOT NULL,
  "productName" TEXT,
  -- Ma quang cao neu co. Soi day doi chieu voi koi_ad_clicks, KHONG phai khoa
  -- ngoai: donRac() ben ads xoa dong chua chot sau 120 ngay, co khoa ngoai la no
  -- chan hoac xoa lay sang bang nay.
  "adToken"     TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "koi_contact_clicks_pkey" PRIMARY KEY ("id")
);

-- Cat ky theo thoi gian -- truy van chinh cua panel.
CREATE INDEX IF NOT EXISTS "koi_contact_clicks_createdAt_idx"
  ON "koi_free_style"."koi_contact_clicks"("createdAt");

-- Tach the theo kenh (Zalo / Messenger / Goi dien).
CREATE INDEX IF NOT EXISTS "koi_contact_clicks_channel_idx"
  ON "koi_free_style"."koi_contact_clicks"("channel");

-- Tach theo nguon dan khach vao.
CREATE INDEX IF NOT EXISTS "koi_contact_clicks_source_idx"
  ON "koi_free_style"."koi_contact_clicks"("source");
