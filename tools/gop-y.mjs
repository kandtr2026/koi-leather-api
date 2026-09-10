#!/usr/bin/env node
/**
 * Đọc / đánh dấu góp ý A Khoa gửi từ ô nổi "Góp ý cho Claude".
 *
 * Ô đó nằm ở storefront (koi-storefront/src/components/gop-y-widget.tsx) và ở
 * SPA admin cũ (public/index.html); cả hai ghi vào `public.koi_gop_y`.
 *
 * Vì sao script nằm ở repo này chứ không phải storefront: bảng chỉ đọc được
 * bằng kết nối Postgres trực tiếp, mà DATABASE_URL nằm trong .env của repo này
 * (storefront chỉ nói chuyện với Supabase qua PostgREST).
 *
 *   node tools/gop-y.mjs            # góp ý CHƯA xử, cũ trước mới sau
 *   node tools/gop-y.mjs --tat-ca   # kể cả đã xử
 *   node tools/gop-y.mjs --xong 3 5 # đánh dấu #3 và #5 là đã xử
 *   node tools/gop-y.mjs --dem      # chỉ in số góp ý chưa xử (cho watcher)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const goc = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dongEnv = fs
  .readFileSync(path.join(goc, '.env'), 'utf8')
  .split(/\r?\n/)
  .find((l) => l.startsWith('DATABASE_URL='));
if (!dongEnv) {
  console.error('Không thấy DATABASE_URL trong .env');
  process.exit(1);
}
process.env.DATABASE_URL = dongEnv.slice('DATABASE_URL='.length).replace(/^["']|["']$/g, '');

const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

const argv = process.argv.slice(2);
const co = (c) => argv.includes(c);

try {
  if (co('--xong')) {
    const ids = argv
      .slice(argv.indexOf('--xong') + 1)
      .map((s) => Number(s))
      .filter((n) => Number.isInteger(n) && n > 0);
    if (!ids.length) {
      console.error('Thiếu id. Ví dụ: node tools/gop-y.mjs --xong 3 5');
      process.exit(1);
    }
    // Nội suy số nguyên đã lọc — không nhận chuỗi từ ngoài vào câu lệnh.
    const n = await prisma.$executeRawUnsafe(
      `update public.koi_gop_y set da_xu = true, xu_luc = now() where id in (${ids.join(',')})`,
    );
    console.log(`Đã đánh dấu xong ${n} góp ý: #${ids.join(' #')}`);
  } else if (co('--dem')) {
    const r = await prisma.$queryRawUnsafe(
      `select count(*)::int as n from public.koi_gop_y where da_xu = false`,
    );
    console.log(r[0].n);
  } else {
    const dieuKien = co('--tat-ca') ? '' : 'where da_xu = false';
    const r = await prisma.$queryRawUnsafe(
      `select id, luc, nguoi, duong_dan, tieu_de, da_xu, noi_dung
         from public.koi_gop_y ${dieuKien} order by id asc limit 50`,
    );
    if (!r.length) {
      console.log('Chưa có góp ý mới.');
    } else {
      console.log(`${r.length} góp ý${dieuKien ? ' CHƯA XỬ' : ''}:\n`);
      for (const d of r) {
        const gio = new Date(d.luc).toLocaleString('vi-VN');
        console.log(`#${d.id}  ${gio}  ${d.nguoi}${d.da_xu ? '  [đã xử]' : ''}`);
        console.log(`   màn: ${d.duong_dan}${d.tieu_de ? `  (${d.tieu_de})` : ''}`);
        console.log(`   ${d.noi_dung.replace(/\n/g, '\n   ')}\n`);
      }
    }
  }
} finally {
  await prisma.$disconnect();
}
