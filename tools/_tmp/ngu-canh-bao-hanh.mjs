// CHỈ ĐỌC: lấy ngữ cảnh HTML quanh mọi chỗ ghi bảo hành khác 6 tháng trong bảng posts.
// Ra: <thu-muc>/bao-hanh-ngu-canh.json  [{id, slug, pub, khop:[{doan, truoc, sau}]}]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const goc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const dong = fs.readFileSync(path.join(goc, '.env'), 'utf8').split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='));
process.env.DATABASE_URL = dong.slice('DATABASE_URL='.length).replace(/^["']|["']$/g, '');
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();
const ra = process.argv[2];

// Khớp trên HTML thô (thẻ có thể chen giữa) — cho phép tối đa vài thẻ inline.
const re = /(bảo hành|Bảo hành|BẢO HÀNH)((?:<[^>]{0,80}>|[^.<]){0,80}?)(lên đến\s*|là\s*|tới\s*|đến\s*)?(\d+)\s*(tháng|năm)|(bảo hành|Bảo hành)((?:<[^>]{0,80}>|[^.<]){0,40}?)(trọn đời|vĩnh viễn|Lifetime|lifetime)/g;
const tat = await prisma.posts.findMany({ select: { id: true, slug: true, content: true, is_published: true, excerpt: true, meta_description: true } });
const out = [];
for (const r of tat) {
  for (const [truong, v] of [['content', r.content], ['excerpt', r.excerpt], ['meta_description', r.meta_description]]) {
    if (!v) continue;
    const khop = [];
    for (const m of v.matchAll(re)) {
      const so = m[4] ? Number(m[4]) : null;
      if (so === 6 && m[5] === 'tháng') continue;
      khop.push({ doan: m[0], truoc: v.slice(Math.max(0, m.index - 160), m.index), sau: v.slice(m.index + m[0].length, m.index + m[0].length + 160) });
    }
    if (khop.length) out.push({ id: Number(r.id), slug: r.slug, pub: r.is_published, truong, khop });
  }
}
fs.writeFileSync(path.join(ra, 'bao-hanh-ngu-canh.json'), JSON.stringify(out, null, 1));
const dem = {};
for (const o of out) for (const k of o.khop) {
  const d = k.doan.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').toLowerCase();
  dem[d] = (dem[d] || 0) + 1;
}
console.log('ban ghi/truong:', out.length);
for (const [d, n] of Object.entries(dem).sort((a, b) => b[1] - a[1])) console.log(String(n).padStart(3), '|', d);
await prisma.$disconnect();
