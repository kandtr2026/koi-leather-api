// Chỉ đọc: đo 4 bài Hermès hiện tại so với luật 30/08 (scripts/bai-hermes.data.mjs).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BAI_HERMES } from '../../scripts/bai-hermes.data.mjs';

const goc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const dong = fs.readFileSync(path.join(goc, '.env'), 'utf8').split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='));
process.env.DATABASE_URL = dong.slice('DATABASE_URL='.length).replace(/^["']|["']$/g, '');
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

const reCum = (c) => {
  const esc = c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  return new RegExp('(?<![\\p{L}])' + esc + '(?![\\p{L}])', 'giu');
};
const phang = (s) => String(s ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

for (const b of BAI_HERMES) {
  const r = await prisma.posts.findFirst({ where: { slug: b.slug } });
  const t = phang(r.content);
  const herm = (t.match(/herm[eè]s/gi) || []).length;
  const ban = b.phaiSachCum.map((c) => [c, (t.match(reCum(c)) || []).length]).filter((x) => x[1]);
  const thay = [...b.thay, ...b.thayCum].map(([c]) => [c, (t.match(reCum(c)) || []).length]).filter((x) => x[1]);
  console.log(`== ${b.slug} | title moi? ${r.title === b.tieuDeMoi} | Hermes ${herm} | ${t.length} ky tu`);
  console.log('   cum cam con:', JSON.stringify(ban));
  console.log('   cum se thay:', JSON.stringify(thay).slice(0, 600));
  for (const m of t.matchAll(/[^.!?]{0,80}chuyên sản xuất[^.!?]{0,80}/gi)) console.log('   >', m[0].trim().slice(0, 170));
}
await prisma.$disconnect();
