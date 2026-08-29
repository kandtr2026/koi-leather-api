/**
 * QUÉT NHÃN HIỆU — MỘT LOẠT, MỌI CHỖ CÓ CHỮ RA MẶT TIỀN.
 *
 * Chỉ đọc, không ghi gì. Chạy:
 *   node scripts/quet-nhan-hieu.mjs                 # bảng tổng + chi tiết mức 1
 *   node scripts/quet-nhan-hieu.mjs --het           # in cả mức 2 và mức 3
 *   node scripts/quet-nhan-hieu.mjs --json          # ghi _quet-nhan-hieu.json
 *
 * ====================== VÌ SAO CÓ TỆP NÀY ======================
 * Hai lượt trước tôi quét thiếu rồi phải vá:
 *   · lượt 1 quét 5 trường của koi_products → bỏ sót altText (bảng KHÁC)
 *   · lượt 2 sửa altText → bắt 127/212 vì tên dùng gạch dài "–" còn alt dùng
 *     gạch nối "-", nhìn trên màn hình y như nhau
 * Cả hai lần đều là "tưởng đã quét hết". Nên lần này KHÔNG đi theo trí nhớ nữa:
 * BANG_CHU dưới đây liệt kê từng bảng × từng cột lấy THẲNG từ schema.prisma, kèm
 * đánh dấu cột nào ra mặt tiền. Thêm bảng mới vào schema mà quên thêm vào đây thì
 * quét vẫn im lặng bỏ qua — đó là giới hạn thật của cách này, ghi ra để biết.
 *
 * ====================== BA MỨC, ĐỪNG TRỘN ======================
 * MỨC 1 — NHẬN LÀ HÀNG CỦA HỌ. "Belt LV", "Ví Chanel", "lấy cảm hứng từ dòng
 *   Classic Flap", "chiếc dây nịt Montblanc". Đây là mức làm mất tài khoản
 *   thanh toán. PHẢI SỬA.
 * MỨC 2 — VỪA VỚI MÁY NÀO (nominative use). "dây da cho Rolex", "bao chìa khoá
 *   Ford", "bọc da tai nghe Marshall". HỢP LỆ, GIỮ. Người tìm "dây da cho Rolex"
 *   cần biết dây vừa Rolex.
 * MỨC 3 — TÊN VÂN DA. Epsom, Togo, Swift, Clemence, Box Calf, Caviar, Saffiano,
 *   Taiga, Epi. GIỮ NGUYÊN. Mọi xưởng thuộc da bán dưới đúng những tên đó.
 *
 * Máy KHÔNG phân được mức 1 với mức 2 — cùng chữ "Rolex", khác ở câu quanh nó.
 * Nên script chỉ CHIA THEO NHÓM NHÃN rồi in cửa sổ chữ; người đọc quyết.
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
  if (!['--het', '--json'].includes(c)) {
    console.error(`Cờ lạ: ${c}. Nhận --het, --json.`);
    process.exit(1);
  }
}
const HET = CO.has('--het');
const JSON_RA = CO.has('--json');

/* =============================== NHÃN HIỆU =============================== */

/** Nhà mốt + tên mẫu túi của họ. Tên mẫu được bảo hộ như tên nhãn. */
const NHA_MOT = [
  'Louis Vuitton', 'Vuitton', 'LV', 'Hermes', 'Hermès', 'Chanel', 'Gucci', 'Dior',
  'Prada', 'Loewe', 'Longchamp', 'Bottega Veneta', 'Bottega', 'Celine', 'Céline',
  'Goyard', 'Burberry', 'Fendi', 'Balenciaga', 'YSL', 'Saint Laurent', 'Valentino',
  'Versace', 'Armani', 'Miu Miu', 'Delvaux', 'Moynat', 'Mulberry', 'Jimmy Choo',
  'Loro Piana', 'Brunello Cucinelli', 'Smythson', 'Ettinger', 'Berluti', 'Tumi',
  'Rimowa', 'Coach', 'Michael Kors', 'Tory Burch', 'Furla', 'Tiffany', 'Cartier',
  'Montblanc', 'Montblance', 'Mont Blanc',
  // Tên MẪU, không phải tên hãng — nhưng bảo hộ y như tên hãng.
  'Birkin', 'Kelly', 'Constance', 'Hammock', 'Lindy', 'Picotin', 'Evelyne',
  'Classic Flap', 'Rouge H', 'Santos de Cartier',
];

/** Hãng ngành khác — nhắc để nói món da VỪA VỚI máy nào thì hợp lệ. */
const NGANH_KHAC = [
  'Rolex', 'Omega', 'Patek Philippe', 'Patek', 'Vacheron Constantin', 'Vacheron',
  'Seiko', 'Tudor', 'Tissot', 'Apple Watch', 'Garmin',
  'iPhone', 'iPad', 'AirPods', 'Apple', 'Samsung', 'Vertu', 'Marshall', 'Bose', 'Sony',
  'Mercedes', 'BMW', 'Porsche', 'Bentley', 'Rolls Royce', 'Audi', 'Lexus',
  'Toyota', 'Honda', 'Ford', 'Vinfast', 'Mazda', 'Kia', 'Hyundai',
];

/** Khách doanh nghiệp thật của KOI — chuyện RIÊNG TƯ/xin phép, không phải xâm phạm. */
const KHACH_B2B = [
  'MobiFone', 'Vingroup', 'Vinhomes', 'Masterise', 'CGV', 'Lộc Trời', 'Nam Long',
  'Vasta Stone', 'Pelitromex', 'CAO Fine Jewellery', 'Trung Nguyên', 'Mirinda',
  'Techcombank', 'Vietcombank', 'Sacombank', 'PNJ', 'Novaland',
];

/** Tên VÂN DA. Có trong danh sách chỉ để ĐẾM và nói rõ là cố ý giữ. */
const VAN_DA = [
  'Epsom', 'Togo', 'Swift', 'Clemence', 'Clémence', 'Box Calf', 'Boxcalf',
  'Caviar', 'Carvia', 'Saffiano', 'Safiano', 'Taiga', 'Epi', 'Barenia', 'Chevre',
];

const NHOM = [
  { ma: 'nha-mot', ten: 'NHÀ MỐT (mức 1 — phải sửa)', list: NHA_MOT, nang: true },
  { ma: 'nganh-khac', ten: 'HÃNG NGÀNH KHÁC (mức 2 — xem câu quanh)', list: NGANH_KHAC, nang: false },
  { ma: 'khach-b2b', ten: 'KHÁCH B2B THẬT (chuyện xin phép)', list: KHACH_B2B, nang: false },
  { ma: 'van-da', ten: 'TÊN VÂN DA (mức 3 — cố ý giữ)', list: VAN_DA, nang: false },
];

function reNhom(list) {
  const esc = list
    .slice()
    .sort((a, b) => b.length - a.length) // cụm dài trước, không thì "LV" ăn trước "Louis Vuitton"
    .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '[\\s-]+'));
  return new RegExp('(?<![\\p{L}])(' + esc.join('|') + ')(?![\\p{L}])', 'giu');
}
for (const n of NHOM) n.re = reNhom(n.list);

/* ============================ BẢNG × CỘT ============================
 * Lấy thẳng từ prisma/schema.prisma, không theo trí nhớ. `mat` = chữ này có ra
 * mặt tiền hay không: mặt tiền thì Google và người xét rủi ro đọc được, nội bộ
 * thì chỉ admin thấy. Cả hai vẫn quét, nhưng xếp hạng khác nhau.
 */
const BANG_CHU = [
  {
    ten: 'KoiProduct', doc: (db) => db.koiProduct.findMany({
      where: { isDeleted: false },
      select: {
        slug: true, status: true, name: true, description: true, descriptionBlocks: true,
        sku: true, technicalSpecs: true, metaTitle: true, metaDescription: true,
        canonicalUrl: true, searchText: true,
      },
    }),
    khoa: 'slug',
    cot: {
      name: true, slug: true, description: true, descriptionBlocks: true,
      metaTitle: true, metaDescription: true, canonicalUrl: true,
      technicalSpecs: true, sku: false, searchText: false,
    },
  },
  {
    ten: 'KoiProductImage', doc: (db) => db.koiProductImage.findMany({
      select: { altText: true, url: true, product: { select: { slug: true } } },
    }),
    khoa: (r) => r.product?.slug ?? '(không gắn sản phẩm)',
    cot: { altText: true, url: false },
  },
  {
    ten: 'KoiProductVariant', doc: (db) => db.koiProductVariant.findMany({
      select: { sku: true, title: true, hardwareOption: true, options: true, product: { select: { slug: true } } },
    }),
    khoa: (r) => r.product?.slug ?? '?',
    cot: { title: true, hardwareOption: true, options: true, sku: false },
  },
  {
    ten: 'KoiCategory', doc: (db) => db.koiCategory.findMany({
      select: { code: true, name: true, slug: true, description: true, metaTitle: true, metaDescription: true, specsSchema: true },
    }),
    khoa: 'slug',
    cot: { name: true, slug: true, description: true, metaTitle: true, metaDescription: true, specsSchema: false, code: false },
  },
  {
    ten: 'KoiSEORecord', doc: (db) => db.koiSEORecord.findMany({
      select: { entityType: true, slug: true, slugHistory: true, jsonLd: true, ogTitle: true, ogDescription: true, metaTitle: true, metaDescription: true },
    }),
    khoa: 'slug',
    cot: { slug: true, jsonLd: true, ogTitle: true, ogDescription: true, metaTitle: true, metaDescription: true, slugHistory: false },
  },
  {
    ten: 'KoiImageCategory', doc: (db) => db.koiImageCategory.findMany({ select: { code: true, name: true, description: true } }),
    khoa: 'code',
    cot: { name: true, description: true },
  },
  {
    ten: 'KoiMaterialCategory', doc: (db) => db.koiMaterialCategory.findMany({ select: { code: true, name: true, description: true } }),
    khoa: 'code',
    cot: { name: true, description: true },
  },
  {
    ten: 'posts (blog)', doc: (db) => db.posts.findMany({
      // Bảng này dùng `is_published`, KHÔNG có `status` — lần chạy đầu tôi khai
      // `status` nên Prisma từ chối cả truy vấn và 158 bài blog không được quét.
      // Bắt được vì script báo "bảng KHÔNG đọc được" thay vì lặng lẽ báo sạch.
      select: {
        slug: true, title: true, excerpt: true, content: true,
        meta_title: true, meta_description: true, is_published: true,
      },
    }),
    khoa: 'slug',
    cot: { title: true, slug: true, excerpt: true, content: true, meta_title: true, meta_description: true },
  },
  {
    ten: 'pages', doc: (db) => db.pages.findMany({
      select: { slug: true, title: true, content: true, meta_title: true, meta_description: true },
    }),
    khoa: 'slug',
    cot: { title: true, slug: true, content: true, meta_title: true, meta_description: true },
  },
  {
    ten: 'tags', doc: (db) => db.tags.findMany({ select: { slug: true, name: true, description: true } }),
    khoa: 'slug',
    cot: { name: true, slug: true, description: true },
  },
  {
    ten: 'post_terms', doc: (db) => db.post_terms.findMany({ select: { slug: true, name: true, description: true, taxonomy: true } }),
    khoa: 'slug',
    cot: { name: true, slug: true, description: true },
  },
  {
    ten: 'categories (WP cũ)', doc: (db) => db.categories.findMany({ select: { slug: true, name: true, description: true } }),
    khoa: 'slug',
    cot: { name: true, slug: true, description: true },
  },
  {
    ten: 'products (WP cũ)', doc: (db) => db.products.findMany({
      select: { slug: true, name: true, short_description: true, description: true, meta_title: true, meta_description: true, sku: true },
    }),
    khoa: 'slug',
    cot: { name: true, slug: true, short_description: true, description: true, meta_title: true, meta_description: true, sku: false },
  },
  {
    ten: 'KoiCraftingSpec (nội bộ)', doc: (db) => db.koiCraftingSpec.findMany({
      select: { outerLeather: true, liningLeather: true, craftingDetails: true, notes: true, product: { select: { slug: true } } },
    }),
    khoa: (r) => r.product?.slug ?? '?',
    cot: { outerLeather: false, liningLeather: false, craftingDetails: false, notes: false },
  },
  {
    ten: 'KoiRawMaterial (nội bộ)', doc: (db) => db.koiRawMaterial.findMany({ select: { name: true, supplier: true, color: true, materialType: true } }),
    khoa: 'name',
    cot: { name: false, supplier: false, color: false },
  },
];

/* ============================== CHẠY QUÉT ============================== */

/** Mở vỏ JSON {"vi":"…"}, bỏ thẻ HTML, gộp mảng/đối tượng thành chữ phẳng. */
function phang(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') {
    try { return phang(JSON.stringify(v)); } catch { return ''; }
  }
  let s = String(v);
  try {
    const j = JSON.parse(s);
    if (j && typeof j === 'object') s = JSON.stringify(j);
  } catch { /* chữ thô */ }
  return s
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const db = new PrismaClient();
const ra = [];
const loiBang = [];

for (const b of BANG_CHU) {
  let hang;
  try {
    hang = await b.doc(db);
  } catch (e) {
    // Bảng WordPress cũ có thể đã bị bỏ. Ghi lại thay vì chết cả lượt quét —
    // nhưng KHÔNG im lặng: không quét được một bảng thì báo cáo là thiếu.
    loiBang.push(`${b.ten}: ${String(e.message).split('\n')[0].slice(0, 110)}`);
    continue;
  }
  for (const r of hang) {
    const khoa = typeof b.khoa === 'function' ? b.khoa(r) : String(r[b.khoa] ?? '?');
    for (const [cot, matTien] of Object.entries(b.cot)) {
      const chu = phang(r[cot]);
      if (!chu) continue;
      for (const n of NHOM) {
        n.re.lastIndex = 0;
        const thay = [...chu.matchAll(n.re)];
        if (!thay.length) continue;
        ra.push({
          bang: b.ten, khoa, cot, matTien, nhom: n.ma,
          soLan: thay.length,
          nhan: [...new Set(thay.map((m) => m[1]))],
          cua: thay.slice(0, 3).map((m) => {
            const i = m.index ?? 0;
            return chu.slice(Math.max(0, i - 85), i + m[1].length + 85);
          }),
          trangThai: r.status ?? null,
        });
      }
    }
  }
}

await db.$disconnect();

/* ============================== BÁO CÁO ============================== */

console.log('');
console.log('════════ QUÉT NHÃN HIỆU — MỘT LOẠT ════════');
console.log(`Bảng khai để quét : ${BANG_CHU.length}`);
console.log(`Bảng đọc được     : ${BANG_CHU.length - loiBang.length}`);
if (loiBang.length) {
  console.log(`Bảng KHÔNG đọc được (tức là CHƯA quét, không phải "sạch"):`);
  for (const l of loiBang) console.log(`   ✗ ${l}`);
}
console.log('');

for (const n of NHOM) {
  const cua = ra.filter((x) => x.nhom === n.ma);
  const mat = cua.filter((x) => x.matTien);
  const oDau = {};
  for (const x of mat) oDau[`${x.bang}.${x.cot}`] = (oDau[`${x.bang}.${x.cot}`] ?? 0) + 1;
  console.log(`── ${n.ten}`);
  console.log(`   chỗ khớp: ${cua.length}  (ra mặt tiền: ${mat.length})`);
  const sap = Object.entries(oDau).sort((a, b) => b[1] - a[1]);
  for (const [k, v] of sap) console.log(`      ${String(v).padStart(4)}  ${k}`);
  if (!sap.length) console.log('      (không có chỗ nào ra mặt tiền)');
  console.log('');
}

const nangMat = ra.filter((x) => x.nhom === 'nha-mot' && x.matTien);
console.log(`════════ CHI TIẾT: NHÀ MỐT, RA MẶT TIỀN (${nangMat.length} chỗ) ════════`);
for (const x of nangMat) {
  console.log(`● ${x.bang}.${x.cot}  ${x.khoa}${x.trangThai ? ' [' + x.trangThai + ']' : ''}  →  ${x.nhan.join('/')}  ×${x.soLan}`);
  for (const c of x.cua) console.log(`      …${c}…`);
}

if (HET) {
  for (const ma of ['nganh-khac', 'khach-b2b', 'van-da']) {
    const nh = NHOM.find((n) => n.ma === ma);
    const cua = ra.filter((x) => x.nhom === ma && x.matTien);
    console.log('');
    console.log(`════════ CHI TIẾT: ${nh.ten} (${cua.length} chỗ ra mặt tiền) ════════`);
    for (const x of cua) {
      console.log(`· ${x.bang}.${x.cot}  ${x.khoa}  →  ${x.nhan.join('/')}  ×${x.soLan}`);
    }
  }
}

if (JSON_RA) {
  const t = path.resolve(import.meta.dirname, '_quet-nhan-hieu.json');
  fs.writeFileSync(t, JSON.stringify({ khi: new Date().toISOString(), loiBang, ra }, null, 2), 'utf8');
  console.log(`\nĐã ghi → ${path.basename(t)}`);
}
