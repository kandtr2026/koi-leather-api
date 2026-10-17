// CHỈ ĐỌC: bảng public.page_faqs — đếm theo ngày tạo, in các dòng của vài đường dẫn.
// node tools/_tmp/xem-faq.mjs <ra.json> [/path/,...]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const goc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const dong = fs.readFileSync(path.join(goc, '.env'), 'utf8').split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='));
process.env.DATABASE_URL = dong.slice('DATABASE_URL='.length).replace(/^["']|["']$/g, '');
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();
const [, , ra, ds] = process.argv;
const theoNgay = await prisma.$queryRawUnsafe(`select to_char(created_at,'YYYY-MM-DD') d, status, count(*)::int n from public.page_faqs group by 1,2 order by 1 desc limit 30`);
console.log(theoNgay.map((r) => `${r.d} ${r.status} ${r.n}`).join('\n'));
const tong = await prisma.$queryRawUnsafe(`select count(*)::int n, count(distinct path)::int p from public.page_faqs`);
console.log('tong', tong[0]);
const paths = (ds || '').split(',').filter(Boolean);
const rows = paths.length
  ? await prisma.$queryRawUnsafe(`select id, path, question, answer, status, created_at from public.page_faqs where path = any($1::text[]) order by path, id`, paths)
  : [];
fs.writeFileSync(ra, JSON.stringify(rows.map((r) => ({ ...r, id: Number(r.id) })), null, 1));
console.log('dong FAQ cua cac duong dan:', rows.length);
await prisma.$disconnect();
