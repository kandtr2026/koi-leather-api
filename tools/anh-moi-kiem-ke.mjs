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
 *
 * Từ 30/09/2026 (A Khoa: "tại sao có listing trùng mà tool không tự loại"):
 * so TOÀN BỘ ảnh thư mục (không lấy 6 mẫu nữa), thêm tầng SHA-1 file gốc đã
 * đăng, và so các thư mục TRONG CÙNG LÔ với nhau. Luật chung ở lib-trung-anh.mjs.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { vanTayWeb, vanTayNhieu, ketLuanTrung, cungMon, luuVanTayTep } from './lib-trung-anh.mjs';

const goc = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dongEnv = fs.readFileSync(path.join(goc, '.env'), 'utf8').split(/\r?\n/).find((l) => l.startsWith('DATABASE_URL='));
process.env.DATABASE_URL = dongEnv.slice('DATABASE_URL='.length).replace(/^["']|["']$/g, '');
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

const argv = process.argv.slice(2);
const giaTri = (c, d) => { const i = argv.indexOf(c); return i !== -1 && argv[i + 1] ? argv[i + 1] : d; };
// Lô ảnh: mặc định D:.2026_HEre → tools/_tmp/anh-moi. Lô khác: --nguon "D:/SP KOI" --ra sp-koi
const NGUON = giaTri('--nguon', 'D:/7.2026_HEre');
const BILL = 'G:/My Drive/Appsheet/data/TheodõiKoi-917306375-26-01-07/OrderMedia';
const SHEET = 'https://docs.google.com/spreadsheets/d/1dZ-Y_VRHmPpJU0ng8nMZy5sgR362h6OUxrWWzB-t_3w/gviz/tq?tqx=out:csv&sheet=Ori';
const RA = path.join(goc, 'tools', '_tmp', giaTri('--ra', 'anh-moi'));
fs.mkdirSync(RA, { recursive: true });
// Vân tay ảnh web dùng CHUNG mọi lô (khoá theo id ảnh, chỉ băm thêm ảnh mới).

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

// dHash / hamming / luật kết luận trùng: dùng chung ở lib-trung-anh.mjs.

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
const webList = await vanTayWeb(prisma, console.log);
console.log(`Đã có vân tay ${webList.length} ảnh web`);

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
const coAnhTrucTiep = (d) => fs.readdirSync(d, { withFileTypes: true }).some((x) => x.isFile() && laAnh(x.name));
const conCua = (d) => fs.readdirSync(d, { withFileTypes: true }).filter((x) => x.isDirectory());
const boLe = []; // ảnh rời nằm lẫn cạnh thư mục SP — không gom được thành 1 sản phẩm
for (const d of fs.readdirSync(NGUON, { withFileTypes: true })) {
  if (!d.isDirectory()) continue;
  const p = path.join(NGUON, d.name);
  if (coAnhTrucTiep(p)) { thuMuc.push({ ten: d.name, duong: p, loai: 'ngay' }); continue; }
  for (const s of conCua(p)) {
    const q = path.join(p, s.name);
    // D:\SP KOI\Handbag Cover xếp THEO HÃNG (3 tầng): hãng → thư mục SP. Thư mục
    // hãng có thư mục con thì mỗi con là 1 SP, ảnh rời của hãng bỏ qua; hãng
    // không có con thì chính nó là 1 SP — trừ thư mục "sưu tầm" gom nhiều món.
    if (d.name === 'Handbag Cover') {
      const con = conCua(q);
      if (con.length) {
        for (const c of con) thuMuc.push({ ten: c.name, duong: path.join(q, c.name), loai: 'danh-muc', danhMuc: `${d.name} / ${s.name}` });
        const le = fs.readdirSync(q).filter(laAnh).length;
        if (le) boLe.push(`${d.name}/${s.name}: ${le} ảnh rời`);
      } else if (/su+u? ?tam/i.test(s.name)) boLe.push(`${d.name}/${s.name}: thư mục sưu tầm nhiều món`);
      else thuMuc.push({ ten: s.name, duong: q, loai: 'danh-muc', danhMuc: d.name });
      continue;
    }
    thuMuc.push({ ten: s.name, duong: q, loai: 'danh-muc', danhMuc: d.name });
  }
}
if (boLe.length) console.log(['Bỏ qua (không thành 1 SP):', ...boLe].join('\n  '));
console.log(`Thư mục sản phẩm: ${thuMuc.length}`);

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

  // TOÀN BỘ ảnh thư mục (trần 120 tấm cho thư mục khổng lồ) — không lấy mẫu nữa:
  // listing đã đăng thường chỉ mang một phần ảnh, lấy 6 mẫu là trượt (lô SP KOI
  // lọt 21 món trùng vì vậy). Vân tay file có bộ nhớ đệm, lần sau không băm lại.
  const vt = await vanTayNhieu(anh.slice(0, 120));
  const kl = ketLuanTrung(vt, webList);
  // "nghi" (đúng 1 tấm khớp sát ngưỡng) GIỮ dấu trùng để không tự đăng — chờ
  // Gemini so A/B (anh-moi-soi-trung.mjs) gỡ ra nếu khác món.
  const trung = kl.nghi ? kl.goiY : kl.trung;
  const trungXoa = kl.trungXoa;
  const dMin = kl.dMin ?? 99;
  const nghi = kl.nghi;
  const mau = vt;
  kq[t.duong] = {
    ...t, ngay: m?.[1] || null, moTa: m?.[2] || t.ten, ma, maGoc: m?.[3] || null,
    soAnh: anh.length, don, bill, mau: mau.length, trung, trungXoa, dMin: dMin === 99 ? null : dMin, nghi, xong: true,
  };
  if (xong % 10 === 0) fs.writeFileSync(TEP_KQ, JSON.stringify(kq, null, 1));
  const tt = Object.entries(trung).map(([s, n]) => `${s}×${n}`).join(', ');
  console.log(`[${xong}/${thuMuc.length}] ${t.ten} · ${anh.length} ảnh · ${ma ? `đơn ${ma}${don ? ` ${don.doanhThu ?? '-'}đ` : ' (KHÔNG THẤY)'} · bill ${bill}` : 'không mã'} · ${tt ? (nghi ? 'NGHI ' : 'TRÙNG ') + tt : 'mới'}`);
}

// ---- 4. So các thư mục TRONG CÙNG LÔ với nhau ----
// Một món có 2 thư mục (2 buổi chụp, 2 nơi xếp) trước đây thành 2 listing. Thư
// mục cùng mã đơn thì bỏ qua cặp — anh-moi-dang.mjs cố ý gộp chúng làm MỘT sản
// phẩm. Mỗi cặp trùng: giữ thư mục nhiều ảnh hơn (hoà thì cái đứng trước), thư mục
// kia mang dấu trùng trỏ về nó; nếu thư mục giữ đã trùng web thì thư mục kia nhận
// luôn dấu trùng web đó.
const dsLo = [];
for (const t of thuMuc) {
  const x = kq[t.duong];
  if (!x?.soAnh) continue;
  dsLo.push({ x, vt: await vanTayNhieu(tepAnh(t.duong).slice(0, 120)) });
}
luuVanTayTep();
let trongLo = 0;
for (let i = 0; i < dsLo.length; i++) {
  for (let j = i + 1; j < dsLo.length; j++) {
    const A = dsLo[i], B = dsLo[j];
    if (A.x.ma && A.x.ma === B.x.ma) continue;
    if (A.x.trungTrongLo || B.x.trungTrongLo) continue;
    const k = cungMon(A.vt, B.vt);
    if (!k.cung) continue;
    const [giu, bo] = B.x.soAnh > A.x.soAnh ? [B, A] : [A, B];
    if (Object.keys(bo.x.trung || {}).length) continue; // đã có dấu trùng web — vốn không đăng
    const dauWeb = Object.keys(giu.x.trung || {}).length ? giu.x.trung : null;
    bo.x.trung = dauWeb ? { ...dauWeb } : { [`(cùng lô) ${giu.x.ten}`]: k.soKhop };
    bo.x.nghi = false;
    bo.x.trungTrongLo = giu.x.duong;
    trongLo += 1;
    console.log(`CÙNG LÔ: ${bo.x.ten} ≈ ${giu.x.ten} (${k.theoSha ? 'cùng file' : `${k.soKhop} ảnh y hệt`}) → bỏ ${bo.x.ten}`);
  }
}
console.log(`So trong lô: ${trongLo} thư mục trùng thư mục khác`);
fs.writeFileSync(TEP_KQ, JSON.stringify(kq, null, 1));
luuVanTayTep();
await prisma.$disconnect();
