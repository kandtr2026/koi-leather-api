#!/usr/bin/env node
/**
 * Kiểm kê lô ảnh mới D:\7.2026_HEre trước khi đưa lên web (A Khoa 26/09/2026:
 * "Đây là các ảnh của Koi leather. Phân tích và cho upload lên website";
 * "nếu có bị trùng trên các listing rồi thì bỏ qua"; "ID cuối là tên code của
 * đơn hàng, tra cứu trên appsheet để biết giá … đọc bill order").
 *
 * CHỈ ĐỌC — không ghi gì lên web hay cơ sở dữ liệu. Ra tools/_tmp/anh-moi/:
 *   kiem-ke.json   mỗi thư mục: mã đơn, dòng AppSheet, số ảnh, ảnh bill,
 *                  và thư mục này đã có trên listing nào chưa (so vân tay ảnh).
 *
 * SO TRÙNG bằng dHash 64 bit (thu ảnh về 9×8 xám, so từng cặp điểm kề nhau):
 * bền với đổi cỡ, nén lại, đổi định dạng — đúng thứ xảy ra khi ảnh gốc Fuji
 * được đưa lên web thành webp 2048px. Không bền với cắt cúp mạnh, nên lấy vài
 * tấm mỗi thư mục chứ không một tấm.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const goc = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dongEnv = fs.readFileSync(path.join(goc, '.env'), 'utf8').split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='));
process.env.DATABASE_URL = dongEnv.slice('DATABASE_URL='.length).replace(/^["']|["']$/g, '');
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

const NGUON = 'D:/7.2026_HEre';
const BILL = 'G:/My Drive/Appsheet/data/TheodõiKoi-917306375-26-01-07/OrderMedia';
const SHEET = 'https://docs.google.com/spreadsheets/d/1dZ-Y_VRHmPpJU0ng8nMZy5sgR362h6OUxrWWzB-t_3w/gviz/tq?tqx=out:csv&sheet=Ori';
const RA = path.join(goc, 'tools', '_tmp', 'anh-moi');
fs.mkdirSync(RA, { recursive: true });
const MAU_MOI_THU_MUC = 5;
const NGUONG_TRUNG = 10; // khoảng Hamming tối đa coi là cùng một ảnh

/** CSV có ngoặc kép, xuống dòng trong ô. */
function docCsv(t) {
  const dong = [];
  let o = '', hang = [], nhay = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (nhay) {
      if (c === '"' && t[i + 1] === '"') { o += '"'; i++; }
      else if (c === '"') nhay = false;
      else o += c;
    } else if (c === '"') nhay = true;
    else if (c === ',') { hang.push(o); o = ''; }
    else if (c === '\n') { hang.push(o); dong.push(hang); hang = []; o = ''; }
    else if (c !== '\r') o += c;
  }
  if (o || hang.length) { hang.push(o); dong.push(hang); }
  return dong;
}

async function dHash(buf) {
  const { data } = await sharp(buf, { failOn: 'none' }).rotate().greyscale().resize(9, 8, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true });
  let h = 0n;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    h = (h << 1n) | (data[y * 9 + x] > data[y * 9 + x + 1] ? 1n : 0n);
  }
  return h;
}
const hamming = (a, b) => { let x = a ^ b, n = 0; while (x) { n += Number(x & 1n); x >>= 1n; } return n; };

// ---- 1. AppSheet ----
const csv = docCsv(await (await fetch(SHEET)).text());
const tieuDe = csv[0].map((x) => x.trim());
const cot = (ten) => tieuDe.indexOf(ten);
const donTheoMa = new Map();
for (const r of csv.slice(1)) {
  const stt = (r[cot('STT')] || '').trim();
  if (!stt) continue;
  donTheoMa.set(stt, {
    stt,
    ten: r[cot('Tên sản phẩm')]?.trim(),
    doanhThu: Number(String(r[cot('Doanh thu')] || '').replace(/[^\d]/g, '')) || null,
    trangThai: r[cot('Check done')]?.trim(),
    ngayXong: r[cot('Ngày hoàn thành')]?.trim(),
    stock: r[cot('Đơn Stock')]?.trim() || null,
    maDa: r[cot('Mã da')]?.trim() || null,
    seller: r[cot('Tên seller')]?.trim(),
  });
}
console.log(`AppSheet: ${donTheoMa.size} đơn`);

// ---- 2. Vân tay ảnh đang có trên web ----
const TEP_VT_WEB = path.join(RA, 'van-tay-web.json');
const vtWeb = fs.existsSync(TEP_VT_WEB) ? JSON.parse(fs.readFileSync(TEP_VT_WEB, 'utf8')) : {};
const anhWeb = await prisma.$queryRawUnsafe(`
  SELECT i.id, i.url, s.slug, s.status, s."isDeleted" AS xoa
  FROM koi_free_style.koi_product_images i JOIN koi_free_style.koi_products s ON s.id = i."productId"`);
let can = anhWeb.filter((a) => !vtWeb[a.id]);
console.log(`Ảnh trên web: ${anhWeb.length} (cần băm ${can.length})`);
for (let i = 0; i < can.length; i += 16) {
  await Promise.all(can.slice(i, i + 16).map(async (a) => {
    try {
      const u = a.url.includes('/public/products/') ? a.url.replace('/public/products/', '/public/products/w400/') : a.url;
      const r = await fetch(u, { signal: AbortSignal.timeout(20000) });
      if (!r.ok) return;
      vtWeb[a.id] = (await dHash(Buffer.from(await r.arrayBuffer()))).toString(16);
    } catch { /* bỏ */ }
  }));
  if (i % 400 === 0) { fs.writeFileSync(TEP_VT_WEB, JSON.stringify(vtWeb)); process.stdout.write(`.${i}`); }
}
fs.writeFileSync(TEP_VT_WEB, JSON.stringify(vtWeb));
const webList = anhWeb.filter((a) => vtWeb[a.id]).map((a) => ({ ...a, h: BigInt('0x' + vtWeb[a.id]) }));
console.log(`\nĐã có vân tay ${webList.length} ảnh web`);

// ---- 3. Thư mục ảnh mới ----
const laAnh = (f) => /\.(jpe?g|png)$/i.test(f) && !f.startsWith('._');
function tepAnh(thuMuc) {
  const ra = [];
  for (const x of fs.readdirSync(thuMuc, { withFileTypes: true })) {
    const p = path.join(thuMuc, x.name);
    if (x.isFile() && laAnh(x.name)) ra.push(p);
    else if (x.isDirectory()) for (const y of fs.readdirSync(p)) if (laAnh(y)) ra.push(path.join(p, y));
  }
  return ra.sort();
}

const thuMuc = [];
for (const d of fs.readdirSync(NGUON, { withFileTypes: true })) {
  if (!d.isDirectory()) continue;
  if (/^\d{6}_/.test(d.name)) thuMuc.push({ ten: d.name, duong: path.join(NGUON, d.name), loai: 'ngay' });
  else for (const s of fs.readdirSync(path.join(NGUON, d.name), { withFileTypes: true })) {
    if (s.isDirectory()) thuMuc.push({ ten: s.name, duong: path.join(NGUON, d.name, s.name), loai: 'danh-muc', danhMuc: d.name });
  }
}

const TEP_KQ = path.join(RA, 'kiem-ke.json');
const kq = fs.existsSync(TEP_KQ) ? JSON.parse(fs.readFileSync(TEP_KQ, 'utf8')) : {};
let xong = 0;
for (const t of thuMuc) {
  xong++;
  if (kq[t.duong]?.xong) continue;
  const m = t.ten.match(/^(\d{6})_(.+?)(?:_([^_]+))?$/);
  const ma = t.loai === 'ngay' && m?.[3] && /^\d+$/.test(m[3]) ? m[3] : null;
  const anh = tepAnh(t.duong);
  const don = ma ? donTheoMa.get(ma) || null : null;
  let bill = 0;
  if (ma && fs.existsSync(path.join(BILL, ma))) bill = fs.readdirSync(path.join(BILL, ma)).filter((f) => /\.(jpe?g|png)$/i.test(f)).length;

  // Lấy mẫu rải đều trong thư mục.
  const buoc = Math.max(1, Math.floor(anh.length / MAU_MOI_THU_MUC));
  const mau = anh.filter((_, i) => i % buoc === 0).slice(0, MAU_MOI_THU_MUC);
  const trung = {};
  for (const f of mau) {
    try {
      const h = await dHash(await sharp(f, { failOn: 'none' }).resize(256, 256, { fit: 'inside' }).toBuffer());
      let tot = null;
      for (const w of webList) {
        const d = hamming(h, w.h);
        if (d <= NGUONG_TRUNG && (!tot || d < tot.d)) tot = { d, slug: w.slug, status: w.status, xoa: w.xoa };
      }
      if (tot) trung[tot.slug] = (trung[tot.slug] || 0) + 1;
    } catch { /* ảnh hỏng */ }
  }
  kq[t.duong] = {
    ...t, ngay: m?.[1] || null, moTa: m?.[2] || t.ten, ma, maGoc: m?.[3] || null,
    soAnh: anh.length, don, bill, mau: mau.length, trung, xong: true,
  };
  if (xong % 10 === 0) fs.writeFileSync(TEP_KQ, JSON.stringify(kq, null, 1));
  const tt = Object.entries(trung).map(([s, n]) => `${s}×${n}`).join(', ');
  console.log(`[${xong}/${thuMuc.length}] ${t.ten} · ${anh.length} ảnh · ${ma ? `đơn ${ma}${don ? ` ${don.doanhThu ?? '-'}đ` : ' (KHÔNG THẤY)'} · bill ${bill}` : 'không mã'} · ${tt ? 'TRÙNG ' + tt : 'mới'}`);
}
fs.writeFileSync(TEP_KQ, JSON.stringify(kq, null, 1));
await prisma.$disconnect();
