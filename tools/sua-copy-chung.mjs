#!/usr/bin/env node
/**
 * Áp bộ luật văn phong lên MỘT bảng / MỘT nhóm cột bất kỳ — task
 * koi-db-copy-review-20260922-002.
 *
 * Dùng chung `luat-copy.mjs` với bản sửa mô tả sản phẩm, nên không có chuyện
 * hai nơi hiểu "đúng văn phong" theo hai kiểu.
 *
 * VÌ SAO CÓ THAM SỐ --nhom: Mon phân xử rõ là chữ "bạn" trong BÀI BLOG được
 * giữ khi nó là giọng người viết nói với người đọc ("Bài viết giúp bạn phân
 * biệt da thật"), chỉ sửa ở đoạn bán hàng. Nên với public.posts em chỉ chạy
 * nhóm brand + xung, KHÔNG chạy nhóm ban.
 *
 *   node tools/sua-copy-chung.mjs public.pages content,title --nhom brand,xung
 *   node tools/sua-copy-chung.mjs public.pages content --nhom all --ghi
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

const { LUAT, che, moChe } = await import('./luat-copy.mjs');
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

const [bang, cotCsv] = process.argv.slice(2);
if (!bang || !cotCsv) {
  console.error('Thiếu tham số. Ví dụ: node tools/sua-copy-chung.mjs public.pages content,title --nhom brand,xung');
  process.exit(1);
}
const COT = cotCsv.split(',').map((s) => s.trim()).filter(Boolean);
const i = process.argv.indexOf('--nhom');
const NHOM = i === -1 ? ['brand', 'xung'] : process.argv[i + 1].split(',').map((s) => s.trim());
const DUNG = LUAT.filter((l) => NHOM.includes('all') || NHOM.includes(l.nhom));
const GHI = process.argv.includes('--ghi');
const XEM = process.argv.includes('--xem');

const boc = (s) => s.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

function apLuat(s) {
  const { ra, kho } = che(s);
  let t = ra;
  const dem = {};
  const viDu = [];
  for (const l of DUNG) {
    l.tim.lastIndex = 0;
    const khop = [...t.matchAll(l.tim)];
    if (!khop.length) continue;
    const truoc = t;
    t = t.replace(l.tim, (...a) => (typeof l.thay === 'function' ? l.thay(...a) : l.thay));
    dem[l.ten] = khop.length;
    const m = khop[0];
    viDu.push({
      luat: l.ten,
      truoc: boc(moChe(truoc.slice(Math.max(0, m.index - 80), m.index + m[0].length + 80), kho)),
      sau: boc(moChe(t.slice(Math.max(0, m.index - 80), m.index + m[0].length + 80), kho)),
    });
  }
  return { moi: moChe(t, kho), dem, viDu };
}

/**
 * Bỏ qua theo slug — dùng cho DỮ LIỆU CHẾT.
 *
 * Nhiều trang WordPress di trú vẫn nằm trong public.pages nhưng KHÔNG còn hiện
 * ra: koileather.com đã có route Next thật trùng slug, và route tĩnh thắng
 * [slug]. Kiểm bằng cách so tiêu đề DB với <title> trên web thật — ví dụ
 * /chinh-sach-giao-hang/ trong DB là "Chính Sách Giao Hàng" còn web trả "Chính
 * sách giao hàng", tức là hai nguồn khác nhau. Sửa những dòng đó chỉ làm bẩn
 * lịch sử dữ liệu mà không đổi được chữ nào trên web.
 */
const j = process.argv.indexOf('--bo-slug');
const BO_SLUG = j === -1 ? [] : process.argv[j + 1].split(',').map((s) => s.trim());
const coSlug = BO_SLUG.length > 0;

const dong = await prisma.$queryRawUnsafe(
  `select id::text as _id${coSlug ? ', slug' : ''}, ${COT.map((c) => `"${c}"::text as "${c}"`).join(', ')} from ${bang}`,
);

const tong = {};
let soDong = 0;
let soSua = 0;
const daIn = {};

let soBoQua = 0;
for (const d of dong) {
  if (coSlug && BO_SLUG.includes(d.slug)) {
    soBoQua += 1;
    continue;
  }
  const dat = {};
  let coGi = false;
  for (const c of COT) {
    if (d[c] == null) continue;
    const k = apLuat(d[c]);
    if (!Object.keys(k.dem).length) continue;
    dat[c] = k.moi;
    coGi = true;
    for (const [ten, n] of Object.entries(k.dem)) {
      tong[ten] = (tong[ten] || 0) + n;
      soSua += n;
    }
    if (XEM) {
      for (const v of k.viDu) {
        if ((daIn[v.luat] || 0) >= 2) continue;
        daIn[v.luat] = (daIn[v.luat] || 0) + 1;
        console.log(`\n[${v.luat}] ${bang}.${c} #${d._id}`);
        console.log(`  TRƯỚC: …${v.truoc}…`);
        console.log(`  SAU  : …${v.sau}…`);
      }
    }
  }
  if (!coGi) continue;
  soDong += 1;

  if (GHI) {
    const cot = Object.keys(dat);
    await prisma.$executeRawUnsafe(
      `update ${bang} set ${cot.map((c, j) => `"${c}" = $${j + 1}`).join(', ')} where id::text = $${cot.length + 1}`,
      ...cot.map((c) => dat[c]),
      d._id,
    );
  }
}

console.log(`\n${GHI ? 'ĐÃ GHI' : 'CHẠY THỬ'} — ${bang} [${COT.join(', ')}] nhóm=${NHOM.join('+')}`);
console.log(`${soDong} dòng, ${soSua} chỗ sửa${soBoQua ? `, bỏ qua ${soBoQua} dòng dữ liệu chết` : ''}\n`);
for (const [k, n] of Object.entries(tong).sort((a, b) => b[1] - a[1])) console.log(String(n).padStart(5), k);
await prisma.$disconnect();
