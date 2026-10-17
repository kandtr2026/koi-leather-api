/**
 * NHẬP THÔNG SỐ KỸ THUẬT cho koi_products.technicalSpecs.
 *
 *   node scripts/nhap-thong-so-ky-thuat.mjs            # chạy thử, không ghi
 *   node scripts/nhap-thong-so-ky-thuat.mjs --soi       # in từng SP một
 *   node scripts/nhap-thong-so-ky-thuat.mjs --ghi       # ghi thật
 *
 * HAI NGUỒN, KHÔNG BỊA THÊM GÌ:
 *
 * 1. Bản xuất WordPress `koi-leather-data/data/products.json` — khối "thông tin
 *    ngắn" của 329 sản phẩm cũ có sẵn 176 dòng "Kích thước", 172 dòng "Nhà
 *    thuộc", 138 dòng "Chất liệu da"… Đây là số do CHÍNH người bán gõ hồi còn
 *    chạy WooCommerce, không phải suy diễn.
 * 2. Thân bài `description` đang sống trong DB — bóc số ngăn thẻ, size lug dây
 *    đồng hồ, bản ngang thắt lưng, phần cứng. Chỉ lấy khi câu văn nói rõ.
 *
 * VÌ SAO NỐI BẰNG TÊN TỆP ẢNH CHỨ KHÔNG PHẢI SLUG:
 *
 * Slug đã bị viết lại hai lần kể từ bản xuất (bộ sinh slug cũ làm rụng chữ hoa
 * có dấu: "den" → "en", "dong-ho" → "ong-ho"; rồi đợt 29/08 đổi tên gỡ nhãn hiệu
 * người khác). Khớp slug nguyên văn chỉ được 53/329. Khớp gần đúng theo chuỗi thì
 * lên 128 nhưng có ca sai — và một số đo gán sai sản phẩm còn tệ hơn không có số
 * đo, vì khách đặt hàng theo nó.
 *
 * Ảnh thì không đổi tên: bản xuất ghi `…/uploads/2026/06/rap-vi-xam.png`, DB ghi
 * `…/storage/v1/object/public/products/rap-vi-xam.webp`. Cắt lấy tên tệp, bỏ đuôi
 * và hậu tố cỡ WP (-400x400) là ra cùng một khoá. Đo trên hàng thật: 318/329 nối
 * được 1-1, KHÔNG có ca hai sản phẩm WP trỏ vào cùng một sản phẩm DB.
 *
 * BẪY: 2.179 ảnh đã chuyển sang Cloudinary, tên tệp là mốc thời gian
 * (1787890347209.webp) nên không nối được — nhưng đó là ảnh của hàng nhập SAU
 * lần di trú, tức hàng vốn không có mặt trong bản xuất. Không mất gì.
 *
 * CHẠY LẠI ĐƯỢC NHIỀU LẦN: chỉ ghi `technicalSpecs`, và mặc định KHÔNG chạm sản
 * phẩm đã có thông số (dùng --de-len để ghi đè). Trước khi ghi luôn xuất một tệp
 * SQL hoàn tác vào scripts/_goc-thong-so-<mốc>.sql.
 */
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
import path from 'node:path';
import { NHAN_WP, CO_Y_BO, VAN_DA, KICH_THUOC_CHU } from './nhap-thong-so-ky-thuat.data.mjs';

const env = fs.readFileSync(path.resolve(import.meta.dirname, '..', '.env'), 'utf8');
for (const l of env.split(/\r?\n/)) {
  const m = /^([A-Z_]+)=(.*)$/.exec(l.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const CO = new Set(process.argv.slice(2));
for (const c of CO) {
  if (!['--ghi', '--soi', '--de-len'].includes(c)) {
    console.error(`Cờ lạ: ${c}. Chỉ nhận --ghi, --soi, --de-len.`);
    process.exit(1);
  }
}
const GHI = CO.has('--ghi');
const SOI = CO.has('--soi');
const DE_LEN = CO.has('--de-len');

const NGUON = 'E:/Claude A Khoa Processing/koi-leather-data/data/products.json';

// ===== PLACEHOLDER_HELPERS =====

/** HTML → chữ trơn, giữ ngắt dòng theo thẻ khối. */
function chuTron(html) {
  return String(html ?? '')
    .normalize('NFC')
    .replace(/<\/(p|li|div|h[1-6]|tr|td)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#8211;/g, '–')
    .replace(/&#8212;/g, '—')
    .replace(/&#215;/g, '×')
    .replace(/&#8217;/g, '’')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+/g, ' ');
}

/**
 * Tên tệp ảnh làm khoá nối. Bỏ query (?v=…), bỏ đuôi, bỏ hậu tố cỡ WordPress
 * (-400x400) và -scaled. Hai bên phải cho ra cùng chuỗi.
 */
function tepAnh(u) {
  let s = String(u ?? '').split('?')[0];
  s = s.substring(s.lastIndexOf('/') + 1);
  s = s.replace(/\.(jpe?g|png|webp|gif|avif)$/i, '');
  s = s.replace(/-\d{2,4}x\d{2,4}$/, '').replace(/-scaled$/, '');
  try {
    s = decodeURIComponent(s);
  } catch {
    /* tên tệp có % lạ thì dùng nguyên văn */
  }
  return s.toLowerCase();
}

/** Số thập phân kiểu Việt: 23.5 → 23,5. Không đổi giá trị, chỉ đổi dấu. */
const soVN = (s) => String(s).replace(/(\d)\.(\d)/g, '$1,$2');

/** Tên tiếng Việt từ cột JSON i18n. */
function tenViet(json) {
  try {
    const o = JSON.parse(json);
    return String(o?.vi ?? o?.en ?? json);
  } catch {
    return String(json ?? '');
  }
}

// ===== PLACEHOLDER_KICH_THUOC =====

/**
 * Chuẩn hoá một giá trị "Kích thước" của bản xuất.
 *
 * Bản xuất có 101 cách viết cho cùng một ý: `11x9cm`, `13×10.5cm`,
 * `7,5cm * 3,5cm * 1cm`, `240*125*65 mm`, `dài (35cm) x rộng (16cm) x cao (5cm)`,
 * `21x12x7 (cm)`, `A4 (33 x 24 cm)`, `size 20cm`, `31x17x11` (thiếu đơn vị).
 *
 * Quy tắc: KHÔNG sửa con số, chỉ sửa cách viết — dấu nhân về `×`, đơn vị tách
 * khỏi số và chỉ ghi MỘT lần ở cuối, chú thích trong ngoặc giữ nguyên.
 *
 * ĐƠN VỊ KHUYẾT: 20 giá trị chỉ có số (`31x17x11`, `24×18`). Điền `cm` — không
 * phải đoán mò mà có hai bằng chứng chéo trong chính dữ liệu: slug
 * `mici-bag-da-nubuck-17cm-x-20cm-x-10cm` ứng với giá trị `17x20x10`, và
 * `tui-da-nam-da-ca-sau-viet-24x18cm-en` ứng với `24×18`. Chỉ áp cho dãy từ HAI
 * số trở lên; một số trơ (`size 24`, `A6`) thì bỏ, vì nó có thể là ngàm mm, cỡ
 * inch hay khổ giấy — không có gì để dựa vào.
 *
 * Trả null khi không nhận ra dạng nào — thà không có dòng đó.
 */
function chuanKichThuoc(raw) {
  let s = chuTron(raw).trim().replace(/\s+/g, ' ').replace(/[.,;]+$/, '');
  if (!s) return null;

  const chu = KICH_THUOC_CHU[s.toLowerCase()];
  if (chu) return chu;

  // Chú thích bằng chữ trong ngoặc ở CUỐI: giữ lại, ghép sau khi chuẩn hoá số.
  let ghiChu = '';
  const mGhi = /\(([^)]{6,})\)\s*$/.exec(s);
  if (mGhi && /\p{L}{3}/u.test(mGhi[1])) {
    ghiChu = ` (${mGhi[1].trim()})`;
    s = s.slice(0, mGhi.index).trim();
  }

  /**
   * Bóc DÃY SỐ ĐO thay vì cắt cả chuỗi theo dấu nhân.
   *
   * Bản cũ cắt `A4 (33 x 24 cm)` theo dấu `x` rồi lọc lấy chữ số trong từng
   * mảnh — mảnh đầu `A4 33` thành `433`. Một số đo bịa ra từ hư không. Ở đây chỉ
   * những cụm SỐ nối nhau bằng dấu nhân mới được nhận.
   *
   * GIỮ NHÃN CHIỀU, không gỡ. Bản trước gỡ chữ "dài/rộng/cao" rồi in trơ ba con
   * số, và `dài (23cm) x rộng (10cm) x cao (15cm)` của túi LOOM thành
   * "23 × 10 × 15 cm" — trong khi thân bài CÙNG TRANG viết "23 x 15 x 10 cm".
   * Hai con số hoán vị nhau trên một trang, khách đọc là thấy mâu thuẫn. Người
   * bán đã nói rõ chiều nào là chiều nào thì giữ đúng lời họ.
   *
   * Không dùng `\b` quanh mấy chữ này: `\b` của JavaScript dựa trên
   * [A-Za-z0-9_] nên sau chữ "dài" nó không thấy biên nào cả.
   */
  s = s.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();

  const DV = { mm: 'mm', cm: 'cm', inch: 'inch', inches: 'inch' };
  const NHAN = { dài: 'Dài', rộng: 'Rộng', ngang: 'Ngang', cao: 'Cao', sâu: 'Sâu', dày: 'Dày', dầy: 'Dày' };
  const RE = /(?:(?<!\p{L})(dài|rộng|ngang|cao|sâu|dày|dầy)(?!\p{L})\s*)?(\d+(?:[.,]\d+)?)\s*(mm|cm|inch(?:es)?)?/giu;
  const mocSo = [...s.matchAll(RE)].map((m) => ({
    nhan: m[1] ? NHAN[m[1].toLowerCase()] : null,
    so: m[2],
    dv: m[3] ? DV[m[3].toLowerCase()] : null,
    dau: m.index,
    cuoi: m.index + m[0].length,
  }));
  if (!mocSo.length) return null;

  // Nối các mốc liền nhau khi giữa chúng chỉ có dấu nhân.
  let day = [mocSo[0]];
  let tot = day;
  for (let i = 1; i < mocSo.length; i++) {
    const giua = s.slice(mocSo[i - 1].cuoi, mocSo[i].dau);
    day = /^\s*[x×*]\s*$/i.test(giua) ? [...day, mocSo[i]] : [mocSo[i]];
    if (day.length > tot.length) tot = day;
  }

  const donVi = [...tot].reverse().find((t) => t.dv)?.dv ?? (tot.length >= 2 ? 'cm' : null);
  if (!donVi) return null;

  // Khổ giấy đứng trước dãy số (`A4 (33 x 24 cm)`) là thông tin thật, giữ lại.
  const kho = /\b(A[3-6])\b/i.exec(s.slice(0, tot[0].dau))?.[1];
  const dau = kho ? `${kho.toUpperCase()} — ` : '';

  // Từ hai chiều có tên trở lên thì in kèm tên, mỗi chiều một đơn vị riêng —
  // "Dài 23 cm × Rộng 10 cm × Cao 15 cm". Một nhãn lẻ thì bỏ, vì "Dài 23 × 10 ×
  // 15 cm" đọc ra như thể chỉ chiều đầu có tên.
  if (tot.filter((t) => t.nhan).length >= 2) {
    return `${dau}${tot.map((t) => `${t.nhan ? t.nhan + ' ' : ''}${soVN(t.so)} ${t.dv ?? donVi}`).join(' × ')}${ghiChu}`.trim();
  }

  const so = tot.map((t) => soVN(t.so)).join(' × ');
  return `${dau}${so} ${donVi}${ghiChu}`.trim();
}

// ===== PLACEHOLDER_BOC_WP =====

/**
 * Bóc "Nhãn: giá trị" trong khối thông tin ngắn của WordPress.
 *
 * TÁCH KHỐI DÍNH LIỀN trước khi đọc theo dòng. Một số bài soạn khối thông tin
 * không có thẻ ngắt nào, nên cả khối về một dòng:
 *
 *   "Đối tượng sử dụng: UnisexThương hiệu: Koi LeatherBảo hành: 6 tháng…"
 *
 * Đọc theo dòng thì chỉ nhãn ĐẦU TIÊN được nhận, phần còn lại thành giá trị của
 * nó. Đúng ca `charm-cuu` — một trong mười món bán chạy nhất — nên nó ra bảng
 * trống dù bản xuất có đủ chất liệu, vân da, chế tác.
 *
 * Chèn ngắt dòng trước mọi nhãn ĐÃ BIẾT (bảng quy đổi + danh sách cố ý bỏ).
 * Chỉ nhãn đã biết, không dùng luật chung "chữ hoa sau chữ thường" — luật đó sẽ
 * cắt cả "Da bò Ý" hay "TP.Hồ Chí Minh".
 *
 * PHÂN BIỆT HOA THƯỜNG, và đây là điều kiện sống còn: bật cờ `i` thì "chế tác"
 * bên trong nhãn "Loại chế tác:" cũng khớp, nên nó cắt ngay giữa nhãn thành
 * "Loại " + "chế tác: …". Đo được: 231 nhãn Chế tác, 176 Loại thiết kế và 124
 * Màu phụ kiện rơi ra ngoài bảng quy đổi vì đúng lỗi này. Nhãn dài xếp trước
 * (sort theo độ dài giảm) để "Loại chế tác" luôn thắng "Chế tác".
 */
const NHAN_DA_BIET = [...new Set([...Object.keys(NHAN_WP), ...CO_Y_BO])]
  .sort((a, b) => b.length - a.length)
  .map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
const RE_TACH = new RegExp(`(?=(?:${NHAN_DA_BIET.join('|')})\\s*[:：])`, 'gu');

function bocKhoiWP(html) {
  const out = {};
  const tho = chuTron(html)
    .split(/\n+/)
    .flatMap((d) => d.split(RE_TACH));
  for (const line of tho) {
    const t = line.trim().replace(/^[^\p{L}\p{N}]+/u, '');
    const m = /^([\p{L}][^:：]{2,32})[:：]\s*(.+)$/u.exec(t);
    if (!m) continue;
    const nhan = m[1].trim();
    const giaTri = m[2].trim().replace(/[.;]+$/, '');
    if (!giaTri || giaTri.length > 130) continue;
    if (!(nhan in out)) out[nhan] = giaTri;
  }
  return out;
}

/** Khối WP → object thông số đã đặt tên theo tiêu chí hiện cho khách. */
function tuWP(khoi, laKhac) {
  const ra = {};
  for (const [nhan, giaTri] of Object.entries(khoi)) {
    if (CO_Y_BO.includes(nhan)) continue;
    const key = NHAN_WP[nhan];
    if (!key) {
      laKhac?.set(nhan, (laKhac.get(nhan) ?? 0) + 1);
      continue;
    }
    if (key in ra) continue; // nhãn đầu tiên thắng, theo thứ tự người gõ

    if (key === 'Kích thước' || key === 'Bản ngang' || key === 'Kích thước lọt lòng') {
      const v = chuanKichThuoc(giaTri);
      if (v) ra[key] = v;
      continue;
    }
    if (key === 'Vân da') {
      const v = VAN_DA[giaTri.toLowerCase().trim()];
      // Câu tự do ("Vân Epsom đặc trưng, chống trầy xước tốt") giữ nguyên văn.
      ra[key] = v ?? giaTri;
      continue;
    }
    if (key === 'Màu phụ kiện') {
      // "Vàng"/"Bạc"/"Đồng"/"Đen"/"Black" — chỉ nhận từ chỉ màu, bỏ câu dài.
      if (!/^[\p{L}\s/]{2,20}$/u.test(giaTri)) continue;
      ra[key] = giaTri.replace(/\s*\/\s*/g, ' / ');
      continue;
    }
    if (key === 'Độ dày da' || key === 'Trọng lượng') {
      ra[key] = soVN(giaTri).replace(/(\d)\s*(mm|cm|kg|g|gr|gram)\b/gi, '$1 $2');
      continue;
    }
    ra[key] = giaTri;
  }
  return ra;
}

// ===== PLACEHOLDER_BOC_DB =====

/**
 * Bóc thông số từ THÂN BÀI đang sống trong DB.
 *
 * Chỉ nhặt khi câu văn nói thẳng ra con số. Không suy diễn từ loại sản phẩm,
 * không lấy trung bình, không "khoảng". Mỗi luật dưới đây đều dựng từ câu THẬT
 * đã đọc trong DB, có ghi lại câu mẫu.
 */
function tuThanBai(moTa, loai) {
  const s = chuTron(moTa);
  const ra = {};

  // "Gồm 6 ngăn thẻ", "6–8 khe đựng thẻ", "4 ngăn thẻ phía trước"
  const the = /(\d+\s*(?:[–—-]\s*\d+)?)\s*(?:ngăn|khe)\s*(?:đựng\s*|chứa\s*)?(?:thẻ|card)/i.exec(s);
  if (the) ra['Số ngăn thẻ'] = the[1].replace(/\s*[–—-]\s*/, '–').trim();

  /**
   * Ngăn tiền: cụm "N ngăn …" mà trong 28 ký tự sau có chữ "tiền".
   *
   * Không dùng một regex cứng vì người viết diễn đạt 6 kiểu khác nhau trên cùng
   * một ý: "2 ngăn lớn đựng tiền", "2 ngăn lớn để tiền mặt", "2 ngăn chính chứa
   * tiền giấy", "2 ngăn tiền", "2 ngăn lớn cho tiền mặt", "2 ngăn tiền lớn".
   */
  for (const m of s.matchAll(/(\d+)\s*ngăn\b([^.;]{0,28})/gi)) {
    if (/tiền/i.test(m[2]) && !/thẻ/i.test(m[2])) {
      ra['Ngăn tiền'] = m[1];
      break;
    }
  }

  /**
   * Dây đồng hồ — bề rộng ngàm (lug). BẮT BUỘC câu phải có chữ "lug"/"ngàm".
   *
   * Vì sao: cùng một thân bài còn có "mặt đồng hồ 42mm trở lên" (cỡ vỏ đồng hồ)
   * và "tấm da mỏng 0,4-0,6mm" (độ dày da). Lấy con số mm bất kỳ là gán sai.
   *
   * Người viết liệt kê chứ không cho một số: "18mm, 19mm, 20mm, 21mm, 22mm",
   * "18/19/20/21/22mm", "18mm – 24mm" — nên hiện thành khoảng, và nói rõ là đặt
   * theo đồng hồ chứ không phải một cỡ duy nhất.
   */
  if (loai === 'WATCH_STRAP') {
    for (const cau of s.split(/[.;\n]/)) {
      if (!/\b(lug|ngàm)\b/i.test(cau)) continue;
      const so = [...cau.matchAll(/(\d{2})\s*(?:mm)?(?=\s*[,/–—-]|\s*mm)/gi)]
        .map((m) => Number(m[1]))
        .filter((n) => n >= 12 && n <= 30);
      if (so.length < 2) continue;
      const min = Math.min(...so);
      const max = Math.max(...so);
      if (min === max) continue;
      ra['Bề rộng ngàm'] = `${min} – ${max} mm (đặt theo đồng hồ)`;
      break;
    }
  }

  // Thắt lưng — bản ngang: "Bản dây tiêu chuẩn 30–35mm", "bản 3,5cm"
  if (loai === 'BELT') {
    const b = /\bbản\b[^.;]{0,24}?(\d+(?:[.,]\d+)?)\s*(?:\s*[–—-]\s*(\d+(?:[.,]\d+)?))?\s*(mm|cm)/i.exec(s);
    if (b) {
      const dv = b[3].toLowerCase();
      ra['Bản ngang'] = b[2] ? `${soVN(b[1])} – ${soVN(b[2])} ${dv}` : `${soVN(b[1])} ${dv}`;
    }
  }

  return ra;
}

// ===== PLACEHOLDER_MAIN =====

const db = new PrismaClient();
const wpRaw = JSON.parse(fs.readFileSync(NGUON, 'utf8').replace(/^﻿/, ''));

const sanPham = await db.koiProduct.findMany({
  where: { isDeleted: false, status: 'ACTIVE' },
  select: {
    id: true,
    slug: true,
    name: true,
    productType: true,
    description: true,
    technicalSpecs: true,
    materialCategory: { select: { name: true } },
    images: { select: { url: true } },
  },
});

const theoSlug = new Map(sanPham.map((p) => [p.slug, p]));
/** tên tệp ảnh → tập slug DB. Một tệp dùng cho nhiều SP là có thật, nên là Set. */
const theoAnh = new Map();
for (const p of sanPham) {
  for (const a of p.images) {
    const t = tepAnh(a.url);
    if (!t) continue;
    if (!theoAnh.has(t)) theoAnh.set(t, new Set());
    theoAnh.get(t).add(p.slug);
  }
}

/** Nối một sản phẩm WP về sản phẩm DB. Trả {sp, cach} hoặc null. */
function noi(w) {
  const thang = theoSlug.get(w.slug);
  if (thang) return { sp: thang, cach: 'slug' };

  const dem = new Map();
  for (const i of w.images ?? []) {
    for (const s of theoAnh.get(tepAnh(i.src)) ?? []) dem.set(s, (dem.get(s) ?? 0) + 1);
  }
  if (!dem.size) return null;
  const xep = [...dem.entries()].sort((a, b) => b[1] - a[1]);
  // Hoà phiếu = không chắc. Bỏ, đừng đoán.
  if (xep.length > 1 && xep[0][1] === xep[1][1]) return null;
  return { sp: theoSlug.get(xep[0][0]), cach: `ảnh ${xep[0][1]}/${(w.images ?? []).length}` };
}

const nhanLa = new Map();
const wpTheoSlug = new Map();
const khongNoi = [];
for (const w of wpRaw) {
  const k = noi(w);
  if (!k?.sp) {
    khongNoi.push(w.slug);
    continue;
  }
  // Đã có SP WP khác trỏ vào đây rồi thì giữ cái đầu (đo thật: không xảy ra).
  if (!wpTheoSlug.has(k.sp.slug)) {
    wpTheoSlug.set(k.sp.slug, { khoi: bocKhoiWP(w.short_description), cach: k.cach, wpSlug: w.slug });
  }
}

// ===== PLACEHOLDER_TRON =====

/**
 * Trộn hai nguồn cho một sản phẩm.
 *
 * Thứ tự thắng thua có chủ ý:
 *   - `Chất liệu` lấy từ materialCategory của DB TRƯỚC bản xuất, vì loại da đã
 *     được rà lại tay trong đợt 30/08 (514 SP), còn bản xuất là chữ 08/2026.
 *   - Số đo lấy từ bản xuất trước thân bài: bản xuất là ô nhập riêng, thân bài
 *     là câu văn nên dễ lẫn.
 *   - Thân bài chỉ ĐIỀN CHỖ TRỐNG, không ghi đè.
 */
function tron(p) {
  const wp = wpTheoSlug.get(p.slug);
  const ra = wp ? tuWP(wp.khoi, nhanLa) : {};

  const daDB = p.materialCategory?.name?.trim();
  if (daDB) ra['Chất liệu'] = daDB;

  for (const [k, v] of Object.entries(tuThanBai(p.description, p.productType))) {
    if (!(k in ra)) ra[k] = v;
  }
  return { specs: ra, nguon: wp?.cach ?? null, wpSlug: wp?.wpSlug ?? null };
}

/**
 * NGƯỠNG 2 TIÊU CHÍ.
 *
 * Một bảng chỉ có đúng dòng "Chất liệu: Epsom" thì không đáng dựng cả một khối
 * <h2> — khách phải cuộn qua một cái đầu đề để đọc một mẩu chữ đã nằm sẵn trong
 * tên sản phẩm. Nó cũng phản mục tiêu SEO của việc này: 400 trang mang cùng một
 * bảng một dòng là 400 trang giống nhau thêm, không phải nội dung mới.
 */
const NGUONG = 2;

const ke = { ghi: [], mong: [], daCo: [], khongCoGi: [] };
for (const p of sanPham) {
  const { specs, nguon, wpSlug } = tron(p);
  const soKey = Object.keys(specs).length;
  const banGhi = { p, specs, nguon, wpSlug, soKey };

  if (!DE_LEN && p.technicalSpecs && p.technicalSpecs.trim() !== '{}') {
    ke.daCo.push(banGhi);
  } else if (soKey >= NGUONG) ke.ghi.push(banGhi);
  else if (soKey > 0) ke.mong.push(banGhi);
  else ke.khongCoGi.push(banGhi);
}

// ===== PLACEHOLDER_BAO_CAO =====

const dong = (n, chu) => `${String(n).padStart(4)}  ${chu}`;
console.log(`\nSP sống trong DB          : ${sanPham.length}`);
console.log(`Bản xuất WP               : ${wpRaw.length} SP (nối được ${wpTheoSlug.size}, trượt ${khongNoi.length})`);
console.log(`\n${dong(ke.ghi.length, `SẼ GHI (≥ ${NGUONG} tiêu chí)`)}`);
console.log(dong(ke.mong.length, 'quá mỏng (1 tiêu chí) — bỏ qua'));
console.log(dong(ke.khongCoGi.length, 'không rút được gì — bỏ qua'));
console.log(dong(ke.daCo.length, 'đã có thông số — không chạm (dùng --de-len để ghi đè)'));

// Đếm từng tiêu chí trong lô sẽ ghi
const demKey = new Map();
for (const b of ke.ghi) for (const k of Object.keys(b.specs)) demKey.set(k, (demKey.get(k) ?? 0) + 1);
console.log('\nTiêu chí trong lô sẽ ghi:');
for (const [k, n] of [...demKey.entries()].sort((a, b) => b[1] - a[1])) console.log(dong(n, k));

// Phân bố số tiêu chí / SP
const demSo = new Map();
for (const b of ke.ghi) demSo.set(b.soKey, (demSo.get(b.soKey) ?? 0) + 1);
console.log('\nSố tiêu chí mỗi SP:');
for (const [k, n] of [...demSo.entries()].sort((a, b) => a[0] - b[0])) console.log(dong(n, `SP có ${k} tiêu chí`));

if (nhanLa.size) {
  console.log('\nNhãn WP chưa quy đổi (không nhập, xem lại nếu đáng):');
  for (const [k, n] of [...nhanLa.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) console.log(dong(n, k));
}

if (SOI) {
  console.log('\n===== TỪNG SP SẼ GHI =====');
  for (const b of ke.ghi) {
    console.log(`\n${b.p.slug}  [${b.p.productType}]${b.nguon ? `  (nối: ${b.nguon} ← ${b.wpSlug})` : '  (chỉ từ thân bài)'}`);
    for (const [k, v] of Object.entries(b.specs)) console.log(`    ${k}: ${v}`);
  }
  console.log('\n===== QUÁ MỎNG (1 tiêu chí, bỏ) =====');
  for (const b of ke.mong) console.log(`  ${b.p.slug} → ${JSON.stringify(b.specs)}`);
}

// ===== PLACEHOLDER_GHI =====

if (!GHI) {
  console.log('\n(chạy thử — chưa ghi gì. Thêm --ghi để ghi thật, --soi để in từng SP)');
  await db.$disconnect();
  process.exit(0);
}

// Tệp hoàn tác TRƯỚC khi ghi. Cột này đang là "{}" cả 511 dòng nên bản hoàn tác
// gọn, nhưng vẫn xuất đủ để chạy lại lần sau (--de-len) không mất bản cũ.
const moc = new Date().toISOString().replace(/[:.]/g, '-');
const tepGoc = path.resolve(import.meta.dirname, `_goc-thong-so-${moc}.sql`);
const sql = [
  '-- Hoàn tác lượt nhập thông số kỹ thuật.',
  `-- Sinh bởi scripts/nhap-thong-so-ky-thuat.mjs lúc ${new Date().toISOString()}`,
  'BEGIN;',
  ...ke.ghi.map(
    (b) =>
      `UPDATE koi_free_style.koi_products SET "technicalSpecs" = ${quote(b.p.technicalSpecs ?? '{}')} WHERE slug = ${quote(b.p.slug)};`,
  ),
  'COMMIT;',
].join('\n');
fs.writeFileSync(tepGoc, sql, 'utf8');
console.log(`\nĐã lưu bản hoàn tác: ${tepGoc}`);

function quote(s) {
  return `'${String(s).replace(/'/g, "''")}'`;
}

let xong = 0;
let loi = 0;
/**
 * 8 chứ không 25: pooler của Supabase ở chế độ session chỉ cho 15 kết nối, lô 25
 * làm 60/255 lần ghi chết với EMAXCONNSESSION ngay lượt đầu chạy thật.
 */
const LO = 8;
for (let i = 0; i < ke.ghi.length; i += LO) {
  const lo = ke.ghi.slice(i, i + LO);
  const kq = await Promise.allSettled(
    lo.map((b) =>
      db.koiProduct.update({
        where: { id: b.p.id },
        // JSON.stringify không escape sẵn: cột là TEXT nên chuỗi vào nguyên văn.
        data: { technicalSpecs: JSON.stringify(b.specs) },
      }),
    ),
  );
  for (let j = 0; j < kq.length; j++) {
    if (kq[j].status === 'fulfilled') xong++;
    else {
      loi++;
      console.error(`  [!] ${lo[j].p.slug}: ${kq[j].reason?.message ?? kq[j].reason}`);
    }
  }
  process.stdout.write(`\r  ghi ${xong}/${ke.ghi.length}…`);
}
console.log(`\n\nGhi xong: ${xong} SP${loi ? `, LỖI ${loi}` : ''}.`);

const conLai = await db.koiProduct.count({
  where: { isDeleted: false, status: 'ACTIVE', NOT: { technicalSpecs: '{}' } },
});
console.log(`Kiểm lại từ DB: ${conLai} SP sống có technicalSpecs != '{}'.`);

await db.$disconnect();








