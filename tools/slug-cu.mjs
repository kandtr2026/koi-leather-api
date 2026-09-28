#!/usr/bin/env node
/**
 * Bảng SLUG CŨ của sản phẩm (koi_free_style.koi_slug_cu — xem model KoiSlugCu).
 *
 * A Khoa 28/09/2026: "sao có trong bài rồi click vào lại thành 404". Sửa tên sản
 * phẩm là backend sinh lại slug theo tên → link cũ 404. Từ bản backend này mỗi lần
 * slug đổi tự ghi slug cũ; tool này tạo bảng và NẠP LẠI các slug đã đổi trước đó.
 *
 *   node tools/slug-cu.mjs --tao-bang
 *   node tools/slug-cu.mjs --nap <tệp.json>   [{ id, cu }] — slug cũ của sản phẩm id
 *   node tools/slug-cu.mjs                    xem bảng
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const goc = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dongEnv = fs.readFileSync(path.join(goc, '.env'), 'utf8').split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='));
process.env.DATABASE_URL = dongEnv.slice('DATABASE_URL='.length).replace(/^["']|["']$/g, '');
const { PrismaClient } = await import('@prisma/client');
const db = new PrismaClient();
const argv = process.argv.slice(2);

if (argv.includes('--tao-bang')) {
  await db.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS koi_free_style.koi_slug_cu (
    slug text PRIMARY KEY,
    product_id text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
  )`);
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS koi_slug_cu_product_id_idx ON koi_free_style.koi_slug_cu (product_id)`);
  console.log('Đã có bảng koi_free_style.koi_slug_cu');
}

const i = argv.indexOf('--nap');
if (i !== -1) {
  const ds = JSON.parse(fs.readFileSync(argv[i + 1], 'utf8'));
  // Không nạp slug đang là slug SỐNG của một sản phẩm (kể cả chính nó).
  const song = new Set((await db.$queryRawUnsafe(`SELECT slug FROM koi_free_style.koi_products WHERE NOT "isDeleted"`)).map((r) => r.slug));
  const hop = ds.filter((d) => d.id && d.cu && !song.has(d.cu));
  let n = 0;
  for (const d of hop) {
    n += await db.$executeRawUnsafe(
      `INSERT INTO koi_free_style.koi_slug_cu (slug, product_id) VALUES ($1, $2) ON CONFLICT (slug) DO NOTHING`,
      d.cu,
      d.id,
    );
  }
  console.log(`Nạp ${n}/${ds.length} slug cũ (bỏ ${ds.length - hop.length} slug đang sống hoặc thiếu)`);
}

const r = await db.$queryRawUnsafe(`
  SELECT c.slug cu, p.slug hien_tai, p.status, p."isDeleted" xoa
  FROM koi_free_style.koi_slug_cu c LEFT JOIN koi_free_style.koi_products p ON p.id = c.product_id
  ORDER BY c.created_at DESC LIMIT 10`).catch(() => []);
const tong = await db.$queryRawUnsafe(`SELECT count(*)::int n FROM koi_free_style.koi_slug_cu`).catch(() => [{ n: 'chưa có bảng' }]);
console.log(`Bảng có ${tong[0].n} dòng. Mới nhất:`);
for (const x of r) console.log(' ', x.cu, '→', x.hien_tai, x.xoa ? '(đã xoá)' : x.status);
await db.$disconnect();
