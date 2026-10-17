// Chỉ đọc: bảng sao lưu copy 22/09 có giữ content 4 bài Hermès không, bản đó nhắc Hermès bao nhiêu lần.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const goc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const dong = fs.readFileSync(path.join(goc, '.env'), 'utf8').split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='));
process.env.DATABASE_URL = dong.slice('DATABASE_URL='.length).replace(/^["']|["']$/g, '');
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();
const dem = (s) => (String(s ?? '').match(/herm[eè]s/gi) || []).length;
const rows = await prisma.$queryRawUnsafe(`select luc, dot, bang, khoa, cot, gia_tri_cu from koi_free_style.koi_copy_backup_20260922
  where khoa in ('11780','12581','12649','12741') or khoa ilike '%hermes%' order by luc`);
console.log('dong backup 22/09 cho 4 bai:', rows.length);
for (const r of rows) console.log(' ', String(r.luc).slice(0, 24), r.dot, r.bang, r.khoa, r.cot, 'hermes trong gia_tri_cu:', dem(r.gia_tri_cu), 'len', String(r.gia_tri_cu ?? '').length);
const dots = await prisma.$queryRawUnsafe(`select dot, bang, cot, count(*)::int n, min(luc) a from koi_free_style.koi_copy_backup_20260922 group by 1,2,3 order by a`);
console.log('cac dot trong backup:');
for (const d of dots) console.log(' ', String(d.a).slice(0, 24), d.dot, d.bang, d.cot, d.n);
await prisma.$disconnect();
