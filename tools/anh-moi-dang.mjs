#!/usr/bin/env node
/**
 * Đăng listing mới từ lô ảnh D:\7.2026_HEre — A Khoa đặt hàng 26/09/2026.
 *
 * Đầu vào: tools/_tmp/anh-moi/kiem-ke.json (tools/anh-moi-kiem-ke.mjs) — thư mục
 * nào đã có ảnh trùng trên listing thì BỎ QUA ("nếu có bị trùng trên các listing
 * rồi thì bỏ qua").
 *
 * Quyết định A Khoa chốt 26/09:
 *   - Đơn sửa chữa / vệ sinh / thay da đồ hiệu của khách → KHÔNG lên listing, gom
 *     vào tools/_tmp/anh-moi/dich-vu.json để dùng cho trang Dịch vụ/Spa.
 *   - Giá = Doanh thu đơn AppSheet chia số món; đơn lô lớn / Stock / không có
 *     doanh thu → để trống (mặt tiền hiện "Liên hệ").
 *   - Tạo xong HIỆN LUÔN (ACTIVE), chốt tới đâu ghi tới đó.
 *   - Tên listing KHÔNG ghi tên hãng/tên mẫu (Birkin, Chanel…). Riêng dây đồng hồ
 *     GIỮ tên hãng đồng hồ (hàng thay thế — memory koi-day-dong-ho-ten-hang).
 *   - Tên khách (ghi trên bill, dập trên sản phẩm) KHÔNG bao giờ lên web.
 *
 * Model: Gemini qua router riêng của A Khoa (khoa.tailc2d856.ts.net), key ở
 * ../_secrets/9router.key (không commit). Tạo sản phẩm + tải ảnh qua API backend
 * bằng KOI_ADMIN_WRITE_TOKEN (koi-storefront/.env.local) — API tự đổi WebP, tự
 * làm ảnh nhỏ w400/w800/w1200, tự sinh slug/SKU và tự làm mới cache mặt tiền.
 *
 *   node tools/anh-moi-dang.mjs --phan-tich [--gioi-han N] [--loc "chuỗi"]   chỉ phân tích
 *   node tools/anh-moi-dang.mjs --chay [--gioi-han N] [--loc "chuỗi"]        phân tích + đăng luôn
 *   node tools/anh-moi-dang.mjs --go <slug,slug|TAT-CA>                       gỡ (xoá mềm) listing đã đăng
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const goc = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const docEnv = (f, k) => {
  const l = fs.readFileSync(f, 'utf8').split(/\r?\n/).find((x) => x.startsWith(k + '='));
  return l ? l.slice(k.length + 1).replace(/^["']|["']$/g, '').trim() : '';
};
process.env.DATABASE_URL = docEnv(path.join(goc, '.env'), 'DATABASE_URL');
const TOKEN_GHI = docEnv(path.join(goc, '..', 'koi-storefront', '.env.local'), 'KOI_ADMIN_WRITE_TOKEN');
const KEY_MODEL = fs.readFileSync(path.join(goc, '..', '_secrets', '9router.key'), 'utf8').trim();
const API = 'https://koi-leather-api.vercel.app';
const ROUTER = 'https://khoa.tailc2d856.ts.net/v1/chat/completions';
const MODEL = 'ag/gemini-3.8-flash-high';
const BILL = 'G:/My Drive/Appsheet/data/TheodõiKoi-917306375-26-01-07/OrderMedia';

const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

const argv = process.argv.slice(2);
const co = (c) => argv.includes(c);
const giaTri = (c, d) => { const i = argv.indexOf(c); return i !== -1 && argv[i + 1] ? argv[i + 1] : d; };

// Lô: mặc định 7.2026 (tools/_tmp/anh-moi); lô khác --ra sp-koi (kiểm kê bằng anh-moi-kiem-ke.mjs --ra cùng tên).
const RA = path.join(goc, 'tools', '_tmp', giaTri('--ra', 'anh-moi'));
const TEP_PT = path.join(RA, 'phan-tich.json');
const SO_DANG = path.join(RA, 'da-dang.jsonl');
const TEP_DV = path.join(RA, 'dich-vu.json');
const TEP_GIU = path.join(RA, 'giu-lai-logo.json');
const docJson = (f, d = {}) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : d);
const ghiJson = (f, o) => fs.writeFileSync(f, JSON.stringify(o, null, 1));

// ---------- danh mục đóng ----------
const tenVi = (x) => { try { return JSON.parse(x).vi || x; } catch { return x; } };
const DM = (await prisma.$queryRawUnsafe(`SELECT id, slug, name FROM koi_free_style.koi_categories`)).map((c) => ({ ...c, ten: tenVi(c.name) }));
const DA = (await prisma.$queryRawUnsafe(`SELECT id, code, name FROM koi_free_style.koi_material_categories`)).map((c) => ({ ...c, ten: tenVi(c.name) }));
const MAU = ['DEN', 'NAU_DAM', 'NAU_DO', 'VANG_BO', 'GOLD', 'KEM', 'TRANG', 'XAM', 'NAVY', 'XANH_DUONG', 'XANH_LA', 'DO', 'CAM', 'HONG', 'TIM'];
const LOAI_SP = ['WALLET', 'BELT', 'WATCH_STRAP', 'BAG', 'ACCESSORY'];
const dmTheoSlug = new Map(DM.map((c) => [c.slug, c]));
const daTheoCode = new Map(DA.map((c) => [c.code, c]));

// ---------- ứng viên ----------
const kiemKe = Object.values(docJson(path.join(RA, 'kiem-ke.json')));
// Thư mục Gemini đã soi lại và xác nhận KHÔNG trùng (tools/anh-moi-soi-trung.mjs):
// vân tay khớp nhầm đúng 1 tấm → bỏ dấu trùng, đưa lại hàng đăng.
const khongTrung = new Set(docJson(path.join(RA, 'khong-trung.json'), []));
for (const x of kiemKe) if (khongTrung.has(x.duong)) x.trung = {};
const maDaCoTrenWeb = new Set(kiemKe.filter((x) => x.ma && Object.keys(x.trung).length).map((x) => x.ma));
const nhom = new Map(); // gộp các thư mục ngày cùng mã đơn thành MỘT sản phẩm
for (const x of kiemKe) {
  if (!x.soAnh || Object.keys(x.trung).length) continue;
  if (x.danhMuc === 'Leather Material' || /cần xem lại|test/i.test(x.ten)) continue;
  if (x.ma && maDaCoTrenWeb.has(x.ma)) continue; // cùng đơn đã có một buổi chụp trên web
  const k = x.ma ? `ma:${x.ma}` : `tm:${x.duong}`;
  if (!nhom.has(k)) nhom.set(k, { khoa: k, thuMuc: [], ma: x.ma, don: x.don, bill: x.bill });
  nhom.get(k).thuMuc.push(x);
}
let ungVien = [...nhom.values()].sort((a, b) => (b.thuMuc[0].ngay || '').localeCompare(a.thuMuc[0].ngay || ''));
const loc = giaTri('--loc', '');
if (loc) ungVien = ungVien.filter((u) => u.thuMuc.some((t) => t.ten.toLowerCase().includes(loc.toLowerCase())));

// ---------- ảnh ----------
const laAnh = (f) => /\.(jpe?g|png)$/i.test(f) && !f.startsWith('._');
function tepAnh(thuMuc) {
  const ra = [];
  for (const x of fs.readdirSync(thuMuc, { withFileTypes: true })) {
    const p = path.join(thuMuc, x.name);
    if (x.isFile() && laAnh(x.name)) ra.push(p);
    else if (x.isDirectory() && !/^(old|dark|light)$/i.test(x.name)) for (const y of fs.readdirSync(p)) if (laAnh(y)) ra.push(path.join(p, y));
  }
  return ra.sort();
}
const dataUrl = async (f, canh) => 'data:image/jpeg;base64,' + (await sharp(f, { failOn: 'none' }).rotate().resize(canh, canh, { fit: 'inside' }).jpeg({ quality: 80 }).toBuffer()).toString('base64');

async function goiModel(content) {
  for (let lan = 1; lan <= 4; lan++) {
    try {
      const r = await fetch(ROUTER, {
        method: 'POST',
        headers: { Authorization: `Bearer ${KEY_MODEL}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: MODEL, messages: [{ role: 'user', content }], max_tokens: 8000, stream: false }),
        signal: AbortSignal.timeout(240_000),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok) {
        const t = String(d.choices?.[0]?.message?.content ?? '');
        const m = t.match(/\{[\s\S]*\}/);
        if (m) return JSON.parse(m[0]);
        throw new Error('không có JSON: ' + t.slice(0, 120));
      }
      if (r.status < 500 && r.status !== 429) throw new Error(`${r.status} ${JSON.stringify(d).slice(0, 160)}`);
    } catch (e) { if (lan === 4) throw e; }
    await new Promise((res) => setTimeout(res, 5000 * lan));
  }
}

/**
 * Chữ CẤM trong chữ khách đọc — cùng tinh thần đợt soát văn phong 22/09 (A Khoa:
 * chữ "mắc óe"): tính từ thổi phồng thay cho thông tin thật. Model hay dùng lại
 * dù đã dặn, nên còn một lượt soát bằng mã sau khi model trả (xem soatChu).
 */
const CHU_CAM = ['tinh tế', 'tỉ mỉ', 'tinh xảo', 'cao cấp', 'đẳng cấp', 'sang trọng', 'thượng lưu', 'hoàn hảo', 'hoàn mỹ', 'tuyệt đẹp', 'tuyệt tác', 'tuyệt vời', 'đỉnh cao', 'tuyên ngôn', 'lựa chọn lý tưởng', 'nâng tầm', 'nổi bật', 'độc đáo', 'xa xỉ', 'sành điệu', 'quý phái', 'thời thượng', 'nhập khẩu', 'bền bỉ'];
const soatChu = (kq) => {
  const chu = [kq.ten, kq.moTa, kq.metaTitle, kq.metaDescription].join(' ').toLowerCase();
  return CHU_CAM.filter((w) => chu.includes(w))
    .concat(/[|｜]/.test(kq.metaTitle || '') ? ['dấu "|" / đuôi thương hiệu trong metaTitle'] : [])
    // Mã nội bộ (mã màu Y45, số đơn) là chữ của xưởng, khách đọc không hiểu.
    .concat(/\bY\d{1,3}\b/.test([kq.ten, kq.moTa, kq.metaTitle, kq.metaDescription].join(' ')) ? ['mã màu nội bộ dạng "Y45"'] : []);
};

const HUONG_DAN = `You are the catalog editor of KOI Leather — a handmade leather atelier in Saigon (xưởng KOI). The website is a catalog of past work: each listing shows something KOI made; customers message on Zalo to order a similar piece. Write ALL customer-facing text in natural Vietnamese.

You get: the photo-folder name, possibly the order row from the workshop app (product name, order note), possibly photos of the handwritten ORDER BILL (fields: Tên sản phẩm, Loại da, Màu da chính/da lót, Chỉ may, màu sơn cạnh, Phụ kiện, Diễn giải yêu cầu) and reference pictures, then the product PHOTOS labelled P1..Pn.

Decide:
1. "loai": "san-pham" (an item KOI made, suitable as a catalog listing) | "dich-vu-sua-chua" (repair / cleaning / recolor / relining / replacing parts of a customer's EXISTING item, typically a branded bag) | "nguyen-lieu" (raw leather hides, swatches, materials) | "bo-qua" (not usable: behind-the-scenes only, event photos, no clear product, blurry set).
2. For "san-pham":
 - "ten": Vietnamese listing title, max 70 chars, descriptive: item type + leather + color (+ key design detail). NEVER use other fashion brands' model or brand names (Birkin, Kelly, Chanel, Longchamp, LV, Hermès, Prada, Goyard…) — describe the shape instead (vd "Túi xách da Togo dáng hộp quai cầm 30cm"). EXCEPTION: watch straps may name the watch brand they fit (vd "Dây đồng hồ da cá sấu cho Tissot"). Leather grain names (Epsom, Togo, Swift, Clemence, Box, Taiga, Caviar…) ARE allowed. Never include customer names, initials or stamped text.
 - "tenEn": English title.
 - "loaiSP": one of WALLET | BELT | WATCH_STRAP | BAG | ACCESSORY.
 - "danhMucChinh": ONE slug from the product-type list below. "danhMucPhu": extra slugs from either list (technique/occasion facets, and the other gender category when gender is unclear). GENDER: bags/wallets/belts have "cho nam"/"cho nu" categories — pick one only if clearly gendered by design; if unclear or unisex, put the main one in danhMucChinh and the other in danhMucPhu. Never guess from colors alone.
 - "loaiDa": up to 2 codes from the leather list (use the bill's "Loại da" when readable; else what the grain clearly shows; [] if unsure).
 - "mau": up to 2 codes from: ${MAU.join(', ')}.
 - "soMon": how many sellable units THIS ORDER contains (read the order name/bill: "3 dây đồng hồ" = 3; "2 belt đen" = 2; "SX lô túi 40…" = 40). 1 if single. null if unknown.
 - "moTa": 2–3 short HTML paragraphs (<p>…</p>), 60–130 words total. Factual and calm: what it is, leather and color, construction/details visible or written on the bill (thread color, edge paint, compartments, hardware, lining, size if written), and end with one sentence that KOI makes it to order (có thể đặt lại với màu da, kích thước, dập tên theo yêu cầu). NO superlatives or hype ("đẳng cấp", "sang trọng bậc nhất", "tuyệt tác", "hoàn hảo"…), do NOT address the reader as "bạn", do NOT invent anything not seen or written.
 - "metaTitle" (≤ 60 chars, NO brand suffix — no "| KOI", the site appends it) and "metaDescription" (≤ 155 chars), Vietnamese, same rules.
 - WORDING RULES for ten/moTa/metaTitle/metaDescription (KOI house style, strictly enforced): never use these words: ${CHU_CAM.join(', ')}. Never claim origin/import ("nhập khẩu", "da Ý", "da Pháp") or performance ("bền bỉ", "chống nước", "lực hút mạnh") unless it is written on the bill. Only add the facet "ca-nhan-hoa" when a name/initial/logo stamp is visible on the product.
 - "anh": ordered list of photo labels to publish (best 4–10): FIRST = best main photo (whole product clearly visible, product dominant, not a macro/detail/packaging shot); then a varied set (angles, inside, details, on-body). Exclude near-duplicates, blurry, dark, bill/reference/making-of shots.
 - "logoHangKhac": list every OTHER fashion brand's mark visible ON THE PRODUCT ITSELF in any photo: printed/stamped/embossed brand names (vd "Hermès Paris Made in France"), logos, monogram canvas (LV, GG, Goyard), signature hardware that is the brand's trademark (H clasp/H buckle of Hermès, CC turn-lock of Chanel, YSL logo, Dior CD, Bottega intrecciato label…). Short Vietnamese items, vd ["chữ dập Hermès Paris", "khoá chữ H"]. [] if none. Do NOT count: a branded WATCH HEAD shown with a strap, a branded device (iPhone, iPad) inside its case, a customer's own buckle when the listing is just the strap.
 - "loaiAnh": for each label in "anh", one of STUDIO (product shot) | LIFESTYLE (in use / on body / styled scene) | CRAFTING (workshop, making-of) | STAMPING (close-up of a stamped name/logo).
3. For "dich-vu-sua-chua": "moTaDichVu" (1–2 Vietnamese sentences: what service was done, on what kind of item — brand names allowed here, it is internal) and "anh" (best 2–6 labels, before/after if present).
4. "canhBao": short Vietnamese notes of anything uncertain.

Product-type categories (danhMucChinh): ${DM.filter((c) => !['ca-nhan-hoa','cham-khac-tren-da','an-lat-woven','may-tram-chan','dich-vu-dap-ten-san-pham','hang-co-san','signature-leather-goods','trademark','qua-tang-su-kien','ban-rap-thiet-ke','phu-kien-rieng-customize-hardware'].includes(c.slug)).map((c) => `${c.slug} (${c.ten})`).join('; ')}.
Facet categories (danhMucPhu only): ca-nhan-hoa (khắc/dập tên), cham-khac-tren-da, an-lat-woven (đan), may-tram-chan (chần trám), qua-tang-su-kien (quà tặng doanh nghiệp/sự kiện, logo công ty), phu-kien-rieng-customize-hardware.
Leather codes: ${DA.map((c) => `${c.code} (${c.ten})`).join('; ')}.

Reply with ONE JSON object only: {"loai":…, "logoHangKhac":[…], "ten":…, "tenEn":…, "loaiSP":…, "danhMucChinh":…, "danhMucPhu":[…], "loaiDa":[…], "mau":[…], "soMon":…, "moTa":…, "metaTitle":…, "metaDescription":…, "anh":[…], "loaiAnh":[…], "moTaDichVu":…, "canhBao":[…]}`;

async function phanTich(u) {
  const anhTat = u.thuMuc.flatMap((t) => tepAnh(t.duong));
  const buoc = Math.max(1, anhTat.length / 16);
  const mau = [];
  for (let i = 0; i < anhTat.length && mau.length < 16; i += buoc) mau.push(anhTat[Math.floor(i)]);
  const bill = u.ma && fs.existsSync(path.join(BILL, u.ma))
    ? fs.readdirSync(path.join(BILL, u.ma)).filter((f) => /\.(jpe?g|png)$/i.test(f)).slice(0, 4).map((f) => path.join(BILL, u.ma, f))
    : [];
  const t0 = u.thuMuc[0];
  const content = [{
    type: 'text',
    text: `${HUONG_DAN}

Folder: "${u.thuMuc.map((t) => (t.danhMuc ? t.danhMuc + ' / ' : '') + t.ten).join(' + ').replace(/[-]/g, '').trim()}" (date ${t0.ngay || '?'}).
${u.thuMuc.some((t) => /Koi Collection/.test(t.danhMuc || '')) ? 'This folder is in "Koi Collection" = KOI\'s OWN named product line. The product name in the folder (e.g. "BRISTO Laptop Sleeve", "Dee bag", "MILANO", "OPPA Bag", "Hal Bag") is a KOI name, NOT another brand: KEEP it at the start of "ten" (vd "Túi MILANO da bò …").' : ''}
${u.don ? `Order row: "${u.don.ten}"${u.don.stock ? ' [Đơn Stock]' : ''}${u.don.maDa ? `, mã da: ${u.don.maDa}` : ''}.` : 'No order row.'}
${bill.length ? `${bill.length} bill/reference photos B1..B${bill.length} come first, then product photos.` : 'No bill photos.'}`,
  }];
  for (const [i, f] of bill.entries()) {
    content.push({ type: 'text', text: `B${i + 1}` });
    content.push({ type: 'image_url', image_url: { url: await dataUrl(f, 1100) } });
  }
  for (const [i, f] of mau.entries()) {
    content.push({ type: 'text', text: `P${i + 1}` });
    content.push({ type: 'image_url', image_url: { url: await dataUrl(f, 512) } });
  }
  const kq = await goiModel(content);
  // Soát chữ bằng mã; phạm thì bảo model viết lại, tối đa 3 lượt. Vẫn phạm thì
  // KHÔNG đăng tự động (conPham) — thà thiếu một listing còn hơn đăng chữ "mắc óe".
  let pham = kq?.loai === 'san-pham' ? soatChu(kq) : [];
  kq.soatLai = [];
  for (let lan = 0; pham.length && lan < 3; lan++) {
    kq.soatLai.push(...pham);
    const sua = await goiModel([{ type: 'text', text: `Rewrite these Vietnamese catalog fields for KOI Leather. Keep every fact, keep the same length and HTML <p> structure, change only the wording. Remove these words/claims completely (do not replace them with synonyms of the same hype): ${pham.join(', ')}. Do not include internal color codes like "Y45". metaTitle must not contain "|" or a brand suffix. Reply JSON only: {"ten":…,"moTa":…,"metaTitle":…,"metaDescription":…}

${JSON.stringify({ ten: kq.ten, moTa: kq.moTa, metaTitle: kq.metaTitle, metaDescription: kq.metaDescription })}` }]);
    Object.assign(kq, sua || {});
    pham = soatChu(kq);
  }
  kq.conPham = pham;
  return { kq, mau };
}

/** Giá: doanh thu ÷ số món; đơn Stock, lô ≥ 6 món, không rõ số món → không giá. */
function tinhGia(u, kq) {
  const dt = u.don?.doanhThu;
  if (!dt || dt < 50_000 || u.don?.stock) return null;
  const n = Number(kq.soMon);
  if (!Number.isInteger(n) || n < 1 || n > 5) return null;
  return Math.round(dt / n / 10_000) * 10_000;
}

async function goiApi(duong, init = {}) {
  // 429 = bộ chặn tần suất của API (ThrottlerException). Đợt đăng bù 28/09 dồn
  // yêu cầu (phân tích đã có sẵn nên không còn nhịp chờ model) và dính 429 hàng
  // loạt → chờ rồi gửi lại, không coi là lỗi.
  for (let lan = 1; ; lan++) {
    const r = await fetch(API + duong, { ...init, headers: { Authorization: `Bearer ${TOKEN_GHI}`, ...(init.headers || {}) }, signal: AbortSignal.timeout(120_000) });
    const t = await r.text();
    if (r.status === 429 && lan <= 8) { await new Promise((res) => setTimeout(res, 15_000 * lan)); continue; }
    if (!r.ok) throw new Error(`${init.method || 'GET'} ${duong} → ${r.status} ${t.slice(0, 200)}`);
    return t ? JSON.parse(t) : null;
  }
}

async function dang(u, pt) {
  const kq = pt.kq;
  if (kq.conPham?.length) throw new Error(`chữ còn phạm sau 3 lượt sửa: ${kq.conPham.join(', ')} — không đăng`);
  const dmChinh = dmTheoSlug.get(kq.danhMucChinh);
  if (!dmChinh) throw new Error(`danh mục lạ: ${kq.danhMucChinh}`);
  const dmIds = [...new Set([kq.danhMucChinh, ...(kq.danhMucPhu || [])])].map((s) => dmTheoSlug.get(s)?.id).filter(Boolean);
  const daIds = (kq.loaiDa || []).map((c) => daTheoCode.get(c)?.id).filter(Boolean).slice(0, 2);
  const mau = (kq.mau || []).filter((m) => MAU.includes(m)).slice(0, 2);
  const nhan = (kq.anh || []).map((a) => Number(String(a).replace(/\D/g, ''))).filter((n) => n >= 1 && n <= pt.mau.length);
  const anh = [...new Set(nhan)].slice(0, 10);
  if (!anh.length) throw new Error('model không chọn ảnh nào');
  const gia = tinhGia(u, kq);

  // CHẠY TIẾP / CHỐNG TRÙNG: (1) sổ đã có id cho thư mục này mà chưa "xong" →
  // dùng lại sản phẩm đó; (2) lượt trước đứt mạng đúng lúc tạo (máy chủ có thể đã
  // tạo mà mình không nhận được trả lời) → tra DB theo đúng tên vừa tạo trong ngày.
  const soCu = fs.existsSync(SO_DANG) ? fs.readFileSync(SO_DANG, 'utf8').split(String.fromCharCode(10)).filter((d) => d.trim()).map((d) => JSON.parse(d)) : [];
  let id = soCu.find((d) => d.khoa === u.khoa && d.trangThai === 'tao')?.id;
  let slug = soCu.find((d) => d.khoa === u.khoa && d.trangThai === 'tao')?.slug;
  if (!id) {
    const trung = await prisma.$queryRawUnsafe(
      `SELECT id, slug FROM koi_free_style.koi_products WHERE name::jsonb->>'vi' = $1 AND "createdAt" > now() - interval '1 day' AND NOT "isDeleted" LIMIT 1`,
      kq.ten.slice(0, 120),
    ).catch(() => []);
    if (trung[0]) ({ id, slug } = trung[0]);
  }
  if (!id) {
    const sp = await goiApi('/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: { vi: kq.ten.slice(0, 120), ...(kq.tenEn ? { en: kq.tenEn.slice(0, 120) } : {}) },
      productType: LOAI_SP.includes(kq.loaiSP) ? kq.loaiSP : 'ACCESSORY',
      categoryId: dmChinh.id,
      categoryIds: dmIds,
      // Gửi dạng KHỐI (không gửi description thô): server tự in HTML từ khối, và
      // màn admin mở lại đúng những khối này — hai nơi không bao giờ lệch nhau
      // (vụ vali Togo: description và descriptionBlocks lệch, bấm Lưu là mất mô tả).
      descriptionBlocks: String(kq.moTa || '').split(/<\/p>/i).map((x) => x.replace(/<p[^>]*>/i, '').trim()).filter(Boolean).map((html) => ({ type: 'paragraph', html })),
      basePrice: gia,
      status: 'ACTIVE',
      metaTitle: kq.metaTitle?.slice(0, 70),
      metaDescription: kq.metaDescription?.slice(0, 170),
      ...(daIds.length ? { materialCategoryIds: daIds } : {}),
      ...(mau.length ? { colors: mau.map((m) => ({ colorFamily: m })) } : {}),
    }),
  });
    id = sp.id || sp.data?.id;
    slug = sp.slug || sp.data?.slug;
  }
  // Ghi sổ NGAY khi có id — tải ảnh hỏng giữa chừng vẫn gỡ được / chạy tiếp được.
  if (!soCu.some((d) => d.id === id && d.trangThai === 'tao')) {
    fs.appendFileSync(SO_DANG, JSON.stringify({ khoa: u.khoa, id, slug, ten: kq.ten, gia, luc: new Date().toISOString(), trangThai: 'tao' }) + '\n');
  }
  const demAnh = async () =>
    (await prisma.$queryRawUnsafe(`SELECT count(*)::int n FROM koi_free_style.koi_product_images WHERE "productId" = $1`, id))[0].n;
  const daCo = await demAnh();

  for (const [k, n] of anh.entries()) {
    if (k < daCo) continue; // đã tải ở lượt trước
    const f = pt.mau[n - 1];
    const buf = await sharp(f, { failOn: 'none' }).rotate().resize(2000, 2000, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer();
    const form = new FormData();
    form.append('file', new Blob([buf], { type: 'image/jpeg' }), path.basename(f));
    form.append('imageType', ['STUDIO', 'LIFESTYLE', 'CRAFTING', 'STAMPING'].includes(kq.loaiAnh?.[k]) ? kq.loaiAnh[k] : 'STUDIO');
    // Tấm đầu = ảnh chính: vừa isPrimary vừa displayOrder 0 (API tự tăng thứ tự
    // theo lượt tải), để thẻ sản phẩm và trang chi tiết cùng một ảnh.
    form.append('isPrimary', k === 0 ? 'true' : 'false');
    for (let lan = 1; ; lan++) {
      const truoc = await demAnh();
      try { await goiApi(`/products/${id}/images/upload`, { method: 'POST', body: form }); break; }
      catch (e) {
        // Đứt mạng mà máy chủ vẫn nhận ảnh → đếm lại, có rồi thì thôi, khỏi tải trùng.
        if ((await demAnh()) > truoc) break;
        if (lan >= 3 || /→ 4\d\d/.test(String(e.message))) throw e;
        await new Promise((r) => setTimeout(r, 4000 * lan));
      }
    }
  }
  fs.appendFileSync(SO_DANG, JSON.stringify({ khoa: u.khoa, id, slug, soAnh: anh.length, luc: new Date().toISOString(), trangThai: 'xong' }) + '\n');
  return { id, slug, gia, soAnh: anh.length };
}

// ---------- gỡ ----------
if (co('--go')) {
  const ds = !fs.existsSync(SO_DANG) ? [] : fs.readFileSync(SO_DANG, 'utf8').split('\n').filter((d) => d.trim()).map((d) => JSON.parse(d));
  const muc = giaTri('--go', '');
  const theoId = new Map(ds.filter((d) => d.trangThai === 'tao').map((d) => [d.id, d]));
  const can = [...theoId.values()].filter((d) => muc === 'TAT-CA' || muc.split(',').includes(d.slug));
  for (const d of can) {
    try { await goiApi(`/products/${d.id}`, { method: 'DELETE' }); console.log('đã gỡ', d.slug); }
    catch (e) { console.log('LỖI gỡ', d.slug, e.message); }
  }
  await prisma.$disconnect();
  process.exit(0);
}

// ---------- chạy ----------
if (co('--phan-tich') || co('--chay')) {
  const pt = docJson(TEP_PT);
  const dv = docJson(TEP_DV);
  const daDang = new Set(fs.existsSync(SO_DANG) ? fs.readFileSync(SO_DANG, 'utf8').split('\n').filter((d) => d.trim()).map((d) => JSON.parse(d)).filter((d) => d.trangThai === 'xong').map((d) => d.khoa) : []); // chỉ bỏ qua cái đã XONG — cái tạo dở thì chạy tiếp
  const viec = ungVien.filter((u) => !daDang.has(u.khoa)).slice(0, Number(giaTri('--gioi-han', '0')) || undefined);
  console.log(`Ứng viên ${ungVien.length} · cần làm ${viec.length}${co('--chay') ? ' · CHẾ ĐỘ ĐĂNG' : ' · chỉ phân tích'}`);
  let xong = 0;
  const lam = async (u) => {
    const nhanU = u.thuMuc.map((t) => t.ten).join(' + ');
    try {
      if (!pt[u.khoa]?.kq) {
        const r = await phanTich(u);
        pt[u.khoa] = { kq: r.kq, mau: r.mau, thuMuc: u.thuMuc.map((t) => t.duong), ma: u.ma };
        ghiJson(TEP_PT, pt);
      }
      const { kq } = pt[u.khoa];
      let ketQua = kq.loai;
      if (kq.loai === 'dich-vu-sua-chua') {
        dv[u.khoa] = { thuMuc: u.thuMuc.map((t) => t.duong), ma: u.ma, moTa: kq.moTaDichVu, anh: (kq.anh || []).map((a) => pt[u.khoa].mau[Number(String(a).replace(/\D/g, '')) - 1]).filter(Boolean) };
        ghiJson(TEP_DV, dv);
      } else if (kq.loai === 'san-pham' && kq.logoHangKhac?.length && !co('--dang-ca-logo')) {
        // A Khoa 27/09/2026 chốt "Đăng hết" → chạy lại với --dang-ca-logo để đăng
        // cả những món này (chữ vẫn không ghi tên hãng, chỉ ảnh có logo).
        // Món mang dấu hãng khác (chữ dập, logo, khoá đặc trưng) — KHÔNG tự đăng,
        // gom danh sách chờ A Khoa quyết (27/09/2026, ví "Constance Slim" dập
        // "Hermès Paris Made in France").
        const giu = docJson(TEP_GIU);
        giu[u.khoa] = { thuMuc: u.thuMuc.map((t) => t.duong), ten: kq.ten, logo: kq.logoHangKhac };
        ghiJson(TEP_GIU, giu);
        ketQua = `GIỮ LẠI (logo hãng khác: ${kq.logoHangKhac.join(', ')})`;
      } else if (kq.loai === 'san-pham' && co('--chay')) {
        const r = await dang(u, pt[u.khoa]);
        ketQua = `ĐĂNG ${r.slug} · ${r.soAnh} ảnh · ${r.gia ? r.gia.toLocaleString('vi-VN') + 'đ' : 'Liên hệ'}`;
      } else if (kq.loai === 'san-pham') {
        ketQua = `san-pham: ${kq.ten} · ${kq.danhMucChinh} · soMon ${kq.soMon} · giá ${tinhGia(u, kq) ?? 'Liên hệ'}`;
      }
      console.log(`[${++xong}/${viec.length}] ${nhanU} → ${ketQua}`);
    } catch (e) {
      console.log(`[${++xong}/${viec.length}] ${nhanU} → LỖI ${String(e.message || e).slice(0, 200)}`);
    }
  };
  const songSong = Number(giaTri('--song-song', '3'));
  let i = 0;
  await Promise.all(Array.from({ length: songSong }, async () => { while (i < viec.length) await lam(viec[i++]); }));
  console.log('XONG');
}

await prisma.$disconnect();
