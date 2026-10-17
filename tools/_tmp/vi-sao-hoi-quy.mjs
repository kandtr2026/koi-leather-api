// Chỉ đọc: tìm vì sao 4 bài Hermès quay về bản trước 30/08 — xem bảng sao lưu copy 22/09 và mọi dòng revision.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const goc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const dong = fs.readFileSync(path.join(goc, '.env'), 'utf8').split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='));
process.env.DATABASE_URL = dong.slice('DATABASE_URL='.length).replace(/^["']|["']$/g, '');
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();
const IDS = ['11780', '12581', '12649', '12741'];
const dem = (s) => (String(s ?? '').match(/herm[eè]s/gi) || []).length;

const cot = await prisma.$queryRawUnsafe(`select column_name from information_schema.columns
  where table_schema='koi_free_style' and table_name='koi_copy_backup_20260922' order by ordinal_position`);
console.log('cot backup 22/09:', cot.map((c) => c.column_name).join(', '));

const rev = await prisma.$queryRawUnsafe(`select "recordId", field, actor, "createdAt", before, after
  from koi_free_style.koi_content_revisions where "recordId" = any($1) order by "createdAt"`, IDS);
console.log('revision cho 4 bai:', rev.length);
for (const r of rev) console.log(' ', r.recordId, r.field, String(r.createdAt).slice(0, 24), r.actor, 'hermes', dem(r.before), '->', dem(r.after));

const tim = await prisma.$queryRawUnsafe(`select table_schema||'.'||table_name t from information_schema.columns
  where column_name in ('record_id','recordId','row_id','post_id') and table_schema not in ('pg_catalog','information_schema') group by 1`);
console.log('bang co cot id ban ghi:', tim.map((x) => x.t).join(', '));
await prisma.$disconnect();
