/**
 * VIẾT MÔ TẢ CHO SẢN PHẨM ĐANG RỖNG — dữ liệu ở viet-mo-ta-sp-rong.data.mjs.
 *
 *   node scripts/viet-mo-ta-sp-rong.mjs            # chạy thử, không ghi
 *   node scripts/viet-mo-ta-sp-rong.mjs --ghi      # ghi thật
 *   node scripts/viet-mo-ta-sp-rong.mjs --ghi --de-len   # ghi đè cả món đã có mô tả
 *
 * Ghi ba cột: description (HTML), metaDescription, metaTitle (null = rơi về
 * name). descriptionBlocks đặt null = "HTML chưa qua trình dựng khối" — admin
 * mở lên vẫn phân tích lại được bằng htmlToBlocks.
 *
 * AN TOÀN: mặc định CHỈ ghi món có description rỗng; trước khi ghi xuất SQL
 * hoàn tác scripts/_goc-mo-ta-rong-<mốc>.sql trả lại đúng ba cột cũ. Kiểm
 * metaDescription ≤ 160 ký tự và không có dạng "Nhãn: giá trị" (storefront
 * loại câu meta kiểu bảng spec).
 */
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';
import { MO_TA } from './viet-mo-ta-sp-rong.data.mjs';

const env = fs.readFileSync(path.resolve(import.meta.dirname, '..', '.env'), 'utf8');
for (const l of env.split(/\r?\n/)) {
  const m = /^([A-Z_]+)=(.*)$/.exec(l.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const CO = new Set(process.argv.slice(2));
for (const c of CO) {
  if (!['--ghi', '--de-len'].includes(c)) {
    console.error(`Cờ lạ: ${c}. Chỉ nhận --ghi, --de-len.`);
    process.exit(1);
  }
}
const GHI = CO.has('--ghi');
const DE_LEN = CO.has('--de-len');

const strip = (h) => (h ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const sqlStr = (s) => (s == null ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`);
const NHAN_SPEC = /\b[A-ZĐ][^:.!?]{2,30}:\s/g;

// Kiểm dữ liệu trước khi chạm DB.
let loi = 0;
for (const m of MO_TA) {
  if (m.metaDescription.length > 160) {
    console.error(`✗ ${m.slug}: metaDescription ${m.metaDescription.length} ký tự (> 160)`);
    loi++;
  }
  if ((m.metaDescription.match(NHAN_SPEC) ?? []).length >= 2) {
    console.error(`✗ ${m.slug}: metaDescription trông như bảng spec`);
    loi++;
  }
  if (strip(m.html).split(' ').length < 60) {
    console.error(`✗ ${m.slug}: mô tả quá ngắn`);
    loi++;
  }
}
const slugs = MO_TA.map((m) => m.slug);
if (new Set(slugs).size !== slugs.length) {
  console.error('✗ slug trùng trong data');
  loi++;
}
if (loi) process.exit(1);

const db = new PrismaClient();
const hang = await db.koiProduct.findMany({
  where: { slug: { in: slugs }, isDeleted: false },
  select: { id: true, slug: true, description: true, metaDescription: true, metaTitle: true },
});
const theoSlug = new Map(hang.map((p) => [p.slug, p]));

console.log(GHI ? '\n>>> CHẾ ĐỘ GHI THẬT <<<\n' : '\n(chạy thử — không ghi. Thêm --ghi để ghi thật)\n');

const seGhi = [];
for (const m of MO_TA) {
  const p = theoSlug.get(m.slug);
  if (!p) {
    console.log(`  ? ${m.slug}: KHÔNG có trong DB — bỏ qua`);
    continue;
  }
  const dangCo = strip(p.description).length > 0;
  if (dangCo && !DE_LEN) {
    console.log(`  – ${m.slug}: đã có mô tả (${strip(p.description).length} ký tự) — giữ nguyên`);
    continue;
  }
  console.log(
    `  + ${m.slug}: ${strip(m.html).split(' ').length} chữ · meta ${m.metaDescription.length} ký tự · title ${m.metaTitle ? JSON.stringify(m.metaTitle) : '(name)'}`,
  );
  seGhi.push({ p, m });
}
console.log(`\nSẽ ghi: ${seGhi.length}/${MO_TA.length}`);

if (!GHI) {
  console.log('Chưa ghi gì. Chạy lại với --ghi.');
  await db.$disconnect();
  process.exit(0);
}

const moc = new Date().toISOString().replace(/[:.]/g, '-');
const tepGoc = path.resolve(import.meta.dirname, `_goc-mo-ta-rong-${moc}.sql`);
fs.writeFileSync(
  tepGoc,
  [
    `-- Hoàn tác viet-mo-ta-sp-rong.mjs lúc ${moc}: trả description/metaDescription/metaTitle cũ`,
    ...seGhi.map(
      ({ p }) =>
        `UPDATE koi_free_style.koi_products SET description = ${sqlStr(p.description)}, "metaDescription" = ${sqlStr(p.metaDescription)}, "metaTitle" = ${sqlStr(p.metaTitle)} WHERE id = ${sqlStr(p.id)};`,
    ),
    '',
  ].join('\n'),
  'utf8',
);
console.log(`Đã ghi SQL hoàn tác: ${path.basename(tepGoc)}`);

const log = path.resolve(import.meta.dirname, '_log-viet-mo-ta-rong.jsonl');
for (const { p, m } of seGhi) {
  await db.koiProduct.update({
    where: { id: p.id },
    data: {
      description: m.html,
      descriptionBlocks: null,
      metaDescription: m.metaDescription,
      metaTitle: m.metaTitle ?? null,
    },
  });
  fs.appendFileSync(log, JSON.stringify({ luc: moc, slug: m.slug, id: p.id }) + '\n');
}
console.log(`Đã ghi ${seGhi.length} sản phẩm.`);
await db.$disconnect();
