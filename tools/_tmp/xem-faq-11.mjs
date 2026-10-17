// Chỉ đọc: dòng page_faqs #11 sau khi ghi.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const goc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const dong = fs.readFileSync(path.join(goc, '.env'), 'utf8').split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='));
process.env.DATABASE_URL = dong.slice('DATABASE_URL='.length).replace(/^["']|["']$/g, '');
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();
console.log(await prisma.$queryRawUnsafe('select id, path, status, question, left(answer, 90) as answer from public.page_faqs where id = 11'));
await prisma.$disconnect();
