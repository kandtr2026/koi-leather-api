#!/usr/bin/env node
/**
 * Áp bảng viết lại câu — đợt 2 của koi-db-copy-review-20260922-002.
 *
 * Khác đợt 1 ở chỗ căn bản: đợt 1 là LUẬT (một mẫu, nhiều chỗ khớp), đợt này là
 * BẢNG (mỗi dòng đúng một câu, đọc rồi mới viết). Mon ràng như vậy vì 341 câu
 * còn lại là câu riêng biệt, mẫu chung nào cũng sẽ phá nghĩa ở đâu đó.
 *
 * Hai chốt an toàn giữ nguyên từ đợt 1:
 *  - description và descriptionBlocks phải đổi đúng số lần như nhau.
 *  - dòng nào VỐN là JSON thì sau khi sửa vẫn phải là JSON.
 *
 * Và một chốt riêng của đợt này: cặp nào KHÔNG khớp phải báo to kèm mã thoát
 * khác 0. Một cặp viết sai chính tả so với bản gốc sẽ lặng lẽ không làm gì, và
 * "chạy xong không lỗi" sẽ thành lời nói dối.
 *
 *   node tools/ap-phong.mjs        # chạy thử
 *   node tools/ap-phong.mjs --ghi
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

const { BANG } = await import('./bang-phong.mjs');
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();
const GHI = process.argv.includes('--ghi');

const laJson = (s) => {
  try {
    JSON.parse(s);
    return true;
  } catch {
    return false;
  }
};

const theoSlug = {};
for (const d of BANG) (theoSlug[d.slug] ||= []).push(d);

let soSua = 0;
let soDong = 0;
const khongKhop = [];
const lech = [];

for (const [slug, dsach] of Object.entries(theoSlug)) {
  const r = await prisma.$queryRawUnsafe(
    `select id, description::text, "descriptionBlocks"::text as b from koi_free_style.koi_products where slug = $1`,
    slug,
  );
  if (!r.length) {
    khongKhop.push({ slug, ly_do: 'không có sản phẩm này' });
    continue;
  }
  const x = r[0];
  let d = x.description;
  let b = x.b;
  let n = 0;

  for (const { truoc, sau } of dsach) {
    const nD = d.split(truoc).length - 1;
    const nB = b ? b.split(truoc).length - 1 : 0;
    if (!nD && !nB) {
      khongKhop.push({ slug, cau: truoc.slice(0, 70) });
      continue;
    }
    // Hai cột phải chứa câu đó cùng số lần, nếu không thì sửa xong sẽ lệch.
    if (b && nD !== nB) {
      lech.push({ slug, cau: truoc.slice(0, 55), desc: nD, blocks: nB });
      continue;
    }
    if (nD) d = d.split(truoc).join(sau);
    if (nB) b = b.split(truoc).join(sau);
    n += nD || nB;
  }

  if (!n) continue;
  if ((laJson(x.description) && !laJson(d)) || (b && laJson(x.b) && !laJson(b))) {
    lech.push({ slug, cau: 'JSON vỡ sau khi sửa — bỏ qua cả sản phẩm' });
    continue;
  }

  soDong += 1;
  soSua += n;
  if (GHI) {
    await prisma.$executeRawUnsafe(
      `update koi_free_style.koi_products set description = $1, "descriptionBlocks" = $2 where id = $3`,
      d,
      b,
      x.id,
    );
  }
}

console.log(`${GHI ? 'ĐÃ GHI' : 'CHẠY THỬ'} — ${soDong} sản phẩm, ${soSua} câu viết lại`);
if (lech.length) {
  console.log(`\n⚠ ${lech.length} câu bỏ qua vì hai cột lệch:`);
  for (const x of lech) console.log(`   ${x.slug}  desc=${x.desc} blocks=${x.blocks}  «${x.cau}»`);
}
if (khongKhop.length) {
  console.log(`\n❌ ${khongKhop.length} cặp KHÔNG KHỚP bản gốc (phải sửa lại bảng, đừng bỏ qua):`);
  for (const x of khongKhop) console.log(`   ${x.slug}  «${x.cau ?? x.ly_do}»`);
  process.exitCode = 2;
}
await prisma.$disconnect();
