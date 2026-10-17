// Chỉ đọc: so content hiện tại trong DB với bản đã xuất (bai/<id>-*.html) — phát hiện ai sửa bài sau lúc xuất.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const goc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const dong = fs.readFileSync(path.join(goc, '.env'), 'utf8').split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='));
process.env.DATABASE_URL = dong.slice('DATABASE_URL='.length).replace(/^["']|["']$/g, '');
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();
const BAI = 'E:/Claude A Khoa Processing/koi-storefront/.codex-temp/content-refactor/bai';
const files = fs.readdirSync(BAI);
for (const id of [14083, 14084, 14085, 14086, 14087, 14088, 11709, 11711, 9937, 8049, 7640, 10383]) {
  const r = await prisma.posts.findUnique({ where: { id: BigInt(id) }, select: { content: true, is_published: true } });
  const f = files.find((x) => x.startsWith(`${id}-`) && x.endsWith('.html'));
  const xuat = fs.readFileSync(path.join(BAI, f), 'utf8');
  console.log(id, r.is_published, r.content === xuat ? 'GIONG ban xuat' : `KHAC ban xuat (db ${r.content.length} / xuat ${xuat.length})`);
}
await prisma.$disconnect();
