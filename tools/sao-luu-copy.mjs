#!/usr/bin/env node
/**
 * Sao lưu copy trong DB trước khi sửa — task koi-db-copy-review-20260922-002.
 *
 * Mon đặt điều kiện: có backup rồi mới được đụng vào production. Hai lớp, vì
 * mỗi lớp hỏng theo một kiểu khác nhau:
 *
 *   1. File JSON ngoài DB. Còn nguyên kể cả khi ai đó xoá nhầm bảng backup.
 *   2. Bảng koi_free_style.koi_copy_backup_20260922 trong chính DB. Phục hồi
 *      bằng một câu UPDATE, không cần đọc file, không cần máy này.
 *
 * Bảng lưu theo từng Ô (bảng + khoá + cột) chứ không theo dòng: mỗi lượt sửa
 * chỉ chạm vài cột, lưu cả dòng thì không biết cột nào đã đổi khi cần lần lại.
 *
 *   node tools/sao-luu-copy.mjs           # sao lưu toàn bộ cột trong danh sách
 *   node tools/sao-luu-copy.mjs --hoan <dot>   # in câu SQL hoàn nguyên một đợt
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

const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

/** Đúng các cột mà task này được phép sửa. Không sao lưu thừa. */
export const PHAM_VI = [
  { bang: 'koi_free_style.koi_products', khoa: 'id', cot: ['description', 'descriptionBlocks', 'metaTitle', 'metaDescription'] },
  // Bổ sung sau khi soi payload thật của API: chữ khách đọc được KHÔNG chỉ nằm
  // trong mô tả. `book-mark` trả về 67 lần "Koi Leather" dù mô tả đã sạch —
  // 53 lần trong alt ảnh sản phẩm liên quan, phần còn lại trong meta. Hai cột
  // alt này em sao lưu trước khi đụng.
  { bang: 'koi_free_style.koi_product_images', khoa: 'id', cot: ['altText'] },
  { bang: 'public.product_images', khoa: 'id', cot: ['alt'] },
  { bang: 'koi_free_style.koi_categories', khoa: 'id', cot: ['description', 'metaTitle', 'metaDescription'] },
  { bang: 'public.posts', khoa: 'id', cot: ['title', 'excerpt', 'content', 'meta_title', 'meta_description'] },
  { bang: 'public.pages', khoa: 'id', cot: ['title', 'content', 'meta_title', 'meta_description', 'is_published'] },
  { bang: 'public.categories', khoa: 'id', cot: ['description'] },
  { bang: 'public.post_terms', khoa: 'id', cot: ['name', 'description'] },
];

const hoan = process.argv.indexOf('--hoan');
if (hoan !== -1) {
  const dot = process.argv[hoan + 1];
  if (!dot) {
    console.error('Thiếu tên đợt. Ví dụ: node tools/sao-luu-copy.mjs --hoan batch1-products');
    process.exit(1);
  }
  const r = await prisma.$queryRawUnsafe(
    `select bang, cot, count(*)::int n from koi_free_style.koi_copy_backup_20260922
      where dot = $1 group by bang, cot order by bang, cot`,
    dot,
  );
  if (!r.length) {
    console.log(`Không có bản sao nào cho đợt "${dot}".`);
  } else {
    console.log(`Câu SQL hoàn nguyên đợt "${dot}":\n`);
    for (const x of r) {
      console.log(`-- ${x.bang}.${x.cot}  (${x.n} ô)`);
      console.log(
        `update ${x.bang} t set "${x.cot}" = b.gia_tri_cu\n` +
          `  from koi_free_style.koi_copy_backup_20260922 b\n` +
          ` where b.dot = '${dot}' and b.bang = '${x.bang}' and b.cot = '${x.cot}'\n` +
          `   and t."${x.bang.startsWith('public.') ? 'id' : 'id'}"::text = b.khoa;\n`,
      );
    }
  }
  await prisma.$disconnect();
  process.exit(0);
}

await prisma.$executeRawUnsafe(`
  create table if not exists koi_free_style.koi_copy_backup_20260922 (
    id          bigserial primary key,
    luc         timestamptz not null default now(),
    dot         text        not null,
    bang        text        not null,
    khoa        text        not null,
    cot         text        not null,
    gia_tri_cu  text,
    unique (dot, bang, khoa, cot)
  )`);

const dot = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : 'goc';
const dump = {};
let oDaLuu = 0;

for (const p of PHAM_VI) {
  const dong = await prisma.$queryRawUnsafe(
    `select "${p.khoa}"::text as _id, ${p.cot.map((c) => `"${c}"::text as "${c}"`).join(', ')} from ${p.bang}`,
  );
  dump[p.bang] = dong;

  for (const d of dong) {
    for (const c of p.cot) {
      if (d[c] == null) continue;
      await prisma.$executeRawUnsafe(
        `insert into koi_free_style.koi_copy_backup_20260922 (dot, bang, khoa, cot, gia_tri_cu)
         values ($1,$2,$3,$4,$5) on conflict (dot, bang, khoa, cot) do nothing`,
        dot,
        p.bang,
        d._id,
        c,
        d[c],
      );
      oDaLuu += 1;
    }
  }
  console.log(`${p.bang.padEnd(32)} ${String(dong.length).padStart(5)} dòng`);
}

const tep = path.join(goc, `tools/_sao-luu-copy-${dot}.json`);
fs.writeFileSync(tep, JSON.stringify(dump, null, 1));
const kb = Math.round(fs.statSync(tep).size / 1024);
console.log(`\nĐã lưu ${oDaLuu} ô vào bảng (đợt "${dot}") và ${kb} KB vào ${path.basename(tep)}`);
await prisma.$disconnect();
