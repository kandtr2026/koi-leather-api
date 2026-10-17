// Đổi các câu bảo hành lệch trong bảng posts về đúng chính sách (A Khoa chốt 13/10/2026):
//  - đồ KOI làm: bảo hành 6 tháng (lib/doi-tra.ts SO_THANG_BAO_HANH)
//  - bài dịch vụ sửa / spa: "bảo hành kỹ thuật 3–6 tháng tùy hạng mục" (đúng landing /sua-chua-do-da/)
// Chỉ đổi CON SỐ / cụm bảo hành, không đụng câu chữ khác. Câu "trọn đời" cần viết lại (2527, 9039)
// và bài 14088 KHÔNG xử ở đây.
//   node tools/_tmp/doi-bao-hanh.mjs            # chạy thử: in từng chỗ đổi
//   node tools/_tmp/doi-bao-hanh.mjs --ghi      # ghi DB + sao lưu JSON + ghi koi_content_revisions (hoàn tác được)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const goc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const dong = fs.readFileSync(path.join(goc, '.env'), 'utf8').split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='));
process.env.DATABASE_URL = dong.slice('DATABASE_URL='.length).replace(/^["']|["']$/g, '');
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();
const GHI = process.argv.includes('--ghi');

const SUA_CHUA = new Set([10699n, 10789n, 10537n, 10654n]);
const BO_QUA = new Set([2527n, 9039n, 14088n]);
const T = '(?:<[^>]{0,80}>|\\s)*'; // thẻ inline / khoảng trắng chen giữa

function doi(v, suaChua) {
  let s = v;
  const moi = suaChua ? 'bảo hành kỹ thuật 3–6 tháng tùy hạng mục' : null;
  // "bảo hành [sản phẩm|cho sản phẩm|Spa – phục hồi] lên đến 24 tháng" / "bảo hành là 24 tháng"
  s = s.replace(
    new RegExp(`([Bb]ảo hành)(${T}(?:sản phẩm|cho sản phẩm|Spa – phục hồi)?${T})(lên đến|là)${T}(24|12)${T}tháng`, 'g'),
    (_m, bh, giua, dau) => (suaChua ? (bh[0] === 'B' ? 'B' : 'b') + moi.slice(1) : `${bh}${giua}${dau === 'là' ? 'là ' : ''}6 tháng`),
  );
  // Danh sách thông số: "Bảo hành: Lifetime" / "Bảo hành: 2 năm"
  s = s.replace(new RegExp(`(Bảo hành:)${T}(Lifetime|lifetime|2 năm|24 tháng)`, 'g'), '$1 6 tháng');
  // Ví Snap: "Bảo hành trọn đời chỉ đường may và lỗi sản xuất"
  s = s.replace(new RegExp(`(Bảo hành)${T}trọn đời(${T}chỉ đường may)`, 'g'), '$1 6 tháng$2');
  return s;
}

const tat = await prisma.posts.findMany({ select: { id: true, slug: true, content: true, excerpt: true, meta_description: true } });
const doiList = [];
for (const r of tat) {
  if (BO_QUA.has(r.id)) continue;
  for (const truong of ['content', 'excerpt', 'meta_description']) {
    const v = r[truong];
    if (!v) continue;
    const s = doi(v, SUA_CHUA.has(r.id));
    if (s !== v) doiList.push({ id: r.id, slug: r.slug, truong, truoc: v, sau: s });
  }
}
const tron = (x) => x.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
for (const d of doiList) {
  const a = tron(d.truoc), b = tron(d.sau);
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  console.log(`${d.id} ${d.truong} ${d.slug}\n   - …${a.slice(Math.max(0, i - 40), i + 50)}\n   + …${b.slice(Math.max(0, i - 40), i + 60)}`);
}
console.log('so truong doi:', doiList.length, '| so bai:', new Set(doiList.map((d) => d.id)).size);

if (GHI && doiList.length) {
  const batch = crypto.randomUUID();
  const sl = path.join(goc, 'tools', `_sao-luu-bao-hanh-${new Date().toISOString().slice(0, 10)}.json`);
  fs.writeFileSync(sl, JSON.stringify(doiList.map((d) => ({ id: String(d.id), slug: d.slug, truong: d.truong, truoc: d.truoc })), null, 1));
  for (const d of doiList) {
    await prisma.$transaction([
      prisma.posts.update({ where: { id: d.id }, data: { [d.truong]: d.sau } }),
      prisma.koiContentRevision.create({
        data: {
          batch, kind: 'post', recordId: String(d.id), path: `/${d.slug}/`, field: d.truong, before: d.truoc, after: d.sau,
          prompt: 'Đồng bộ bảo hành theo chính sách A Khoa chốt 13/10/2026: đồ KOI làm 6 tháng; sửa/spa 3–6 tháng tùy hạng mục (đúng /sua-chua-do-da/).',
          model: 'claude-opus-5-5 (thay số, không viết lại)', actor: 'claude@koileather (A Khoa giao 14/10/2026)',
        },
      }),
    ]);
  }
  console.log('DA GHI', doiList.length, 'truong | batch', batch, '| sao luu', sl);
}
await prisma.$disconnect();
