/**
 * Quét — và sửa — mã SKU còn tên nhãn hiệu người khác.
 *
 *   node scripts/quet-sku-nhan-hieu.mjs          # chỉ quét, in bảng trước/sau
 *   node scripts/quet-sku-nhan-hieu.mjs --ghi    # ghi thật
 *
 * VÌ SAO CÓ TỆP NÀY. Sau khi đổi 23 slug, curl trang mới VẪN thấy "vi-chanel" —
 * nằm trong `sku` ("PK-vi-chanel-4N4X"), và JSON-LD của trang sản phẩm in cả sku
 * ra HTML công khai (src/app/(vi)/cua-hang/[slug]/page.tsx). Đây là chỗ thứ SÁU
 * bị lọt sau name/description/metaTitle/metaDescription/altText, cùng một kiểu
 * lỗi: quét theo trí nhớ về "những cột mình nhớ là có chữ" thay vì theo schema.
 *
 * SKU KHÔNG PHẢI MÃ XƯỞNG ĐẶT TAY. product.service.ts sinh nó bằng
 * generateSku(): `<tiền tố loại>-<3 đoạn đầu của slug>-<4 ký tự ngẫu nhiên>`.
 * Nên đổi nó không đụng vào sổ sách nào — nhưng vẫn GIỮ NGUYÊN 4 ký tự ngẫu
 * nhiên để ai đang nhớ mã cũ vẫn nhận ra được món.
 *
 * KHÔNG cần sửa generateSku(): nó lấy từ slug, mà slug nay đã sạch, nên hàng
 * mới sinh ra sẽ tự đúng.
 */
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

const env = fs.readFileSync(path.resolve(import.meta.dirname, '..', '.env'), 'utf8');
for (const l of env.split(/\r?\n/)) {
  const m = /^([A-Z_]+)=(.*)$/.exec(l.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

/** Tên nhà mốt — cùng danh sách nhóm NHA_MOT trong quet-nhan-hieu.mjs. */
const NHAN = [
  'chanel',
  'hermes',
  'hermès',
  'louis-vuitton',
  'louisvuitton',
  'lv',
  'goyard',
  'versace',
  'prada',
  'loewe',
  'longchamp',
  'tiffany',
  'cartier',
  'celine',
  'dior',
  'gucci',
  'burberry',
  'montblanc',
  'mont-blanc',
  'montblance',
  'birkin',
  'constance',
  'rolex',
  'omega',
  'vertu',
];

const CO = new Set(process.argv.slice(2));
for (const c of CO) {
  if (c !== '--ghi') {
    console.error(`Cờ lạ: ${c}. Chỉ nhận --ghi.`);
    process.exit(1);
  }
}
const GHI = CO.has('--ghi');

const db = new PrismaClient();

const hang = await db.koiProduct.findMany({
  select: { id: true, slug: true, sku: true, name: true },
  orderBy: { slug: 'asc' },
});

function chuTen(v) {
  let t = String(v ?? '');
  try {
    const j = JSON.parse(t);
    if (j && typeof j.vi === 'string') t = j.vi;
  } catch {
    /* chữ thô */
  }
  return t;
}

const dinh = [];
for (const h of hang) {
  const sku = String(h.sku ?? '');
  if (!sku) continue;
  // So theo ĐOẠN cắt bằng dấu gạch, không phải substring: "lv" là substring của
  // "silver"/"velvet", còn đoạn "lv" đứng riêng thì đúng là Louis Vuitton.
  const doan = sku.toLowerCase().split(/[-_\s]+/);
  const khop = NHAN.filter((n) => doan.includes(n));
  if (khop.length) dinh.push({ ...h, khop });
}

const soSku = hang.filter((h) => h.sku).length;
console.log(
  `Quét ${hang.length} sản phẩm (${soSku} có sku) · ${dinh.length} mã còn tên nhãn hiệu${GHI ? '  — GHI THẬT' : ''}\n`,
);
if (!dinh.length) {
  console.log('Sạch.');
  await db.$disconnect();
  process.exit(0);
}

/* --------------------------- tính mã mới từ slug --------------------------- */
// Cùng luật với generateSku() trong src/product/product.service.ts, nhưng GIỮ
// nguyên 4 ký tự ngẫu nhiên của mã cũ thay vì sinh mới.
const daDung = new Set(hang.map((h) => h.sku).filter(Boolean));
const viec = [];
const loi = [];
for (const d of dinh) {
  const doan = String(d.sku).split('-');
  const tienTo = doan[0];
  const duoi = doan[doan.length - 1];
  const moi = `${tienTo}-${d.slug.split('-').slice(0, 3).join('-')}-${duoi}`;

  const conNhan = moi.toLowerCase().split('-').filter((x) => NHAN.includes(x));
  if (conNhan.length) {
    loi.push(`${d.sku} → ${moi} VẪN còn: ${conNhan.join(', ')} (slug chưa sạch?)`);
    continue;
  }
  if (moi !== d.sku && daDung.has(moi)) {
    loi.push(`${d.sku} → ${moi} TRÙNG mã đã có`);
    continue;
  }
  daDung.add(moi);
  viec.push({ ...d, moi });
}

for (const v of viec) {
  console.log(`  ${v.sku}  →  ${v.moi}`);
  console.log(`    ${v.slug}`);
  console.log(`    ${chuTen(v.name)}`);
}
if (loi.length) {
  console.log(`\nKHÔNG tính được mã mới (${loi.length}):`);
  for (const l of loi) console.log(`  · ${l}`);
  console.error('\nDỪNG CẢ LƯỢT — sửa nguyên nhân rồi chạy lại.');
  await db.$disconnect();
  process.exit(1);
}

if (!GHI) {
  console.log('\nChạy thử. Ghi thật: node scripts/quet-sku-nhan-hieu.mjs --ghi');
  await db.$disconnect();
  process.exit(0);
}

/* ------------------------------- chụp bản gốc ------------------------------- */
const dau = new Date().toISOString().replace(/[:.]/g, '-');
const tep = path.resolve(import.meta.dirname, `_goc-sku-${dau}.sql`);
fs.writeFileSync(
  tep,
  [
    `-- Hoàn tác đổi sku, chụp ${new Date().toISOString()}`,
    '',
    ...viec.map(
      (v) => `UPDATE koi_free_style.koi_products SET sku = '${v.sku}' WHERE id = '${v.id}';`,
    ),
    '',
  ].join('\n'),
  'utf8',
);
console.log(`\nĐã chụp bản gốc: ${path.basename(tep)}`);

for (const v of viec) {
  await db.koiProduct.update({ where: { id: v.id }, data: { sku: v.moi } });
  console.log(`  ✓ ${v.sku} → ${v.moi}`);
}
console.log(`\nĐã ghi ${viec.length}/${viec.length}.`);
console.log('Nhớ deploy koi-storefront để xoá bộ đệm — sku nằm trong JSON-LD của trang.');

await db.$disconnect();
