-- IP va khu vuc cho luot xem — moi tu 2026-08.
--
-- VI SAO THEM: truoc day thiet ke co y khong luu IP tho (chi giu visitorHash
-- bam tu IP + UA + muoi + ngay). Chu shop muon (1) xem IP va khu vuc cua khach
-- tren panel de biet khach o dau, va (2) loai cac IP noi bo (may nha, may di
-- dong cua chu) ra khoi moi tinh toan. Muon loai duoc thi phai biet IP nao la
-- IP noi bo, nen phai luu IP tho o day.
--
-- DICH VUNG LUC GHI, KHONG TRA CUU LUC DOC: khuVuc duoc tinh mot lan khi ghi
-- (xem geo.ts), doc ra doc thang cột — khong co ngoi cua mot lan tra cuu
-- ngoai khi mo panel.
--
-- HANG CU: nhung dong ghi truoc migration nay se co ip = null vi khong con
-- cach nao khôi phuc lai. Panel hien thi ky "Toan bo" truoc ngay nay se thieu
-- cot IP — chap nhan duoc, day la thiet ke cu co y bo IP.
ALTER TABLE "koi_free_style"."koi_page_views"
  ADD COLUMN "ip" TEXT,
  ADD COLUMN "khuVuc" TEXT;

-- Bang hien dien cung luu ip/khuVuc de route realtime tra duoc "ai dang xem,
-- o dau" ngay tren dong "Dang xem ngay luc nay" cua panel.
ALTER TABLE "koi_free_style"."koi_presence"
  ADD COLUMN "ip" TEXT,
  ADD COLUMN "khuVuc" TEXT;

-- Khong can index cho ip: loc IP noi bo lam NGUAY LUC GHI (truoc khi insert),
-- khong co query nao loc theo cot nay.