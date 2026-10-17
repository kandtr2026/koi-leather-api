// CHỈ ĐỌC: ai đã sửa nội dung gần đây (koi_content_revisions) + trang `pages` có class CSS của Mon.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const goc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const dong = fs.readFileSync(path.join(goc, '.env'), 'utf8').split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='));
process.env.DATABASE_URL = dong.slice('DATABASE_URL='.length).replace(/^["']|["']$/g, '');
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

const tu = new Date('2026-09-15T00:00:00Z');
const rev = await prisma.koiContentRevision.findMany({
  where: { createdAt: { gte: tu } },
  select: { kind: true, recordId: true, path: true, field: true, model: true, actor: true, createdAt: true, revertedAt: true },
  orderBy: { createdAt: 'asc' },
});
const nhom = {};
for (const r of rev) {
  const k = `${r.actor || '?'} | ${r.model || '?'}`;
  nhom[k] ??= { n: 0, duong: new Set() };
  nhom[k].n++;
  nhom[k].duong.add(`${r.kind}:${r.path || r.recordId}`);
}
console.log('revisions tu 15/09:', rev.length);
for (const [k, v] of Object.entries(nhom)) console.log(` ${k}: ${v.n} truong, ${v.duong.size} ban ghi`);
const duong = [...new Set(rev.filter((r) => !r.revertedAt).map((r) => `${r.createdAt.toISOString().slice(0, 10)} ${r.kind} ${r.path || r.recordId} [${r.field}] ${r.actor || ''}`))];
console.log(duong.slice(-60).join('\n'));

const LOP = ['atelier-lookbook', 'atelier-bento-grid', 'standards-grid', 'price-card', 'charm-gallery', 'koi-cta-box'];
const pages = await prisma.pages.findMany({ select: { id: true, slug: true, content: true, is_published: true } });
console.log('\npages:', pages.length);
for (const p of pages) {
  const lop = LOP.filter((l) => (p.content || '').includes(l));
  if (lop.length) console.log(' page', Number(p.id), p.slug, lop.join(','), (p.content || '').length);
}
await prisma.$disconnect();
