// Đợt 2 — ghi bản đã soát (koi-storefront/.codex-temp/content-refactor/dot2/sua) vào DB.
//  - posts: content (sua/<id>.html) + title/meta_title/meta_description/excerpt (sua/<id>.fields.json)
//  - public.page_faqs: question/answer (sua/page-faqs.<ban>.json → rows)
// Mỗi trường đổi → 1 dòng koi_content_revisions (hoàn tác được ở admin) + sao lưu JSON.
//   node tools/_tmp/ghi-noi-dung-dot2.mjs -          # chạy thử, in tóm tắt
//   node tools/_tmp/ghi-noi-dung-dot2.mjs - --ghi    # ghi thật (CHỈ khi A Khoa đã gật)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const goc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const dong = fs.readFileSync(path.join(goc, '.env'), 'utf8').split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='));
process.env.DATABASE_URL = dong.slice('DATABASE_URL='.length).replace(/^["']|["']$/g, '');
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();
const SUA = 'E:/Claude A Khoa Processing/koi-storefront/.codex-temp/content-refactor/dot2/sua';
const banFaq = process.argv[2] || 'v3';
const GHI = process.argv.includes('--ghi');
const IDS = [11780, 12581, 12649, 12741, 10699, 10576, 10698, 10564, 10789, 10537, 10787, 2527];
const TRUONG = ['title', 'meta_title', 'meta_description', 'excerpt'];

const doi = [];
for (const id of IDS) {
  const r = await prisma.posts.findUnique({ where: { id: BigInt(id) } });
  if (!r) throw new Error(`khong thay bai ${id}`);
  const moi = {};
  const html = path.join(SUA, `${id}.html`);
  if (fs.existsSync(html)) moi.content = fs.readFileSync(html, 'utf8');
  const fj = path.join(SUA, `${id}.fields.json`);
  if (fs.existsSync(fj)) {
    const f = JSON.parse(fs.readFileSync(fj, 'utf8'));
    for (const t of TRUONG) if (typeof f[t] === 'string' && f[t].trim()) moi[t] = f[t].trim();
  }
  for (const [t, v] of Object.entries(moi)) if (v !== r[t]) doi.push({ kind: 'post', id, slug: r.slug, field: t, before: r[t], after: v });
}
const fq = path.join(SUA, `page-faqs.${banFaq}.json`);
if (fs.existsSync(fq)) {
  for (const row of JSON.parse(fs.readFileSync(fq, 'utf8')).rows || []) {
    const [cu] = await prisma.$queryRawUnsafe('select id, path, question, answer from public.page_faqs where id = $1', row.id);
    if (!cu) throw new Error(`khong thay faq ${row.id}`);
    for (const t of ['question', 'answer']) if (row[t] && row[t] !== cu[t]) doi.push({ kind: 'page_faq', id: row.id, slug: cu.path, field: t, before: cu[t], after: row[t] });
  }
}
for (const d of doi) console.log(`${d.kind} ${d.id} ${d.slug} [${d.field}] ${String(d.before ?? '').length}→${d.after.length} ky tu`);
console.log('tong truong doi:', doi.length);

if (GHI && doi.length) {
  const batch = crypto.randomUUID();
  const sl = path.join(goc, 'tools', `_sao-luu-noi-dung-dot2-${Date.now()}.json`);
  fs.writeFileSync(sl, JSON.stringify(doi.map(({ after, ...x }) => x), null, 1));
  for (const d of doi) {
    if (d.kind === 'post') {
      await prisma.$transaction([
        prisma.posts.update({ where: { id: BigInt(d.id) }, data: { [d.field]: d.after } }),
        prisma.koiContentRevision.create({ data: { batch, kind: 'post', recordId: String(d.id), path: `/${d.slug}/`, field: d.field, before: d.before, after: d.after, prompt: 'Đợt 2 refactor nội dung (A Khoa giao 17/10/2026): áp lại luật thương hiệu 30/08 cho 4 bài Hermès, sửa 7 bài sửa túi hiệu, bảo hành bài 2527; soát nguồn + phản biện, Gemini viết lại.', model: 'gemini-3.8-flash-high + claude-opus-5-5 (soát)', actor: 'claude@koileather (A Khoa duyệt)' } }),
      ]);
    } else {
      if (d.field === 'question') {
        // question_norm phải khớp normalizeQuestion() ở koi-storefront/src/lib/page-faqs.ts (dùng để chống trùng).
        const norm = d.after.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd')
          .replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
        await prisma.$executeRawUnsafe('update public.page_faqs set question = $1, question_norm = $2 where id = $3', d.after, norm, d.id);
      } else {
        await prisma.$executeRawUnsafe('update public.page_faqs set answer = $1 where id = $2', d.after, d.id);
      }
    }
  }
  console.log('DA GHI', doi.length, 'truong | batch', batch, '| sao luu', sl);
}
await prisma.$disconnect();
