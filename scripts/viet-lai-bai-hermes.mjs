/**
 * Viết lại 4 bài blog lấy tên Hermès làm chủ thể.
 *
 *   node scripts/viet-lai-bai-hermes.mjs             # chạy thử + ghi bản đọc lại
 *   node scripts/viet-lai-bai-hermes.mjs --ghi       # ghi thật
 *
 * Quyết định và ranh giới "được nói VỀ họ / không được nói MÌNH LÀ họ" nằm ở
 * scripts/bai-hermes.data.mjs. Đọc tệp đó trước khi sửa gì ở đây.
 *
 * BỐN LỚP CHẶN — y như lượt đổi tên sản phẩm, vì lý do y như thế:
 *   1. chụp bản gốc + SQL hoàn tác TRƯỚC khi ghi
 *   2. so tiêu đề cũ với DB — lệch thì bỏ qua bài đó, không ghi đè việc người khác
 *   3. kiểm `phaiSachCum` SAU khi thay — còn sót là dừng cả lượt
 *   4. tính & kiểm toàn bộ TRƯỚC, chỉ ghi khi 100% đạt
 *
 * KHÁC MỘT ĐIỂM QUAN TRỌNG so với lượt sản phẩm: ở đây KHÔNG kiểm bằng tên nhãn
 * trơ. Ba bài phân tích CỐ Ý còn chữ "Hermès" trong các câu sự thật ("Hermès chọn
 * da Epsom cho nhiều thiết kế") — đặt phaiSach: ['Hermès'] là bộ chặn báo đỏ ở
 * đúng những câu được phép giữ, và tôi sẽ đi xoá mất phần hay nhất của bài để làm
 * cho nó xanh. Nên kiểm CẤU TRÚC SỞ HỮU: "túi Hermès da", "dây lưng Hermes".
 */
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';
import { BAI_HERMES } from './bai-hermes.data.mjs';

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

/** Khớp cụm: chịu được khoảng trắng co giãn và khác hoa thường. */
function reCum(cum) {
  const esc = cum.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  return new RegExp('(?<![\\p{L}])' + esc + '(?![\\p{L}])', 'giu');
}

function thayGiuHoa(s, reg, doi) {
  return s.replace(reg, (khop) => {
    const hoa = khop[0] === khop[0].toUpperCase() && khop[0] !== khop[0].toLowerCase();
    return hoa ? doi.charAt(0).toUpperCase() + doi.slice(1) : doi;
  });
}

function phang(s) {
  return String(s ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function conCum(cum, s) {
  return reCum(cum).test(phang(s));
}

const db = new PrismaClient();
const chuanBi = [];
const loi = [];
const boQua = [];

for (const b of BAI_HERMES) {
  const p = await db.posts.findUnique({
    where: { slug: b.slug },
    select: { id: true, title: true, excerpt: true, meta_title: true, meta_description: true, content: true },
  });
  if (!p) { loi.push(`${b.slug}: KHÔNG THẤY bài`); continue; }

  /**
   * CHẠY LẠI ĐƯỢC. Nhận CẢ tiêu đề cũ (lượt đầu) và tiêu đề mới (lượt sau) —
   * vì bảng `thayCum` còn được bổ sung sau khi đã ghi một lần: hai câu khai
   * chất lượng ("đạt chuẩn Hermes", "Chuẩn form Hermes") chỉ lộ ra khi đọc
   * trang thật trên production, tức là sau lượt ghi đầu.
   *
   * Vẫn CHẶN nếu tiêu đề là thứ ba khác hẳn — nghĩa là có người sửa tay, và ghi
   * đè lên là xoá việc của họ.
   */
  const tieuDe = (p.title ?? '').trim();
  if (tieuDe !== b.tieuDeCu.trim() && tieuDe !== b.tieuDeMoi.trim()) {
    boQua.push(`${b.slug}: tiêu đề trong DB là "${p.title}" — không phải tieuDeCu lẫn tieuDeMoi → BỎ QUA (có người đã sửa tay)`);
    continue;
  }

  let noiDung = p.content ?? '';
  const daThay = [];

  for (const [tim, doi] of b.thay ?? []) {
    const dem = noiDung.split(tim).length - 1;
    if (dem) noiDung = noiDung.split(tim).join(doi);
    daThay.push({ tim, dem, kieu: 'văn' });
  }
  for (const [tim, doi] of b.thayCum ?? []) {
    let dem = 0;
    const reg = reCum(tim);
    noiDung = noiDung.replace(reg, (khop) => {
      dem++;
      const hoa = khop[0] === khop[0].toUpperCase() && khop[0] !== khop[0].toLowerCase();
      return hoa ? doi.charAt(0).toUpperCase() + doi.slice(1) : doi;
    });
    daThay.push({ tim, dem, kieu: 'cụm' });
  }

  const moi = {
    title: b.tieuDeMoi,
    meta_title: b.tieuDeMoi,
    excerpt: b.excerptMoi,
    meta_description: b.metaDescriptionMoi,
    content: noiDung,
  };

  for (const cum of b.phaiSachCum ?? []) {
    const o = Object.entries(moi).filter(([, v]) => conCum(cum, v)).map(([k]) => k);
    if (!o.length) continue;
    loi.push(`${b.slug}: sau khi thay, "${cum}" VẪN CÒN ở ${o.join(', ')}`);
    const reg = reCum(cum);
    const ph = phang(moi.content);
    for (const m of ph.matchAll(reg)) {
      const i = m.index ?? 0;
      loi.push(`      ↳ …${ph.slice(Math.max(0, i - 90), i + m[0].length + 90)}…`);
    }
  }

  chuanBi.push({
    id: p.id, slug: b.slug, vi: b.vi, daThay,
    goc: { title: p.title, excerpt: p.excerpt, meta_title: p.meta_title, meta_description: p.meta_description, content: p.content },
    moi,
    soNhacTruoc: (phang(p.content).match(/Herm[eè]s/gi) || []).length,
    soNhacSau: (phang(noiDung).match(/Herm[eè]s/gi) || []).length,
  });
}

console.log('');
for (const b of boQua) console.log('—  ' + b);
if (boQua.length) console.log('');

for (const c of chuanBi) {
  console.log(`### ${c.slug}`);
  console.log(`    tiêu đề cũ : ${c.goc.title}`);
  console.log(`    tiêu đề mới: ${c.moi.title}`);
  console.log(`    nhắc Hermès: ${c.soNhacTruoc} → ${c.soNhacSau} lần (còn lại là câu sự thật về nhà mốt, cố ý giữ)`);
  const khong = c.daThay.filter((t) => t.dem === 0);
  const co = c.daThay.filter((t) => t.dem > 0);
  if (co.length) console.log(`    thay được  : ${co.map((t) => `"${t.tim}"×${t.dem}`).join('  ')}`);
  if (khong.length) console.log(`    ⚠ không khớp: ${khong.map((t) => `"${t.tim}"`).join('  ')}`);
  console.log('');
}

if (loi.length) {
  console.error('DỪNG CẢ LƯỢT — không ghi một dòng nào:');
  for (const l of loi) console.error('  · ' + l);
  await db.$disconnect();
  process.exit(1);
}
console.log('Kiểm cấu trúc sở hữu ("túi Hermès da…", "dây lưng Hermes"): sạch hết.');

const xem = chuanBi.map((c) => ({
  slug: c.slug, tieuDeMoi: c.moi.title, excerptMoi: c.moi.excerpt,
  truoc: phang(c.goc.content), sau: phang(c.moi.content),
}));
const tXem = path.resolve(import.meta.dirname, '_xem-bai-hermes.json');
fs.writeFileSync(tXem, JSON.stringify(xem, null, 2), 'utf8');
console.log(`Bản đọc lại → ${path.basename(tXem)}`);

if (!GHI) {
  console.log('\n(chạy thử — chưa ghi gì. Chạy lại với --ghi)');
  await db.$disconnect();
  process.exit(0);
}

const dau = new Date().toISOString().replace(/[:.]/g, '-');
const q = (s) => (s === null || s === undefined ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`);
const sql = chuanBi.map(
  (c) =>
    `UPDATE public.posts SET title=${q(c.goc.title)}, excerpt=${q(c.goc.excerpt)}, meta_title=${q(c.goc.meta_title)}, meta_description=${q(c.goc.meta_description)}, content=${q(c.goc.content)} WHERE id=${c.id}; -- ${c.slug}`,
);
const tep = path.resolve(import.meta.dirname, `_goc-bai-hermes-${dau}.sql`);
fs.writeFileSync(tep, sql.join('\n') + '\n', 'utf8');
console.log(`\nĐã chụp SQL hoàn tác → ${path.basename(tep)}`);

for (const c of chuanBi) {
  await db.posts.update({ where: { id: c.id }, data: c.moi });
  console.log(`✓ ${c.slug}`);
}
console.log(`\nĐã ghi ${chuanBi.length}/${BAI_HERMES.length} bài. Slug KHÔNG đổi — URL cũ vẫn sống.`);

await db.$disconnect();
