#!/usr/bin/env node
/**
 * Xác minh trên WEB THẬT sau khi sửa DB — task koi-db-copy-review-20260922-002.
 *
 * VÌ SAO KHÔNG TIN BẢN QUÉT DB: đợt sửa phía git tháng này đã dính đúng một lần
 * — tsc/eslint/build đều xanh, bản quét nội bộ báo sạch, mà web thật vẫn còn
 * hàng trăm chỗ sai vì chính bộ quét có lỗ hổng. Chỉ có tải trang thật về đọc
 * mới biết khách đang nhìn thấy gì.
 *
 * Lấy URL từ sitemap để khỏi tự bịa danh sách trang.
 */
const GOC = 'https://koileather.com';

/** Cụm CẤM — còn một chỗ cũng là chưa xong. */
const CAM = [
  ['tuyên ngôn', /tuyên ngôn/gi],
  ['lựa chọn lý tưởng', /lựa chọn (lý tưởng|hoàn hảo)/gi],
  ['giới thượng lưu', /giới thượng lưu/gi],
  ['bạn đồng hành', /bạn đồng hành/gi],
  ['biết mình là ai', /biết (rõ )?mình là ai/gi],
  ['uy tín nhất', /(uy tín|cao cấp) nhất (trên )?(toàn quốc|thị trường)/gi],
  ['Koi Leather', /Koi Leather/g],
  ['Loi Leather', /Loi Leather/g],
  ['Quý khách', /[Qq]uý khách/g],
  ['dập nóng', /[Dd]ập nóng/g],
  ['Xưởng may', /Xưởng may/g],
  ['xưởng báo giá', /xưởng báo giá/gi],
  ['xưởng sửa miễn phí', /xưởng sửa miễn phí/gi],
  ['HUGE SALE', /HUGE SALE/gi],
  ['giỏ hàng của bạn', /giỏ hàng của bạn/gi],
];

/** Cụm PHẢI CÒN — từ khoá thật, mất là mất traffic. */
const PHAI_CON = [
  ['xưởng đồ da', /xưởng đồ da/gi],
  ['tại xưởng', /tại xưởng/gi],
  ['xưởng thủ công', /xưởng thủ công/gi],
];

/**
 * ĐƯỢC PHÉP CÒN "Koi Leather" — bỏ ra trước khi đếm.
 *
 * Không phải chỗ nào cũng nên về 0. Bốn câu dưới là LỜI KHÁCH viết trong review
 * Google thật; sửa chữ trong đó là bịa lại lời người ta đã đăng công khai. Còn
 * PLACE_QUERY là tên doanh nghiệp đăng ký trên Google Maps — đổi là hỏng luôn
 * phần tra cứu Places.
 *
 * Nguồn: koi-storefront/src/lib/google-reviews.ts
 */
const DUOC_PHEP = [
  'Mình sẽ ghé và ủng hộ Koi Leather lâu dài',
  'các sản phẩm thủ công của Koi Leather, mong Koi Leather sẽ được biết đến',
  'Koi Leather custom made two leather watch bands',
  'Koi Leather shop in Saigon replaced',
  'Koi Leather - Đồ Da Thủ Công Cao Cấp',
  // Tên SẢN PHẨM. Đổi tên là đổi H1 và thẻ title của trang sản phẩm — đang chờ
  // A Khoa quyết, không phải sót.
  'Tổng hợp các dấu Stamp By Koi Leather',
];

const chuThich = (s) => {
  let t = s.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]*>/g, ' ');
  for (const d of DUOC_PHEP) t = t.split(d).join(' [REVIEW-THAT] ');
  return t;
};

const sm = await (await fetch(`${GOC}/sitemap.xml`)).text();
let url = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);

// Sitemap có thể là chỉ mục trỏ tới các sitemap con.
if (url.length && url.every((u) => /sitemap.*\.xml/.test(u))) {
  const con = [];
  for (const s of url.slice(0, 6)) {
    const t = await (await fetch(s)).text();
    con.push(...[...t.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
  }
  url = con;
}

// Lấy mẫu trải đều thay vì 60 trang đầu (sitemap hay xếp theo nhóm, lấy đầu
// danh sách là chỉ soi đúng một nhóm rồi tưởng đã soi cả site).
const SO = Number(process.argv[2] || 60);
const buoc = Math.max(1, Math.floor(url.length / SO));
const mau = url.filter((_, i) => i % buoc === 0).slice(0, SO);

console.log(`Sitemap: ${url.length} URL — kiểm ${mau.length} trang trải đều\n`);

/**
 * LƯỢT LÀM NÓNG.
 *
 * Sau khi gọi /api/revalidate, Next đánh dấu trang là cũ nhưng LẦN GỌI ĐẦU vẫn
 * trả bản cũ rồi mới dựng lại ở nền (stale-while-revalidate). Bản quét đầu của
 * em chỉ gọi một lượt nên đọc trúng bản cũ và báo còn 102 chỗ "Koi Leather" +
 * 8 "Quý khách" — trong khi DB đã sạch và gọi lại lần hai là mất hẳn. Suýt nữa
 * thì em đi sửa những chỗ vốn đã đúng.
 *
 * Nên: lượt 1 chỉ để đánh thức, lượt 2 mới tính.
 */
console.log('Lượt làm nóng (không tính)…');
await Promise.all(
  mau.map((u) => fetch(u, { headers: { 'user-agent': 'koi-audit-warm' } }).catch(() => null)),
);
await new Promise((r) => setTimeout(r, 15000));
console.log('Lượt đo thật:\n');

const tong = {};
const con = {};
let hong = 0;
for (const u of mau) {
  let html;
  try {
    const r = await fetch(u, { headers: { 'user-agent': 'koi-audit' } });
    if (!r.ok) {
      console.log(`  ${r.status}  ${u}`);
      hong += 1;
      continue;
    }
    html = chuThich(await r.text());
  } catch (e) {
    console.log(`  LỖI  ${u} — ${e.message}`);
    hong += 1;
    continue;
  }
  for (const [ten, re] of CAM) {
    const n = (html.match(re) || []).length;
    if (n) {
      tong[ten] = (tong[ten] || 0) + n;
      if ((tong[`_${ten}`] || 0) < 3) {
        tong[`_${ten}`] = (tong[`_${ten}`] || 0) + 1;
        console.log(`  ⚠ ${ten} ×${n}  ${u}`);
      }
    }
  }
  for (const [ten, re] of PHAI_CON) con[ten] = (con[ten] || 0) + (html.match(re) || []).length;
}

console.log(`\n=== CỤM CẤM (phải bằng 0) ===`);
const xau = Object.entries(tong).filter(([k]) => !k.startsWith('_'));
if (!xau.length) console.log('  Không còn cụm nào.');
for (const [k, n] of xau) console.log(`  ${String(n).padStart(5)}  ${k}`);

console.log(`\n=== TỪ KHOÁ PHẢI CÒN (phải > 0) ===`);
for (const [k, n] of Object.entries(con)) console.log(`  ${String(n).padStart(5)}  ${k}${n === 0 ? '   ⚠ MẤT RỒI' : ''}`);
if (hong) console.log(`\n${hong} trang không tải được.`);
