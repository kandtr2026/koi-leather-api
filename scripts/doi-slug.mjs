/**
 * Đổi slug 23 sản phẩm còn mang nhãn hiệu người khác trong địa chỉ.
 *
 *   node scripts/doi-slug.mjs             # chạy thử: in bảng trước/sau + khối 301
 *   node scripts/doi-slug.mjs --ghi       # ghi thật
 *
 * MẶC ĐỊNH KHÔNG GHI. Bảng slug nằm ở scripts/doi-slug.data.mjs.
 *
 * ============================== THỨ TỰ BẮT BUỘC ==============================
 * 1. chạy thử, lấy khối 301 in ra cuối
 * 2. dán khối đó vào redirects() trong koi-storefront/next.config.ts
 * 3. `node scripts/doi-slug.mjs --ghi`
 * 4. deploy koi-storefront NGAY SAU ĐÓ
 * 5. curl từng đường CŨ (phải 301) và từng đường MỚI (phải 200)
 *
 * VÌ SAO GHI DB TRƯỚC RỒI MỚI DEPLOY, chứ không ngược lại. Hai thứ không thể
 * đổi cùng một giây, nên phải chọn cửa sổ nào ít hại hơn:
 *   · deploy 301 trước → đường cũ 301 sang đường mới, mà đường mới CHƯA có
 *     trong DB → Google ăn 404 ở đúng địa chỉ mình muốn nó lập chỉ mục
 *   · ghi DB trước → đường mới sống ngay, đường cũ 404 trong ~2 phút chờ deploy
 * Chọn cách sau. Thêm một lý do nữa: storefront dùng `use cache` + cacheLife
 * nên ghi thẳng vào DB KHÔNG tự làm mới bộ đệm — chính lần deploy ở bước 4 vừa
 * thêm 301 vừa xoá đệm. Làm ngược thì phải deploy hai lần.
 *
 * ================================= BA LỚP CHẶN =================================
 *  1. CHỤP BẢN GỐC trước khi ghi, ra _goc-doi-slug-<dấu-thời-gian>.sql. Đổi slug
 *     không hoàn tác được ở phía Google, nhưng ở phía DB thì phải có đường về.
 *  2. SO TÊN TRƯỚC KHI SỬA (`ten` trong tệp dữ liệu). Lệch là bỏ qua món đó —
 *     nghĩa là có người sửa tay sau khi bảng được soạn.
 *  3. KIỂM TRÙNG slug mới trên TOÀN BẢNG trước khi ghi. Cột slug là @unique nên
 *     trùng thì Prisma ném giữa lô; kiểm trước để dừng cả lượt, không ghi nửa.
 */
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';
import { DOI_SLUG } from './doi-slug.data.mjs';

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

/** Tên trong DB có thể là chữ thô HOẶC vỏ JSON {"vi":"…"} — di sản trình dựng khối. */
function chuTen(v) {
  if (v === null || v === undefined) return '';
  const s = String(v);
  try {
    const j = JSON.parse(s);
    if (j && typeof j.vi === 'string') return j.vi;
  } catch {
    /* chữ thô */
  }
  return s;
}

const db = new PrismaClient();

/* ---------------------------- kiểm dạng slug mới ---------------------------- */
const loiDang = [];
for (const d of DOI_SLUG) {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(d.moi)) loiDang.push(`${d.moi} — không đúng dạng slug`);
}
const trung = DOI_SLUG.map((d) => d.moi).filter((s, i, a) => a.indexOf(s) !== i);
if (trung.length) loiDang.push(`slug mới trùng nhau trong bảng: ${[...new Set(trung)].join(', ')}`);
if (loiDang.length) {
  console.error('DỪNG — bảng dữ liệu sai:');
  for (const l of loiDang) console.error(`  · ${l}`);
  process.exit(1);
}

/* ------------------------------ đọc & đối chiếu ------------------------------ */
const hang = await db.koiProduct.findMany({
  where: { slug: { in: DOI_SLUG.map((d) => d.cu) } },
  select: { id: true, slug: true, name: true },
});
const theoSlug = new Map(hang.map((h) => [h.slug, h]));

// Slug mới đã có ai dùng chưa — hỏi cả bảng, không chỉ trong 23 món này.
const daCo = await db.koiProduct.findMany({
  where: { slug: { in: DOI_SLUG.map((d) => d.moi) } },
  select: { slug: true },
});
const daCoSet = new Set(daCo.map((x) => x.slug));

const lam = [];
const boQua = [];
for (const d of DOI_SLUG) {
  const h = theoSlug.get(d.cu);
  if (!h) {
    boQua.push({ ...d, ly: 'không có slug này trong DB' });
    continue;
  }
  const tenThat = chuTen(h.name);
  if (tenThat !== d.ten) {
    boQua.push({ ...d, ly: `tên trong DB khác bảng — DB: "${tenThat}"` });
    continue;
  }
  if (daCoSet.has(d.moi)) {
    boQua.push({ ...d, ly: `slug mới ĐÃ CÓ sản phẩm khác dùng` });
    continue;
  }
  lam.push({ ...d, id: h.id, ten: tenThat });
}

console.log(`\nĐỔI ĐƯỢC ${lam.length}/${DOI_SLUG.length}${GHI ? '  (GHI THẬT)' : '  (chạy thử)'}\n`);
for (const x of lam) {
  console.log(`  ${x.cu}`);
  console.log(`→ ${x.moi}`);
  console.log(`  ${x.vi}\n`);
}
if (boQua.length) {
  console.log(`BỎ QUA ${boQua.length}:`);
  for (const x of boQua) console.log(`  · ${x.cu} — ${x.ly}`);
  console.log('');
}

if (boQua.length) {
  console.error('DỪNG CẢ LƯỢT: có món bỏ qua. Ghi nửa lô là trạng thái tệ nhất —');
  console.error('không biết slug nào đã đổi, mà 301 thì đã soạn cho cả 23.');
  console.error('Sửa bảng dữ liệu cho khớp DB rồi chạy lại.');
  await db.$disconnect();
  process.exit(1);
}

/* --------------------------------- khối 301 --------------------------------- */
const khoi301 = lam
  .map(
    (x) =>
      `      {\n        source: '/cua-hang/${x.cu}',\n        destination: '/cua-hang/${x.moi}',\n        permanent: true,\n      },`,
  )
  .join('\n');

if (!GHI) {
  console.log('─'.repeat(78));
  console.log('DÁN KHỐI NÀY vào redirects() trong koi-storefront/next.config.ts TRƯỚC:');
  console.log('─'.repeat(78));
  console.log(khoi301);
  console.log('─'.repeat(78));
  console.log('Rồi chạy: node scripts/doi-slug.mjs --ghi');
  await db.$disconnect();
  process.exit(0);
}

/* ------------------------------- chụp bản gốc ------------------------------- */
const dau = new Date().toISOString().replace(/[:.]/g, '-');
const tepGoc = path.resolve(import.meta.dirname, `_goc-doi-slug-${dau}.sql`);
const sql = [
  `-- Hoàn tác đổi slug, chụp ${new Date().toISOString()}`,
  `-- Chạy file này là slug về nguyên trạng. NHƯNG 301 trong next.config.ts`,
  `-- phải bỏ ra cùng lúc, không thì đường cũ 301 sang đường không còn tồn tại.`,
  '',
  ...lam.map((x) => `UPDATE koi_free_style.koi_products SET slug = '${x.cu}' WHERE id = '${x.id}';`),
  '',
].join('\n');
fs.writeFileSync(tepGoc, sql, 'utf8');
console.log(`Đã chụp bản gốc: ${path.basename(tepGoc)}`);

/* ----------------------------------- ghi ----------------------------------- */
let xong = 0;
for (const x of lam) {
  await db.koiProduct.update({ where: { id: x.id }, data: { slug: x.moi } });
  xong++;
  console.log(`  ✓ ${x.cu} → ${x.moi}`);
}

console.log(`\nĐã ghi ${xong}/${lam.length}.`);
console.log('\nCÒN HAI VIỆC, làm ngay:');
console.log('  1. deploy koi-storefront (301 đã dán) — cũng để xoá bộ đệm use cache');
console.log('  2. curl từng đường cũ (phải 301) và đường mới (phải 200)');

await db.$disconnect();
