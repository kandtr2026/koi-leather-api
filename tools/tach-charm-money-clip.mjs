#!/usr/bin/env node
/**
 * Dọn danh mục Charm + Money Clip (A Khoa 28/09/2026: "tách 1 Categories Charm và
 * Money Clip riêng").
 *
 * Hai danh mục đã có sẵn (charm-deo-tui-bang-da, kep-tien-money-clip) nhưng lẫn:
 * túi xách "kèm charm", lót ly, bao AirPods… nằm trong Charm, còn charm son,
 * charm chạm khắc lại nằm ngoài. Mặt tiền đếm theo BẢNG NỐI koi_product_categories
 * (một món nhiều danh mục), danh mục chính (categoryId) là breadcrumb.
 *
 * Danh sách chốt TAY theo slug (không đoán bằng regex): món lưng chừng charm/móc
 * khoá để nguyên chờ A Khoa quyết.
 *
 *   node tools/tach-charm-money-clip.mjs          xem trước, không ghi
 *   node tools/tach-charm-money-clip.mjs --ghi    sao lưu rồi ghi
 *   node tools/tach-charm-money-clip.mjs --hoan   trả lại đúng như trước
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const goc = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dongEnv = fs
  .readFileSync(path.join(goc, '.env'), 'utf8')
  .split(/\r?\n/)
  .find((l) => l.startsWith('DATABASE_URL='));
process.env.DATABASE_URL = dongEnv.slice('DATABASE_URL='.length).replace(/^["']|["']$/g, '');
const { PrismaClient } = await import('@prisma/client');
const db = new PrismaClient();
const argv = process.argv.slice(2);

const CHARM = 'charm-deo-tui-bang-da';
const MONEY_CLIP = 'kep-tien-money-clip';
const SAO_LUU = 'koi_free_style.koi_danh_muc_backup_20260928';

/** Không phải charm — gỡ khỏi danh mục Charm (vẫn giữ các danh mục khác). */
const BO_KHOI_CHARM = [
  'tui-tote-da-mau-den-kem-charm-hoa-huong-duong',
  'tui-revu-da-bo-chan-tram-mau-vang-bo-kem-charm-hoa',
  'tui-xach-nu-da-bo-hat-sac-nau-bo-nap-gap-dinh-khoa-hoa',
  'tui-matame-01-da-togo-nap-gap-kem-vi-tron',
  'lot-ly-da-bo-van-hat-vien-luon-song-mau-xanh-navy',
  'bao-da-tai-nghe-airpods-mau-vang-bo-kem-charm-no',
  'boc-chia-khoa-o-to-mazda-da-de-alran-kem-no',
];
/** Charm thật đang nằm ngoài — thêm vào danh mục Charm (giữ danh mục cũ). */
const THEM_VAO_CHARM = [
  'charm-son-deo-tui',
  'charm-son-deo-tui-1',
  'charm-son-lipstick-charm',
  'charm-son-1',
  'charm-son-2',
  'charm-cham-khac-hinh-cho-con',
  'charm-cham-khac-cho-con',
  'charm-tron-cham-khac-pet-cung-theo-anh-rieng-cua-khach-hang-1',
  'charm-balo-deo-tui-bo-tien-the-xe-di-cho-bang-da-that-nhieu-mau-sac',
  'charm-ngua-eco-village-moq-20-pcs',
];
/** Danh mục CHÍNH đang là mục chung (Phụ kiện / Sản phẩm khác) → về đúng mục. */
const DOI_CHINH = {
  'charm-cuu-da-bo-pink-yellow-green-black': CHARM,
  'charm-eo-tui-may-bay-a350-900-da-swift-trang-olive': CHARM,
  'charm-balo-deo-tui-bo-tien-the-xe-di-cho-bang-da-that-nhieu-mau-sac': CHARM,
  'long-money-clip-da-be-blue': MONEY_CLIP,
};

const tatCaSlug = [...new Set([...BO_KHOI_CHARM, ...THEM_VAO_CHARM, ...Object.keys(DOI_CHINH)])];

if (argv.includes('--hoan')) {
  const n = await db.$transaction(async (tx) => {
    const bk = await tx.$queryRawUnsafe(`SELECT product_id, category_id, links FROM ${SAO_LUU}`);
    for (const b of bk) {
      await tx.$executeRawUnsafe(`UPDATE koi_free_style.koi_products SET "categoryId" = $2 WHERE id = $1`, b.product_id, b.category_id);
      await tx.$executeRawUnsafe(`DELETE FROM koi_free_style.koi_product_categories WHERE "productId" = $1`, b.product_id);
      await tx.$executeRawUnsafe(
        `INSERT INTO koi_free_style.koi_product_categories ("productId", "categoryId", "createdAt")
         SELECT $1, x->>'categoryId', (x->>'createdAt')::timestamptz FROM jsonb_array_elements($2::jsonb) x`,
        b.product_id,
        JSON.stringify(b.links),
      );
    }
    return bk.length;
  }, { timeout: 60_000 });
  console.log(`Đã trả lại ${n} sản phẩm từ ${SAO_LUU}`);
  await db.$disconnect();
  process.exit(0);
}

const dm = new Map(
  (await db.$queryRawUnsafe(`SELECT id, slug FROM koi_free_style.koi_categories WHERE slug = ANY($1::text[])`, [CHARM, MONEY_CLIP])).map((r) => [r.slug, r.id]),
);
const sp = await db.$queryRawUnsafe(
  `SELECT s.id, s.slug, s."categoryId",
     COALESCE((SELECT array_agg(pc."categoryId") FROM koi_free_style.koi_product_categories pc WHERE pc."productId" = s.id), '{}') noi
   FROM koi_free_style.koi_products s WHERE s.slug = ANY($1::text[]) AND NOT s."isDeleted"`,
  tatCaSlug,
);
const theoSlug = new Map(sp.map((r) => [r.slug, r]));
const thieu = tatCaSlug.filter((s) => !theoSlug.has(s));
if (thieu.length) console.log('KHÔNG THẤY:', thieu.join(', '));

const viec = [];
for (const s of BO_KHOI_CHARM) {
  const r = theoSlug.get(s);
  if (r?.noi.includes(dm.get(CHARM))) viec.push({ loai: 'go-charm', r });
}
for (const s of THEM_VAO_CHARM) {
  const r = theoSlug.get(s);
  if (r && !r.noi.includes(dm.get(CHARM))) viec.push({ loai: 'them-charm', r });
}
for (const [s, dich] of Object.entries(DOI_CHINH)) {
  const r = theoSlug.get(s);
  if (r && r.categoryId !== dm.get(dich)) viec.push({ loai: 'doi-chinh', r, dich: dm.get(dich), dichSlug: dich });
}
for (const v of viec) console.log(v.loai.padEnd(11), v.r.slug, v.dichSlug ? `→ ${v.dichSlug}` : '');
console.log(`${viec.length} việc`);

if (!argv.includes('--ghi') || !viec.length) {
  await db.$disconnect();
  process.exit(0);
}

const ids = [...new Set(viec.map((v) => v.r.id))];
await db.$transaction(async (tx) => {
  await tx.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS ${SAO_LUU} (product_id text PRIMARY KEY, category_id text, links jsonb, luc timestamptz DEFAULT now())`);
  // Chỉ sao lưu lần ĐẦU cho mỗi sản phẩm: chạy --ghi lần hai không đè mất bản gốc.
  await tx.$executeRawUnsafe(
    `INSERT INTO ${SAO_LUU} (product_id, category_id, links)
     SELECT s.id, s."categoryId",
       COALESCE((SELECT jsonb_agg(jsonb_build_object('categoryId', pc."categoryId", 'createdAt', pc."createdAt"))
                 FROM koi_free_style.koi_product_categories pc WHERE pc."productId" = s.id), '[]'::jsonb)
     FROM koi_free_style.koi_products s WHERE s.id = ANY($1::text[])
     ON CONFLICT (product_id) DO NOTHING`,
    ids,
  );
  for (const v of viec) {
    if (v.loai === 'go-charm') {
      await tx.$executeRawUnsafe(`DELETE FROM koi_free_style.koi_product_categories WHERE "productId" = $1 AND "categoryId" = $2`, v.r.id, dm.get(CHARM));
    } else if (v.loai === 'them-charm') {
      await tx.$executeRawUnsafe(
        `INSERT INTO koi_free_style.koi_product_categories ("productId", "categoryId") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        v.r.id,
        dm.get(CHARM),
      );
    } else {
      await tx.$executeRawUnsafe(`UPDATE koi_free_style.koi_products SET "categoryId" = $2 WHERE id = $1`, v.r.id, v.dich);
      // Danh mục chính luôn phải nằm trong bảng nối (trang danh mục đếm theo bảng nối).
      await tx.$executeRawUnsafe(
        `INSERT INTO koi_free_style.koi_product_categories ("productId", "categoryId") VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        v.r.id,
        v.dich,
      );
    }
  }
}, { timeout: 60_000 });
console.log(`Đã ghi ${viec.length} việc (sao lưu ${SAO_LUU}, hoàn tác: --hoan)`);
await db.$disconnect();
