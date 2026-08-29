/**
 * Sửa ALT ẢNH còn tên nhãn hiệu người khác.
 *
 *   node scripts/doi-alt-anh.mjs             # chạy thử
 *   node scripts/doi-alt-anh.mjs --ghi       # ghi thật
 *
 * VÌ SAO CÓ TỆP RIÊNG, KHÔNG GỘP VÀO doi-ten-nhan-hieu.mjs:
 *
 * Lượt đổi tên (a53bc1c) quét 5 trường của koi_products và bỏ sót trường thứ
 * sáu: `altText` của koi_product_images — bảng KHÁC. Phát hiện khi verify
 * production: H1 của /cua-hang/vi-chanel/ đã là "Ví Nữ Chần Trám – Hoa Nổi –
 * Đen" nhưng ảnh vẫn alt="Ảnh Studio Ví Chanel - Koi Leather". Alt là đúng thứ
 * Google Image đọc, và là chữ mà trình đọc màn hình đọc lên — nên nó là chữ
 * THẬT trên trang, không phải dữ liệu nội bộ.
 *
 * Không gộp được vào script cũ vì script đó chặn bằng "tenCu phải khớp tên trong
 * DB" — mà tên trong DB nay ĐÃ LÀ tên mới, nên chạy lại là bỏ qua sạch 28 món.
 * Ở đây đổi luật chặn: chỉ chạm alt nào CÒN CHỨA tenCu.
 *
 * Dùng CHUNG bảng DOI_TEN để không có nguy cơ hai bảng lệch nhau về sau.
 */
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';
import { DOI_TEN } from './doi-ten-nhan-hieu.data.mjs';

const env = fs.readFileSync(path.resolve(import.meta.dirname, '..', '.env'), 'utf8');
for (const l of env.split(/\r?\n/)) {
  const m = /^([A-Z_]+)=(.*)$/.exec(l.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const CO = new Set(process.argv.slice(2));
for (const c of CO) {
  if (c !== '--ghi') { console.error(`Cờ lạ: ${c}. Chỉ nhận --ghi.`); process.exit(1); }
}
const GHI = CO.has('--ghi');

/** Mọi nhãn hiệu cần vắng mặt khỏi alt — gộp từ `phaiSach` của cả bảng. */
const NHAN = [...new Set(DOI_TEN.flatMap((v) => v.phaiSach ?? []))];

function con(nhan, s) {
  const esc = nhan.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp('(?<![\\p{L}])' + esc + '(?![\\p{L}])', 'iu').test(String(s ?? ''));
}

/**
 * Khớp tên CHỊU ĐƯỢC KHÁC LOẠI GẠCH và khác hoa thường.
 *
 * Vì sao cần: tên sản phẩm dùng gạch ngang dài "–" (en dash) còn alt ảnh do
 * trình khác sinh ra lại dùng gạch nối "-". So chuỗi nguyên văn thì 68/127 alt
 * lọt lưới trong lần chạy đầu — nhìn hai chuỗi trên màn hình thì y như nhau.
 * Ở đây mọi loại gạch (- – —) coi như một, khoảng trắng co giãn tuỳ ý.
 */
function reTen(ten) {
  const esc = ten
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/[-–—]/g, '[-–—]')
    .replace(/\s+/g, '\\s+');
  return new RegExp(esc, 'giu');
}

/**
 * Alt KHÔNG chép theo tên sản phẩm — phải thay riêng.
 *
 * `day-lung-da-bo-swift-en-nau-khoa-cartier-bac` là món duy nhất mà alt kể một
 * câu khác hẳn tên: tên là "Dây Lưng Da Box Calf Đen Nâu – Khoá Bạc" (đã sạch từ
 * trước) nhưng alt vẫn "…– Khóa Cartier Bạc". Bảng DOI_TEN không bắt được vì nó
 * so theo tenCu, mà tenCu ở đây không chứa Cartier.
 */
const ALT_RIENG = [
  {
    slug: 'day-lung-da-bo-swift-en-nau-khoa-cartier-bac',
    thay: [['Khóa Cartier Bạc', 'Khoá Bạc'], ['Khoá Cartier Bạc', 'Khoá Bạc']],
    phaiSach: ['Cartier'],
  },
];

const db = new PrismaClient();

/* ---- 1. Alt của 28 món đã đổi tên: thay tenCu → tenMoi ---- */

const sua = [];
for (const v of DOI_TEN) {
  const p = await db.koiProduct.findUnique({
    where: { slug: v.slug },
    select: { id: true, images: { select: { id: true, altText: true } } },
  });
  if (!p) { console.log(`✗ ${v.slug}: không thấy`); continue; }

  const reg = reTen(v.tenCu);
  for (const a of p.images) {
    const cu = a.altText ?? '';
    if (!cu) continue;
    // Chặn: chỉ chạm alt CÒN CHỨA tên cũ.
    reg.lastIndex = 0;
    if (!reg.test(cu)) continue;
    const moi = cu.replace(reTen(v.tenCu), v.tenMoi);
    if (moi === cu) continue;
    sua.push({ idAnh: a.id, slug: v.slug, cu, moi });
  }
}

/* ---- 1b. Alt kể câu khác tên sản phẩm ---- */

for (const r of ALT_RIENG) {
  const p = await db.koiProduct.findUnique({
    where: { slug: r.slug },
    select: { images: { select: { id: true, altText: true } } },
  });
  if (!p) { console.log(`✗ ${r.slug}: không thấy`); continue; }
  for (const a of p.images) {
    const cu = a.altText ?? '';
    if (!cu) continue;
    let moi = cu;
    for (const [tim, doi] of r.thay) moi = moi.split(tim).join(doi);
    if (moi === cu) continue;
    sua.push({ idAnh: a.id, slug: r.slug, cu, moi });
  }
}

/* ---- 2. Quét TOÀN BỘ alt còn lại: có nhãn hiệu nào ngoài các món trên? ---- */

const tatCa = await db.koiProductImage.findMany({
  select: { id: true, altText: true, product: { select: { slug: true } } },
});
const daSua = new Set(sua.map((s) => s.idAnh));
const conSot = [];
for (const a of tatCa) {
  if (daSua.has(a.id) || !a.altText) continue;
  const hit = NHAN.filter((n) => con(n, a.altText));
  if (hit.length) conSot.push({ slug: a.product?.slug ?? '?', alt: a.altText, hit });
}

console.log(`Tổng ảnh          : ${tatCa.length}`);
console.log(`Alt sẽ sửa        : ${sua.length}`);
console.log(`Alt còn nhãn KHÁC : ${conSot.length}`);
console.log('');

for (const s of sua) {
  console.log(`${GHI ? '✓' : '·'} ${s.slug}`);
  console.log(`      cũ : ${s.cu}`);
  console.log(`      mới: ${s.moi}`);
}

if (conSot.length) {
  console.log('\n⚠ Alt CÒN nhãn hiệu mà bảng DOI_TEN không phủ (xem rồi quyết riêng):');
  for (const c of conSot) console.log(`   ${c.slug}  [${c.hit.join('/')}]  "${c.alt}"`);
}

if (!GHI) {
  console.log('\n(chạy thử — chưa ghi gì. Chạy lại với --ghi)');
  await db.$disconnect();
  process.exit(0);
}

const dau = new Date().toISOString().replace(/[:.]/g, '-');
const tep = path.resolve(import.meta.dirname, `_goc-alt-${dau}.sql`);
fs.writeFileSync(
  tep,
  sua
    .map((s) => `UPDATE koi_free_style.koi_product_images SET "altText"='${s.cu.replace(/'/g, "''")}' WHERE id='${s.idAnh}'; -- ${s.slug}`)
    .join('\n') + '\n',
  'utf8',
);
console.log(`\nĐã chụp SQL hoàn tác → ${path.basename(tep)}`);

let n = 0;
for (const s of sua) {
  await db.koiProductImage.update({ where: { id: s.idAnh }, data: { altText: s.moi } });
  n++;
}
console.log(`Đã ghi ${n}/${sua.length} alt.`);

await db.$disconnect();
