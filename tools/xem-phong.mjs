#!/usr/bin/env node
/**
 * In TOÀN BỘ câu trước/sau của đợt 2 để đọc bằng mắt — và ghi khi đã đọc xong.
 *
 * Không in mẫu vài dòng như đợt 1. Mon ràng "đọc từng câu" nên phải in hết,
 * và phải in CÂU HOÀN CHỈNH sau khi bỏ thẻ HTML, vì thứ cần đánh giá là câu
 * tiếng Việt đọc lên có xuôi không, chứ không phải đoạn markup.
 *
 *   node tools/xem-phong.mjs            # in tất cả
 *   node tools/xem-phong.mjs 40 40      # từ câu 40, in 40 câu
 *   node tools/xem-phong.mjs --ghi      # ghi vào DB
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const goc = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
process.env.DATABASE_URL = fs
  .readFileSync(path.join(goc, '.env'), 'utf8')
  .split(/\r?\n/)
  .find((l) => l.startsWith('DATABASE_URL='))
  .slice('DATABASE_URL='.length)
  .replace(/^["']|["']$/g, '');

const { LUAT_PHONG } = await import('./luat-phong.mjs');
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();
const GHI = process.argv.includes('--ghi');
const so = process.argv.filter((a) => /^\d+$/.test(a)).map(Number);
const TU = so[0] ?? 0;
const SO = so[1] ?? 10000;

const boc = (s) =>
  s
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * So khớp THEO CÂU, không theo chỉ số ký tự.
 *
 * Bản đầu em lấy câu bằng vị trí `m.index` của lần khớp, rồi dùng chính vị trí
 * đó cắt vào chuỗi ĐÃ SỬA. Sai: mỗi lần thay là chuỗi ngắn đi, chỉ số trôi, nên
 * ở sản phẩm dính nhiều luật thì phần "SAU" in ra là một câu khác — có lần in
 * ra trước/sau y hệt nhau, tức là em đang "đọc" một câu không hề đổi và tưởng
 * mình đã duyệt. Đọc nhầm còn tệ hơn không đọc.
 *
 * Cách chắc chắn: tách cả hai bản thành câu, bỏ những câu giống nhau, phần còn
 * lại đúng là những gì đã đổi.
 */
function catCau(s) {
  return boc(s)
    .split(/(?<=[.!?])\s+/)
    .map((c) => c.trim())
    .filter(Boolean);
}

function doiGi(truoc, sau) {
  const a = catCau(truoc);
  const b = catCau(sau);
  const conB = [...b];
  const ra = [];
  for (const c of a) {
    const i = conB.indexOf(c);
    if (i !== -1) {
      conB.splice(i, 1);
      continue;
    }
    ra.push({ truoc: c, sau: null });
  }
  // Ghép câu cũ với câu mới tương ứng.
  //
  // Phải thử cả ĐUÔI chứ không chỉ ĐẦU: phần lớn luật ở đây sửa ngay đầu câu
  // ("Đây là lựa chọn lý tưởng cho X" -> "Đây hợp với X"), nên so 18 ký tự đầu
  // là trượt và câu bị gán nhãn "(cắt hẳn câu)" oan. Lần đầu chạy có 8 câu bị
  // báo nhầm như vậy — đủ để em tưởng mình vừa xoá mất 8 câu.
  for (const x of ra) {
    const t = x.truoc;
    const thu = [
      (c) => c.slice(0, 40) === t.slice(0, 40),
      (c) => c.slice(-40) === t.slice(-40),
      (c) => c.slice(0, 18) === t.slice(0, 18),
      (c) => c.slice(-25) === t.slice(-25),
    ];
    let k = -1;
    for (const f of thu) {
      k = conB.findIndex(f);
      if (k !== -1) break;
    }
    if (k !== -1) {
      x.sau = conB[k];
      conB.splice(k, 1);
    } else {
      x.sau = '(cắt hẳn câu)';
    }
  }
  return ra;
}

function ap(s) {
  let t = s;
  const thay = [];
  for (const l of LUAT_PHONG) {
    l.tim.lastIndex = 0;
    const khop = [...t.matchAll(l.tim)];
    if (!khop.length) continue;
    for (const m of khop) thay.push({ luat: l.ten, i: m.index, dai: m[0].length, truoc: t });
    t = t.replace(l.tim, (...a) => (typeof l.thay === 'function' ? l.thay(...a) : l.thay));
  }
  return { moi: t, thay };
}

const laJson = (s) => {
  try {
    JSON.parse(s);
    return true;
  } catch {
    return false;
  }
};

/**
 * Chạy được trên cả mô tả sản phẩm lẫn bài viết.
 *
 * Lý do phải mở rộng: sau khi mô tả sản phẩm sạch, crawl lại web thật vẫn thấy
 * "tuyên ngôn", "lựa chọn lý tưởng", "uy tín nhất trên toàn quốc" — nhưng ở
 * BÀI BLOG. Đợt trước em chỉ chạy nhóm thương hiệu trên public.posts vì Mon
 * phân xử về chữ "bạn"; phân xử đó không nói gì tới lối viết thổi phồng, mà
 * "uy tín nhất toàn quốc" thì không chỉ là văn phong — đó là lời khẳng định
 * không kiểm chứng được.
 *
 *   node tools/xem-phong.mjs --bai      # chạy trên public.posts
 */
const BAI = process.argv.includes('--bai');
const TRANG = process.argv.includes('--trang');
const dong = TRANG
  ? (
      await prisma.$queryRawUnsafe(
        `select id, slug, content::text as description, null::text as b
           from public.pages where is_published = true order by slug`,
      )
    ).filter((d) => d.description)
  : BAI
  ? (
      await prisma.$queryRawUnsafe(
        `select id, slug, content::text as description, null::text as b
           from public.posts where is_published = true order by slug`,
      )
    ).filter((d) => d.description)
  : await prisma.$queryRawUnsafe(
      `select id, slug, description::text, "descriptionBlocks"::text as b
         from koi_free_style.koi_products where status='ACTIVE' and description is not null order by slug`,
    );

/** Trang WordPress di trú đã bị route Next trùng slug che — dữ liệu chết. */
const TRANG_CHET = new Set([
  'chinh-sach-giao-hang',
  'chinh-sach-hoan-tien-doi-tra',
  'day-da-dong-ho',
  'lien-he',
  'san-pham',
  'cua-hang',
  'thanh-toan',
  'tai-khoan',
  'shop',
  'gio-hang',
  'blogs',
  'tin-tuc-su-kien',
]);

/** Bài viết bị route Next trùng slug che — sửa cũng không hiện ra. */
const BAI_CHET = new Set([
  'dich-vu-lam-tui-da-theo-yeu-cau',
  'spa-tui-hieu',
  'dich-vu-boc-da-tai-nghe-cao-cap',
  'dinh-vu-do-va-cat-day-lung-chuyen-nghiep',
  'qua-tang-doanh-nghiep-cuoi-nam',
  'qua-tang-tet-doanh-nghiep',
  'qua-tang-su-kien-bang-da',
]);

let n = 0;
let soSP = 0;
let soCau = 0;
const boQua = [];
const demLuat = {};

for (const d of dong) {
  if (BAI && BAI_CHET.has(d.slug)) continue;
  if (TRANG && TRANG_CHET.has(d.slug)) continue;
  const a = ap(d.description);
  if (!a.thay.length) continue;

  const b = d.b ? ap(d.b) : null;
  if (b) {
    const kA = a.thay.reduce((o, x) => ({ ...o, [x.luat]: (o[x.luat] || 0) + 1 }), {});
    const kB = b.thay.reduce((o, x) => ({ ...o, [x.luat]: (o[x.luat] || 0) + 1 }), {});
    const khac = [...new Set([...Object.keys(kA), ...Object.keys(kB)])].filter((k) => kA[k] !== kB[k]);
    if (khac.length) {
      boQua.push({ slug: d.slug, ly_do: `hai cột lệch: ${khac.join(', ')}` });
      continue;
    }
  }
  if (laJson(d.description) && !laJson(a.moi)) {
    boQua.push({ slug: d.slug, ly_do: 'JSON vỡ' });
    continue;
  }

  soSP += 1;
  for (const x of a.thay) demLuat[x.luat] = (demLuat[x.luat] || 0) + 1;
  const luat = [...new Set(a.thay.map((x) => x.luat))].join(', ');
  for (const c of doiGi(d.description, a.moi)) {
    soCau += 1;
    n += 1;
    if (n <= TU || n > TU + SO) continue;
    console.log(`\n${n}. ${d.slug}  [${luat}]`);
    console.log(`   T: ${c.truoc}`);
    console.log(`   S: ${c.sau}`);
  }

  if (GHI) {
    if (BAI || TRANG) {
      // Phải chọn bảng theo ĐÚNG chế độ đang chạy. Nhánh này lúc đầu chỉ biết
      // `BAI`, nên chạy `--trang --ghi` sẽ lấy nội dung trang mà ghi đè vào
      // public.posts theo id — hai bảng id khác nhau, hậu quả là ghi bừa.
      await prisma.$executeRawUnsafe(
        `update ${TRANG ? 'public.pages' : 'public.posts'} set content=$1 where id=$2`,
        a.moi,
        d.id,
      );
    } else {
      await prisma.$executeRawUnsafe(
        `update koi_free_style.koi_products set description=$1, "descriptionBlocks"=$2 where id=$3`,
        a.moi,
        b ? b.moi : d.b,
        d.id,
      );
    }
  }
}

console.log(`\n${GHI ? 'ĐÃ GHI' : 'CHẠY THỬ'} — ${soSP} sản phẩm, ${soCau} chỗ\n`);
for (const [k, v] of Object.entries(demLuat).sort((x, y) => y[1] - x[1])) console.log(String(v).padStart(5), k);
if (boQua.length) {
  console.log(`\n⚠ bỏ qua ${boQua.length} sản phẩm:`);
  for (const x of boQua) console.log(`   ${x.slug} — ${x.ly_do}`);
}
await prisma.$disconnect();
