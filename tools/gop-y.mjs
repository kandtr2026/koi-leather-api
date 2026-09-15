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

/**
 * Chạy một truy vấn, thử lại khi pooler từ chối.
 *
 * VÌ SAO CÓ HÀM NÀY (dính thật 15/09/2026): pooler Supabase ở session mode thỉnh
 * thoảng từ chối một nhịp rồi tự hồi — "Can't reach database server at
 * aws-1-ap-south-1.pooler.supabase.com:5432". Lúc đó Prisma ném ra một stack
 * trace dài mấy trăm dòng, và watcher thường đọc kết quả qua `| tail -20` nên
 * chỉ thấy phần đuôi. Nguy hiểm ở chỗ: một lần đọc hỏng rất dễ bị hiểu thành
 * "chưa có góp ý mới", tức là góp ý thật của A Khoa nằm đó mà không ai xử.
 *
 * Nên hỏng thì phải hỏng TO và RÕ: một dòng bắt đầu bằng "LỖI", nói thẳng đừng
 * hiểu là hàng chờ trống, kèm mã thoát khác 0.
 */
async function thu(fn, lan = 3) {
  for (let i = 1; i <= lan; i += 1) {
    try {
      return await fn();
    } catch (e) {
      if (i === lan) {
        // Lấy dòng NÓI ĐƯỢC ĐIỀU GÌ. Prisma mở đầu bằng một dòng tiêu đề cụt
        // ("Invalid `prisma.$queryRawUnsafe()` invocation:") rồi mới tới nguyên
        // nhân thật ở dưới ("Can't reach database server at ..."). Nên bỏ qua
        // dòng kết thúc bằng dấu hai chấm và dòng stack, lấy dòng đầu còn lại.
        const dong = String(e?.message ?? e)
          .split('\n')
          .map((d) => d.trim())
          .filter(Boolean);
        const loi =
          dong.find((d) => !d.endsWith(':') && !d.startsWith('at ')) ?? dong[0] ?? String(e);
        console.error(`LỖI: KHÔNG ĐỌC ĐƯỢC HÀNG CHỜ GÓP Ý (đã thử ${lan} lần) — ${loi}`);
        console.error('ĐỪNG hiểu là "chưa có góp ý mới": hàng chờ chưa đọc được lần nào.');
        process.exitCode = 2;
        return null;
      }
      await new Promise((r) => setTimeout(r, 2000 * i));
    }
  }
  return null;
}

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
    const n = await thu(() =>
      prisma.$executeRawUnsafe(
        `update public.koi_gop_y set da_xu = true, xu_luc = now() where id in (${ids.join(',')})`,
      ),
    );
    if (n !== null) console.log(`Đã đánh dấu xong ${n} góp ý: #${ids.join(' #')}`);
  } else if (co('--dem')) {
    const r = await thu(() =>
      prisma.$queryRawUnsafe(
        `select count(*)::int as n from public.koi_gop_y where da_xu = false`,
      ),
    );
    if (r !== null) console.log(r[0].n);
  } else {
    const dieuKien = co('--tat-ca') ? '' : 'where da_xu = false';
    const r = await thu(() =>
      prisma.$queryRawUnsafe(
        `select id, luc, nguoi, duong_dan, tieu_de, da_xu, noi_dung
           from public.koi_gop_y ${dieuKien} order by id asc limit 50`,
      ),
    );
    if (r === null) {
      // thu() đã in lỗi và đặt mã thoát — tuyệt đối không in "chưa có góp ý mới".
    } else if (!r.length) {
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
