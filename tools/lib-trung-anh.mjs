/**
 * CHỐNG ĐĂNG TRÙNG listing — dùng chung cho anh-moi-kiem-ke.mjs và anh-moi-dang.mjs.
 *
 * VÌ SAO (A Khoa 28/09/2026: "tại sao có những listing trùng nhau mà tool không tự
 * loại ra lúc upload"). Soát lại 2 lô 7.2026 + SP KOI thấy 29 cặp listing mới trùng
 * nhau hoặc trùng listing cũ. Ba lỗ hổng của bản cũ:
 *   1. kiểm kê chỉ băm 6 ẢNH MẪU mỗi thư mục, mà listing đã đăng chỉ mang một
 *      phần ảnh của thư mục → mẫu trượt hết, tool tưởng "chưa có" (21/23 ca);
 *   2. không so các thư mục TRONG CÙNG LÔ với nhau (một món 2 thư mục = 2 listing);
 *   3. không kiểm lại ngay trước khi tạo listing (lô khác vừa đăng trong lúc đó).
 *
 * HAI TẦNG:
 *   - SHA-1 của FILE GỐC: sổ tools/_tmp/sha-da-dang.json {sha1: slug}, ghi mỗi
 *     lần tải một ảnh lên. Cùng một file đã đăng → trùng chắc 100%, không cần đoán.
 *   - Vân tay dHash (thu ảnh về 9×8 điểm xám) của TOÀN BỘ ảnh: bắt cả ảnh giống
 *     hệt bằng mắt nhưng khác byte (đổi cỡ, đổi định dạng, nén lại) — đo 28/09:
 *     so byte chỉ bắt 17/76 cặp trùng, vân tay bắt đủ 76/76.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const goc = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const TMP = path.join(goc, 'tools', '_tmp');
/** Vân tay ảnh web dùng chung mọi lô (khoá theo id ảnh). */
export const TEP_VT_WEB = path.join(TMP, 'anh-moi', 'van-tay-web.json');
/** Vân tay + SHA của từng file ảnh gốc trên đĩa (khoá theo đường dẫn|cỡ|giờ sửa). */
const TEP_VT_TEP = path.join(TMP, 'van-tay-tep.json');
/** Sổ SHA-1 file gốc đã tải lên web → slug. */
const TEP_SO_SHA = path.join(TMP, 'sha-da-dang.json');

/** Hamming tối đa coi là CÙNG một ảnh. */
export const NGUONG_KHOP = 10;
/** Hamming coi là gần như y hệt — một tấm khớp tới mức này là đủ kết luận trùng. */
export const NGUONG_CHAC = 4;

export async function dHash(buf) {
  const { data } = await sharp(buf, { failOn: 'none' }).rotate().greyscale().resize(9, 8, { fit: 'fill' }).raw().toBuffer({ resolveWithObject: true });
  let h = 0n;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) h = (h << 1n) | (data[y * 9 + x] > data[y * 9 + x + 1] ? 1n : 0n);
  return h;
}
const pop32 = (x) => { x -= (x >>> 1) & 0x55555555; x = (x & 0x33333333) + ((x >>> 2) & 0x33333333); return (((x + (x >>> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24; };
export const tach = (h) => [Number(h >> 32n) >>> 0, Number(h & 0xffffffffn) >>> 0];
export const hamming = (a, b) => pop32((a[0] ^ b[0]) >>> 0) + pop32((a[1] ^ b[1]) >>> 0);

const docJson = (f, d) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : d);

// ---------- file trên đĩa ----------
let vtTep = null;
let vtTepBan = 0;
/** { sha, h:[hi,lo] } của một file ảnh gốc — có bộ nhớ đệm trên đĩa. */
export async function vanTayTep(f) {
  vtTep ??= docJson(TEP_VT_TEP, {});
  const st = fs.statSync(f);
  const k = `${f}|${st.size}|${Math.round(st.mtimeMs)}`;
  if (!vtTep[k]) {
    const buf = fs.readFileSync(f);
    const sha = crypto.createHash('sha1').update(buf).digest('hex');
    // Thu về 256px trước khi băm — y như bản cũ, để vân tay khớp sổ web đã có.
    const h = await dHash(await sharp(buf, { failOn: 'none' }).resize(256, 256, { fit: 'inside' }).toBuffer());
    vtTep[k] = { sha, h: h.toString(16) };
    if (++vtTepBan % 200 === 0) luuVanTayTep();
  }
  return { sha: vtTep[k].sha, h: tach(BigInt('0x' + vtTep[k].h)) };
}
export function luuVanTayTep() {
  if (vtTep) fs.writeFileSync(TEP_VT_TEP, JSON.stringify(vtTep));
}

/** Băm NHIỀU file song song (sharp giải mã ảnh 6000px khá nặng — 6 luồng). */
export async function vanTayNhieu(files, luong = 6) {
  const kq = new Array(files.length);
  let i = 0;
  await Promise.all(Array.from({ length: luong }, async () => {
    while (i < files.length) {
      const k = i++;
      try { kq[k] = { f: files[k], ...(await vanTayTep(files[k])) }; } catch { kq[k] = null; }
    }
  }));
  return kq.filter(Boolean);
}

// ---------- ảnh web ----------
/**
 * Vân tay MỌI ảnh đang có trên web (kể cả listing đã xoá mềm — cờ `xoa`), băm
 * thêm ảnh mới chưa có trong sổ. Trả [{ slug, xoa, h }].
 */
export async function vanTayWeb(prisma, log = () => {}) {
  const vt = docJson(TEP_VT_WEB, {});
  const anh = await prisma.$queryRawUnsafe(`
    SELECT i.id, i.url, s.slug, s."isDeleted" AS xoa
    FROM koi_free_style.koi_product_images i JOIN koi_free_style.koi_products s ON s.id = i."productId"`);
  const can = anh.filter((a) => !vt[a.id]);
  log(`Ảnh trên web: ${anh.length} (cần băm ${can.length})`);
  for (let i = 0; i < can.length; i += 16) {
    await Promise.all(can.slice(i, i + 16).map(async (a) => {
      try {
        const u = a.url.includes('/public/products/') ? a.url.replace('/public/products/', '/public/products/w400/') : a.url;
        const r = await fetch(u, { signal: AbortSignal.timeout(20000) });
        if (!r.ok) return;
        vt[a.id] = (await dHash(Buffer.from(await r.arrayBuffer()))).toString(16);
      } catch { /* bỏ */ }
    }));
    if (i % 400 === 0) fs.writeFileSync(TEP_VT_WEB, JSON.stringify(vt));
  }
  fs.writeFileSync(TEP_VT_WEB, JSON.stringify(vt));
  return anh.filter((a) => vt[a.id]).map((a) => ({ slug: a.slug, xoa: a.xoa, h: tach(BigInt('0x' + vt[a.id])) }));
}

// ---------- sổ SHA đã đăng ----------
let soSha = null;
export function docSoSha() {
  soSha ??= docJson(TEP_SO_SHA, {});
  return soSha;
}
export function ghiSoSha(sha, slug) {
  docSoSha()[sha] = slug;
  fs.writeFileSync(TEP_SO_SHA, JSON.stringify(soSha));
}

/**
 * Kết luận một bộ ảnh (vân tay + sha) có trùng listing nào không.
 *   tầng 1: file nào đã có trong sổ SHA → trùng chắc;
 *   tầng 2: đếm số ảnh khớp (≤ NGUONG_KHOP) theo từng slug. Trùng khi một slug
 *           khớp ≥2 ảnh, hoặc có ảnh gần như y hệt (≤ NGUONG_CHAC). Đúng MỘT ảnh
 *           khớp sát ngưỡng → "nghi" (để Gemini so A/B, anh-moi-soi-trung.mjs).
 * `webList` = [{slug, xoa, h}] (vanTayWeb + ảnh vừa đăng trong lượt).
 */
export function ketLuanTrung(ds, webList) {
  const so = docSoSha();
  const trung = {};
  const trungXoa = {};
  let dMin = 99;
  let theoSha = false;
  for (const x of ds) {
    if (so[x.sha]) { trung[so[x.sha]] = (trung[so[x.sha]] || 0) + 1; theoSha = true; dMin = 0; continue; }
    let tot = null;
    for (const w of webList) {
      const d = hamming(x.h, w.h);
      if (d <= NGUONG_KHOP && (!tot || d < tot.d)) tot = { d, slug: w.slug, xoa: w.xoa };
    }
    if (tot) {
      trung[tot.slug] = (trung[tot.slug] || 0) + 1;
      if (tot.xoa) trungXoa[tot.slug] = true;
      dMin = Math.min(dMin, tot.d);
    }
  }
  const nhieu = Math.max(0, ...Object.values(trung));
  const chac = theoSha || nhieu >= 2 || dMin <= NGUONG_CHAC;
  const tong = Object.values(trung).reduce((a, b) => a + b, 0);
  return {
    trung: chac ? trung : {},
    trungXoa,
    dMin: dMin === 99 ? null : dMin,
    nghi: !chac && tong === 1,
    theoSha,
    goiY: chac ? {} : trung,
  };
}

/**
 * Hai bộ ảnh (2 thư mục trong cùng lô) có phải CÙNG một món: trùng SHA bất kỳ,
 * hoặc ≥2 ảnh gần như y hệt (≤ NGUONG_CHAC).
 */
export function cungMon(a, b) {
  const shaB = new Set(b.map((x) => x.sha));
  if (a.some((x) => shaB.has(x.sha))) return { cung: true, soKhop: a.filter((x) => shaB.has(x.sha)).length, theoSha: true };
  let soKhop = 0;
  for (const x of a) if (b.some((y) => hamming(x.h, y.h) <= NGUONG_CHAC)) soKhop += 1;
  return { cung: soKhop >= 2, soKhop, theoSha: false };
}
