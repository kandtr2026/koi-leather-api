/**
 * Additive push: tạo 3 bảng Whitelist SEO trong koi_free_style mà KHÔNG đụng
 * schema cũ (db push toàn bộ vấp drift có sẵn: koi_products.searchText là
 * generated column phía prod, schema.prisma khai thường — ngoài phạm vi).
 *
 * DDL khớp từng byte với model :1004-1056 — IF NOT EXISTS nên chạy lại an toàn.
 *
 *   node prisma/_add-whitelist-seo.mjs            # dry run, ROLLBACK
 *   node prisma/_add-whitelist-seo.mjs --apply    # COMMIT
 */
import { readFileSync } from 'node:fs';
import pg from 'pg';

const APPLY = process.argv.includes('--apply');

const conn = readFileSync(new URL('../.env', import.meta.url), 'utf8')
  .split(/\r?\n/)
  .find((l) => l.startsWith('DATABASE_URL='))
  .replace(/^DATABASE_URL="?/, '')
  .replace(/"$/, '')
  .replace(/[?&]sslmode=[^&]*/, '');

const DDL = `
CREATE TABLE IF NOT EXISTS koi_free_style.koi_keyword_metrics (
  id text NOT NULL,
  "tuKhoa" text NOT NULL,
  "chienDich" text,
  ngay timestamptz(3) NOT NULL,
  "hienThi" integer NOT NULL,
  "cuBam" integer NOT NULL,
  "chiPhi" double precision NOT NULL,
  ctr double precision,
  "cpcTrungBinh" double precision,
  "cuChuyenDoi" integer,
  CONSTRAINT koi_keyword_metrics_pkey PRIMARY KEY (id),
  CONSTRAINT koi_keyword_metrics_tuKhoa_chienDich_ngay_key UNIQUE ("tuKhoa", "chienDich", ngay)
);
CREATE INDEX IF NOT EXISTS koi_keyword_metrics_ngay_idx ON koi_free_style.koi_keyword_metrics (ngay);
CREATE INDEX IF NOT EXISTS koi_keyword_metrics_tuKhoa_idx ON koi_free_style.koi_keyword_metrics ("tuKhoa");

CREATE TABLE IF NOT EXISTS koi_free_style.koi_keyword_whitelist (
  id text NOT NULL,
  "tuKhoa" text NOT NULL,
  "chienDich" text,
  "trangThai" text NOT NULL DEFAULT 'pending',
  "lyDo" text,
  diem integer,
  "nguonReview" text NOT NULL DEFAULT 'ai',
  model text,
  "ngayReview" timestamptz(3) NOT NULL DEFAULT now(),
  CONSTRAINT koi_keyword_whitelist_pkey PRIMARY KEY (id),
  CONSTRAINT koi_keyword_whitelist_tuKhoa_key UNIQUE ("tuKhoa")
);
CREATE INDEX IF NOT EXISTS koi_keyword_whitelist_trangThai_idx ON koi_free_style.koi_keyword_whitelist ("trangThai");

CREATE TABLE IF NOT EXISTS koi_free_style.koi_keyword_review_logs (
  id text NOT NULL,
  "tuKhoa" text NOT NULL,
  "quyetDinh" text NOT NULL,
  "lyDo" text,
  diem integer,
  model text,
  "metricId" text,
  "ngayReview" timestamptz(3) NOT NULL DEFAULT now(),
  CONSTRAINT koi_keyword_review_logs_pkey PRIMARY KEY (id)
);
CREATE INDEX IF NOT EXISTS koi_keyword_review_logs_tuKhoa_ngayReview_idx
  ON koi_free_style.koi_keyword_review_logs ("tuKhoa", "ngayReview");
`;

const client = new pg.Client({ connectionString: conn });

try {
  await client.connect();
  await client.query('BEGIN');
  try {
    const r = await client.query(DDL);
    console.log(`DDL ok: ${r.rowCount} row(s) affected`);
    if (APPLY) {
      await client.query('COMMIT');
      console.log('COMMIT — đã tạo 3 bảng whitelist SEO là thật');
    } else {
      await client.query('ROLLBACK');
      console.log('ROLLBACK — dry run, chưa tạo gì. Dùng --apply để ghi thật.');
    }
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  }
} finally {
  await client.end();
}