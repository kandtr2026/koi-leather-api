/**
 * BÙ LIÊN KẾT DANH MỤC cho sản phẩm có categoryId chính nhưng KHÔNG có dòng nào
 * ở koi_product_categories (đo 16/09/2026: 19 món, thêm ngày 05/09 từ hoá đơn).
 * Trang danh mục lọc qua bảng nối nên các món này đang vô hình dù đã gán danh mục.
 *
 *   node scripts/bu-lien-ket-danh-muc.mjs          # chạy thử
 *   node scripts/bu-lien-ket-danh-muc.mjs --ghi    # ghi thật (có SQL hoàn tác)
 */
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';
const env = fs.readFileSync(path.resolve(import.meta.dirname, '..', '.env'), 'utf8');
for (const l of env.split(/\r?\n/)) { const m = /^([A-Z_]+)=(.*)$/.exec(l.trim()); if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, ''); }
const GHI = process.argv.includes('--ghi');
const sqlStr = (s) => `'${String(s).replace(/'/g, "''")}'`;
const db = new PrismaClient();
const hang = await db.koiProduct.findMany({
  where: { isDeleted: false, categoryId: { not: null }, categoryLinks: { none: {} } },
  select: { id: true, slug: true, categoryId: true, status: true, category: { select: { slug: true } } },
});
console.log(GHI ? '\n>>> CHẾ ĐỘ GHI THẬT <<<' : '\n(chạy thử — không ghi)');
console.log(`Có danh mục chính mà thiếu liên kết: ${hang.length}`);
for (const p of hang) console.log(`  + ${p.slug} → ${p.category?.slug} [${p.status}]`);
if (!GHI) { await db.$disconnect(); process.exit(0); }
const moc = new Date().toISOString().replace(/[:.]/g, '-');
fs.writeFileSync(path.resolve(import.meta.dirname, `_goc-bu-lien-ket-${moc}.sql`),
  [`-- Hoàn tác bu-lien-ket-danh-muc.mjs lúc ${moc}`, ...hang.map((p) => `DELETE FROM koi_free_style.koi_product_categories WHERE "productId" = ${sqlStr(p.id)} AND "categoryId" = ${sqlStr(p.categoryId)};`), ''].join('\n'), 'utf8');
for (const p of hang) await db.koiProductCategory.create({ data: { productId: p.id, categoryId: p.categoryId } });
const con = await db.koiProduct.count({ where: { isDeleted: false, status: 'ACTIVE', categoryLinks: { none: {} } } });
console.log(`Đã bù ${hang.length} liên kết. Kiểm lại: ACTIVE không có liên kết = ${con}`);
await db.$disconnect();
