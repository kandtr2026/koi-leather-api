import fs from 'node:fs';
import { PrismaClient } from '@prisma/client';
const env = fs.readFileSync('.env', 'utf8').split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='));
process.env.DATABASE_URL = env.slice(13).replace(/^["']|["']$/g, '');
const db = new PrismaClient();
const vt = JSON.parse(fs.readFileSync('tools/_tmp/soi-trung/van-tay.json', 'utf8'));
const sp = await db.$queryRawUnsafe(`
  SELECT s.id, s.slug, s.name, s."createdAt",
    json_agg(json_build_object('id', i.id) ORDER BY i."displayOrder") anh
  FROM koi_free_style.koi_products s JOIN koi_free_style.koi_product_images i ON i."productId" = s.id
  WHERE NOT s."isDeleted" AND s.status = 'ACTIVE' GROUP BY s.id`);
await db.$disconnect();
const pop = (n) => { n -= (n >>> 1) & 0x55555555; n = (n & 0x33333333) + ((n >>> 2) & 0x33333333); return (((n + (n >>> 4)) & 0xf0f0f0f) * 0x1010101) >>> 24; };
const H = (id) => vt[id]?.split(':').map((x) => parseInt(x, 16));
const ham = (a, b) => pop((a[0] ^ b[0]) >>> 0) + pop((a[1] ^ b[1]) >>> 0);
const ten = (v) => { try { const o = JSON.parse(v); return o.vi || o.en || v; } catch { return v; } };
// Anh "chung" = cung van tay xuat hien o >= 4 san pham (bang mau, bang size, logo...)
const anh = []; for (const s of sp) for (const a of s.anh) { const h = H(a.id); if (h) anh.push({ p: s.id, id: a.id, h }); }
const soSp = new Map();
for (let i = 0; i < anh.length; i++) { const ps = new Set([anh[i].p]); for (let j = 0; j < anh.length; j++) if (anh[j].p !== anh[i].p && ham(anh[i].h, anh[j].h) <= 5) ps.add(anh[j].p); soSp.set(anh[i].id, ps.size); }
const chung = new Set([...soSp].filter(([, n]) => n >= 4).map(([id]) => id));
console.log('anh "chung" (>=4 SP):', chung.size);
const theo = new Map(sp.map((s) => [s.id, { ...s, rieng: s.anh.map((a) => a.id).filter((id) => H(id) && !chung.has(id)) }]));
const MOC = new Date('2026-09-26T00:00:00Z');
const cap = [];
const L = [...theo.values()];
for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
  const A = L[i], B = L[j];
  if (!A.rieng.length || !B.rieng.length) continue;
  let khopA = 0; for (const x of A.rieng) if (B.rieng.some((y) => ham(H(x), H(y)) <= 5)) khopA++;
  if (!khopA) continue;
  let khopB = 0; for (const y of B.rieng) if (A.rieng.some((x) => ham(H(x), H(y)) <= 5)) khopB++;
  const phuA = khopA / A.rieng.length, phuB = khopB / B.rieng.length;
  const chinh = ham(H(A.anh[0].id) || [0, 0], H(B.anh[0].id) || [0, 0]) <= 5 && H(A.anh[0].id) && H(B.anh[0].id);
  const [cu, moi] = A.createdAt <= B.createdAt ? [A, B] : [B, A];
  const loai = (cu.createdAt >= MOC ? 'moi-moi' : moi.createdAt >= MOC ? 'moi-cu' : 'cu-cu');
  cap.push({ loai, phu: Math.max(phuA, phuB), phuMin: Math.min(phuA, phuB), chinh: !!chinh, a: { slug: cu.slug, ten: ten(cu.name), luc: cu.createdAt.toISOString().slice(0, 10), so: cu.rieng.length }, b: { slug: moi.slug, ten: ten(moi.name), luc: moi.createdAt.toISOString().slice(0, 10), so: moi.rieng.length } });
}
// Muc do: "rat chac" = phu cua mon nho hon >= 0.5 hoac trung anh chinh
const chac = cap.filter((c) => c.phu >= 0.5 || c.chinh);
const yeu = cap.filter((c) => !(c.phu >= 0.5 || c.chinh));
const dem = (arr) => arr.reduce((m, c) => (m[c.loai] = (m[c.loai] || 0) + 1, m), {});
console.log('cap nghi trung (bo anh chung):', cap.length, '| chac:', chac.length, dem(chac), '| yeu:', yeu.length, dem(yeu));
fs.writeFileSync('tools/_tmp/soi-trung/cap.json', JSON.stringify({ chac, yeu }, null, 1));
for (const c of chac.filter((c) => c.loai !== 'cu-cu').slice(0, 14)) console.log(c.loai, c.chinh ? 'CHINH' : '     ', c.phu.toFixed(2), '|', c.a.luc, c.a.ten.slice(0, 45), '<->', c.b.luc, c.b.ten.slice(0, 45));
