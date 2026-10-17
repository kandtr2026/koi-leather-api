// Chỉ đọc: liệt kê bài cho đợt 2 (túi Hermès, dây lưng Hermès, sửa túi Dior/LV và họ hàng).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const goc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const dong = fs.readFileSync(path.join(goc, '.env'), 'utf8').split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='));
process.env.DATABASE_URL = dong.slice('DATABASE_URL='.length).replace(/^["']|["']$/g, '');
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();
const rows = await prisma.$queryRawUnsafe(`
  select id, slug, is_published, length(content) as len, left(title, 90) as title
  from public.posts
  where slug ilike 'tui-hermes%' or slug ilike '%hermes%' or slug ilike '%dior%' or slug ilike '%-lv%' or slug ilike '%louis%'
     or slug ilike '%chanel%' or slug ilike '%gucci%' or slug ilike 'sua-tui%' or slug ilike 'spa-tui%'
  order by slug`);
for (const r of rows) console.log(String(r.id).padStart(6), r.is_published ? 'PUB' : '---', String(r.len).padStart(6), r.slug, '|', r.title);
console.log('tong', rows.length);
await prisma.$disconnect();
