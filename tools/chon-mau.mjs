#!/usr/bin/env node
/**
 * Gắn MÀU cho sản phẩm chưa có màu bằng vision (A Khoa 30/09/2026: "Các sản phẩm
 * thì tự chọn màu dùm đi" — todolist admin "Chưa có màu" 210 món).
 *
 * Màu lấy trong bảng ĐÓNG 15 nhóm (src/common/enums.ts COLOR_FAMILIES) — nhóm
 * dùng cho bộ lọc màu ngoài mặt tiền, không dùng mã hex tự do. Tối đa 3 màu, màu
 * đầu là màu chính. Ghi qua API admin (PATCH /products/:id chỉ gửi `colors`, không
 * gửi tên → slug không đổi), API tự làm mới cache mặt tiền.
 *
 *   node tools/chon-mau.mjs --soi [--slug a,b] [--gioi-han N]   Gemini chọn màu → soi.json
 *   node tools/chon-mau.mjs --to                              tờ soát (ảnh + màu đã chọn)
 *   node tools/chon-mau.mjs --sua <tệp.json>                  sửa theo soát: {slug: ["DEN", ...]}
 *   node tools/chon-mau.mjs --ghi                             ghi lên web (bỏ qua món đã có màu)
 *   node tools/chon-mau.mjs --hoan                            gỡ màu các món tool này đã ghi
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
const TOKEN_GHI = docEnv(path.join(goc, '..', 'koi-storefront', '.env.local'), 'KOI_ADMIN_WRITE_TOKEN');
const KEY = fs.readFileSync(path.join(goc, '..', '_secrets', '9router.key'), 'utf8').trim();
const API = 'https://koi-leather-api.vercel.app';
const ROUTER = 'https://khoa.tailc2d856.ts.net/v1/chat/completions';
const MODEL = 'ag/gemini-3.8-flash-high';
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();
const { COLOR_FAMILIES } = await import(path.join(goc, 'dist', 'src', 'common', 'enums.js')).catch(() => ({ COLOR_FAMILIES: null }));

const argv = process.argv.slice(2);
const co = (c) => argv.includes(c);
const giaTri = (c, d) => { const i = argv.indexOf(c); return i !== -1 && argv[i + 1] ? argv[i + 1] : d; };
const RA = path.join(goc, 'tools', '_tmp', 'chon-mau');
fs.mkdirSync(RA, { recursive: true });
const TEP_SOI = path.join(RA, 'soi.json');
const SO_GHI = path.join(RA, 'da-ghi.jsonl');
const docJson = (f, d = {}) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : d);
const ghiJson = (f, o) => fs.writeFileSync(f, JSON.stringify(o, null, 1));
const tenVi = (v) => { try { const o = JSON.parse(v); return o.vi || o.en || v; } catch { return v; } };

// Bảng màu: đọc từ bản build của API nếu có, không thì bản chép (phải khớp enums.ts).
const BANG = COLOR_FAMILIES ?? [
  { code: 'DEN', name: 'Đen', hex: '#1a1a1a' }, { code: 'NAU_DAM', name: 'Nâu đậm', hex: '#4a2f1b' },
  { code: 'NAU_DO', name: 'Nâu đỏ', hex: '#8a4b2b' }, { code: 'VANG_BO', name: 'Vàng bò', hex: '#b5814a' },
  { code: 'GOLD', name: 'Gold', hex: '#c9a24b' }, { code: 'KEM', name: 'Kem', hex: '#e6d8bd' },
  { code: 'TRANG', name: 'Trắng', hex: '#f2efe9' }, { code: 'XAM', name: 'Xám', hex: '#8d8d88' },
  { code: 'NAVY', name: 'Navy', hex: '#2b3a5b' }, { code: 'XANH_DUONG', name: 'Xanh dương', hex: '#4f7fa8' },
  { code: 'XANH_LA', name: 'Xanh lá', hex: '#3c5a3a' }, { code: 'DO', name: 'Đỏ', hex: '#9e2b25' },
  { code: 'CAM', name: 'Cam', hex: '#d1651f' }, { code: 'HONG', name: 'Hồng', hex: '#d18aa0' },
  { code: 'TIM', name: 'Tím', hex: '#5a3f6b' },
];
const MA = new Set(BANG.map((c) => c.code));
const TEN_MAU = Object.fromEntries(BANG.map((c) => [c.code, c.name]));
const HEX = Object.fromEntries(BANG.map((c) => [c.code, c.hex]));

async function spChuaMau() {
  const slug = giaTri('--slug', '');
  const rows = await prisma.$queryRawUnsafe(`
    SELECT s.id, s.slug, s.name, s.status,
      json_agg(i.url ORDER BY i."displayOrder", i."createdAt", i.id) anh
    FROM koi_free_style.koi_products s
    JOIN koi_free_style.koi_product_images i ON i."productId" = s.id
    WHERE NOT s."isDeleted"
      ${slug ? 'AND s.slug = ANY($1::text[])' : `AND s."colorFamily" IS NULL
      AND NOT EXISTS (SELECT 1 FROM koi_free_style.koi_product_colors pc WHERE pc."productId" = s.id)`}
    GROUP BY s.id ORDER BY s.slug`, ...(slug ? [slug.split(',')] : []));
  return rows.map((r) => ({ ...r, ten: tenVi(r.name) }));
}

async function taiAnh(url, canh = 512) {
  const nho = url.replace('/public/products/', '/public/products/w800/');
  for (const u of [nho, url]) {
    try {
      const r = await fetch(u, { signal: AbortSignal.timeout(20_000) });
      if (!r.ok) continue;
      return await sharp(Buffer.from(await r.arrayBuffer())).resize({ width: canh, height: canh, fit: 'inside' }).jpeg({ quality: 80 }).toBuffer();
    } catch { /* thử bản gốc */ }
  }
  return null;
}

async function goiModel(content) {
  for (let lan = 1; lan <= 4; lan += 1) {
    try {
      const r = await fetch(ROUTER, {
        method: 'POST',
        headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: MODEL, messages: [{ role: 'user', content }], max_tokens: 3000, stream: false }),
        signal: AbortSignal.timeout(180_000),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok) {
        const m = String(d.choices?.[0]?.message?.content ?? '').match(/\{[\s\S]*\}/);
        if (m) return JSON.parse(m[0]);
        throw new Error('không có JSON');
      }
      if (r.status < 500 && r.status !== 429) throw new Error(`${r.status}`);
    } catch (e) {
      if (lan === 4) throw e;
    }
    await new Promise((res) => setTimeout(res, 4000 * lan));
  }
  return null;
}

const HUONG_DAN = `You label the LEATHER COLOR of a product from KOI Leather (handmade leather goods, Saigon) for the shop's color filter.
Allowed color codes (closed list — use ONLY these):
${BANG.map((c) => `- ${c.code}: ${c.name} (${c.hex})`).join('\n')}
Rules:
- Judge the color of the PRODUCT'S LEATHER only — ignore background, props, watch faces/cases, metal hardware, stitching thread, packaging, people's clothes.
- The product title often names the color (Vietnamese or Hermès color names). Trust it when consistent with the photos. Mapping hints: đen/black → DEN; nâu sô-cô-la/choco/chocolate/nâu đậm → NAU_DAM; nâu đỏ/cognac/brandy/nâu mận → NAU_DO; vàng bò/camel/tan/nâu vàng/fauve → VANG_BO; gold (Hermès gold tan)/vàng/vàng ánh kim/yellow/jaune → GOLD; kem/be/beige/ivory/craie/nude → KEM; trắng/white → TRANG; xám/grey/etain/etoupe/taupe/bạc/silver/greige → XAM; navy/xanh navy/xanh đen → NAVY; xanh dương/blue/xanh da trời/sky/teal-blue → XANH_DUONG; xanh lá/green/olive/emerald/xanh ngọc/mint → XANH_LA; đỏ/red/đỏ rượu/burgundy/rouge → DO; cam/orange → CAM; hồng/pink/rose/coral → HONG; tím/purple/violet/lilac → TIM.
- Return the MAIN color first. Add a 2nd (max 3rd) color ONLY if the product is clearly two-tone (phối màu, contrast lining visible from outside) or the listing sells several colors (nhiều màu, set of different colors). Otherwise exactly one color.
Reply JSON only: {"mau": ["CODE", ...], "tinCay": <0..1>, "lyDo": "<max 20 words, Vietnamese>"}`;

async function soiMot(sp) {
  const anh = (await Promise.all(sp.anh.slice(0, 4).map((u) => taiAnh(u)))).filter(Boolean);
  if (!anh.length) throw new Error('không tải được ảnh');
  const kq = await goiModel([
    { type: 'text', text: `${HUONG_DAN}\n\nProduct title: "${sp.ten}". ${anh.length} photos follow (first = main photo).` },
    ...anh.map((b) => ({ type: 'image_url', image_url: { url: 'data:image/jpeg;base64,' + b.toString('base64') } })),
  ]);
  const mau = [...new Set((kq?.mau || []).map((x) => String(x).toUpperCase()).filter((x) => MA.has(x)))].slice(0, 3);
  if (!mau.length) throw new Error('model không trả màu hợp lệ: ' + JSON.stringify(kq).slice(0, 120));
  return { slug: sp.slug, ten: sp.ten, mau, tinCay: Number(kq.tinCay) || 0, lyDo: kq.lyDo || '' };
}

async function chaySongSong(ds, n, lam) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < ds.length) await lam(ds[i++]); }));
}

if (co('--soi')) {
  const soi = docJson(TEP_SOI);
  const tatCa = (await spChuaMau()).filter((s) => co('--lam-lai') || !soi[s.id]);
  const viec = tatCa.slice(0, Number(giaTri('--gioi-han', '0')) || undefined);
  console.log(`Soi màu ${viec.length} sản phẩm`);
  let xong = 0;
  await chaySongSong(viec, Number(giaTri('--song-song', '4')), async (sp) => {
    try {
      soi[sp.id] = await soiMot(sp);
      console.log(`[${++xong}/${viec.length}] ${sp.slug} → ${soi[sp.id].mau.join('+')} (${soi[sp.id].tinCay})`);
    } catch (e) {
      console.log(`[${++xong}/${viec.length}] ${sp.slug} → LỖI ${String(e.message || e).slice(0, 120)}`);
    }
    if (xong % 10 === 0) ghiJson(TEP_SOI, soi);
  });
  ghiJson(TEP_SOI, soi);
}

if (co('--to')) {
  const soi = docJson(TEP_SOI);
  const theoId = new Map((await spChuaMau()).map((s) => [s.id, s]));
  const ds = Object.entries(soi).filter(([id]) => theoId.has(id)).map(([id, r]) => ({ id, ...r, anh: theoId.get(id).anh }));
  const ra = path.join(RA, 'to'); fs.mkdirSync(ra, { recursive: true });
  const W = 230, H = 190, COT = 4, MOI_TO = 20;
  const xml = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const muc = [];
  for (let t = 0; t * MOI_TO < ds.length; t += 1) {
    const lo = ds.slice(t * MOI_TO, (t + 1) * MOI_TO);
    const tiles = [];
    await chaySongSong(lo.map((r, k) => ({ r, k })), 6, async ({ r, k }) => {
      const so = t * MOI_TO + k + 1;
      const x = (k % COT) * (W + 10), y = Math.floor(k / COT) * (H + 58);
      const b = await taiAnh(r.anh[0], 400);
      if (b) tiles.push({ input: await sharp(b).resize(W, H, { fit: 'contain', background: '#fff' }).png().toBuffer(), left: x, top: y });
      const o = r.mau.map((m, j) => `<rect x="${4 + j * 22}" y="4" width="18" height="18" fill="${HEX[m]}" stroke="#000"/>`).join('');
      tiles.push({ input: Buffer.from(`<svg width="${W}" height="56"><rect width="${W}" height="56" fill="#fafafa"/>${o}<text x="${8 + r.mau.length * 22}" y="18" font-size="14" font-weight="bold" font-family="Arial" fill="#c00">${so}. ${xml(r.mau.map((m) => TEN_MAU[m]).join(' + '))}</text><text x="4" y="40" font-size="11" font-family="Arial" fill="#111">${xml(r.ten.slice(0, 40))}</text><text x="4" y="53" font-size="11" font-family="Arial" fill="#111">${xml(r.ten.slice(40, 80))}</text></svg>`), left: x, top: y + H });
      muc.push({ so, to: t + 1, id: r.id, slug: r.slug, ten: r.ten, mau: r.mau, tinCay: r.tinCay });
    });
    const hang = Math.ceil(lo.length / COT);
    await sharp({ create: { width: COT * (W + 10), height: hang * (H + 58), channels: 3, background: '#ccc' } }).composite(tiles).png().toFile(path.join(ra, `to-${String(t + 1).padStart(2, '0')}.png`));
  }
  muc.sort((a, b) => a.so - b.so);
  ghiJson(path.join(ra, 'muc.json'), muc);
  console.log(`${ds.length} món → ${ra} (${Math.ceil(ds.length / MOI_TO)} tờ)`);
}

/**
 * --to-nhan: tờ để NGƯỜI/AGENT tự gắn màu (khi router model trục trặc): mỗi tờ 10
 * món, mỗi món một hàng tối đa 4 ảnh + nhãn "N. tên". Ra to-nhan/ + muc.json.
 */
if (co('--to-nhan')) {
  const ds = await spChuaMau();
  const ra = path.join(RA, 'to-nhan'); fs.mkdirSync(ra, { recursive: true });
  const W = 200, H = 170, MOI_TO = 10;
  const xml = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const muc = [];
  for (let t = 0; t * MOI_TO < ds.length; t += 1) {
    const lo = ds.slice(t * MOI_TO, (t + 1) * MOI_TO);
    const tiles = [];
    await chaySongSong(lo.map((r, k) => ({ r, k })), 4, async ({ r, k }) => {
      const so = t * MOI_TO + k + 1;
      const y = k * (H + 26);
      tiles.push({ input: Buffer.from(`<svg width="${4 * (W + 6)}" height="24"><text x="3" y="18" font-size="15" font-weight="bold" font-family="Arial" fill="#c00">${so}. </text><text x="40" y="18" font-size="14" font-family="Arial" fill="#111">${xml(r.ten.slice(0, 95))}</text></svg>`), left: 0, top: y });
      const anh = await Promise.all(r.anh.slice(0, 4).map((u) => taiAnh(u, 400)));
      for (const [j, b] of anh.entries()) if (b) tiles.push({ input: await sharp(b).resize(W, H, { fit: 'contain', background: '#fff' }).png().toBuffer(), left: j * (W + 6), top: y + 24 });
      muc.push({ so, to: t + 1, id: r.id, slug: r.slug, ten: r.ten });
    });
    await sharp({ create: { width: 4 * (W + 6), height: lo.length * (H + 26), channels: 3, background: '#ddd' } }).composite(tiles).png().toFile(path.join(ra, `to-${String(t + 1).padStart(2, '0')}.png`));
  }
  muc.sort((a, b) => a.so - b.so);
  ghiJson(path.join(ra, 'muc.json'), muc);
  console.log(`${ds.length} món → ${ra} (${Math.ceil(ds.length / MOI_TO)} tờ)`);
}

/** --nap-nhan <tệp.json>: nạp nhãn màu do agent gắn ({slug: {mau:[...], tinCay, lyDo}}) vào soi.json. */
if (co('--nap-nhan')) {
  const soi = docJson(TEP_SOI);
  const nhan = docJson(giaTri('--nap-nhan', ''));
  const theoSlug = new Map((await spChuaMau()).map((s) => [s.slug, s]));
  let n = 0;
  for (const [slug, r] of Object.entries(nhan)) {
    const sp = theoSlug.get(slug);
    const mau = [...new Set((r.mau || []).map((x) => String(x).toUpperCase()).filter((x) => MA.has(x)))].slice(0, 3);
    if (!sp || !mau.length) { console.log('BỎ', slug, JSON.stringify(r).slice(0, 80)); continue; }
    soi[sp.id] = { slug, ten: sp.ten, mau, tinCay: Number(r.tinCay) || 0, lyDo: r.lyDo || '', nguon: 'claude' };
    n += 1;
  }
  ghiJson(TEP_SOI, soi);
  console.log(`Nạp ${n} nhãn màu`);
}

if (co('--sua')) {
  const soi = docJson(TEP_SOI);
  const sua = docJson(giaTri('--sua', ''));
  const theoSlug = new Map(Object.entries(soi).map(([id, r]) => [r.slug, id]));
  let n = 0;
  for (const [slug, mau] of Object.entries(sua)) {
    const id = theoSlug.get(slug);
    const hop = [...new Set((mau || []).map((x) => String(x).toUpperCase()).filter((x) => MA.has(x)))].slice(0, 3);
    if (!id || !hop.length) { console.log('BỎ', slug, mau); continue; }
    soi[id] = { ...soi[id], mau: hop, suaTay: true };
    n += 1;
  }
  ghiJson(TEP_SOI, soi);
  console.log(`Đã sửa ${n} món theo soát`);
}

if (co('--ghi')) {
  const soi = docJson(TEP_SOI);
  // Chỉ ghi món VẪN chưa có màu (ai đó vừa gắn tay thì để nguyên).
  const chua = new Set((await spChuaMau()).map((s) => s.id));
  const viec = Object.entries(soi).filter(([id]) => chua.has(id));
  console.log(`Ghi màu ${viec.length} sản phẩm`);
  let xong = 0, loi = 0;
  for (const [id, r] of viec) {
    try {
      for (let lan = 1; ; lan++) {
        const res = await fetch(`${API}/products/${id}`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${TOKEN_GHI}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ colors: r.mau.map((m) => ({ colorFamily: m })) }),
          signal: AbortSignal.timeout(60_000),
        });
        if (res.status === 429 && lan <= 6) { await new Promise((z) => setTimeout(z, 10_000 * lan)); continue; }
        if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 120)}`);
        break;
      }
      fs.appendFileSync(SO_GHI, JSON.stringify({ id, slug: r.slug, mau: r.mau, luc: new Date().toISOString() }) + String.fromCharCode(10));
      xong += 1;
      if (xong % 20 === 0) console.log(`  ${xong}/${viec.length}`);
    } catch (e) {
      loi += 1;
      console.log(`LỖI ${r.slug}: ${String(e.message || e).slice(0, 140)}`);
    }
  }
  console.log(`XONG: ghi ${xong}, lỗi ${loi}`);
}

if (co('--hoan')) {
  const ds = fs.existsSync(SO_GHI) ? fs.readFileSync(SO_GHI, 'utf8').split(String.fromCharCode(10)).filter(Boolean).map((l) => JSON.parse(l)) : [];
  for (const d of ds) {
    const res = await fetch(`${API}/products/${d.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${TOKEN_GHI}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ colors: [] }),
    });
    console.log(d.slug, res.status);
  }
}

await prisma.$disconnect();
