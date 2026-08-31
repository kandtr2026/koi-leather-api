/**
 * Sửa nội dung trang day-da-dong-ho (id 875): bỏ 2 quote bịa, sửa lỗi chính tả.
 *
 *   node scripts/sua-noi-dung-day-da-dong-ho.mjs            # chạy thử, KHÔNG ghi
 *   node scripts/sua-noi-dung-day-da-dong-ho.mjs --ghi      # ghi thật
 *
 * MẶC ĐỊNH KHÔNG GHI. Áp dụng 4 phép thay chuỗi, mỗi phép assert chính xác 1
 * lần xuất hiện. Ghi DB (prisma.pages) + koi-leather-data/data/pages.json.
 * Sau khi ghi: gọi webhook revalidate storefront cho tag blog-content.
 */
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

// ---- Nạp .env ----
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

// ---- Định nghĩa 4 phép thay ----
// Mỗi phép: { needEntity, needDecoded, replace } — thử entity trước, nếu 0 thì decoded.
const PHAT_THAY = [
  {
    ten: 'Phép 1 — bỏ quote bịa Steve Jobs',
    needEntity:
      `<p>&#8220;Thời gian không đợi chờ ai, nhưng chúng ta lại có thể tạo ra những điểm dừng đẹp trong suốt hành trình.&#8221; &#8211; Nguyên tắc này của Steve Jobs không chỉ là động lực, mà còn là nguồn cảm hứng cho việc sáng tạo những sản phẩm chất lượng, độc đáo như dây đồng hồ da handmade của Koi Leather.</p>`,
    needDecoded:
      `<p>\u201CThời gian không đợi chờ ai, nhưng chúng ta lại có thể tạo ra những điểm dừng đẹp trong suốt hành trình.\u201D \u2013 Nguyên tắc này của Steve Jobs không chỉ là động lực, mà còn là nguồn cảm hứng cho việc sáng tạo những sản phẩm chất lượng, độc đáo như dây đồng hồ da handmade của Koi Leather.</p>`,
    replace:
      `<p>Ở KOI Leather, mỗi chiếc dây đồng hồ được làm thủ công từ da thật, chỉn chu trong từng đường kim mũi chỉ. Chúng tôi tin một bộ dây đẹp không chỉ là phụ kiện, mà là cách bạn để lại dấu ấn riêng trên cổ tay mình mỗi ngày.</p>`,
  },
  {
    ten: 'Phép 2 — chữa câu vỡ',
    needEntity:
      `Hãy khám phá bí mật của thời gian và đẹp với dây đồng hồ da handmade của chúng tôi &#8211; nơi nghệ thuật và thời gian gặp gỡ.`,
    needDecoded:
      `Hãy khám phá bí mật của thời gian và đẹp với dây đồng hồ da handmade của chúng tôi \u2013 nơi nghệ thuật và thời gian gặp gỡ.`,
    replace:
      `Hãy khám phá bộ sưu tập dây đồng hồ da handmade của KOI Leather \u2014 nơi tay nghề thủ công gặp gỡ vẻ đẹp của da thật.`,
  },
  {
    ten: 'Phép 3 — bỏ tên bịa Kobe Bryant',
    needEntity: `<h6>-Kobe Bryant</h6>`,
    needDecoded: `<h6>-Kobe Bryant</h6>`,
    replace: `<h6>\u2014 KOI Leather</h6>`,
  },
  {
    ten: 'Phép 4 — viết lại đoạn sến + sai chính tả',
    needEntity:
      `<p>Thời gian trôi qua và không kịp dừng lại để từng mỗi chúng ta luôn tiếc nuối và hoài niệm. Hãy trân quý những khoảnh khắc, hãy trau chuốt từng mảng thời gian, hãy chọn 1 gam màu ưng ý, 1 chiếc vân da bắt mắt để từng khoảng khắc khi ta nhận ra thời gian trôi, ta đều nhìn thấy những ưng ý và bắt mắt&#8230;</p>`,
    needDecoded:
      `<p>Thời gian trôi qua và không kịp dừng lại để từng mỗi chúng ta luôn tiếc nuối và hoài niệm. Hãy trân quý những khoảnh khắc, hãy trau chuốt từng mảng thời gian, hãy chọn 1 gam màu ưng ý, 1 chiếc vân da bắt mắt để từng khoảng khắc khi ta nhận ra thời gian trôi, ta đều nhìn thấy những ưng ý và bắt mắt\u2026</p>`,
    replace:
      `<p>Thời gian luôn trôi, nhưng cách bạn đeo nó thì có thể chọn. Một bộ dây da với gam màu ưng ý, đường vân đẹp và chất da thật sẽ khiến mỗi lần bạn nhìn đồng hồ trở thành một khoảnh khắc dễ chịu \u2014 nhỏ thôi, nhưng là của riêng bạn.</p>`,
  },
];

// ---- Hàm đếm số lần xuất hiện ----
function dem(haystack, needle) {
  if (!needle || needle.length === 0) return 0;
  let n = 0, i = -1;
  while ((i = haystack.indexOf(needle, i + 1)) !== -1) n++;
  return n;
}

/**
 * pages.json dùng escape JSON đặc biệt (PHP json_encode với JSON_HEX_TAG | JSON_HEX_AMP):
 *   & → \u0026,  < → \u003c,  > → \u003e
 * Các ký tự Unicode khác (như tiếng Việt, em dash, curly quote) là literal UTF-8.
 */
function escapeRaw(s) {
  return s.replace(/[&<>]/g, (ch) => {
    switch (ch) {
      case '&': return '\\u0026';
      case '<': return '\\u003c';
      case '>': return '\\u003e';
      default: return ch;
    }
  });
}

/**
 * Cho một haystack, với mỗi phép thay: tìm form (entity hay decoded) xuất hiện
 * ĐÚNG 1 lần. Nếu phép nào không có form nào khớp, trả về null và in lỗi.
 */
function timVaKiem(haystack) {
  const ketQua = []; // { ten, find, replace }
  for (const p of PHAT_THAY) {
    const same = p.needEntity === p.needDecoded;
    const demEntity = same ? 0 : dem(haystack, p.needEntity);
    const demDecoded = dem(haystack, p.needDecoded);
    const tong = same ? demDecoded : demEntity + demDecoded;
    if (tong === 0) {
      console.error(`✗ ${p.ten}: KHÔNG tìm thấy (entity=${demEntity}, decoded=${demDecoded})`);
      return null;
    }
    if (tong > 1) {
      console.error(`✗ ${p.ten}: tìm thấy ${tong} lần (entity=${demEntity}, decoded=${demDecoded}) — không biết cái nào`);
      return null;
    }
    const find = same ? p.needEntity : (demEntity === 1 ? p.needEntity : p.needDecoded);
    const dang = same ? 'n/a' : (demEntity === 1 ? 'entity' : 'decoded');
    console.log(`  · ${p.ten}: tìm thấy 1 lần (dạng ${dang})`);
    ketQua.push({ ten: p.ten, find, thay: p.replace });
  }
  return ketQua;
}

function apDung(haystack, danhSach) {
  let out = haystack;
  for (const { ten, find, thay } of danhSach) {
    const idx = out.indexOf(find);
    if (idx === -1) {
      console.error(`✗ ${ten}: không còn tìm thấy nội dung cần thay — dừng, không ghi`);
      process.exit(1);
    }
    out = out.slice(0, idx) + thay + out.slice(idx + find.length);
  }
  return out;
}

// ========== MAIN ==========

console.log(GHI ? '\n>>> CHẾ ĐỘ GHI THẬT <<<\n' : '\n(chạy thử — không ghi. Thêm --ghi để ghi thật)\n');

const db = new PrismaClient();

// 1. Đọc DB
const page = await db.pages.findUnique({ where: { slug: 'day-da-dong-ho' } });
if (!page) {
  console.error('✗ KHÔNG TÌM THẤY page slug=day-da-dong-ho trong DB');
  await db.$disconnect();
  process.exit(1);
}
console.log(`Đã đọc DB: id=${page.id}, title="${page.title}", content ${page.content.length} ký tự`);

// 2. Kiểm tra DB — tìm form
const dbMatches = timVaKiem(page.content);
if (!dbMatches) {
  await db.$disconnect();
  process.exit(1);
}

// 3. Áp dụng lên DB
const dbMoi = apDung(page.content, dbMatches);
console.log(`\nDB mới: ${dbMoi.length} ký tự (giảm ${page.content.length - dbMoi.length})`);

// 4. Đọc pages.json
const PAGES_JSON = 'E:/Claude A Khoa Processing/koi-leather-data/data/pages.json';
const rawJson = fs.readFileSync(PAGES_JSON, 'utf8');
const coBom = rawJson.charCodeAt(0) === 0xFEFF;
const jsonStr = coBom ? rawJson.slice(1) : rawJson;
const jsonData = JSON.parse(jsonStr);
const arr = Array.isArray(jsonData) ? jsonData : jsonData.pages;
const entry = arr.find(x => String(x.id) === '875' || x.slug === 'day-da-dong-ho');
if (!entry) {
  console.error('✗ KHÔNG TÌM THẤY entry id=875 trong pages.json');
  await db.$disconnect();
  process.exit(1);
}
const rendered = entry.content?.rendered;
if (!rendered) {
  console.error('✗ entry content.rendered rỗng trong pages.json');
  await db.$disconnect();
  process.exit(1);
}
console.log(`\nĐã đọc pages.json: id=${entry.id}, slug=${entry.slug}, rendered ${rendered.length} ký tự`);

// 5. Kiểm tra pages.json — tìm form (trong rendered, đã parse)
const jsonMatches = timVaKiem(rendered);
if (!jsonMatches) {
  await db.$disconnect();
  process.exit(1);
}

// 6. Sửa pages.json bằng THAY CHUỖI TRÊN TEXT THÔ (giữ nguyên format file + escape).
//    Mỗi find phải xuất hiện ĐÚNG 1 lần trong toàn file (ở dạng escaped).
//    Dùng escapeRaw() để biến find (entity form) thành dạng khớp với raw JSON.
const jsonMoi = apDung(rendered, jsonMatches);
const rawFix = (function () {
  let out = rawJson;
  for (const { ten, find, thay } of jsonMatches) {
    const findEsc = escapeRaw(find);
    const thayEsc = escapeRaw(thay);
    const n = dem(out, findEsc);
    if (n !== 1) {
      console.error(`✗ ${ten}: pages.json (text thô) chứa "${findEsc.slice(0, 80)}..." ${n} lần — dừng, không ghi`);
      return null;
    }
    const idx = out.indexOf(findEsc);
    out = out.slice(0, idx) + thayEsc + out.slice(idx + findEsc.length);
  }
  return out;
})();
if (!rawFix) {
  await db.$disconnect();
  process.exit(1);
}
console.log(`\npages.json (rendered) mới: ${jsonMoi.length} ký tự (giảm ${rendered.length - jsonMoi.length})`);

// 7. Kiểm tra chéo: DB và JSON đều không còn Steve Jobs, Kobe Bryant
for (const bad of ['Steve Jobs', 'Kobe Bryant']) {
  if (dbMoi.includes(bad)) {
    console.error(`✗ DB vẫn còn "${bad}" — dừng`);
    await db.$disconnect();
    process.exit(1);
  }
  if (rawFix.includes(bad)) {
    console.error(`✗ pages.json vẫn còn "${bad}" — dừng`);
    await db.$disconnect();
    process.exit(1);
  }
}
console.log(`\n✓ Xác nhận: không còn "Steve Jobs" và "Kobe Bryant"`);

// 8. GHI
if (GHI) {
  // DB
  await db.pages.update({
    where: { id: page.id },
    data: { content: dbMoi },
  });
  console.log(`✓ Đã ghi DB (pages.id=${page.id})`);

  // pages.json — ghi text thô đã thay (giữ nguyên BOM + CRLF)
  fs.writeFileSync(PAGES_JSON, rawFix, 'utf8');
  console.log(`✓ Đã ghi pages.json (id=875)`);

  // Revalidate storefront
  const revalidateUrl = process.env.NEXT_REVALIDATE_URL?.trim();
  const revalidateSecret = process.env.REVALIDATE_SECRET?.trim();
  if (revalidateUrl && revalidateSecret) {
    try {
      const res = await fetch(revalidateUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-revalidate-secret': revalidateSecret,
        },
        body: JSON.stringify({ tag: 'blog-content' }),
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        console.log(`✓ Webhook revalidate blog-content OK (${res.status})`);
      } else {
        const text = await res.text().catch(() => '');
        console.log(`⚠ Webhook revalidate trả ${res.status}: ${text.slice(0, 200)}`);
        console.log('  → Có thể storefront chưa whitelist tag "blog-content". Cần sửa koi-storefront/src/app/api/revalidate/route.ts');
      }
    } catch (e) {
      console.log(`⚠ Webhook revalidate lỗi: ${e instanceof Error ? e.message : String(e)}`);
    }
  } else {
    console.log('⚠ Không có NEXT_REVALIDATE_URL hoặc REVALIDATE_SECRET, bỏ qua webhook revalidate.');
    console.log('  → Để revalidate thủ công: gọi POST tới https://koileather.com/api/revalidate');
    console.log('    với header x-revalidate-secret và body {"tag":"blog-content"}');
  }
} else {
  console.log('\nChưa ghi gì. Chạy lại với --ghi.');
}

await db.$disconnect();