-- Ai dang o tren web NGAY LUC NAY, va dang dung o trang nao.
--
-- Vi sao bang rieng, khong suy ra tu koi_page_views:
--
--  1. Biet khach CON dang xem hay da dong tab thi phai co nhip tim (heartbeat)
--     gui deu dan. Nhoi nhip tim vao koi_page_views thi mot khach ngoi doc 10
--     phut hoa thanh 10 "luot xem" -- moi con so cu (luot xem, trang/khach,
--     bieu do theo ngay) phong len va khong con tin duoc. Tach bang thi nhip
--     tim chi ghi de MOT dong, bang luot xem sach nguyen.
--
--  2. Mot dong cho moi khach, ghi de lien tuc => bang luon nho (bang so khach
--     trong ngay), truy van "dang online" chi quet vai chuc dong thay vi loc
--     ca bang luot xem dang lon dan theo thoi gian.
--
-- visitorHash lam khoa chinh: cung mot khach chi giu dung mot dong.
CREATE TABLE IF NOT EXISTS "koi_free_style"."koi_presence" (
  "visitorHash" TEXT NOT NULL,
  "path"        TEXT NOT NULL,
  "source"      TEXT NOT NULL,
  "device"      TEXT NOT NULL,
  "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastSeenAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "koi_presence_pkey" PRIMARY KEY ("visitorHash")
);

-- Moi truy van realtime deu loc "lastSeenAt >= now() - 5 phut", va ham don rac
-- cung xoa theo cot nay -> index nay dung cho ca hai.
CREATE INDEX IF NOT EXISTS "koi_presence_lastSeenAt_idx"
  ON "koi_free_style"."koi_presence"("lastSeenAt");
