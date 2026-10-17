/**
 * SỬA GẤP — 2 danh mục có coverImage trỏ file 404 (paste nhầm URL).
 * Xoá coverImage → API tự fallback về ảnh sản phẩm đầu (trạng thái tốt cũ).
 *
 *   node scripts/_sua-cover-vo.mjs          # chạy thử (không ghi)
 *   node scripts/_sua-cover-vo.mjs --ghi    # ghi thật + chụp SQL hoàn tác
 */
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

const env = fs.readFileSync(path.resolve(import.meta.dirname, '..', '.env'), 'utf8');
for (const l of env.split(/\r?\n/)) {
  const m = /^([A-Z_]+)=(.*)$/.exec(l.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const GHI = process.argv.slice(2).includes('--ghi');
const SLUGS = ['tui-da-cho-nu', 'vi-da-cho-nam'];
const db = new PrismaClient();

async function anhChinh(url) {
  try {
    const r = await fetch(url, { method: 'HEAD' });
    return r.status;
  } catch (e) { return `ERR ${e.code || e.message}`; }
}

const sua = [];
for (const slug of SLUGS) {
  const c = await db.koiCategory.findUnique({
    where: { slug },
    select: { id: true, name: true, slug: true, coverImage: true },
  });
  if (!c) { console.log(`✗ ${slug}: không thấy`); continue; }
  const httpCode = c.coverImage ? await anhChinh(c.coverImage) : '(trống)';
  console.log(`\n=== ${c.name} (${c.slug}) ===`);
  console.log(`   coverImage : ${c.coverImage ?? '(null)'}`);
  console.log(`   HTTP       : ${httpCode}`);
  if (c.coverImage) {
    console.log(`   → sẽ XOÁ coverImage, API tự fallback ảnh sản phẩm đầu`);
    sua.push({ id: c.id, slug: c.slug, cu: c.coverImage });
  } else {
    console.log(`   → đã trống, bỏ qua`);
  }
}

console.log(`\nSẽ xoá cover: ${sua.length} danh mục`);

if (!GHI) {
  console.log('\n(chạy thử — chưa ghi gì. Chạy lại với --ghi)');
  await db.$disconnect();
  process.exit(0);
}

const dau = new Date().toISOString().replace(/[:.]/g, '-');
const tep = path.resolve(import.meta.dirname, `_goc-cover-${dau}.sql`);
fs.writeFileSync(
  tep,
  sua.map((s) =>
    `UPDATE koi_free_style.koi_categories SET "coverImage"='${s.cu.replace(/'/g, "''")}' WHERE id='${s.id}'; -- ${s.slug}`
  ).join('\n') + '\n',
  'utf8',
);
console.log(`\nĐã chụp SQL hoàn tác → ${path.basename(tep)}`);

let n = 0;
for (const s of sua) {
  await db.koiCategory.update({ where: { id: s.id }, data: { coverImage: null } });
  n++;
  console.log(`✓ ${s.slug}: coverImage → null`);
}
console.log(`\nĐã xoá ${n}/${sua.length} cover.`);
await db.$disconnect();
