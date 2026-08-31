/**
 * Rà và sửa toàn bộ link /cua-hang/<slug>/ trong nội dung cũ (pages + posts).
 *
 *   node scripts/sua-link-san-pham-trong-content.mjs            # chạy thử, KHÔNG ghi
 *   node scripts/sua-link-san-pham-trong-content.mjs --ghi      # ghi thật
 *
 * MẶC ĐỊNH KHÔNG GHI. Với MỖI slug sản phẩm:
 *   1. slug cũ đang tồn tại trong koiProduct (ACTIVE)  → GIỮ NGUYÊN.
 *   2. slug cũ có trong slug-redirects.csv và đích còn ACTIVE → ĐỔI href sang slug mới.
 *   3. chưa khớp → match theo TÊN sản phẩm (aria-label / img alt / text trong anchor,
 *      gộp MỌI anchor cùng slug để có tín hiệu tốt nhất) → ĐỔI href.
 *   4. vẫn không khớp → GỠ link (unwrap <a>, giữ nội dung) — hết 404.
 *
 * Resolution được tính TRƯỚC cho từng slug (đồng nhất mọi anchor cùng slug),
 * rồi mới áp dụng lên text. Ghi DB (prisma.pages/posts) + koi-leather-data/data/
 * pages.json + posts.json. Scanner xử lý cả dạng DECODED (DB) lẫn ESCAPED (json).
 */
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

// ---- Nạp .env ----
const env = fs.readFileSync(path.resolve(import.meta.dirname, '..', '.env'), 'utf8');
for (const line of env.split(/\r?\n/)) {
  const m = /^([A-Z_]+)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const CO = new Set(process.argv.slice(2));
for (const c of CO) {
  if (c !== '--ghi') {
    console.error(`Cờ lạ: ${c}. Chỉ nhận --ghi.`);
    process.exit(1);
  }
}
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
const redirectRaw = fs.readFileSync(REDIRECTS_CSV, 'utf8');
const redirectMap = new Map();
for (const line of redirectRaw.split(/\r?\n/).slice(1)) {
  if (!line.trim()) continue;
  const cols = line.split(',');
  if (cols.length >= 2) redirectMap.set(cols[0].trim().toLowerCase(), cols[1].trim().toLowerCase());
}
console.log(`Redirect map: ${redirectMap.size} cặp`);

// ---- 2. Sản phẩm ACTIVE ----
const active = await db.koiProduct.findMany({
  where: { isDeleted: false, status: 'ACTIVE' },
  select: { slug: true, name: true },
});
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

// ---- 3. Scanner cơ bản: tìm các anchor cua-hang ----
const RE_HREF = /cua-hang\/([a-z0-9\-%]+)\/?/gi;
const OPEN_RE = /<a\b/gi;
const OPEN_ESC_RE = /\\u003ca\b/gi;

function timOpenStart(text, urlIdx) {
  let best = -1;
  const before = text.slice(0, urlIdx);
  let m;
  OPEN_RE.lastIndex = 0;
  while ((m = OPEN_RE.exec(before)) !== null) best = m.index;
  OPEN_ESC_RE.lastIndex = 0;
  while ((m = OPEN_ESC_RE.exec(before)) !== null) best = Math.max(best, m.index);
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
  if (gt === -1) gt = Infinity;
  if (esc === -1) esc = Infinity;
  const start = Math.min(gt, esc);
  if (start === Infinity) return null;
  const len = start === gt ? 4 : 14;
  return { start, end: start + len, len };
}

// Quét toàn bộ text, trả về danh sách anchor: { slug, openStart, tagEnd, close, inner }
function quetAnchors(text) {
  const anchors = [];
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
    anchors.push({ slug, openStart, tagEnd, close, inner: text.slice(tagEnd + 1, close.start) });
    i = close.end;
  }
  return anchors;
}

// Lấy tên từ anchor qua text đầy đủ (dùng trong quét thứ 2)
function tenAnchor(text, a) {
  const anchor = text.slice(a.openStart, a.close.end);
  const aria = /aria-label="([^"]*)"/.exec(anchor)?.[1] ?? '';
  const imgAlt = /<img[^>]*alt="([^"]*)"/.exec(anchor)?.[1] ?? '';
  const innerText = a.inner.replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&#8211;|&#8230;/g, '-').replace(/\s+/g, ' ').trim();
  return (aria || imgAlt || innerText).replace(/ - KOI Leather.*$/i, '').replace(/ - Hình.*$/i, '');
}

// ---- 4. Bước 1: quét tất cả doc, gom tín hiệu tên theo slug ----
const pages = await db.pages.findMany({ where: { is_published: true }, select: { id: true, slug: true, title: true, content: true } });
const posts = await db.posts.findMany({ where: { is_published: true }, select: { id: true, slug: true, title: true, content: true } });
const docs = pages.map(x => ({ kind: 'page', ...x })).concat(posts.map(x => ({ kind: 'post', ...x })));
console.log(`Docs: ${pages.length} pages + ${posts.length} posts\n`);

// slug → { count, names: Set<chu> }
const slugInfo = new Map();
for (const d of docs) {
  if (!d.content) continue;
  const anchors = quetAnchors(d.content);
  for (const a of anchors) {
    if (!slugInfo.has(a.slug)) slugInfo.set(a.slug, { count: 0, names: new Set() });
    const info = slugInfo.get(a.slug);
    info.count++;
    const ten = chuan(tenAnchor(d.content, a));
    if (ten) info.names.add(ten);
  }
}
console.log(`Slug sản phẩm duy nhất: ${slugInfo.size}\n`);

// ---- 5. Bước 2: resolve từng slug ----
const resolution = new Map(); // slug → { action, slug }
for (const [slug, info] of slugInfo) {
  if (activeSet.has(slug)) { resolution.set(slug, { action: 'KEEP', slug }); continue; }
  const red = redirectMap.get(slug);
  if (red && activeSet.has(red)) { resolution.set(slug, { action: 'FIX-redirect', slug: red }); continue; }
  // Match tên: ưu tiên tên có >1 chữ và khớp đúng 1 sản phẩm; nếu nhiều, ưu tiên slug chứa old
  let best = null;
  for (const chu of info.names) {
    const cands = byName.get(chu) ?? [];
    if (cands.length === 1) { best = { action: 'FIX-name', slug: cands[0] }; break; }
    if (cands.length > 1) {
      const same = cands.find(c => c.includes(slug));
      if (same) { best = { action: 'FIX-name-dup', slug: same }; break; }
    }
  }
  if (best) { resolution.set(slug, best); continue; }
  resolution.set(slug, { action: 'UNRESOLVED', slug: null });
}

// In resolution
const gomRes = new Map();
for (const [slug, r] of resolution) {
  const key = r.action === 'KEEP' ? 'GIỮ' : r.action === 'UNRESOLVED' ? 'GỠ' : `ĐỔI → ${r.slug}`;
  gomRes.set(key, (gomRes.get(key) ?? 0) + 1);
  if (r.action === 'UNRESOLVED') console.log(`  GỠ ${slug}`);
}
console.log('\n=== RESOLUTION TỔNG ===');
for (const [k, v] of gomRes) console.log(`  ${v}x  ${k}`);

// ---- 6. Bước 3: áp dụng lên từng doc ----
function apDung(text) {
  const anchors = quetAnchors(text);
  // Áp từ cuối lên đầu để không lệch index
  const edits = [];
  for (const a of anchors) {
    const r = resolution.get(a.slug);
    if (!r || r.action === 'KEEP') continue;
    if (r.action.startsWith('FIX')) {
      const oldPart = `cua-hang/${a.slug}`;
      const newPart = `cua-hang/${r.slug}`;
      const idx = text.indexOf(oldPart, a.openStart);
      if (idx !== -1 && idx < a.close.end) {
        edits.push({ start: idx, end: idx + oldPart.length, text: newPart, action: r.action, old: a.slug, neu: r.slug });
      }
    } else {
      // UNRESOLVED → unwrap
      edits.push({ start: a.openStart, end: a.close.end, text: a.inner, action: 'UNWRAP', old: a.slug, neu: null });
    }
  }
  edits.sort((x, y) => y.start - x.start);
  for (const e of edits) {
    text = text.slice(0, e.start) + e.text + text.slice(e.end);
  }
  return { text, edits: edits.length };
}

const ketQua = { doc: 0, sua: 0, go: 0 };
const danhSachGhi = [];
for (const d of docs) {
  if (!d.content) continue;
  const r = apDung(d.content);
  if (r.edits === 0) continue;
  const sua = r.text !== d.content ? r.edits : 0; // edits đều tính
  // Đếm riêng sua/go theo edits đã biết — cần chứa action. Sửa: dùng edits đã lưu
  console.log(`  ${d.kind.toUpperCase()} ${d.id} ${d.slug} (${String(d.title ?? '').slice(0, 35)}) — ${r.edits} thay đổi`);
  danhSachGhi.push({ kind: d.kind, id: d.id, slug: d.slug, contentMoi: r.text, soSua: r.edits });
}

console.log(`\n================ TỔNG ================`);
console.log(`Doc bị ảnh hưởng: ${danhSachGhi.length}`);

// ---- Files json ----
function docJSON(p) {
  const raw = fs.readFileSync(p, 'utf8');
  const bom = raw.charCodeAt(0) === 0xFEFF;
  return { bom, data: JSON.parse(bom ? raw.slice(1) : raw) };
}

if (GHI) {
  const pagesJson = docJSON(PAGES_JSON);
  const postsJson = docJSON(POSTS_JSON);
  const pageEntries = Array.isArray(pagesJson.data) ? pagesJson.data : pagesJson.data.pages;
  const postEntries = Array.isArray(postsJson.data) ? postsJson.data : postsJson.data.posts;

  for (const d of danhSachGhi) {
    if (d.kind === 'page') await db.pages.update({ where: { id: d.id }, data: { content: d.contentMoi } });
    else await db.posts.update({ where: { id: d.id }, data: { content: d.contentMoi } });
  }
  console.log(`\n✓ Đã ghi DB: ${danhSachGhi.length} doc`);

  for (const d of danhSachGhi.filter(x => x.kind === 'page')) {
    const entry = pageEntries.find(x => String(x.id) === String(d.id));
    if (!entry?.content?.rendered) { console.log(`⚠ pages.json thiếu entry ${d.id}`); continue; }
    const r2 = apDung(entry.content.rendered);
    if (r2.text !== entry.content.rendered) { entry.content.rendered = r2.text; console.log(`  pages.json #${d.id} (${d.slug}) — ${r2.edits} thay đổi`); }
  }
  for (const d of danhSachGhi.filter(x => x.kind === 'post')) {
    const entry = postEntries.find(x => String(x.id) === String(d.id));
    if (!entry?.content?.rendered) { console.log(`⚠ posts.json thiếu entry ${d.id}`); continue; }
    const r2 = apDung(entry.content.rendered);
    if (r2.text !== entry.content.rendered) { entry.content.rendered = r2.text; console.log(`  posts.json #${d.id} (${d.slug}) — ${r2.edits} thay đổi`); }
  }

  function ghiJSON(p, obj) {
    const { bom } = docJSON(p);
    const out = JSON.stringify(obj.data, null, 2).replace(/\n/g, '\r\n');
    fs.writeFileSync(p, (bom ? '\uFEFF' : '') + out, 'utf8');
  }
  ghiJSON(PAGES_JSON, pagesJson);
  ghiJSON(POSTS_JSON, postsJson);
  console.log(`✓ Đã ghi pages.json + posts.json`);

  const revalidateUrl = process.env.NEXT_REVALIDATE_URL?.trim();
  const revalidateSecret = process.env.REVALIDATE_SECRET?.trim();
  if (revalidateUrl && revalidateSecret) {
    try {
      const res = await fetch(revalidateUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-revalidate-secret': revalidateSecret },
        body: JSON.stringify({ tag: 'blog-content' }),
        signal: AbortSignal.timeout(5000),
      });
      const t = await res.text().catch(() => '');
      console.log(res.ok ? `✓ Webhook revalidate OK (${res.status})` : `⚠ Webhook revalidate trả ${res.status}: ${t.slice(0, 200)}`);
    } catch (e) {
      console.log(`⚠ Webhook revalidate lỗi: ${e instanceof Error ? e.message : String(e)}`);
    }
  } else {
    console.log('⚠ Không có NEXT_REVALIDATE_URL/REVALIDATE_SECRET — bỏ qua webhook.');
  }
} else {
  console.log('\nChưa ghi gì. Chạy lại với --ghi.');
}

await db.$disconnect();