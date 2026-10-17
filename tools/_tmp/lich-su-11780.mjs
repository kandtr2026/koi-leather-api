// Chỉ đọc: lịch sử sửa bài 11780 (dat-lam-day-lung-hermes) trong koi_content_revisions + bảng sao lưu copy.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const goc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const dong = fs.readFileSync(path.join(goc, '.env'), 'utf8').split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='));
process.env.DATABASE_URL = dong.slice('DATABASE_URL='.length).replace(/^["']|["']$/g, '');
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();
const id = process.argv[2] || '11780';
const rev = await prisma.$queryRawUnsafe(`select id, batch, field, actor, "createdAt", length(before) lb, length(after) la, left(prompt, 80) p
  from koi_free_style.koi_content_revisions where "recordId" = $1 order by "createdAt"`, id);
for (const r of rev) console.log(String(r.createdAt).slice(0, 24), r.field, r.lb, '->', r.la, '|', r.actor, '|', r.p);
const bk = await prisma.$queryRawUnsafe(`select table_schema, table_name from information_schema.tables where table_name ilike '%backup%' or table_name ilike '%sao_luu%' order by 1,2`);
console.log('bang sao luu:', bk.map((b) => `${b.table_schema}.${b.table_name}`).join(', '));
await prisma.$disconnect();
