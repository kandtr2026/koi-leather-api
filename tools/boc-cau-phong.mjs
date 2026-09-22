#!/usr/bin/env node
/**
 * Bóc riêng những CÂU cần viết lại — đợt 2 của koi-db-copy-review.
 *
 * Mon ràng: đợt này không được thay thế cơ học, phải đọc từng câu. Nên việc
 * của script này KHÔNG phải sửa, mà là gom đúng những câu đáng đọc rồi in ra
 * để em đọc và viết tay bản thay thế.
 *
 * Đợt 1 đã chứng minh không có đường tắt: 579/601 câu có dấu hiệu là câu riêng
 * biệt, không phải khối lặp.
 *
 * Chấm điểm thay vì lọc nhị phân: một câu có ba cụm sáo thì đáng đọc trước một
 * câu chỉ có một cụm.
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

/**
 * Dấu hiệu "mắc óe".
 *
 * Toàn bộ lấy từ chữ CÓ THẬT trong DB, không phải em tự nghĩ ra danh sách rồi
 * đi tìm. Nhóm nặng là loại khẳng định không kiểm chứng được ("uy tín nhất",
 * "đẳng cấp") và loại nói thay cảm xúc người mua ("biết mình là ai").
 */
const DAU_HIEU = [
  [3, /tuyên ngôn|khẳng định đẳng cấp|đỉnh cao|biểu tượng của (sự )?(xa xỉ|đẳng cấp)|giới thượng lưu|quý ông hiện đại|người phụ nữ hiện đại/gi],
  [3, /(uy tín|tốt|đẹp|sang trọng|cao cấp) nhất (trên )?(toàn quốc|thị trường|Việt Nam)|số 1 Việt Nam|hàng đầu Việt Nam/gi],
  [3, /biết (rõ )?mình là ai|không ngại thể hiện|không bao giờ (thỏa hiệp|lỗi thời)|khí chất/gi],
  [2, /người bạn đồng hành (hoàn hảo|lý tưởng)?|đồng hành cùng bạn|nâng tầm đẳng cấp|thể hiện đẳng cấp/gi],
  [2, /lựa chọn (hoàn hảo|lý tưởng|đầu bảng|không thể bỏ qua)|hoàn hảo cho|xứng đáng (trở thành|sở hữu)/gi],
  [2, /Hãy cùng .{0,20}Leather (tìm hiểu|khám phá)|qua bài viết dưới đây|Đến với .{0,20}Leather/gi],
  [1, /đẳng cấp|xa xỉ|thượng lưu|tinh hoa|đỉnh cao|sang trọng bậc nhất|quyền lực/gi],
  [1, /(?<![a-zà-ỹ])[Bb]ạn(?![a-zà-ỹ])(?!\s+(bè|gái|trai|đời|trẻ|thân|đọc))/g],
];

const boc = (s) =>
  s
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#8211;|&ndash;/g, '–')
    .replace(/\\n/g, ' ')
    .replace(/\s+/g, ' ');

const dong = await prisma.$queryRawUnsafe(
  `select slug, name::text, description::text from koi_free_style.koi_products
    where status = 'ACTIVE' and description is not null`,
);

const ra = [];
for (const d of dong) {
  let ten = d.name;
  try {
    ten = JSON.parse(d.name).vi ?? ten;
  } catch {
    /* name là chữ thường, không phải JSON — để nguyên */
  }
  const t = boc(d.description);
  for (const cau of t.split(/(?<=[.!?])\s+/)) {
    const c = cau.trim();
    if (c.length < 22 || c.length > 320) continue;
    let diem = 0;
    const co = [];
    for (const [w, re] of DAU_HIEU) {
      re.lastIndex = 0;
      const k = c.match(re);
      if (k) {
        diem += w * k.length;
        co.push(...k.slice(0, 2));
      }
    }
    if (diem >= 2) ra.push({ slug: d.slug, ten, diem, cum: [...new Set(co)].slice(0, 4), cau: c });
  }
}

ra.sort((a, b) => b.diem - a.diem);
fs.writeFileSync(path.join(goc, 'tools/_cau-phong.json'), JSON.stringify(ra, null, 1));

const sp = new Set(ra.map((x) => x.slug));
console.log(`${ra.length} câu cần đọc, nằm trong ${sp.size} sản phẩm\n`);
const tu = Number(process.argv[2] || 0);
const den = tu + Number(process.argv[3] || 25);
for (const x of ra.slice(tu, den)) {
  console.log(`[${String(x.diem).padStart(2)}] ${x.slug}`);
  console.log(`     ${x.cau}`);
}
await prisma.$disconnect();
