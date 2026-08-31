/**
 * Rà và sửa toàn bộ link /cua-hang/<slug>/ trong nội dung cũ (pages + posts).
 *
 *   node scripts/sua-link-san-pham-trong-content.mjs            # chạy thử, KHÔNG ghi
 *   node scripts/sua-link-san-pham-trong-content.mjs --ghi      # ghi thật
 *
 * QUY TRÌNH:
 *   A. Quét MỌI doc trong DB (decoded, sạch) → gom slug + tên sản phẩm (aria/img/text).
 *   B. Resolve từng slug MỘT LẦN (đồng nhất mọi anchor cùng slug):
 *        1. slug còn trong koiProduct ACTIVE                      → GIỮ
 *        2. có trong slug-redirects.csv và đích ACTIVE             → ĐỔI
 *        3. match tên sản phẩm (đúng 1 sản phẩm / nhiều thì ưu slug chứa old) → ĐỔI
 *        4. không khớp                                            → GỠ (unwrap <a>)
 *   C. Áp resolution đó lên DB (pages/posts) + pages.json + posts.json
 *      (thay chuỗi trên text thô, giữ nguyên format file).
 *   D. Ghi --ghi. Chạy không cờ = chỉ in báo cáo.
 */
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

const env = fs.readFileSync(path.resolve(import.meta.dirname, '..', '.env'), 'utf8');
for (const line of env.split(/\r?\n/)) {
  const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const CO = new Set(process.argv.slice(2));
for (const c of CO) { if (c !== '--ghi') { console.error(`Cờ lạ: ${c}. Chỉ nhận --ghi.`); process.exit(1); } }
const GHI = CO.has('--ghi');

const DATA_DIR = 'E:/Claude A Khoa Processing/koi-leather-data/data';
const PAGES_JSON = `${DATA_DIR}/pages.json`;
const POSTS_JSON = `${DATA_DIR}/posts.json`;
const REDIRECTS_CSV = `${DATA_DIR}/slug-redirects.csv`;

function chuan(s) {
  return (s ?? '').toLowerCase()
    .replace(/&amp;/g, '&').replace(/&#8211;/g, '-').replace(/&#8230;/g, '…')
    .replace(/[–—]/g, '-').replace(/ - koi leather.*$/i, '').replace(/ - hinh.*$/i, '')
    .replace(/\s+/g, ' ').trim();
}

const db = new PrismaClient();

// ---- 1. Redirect map ----
const redirectMap = new Map();
for (const line of fs.readFileSync(REDIRECTS_CSV, 'utf8').split(/\r?\n/).slice(1)) {
  if (!line.trim()) continue;
  const cols = line.split(',');
  if (cols.length >= 2) redirectMap.set(cols[0].trim().toLowerCase(), cols[1].trim().toLowerCase());
}
console.log(`Redirect map: ${redirectMap.size} cặp`);

// ---- 2. Sản phẩm ACTIVE + index tên ----
const active = await db.koiProduct.findMany({ where: { isDeleted: false, status: 'ACTIVE' }, select: { slug: true, name: true } });
const activeSet = new Set(active.map(x => x.slug.toLowerCase()));
function tenOf(p) {
  const s = typeof p.name === 'string' ? p.name : JSON.stringify(p.name ?? '');
  try { const o = JSON.parse(s); return o?.vi ?? o?.en ?? o?.name ?? s; } catch { return s; }
}
const byName = new Map();
for (const p of active) {
  const chu = chuan(tenOf(p));
  if (!byName.has(chu)) byName.set(chu, []);
  byName.get(chu).push(p.slug.toLowerCase());
}
console.log(`Sản phẩm ACTIVE: ${active.length}`);

// ---- 3. Scanner: tìm anchor cua-hang trong text (decoded HOẶC escaped) ----
const RE_HREF = /cua-hang\/([a-z0-9\-%]+)\/?/gi;
const OPEN_RE = /<a\b/gi;
const OPEN_ESC_RE = /\\u003ca\b/gi;
function timOpenStart(text, urlIdx) {
  let best = -1; const before = text.slice(0, urlIdx); let m;
  OPEN_RE.lastIndex = 0; while ((m = OPEN_RE.exec(before)) !== null) best = m.index;
  OPEN_ESC_RE.lastIndex = 0; while ((m = OPEN_ESC_RE.exec(before)) !== null) best = Math.max(best, m.index);
  return best;
}
function timTagEnd(text, openStart) {
  const gt = text.indexOf('>', openStart);
  const esc = text.indexOf('\\u003e', openStart);
  const idx = esc === -1 ? gt : (gt === -1 ? esc : Math.min(gt, esc));
  return idx;
}
function timClose(text, urlIdx) {
  let gt = text.indexOf('</a>', urlIdx);
  let esc = text.indexOf('\\u003c/a\\u003e', urlIdx);
  if (gt === -1) gt = Infinity; if (esc === -1) esc = Infinity;
  const start = Math.min(gt, esc);
  if (start === Infinity) return null;
  return { start, end: start + (start === gt ? 4 : 14) };
}
// Quét mọi anchor, gọi callback với { slug, openStart, tagEnd, close, inner, anchorText }
function quetAnchors(text, cb) {
  let i = 0;
  while (true) {
    RE_HREF.lastIndex = i;
    const m = RE_HREF.exec(text);
    if (!m) break;
    const slug = m[1].toLowerCase();
    const openStart = timOpenStart(text, m.index);
    const tagEnd = timTagEnd(text, openStart);
    const close = timClose(text, m.index);
    if (openStart === -1 || tagEnd === -1 || !close || close.start < tagEnd) { i = m.index + 1; continue; }
    const inner = text.slice(tagEnd + 1, close.start);
    const anchorText = text.slice(openStart, close.end);
    const go = cb({ slug, openStart, tagEnd, close, inner, anchorText });
    if (go === 'next') { i = close.end; continue; }
    i = m.index + 1;
  }
}

// ---- 4. Bước A: quét DB, gom tên theo slug ----
const pages = await db.pages.findMany({ where: { is_published: true }, select: { id: true, slug: true, title: true, content: true } });
const posts = await db.posts.findMany({ where: { is_published: true }, select: { id: true, slug: true, title: true, content: true } });
const docs = pages.map(x => ({ kind: 'page', ...x })).concat(posts.map(x => ({ kind: 'post', ...x })));
console.log(`Docs: ${pages.length} pages + ${posts.length} posts\n`);

const slugInfo = new Map(); // slug → { count, names: Set }
for (const d of docs) {
  if (!d.content) continue;
  quetAnchors(d.content, (a) => {
    if (!slugInfo.has(a.slug)) slugInfo.set(a.slug, { count: 0, names: new Set() });
    slugInfo.get(a.slug).count++;
    const aria = /aria-label="([^"]*)"/.exec(a.anchorText)?.[1] ?? '';
    const imgAlt = /<img[^>]*alt="([^"]*)"/.exec(a.anchorText)?.[1] ?? '';
    const innerText = a.inner.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&#8211;|&#8230;/g, '-').replace(/\s+/g, ' ').trim();
    const ten = (aria || imgAlt || innerText).replace(/ - KOI Leather.*$/i, '').replace(/ - Hình.*$/i, '');
    if (ten) slugInfo.get(a.slug).names.add(chuan(ten));
    return 'next';
  });
}
console.log(`Slug sản phẩm duy nhất: ${slugInfo.size}`);

// ---- 5. Bước B: resolve từng slug ----
const resolution = new Map(); // slug → { action: KEEP|FIX|UNWRAP, slug? }
for (const [slug, info] of slugInfo) {
  if (activeSet.has(slug)) { resolution.set(slug, { action: 'KEEP', slug }); continue; }
  const red = redirectMap.get(slug);
  if (red && activeSet.has(red)) { resolution.set(slug, { action: 'FIX', slug: red }); continue; }
  let best = null;
  for (const chu of info.names) {
    const cands = byName.get(chu) ?? [];
    if (cands.length === 1) { best = { action: 'FIX', slug: cands[0] }; break; }
    if (cands.length > 1) {
      const same = cands.find(c => c.includes(slug));
      if (same) { best = { action: 'FIX', slug: same }; break; }
    }
  }
  if (best) { resolution.set(slug, best); continue; }
  resolution.set(slug, { action: 'UNWRAP' });
}

// In tóm tắt resolution
{
  const gom = new Map();
  for (const [slug, r] of resolution) {
    const key = r.action === 'KEEP' ? 'GIỮ' : r.action === 'UNWRAP' ? 'GỠ' : 'ĐỔI';
    gom.set(key, (gom.get(key) ?? 0) + 1);
  }
  console.log('=== RESOLUTION ===');
  for (const [k, v] of gom) console.log(`  ${v}x  ${k}`);
  console.log('\nDanh sách GỠ:');
  for (const [slug, r] of resolution) if (r.action === 'UNWRAP') console.log(`  · ${slug}`);
}

// ---- 6. Bước C: áp resolution vào một text ----
function apDung(text) {
  const edits = [];
  quetAnchors(text, (a) => {
    const r = resolution.get(a.slug);
    if (!r || r.action === 'KEEP') return 'next';
    if (r.action === 'FIX') {
      const oldPart = `cua-hang/${a.slug}`;
      const newPart = `cua-hang/${r.slug}`;
      const idx = text.indexOf(oldPart, a.openStart);
      if (idx !== -1 && idx < a.close.end) edits.push({ start: idx, end: idx + oldPart.length, text: newPart });
      return 'next';
    }
    edits.push({ start: a.openStart, end: a.close.end, text: a.inner });
    return 'next';
  });
  edits.sort((x, y) => y.start - x.start);
  let out = text;
  for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  return { text: out, edits: edits.length };
}

// ---- 7. Áp lên DB (in báo cáo) ----
const danhSachGhi = [];
for (const d of docs) {
  if (!d.content) continue;
  const r = apDung(d.content);
  if (r.edits === 0) continue;
  console.log(`  ${d.kind.toUpperCase()} ${d.id} ${d.slug} (${String(d.title ?? '').slice(0, 35)}) — ${r.edits} thay đổi`);
  danhSachGhi.push({ kind: d.kind, id: d.id, contentMoi: r.text });
}
console.log(`\nDoc bị ảnh hưởng: ${danhSachGhi.length}`);

// ---- 8. Ghi ----
if (GHI) {
  // DB
  for (const d of danhSachGhi) {
    if (d.kind === 'page') await db.pages.update({ where: { id: d.id }, data: { content: d.contentMoi } });
    else await db.posts.update({ where: { id: d.id }, data: { content: d.contentMoi } });
  }
  console.log(`\n✓ Đã ghi DB: ${danhSachGhi.length} doc`);

  // File JSON — thay trên text thô, giữ format
  function ghiRaw(p, label) {
    const raw = fs.readFileSync(p, 'utf8');
    const r = apDung(raw);
    if (r.text !== raw) {
      const bom = raw.charCodeAt(0) === 0xFEFF;
      JSON.parse(bom ? r.text.slice(1) : r.text); // kiểm tra JSON còn hợp lệ
      fs.writeFileSync(p, r.text, 'utf8');
      console.log(`  ${label} — ${r.edits} thay đổi (JSON còn hợp lệ)`);
    } else console.log(`  ${label} — không thay đổi`);
  }
  ghiRaw(PAGES_JSON, 'pages.json');
  ghiRaw(POSTS_JSON, 'posts.json');
  console.log(`✓ Đã ghi pages.json + posts.json`);

  const revalidateUrl = process.env.NEXT_REVALIDATE_URL?.trim();
  const revalidateSecret = process.env.REVALIDATE_SECRET?.trim();
  if (revalidateUrl && revalidateSecret) {
    try {
      const res = await fetch(revalidateUrl, {
        method: 'POST', headers: { 'content-type': 'application/json', 'x-revalidate-secret': revalidateSecret },
        body: JSON.stringify({ tag: 'blog-content' }), signal: AbortSignal.timeout(5000),
      });
      const t = await res.text().catch(() => '');
      console.log(res.ok ? `✓ Webhook revalidate OK (${res.status})` : `⚠ Webhook revalidate ${res.status}: ${t.slice(0,200)}`);
    } catch (e) { console.log(`⚠ Webhook revalidate lỗi: ${e instanceof Error ? e.message : String(e)}`); }
  } else {
    console.log('⚠ Không có NEXT_REVALIDATE_URL/REVALIDATE_SECRET — bỏ qua webhook.');
  }
} else {
  console.log('\nChưa ghi gì. Chạy lại với --ghi.');
}
await db.$disconnect();