/**
 * Ghi mô tả cho các danh mục còn trống chữ.
 *
 *   node scripts/viet-mo-ta-danh-muc.mjs            # chạy thử, KHÔNG ghi
 *   node scripts/viet-mo-ta-danh-muc.mjs --ghi      # ghi thật
 *
 * MẶC ĐỊNH KHÔNG GHI. Chữ nằm sẵn ở scripts/mo-ta-danh-muc.data.mjs — script
 * này không gọi AI, không sinh chữ, chỉ chép vào cột.
 *
 * BA LỚP CHẶN, theo thứ tự nguy hiểm giảm dần:
 *
 *  1. CHỈ GHI KHI CỘT ĐANG TRỐNG. Danh mục nào đã có mô tả thì BỎ QUA và báo ra,
 *     không ghi đè. 27/35 danh mục đang có chữ do chủ shop hoặc WordPress cũ
 *     viết; ghi đè là xoá chữ người khác mà không ai biết. Muốn sửa mô tả đã có
 *     thì làm trong admin, không phải bằng script hàng loạt.
 *  2. CHẶN SLUG TRONG KHONG_VIET. `trademark` và `ca-nhan-hoa` không được ghi kể
 *     cả khi có ai đó thêm chữ cho chúng vào tệp dữ liệu — lý do đầy đủ ở cuối
 *     mo-ta-danh-muc.data.mjs (rủi ro cổng thanh toán và nhãn hiệu người khác).
 *  3. KIỂM ĐỘ DÀI TRƯỚC KHI CHẠM DB. Mô tả > 320 ký tự (ngưỡng line-clamp của
 *     CategoryIntro) hoặc metaDescription > 165 thì DỪNG CẢ LƯỢT, không ghi một
 *     dòng nào. Ghi nửa lô rồi lỗi là trạng thái tệ nhất: không biết cái nào đã
 *     vào, cái nào chưa.
 *
 * metaTitle/metaDescription: mapCategory() trong src/shop/shop.service.ts hiện
 * KHÔNG trả hai cột này ra, nên koi-storefront chưa đọc — nó tự dựng title từ
 * `name` và description từ `description`. Vẫn ghi vì đây là chỗ đúng của chúng
 * và admin có ô sửa; nhưng đừng trông đợi thấy đổi trên trang sau khi chạy.
 */
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';
import { MO_TA, KHONG_VIET } from './mo-ta-danh-muc.data.mjs';

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

const TRAN_MO_TA = 320; // ngưỡng line-clamp của CategoryIntro
const TRAN_META = 165;

function chuThuong(html) {
  return html.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

/* ---- Lớp chặn 2 + 3: soát toàn bộ TRƯỚC khi mở kết nối ---- */

const loi = [];
for (const [slug, v] of Object.entries(MO_TA)) {
  if (KHONG_VIET.includes(slug)) loi.push(`${slug}: nằm trong KHONG_VIET, không được ghi`);
  const dai = chuThuong(v.description).length;
  if (dai > TRAN_MO_TA) loi.push(`${slug}: mô tả ${dai} ký tự > ${TRAN_MO_TA}`);
  if (dai < 150) loi.push(`${slug}: mô tả ${dai} ký tự — quá mỏng, Google coi là trang rỗng`);
  if (v.metaDescription.length > TRAN_META) {
    loi.push(`${slug}: metaDescription ${v.metaDescription.length} ký tự > ${TRAN_META}`);
  }
  if (v.metaTitle.length > 70) loi.push(`${slug}: metaTitle ${v.metaTitle.length} ký tự > 70`);
  if (!/^<p>[\s\S]*<\/p>$/.test(v.description.trim())) {
    loi.push(`${slug}: mô tả phải bọc trong <p>…</p>`);
  }
}
if (loi.length) {
  console.error('DỪNG — chữ chưa đạt, không chạm DB:');
  for (const l of loi) console.error('  · ' + l);
  process.exit(1);
}

console.log(`Soát chữ: ${Object.keys(MO_TA).length} danh mục, đạt hết.`);
console.log(GHI ? '\n>>> CHẾ ĐỘ GHI THẬT <<<\n' : '\n(chạy thử — không ghi. Thêm --ghi để ghi thật)\n');

const db = new PrismaClient();
const ketQua = { daGhi: [], boQuaDaCoChu: [], khongThay: [] };

for (const [slug, v] of Object.entries(MO_TA)) {
  const cat = await db.koiCategory.findUnique({
    where: { slug },
    select: { id: true, name: true, description: true, metaTitle: true, metaDescription: true },
  });

  if (!cat) {
    ketQua.khongThay.push(slug);
    console.log(`✗ ${slug} — KHÔNG THẤY danh mục`);
    continue;
  }

  // Lớp chặn 1: đã có chữ thì không chạm.
  if (cat.description && cat.description.trim().length > 0) {
    ketQua.boQuaDaCoChu.push(slug);
    console.log(`— ${slug} — đã có mô tả ${cat.description.trim().length} ký tự, BỎ QUA`);
    continue;
  }

  const dai = chuThuong(v.description).length;
  console.log(`${GHI ? '✓' : '·'} ${slug} — ${cat.name} — ${dai} ký tự`);
  console.log(`    ${chuThuong(v.description).slice(0, 150)}…`);

  if (GHI) {
    await db.koiCategory.update({
      where: { id: cat.id },
      data: {
        description: v.description,
        // Chỉ đặt meta khi đang trống — không ghi đè meta chủ shop đã viết.
        metaTitle: cat.metaTitle?.trim() ? cat.metaTitle : v.metaTitle,
        metaDescription: cat.metaDescription?.trim() ? cat.metaDescription : v.metaDescription,
      },
    });
    ketQua.daGhi.push(slug);
  }
}

console.log('\n================ TỔNG ================');
console.log(`Đã ghi          : ${ketQua.daGhi.length}${ketQua.daGhi.length ? ' → ' + ketQua.daGhi.join(', ') : ''}`);
console.log(`Bỏ qua (có chữ) : ${ketQua.boQuaDaCoChu.length}${ketQua.boQuaDaCoChu.length ? ' → ' + ketQua.boQuaDaCoChu.join(', ') : ''}`);
console.log(`Không thấy      : ${ketQua.khongThay.length}${ketQua.khongThay.length ? ' → ' + ketQua.khongThay.join(', ') : ''}`);
console.log(`Cố ý không viết : ${KHONG_VIET.join(', ')}`);
if (!GHI) console.log('\nChưa ghi gì. Chạy lại với --ghi.');

await db.$disconnect();
