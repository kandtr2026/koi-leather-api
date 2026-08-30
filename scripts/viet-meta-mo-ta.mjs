/**
 * Ghi thẻ mô tả cho các trang kiếm được nhiều nhất.
 *
 *   node scripts/viet-meta-mo-ta.mjs             # chạy thử, in bảng + đo độ dài
 *   node scripts/viet-meta-mo-ta.mjs --ghi       # ghi thật
 *
 * Chữ và lý lẽ nằm ở scripts/meta-mo-ta.data.mjs.
 *
 * BỐN LỚP CHẶN:
 *  1. chụp bản gốc + SQL hoàn tác TRƯỚC khi ghi
 *  2. ĐỘ DÀI 120–158 ký tự. Dưới 120 là bỏ trống chỗ được cho; trên 158 Google
 *     cắt bằng "…" và câu cuối mất nghĩa — tức là công viết coi như mất. Lệch
 *     khoảng là DỪNG, vì đây là lỗi duy nhất không thể thấy bằng mắt khi đọc
 *     bảng chữ.
 *  3. KHÔNG GHI ĐÈ mô tả đã viết tay. Nếu trong DB đã có mô tả TỬ TẾ (không phải
 *     đoạn thân bài bị cắt) thì bỏ qua — có người đã làm việc đó rồi.
 *  4. tính & kiểm toàn bộ TRƯỚC, chỉ ghi khi 100% đạt
 *
 * CHẠY LẠI ĐƯỢC: ghi rồi chạy lại thì lớp 3 nhận ra mô tả mới chính là bản đã
 * viết tay và bỏ qua im lặng. Không báo lỗi giả.
 */
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';
import { META } from './meta-mo-ta.data.mjs';

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

const NGAN = 120;
const DAI = 158;

function phang(s) {
  return String(s ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

/** Mô tả hiện có đã "tử tế" chưa, hay là đoạn thân bài bị cắt? */
function daTuTe(md, than) {
  const m = phang(md);
  if (!m) return false;
  if (m.length > DAI) return false;                       // dài quá → không phải viết tay
  if (phang(than).slice(0, 400).includes(m.slice(0, 60))) return false; // là tiền tố thân bài
  if (m.length >= 150 && !/[.!?…]$/.test(m)) return false; // cắt giữa câu
  return true;
}

const db = new PrismaClient();
const chuanBi = [];
const loi = [];
const boQua = [];

for (const v of META) {
  const p = await db.posts.findUnique({
    where: { slug: v.slug },
    select: { id: true, title: true, meta_description: true, content: true },
  });
  if (!p) { loi.push(`${v.slug}: KHÔNG THẤY bài`); continue; }

  const d = v.moTa.length;
  if (d < NGAN || d > DAI) {
    loi.push(`${v.slug}: mô tả dài ${d} ký tự — ngoài khoảng ${NGAN}–${DAI}`);
    continue;
  }

  if (phang(p.meta_description) === v.moTa) { boQua.push(`${v.slug}: đã đúng bản này rồi`); continue; }

  if (daTuTe(p.meta_description, p.content)) {
    boQua.push(`${v.slug}: DB đã có mô tả viết tay → BỎ QUA, không ghi đè\n        "${phang(p.meta_description).slice(0, 130)}"`);
    continue;
  }

  const cu = phang(p.meta_description);
  chuanBi.push({
    id: p.id, slug: v.slug, hien: v.hien, nhap: v.nhap, cum: v.cum,
    gocRaw: p.meta_description,
    cu: cu || '(TRỐNG)',
    moi: v.moTa, dai: d,
  });
}

console.log('');
for (const b of boQua) console.log('—  ' + b);
if (boQua.length) console.log('');

for (const c of chuanBi) {
  console.log(`${GHI ? '✓' : '·'} /${c.slug}/   ${c.hien} hiển thị · ${c.nhap} nhấp`);
  console.log(`      cụm khách gõ: ${c.cum}`);
  console.log(`      cũ  (${String(c.cu.length).padStart(3)}): ${c.cu.slice(0, 120)}`);
  console.log(`      mới (${String(c.dai).padStart(3)}): ${c.moi}`);
  console.log('');
}

if (loi.length) {
  console.error('DỪNG — không ghi một dòng nào:');
  for (const l of loi) console.error('  · ' + l);
  await db.$disconnect();
  process.exit(1);
}

const tongHien = chuanBi.reduce((s, c) => s + c.hien, 0);
const tongNhap = chuanBi.reduce((s, c) => s + c.nhap, 0);
console.log(`Sẽ ghi ${chuanBi.length} trang · ${tongHien} hiển thị · ${tongNhap} nhấp/28 ngày đang đi qua chúng.`);
console.log(`Độ dài: ${Math.min(...chuanBi.map((c) => c.dai))}–${Math.max(...chuanBi.map((c) => c.dai))} ký tự (giới hạn ${NGAN}–${DAI}).`);

if (!GHI) {
  console.log('\n(chạy thử — chưa ghi gì. Chạy lại với --ghi)');
  await db.$disconnect();
  process.exit(0);
}

const dau = new Date().toISOString().replace(/[:.]/g, '-');
const q = (s) => (s === null || s === undefined ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`);
const tep = path.resolve(import.meta.dirname, `_goc-meta-${dau}.sql`);
fs.writeFileSync(
  tep,
  chuanBi.map((c) => `UPDATE public.posts SET meta_description=${q(c.gocRaw)} WHERE id=${c.id}; -- ${c.slug}`).join('\n') + '\n',
  'utf8',
);
console.log(`\nĐã chụp SQL hoàn tác → ${path.basename(tep)}`);

for (const c of chuanBi) {
  await db.posts.update({ where: { id: c.id }, data: { meta_description: c.moi } });
  console.log(`✓ ${c.slug}`);
}
console.log(`\nĐã ghi ${chuanBi.length} thẻ mô tả.`);

await db.$disconnect();
