#!/usr/bin/env node
/**
 * Soát văn phong cho phần copy NẰM TRONG DB — task koi-db-copy-review.
 *
 * Đợt trước (koi-copy-review) chỉ sửa được chữ nằm trong git. Phần lớn chữ
 * khách đọc thật ra nằm ở DB: mô tả sản phẩm, bài viết, mô tả danh mục, meta.
 * `git grep` không thấy chúng, nên chúng sống sót nguyên vẹn qua cả đợt đó.
 *
 * Script này CHỈ ĐỌC. Không update gì. Việc sửa nằm ở sua-copy-db.mjs, và chỉ
 * chạy sau khi đã sao lưu.
 *
 *   node tools/soat-copy-db.mjs           # bảng tổng hợp
 *   node tools/soat-copy-db.mjs --vi-du   # kèm câu ví dụ thật
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const goc = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dongEnv = fs
  .readFileSync(path.join(goc, '.env'), 'utf8')
  .split(/\r?\n/)
  .find((l) => l.startsWith('DATABASE_URL='));
if (!dongEnv) {
  console.error('Không thấy DATABASE_URL trong .env');
  process.exit(1);
}
process.env.DATABASE_URL = dongEnv.slice('DATABASE_URL='.length).replace(/^["']|["']$/g, '');

const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();
const viDu = process.argv.includes('--vi-du');

/**
 * Các cột chữ KHÁCH ĐỌC ĐƯỢC. Bỏ qua cột nội bộ (ghi chú sản xuất, searchText)
 * vì sửa chúng không đổi gì trên web mà lại làm nhiễu lịch sử dữ liệu.
 */
const BANG = [
  { ten: 'koi_free_style.koi_products', khoa: 'id', cot: ['name', 'description', 'descriptionBlocks', 'metaTitle', 'metaDescription'] },
  { ten: 'koi_free_style.koi_categories', khoa: 'id', cot: ['name', 'description', 'metaTitle', 'metaDescription'] },
  { ten: 'koi_free_style.koi_product_images', khoa: 'id', cot: ['altText'] },
  { ten: 'public.posts', khoa: 'id', cot: ['title', 'excerpt', 'content', 'meta_title', 'meta_description'] },
  { ten: 'public.pages', khoa: 'id', cot: ['title', 'content', 'meta_title', 'meta_description'] },
  // CỐ Ý BỎ public.products.description: mapPublicProduct() ở
  // shop-content.service.ts trả thẳng `description: null`, nên 479 chữ "bạn"
  // trong cột đó không bao giờ tới mắt khách. Sửa chúng là sửa dữ liệu chết.
  { ten: 'public.products', khoa: 'id', cot: ['name', 'short_description', 'meta_title', 'meta_description'] },
  { ten: 'public.product_images', khoa: 'id', cot: ['alt'] },
  { ten: 'public.categories', khoa: 'id', cot: ['name', 'description'] },
  { ten: 'public.post_terms', khoa: 'id', cot: ['name', 'description'] },
  { ten: 'public.tags', khoa: 'id', cot: ['name', 'description'] },
];

/**
 * Dấu hiệu văn phong sai, theo CODE_THEO_MON_KOI.
 *
 * "xưng xưởng" tách riêng khỏi "xưởng" trống trơn: Mon cấm CÁCH XƯNG, không cấm
 * chữ. "xưởng đồ da" là từ khoá thật (17 truy vấn GSC/Ads), xoá là mất traffic.
 * Nên chỉ tính là lỗi khi ngay sau "xưởng" là động từ, và ngay trước không phải
 * giới từ chỉ nơi chốn.
 */
const DAU_HIEU = [
  ['ban', /(?<![a-zà-ỹ])[Bb]ạn(?![a-zà-ỹ])/g, 'xưng "bạn" với khách'],
  ['minh', /(?<![a-zà-ỹ])(tụi mình|bên mình|chúng mình|mình sẽ|mình sẽ|mình làm|mình nhận)(?![a-zà-ỹ])/gi, 'Koi tự xưng "mình"'],
  // Mở hoa/thường ở cả hai chữ: "quý Khách" / "Quý Khách" có thật trong DB.
  // Bộ quét và bộ sửa phải dùng cùng một mẫu, nếu không thì bộ quét sẽ báo sạch
  // đúng những chỗ bộ sửa vừa bỏ sót.
  ['quy-khach', /[Qq]uý\s+[Kk]hách/g, '"Quý khách" — sáo'],
  ['dap-nong', /[Dd]ập nóng/g, '"dập nóng" — 0 truy vấn, dùng "khắc tên"'],
  ['xuong-may', /[Xx]ưởng may(?![a-zà-ỹ])/g, '"Xưởng may" làm chủ thể'],
  ['xung-xuong', /(?<!(tại|ở|về|tới|đến|ghé|qua|từ|trong|ngoài|của|cảnh|thăm) )[Xx]ưởng\s+(làm|nhận|nói|báo|gửi|đọc|sửa|đã|sẽ|xuất|đề|gọi|trả|dập|trao|cắt|xem|tư|vẫn|chọn|xử|có|bảo|đều|mới|xác|biết|vẽ|dùng|cần|xếp|cam|không|dành|đối|hoàn|chỉnh|bắt|kể|sản|luôn|nhập|cho|lên|hoạt|chưa|quay|kiểm|tính|chốt|ghép|khâu|may|thường|phải|chỉ|giữ|đặt|tạo|đo)(?![a-zà-ỹ])/g, '"xưởng" làm chủ ngữ'],
  ['shop', /(?<![a-zà-ỹ])[Ss]hop(?![a-zà-ỹ])/g, '"shop" — không phải giọng KOI'],
  ['cam-than', /!{2,}|\.{4,}/g, 'dấu câu cảm thán/lửng lặp'],
  ['sale', /(?<![a-zà-ỹ])(sale off|SALE|giá rẻ nhất|siêu rẻ|cực rẻ|hot nhất|số 1 Việt Nam|uy tín nhất|tốt nhất thị trường)(?![a-zà-ỹ])/g, 'lời quảng cáo thổi phồng'],
];

/**
 * Bóc phần chữ KHÁCH THẬT SỰ ĐỌC ra khỏi HTML.
 *
 * Bài viết di trú từ WordPress là HTML thô, và bộ đếm đầu tiên của em đếm cả
 * chữ nằm trong thuộc tính thẻ — `href="...#2_Shop_ban_day_nit"`, `class=`,
 * `data-start=`. Riêng nhóm "shop" ở public.posts vì vậy mà phình lên 524,
 * trong khi phần lớn là mã neo mục lục của plugin ez-toc, không ai nhìn thấy.
 * Đếm sai kiểu này nguy hiểm hơn là không đếm: nó dẫn tới sửa nhầm vào markup.
 */
function bocHtml(s) {
  return s
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#8217;|&rsquo;/g, "'")
    .replace(/\s+/g, ' ');
}

/** Bóc chữ ra khỏi cột có thể là JSON {vi,en} hoặc JSON block. */
function bocChu(v) {
  if (v == null) return '';
  if (typeof v !== 'string') return String(v);
  const t = v.trim();
  if (!t.startsWith('{') && !t.startsWith('[')) return v;
  try {
    const j = JSON.parse(t);
    const ra = [];
    const di = (x) => {
      if (typeof x === 'string') ra.push(x);
      else if (Array.isArray(x)) x.forEach(di);
      else if (x && typeof x === 'object') Object.values(x).forEach(di);
    };
    di(j);
    return ra.join('\n');
  } catch {
    return v;
  }
}

const tong = {};
const mau = {};

for (const b of BANG) {
  let dong;
  try {
    dong = await prisma.$queryRawUnsafe(
      `select "${b.khoa}"::text as _id, ${b.cot.map((c) => `"${c}"::text as "${c}"`).join(', ')} from ${b.ten}`,
    );
  } catch (e) {
    console.log(`${b.ten.padEnd(32)} — KHÔNG ĐỌC ĐƯỢC: ${String(e.message).split('\n').find((d) => d.trim() && !d.trim().endsWith(':'))?.trim()}`);
    continue;
  }

  const dem = {};
  let dongDinh = new Set();
  for (const d of dong) {
    for (const c of b.cot) {
      const chu = bocHtml(bocChu(d[c]));
      if (!chu) continue;
      for (const [ma, re, nhan] of DAU_HIEU) {
        const khop = chu.match(re);
        if (!khop) continue;
        const k = `${c}|${ma}`;
        dem[k] = (dem[k] || 0) + khop.length;
        dongDinh.add(d._id);
        if (viDu && !mau[`${b.ten}|${ma}`]) {
          const i = chu.search(re);
          mau[`${b.ten}|${ma}`] = { nhan, cau: chu.slice(Math.max(0, i - 60), i + 90).replace(/\s+/g, ' ') };
        }
      }
    }
  }

  const soLoi = Object.values(dem).reduce((a, x) => a + x, 0);
  console.log(`\n${b.ten}  —  ${dong.length} dòng, ${dongDinh.size} dòng dính, ${soLoi} lỗi`);
  for (const [k, n] of Object.entries(dem).sort((a, c) => c[1] - a[1])) {
    const [cot, ma] = k.split('|');
    console.log(`   ${String(n).padStart(5)}  ${cot}.${ma}`);
  }
  tong[b.ten] = { dong: dong.length, dongDinh: dongDinh.size, soLoi, dem };
}

if (viDu) {
  console.log('\n\n=== VÍ DỤ THẬT ===');
  for (const [k, v] of Object.entries(mau)) {
    console.log(`\n[${k}] ${v.nhan}`);
    console.log(`   …${v.cau}…`);
  }
}

fs.writeFileSync(path.join(goc, 'tools/_soat-copy-db.json'), JSON.stringify(tong, null, 1));
console.log('\nĐã ghi tools/_soat-copy-db.json');
await prisma.$disconnect();
