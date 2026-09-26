#!/usr/bin/env node
/**
 * Soi lại nhóm thư mục "trùng 1 ảnh" của lô D:\7.2026_HEre bằng Gemini.
 *
 * anh-moi-kiem-ke.mjs coi thư mục nào có DÙ CHỈ 1 ảnh mẫu khớp vân tay (dHash,
 * Hamming ≤10) với ảnh web là "đã có trên listing" → bỏ qua. Soát lại bằng toàn
 * bộ ảnh (26/09/2026) thì nhiều ca chỉ đúng 1 tấm khớp ở ngưỡng sát biên với một
 * món khác hẳn (túi tote ~ clutch cá sấu, ốp iPad ~ bìa passport) — trùng nhầm.
 *
 * Tool này đưa Gemini xem ảnh thư mục mới cạnh ảnh listing bị cho là trùng, hỏi
 * có phải CÙNG món đồ không. Không trùng → ghi đường dẫn vào khong-trung.json;
 * anh-moi-dang.mjs đọc tệp đó và đưa thư mục trở lại hàng đăng.
 * CHỈ ĐỌC web/DB — không tạo, không sửa listing nào.
 *
 *   node tools/anh-moi-soi-trung.mjs            soi các ca còn ngờ trong mot-mau.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const goc = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const docEnv = (f, k) => {
  const l = fs.readFileSync(f, 'utf8').split(/\r?\n/).find((x) => x.startsWith(k + '='));
  return l ? l.slice(k.length + 1).replace(/^["']|["']$/g, '').trim() : '';
};
process.env.DATABASE_URL = docEnv(path.join(goc, '.env'), 'DATABASE_URL');
const KEY_MODEL = fs.readFileSync(path.join(goc, '..', '_secrets', '9router.key'), 'utf8').trim();
const ROUTER = 'https://khoa.tailc2d856.ts.net/v1/chat/completions';
const MODEL = 'ag/gemini-3.8-flash-high';
const RA = path.join(goc, 'tools', '_tmp', 'anh-moi');
const TEP_KQ = path.join(RA, 'soi-trung.json');
const TEP_KHONG = path.join(RA, 'khong-trung.json');

const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

// Ca "chắc trùng" (≥2 ảnh khớp, hoặc 1 ảnh gần như y hệt d≤4) giữ nguyên là bỏ qua.
const ngo = JSON.parse(fs.readFileSync(path.join(RA, 'mot-mau.json'), 'utf8')).filter((x) => !(x.khop >= 2 || x.dMin <= 4));
const kq = fs.existsSync(TEP_KQ) ? JSON.parse(fs.readFileSync(TEP_KQ, 'utf8')) : {};

const laAnh = (f) => /\.(jpe?g|png)$/i.test(f) && !f.startsWith('._');
function tepAnh(d) {
  const r = [];
  for (const x of fs.readdirSync(d, { withFileTypes: true })) {
    const q = path.join(d, x.name);
    if (x.isFile() && laAnh(x.name)) r.push(q);
    else if (x.isDirectory()) for (const y of fs.readdirSync(q)) if (laAnh(y)) r.push(path.join(q, y));
  }
  return r.sort();
}
const rai = (a, n) => { const b = Math.max(1, Math.floor(a.length / n)); return a.filter((_, i) => i % b === 0).slice(0, n); };
const nho = async (buf) => 'data:image/jpeg;base64,' + (await sharp(buf, { failOn: 'none' }).rotate().resize(640, 640, { fit: 'inside' }).jpeg({ quality: 78 }).toBuffer()).toString('base64');

async function goiModel(content) {
  for (let lan = 1; lan <= 4; lan++) {
    try {
      const r = await fetch(ROUTER, {
        method: 'POST',
        headers: { Authorization: `Bearer ${KEY_MODEL}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: MODEL, messages: [{ role: 'user', content }], max_tokens: 4000, stream: false }),
        signal: AbortSignal.timeout(180_000),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok) {
        const m = String(d.choices?.[0]?.message?.content ?? '').match(/\{[\s\S]*\}/);
        if (m) return JSON.parse(m[0]);
      } else if (r.status < 500 && r.status !== 429) throw new Error(`${r.status}`);
    } catch (e) { if (lan === 4) throw e; }
    await new Promise((res) => setTimeout(res, 5000 * lan));
  }
  throw new Error('model không trả JSON');
}

const HOI = `Nhóm A là ảnh trong một thư mục ảnh MỚI của xưởng đồ da KOI. Nhóm B là ảnh của một listing ĐANG CÓ trên website KOI.
Câu hỏi: nhóm A có phải chính là sản phẩm của listing B không — tức CÙNG một món đồ cụ thể (cùng buổi chụp, hoặc cùng món đồ chụp lại)?
- Cùng kiểu dáng nhưng khác màu da / khác chi tiết / khác món = KHÔNG trùng.
- Chỉ trùng khi rõ ràng là cùng món đồ (cùng màu, cùng chi tiết, cùng dấu dập, cùng phông chụp…).
Chỉ trả JSON: {"trung": true|false, "doTinCay": 0.0-1.0, "lyDo": "một câu tiếng Việt"}`;

async function soi(x) {
  const mau = rai(tepAnh(x.duong), 4);
  const web = await prisma.$queryRawUnsafe(
    `SELECT i.url FROM koi_free_style.koi_product_images i JOIN koi_free_style.koi_products s ON s.id = i."productId"
     WHERE s.slug = $1 ORDER BY i."isPrimary" DESC, i."displayOrder" LIMIT 4`, x.slug);
  const content = [{ type: 'text', text: HOI }, { type: 'text', text: 'NHÓM A (thư mục mới):' }];
  for (const f of mau) content.push({ type: 'image_url', image_url: { url: await nho(f) } });
  content.push({ type: 'text', text: 'NHÓM B (listing đang có):' });
  let soB = 0;
  for (const { url } of web) {
    const u = url.includes('/public/products/') ? url.replace('/public/products/', '/public/products/w800/') : url;
    try {
      const r = await fetch(u, { signal: AbortSignal.timeout(30_000) });
      if (!r.ok) continue;
      content.push({ type: 'image_url', image_url: { url: await nho(Buffer.from(await r.arrayBuffer())) } });
      soB++;
    } catch { /* bỏ ảnh hỏng */ }
  }
  if (!soB) return { trung: false, doTinCay: 0, lyDo: 'listing bị cho là trùng không còn ảnh tải được' };
  return goiModel(content);
}

let i = 0;
await Promise.all(Array.from({ length: 3 }, async () => {
  while (i < ngo.length) {
    const x = ngo[i++];
    if (kq[x.duong]) continue;
    try {
      kq[x.duong] = { ...(await soi(x)), slug: x.slug, ten: x.ten };
      fs.writeFileSync(TEP_KQ, JSON.stringify(kq, null, 1));
      console.log(`${kq[x.duong].trung ? 'TRÙNG' : 'mới  '} ${x.ten} ~ ${x.slug} · ${kq[x.duong].lyDo}`);
    } catch (e) { console.log(`LỖI ${x.ten}: ${e.message}`); }
  }
}));

// Chỉ đưa lại hàng đăng khi model chắc là KHÔNG trùng.
const khong = Object.entries(kq).filter(([, v]) => v.trung === false && (v.doTinCay ?? 0) >= 0.7).map(([d]) => d);
fs.writeFileSync(TEP_KHONG, JSON.stringify(khong, null, 1));
console.log(`\nKhông trùng (đưa lại hàng đăng): ${khong.length} · trùng thật: ${Object.values(kq).filter((v) => v.trung).length} · chưa chắc: ${Object.values(kq).filter((v) => v.trung === false && (v.doTinCay ?? 0) < 0.7).length}`);
await prisma.$disconnect();
