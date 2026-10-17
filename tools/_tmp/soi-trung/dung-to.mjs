// Dựng tờ ảnh cho từng NHÓM nghi trùng (gom từ cap.json chac + yeu) để agent soát bằng mắt.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { PrismaClient } from '@prisma/client';
const env = fs.readFileSync('.env', 'utf8').split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='));
process.env.DATABASE_URL = env.slice(13).replace(/^["']|["']$/g, '');
const db = new PrismaClient();
const DIR = 'tools/_tmp/soi-trung';
const { chac, yeu } = JSON.parse(fs.readFileSync(`${DIR}/cap.json`, 'utf8'));
const cap = [...chac.map((c) => ({ ...c, muc: 'chac' })), ...yeu.map((c) => ({ ...c, muc: 'yeu' }))];
const cha = new Map();
const tim = (x) => { if (!cha.has(x)) cha.set(x, x); while (cha.get(x) !== x) { cha.set(x, cha.get(cha.get(x))); x = cha.get(x); } return x; };
for (const c of cap) cha.set(tim(c.a.slug), tim(c.b.slug));
const nhom = new Map();
for (const s of cha.keys()) { const r = tim(s); if (!nhom.has(r)) nhom.set(r, new Set()); nhom.get(r).add(s); }
const slugs = [...cha.keys()];
const rows = await db.$queryRawUnsafe(`
  SELECT s.slug, s.name, s."createdAt", s."basePrice", c.slug dm,
    json_agg(i.url ORDER BY i."displayOrder") anh
  FROM koi_free_style.koi_products s JOIN koi_free_style.koi_product_images i ON i."productId"=s.id
  LEFT JOIN koi_free_style.koi_categories c ON c.id=s."categoryId"
  WHERE s.slug = ANY($1::text[]) GROUP BY s.id, c.slug`, slugs);
await db.$disconnect();
const theo = new Map(rows.map((r) => [r.slug, r]));
const ten = (v) => { try { const o = JSON.parse(v); return o.vi || o.en || v; } catch { return v; } };
const ra = `${DIR}/to`; fs.mkdirSync(ra, { recursive: true });
const tai = async (u) => { const n = u.replace('/public/products/', '/public/products/w400/'); for (const x of [n, u]) { try { const r = await fetch(x); if (r.ok) return Buffer.from(await r.arrayBuffer()); } catch {} } return null; };
const W = 170, H = 150, CO = 6;
const muc = [];
let so = 0;
for (const ids of nhom.values()) {
  const ds = [...ids].map((s) => theo.get(s)).filter(Boolean).sort((a, b) => a.createdAt - b.createdAt);
  if (ds.length < 2) continue;
  so += 1;
  const tiles = [];
  for (const [k, sp] of ds.entries()) {
    const y = k * (H + 30);
    const nhan = `${String.fromCharCode(65 + k)}. ${sp.slug.slice(0, 70)}  (${sp.createdAt.toISOString().slice(0, 10)}, ${sp.anh.length} ảnh)`.replace(/&/g, '&amp;');
    tiles.push({ input: Buffer.from(`<svg width="${CO * (W + 6)}" height="26"><text x="3" y="18" font-size="14" font-family="Arial" fill="#111">${nhan}</text></svg>`), left: 0, top: y });
    const anh = await Promise.all(sp.anh.slice(0, CO).map(tai));
    for (const [j, b] of anh.entries()) if (b) tiles.push({ input: await sharp(b).resize(W, H, { fit: 'contain', background: '#fff' }).png().toBuffer(), left: j * (W + 6), top: y + 26 });
  }
  const f = `${ra}/nhom-${String(so).padStart(3, '0')}.png`;
  await sharp({ create: { width: CO * (W + 6), height: ds.length * (H + 30), channels: 3, background: '#e5e5e5' } }).composite(tiles).png().toFile(f);
  const loaiCap = cap.filter((c) => ids.has(c.a.slug)).map((c) => c.muc);
  muc.push({ nhom: so, to: f.split('/').pop(), chac: loaiCap.includes('chac'), mon: ds.map((sp, k) => ({ nhan: String.fromCharCode(65 + k), slug: sp.slug, ten: ten(sp.name), luc: sp.createdAt.toISOString().slice(0, 10), gia: sp.basePrice, dm: sp.dm, soAnh: sp.anh.length })) });
}
fs.writeFileSync(`${ra}/muc.json`, JSON.stringify(muc, null, 1));
console.log(`${muc.length} nhóm → ${ra}`);
