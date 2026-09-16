/**
 * GÁN DANH MỤC CHÍNH cho 68 sản phẩm đang categoryId = NULL (đo 16/09/2026).
 *
 *   node scripts/gan-danh-muc-thieu.mjs          # chạy thử, không ghi
 *   node scripts/gan-danh-muc-thieu.mjs --ghi    # ghi thật
 *
 * HAI LOẠI HÀNG:
 *  · 56 món ĐÃ có liên kết ở bảng nối koi_product_categories (trang danh mục
 *    lọc qua bảng nối nên chúng vẫn hiện) nhưng categoryId chính = NULL →
 *    trang sản phẩm không có "sản phẩm liên quan" (shop.service dùng
 *    p.categoryId), bìa danh mục trang chủ bỏ qua. Việc: chọn một liên kết
 *    làm chính (ưu tiên danh mục ĐÚNG LOẠI HÀNG hơn danh mục gom như
 *    phu-kien-bang-da / san-pham-khac / trademark).
 *  · 12 món KHÔNG có liên kết nào → không hiện ở trang danh mục nào cả. Việc:
 *    gán chính + tạo liên kết.
 *
 * Quyết định theo ẢNH THẬT (Claude xem từng món 16/09) + tên hàng. Chỗ nào
 * giới tính không rõ (balo, hobo) ghi chú trong `ghiChu` để chủ shop lật lại.
 *
 * AN TOÀN: kiểm mọi slug danh mục tồn tại TRƯỚC khi chạm DB; xuất SQL hoàn tác
 * scripts/_goc-gan-danh-muc-<mốc>.sql (trả categoryId = NULL, xoá liên kết đã
 * thêm, thêm lại liên kết đã bỏ). Chỉ chạm đúng các slug trong bảng dưới.
 */
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';

const env = fs.readFileSync(path.resolve(import.meta.dirname, '..', '.env'), 'utf8');
for (const l of env.split(/\r?\n/)) {
  const m = /^([A-Z_]+)=(.*)$/.exec(l.trim());
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

/** slug sản phẩm → { chinh, them?: liên kết thêm, bo?: liên kết bỏ, ghiChu? } */
const GAN = {
  // ── Túi ──
  'balo-ozzy': { chinh: 'tui-da-cho-nam', them: ['tui-da-cho-nam'], ghiChu: 'balo da nâu khoá gài kiểu cổ điển, unisex; giữ cả liên kết nữ' },
  'tui-hop-ostrich-vang-voi-handle-duoc-customized': { chinh: 'tui-da-cho-nu' },
  'tui-hobo-croissant-da-bo-brown': { chinh: 'tui-da-cho-nu', ghiChu: 'hobo croissant, unisex; giữ cả liên kết nam' },
  'kres-bag-da-togo-steelblue': { chinh: 'tui-da-cho-nu' },
  'tui-chub-da-bo-yellow': { chinh: 'tui-da-cho-nu' },
  'hal-bag-da-bo-swift-white': { chinh: 'tui-da-cho-nu' },
  'tui-chub-w-da-bo-pink': { chinh: 'tui-da-cho-nu' },
  'dee25-bag-da-bo-thao-moc-x-canvas': { chinh: 'tui-da-cho-nu' },
  'tui-tote-da-bo-van-togo-nau-chocolate': { chinh: 'tui-da-cho-nu' },
  'tui-crossbody-da-bo-van-togo-xanh-navy': { chinh: 'tui-da-cho-nu' },
  'tui-da-taiga-en-eo-cheo-nam-handmade-bespoke': { chinh: 'tui-da-cho-nam' },
  'tui-chub-da-bo-an-intrecciato-mau-hong': { chinh: 'tui-da-cho-nu' },
  'tui-loom-da-bo-an-intrecciato-nau-size-large': { chinh: 'tui-da-cho-nu' },
  'tui-xach-nu-chan-tram-den': { chinh: 'tui-da-cho-nu' },
  'tui-da-van-noi-doc-aqua': { chinh: 'tui-da-cho-nu' },
  'neo-bag-da-nubuck-darkorange': { chinh: 'tui-da-cho-nu' },
  'tui-xach-nu-da-be-epsom': { chinh: 'trademark', ghiChu: 'dáng Kelly khoá xoay, shop đã gắn trademark; giữ nguyên nhóm trademark' },
  'woven-bag-da-be-swift-black-yellow-orange-brown': { chinh: 'tui-da-cho-nu' },
  'oppa-bag-da-bo-goldenrod-x-saddlebrown': { chinh: 'tui-da-cho-nam' },
  'mettique-bag-da-togo-brown': { chinh: 'tui-da-cho-nu' },
  // ── Ví ──
  'vi-da-nam-epsom-o-burgundy-handmade': { chinh: 'vi-da-cho-nam' },
  'vi-dai-nu-da-epsom-hong-san-ho': { chinh: 'vi-da-cho-nu' },
  'vi-candy-crush-da-de-alran-mediumpurple-x-pink': { chinh: 'vi-da-cho-nu' },
  'vi-da-nam-da-epsom-darkred': { chinh: 'vi-da-cho-nam' },
  'vi-da-nam-da-de-brown': { chinh: 'vi-da-cho-nam' },
  'vi-ngua-long-wallet-da-epsom-x-da-togo-black-red-yellow': { chinh: 'vi-da-cho-nu' },
  'vi-nu-long-wallet-da-lizard-darkviolet': { chinh: 'vi-da-cho-nu' },
  'vi-da-nam-da-epsom-darkblue': { chinh: 'vi-da-cho-nam' },
  'vi-da-nam-da-ostrich-skyblue': { chinh: 'vi-da-cho-nam' },
  'vi-nu-gap-da-epsom-red-darkcyan': { chinh: 'vi-da-cho-nu' },
  'vi-nu-long-wallet-da-lizard-floralwhite-x-yellow': { chinh: 'vi-da-cho-nu' },
  'vi-nu-long-wallet-da-epsom-x-vai-harris-tweed-scotland-lightslategray': { chinh: 'vi-da-cho-nu' },
  'vi-nu-da-da-clemence-yellow-x-steelblue': { chinh: 'vi-da-cho-nu' },
  'vi-nu-da-da-ostrich-en': { chinh: 'vi-da-cho-nu' },
  'vi-nu-long-wallet-da-de-alran-darkcyan': { chinh: 'vi-da-cho-nu' },
  'vi-da-nam-da-nhap-chau-u-darkslategray-x-tan-x-saddlebrown': {
    chinh: 'vi-da-cho-nam',
    them: ['vi-da-cho-nam'],
    bo: ['tui-da-cho-nam'],
    ghiChu: 'ảnh là ví gập 3 loại da, đang liên kết nhầm sang Túi da cho nam → sửa',
  },
  'vi-zipper-vi-da-ca-sau-alligator': { chinh: 'vi-da-cho-nu' },
  'snap-wallet-waxi-brown': { chinh: 'vi-da-cho-nam', them: ['vi-da-cho-nam'], ghiChu: 'ví nút bấm da sáp nâu, unisex thiên nam' },
  // ── Kẹp tiền ──
  'kep-tien-da-bo-epsom-mau-kem-money-clip-handmade': { chinh: 'kep-tien-money-clip' },
  'kep-tien-da-epsom-en-money-clip-s': { chinh: 'kep-tien-money-clip' },
  'kep-tien-da-epsom-xam-ghi-khoa-h-bac': { chinh: 'kep-tien-money-clip' },
  'kep-tien-da-bo-van-epsom-mau-bordeaux': { chinh: 'kep-tien-money-clip' },
  'kep-tien-da-epsom-en-money-clip-handmade': { chinh: 'kep-tien-money-clip', them: ['kep-tien-money-clip'] },
  'money-clip-va-tag-vali': { chinh: 'kep-tien-money-clip', them: ['kep-tien-money-clip'] },
  // ── Dây đồng hồ ──
  'day-da-ong-ho-da-bo-van-togo-mau-en': { chinh: 'day-da-dong-ho' },
  'day-da-ong-ho-da-epsom-vang-jaune-ambre-handmade': { chinh: 'day-da-dong-ho' },
  'bo-2-day-da-ong-ho-da-bo-van-epsom-da-ky-a-mau-nau-am': { chinh: 'day-da-dong-ho' },
  'day-da-dong-ho': { chinh: 'day-da-dong-ho', them: ['day-da-dong-ho'] },
  'day-dong-ho-apple-watch': { chinh: 'day-da-dong-ho', them: ['day-da-dong-ho'], ghiChu: 'dây Apple Watch cam; khoá trong ảnh có khắc tên hãng khác — chủ shop xem lại ảnh' },
  // ── Thắt lưng ──
  'that-lung-khoa-truot-da-bo-black-brown': { chinh: 'day-lung-cho-nam' },
  'that-lung-da-nam-da-epsom-x-da-nubuck-saddlebrown': { chinh: 'day-lung-cho-nam' },
  'that-lung-da-nu-da-be-brown': { chinh: 'day-lung-cho-nu' },
  'that-lung-da-nu-da-be-swift-black': { chinh: 'day-lung-cho-nu' },
  'that-lung-da-nu-da-togo-sandybrown': { chinh: 'day-lung-cho-nu' },
  // ── Phụ kiện ──
  'lipstick-case-da-bo-darkred': { chinh: 'charm-dung-son' },
  'bao-da-iphone-dang-gap-da-bo-van-chevre-nau': { chinh: 'leather-phonecase' },
  'bao-da-iphone-chan-tram-da-epsom-do-burgundy': { chinh: 'leather-phonecase' },
  'op-lung-iphone-15-pro-da-bo-thao-moc-phoi-vai': { chinh: 'leather-phonecase', them: ['leather-phonecase'], ghiChu: 'ốp phối vải hoạ tiết giống hãng Goyard — chủ shop xem lại ảnh' },
  'bao-da-kinh-mat-xanh-mint-khac-ten-theo-yeu-cau': { chinh: 'phu-kien-bang-da' },
  'bao-da-kinh-mat-da-epsom-en-1': { chinh: 'phu-kien-bang-da' },
  'day-eo-tui-da-togo-mau-toupe-khau-tay-thu-cong': { chinh: 'phu-kien-bang-da' },
  'dich-vu-boc-da-camera': { chinh: 'phu-kien-bang-da', them: ['phu-kien-bang-da'], ghiChu: 'dịch vụ bọc da máy ảnh (Hasselblad), không có danh mục riêng' },
  'bao-da-laptop-phoi-canvas-ben-trong': { chinh: 'bao-da-ipad', them: ['bao-da-ipad'] },
  'tag-da': { chinh: 'keychain-moc-khoa', them: ['keychain-moc-khoa'], ghiChu: 'tag tròn số 01 có móc, theo tiền lệ Name Tag ở Keychain' },
  'masterise-key': { chinh: 'keychain-moc-khoa', them: ['keychain-moc-khoa'], ghiChu: 'lô tag chìa "CỬA CUỐN" cho Masterise' },
  'charm-vet': { chinh: 'charm-deo-tui-bang-da', them: ['charm-deo-tui-bang-da', 'cham-khac-tren-da'], ghiChu: 'charm vẹt chạm khắc tay → thêm cả liên kết Chạm khắc trên da' },
  'charm-dong-xu': { chinh: 'charm-deo-tui-bang-da', them: ['charm-deo-tui-bang-da'] },
  // ── Khác ──
  'da-ca-sau-phap-alligator': { chinh: 'san-pham-khac', them: ['san-pham-khac'], ghiChu: 'là TẤM DA nguyên liệu, không phải sản phẩm; tạm để Sản phẩm khác, chủ shop quyết giữ hay ẩn' },
};

const sqlStr = (s) => `'${String(s).replace(/'/g, "''")}'`;
const db = new PrismaClient();

const cats = await db.koiCategory.findMany({ select: { id: true, slug: true, isActive: true } });
const catId = new Map(cats.map((c) => [c.slug, c.id]));
let loi = 0;
for (const [slug, g] of Object.entries(GAN)) {
  for (const s of [g.chinh, ...(g.them ?? []), ...(g.bo ?? [])]) {
    if (!catId.has(s)) {
      console.error(`✗ ${slug}: danh mục "${s}" không tồn tại`);
      loi++;
    }
  }
}
if (loi) process.exit(1);

const slugs = Object.keys(GAN);
const prods = await db.koiProduct.findMany({
  where: { slug: { in: slugs }, isDeleted: false },
  select: { id: true, slug: true, categoryId: true, categoryLinks: { select: { categoryId: true } } },
});
const theoSlug = new Map(prods.map((p) => [p.slug, p]));

console.log(GHI ? '\n>>> CHẾ ĐỘ GHI THẬT <<<\n' : '\n(chạy thử — không ghi. Thêm --ghi để ghi thật)\n');
console.log(`Bảng gán: ${slugs.length} · có trong DB: ${prods.length}`);

const viec = [];
for (const slug of slugs) {
  const p = theoSlug.get(slug);
  const g = GAN[slug];
  if (!p) {
    console.log(`  ? ${slug}: KHÔNG có trong DB`);
    continue;
  }
  if (p.categoryId) {
    console.log(`  – ${slug}: đã có danh mục chính, bỏ qua`);
    continue;
  }
  const daCo = new Set(p.categoryLinks.map((l) => l.categoryId));
  const chinhId = catId.get(g.chinh);
  const them = [...new Set([...(g.them ?? []), g.chinh])].map((s) => catId.get(s)).filter((id) => !daCo.has(id));
  const bo = (g.bo ?? []).map((s) => catId.get(s)).filter((id) => daCo.has(id));
  // Chính phải nằm trong liên kết — nếu chưa có thì `them` đã bù (dòng trên).
  viec.push({ p, g, chinhId, them, bo });
  console.log(
    `  + ${slug} → ${g.chinh}` +
      (them.length ? ` (+link ${them.length})` : '') +
      (bo.length ? ` (−link ${bo.length})` : '') +
      (g.ghiChu ? `  ⚠ ${g.ghiChu}` : ''),
  );
}
console.log(`\nSẽ gán: ${viec.length} · thêm liên kết: ${viec.reduce((a, v) => a + v.them.length, 0)} · bỏ liên kết: ${viec.reduce((a, v) => a + v.bo.length, 0)}`);

if (!GHI) {
  console.log('Chưa ghi gì. Chạy lại với --ghi.');
  await db.$disconnect();
  process.exit(0);
}

const moc = new Date().toISOString().replace(/[:.]/g, '-');
const tepGoc = path.resolve(import.meta.dirname, `_goc-gan-danh-muc-${moc}.sql`);
const sql = [`-- Hoàn tác gan-danh-muc-thieu.mjs lúc ${moc}`];
for (const v of viec) {
  sql.push(`UPDATE koi_free_style.koi_products SET "categoryId" = NULL WHERE id = ${sqlStr(v.p.id)};`);
  for (const id of v.them) sql.push(`DELETE FROM koi_free_style.koi_product_categories WHERE "productId" = ${sqlStr(v.p.id)} AND "categoryId" = ${sqlStr(id)};`);
  for (const id of v.bo) sql.push(`INSERT INTO koi_free_style.koi_product_categories ("productId","categoryId") VALUES (${sqlStr(v.p.id)}, ${sqlStr(id)});`);
}
fs.writeFileSync(tepGoc, sql.join('\n') + '\n', 'utf8');
console.log(`Đã ghi SQL hoàn tác: ${path.basename(tepGoc)}`);

let xong = 0;
for (const v of viec) {
  await db.$transaction(async (tx) => {
    for (const id of v.bo) await tx.koiProductCategory.delete({ where: { productId_categoryId: { productId: v.p.id, categoryId: id } } });
    for (const id of v.them) await tx.koiProductCategory.create({ data: { productId: v.p.id, categoryId: id } });
    await tx.koiProduct.update({ where: { id: v.p.id }, data: { categoryId: v.chinhId } });
  });
  xong++;
}
console.log(`Đã gán ${xong} sản phẩm.`);

const conLai = await db.koiProduct.count({ where: { isDeleted: false, status: 'ACTIVE', categoryId: null } });
const khongLink = await db.koiProduct.count({ where: { isDeleted: false, status: 'ACTIVE', categoryLinks: { none: {} } } });
console.log(`Kiểm lại: ACTIVE chưa có danh mục chính = ${conLai} · không có liên kết nào = ${khongLink}`);
await db.$disconnect();
