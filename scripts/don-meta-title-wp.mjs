/**
 * DỌN ĐUÔI WORDPRESS TRONG metaTitle SẢN PHẨM.
 *
 *   node scripts/don-meta-title-wp.mjs          # chạy thử, không ghi
 *   node scripts/don-meta-title-wp.mjs --ghi    # ghi thật
 *
 * VẤN ĐỀ (đo 16/09/2026): 186/519 sản phẩm sống còn metaTitle dạng
 *   "Túi Loom - Đồ Da Thủ Công Koi Leather"
 * di sản Yoast/WooCommerce. Storefront dựng <title> = meta_title ?? name rồi
 * layout nối thêm " | KOI Leather", nên Google thấy
 *   "Túi Loom - Đồ Da Thủ Công Koi Leather | KOI Leather"
 * — thương hiệu lặp hai lần, tốn ký tự, và nhiều title còn LỆCH tên hàng
 * ("Glasscase" cho món tên "Bao mắt kính basic", "cặp dây đồng hồ" cho
 * "Dây đồng hồ - da kỳ đà - Black").
 *
 * CÁCH XỬ: đặt metaTitle = NULL cho đúng 186 món đó. Storefront tự rơi về
 * `name` — chính là H1 người bán đã đặt — nên title và H1 khớp nhau, thương
 * hiệu chỉ còn một lần ở đuôi do layout thêm. KHÔNG cắt chuỗi rồi ghi lại:
 * phần còn lại sau khi cắt ("sọt đan", "Ốp đt 15pro") thường tệ hơn `name`.
 *
 * AN TOÀN: chỉ chạm hàng có đuôi khớp regex; trước khi ghi xuất SQL hoàn tác
 * scripts/_goc-meta-title-wp-<mốc>.sql (UPDATE trả lại từng chuỗi cũ).
 * So khớp trên chuỗi đã normalize NFC vì dữ liệu WP có thể là NFD.
 */
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

const env = fs.readFileSync(path.resolve(import.meta.dirname, '..', '.env'), 'utf8');
for (const l of env.split(/\r?\n/)) {
  const m = /^([A-Z_]+)=(.*)$/.exec(l.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const CO = new Set(process.argv.slice(2));
for (const c of CO) {
  if (c !== '--ghi') {
    console.error(`Cờ lạ: ${c}. Chỉ nhận --ghi.`);
    process.exit(1);
  }
}
const GHI = CO.has('--ghi');

const DUOI_WP = /\s*[-–—|]\s*(Đồ Da Thủ Công\s+)?Koi Leather\s*$/i;

const tenHien = (raw) => {
  if (!raw) return '';
  try {
    const o = JSON.parse(raw);
    if (o && typeof o === 'object') return o.vi ?? Object.values(o)[0] ?? '';
  } catch {
    /* tên thường */
  }
  return raw;
};
const sqlStr = (s) => `'${String(s).replace(/'/g, "''")}'`;

const db = new PrismaClient();
const hang = await db.koiProduct.findMany({
  where: { isDeleted: false, metaTitle: { not: null } },
  select: { id: true, slug: true, name: true, metaTitle: true, status: true },
});

const can = hang.filter((p) => DUOI_WP.test((p.metaTitle ?? '').normalize('NFC')));

console.log(GHI ? '\n>>> CHẾ ĐỘ GHI THẬT <<<\n' : '\n(chạy thử — không ghi. Thêm --ghi để ghi thật)\n');
console.log(`Sản phẩm có metaTitle: ${hang.length} · có đuôi WP: ${can.length}`);
console.log('Ví dụ 10 dòng đầu (metaTitle cũ → title mới = name):');
for (const p of can.slice(0, 10)) {
  console.log(`  ${JSON.stringify(p.metaTitle)} → ${JSON.stringify(tenHien(p.name))}  [${p.slug}]`);
}

if (!GHI) {
  console.log('\nChưa ghi gì. Chạy lại với --ghi.');
  await db.$disconnect();
  process.exit(0);
}

const moc = new Date().toISOString().replace(/[:.]/g, '-');
const tepGoc = path.resolve(import.meta.dirname, `_goc-meta-title-wp-${moc}.sql`);
const sql = [
  `-- Hoàn tác don-meta-title-wp.mjs chạy lúc ${moc}: trả metaTitle cũ cho ${can.length} sản phẩm`,
  ...can.map(
    (p) =>
      `UPDATE koi_free_style.koi_products SET "metaTitle" = ${sqlStr(p.metaTitle)} WHERE id = ${sqlStr(p.id)};`,
  ),
  '',
].join('\n');
fs.writeFileSync(tepGoc, sql, 'utf8');
console.log(`\nĐã ghi SQL hoàn tác: ${path.basename(tepGoc)}`);

let xong = 0;
for (const p of can) {
  await db.koiProduct.update({ where: { id: p.id }, data: { metaTitle: null } });
  xong++;
}
console.log(`Đã đặt metaTitle = NULL cho ${xong} sản phẩm.`);

const conLai = await db.koiProduct.count({
  where: { isDeleted: false, metaTitle: { contains: 'Koi Leather', mode: 'insensitive' } },
});
console.log(`Kiểm lại: metaTitle còn chứa "Koi Leather": ${conLai}`);
await db.$disconnect();
