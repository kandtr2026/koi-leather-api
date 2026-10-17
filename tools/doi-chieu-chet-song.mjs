#!/usr/bin/env node
/**
 * Xác định một hàng trong public.pages / public.posts CÒN HIỆN RA hay đã chết.
 *
 * VÌ SAO PHẢI VIẾT CÁI NÀY: lần trước em phân loại bằng cách so TIÊU ĐỀ trong DB
 * với <title> trên web. Cách đó sai ở /san-pham/ — tiêu đề DB là "Sản phẩm",
 * web trả "Sản phẩm | KOI Leather", em đọc thành "hai nguồn khác nhau" rồi xếp
 * nó vào dữ liệu chết. Thực ra trang đó ĐANG render thẳng nội dung DB, kèm cả
 * CSS thô của WordPress. Suýt nữa gỡ xuất bản một URL đang sống.
 *
 * Cách chắc chắn: lấy một CHUỖI ĐẶC TRƯNG trong nội dung DB (đoạn chữ dài,
 * không phải chữ chung chung) rồi tìm đúng chuỗi đó trong HTML thật. Có thì
 * trang đang đọc từ DB; không có thì đã bị route Next che.
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

const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

const boc = (s) =>
  (s || '')
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8211;|&ndash;/g, '–')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * NHIỀU mẩu ngắn, quyết theo đa số — không dùng một câu dài.
 *
 * Bản đầu lấy câu DÀI NHẤT làm dấu nhận và báo 26 bài viết là "đã chết". Thực
 * ra cả 26 bài đều đang sống: storefront chạy lamSachNoiDung() trước khi hiển
 * thị (dọn rác WordPress, sửa "Loi Leather", gộp khoảng trắng), nên một câu dài
 * gần như luôn bị đổi ít nhất một ký tự và phép so khớp nguyên văn trượt.
 * Càng dài càng dễ trượt — đúng ngược với thứ em cần.
 *
 * Tin vào nó là gỡ xuất bản 26 bài đang chạy. Nên: cắt 6 mẩu 40 ký tự ở các vị
 * trí khác nhau, thấy từ 2 mẩu trở lên là trang đang đọc từ DB.
 */
function dauVan(noiDung) {
  const t = boc(noiDung);
  if (t.length < 60) return null;
  const viTri = [0, 0.15, 0.3, 0.45, 0.6, 0.75].map((p) => Math.floor(t.length * p));
  return [...new Set(viTri.map((i) => t.slice(i, i + 40).trim()))].filter(
    (x) => x.length >= 25 && !/[{}#;]/.test(x),
  );
}

const bang = process.argv[2] === 'posts' ? 'public.posts' : 'public.pages';
const dong = await prisma.$queryRawUnsafe(
  `select slug, content::text from ${bang} where is_published = true and content is not null order by slug`,
);

console.log(`${bang} — ${dong.length} hàng đang xuất bản\n`);
const song = [];
const chet = [];
const khongRo = [];

for (const d of dong) {
  const dau = dauVan(d.content);
  const u = `https://koileather.com/${d.slug}/`;
  let html = '';
  let ma = 0;
  try {
    const r = await fetch(u, { headers: { 'user-agent': 'koi-audit' }, redirect: 'manual' });
    ma = r.status;
    if (r.ok) html = boc(await r.text());
  } catch {
    ma = -1;
  }

  const trung = dau ? dau.filter((x) => html.includes(x)).length : 0;

  if (ma >= 300 && ma < 400) {
    chet.push({ slug: d.slug, vi: `chuyển hướng ${ma}` });
  } else if (!dau || !dau.length) {
    khongRo.push({ slug: d.slug, vi: 'nội dung quá ngắn, không lấy được dấu văn' });
  } else if (ma === 200 && trung >= 2) {
    song.push({ slug: d.slug, dau: `${trung}/${dau.length} mẩu khớp` });
  } else if (ma === 200 && trung === 1) {
    // Đúng một mẩu khớp có thể là trùng ngẫu nhiên (tên sản phẩm, tên hãng xuất
    // hiện cả ở chỗ khác trên trang). Không kết luận, để xem tay.
    khongRo.push({ slug: d.slug, vi: 'chỉ 1/6 mẩu khớp — chưa đủ chắc' });
  } else if (ma === 200) {
    chet.push({ slug: d.slug, vi: 'route Next che (0 mẩu nào khớp)' });
  } else {
    khongRo.push({ slug: d.slug, vi: `HTTP ${ma}` });
  }
}

console.log(`ĐANG SỐNG — render từ DB (${song.length}):`);
for (const x of song) console.log(`   /${x.slug}/   «${x.dau}…»`);
console.log(`\nĐÃ CHẾT — an toàn để gỡ (${chet.length}):`);
for (const x of chet) console.log(`   /${x.slug}/   ${x.vi}`);
if (khongRo.length) {
  console.log(`\nKHÔNG KẾT LUẬN ĐƯỢC (${khongRo.length}) — phải xem tay:`);
  for (const x of khongRo) console.log(`   /${x.slug}/   ${x.vi}`);
}

fs.writeFileSync(
  path.join(goc, `tools/_chet-song-${bang.split('.')[1]}.json`),
  JSON.stringify({ song, chet, khongRo }, null, 1),
);
await prisma.$disconnect();
