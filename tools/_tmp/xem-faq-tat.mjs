import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const goc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const dong = fs.readFileSync(path.join(goc, '.env'), 'utf8').split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='));
process.env.DATABASE_URL = dong.slice('DATABASE_URL='.length).replace(/^["']|["']$/g, '');
const { PrismaClient } = await import('@prisma/client'); const prisma = new PrismaClient();
const rows = await prisma.$queryRawUnsafe(`select id, path, question, answer, status, created_at from public.page_faqs order by created_at`);
fs.writeFileSync(process.argv[2], JSON.stringify(rows.map((r) => ({ ...r, id: Number(r.id) })), null, 1));
for (const r of rows) console.log(Number(r.id), String(r.created_at.toISOString()).slice(0,10), r.status, r.path, '| Q:', r.question.slice(0,90));
await prisma.$disconnect();
