#!/usr/bin/env node
/**
 * Sửa văn phong mô tả sản phẩm trong DB — task koi-db-copy-review-20260922-002.
 *
 * ĐỢT 1: chỉ những phép sửa CỤC BỘ, tự kiểm được bằng máy — đại từ, cách xưng,
 * tên thương hiệu. Phần viết lại câu thổi phồng nằm ở đợt 2, vì 579/601 câu có
 * dấu hiệu là câu RIÊNG BIỆT (không phải khối lặp), nên không có phép thay thế
 * cơ học nào làm thay được; phải đọc từng câu.
 *
 * HAI CỘT PHẢI ĐI ĐÔI. product.service.ts nói rõ: `description` là cột
 * storefront đọc, `descriptionBlocks` là cột admin mở lại, và "không bao giờ
 * được lệch nhau". 256/537 sản phẩm có cả hai. Nên mỗi luật phải ăn ĐÚNG SỐ
 * LẦN ở cả hai cột; lệch một lần là bỏ qua cả dòng đó và ghi ra để soát tay,
 * thà sót còn hơn làm hai cột nói hai kiểu.
 *
 *   node tools/sua-copy-sp.mjs           # chạy thử, in ra từng chỗ sẽ đổi
 *   node tools/sua-copy-sp.mjs --ghi     # ghi thật (đã sao lưu trước)
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
const GHI = process.argv.includes('--ghi');

const { LUAT, che, moChe } = await import('./luat-copy.mjs');

/** Chạy hết luật lên một chuỗi, trả về chuỗi mới + số lần mỗi luật ăn. */
function apLuat(s) {
  const { ra, kho } = che(s);
  let t = ra;
  const dem = {};
  for (const l of LUAT) {
    let n = 0;
    t = t.replace(l.tim, (...a) => {
      n += 1;
      return typeof l.thay === 'function' ? l.thay(...a) : l.thay;
    });
    if (n) dem[l.ten] = n;
  }
  return { moi: moChe(t, kho), dem };
}

const dong = await prisma.$queryRawUnsafe(
  `select id::text, name::text, slug, description::text, "descriptionBlocks"::text
     from koi_free_style.koi_products where description is not null`,
);

let soDong = 0;
let soSua = 0;
const tongLuat = {};
const lech = [];
const nhatKy = [];

for (const d of dong) {
  const a = apLuat(d.description);
  if (!Object.keys(a.dem).length) continue;

  let b = null;
  if (d.descriptionBlocks) {
    b = apLuat(d.descriptionBlocks);
    // Guard: hai cột phải đổi y hệt nhau. Lệch = cấu trúc hai cột đã khác nhau
    // từ trước, sửa tiếp chỉ làm khác thêm.
    const khac = [...new Set([...Object.keys(a.dem), ...Object.keys(b.dem)])].filter(
      (k) => (a.dem[k] || 0) !== (b.dem[k] || 0),
    );
    if (khac.length) {
      lech.push({ slug: d.slug, luat: khac, desc: a.dem, blocks: b.dem });
      continue;
    }
  }

  // Hai cột khai là `text` trong Postgres, KHÔNG phải jsonb — dù nội dung phần
  // lớn là chuỗi JSON {"vi": "..."}. Một số dòng (Moneyclip, Túi Kelly…) là chữ
  // thường, không phải JSON.
  //
  // Nên không được ép ::jsonb khi ghi: dòng chữ thường thì câu lệnh lỗi hẳn,
  // còn dòng JSON thì Postgres parse rồi in lại, đổi luôn thứ tự khoá và khoảng
  // trắng so với bản gốc. Ghi thẳng text.
  //
  // Việc còn lại của chốt này: dòng nào VỐN là JSON thì sau khi sửa vẫn phải là
  // JSON. Dòng vốn là chữ thường thì không đòi hỏi gì.
  const laJson = (s) => {
    try {
      JSON.parse(s);
      return true;
    } catch {
      return false;
    }
  };
  const hong = [
    laJson(d.description) && !laJson(a.moi) ? 'description' : null,
    b && laJson(d.descriptionBlocks) && !laJson(b.moi) ? 'descriptionBlocks' : null,
  ].filter(Boolean);
  if (hong.length) {
    lech.push({ slug: d.slug, luat: [`JSON-VO:${hong.join('+')}`] });
    continue;
  }

  soDong += 1;
  for (const [k, n] of Object.entries(a.dem)) {
    tongLuat[k] = (tongLuat[k] || 0) + n;
    soSua += n;
  }
  nhatKy.push({ slug: d.slug, dem: a.dem });

  if (GHI) {
    if (b) {
      await prisma.$executeRawUnsafe(
        `update koi_free_style.koi_products set description = $1, "descriptionBlocks" = $2 where id = $3`,
        a.moi,
        b.moi,
        d.id,
      );
    } else {
      await prisma.$executeRawUnsafe(
        `update koi_free_style.koi_products set description = $1 where id = $2`,
        a.moi,
        d.id,
      );
    }
  }
}

console.log(`${GHI ? 'ĐÃ GHI' : 'CHẠY THỬ'} — ${soDong} sản phẩm, ${soSua} chỗ sửa\n`);
for (const [k, n] of Object.entries(tongLuat).sort((x, y) => y[1] - x[1])) {
  console.log(String(n).padStart(5), k);
}
if (lech.length) {
  console.log(`\n⚠ BỎ QUA ${lech.length} sản phẩm vì hai cột lệch nhau (phải soát tay):`);
  for (const x of lech.slice(0, 15)) console.log(`   ${x.slug}  —  ${x.luat.join(', ')}`);
}
fs.writeFileSync(path.join(goc, 'tools/_sua-copy-sp.json'), JSON.stringify({ tongLuat, nhatKy, lech }, null, 1));
await prisma.$disconnect();
