-- Ban chu GOC cua tung truong, chup lai NGAY TRUOC khi AI ghi de.
--
-- VI SAO BANG NAY PHAI CO TRUOC KHI CONG CU AI CHAY:
--
-- Cong cu sua bang AI ghi thang vao noi dung DANG CHAY tren site — bai viet co
-- organic traffic tu Google, mo ta san pham khach dang doc. Mo hinh ngon ngu
-- khong dam bao gi ve dau ra: no co the bo mat doan, doi so do, viet lai thanh
-- giong khac, hoac cat mot bai 2000 chu thanh 300. Khong co bang nay thi chu goc
-- mat VINH VIEN ngay lan bam dau tien — UPDATE da ghi de, Postgres khong giu ban
-- truoc, va site khong co ban sao luu theo tung ban ghi.
--
-- MOI DONG LA MOT TRUONG. Sua mot bai dung 3 truong thi sinh 3 dong cung
-- "batch"; hoan tac tra lai ca nhom, khong le tung truong (tra lai nua voi thi
-- ban ghi thanh khong khop nhau).
--
-- VI SAO recordId LA TEXT CHU KHONG PHAI BIGINT HAY UUID:
-- Noi dung site nam o hai the he bang khac nhau. Bang schema "public" (ban clone
-- WordPress: posts, pages, tags, categories) dung khoa BIGINT. Bang
-- "koi_free_style" (koi_products, koi_categories) dung UUID. Mot cot chua duoc
-- ca hai thi chi co TEXT. Ep ve BIGINT la khong luu duoc san pham; ep ve UUID la
-- khong luu duoc bai viet.
--
-- VI SAO before/after CHO PHEP NULL:
-- Truong dang trong trong DB la NULL, khong phai chuoi rong. Hoan tac phai tra
-- lai dung NULL — ghi "" vao meta_description thi the meta in ra rong tuech thay
-- vi khong in, va do la hai thu khac nhau voi Google.
CREATE TABLE IF NOT EXISTS "koi_free_style"."koi_content_revisions" (
  "id"         TEXT NOT NULL,
  "batch"      TEXT NOT NULL,
  "kind"       TEXT NOT NULL,
  "recordId"   TEXT NOT NULL,
  "path"       TEXT,
  "field"      TEXT NOT NULL,
  "before"     TEXT,
  "after"      TEXT,
  "prompt"     TEXT,
  "model"      TEXT,
  "actor"      TEXT,
  "revertedAt" TIMESTAMP(3),
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "koi_content_revisions_pkey" PRIMARY KEY ("id")
);

-- Danh sach "sua gan day" o admin xep theo cot nay.
CREATE INDEX IF NOT EXISTS "koi_content_revisions_createdAt_idx"
  ON "koi_free_style"."koi_content_revisions"("createdAt");

-- Tra moi lan sua cua MOT ban ghi — dung khi canh bao "trang nay da bi AI sua
-- 3 lan truoc do", va khi hien lich su cua rieng mot bai.
CREATE INDEX IF NOT EXISTS "koi_content_revisions_kind_recordId_idx"
  ON "koi_free_style"."koi_content_revisions"("kind", "recordId");

-- Hoan tac lay tron mot nhom.
CREATE INDEX IF NOT EXISTS "koi_content_revisions_batch_idx"
  ON "koi_free_style"."koi_content_revisions"("batch");
