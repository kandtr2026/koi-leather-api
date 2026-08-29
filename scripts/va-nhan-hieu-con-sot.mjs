/**
 * VÁ HAI CHỖ LƯỢT ĐỔI TÊN BỎ SÓT.
 *
 *   node scripts/va-nhan-hieu-con-sot.mjs           # chạy thử
 *   node scripts/va-nhan-hieu-con-sot.mjs --ghi     # ghi thật
 *
 * ================================ CHỖ 1 ================================
 * `KoiProduct.descriptionBlocks` LỆCH với `KoiProduct.description`.
 *
 * Lượt a53bc1c sửa `description` mà không sửa `descriptionBlocks`. Hai cột này
 * là hai cách lưu CÙNG một nội dung: `description` là HTML storefront đọc,
 * `descriptionBlocks` là mảng khối để admin mở lại trình dựng. product.service
 * .ts:166 nói thẳng "không bao giờ được lệch nhau" — và tôi làm chúng lệch.
 *
 * Hậu quả KHÔNG thấy ngay trên trang: descriptionBlocks không ra mặt tiền, nên
 * quét mặt tiền vẫn sạch. Nó bung ra lúc chủ shop mở đúng sản phẩm đó trong
 * admin rồi bấm lưu — buildDescriptionData() in lại HTML TỪ KHỐI, tức là chữ
 * "Bao da iPhone Chanel Quilted" quay lại đè lên bản đã dọn. Một cái bấm lưu vô
 * tình là hoàn tác cả lượt sửa, mà không ai biết vì sao.
 *
 * Cách vá: áp ĐÚNG các phép thay của bảng DOI_TEN lên chữ trong từng khối. Không
 * sinh lại khối từ HTML — làm thế là mất cấu trúc khối (tiêu đề, danh sách) mà
 * người ta đã dựng bằng tay.
 *
 * ================================ CHỖ 2 ================================
 * 9 hàng bảng `pages` (di sản WordPress) ĐANG ĐÓNG BĂNG TÊN HÀNG CŨ.
 *
 * /tui-da-nu/ trả 200 và vẫn in "Túi Tote Longchamp Da Bò Vân Togo Nâu
 * Chocolate", "Loewe Hammock Hobo Bag", "Tiffany Bag – Da Epi – Aqua", "Túi Da
 * Nữ Celine", "Phong Cách Chanel". Đây là HTML WordPress chép cứng vào cột
 * `content` — không đọc từ koi_products, nên đổi tên sản phẩm KHÔNG chạm tới nó.
 * Khác với tag: mấy trang này KHÔNG noindex.
 *
 * Cách vá: thay tenCu → tenMoi trong `content`. Chịu được khác loại gạch và
 * khác hoa thường, cùng lý do đã học ở lượt alt (gạch "–" với "-" nhìn y nhau).
 */
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';
import { DOI_TEN } from './doi-ten-nhan-hieu.data.mjs';

const env = fs.readFileSync(path.resolve(import.meta.dirname, '..', '.env'), 'utf8');
for (const l of env.split(/\r?\n/)) {
  const m = /^([A-Z_]+)=(.*)$/.exec(l.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const CO = new Set(process.argv.slice(2));
for (const c of CO) {
  if (c !== '--ghi') { console.error(`Cờ lạ: ${c}. Chỉ nhận --ghi.`); process.exit(1); }
}
const GHI = CO.has('--ghi');

/** Regex chịu được khác loại gạch (- – —) và khác hoa thường. */
function reTen(ten) {
  const esc = ten
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/[-–—]/g, '[-–—]')
    .replace(/\s+/g, '\\s+');
  return new RegExp(esc, 'giu');
}

function reCum(cum) {
  const esc = cum.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  return new RegExp('(?<![\\p{L}])' + esc + '(?![\\p{L}])', 'giu');
}

/** Giữ chữ hoa đầu cụm — cùng lý do đã ghi trong doi-ten-nhan-hieu.mjs. */
function thayGiuHoa(s, reg, doi) {
  return s.replace(reg, (khop) => {
    const hoa = khop[0] === khop[0].toUpperCase() && khop[0] !== khop[0].toLowerCase();
    return hoa ? doi.charAt(0).toUpperCase() + doi.slice(1) : doi;
  });
}

/** Áp toàn bộ phép thay của một dòng DOI_TEN lên một đoạn chữ. */
function apDung(chu, v) {
  let r = chu;
  for (const [tim, doi] of v.thay ?? []) r = r.split(tim).join(doi);
  for (const [tim, doi] of v.thayNhan ?? []) r = thayGiuHoa(r, reCum(tim), doi);
  r = r.replace(reTen(v.tenCu), v.tenMoi);
  return r;
}

function conNhan(nhan, s) {
  const esc = nhan.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '[\\s-]+');
  return new RegExp('(?<![\\p{L}])' + esc + '(?![\\p{L}])', 'iu').test(String(s ?? ''));
}

const db = new PrismaClient();
const loi = [];

/* ===================== CHỖ 1: descriptionBlocks ===================== */

/**
 * Đi sâu vào mọi chuỗi trong cây khối và áp phép thay. Không đoán hình dạng
 * khối (khối có thể là {type,text}, {type,items:[…]}, lồng nhau) — cứ chuỗi nào
 * gặp thì thay, khoá thì để nguyên. Nhờ vậy thêm loại khối mới về sau vẫn chạy.
 */
function thayTrongCay(nut, v) {
  if (typeof nut === 'string') return apDung(nut, v);
  if (Array.isArray(nut)) return nut.map((x) => thayTrongCay(x, v));
  if (nut && typeof nut === 'object') {
    const ra = {};
    for (const [k, val] of Object.entries(nut)) ra[k] = thayTrongCay(val, v);
    return ra;
  }
  return nut;
}

const suaKhoi = [];
for (const v of DOI_TEN) {
  const p = await db.koiProduct.findUnique({
    where: { slug: v.slug },
    select: { id: true, descriptionBlocks: true },
  });
  if (!p) { loi.push(`${v.slug}: không thấy sản phẩm`); continue; }
  if (!p.descriptionBlocks) continue;

  const truoc = JSON.stringify(p.descriptionBlocks);
  const coNhan = (v.phaiSach ?? []).some((n) => conNhan(n, truoc));
  const coTenCu = reTen(v.tenCu).test(truoc);
  if (!coNhan && !coTenCu) continue;

  const moi = thayTrongCay(p.descriptionBlocks, v);
  const sau = JSON.stringify(moi);
  if (sau === truoc) {
    loi.push(`${v.slug}: descriptionBlocks CÒN nhãn hiệu mà phép thay không khớp gì`);
    continue;
  }
  const sot = (v.phaiSach ?? []).filter((n) => conNhan(n, sau));
  if (sot.length) loi.push(`${v.slug}: descriptionBlocks sau khi thay vẫn còn ${sot.join('/')}`);

  suaKhoi.push({ id: p.id, slug: v.slug, truoc: p.descriptionBlocks, moi });
}

/* ========================= CHỖ 2: bảng pages ========================= */

/**
 * TÊN ĐÓNG BĂNG mà bảng DOI_TEN không phủ được.
 *
 * Hai món này có `name` trong koi_products ĐÃ SẠCH từ trước lượt của tôi (ai đó
 * sửa tay), nên `tenCu` trong DOI_TEN là tên đã sạch — không khớp được với tên
 * CŨ HƠN đang đóng băng trong HTML WordPress.
 */
const TEN_DONG_BANG = [
  ['Túi Xách Nữ Da Bò Swift Đen – Phong Cách Chanel', 'Túi Xách Nữ Chần Trám – Da Cừu – Đen'],
  ['Dây Lưng Da Bò Swift Đen Nâu – Khóa Cartier Bạc', 'Dây Lưng Da Box Calf Đen Nâu – Khoá Bạc'],
];

/**
 * CHỈ THAY TÊN, KHÔNG áp `thay`/`thayNhan` của DOI_TEN lên bảng pages.
 *
 * Bản chạy thử đầu tiên đã chứng minh vì sao: dòng tui-da-nu-celine có
 * thayNhan ['Celine' → 'mẫu túi này'] — viết cho THÂN BÀI của đúng món đó, nơi
 * "Celine" đứng một mình thay cho tên món. Áp lên trang dùng chung thì nó ăn vào
 * tên món KHÁC: "Phong Cách Celine Dion" thành "Phong Cách mẫu túi này Dion".
 *
 * Bài học: phép thay theo NGỮ CẢNH MỘT SẢN PHẨM không mang sang chỗ dùng chung
 * được. Ở đây trang chỉ liệt kê TÊN hàng nên thay tên là đủ và đúng.
 *
 * Tên DÀI thay trước: "Túi Crossbody … – Phong Cách Celine Dion" phải được thay
 * nguyên cụm trước khi bất kỳ tên ngắn hơn kịp cắt vào giữa nó.
 */
const THAY_TRANG = [
  ...DOI_TEN.map((v) => [v.tenCu, v.tenMoi]),
  ...TEN_DONG_BANG,
].sort((a, b) => b[0].length - a[0].length);

const suaPage = [];
const trangCanXem = await db.pages.findMany({
  select: { id: true, slug: true, content: true, is_published: true },
});

for (const t of trangCanXem) {
  let chu = t.content ?? '';
  if (!chu) continue;
  const truoc = chu;
  const daDung = [];

  for (const [cu, moi] of THAY_TRANG) {
    const reg = reTen(cu);
    if (!reg.test(chu)) continue;
    chu = chu.replace(reTen(cu), moi);
    daDung.push(cu);
  }
  if (chu === truoc) continue;

  suaPage.push({ id: t.id, slug: t.slug, hienDang: t.is_published, truoc, moi: chu, daDung });
}

/* ============================== BÁO CÁO ============================== */

console.log('');
console.log(`CHỖ 1 · descriptionBlocks lệch: ${suaKhoi.length} sản phẩm`);
for (const s of suaKhoi) console.log(`   ${GHI ? '✓' : '·'} ${s.slug}`);

console.log('');
console.log(`CHỖ 2 · trang WordPress cũ    : ${suaPage.length} trang`);
for (const s of suaPage) {
  console.log(`   ${GHI ? '✓' : '·'} /${s.slug}/  ${s.hienDang ? '' : '(chưa xuất bản) '}— thay ${s.daDung.length} tên`);
  for (const t of s.daDung) console.log(`         · ${t}`);
}

if (loi.length) {
  console.log('');
  console.error('DỪNG — không ghi một dòng nào:');
  for (const l of loi) console.error('   · ' + l);
  await db.$disconnect();
  process.exit(1);
}

if (!GHI) {
  console.log('\n(chạy thử — chưa ghi gì. Chạy lại với --ghi)');
  await db.$disconnect();
  process.exit(0);
}

/* =============================== GHI =============================== */

const dau = new Date().toISOString().replace(/[:.]/g, '-');
const q = (s) => (s === null || s === undefined ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`);
const sql = [
  ...suaKhoi.map((s) => `UPDATE koi_free_style.koi_products SET "descriptionBlocks"=${q(JSON.stringify(s.truoc))}::jsonb WHERE id='${s.id}'; -- ${s.slug}`),
  ...suaPage.map((s) => `UPDATE public.pages SET content=${q(s.truoc)} WHERE id=${s.id}; -- ${s.slug}`),
];
const tep = path.resolve(import.meta.dirname, `_goc-va-sot-${dau}.sql`);
fs.writeFileSync(tep, sql.join('\n') + '\n', 'utf8');
console.log(`\nĐã chụp SQL hoàn tác → ${path.basename(tep)}`);

for (const s of suaKhoi) {
  await db.koiProduct.update({ where: { id: s.id }, data: { descriptionBlocks: s.moi } });
}
for (const s of suaPage) {
  await db.pages.update({ where: { id: s.id }, data: { content: s.moi } });
}
console.log(`Đã ghi ${suaKhoi.length} descriptionBlocks + ${suaPage.length} trang.`);

await db.$disconnect();
