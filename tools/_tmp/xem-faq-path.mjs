// Chỉ đọc: mọi dòng page_faqs của một path.  node tools/_tmp/xem-faq-path.mjs /duong-dan/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const goc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const dong = fs.readFileSync(path.join(goc, '.env'), 'utf8').split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='));
process.env.DATABASE_URL = dong.slice('DATABASE_URL='.length).replace(/^["']|["']$/g, '');
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();
const rows = await prisma.$queryRawUnsafe('select id, status, created_at, question, answer from public.page_faqs where path = $1 order by id', process.argv[2]);
for (const r of rows) console.log(`#${r.id} [${r.status}] ${String(r.created_at).slice(0, 15)}\nQ: ${r.question}\nA: ${r.answer}\n`);
await prisma.$disconnect();
