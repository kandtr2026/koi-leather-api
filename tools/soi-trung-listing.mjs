#!/usr/bin/env node
/**
 * Tìm LISTING TRÙNG trên web bằng vân tay ảnh (A Khoa 28/09/2026: "tại sao koi
 * leather có những listing trùng nhau mà tool không tự loại ra lúc upload").
 *
 * Băm dHash 64 bit MỌI ảnh của mọi sản phẩm đang bán (bản w400 — nhẹ, ảnh nào
 * cũng có), rồi so từng cặp ảnh thuộc HAI sản phẩm khác nhau. Hai sản phẩm có
 * ảnh gần như y hệt (Hamming ≤ NGUONG) là nghi trùng; gom thành nhóm.
 * CHỈ ĐỌC — không sửa, không ẩn listing nào.
 *
 *   node tools/soi-trung-listing.mjs [--nguong 5]
 * Ra tools/_tmp/soi-trung/: van-tay.json (băm, dùng lại lần sau), nhom.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const goc = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dongEnv = fs.readFileSync(path.join(goc, '.env'), 'utf8').split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='));
process.env.DATABASE_URL = dongEnv.slice('DATABASE_URL='.length).replace(/^["']|["']$/g, '');
const { PrismaClient } = await import('@prisma/client');
const db = new PrismaClient();
const argv = process.argv.slice(2);
const giaTri = (c, d) => { const i = argv.indexOf(c); return i !== -1 && argv[i + 1] ? argv[i + 1] : d; };
const NGUONG = Number(giaTri('--nguong', '5'));
// Lô ảnh 7.2026 bắt đầu đăng 26/09/2026 — dùng để tách "mới" / "cũ".
const MOC_LO_MOI = new Date(giaTri('--moc', '2026-09-26T00:00:00Z'));

const RA = path.join(goc, 'tools', '_tmp', 'soi-trung');
fs.mkdirSync(RA, { recursive: true });
const TEP_VT = path.join(RA, 'van-tay.json');
const vt = fs.existsSync(TEP_VT) ? JSON.parse(fs.readFileSync(TEP_VT, 'utf8')) : {};
const ten = (v) => { try { const o = JSON.parse(v); return o.vi || o.en || v; } catch { return v; } };

async function dHash(buf) {
  const px = await sharp(buf, { failOn: 'none' }).grayscale().resize(9, 8, { fit: 'fill' }).raw().toBuffer();
  let hi = 0, lo = 0;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    const bit = px[y * 9 + x] > px[y * 9 + x + 1] ? 1 : 0;
    const k = y * 8 + x;
    if (k < 32) hi = ((hi << 1) | bit) >>> 0; else lo = ((lo << 1) | bit) >>> 0;
  }
  return [hi, lo];
}
const pop = (n) => { n -= (n >>> 1) & 0x55555555; n = (n & 0x33333333) + ((n >>> 2) & 0x33333333); return (((n + (n >>> 4)) & 0xf0f0f0f) * 0x1010101) >>> 24; };
const ham = (a, b) => pop((a[0] ^ b[0]) >>> 0) + pop((a[1] ^ b[1]) >>> 0);

const sp = await db.$queryRawUnsafe(`
  SELECT s.id, s.slug, s.name, s."createdAt", c.slug dm,
    json_agg(json_build_object('id', i.id, 'url', i.url) ORDER BY i."displayOrder") anh
  FROM koi_free_style.koi_products s
  JOIN koi_free_style.koi_product_images i ON i."productId" = s.id
  LEFT JOIN koi_free_style.koi_categories c ON c.id = s."categoryId"
  WHERE NOT s."isDeleted" AND s.status = 'ACTIVE'
  GROUP BY s.id, s.slug, s.name, s."createdAt", c.slug`);
await db.$disconnect();

const viec = sp.flatMap((s) => s.anh.filter((a) => !vt[a.id]).map((a) => a));
console.log(`${sp.length} sản phẩm, ${sp.reduce((n, s) => n + s.anh.length, 0)} ảnh, cần băm ${viec.length}`);
let xong = 0, loi = 0;
const hang = [...viec];
await Promise.all(Array.from({ length: 16 }, async () => {
  for (let a = hang.shift(); a; a = hang.shift()) {
    const nho = a.url.replace('/public/products/', '/public/products/w400/');
    for (const u of [nho, a.url]) {
      try {
        const r = await fetch(u, { signal: AbortSignal.timeout(20_000) });
        if (!r.ok) continue;
        vt[a.id] = (await dHash(Buffer.from(await r.arrayBuffer()))).map((n) => n.toString(16)).join(':');
        break;
      } catch { /* thử bản kế */ }
    }
    if (!vt[a.id]) loi += 1;
    if (++xong % 500 === 0) { console.log(`  băm ${xong}/${viec.length}`); fs.writeFileSync(TEP_VT, JSON.stringify(vt)); }
  }
}));
fs.writeFileSync(TEP_VT, JSON.stringify(vt));
if (loi) console.log(`  ${loi} ảnh không tải được`);

// So cặp ảnh khác sản phẩm.
const ds = [];
for (const s of sp) for (const a of s.anh) if (vt[a.id]) ds.push({ p: s.id, h: vt[a.id].split(':').map((x) => parseInt(x, 16)) });
const cap = new Map(); // "p1|p2" → { n, dMin }
for (let i = 0; i < ds.length; i++) for (let j = i + 1; j < ds.length; j++) {
  if (ds[i].p === ds[j].p) continue;
  const d = ham(ds[i].h, ds[j].h);
  if (d > NGUONG) continue;
  const k = ds[i].p < ds[j].p ? `${ds[i].p}|${ds[j].p}` : `${ds[j].p}|${ds[i].p}`;
  const c = cap.get(k) || { n: 0, dMin: 99 };
  c.n += 1; c.dMin = Math.min(c.dMin, d);
  cap.set(k, c);
}

// Gom nhóm (union-find).
const cha = new Map();
const tim = (x) => { while (cha.get(x) !== x) { cha.set(x, cha.get(cha.get(x))); x = cha.get(x); } return x; };
for (const k of cap.keys()) for (const p of k.split('|')) if (!cha.has(p)) cha.set(p, p);
for (const k of cap.keys()) { const [a, b] = k.split('|'); cha.set(tim(a), tim(b)); }
const theoId = new Map(sp.map((s) => [s.id, s]));
const nhomMap = new Map();
for (const p of cha.keys()) { const r = tim(p); if (!nhomMap.has(r)) nhomMap.set(r, []); nhomMap.get(r).push(p); }
const nhom = [...nhomMap.values()].map((ids) => {
  const mon = ids.map((id) => theoId.get(id)).sort((a, b) => a.createdAt - b.createdAt).map((s) => ({
    id: s.id, slug: s.slug, ten: ten(s.name), dm: s.dm, luc: s.createdAt.toISOString().slice(0, 10),
    moi: s.createdAt >= MOC_LO_MOI, soAnh: s.anh.length,
  }));
  const soMoi = mon.filter((m) => m.moi).length;
  const loai = soMoi === 0 ? 'cu-cu' : soMoi === mon.length ? 'moi-moi' : 'moi-cu';
  const capTrong = [...cap.entries()].filter(([k]) => ids.includes(k.split('|')[0])).map(([k, v]) => ({ k, ...v }));
  return { loai, mon, anhKhop: capTrong.reduce((n, c) => n + c.n, 0), dMin: Math.min(...capTrong.map((c) => c.dMin)) };
}).sort((a, b) => b.mon.length - a.mon.length);
fs.writeFileSync(path.join(RA, 'nhom.json'), JSON.stringify(nhom, null, 1));
const dem = {};
for (const g of nhom) { dem[g.loai] = dem[g.loai] || { nhom: 0, listing: 0 }; dem[g.loai].nhom += 1; dem[g.loai].listing += g.mon.length; }
console.log(`Ngưỡng Hamming ≤${NGUONG}: ${nhom.length} nhóm nghi trùng`, dem);
