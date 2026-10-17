// CHỈ ĐỌC: xuất bài blog ra file để soát (HTML gốc + chữ trơn), và liệt kê mọi bài còn ghi
// bảo hành khác 6 tháng. Dùng: node tools/_tmp/xuat-bai.mjs <thu-muc-ra> <id,id,...>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const goc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const dong = fs.readFileSync(path.join(goc, '.env'), 'utf8').split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='));
process.env.DATABASE_URL = dong.slice('DATABASE_URL='.length).replace(/^["']|["']$/g, '');
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

const [, , ra, dsId] = process.argv;
fs.mkdirSync(path.join(ra, 'bai'), { recursive: true });
const tron = (h) =>
  (h || '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .replace(/<img[^>]*alt="([^"]*)"[^>]*>/gi, '\n[ẢNH: $1]\n')
    .replace(/<\/(p|h\d|li|div|tr|figcaption|blockquote)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;|&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();

const ids = dsId.split(',').map((x) => BigInt(x));
const rows = await prisma.posts.findMany({ where: { id: { in: ids } } });
for (const r of rows) {
  const ten = `${r.id}-${r.slug}`;
  fs.writeFileSync(path.join(ra, 'bai', `${ten}.html`), r.content || '');
  fs.writeFileSync(
    path.join(ra, 'bai', `${ten}.txt`),
    `URL: https://koileather.com/${r.slug}/\nTIÊU ĐỀ: ${r.title}\nMETA TITLE: ${r.meta_title || ''}\nMETA DESC: ${r.meta_description || ''}\nEXCERPT: ${r.excerpt || ''}\nẢNH BÌA: ${r.cover_image || ''}\n\n${tron(r.content)}\n`,
  );
}
console.log('xuat', rows.length, 'bai');

// Bảo hành khác 6 tháng trong mọi bài đang đăng.
const tat = await prisma.posts.findMany({ select: { id: true, slug: true, content: true, is_published: true } });
const re = /bảo hành[^.<]{0,60}?(\d+\s*(tháng|năm)|trọn đời|vĩnh viễn|lifetime)|(\d+\s*(tháng|năm)|trọn đời|lifetime)[^.<]{0,30}bảo hành/gi;
const bh = [];
for (const r of tat) {
  const c = tron(r.content);
  const m = [...c.matchAll(re)].map((x) => x[0]).filter((s) => !/\b6\s*tháng|sáu tháng/i.test(s));
  if (m.length) bh.push({ id: Number(r.id), slug: r.slug, pub: r.is_published, cau: m });
}
fs.writeFileSync(path.join(ra, 'bao-hanh-lech.json'), JSON.stringify(bh, null, 1));
console.log('bai co bao hanh khac 6 thang:', bh.length);
await prisma.$disconnect();
