#!/usr/bin/env node
/**
 * In ra TRƯỚC/SAU của từng chỗ sắp sửa, để đọc bằng mắt trước khi ghi vào DB.
 *
 * Con số "927 chỗ sửa" không nói được câu tiếng Việt sau khi sửa có đọc xuôi
 * không. Chỉ có đọc mới biết. Dùng chung đúng bộ luật của sua-copy-sp.mjs để
 * không có chuyện xem một đằng ghi một nẻo.
 *
 *   node tools/xem-sua.mjs <tên-luật> [số-mẫu]
 *   node tools/xem-sua.mjs all 3
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const goc = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
process.env.DATABASE_URL = fs
  .readFileSync(path.join(goc, '.env'), 'utf8')
  .split(/\r?\n/)
  .find((l) => l.startsWith('DATABASE_URL='))
  .slice('DATABASE_URL='.length)
  .replace(/^["']|["']$/g, '');

const { LUAT, CHE, che, moChe } = await import('./luat-copy.mjs');
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

const chon = process.argv[2] || 'all';
const soMau = Number(process.argv[3] || 4);
const boc = (s) => s.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\\n/g, ' ').replace(/\s+/g, ' ');

const dong = await prisma.$queryRawUnsafe(
  `select slug, description::text from koi_free_style.koi_products where description is not null`,
);

/**
 * Chạy luật TÍCH LUỸ, đúng như bản ghi thật.
 *
 * Bản xem đầu của em áp từng luật lên bản GỐC để in ra, nên một đoạn dính hai
 * luật thì in ra hai kết quả mâu thuẫn nhau, không cái nào là thứ DB sẽ nhận.
 * Xem trước mà không khớp bản ghi thì xem để làm gì.
 */
const daIn = {};
for (const d of dong) {
  const { ra, kho } = che(d.description);
  let t = ra;
  for (const l of LUAT) {
    l.tim.lastIndex = 0;
    const khop = [...t.matchAll(l.tim)];
    t = t.replace(l.tim, (...a) => (typeof l.thay === 'function' ? l.thay(...a) : l.thay));
    if (!khop.length) continue;
    if (chon !== 'all' && l.ten !== chon) continue;
    if ((daIn[l.ten] || 0) >= soMau) continue;
    const m = khop[0];
    const truoc = boc(moChe(ra.slice(Math.max(0, m.index - 100), m.index + m[0].length + 110), kho));
    const sau = boc(
      moChe(
        t.slice(Math.max(0, m.index - 100), m.index + m[0].length + 110),
        kho,
      ),
    );
    daIn[l.ten] = (daIn[l.ten] || 0) + 1;
    console.log(`\n[${l.ten}] ${d.slug}`);
    console.log(`  TRƯỚC: …${truoc.trim()}…`);
    console.log(`  SAU  : …${sau.trim()}…`);
  }
}
await prisma.$disconnect();
