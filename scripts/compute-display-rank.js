/**
 * Tính lại cột displayRank cho sản phẩm KOI.
 *
 * VẤN ĐỀ CẦN GIẢI
 * Danh sách /cua-hang trước đây xếp theo basePrice giảm dần, nên 24 ô đầu toàn
 * hàng 19–79 triệu (trung bình 30,7tr) trong khi trung vị cả cửa hàng chỉ 4tr.
 * Khách xem trang 1 rồi kết luận shop chỉ bán đồ đắt đỏ.
 *
 * CÁCH TÍNH
 * 1. Điểm "độ đầu tư": món nào shop bỏ công nhiều nhất (chụp nhiều ảnh, làm
 *    nhiều biến thể, đã gán màu) gần như luôn là món shop tin và bán được. Đây
 *    là proxy tốt nhất hiện có — koi_page_views mới đủ dữ liệu ~14 giờ (83 lượt
 *    xem trang sản phẩm trên 44/315 món), xếp hạng bằng đó là xếp theo nhiễu.
 *    Đã kiểm chứng: tương quan giữa số ảnh và giá là r = 0,034 (≈ 0), nên xếp
 *    theo độ đầu tư KHÔNG vô tình dựng lại thang giá cũ. Hai tín hiệu độc lập.
 * 2. Cài răng lược 3 dải giá theo nhịp vừa–thấp–vừa–cao, để mọi trang đều có đủ
 *    mức giá chứ không dồn hàng đắt lên đầu.
 *
 * VÌ SAO TÍNH SẴN THÀNH SỐ THAY VÌ ORDER BY
 * Bước cài răng lược không diễn đạt được bằng SQL ORDER BY; còn nếu xếp trong
 * RAM sau khi truy vấn thì phân trang sẽ nhảy (mỗi trang xếp lại một tập khác).
 *
 * ĐƯỜNG NÂNG CẤP
 * Khi koi_page_views đủ dày (khoảng 2–4 tuần), sửa hàm diemDoDauTu() để cộng
 * thêm lượt xem thật rồi chạy lại script. Không phải sửa truy vấn ở
 * shop.service.ts — đó là mục đích của việc tách cột ra.
 *
 * Chạy:  node scripts/compute-display-rank.js
 *        node scripts/compute-display-rank.js --dry     (chỉ xem, không ghi)
 */

const fs = require('fs');
const path = require('path');

// Nạp .env bằng tay: script này chạy bằng `node` trần, không qua NestJS nên
// không có sẵn ConfigModule, mà thêm dotenv chỉ cho một script thì thừa.
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

const { PrismaClient } = require('@prisma/client');

/** Danh mục ẩn khỏi mặt tiền — giữ khớp với hiddenSlugs ở shop.service.ts. */
const HIDDEN_SLUGS = ['ban-rap-thiet-ke'];

/** Giá dưới ngưỡng này coi như chưa điền, đẩy xuống cuối. */
const GIA_COI_NHU_TRONG = 50000;

/**
 * Nhịp cài răng lược: 0 = dải thấp, 1 = dải vừa, 2 = dải cao.
 * Vừa nhiều nhất vì đó là xương sống của cửa hàng; mỗi 4 ô có 1 hàng cao cấp để
 * còn khoe được tay nghề. Với lưới 24 ô/trang, nhịp 4 chia hết nên trang nào
 * cũng ra đúng cùng một tỉ lệ.
 */
const NHIP = [1, 0, 1, 2];

/** Điểm độ đầu tư. Ảnh chặn ở 8 để bộ 102 ảnh không nuốt hết đầu bảng. */
function diemDoDauTu(sp) {
  return (
    Math.min(sp._count.images, 8) * 1.0 +
    (sp._count.variants > 0 ? 2 : 0) +
    (sp.colorFamily ? 1 : 0)
  );
}

async function main() {
  const dryRun = process.argv.includes('--dry');
  const prisma = new PrismaClient();

  try {
    const sanpham = await prisma.koiProduct.findMany({
      where: {
        isDeleted: false,
        status: 'ACTIVE',
        NOT: {
          categoryLinks: { some: { category: { slug: { in: HIDDEN_SLUGS } } } },
        },
      },
      select: {
        id: true,
        basePrice: true,
        colorFamily: true,
        _count: { select: { images: true, variants: true } },
      },
    });

    if (!sanpham.length) {
      console.log('Không có sản phẩm nào để xếp.');
      return;
    }

    // Ngưỡng dải giá lấy từ chính dữ liệu (tam phân vị) chứ không cắm số cứng:
    // shop thêm hàng mới, cắm cứng là vài tháng sau lệch hết.
    const giaSapXep = sanpham
      .map((sp) => sp.basePrice ?? 0)
      .sort((a, b) => a - b);
    const phanVi = (f) => giaSapXep[Math.floor(f * (giaSapXep.length - 1))];
    const NGUONG_THAP = phanVi(1 / 3);
    const NGUONG_CAO = phanVi(2 / 3);

    const daiGia = (sp) => {
      const v = sp.basePrice ?? 0;
      if (v < NGUONG_THAP) return 0;
      if (v > NGUONG_CAO) return 2;
      return 1;
    };

    // Hàng chưa điền giá xếp riêng, luôn nằm cuối: đổi cách xếp mà không tách
    // ra thì chúng nổi lên trang 1 với giá "0đ".
    const chuaCoGia = [];
    const gio = [[], [], []];
    for (const sp of sanpham) {
      if ((sp.basePrice ?? 0) < GIA_COI_NHU_TRONG) {
        chuaCoGia.push(sp);
        continue;
      }
      gio[daiGia(sp)].push(sp);
    }

    // Trong từng dải: đầu tư nhiều lên trước. id làm chốt cuối để hai lần chạy
    // trên cùng dữ liệu ra cùng kết quả (không nhảy khi phân trang).
    for (const g of gio) {
      g.sort(
        (a, b) => diemDoDauTu(b) - diemDoDauTu(a) || a.id.localeCompare(b.id),
      );
    }

    // Rút theo nhịp; dải nào cạn thì lấy bù từ dải còn hàng, ưu tiên vừa → thấp
    // → cao (giữ cho phần đuôi vẫn nghiêng về hàng phổ thông).
    const thuTu = [];
    const conHang = () => gio.some((g) => g.length);
    let i = 0;
    while (conHang()) {
      const muon = NHIP[i % NHIP.length];
      const lay = gio[muon].length
        ? muon
        : [1, 0, 2].find((x) => gio[x].length);
      thuTu.push(gio[lay].shift());
      i++;
    }
    // Hàng chưa điền giá: xếp cuối, vẫn theo độ đầu tư cho có thứ tự ổn định.
    chuaCoGia.sort(
      (a, b) => diemDoDauTu(b) - diemDoDauTu(a) || a.id.localeCompare(b.id),
    );
    thuTu.push(...chuaCoGia);

    // Bước nhảy 10: sau này chèn tay một món vào giữa thì không phải tính lại
    // cả bảng.
    const capNhat = thuTu.map((sp, idx) => ({ id: sp.id, rank: (idx + 1) * 10 }));

    const trang1 = thuTu.slice(0, 24).map((sp) => (sp.basePrice ?? 0) / 1e6);
    const tb = trang1.reduce((a, b) => a + b, 0) / trang1.length;
    console.log(`Sản phẩm mặt tiền: ${sanpham.length}`);
    console.log(
      `Ngưỡng dải giá: thấp < ${(NGUONG_THAP / 1e6).toFixed(2)}tr | ` +
        `cao > ${(NGUONG_CAO / 1e6).toFixed(2)}tr`,
    );
    if (chuaCoGia.length) {
      console.log(`Chưa điền giá (xếp cuối): ${chuaCoGia.length} món`);
    }
    console.log(`Trang 1: ${trang1.map((v) => v.toFixed(0)).join(' ')}`);
    console.log(
      `Trang 1 trung bình ${tb.toFixed(1)}tr ` +
        `(${Math.min(...trang1).toFixed(1)}–${Math.max(...trang1).toFixed(1)}tr)`,
    );

    if (dryRun) {
      console.log('\n--dry: không ghi gì vào database.');
      return;
    }

    // Ghi bằng một câu lệnh UPDATE ... FROM thay vì 315 lần update: gọn hơn hẳn
    // và cả bảng đổi thứ tự trong cùng một giao dịch, không có lúc nửa cũ nửa mới.
    // Cột id khai là String (text trong Postgres) dù nội dung là uuid — ép sang
    // ::uuid[] sẽ lỗi "operator does not exist: text = uuid".
    const ids = capNhat.map((c) => c.id);
    const ranks = capNhat.map((c) => c.rank);
    const soDong = await prisma.$executeRawUnsafe(
      `UPDATE "koi_free_style"."koi_products" AS p
          SET "displayRank" = v.rank
         FROM (SELECT UNNEST($1::text[]) AS id, UNNEST($2::int[]) AS rank) AS v
        WHERE p.id = v.id`,
      ids,
      ranks,
    );
    console.log(`\nĐã ghi displayRank cho ${soDong} sản phẩm.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error('Lỗi:', e.message);
  process.exit(1);
});
