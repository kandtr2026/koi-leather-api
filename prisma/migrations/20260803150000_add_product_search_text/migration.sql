-- Cột searchText: bản KHÔNG DẤU của tên sản phẩm, để khách gõ không dấu tìm ra hàng.
--
-- VÌ SAO CẦN:
-- Bộ sinh slug cũ làm rụng chữ hoa có dấu (Ố, Đ, Ư… không khớp bảng chữ thường
-- rồi bị bộ lọc [^a-z0-9] xoá hẳn). Đã sửa bộ sinh, nhưng 120/324 slug ĐANG CÓ
-- vẫn sai và không được viết lại — đó là URL công khai Google đã đánh chỉ mục.
-- Hệ quả đo được: 51 sản phẩm (16%) gõ đủ tên không dấu vẫn KHÔNG ra.
--     "Ốp Lưng iPhone Da Cá Sấu…"  slug "p-lung-…"    -> gõ "op lung"      ra 0
--     "Card Holder Ví Đựng Thẻ…"   slug "…vi-ung-…"   -> gõ "vi dung the"  ra 0
-- Cột này lấp đúng chỗ đó mà KHÔNG đụng vào một URL nào.
--
-- VÌ SAO LÀ CỘT SINH (GENERATED … STORED) CHỨ KHÔNG PHẢI CỘT THƯỜNG:
-- product.service.ts có 8+ chỗ ghi sản phẩm (create, update, đổi trạng thái, đổi
-- giá, gán màu, gán loại da…). Cột thường thì mỗi chỗ đó phải tự nhớ tính lại;
-- quên một chỗ là dữ liệu tìm kiếm lệch âm thầm, không ai thấy cho tới khi khách
-- tìm không ra hàng. Để Postgres tự tính thì KHÔNG THỂ lệch, và không cần backfill.
--
-- VÌ SAO KHÔNG DÙNG unaccent():
-- Extension có sẵn trên Supabase nhưng CHƯA cài, mà tài khoản `postgres` ở đây
-- không phải superuser nên không cài được. Ngoài ra unaccent() là STABLE, không
-- phải IMMUTABLE, nên Postgres TỪ CHỐI dùng nó trong cột sinh. translate() thì
-- IMMUTABLE — đó là lý do bảng chữ được viết thẳng vào đây.
--
-- Thứ tự các bước trong biểu thức (đổi thứ tự là sai):
--   1. lower()          — để bảng dịch chỉ cần khoá chữ thường.
--   2. bỏ khoá JSON     — cột `name` là TEXT chứa nguyên văn {"vi":"Ví da…"}.
--                         KHÔNG bỏ bước này thì chữ "vi" của cái khoá nằm luôn
--                         trong searchText và gõ "vi" lại khớp cả 315 dòng —
--                         đúng con bug vừa sửa. Phải bỏ TRƯỚC khi bỏ dấu, lúc
--                         mẫu '"(vi|en)":' còn nguyên vẹn để khớp.
--   3. bỏ { } " \       — rác còn lại của JSON.
--   4. translate()      — bỏ dấu tiếng Việt, gồm cả đ.
--   5. gom ký tự lạ     — mọi thứ không phải a-z0-9 thành một khoảng trắng, nên
--                         "A350-900" thành "a350 900" và gõ kiểu nào cũng khớp.
--
-- Đã diễn thử trên chính dữ liệu production trong transaction rồi rollback:
-- khớp 100% (324/324) với bản bỏ dấu bằng JavaScript ở src/common/tim-san-pham.ts,
-- "vi" 315 -> 78, "op lung" 0 -> 19, "vi dung the" 0 -> 10.

ALTER TABLE "koi_free_style"."koi_products"
  ADD COLUMN IF NOT EXISTS "searchText" TEXT
  GENERATED ALWAYS AS (
    btrim(regexp_replace(
      translate(
        regexp_replace(
          regexp_replace(lower("name"), '"(vi|en)"[[:space:]]*:', ' ', 'g'),
          '[{}"\\]', ' ', 'g'
        ),
        'àáảãạâầấẩẫậăằắẳẵặèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ',
        'aaaaaaaaaaaaaaaaaeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyd'
      ),
      '[^a-z0-9]+', ' ', 'g'
    ))
  ) STORED;

-- Chỉ số GIN pg_trgm: cần cho LIKE '%…%' vì B-tree thường không dùng được khi
-- mẫu mở đầu bằng %. pg_trgm 1.6 đã cài sẵn trong schema public.
-- Với 325 dòng thì seq scan cũng nhanh, nhưng vị từ tìm kiếm AND nhiều token nên
-- mỗi lượt tìm là nhiều lần quét — và số hàng sẽ còn tăng.
CREATE INDEX IF NOT EXISTS "koi_products_search_text_trgm"
  ON "koi_free_style"."koi_products"
  USING GIN ("searchText" public.gin_trgm_ops);
