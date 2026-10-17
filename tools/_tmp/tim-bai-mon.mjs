// CHỈ ĐỌC: tìm bài blog Mon (Hermes) mới viết / mới sửa — theo ngày tạo/đăng gần đây
// hoặc có class CSS Mon thêm cuối 09/2026 (atelier-lookbook, standards-grid, price-card,
// charm-gallery, koi-cta-box). In id, slug, ngày, độ dài và class nào xuất hiện.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const goc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const dong = fs.readFileSync(path.join(goc, '.env'), 'utf8').split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='));
process.env.DATABASE_URL = dong.slice('DATABASE_URL='.length).replace(/^["']|["']$/g, '');
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

const LOP = ['atelier-lookbook', 'atelier-bento-grid', 'standards-grid', 'price-card', 'charm-gallery', 'koi-cta-box'];
const tu = new Date(process.argv[2] || '2026-09-15T00:00:00Z');
const rows = await prisma.posts.findMany({
  select: { id: true, slug: true, title: true, is_published: true, published_at: true, created_at: true, content: true },
});
const ra = [];
for (const r of rows) {
  const c = r.content || '';
  const lop = LOP.filter((l) => c.includes(l));
  const moi = (r.created_at && r.created_at >= tu) || (r.published_at && r.published_at >= tu);
  if (!lop.length && !moi) continue;
  ra.push({
    id: Number(r.id), slug: r.slug, title: r.title, pub: r.is_published,
    tao: r.created_at?.toISOString().slice(0, 10), dang: r.published_at?.toISOString().slice(0, 10),
    kytu: c.length, lop: lop.join(','),
  });
}
ra.sort((a, b) => String(b.tao).localeCompare(String(a.tao)));
fs.writeFileSync(path.join(goc, 'tools', '_tmp', 'bai-mon.json'), JSON.stringify(ra, null, 1));
console.log('tong bai:', rows.length, '| khop:', ra.length);
for (const r of ra) console.log(r.id, r.tao, r.dang, r.pub ? 'pub' : 'nhap', r.kytu, r.lop || '-', '|', r.slug);
await prisma.$disconnect();
