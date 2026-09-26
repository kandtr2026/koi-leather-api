#!/usr/bin/env node
/**
 * Dùng vision chọn lại ẢNH CHÍNH cho từng sản phẩm.
 *
 * A Khoa đặt hàng 26/09/2026 (kèm ảnh "Tấm lót bàn nâu choco" — ảnh chính là
 * một góc cận cảnh mặt da, không thấy cả tấm lót): "Có 1 số listing thì có ảnh
 * ko phù hợp… dùng vision soi 1 lượt để quyết là sẽ chọn ảnh nào để làm ảnh
 * main". Model gọi qua router riêng của A Khoa (khoa.tailc2d856.ts.net, key ở
 * ../_secrets/9router.key — KHÔNG commit).
 *
 * "ẢNH CHÍNH" Ở ĐÂU: thẻ sản phẩm lấy ảnh cờ isPrimary (không có thì tấm đầu),
 * còn trang chi tiết lấy tấm có displayOrder nhỏ nhất. Hai cái lệch nhau ở 194
 * sản phẩm (đo 26/09). Khi ghi, tool đặt CẢ HAI về cùng một tấm: isPrimary cho
 * tấm được chọn và dời nó lên đầu thứ tự, các tấm khác giữ nguyên trình tự cũ.
 *
 * HAI VÒNG, HAI MODEL:
 *   --soi        Gemini 3.8 Flash xem TẤT CẢ ảnh (tối đa 20) của từng sản phẩm,
 *                chọn tấm hợp làm ảnh chính, nói ảnh hiện tại có ổn không.
 *   --tham-dinh  Với sản phẩm vòng 1 đề nghị đổi: Gemini Pro so riêng ảnh cũ
 *                và ảnh đề nghị. Hai model cùng đồng ý mới đổi — một model đơn
 *                lẻ đổi 500 ảnh bìa là quá tay.
 *   --xem        Dựng tờ so sánh (trước → sau) ra tools/_tmp/anh-chinh/ để người
 *                xem bằng mắt.
 *   --ghi        Sao lưu thứ tự + cờ cũ vào koi_anh_chinh_backup_20260926 rồi ghi.
 *   --hoan       Trả lại đúng như cũ từ bản sao lưu.
 *
 *   node tools/chon-anh-chinh.mjs --soi [--gioi-han 20] [--slug a,b] [--song-song 3]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const goc = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dongEnv = fs
  .readFileSync(path.join(goc, '.env'), 'utf8')
  .split(/\r?\n/)
  .find((l) => l.startsWith('DATABASE_URL='));
process.env.DATABASE_URL = dongEnv.slice('DATABASE_URL='.length).replace(/^["']|["']$/g, '');
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

const argv = process.argv.slice(2);
const co = (c) => argv.includes(c);
const giaTri = (c, macDinh) => {
  const i = argv.indexOf(c);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : macDinh;
};

const THU_MUC = path.join(goc, 'tools', '_tmp', 'anh-chinh');
fs.mkdirSync(THU_MUC, { recursive: true });
const TEP_SOI = path.join(THU_MUC, 'soi.json');
const TEP_THAM_DINH = path.join(THU_MUC, 'tham-dinh.json');
const BANG_SAO_LUU = 'koi_free_style.koi_anh_chinh_backup_20260926';

const ROUTER = 'https://khoa.tailc2d856.ts.net/v1/chat/completions';
// A Khoa chốt dùng Gemini vision (26/09/2026). Model Gemini có "suy nghĩ" ăn
// vào max_tokens — để thấp là câu trả lời bị cắt cụt giữa JSON.
const MODEL_SOI = 'ag/gemini-3.8-flash-high';
const MODEL_THAM_DINH = 'ag/gemini-pro-agent';
const TRAN_ANH = 20;

const docJson = (f) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {});
const ghiJson = (f, o) => fs.writeFileSync(f, JSON.stringify(o, null, 1));
const tenCua = (v) => {
  if (!v) return '';
  try {
    const o = JSON.parse(v);
    return o.vi || o.en || v;
  } catch {
    return v;
  }
};

/** Sản phẩm đang bán + ảnh theo đúng thứ tự trang chi tiết đang hiện. */
async function laySanPham() {
  const slug = giaTri('--slug', '');
  const dong = await prisma.$queryRawUnsafe(`
    SELECT s.id, s.slug, s.name, c.name AS danh_muc,
           json_agg(json_build_object('id', i.id, 'url', i.url, 'isPrimary', i."isPrimary",
                                      'displayOrder', i."displayOrder")
                    ORDER BY i."displayOrder", i."createdAt", i.id) AS anh
    FROM koi_free_style.koi_products s
    JOIN koi_free_style.koi_product_images i ON i."productId" = s.id
    LEFT JOIN koi_free_style.koi_categories c ON c.id = s."categoryId"
    WHERE NOT s."isDeleted" AND s.status = 'ACTIVE'
      ${slug ? `AND s.slug = ANY($1::text[])` : ''}
    GROUP BY s.id, s.slug, s.name, c.name
    ORDER BY s.slug`, ...(slug ? [slug.split(',')] : []));
  return dong.map((d) => ({ ...d, ten: tenCua(d.name), danhMuc: tenCua(d.danh_muc) }));
}

/** Tải bản 800px (luôn có sẵn trong bucket products) rồi thu về JPEG 512px. */
async function taiAnh(url) {
  const nho = url.replace('/public/products/', '/public/products/w800/');
  for (const u of [nho, url]) {
    try {
      const r = await fetch(u, { signal: AbortSignal.timeout(20_000) });
      if (!r.ok) continue;
      const b = Buffer.from(await r.arrayBuffer());
      const j = await sharp(b).resize({ width: 512, height: 512, fit: 'inside' }).jpeg({ quality: 80 }).toBuffer();
      return 'data:image/jpeg;base64,' + j.toString('base64');
    } catch {
      /* thử bản gốc */
    }
  }
  return null;
}

const KEY = fs.readFileSync(path.join(goc, '..', '_secrets', '9router.key'), 'utf8').trim();

async function goiModel(model, content, maxTokens = 4000) {
  for (let lan = 1; lan <= 4; lan += 1) {
    try {
      const r = await fetch(ROUTER, {
        method: 'POST',
        headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: [{ role: 'user', content }], max_tokens: maxTokens, stream: false }),
        signal: AbortSignal.timeout(180_000),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok) {
        const t = d.choices?.[0]?.message?.content ?? '';
        const m = String(t).match(/\{[\s\S]*\}/);
        if (m) return JSON.parse(m[0]);
        throw new Error('không có JSON: ' + String(t).slice(0, 120));
      }
      if (r.status < 500 && r.status !== 429) throw new Error(`${r.status} ${JSON.stringify(d).slice(0, 160)}`);
    } catch (e) {
      if (lan === 4) throw e;
    }
    await new Promise((res) => setTimeout(res, 4000 * lan));
  }
  return null;
}

const TIEU_CHI = `You are the senior e-commerce photo editor of KOI Leather, a handmade leather atelier in Saigon (wallets, bags, belts, watch straps, desk accessories, key holders, corporate gifts). Choose the MAIN listing photo: the one shown on product cards and as the first, large photo on the product page.

A good main photo:
- shows the WHOLE product, recognizable at a glance; the product is the clear subject and fills a good part of the frame;
- is sharp, well lit, true to color; clean studio or tasteful surface (wood table is fine);
- uses a clear angle (front, 3/4, or top-down flat lay) that shows shape and color.
Do NOT pick as main (these are "problems"):
- closeup: extreme close-up / macro of texture, stitching, edge, corner or hardware only;
- cropped: product cut off so its overall shape is not visible;
- text: large burned-in text, banner, price/logo overlay; collage: multi-panel grid, infographic, size chart, before/after;
- packaging: only the gift box/bag; people: people dominate and the product is small; blurry / dark: poor quality.
Watch straps are normally shown mounted on a watch — that is fine as long as the strap is clearly visible. If colors differ between photos, prefer the color named in the product title.
Be conservative: say currentOk=false ONLY if the current main photo has one of the problems above, or another photo is clearly and substantially better. Do not swap for a marginal preference.`;

async function soiMot(sp) {
  const anh = sp.anh.slice(0, TRAN_ANH);
  const du = await Promise.all(anh.map((a) => taiAnh(a.url)));
  const iPrimary = anh.findIndex((a) => a.isPrimary);
  const content = [
    {
      type: 'text',
      text: `${TIEU_CHI}

Product title: "${sp.ten}"${sp.danhMuc ? ` (category: ${sp.danhMuc})` : ''}.
${anh.length} photos follow, labelled #1..#${anh.length}. #1 is the CURRENT main photo (first on the product page).${iPrimary > 0 ? ` #${iPrimary + 1} is currently used as the thumbnail on product cards.` : ''}${sp.anh.length > TRAN_ANH ? ` (Only the first ${TRAN_ANH} of ${sp.anh.length} photos are shown.)` : ''}
Reply with JSON only:
{"best": <photo number>, "currentOk": <bool>, "confidence": <0..1>, "problem": "<none|closeup|cropped|text|collage|packaging|people|blurry|dark|other>", "reason": "<max 25 words, in Vietnamese>"}
"problem" describes the CURRENT main photo (#1).`,
    },
  ];
  du.forEach((d, i) => {
    content.push({ type: 'text', text: `#${i + 1}${d ? '' : ' (không tải được)'}` });
    if (d) content.push({ type: 'image_url', image_url: { url: d } });
  });
  const kq = await goiModel(MODEL_SOI, content);
  const best = Math.min(Math.max(Math.trunc(Number(kq?.best) || 1), 1), anh.length);
  return {
    slug: sp.slug,
    ten: sp.ten,
    soAnh: sp.anh.length,
    hienTai: anh[0].id,
    theChinh: iPrimary >= 0 ? anh[iPrimary].id : null,
    chon: anh[best - 1].id,
    chonSo: best,
    currentOk: kq?.currentOk === true,
    doTinCay: Number(kq?.confidence) || 0,
    loi: kq?.problem || 'other',
    lyDo: kq?.reason || '',
    model: MODEL_SOI,
  };
}

async function chaySongSong(viec, soLuong, lam) {
  let i = 0;
  const cong = async () => {
    while (i < viec.length) {
      const v = viec[i++];
      await lam(v);
    }
  };
  await Promise.all(Array.from({ length: soLuong }, cong));
}

/** Sản phẩm vòng 1 đề nghị đổi (ảnh hiện tại không ổn và chọn tấm khác). */
const deNghiDoi = (r) => r && !r.loiGoi && !r.currentOk && r.chon !== r.hienTai;

if (co('--soi')) {
  const soi = docJson(TEP_SOI);
  const tatCa = (await laySanPham()).filter((s) => s.anh.length >= 2);
  const gioiHan = Number(giaTri('--gioi-han', '0')) || tatCa.length;
  // Bỏ qua sản phẩm đã soi mà bộ ảnh không đổi — chạy lại được sau khi đứt.
  const vanTay = (s) => s.anh.map((a) => a.id).join(',');
  const canSoi = tatCa.filter((s) => soi[s.id]?.vanTay !== vanTay(s)).slice(0, gioiHan);
  console.log(`${tatCa.length} sản phẩm có ≥2 ảnh · cần soi ${canSoi.length}`);
  let xong = 0;
  await chaySongSong(canSoi, Number(giaTri('--song-song', '3')), async (sp) => {
    try {
      soi[sp.id] = { ...(await soiMot(sp)), vanTay: vanTay(sp) };
    } catch (e) {
      soi[sp.id] = { slug: sp.slug, loiGoi: String(e.message || e).slice(0, 200) };
    }
    xong += 1;
    const r = soi[sp.id];
    if (xong % 10 === 0 || deNghiDoi(r)) ghiJson(TEP_SOI, soi);
    console.log(`[${xong}/${canSoi.length}] ${sp.slug} → ${r.loiGoi ? 'LỖI ' + r.loiGoi : r.currentOk ? 'giữ' : `đổi #1→#${r.chonSo} (${r.loi}, ${r.doTinCay})`}`);
  });
  ghiJson(TEP_SOI, soi);
  const ds = Object.values(soi);
  console.log(`\nXong. Giữ: ${ds.filter((r) => r.currentOk).length} · đề nghị đổi: ${ds.filter(deNghiDoi).length} · lỗi gọi: ${ds.filter((r) => r.loiGoi).length}`);
}

/** Vòng 2: model khác so riêng ảnh cũ (A) với ảnh đề nghị (B). */
async function thamDinhMot(r, urlCu, urlMoi) {
  const [a, b] = await Promise.all([taiAnh(urlCu), taiAnh(urlMoi)]);
  const kq = await goiModel(
    MODEL_THAM_DINH,
    [
      {
        type: 'text',
        text: `${TIEU_CHI}

Product title: "${r.ten}". Photo A is the CURRENT main photo; photo B is a proposed replacement.
Agree to the swap ONLY if A has one of the problems above (or B is clearly and substantially better as a main listing photo) AND B itself has none of the problems.
Reply with JSON only: {"agree": <bool>, "confidence": <0..1>, "reason": "<max 25 words, in Vietnamese>"}`,
      },
      { type: 'text', text: 'Photo A (current):' },
      { type: 'image_url', image_url: { url: a } },
      { type: 'text', text: 'Photo B (proposed):' },
      { type: 'image_url', image_url: { url: b } },
    ],
    3000,
  );
  return { chon: r.chon, dongY: kq?.agree === true, doTinCay: Number(kq?.confidence) || 0, lyDo: kq?.reason || '', model: MODEL_THAM_DINH };
}

/**
 * Ghi MỘT sản phẩm: tấm `chon` lên đầu thứ tự + cờ isPrimary, các tấm khác giữ
 * nguyên trình tự cũ. Sao lưu thứ tự + cờ cũ của từng tấm trước (ON CONFLICT
 * DO NOTHING: chạy lại không đè bản GỐC). Đã đúng sẵn thì không đụng gì.
 * Trả true nếu có ghi.
 */
async function ghiMot(sp, chon) {
  const dungSan = sp.anh[0].id === chon && sp.anh.every((a) => a.isPrimary === (a.id === chon));
  if (dungSan) return false;
  // Hai câu gộp (sao lưu cả sản phẩm, rồi đổi thứ tự bằng unnest) thay vì mỗi
  // ảnh hai câu: sản phẩm 20 ảnh mà gọi 40 câu qua pooler thì quá 5 giây mặc
  // định của giao dịch Prisma và cả giao dịch bị huỷ.
  const thuTu = [sp.anh.find((a) => a.id === chon), ...sp.anh.filter((a) => a.id !== chon)];
  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS ${BANG_SAO_LUU} (
        image_id text PRIMARY KEY, product_id text NOT NULL, display_order integer NOT NULL,
        is_primary boolean NOT NULL, luc timestamptz NOT NULL DEFAULT now())`);
      await tx.$executeRawUnsafe(
        `INSERT INTO ${BANG_SAO_LUU} (image_id, product_id, display_order, is_primary)
         SELECT id, "productId", "displayOrder", "isPrimary"
         FROM koi_free_style.koi_product_images WHERE "productId" = $1
         ON CONFLICT (image_id) DO NOTHING`,
        sp.id,
      );
      const n = await tx.$executeRawUnsafe(
        `UPDATE koi_free_style.koi_product_images i
         SET "displayOrder" = m.thu_tu, "isPrimary" = (m.id = $3), "updatedAt" = now()
         FROM unnest($1::text[], $2::int[]) AS m(id, thu_tu)
         WHERE i.id = m.id AND i."productId" = $4`,
        thuTu.map((a) => a.id),
        thuTu.map((_, k) => k),
        chon,
        sp.id,
      );
      if (n !== thuTu.length) throw new Error(`đổi được ${n}/${thuTu.length} ảnh — huỷ, không ghi gì`);
    },
    { timeout: 30_000 },
  );
  return true;
}

/**
 * CUỐN CHIẾU (A Khoa 26/09: "cái nào làm tới đâu thì chốt tới đó, edit luôn
 * tại chỗ"): mỗi sản phẩm soi → thẩm định nếu đề nghị đổi → ghi NGAY. Kết quả
 * soi/thẩm định đã có trong tệp thì dùng lại, không gọi model lần hai.
 * Mỗi sản phẩm một dòng vào da-chot.jsonl để tổng kết.
 */
if (co('--chay')) {
  const soi = docJson(TEP_SOI);
  const td = docJson(TEP_THAM_DINH);
  const vanTay = (s) => s.anh.map((a) => a.id).join(',');
  const soChot = path.join(THU_MUC, 'da-chot.jsonl');
  // Chạy tiếp sau khi đứt: bỏ qua sản phẩm đã chốt (có dòng trong sổ). Sản phẩm
  // đã đổi ảnh thì thứ tự mới làm "vân tay" khác đi — không bỏ qua ở đây là soi
  // lại tốn một lượt model cho kết quả đã biết.
  const daChot = new Set(
    fs.existsSync(soChot)
      ? fs.readFileSync(soChot, 'utf8').split(String.fromCharCode(10)).filter((d) => d.trim()).map((d) => JSON.parse(d).id)
      : [],
  );
  const tatCa = (await laySanPham()).filter((s) => co('--lam-lai') || !daChot.has(s.id));
  const gioiHan = Number(giaTri('--gioi-han', '0')) || tatCa.length;
  const viec = tatCa.slice(0, gioiHan);
  let xong = 0, doi = 0, dongBo = 0, loi = 0;
  console.log(`Chạy cuốn chiếu ${viec.length} sản phẩm`);
  await chaySongSong(viec, Number(giaTri('--song-song', '4')), async (sp) => {
    let ketLuan = 'giu';
    let chon = sp.anh[0].id;
    let ghiChu = '';
    try {
      if (sp.anh.length >= 2) {
        if (soi[sp.id]?.vanTay !== vanTay(sp)) {
          soi[sp.id] = { ...(await soiMot(sp)), vanTay: vanTay(sp) };
        }
        const r = soi[sp.id];
        if (deNghiDoi(r) && r.doTinCay >= 0.7) {
          if (td[sp.id]?.chon !== r.chon || td[sp.id]?.loiGoi) {
            td[sp.id] = await thamDinhMot(r, sp.anh[0].url, sp.anh.find((a) => a.id === r.chon).url);
          }
          const t = td[sp.id];
          if (t.dongY && t.doTinCay >= 0.7) {
            chon = r.chon;
            ketLuan = 'doi';
            ghiChu = `#1→#${r.chonSo} [${r.loi}] ${r.lyDo}`;
          } else {
            ketLuan = 'giu-pro-bac';
            ghiChu = `Pro bác: ${t.lyDo}`;
          }
        }
      }
      const coGhi = await ghiMot(sp, chon);
      if (ketLuan === 'doi') doi += 1;
      else if (coGhi) dongBo += 1;
      fs.appendFileSync(soChot, JSON.stringify({ id: sp.id, slug: sp.slug, ketLuan, coGhi, chon, cu: sp.anh[0].id, ghiChu, luc: new Date().toISOString() }) + '\n');
      console.log(`[${++xong}/${viec.length}] ${sp.slug} → ${ketLuan}${coGhi ? ' ✎' : ''} ${ghiChu}`);
    } catch (e) {
      loi += 1;
      console.log(`[${++xong}/${viec.length}] ${sp.slug} → LỖI ${String(e.message || e).slice(0, 160)}`);
    }
    if (xong % 5 === 0) {
      ghiJson(TEP_SOI, soi);
      ghiJson(TEP_THAM_DINH, td);
    }
  });
  ghiJson(TEP_SOI, soi);
  ghiJson(TEP_THAM_DINH, td);
  console.log(`\nXONG: đổi ảnh chính ${doi} · đồng bộ cờ ảnh chính ${dongBo} · lỗi ${loi}`);
}

if (co('--tham-dinh')) {
  const soi = docJson(TEP_SOI);
  const td = docJson(TEP_THAM_DINH);
  const anhTheoId = new Map();
  for (const sp of await laySanPham()) for (const a of sp.anh) anhTheoId.set(a.id, a.url);
  const viec = Object.entries(soi).filter(([id, r]) => deNghiDoi(r) && td[id]?.chon !== r.chon);
  console.log(`Thẩm định ${viec.length} đề nghị đổi bằng ${MODEL_THAM_DINH}`);
  let xong = 0;
  await chaySongSong(viec, Number(giaTri('--song-song', '3')), async ([id, r]) => {
    try {
      const [a, b] = await Promise.all([taiAnh(anhTheoId.get(r.hienTai)), taiAnh(anhTheoId.get(r.chon))]);
      const kq = await goiModel(
        MODEL_THAM_DINH,
        [
          {
            type: 'text',
            text: `${TIEU_CHI}

Product title: "${r.ten}". Photo A is the CURRENT main photo; photo B is a proposed replacement.
Agree to the swap ONLY if A has one of the problems above (or B is clearly and substantially better as a main listing photo) AND B itself has none of the problems.
Reply with JSON only: {"agree": <bool>, "confidence": <0..1>, "reason": "<max 25 words, in Vietnamese>"}`,
          },
          { type: 'text', text: 'Photo A (current):' },
          { type: 'image_url', image_url: { url: a } },
          { type: 'text', text: 'Photo B (proposed):' },
          { type: 'image_url', image_url: { url: b } },
        ],
        3000,
      );
      td[id] = { chon: r.chon, dongY: kq?.agree === true, doTinCay: Number(kq?.confidence) || 0, lyDo: kq?.reason || '', model: MODEL_THAM_DINH };
    } catch (e) {
      td[id] = { chon: r.chon, loiGoi: String(e.message || e).slice(0, 200) };
    }
    xong += 1;
    if (xong % 10 === 0) ghiJson(TEP_THAM_DINH, td);
    console.log(`[${xong}/${viec.length}] ${r.slug} → ${td[id].loiGoi ? 'LỖI' : td[id].dongY ? 'ĐỒNG Ý' : 'không'} ${td[id].doTinCay ?? ''}`);
  });
  ghiJson(TEP_THAM_DINH, td);
}

/** Danh sách sẽ đổi: hai model cùng đồng ý, đủ tin cậy. */
function dsSeDoi() {
  const soi = docJson(TEP_SOI);
  const td = docJson(TEP_THAM_DINH);
  return Object.entries(soi)
    .filter(([id, r]) => deNghiDoi(r) && r.doTinCay >= 0.7 && td[id]?.chon === r.chon && td[id]?.dongY && td[id].doTinCay >= 0.7)
    .map(([id, r]) => ({ id, ...r, thamDinh: td[id] }));
}

if (co('--xem')) {
  const doi = dsSeDoi();
  const anhTheoId = new Map();
  for (const sp of await laySanPham()) for (const a of sp.anh) anhTheoId.set(a.id, a.url);
  const o = (u, w, h) => sharp(Buffer.from(u.split(',')[1], 'base64')).resize(w, h, { fit: 'contain', background: '#fff' }).png().toBuffer();
  const W = 260, H = 190, MOI_TO = 12;
  for (let t = 0; t * MOI_TO < doi.length; t += 1) {
    const lo = doi.slice(t * MOI_TO, (t + 1) * MOI_TO);
    const tiles = [];
    for (const [k, r] of lo.entries()) {
      const [a, b] = await Promise.all([taiAnh(anhTheoId.get(r.hienTai)), taiAnh(anhTheoId.get(r.chon))]);
      const y = k * (H + 34);
      const nhan = `<svg width="${2 * W + 20}" height="30"><text x="4" y="20" font-size="15" font-family="Arial" fill="#111">${(k + 1 + t * MOI_TO) + '. ' + r.slug.slice(0, 60).replace(/&/g, '&amp;')}  [${r.loi}]</text></svg>`;
      tiles.push({ input: Buffer.from(nhan), left: 0, top: y });
      if (a) tiles.push({ input: await o(a, W, H), left: 0, top: y + 30 });
      if (b) tiles.push({ input: await o(b, W, H), left: W + 20, top: y + 30 });
    }
    const f = path.join(THU_MUC, `so-sanh-${String(t + 1).padStart(2, '0')}.png`);
    await sharp({ create: { width: 2 * W + 20, height: lo.length * (H + 34), channels: 3, background: '#eee' } }).composite(tiles).png().toFile(f);
    console.log(f);
  }
  ghiJson(path.join(THU_MUC, 'se-doi.json'), doi);
  console.log(`${doi.length} sản phẩm sẽ đổi ảnh chính — trái: ảnh hiện tại, phải: ảnh chọn.`);
}

if (co('--ghi')) {
  const doi = dsSeDoi();
  const soi = docJson(TEP_SOI);
  const sp = await laySanPham();
  const moi = new Map(doi.map((r) => [r.id, r.chon]));
  // Sản phẩm GIỮ ảnh hiện tại nhưng cờ isPrimary lệch / thiếu: đồng bộ cờ về
  // đúng tấm đang đứng đầu, để thẻ và trang chi tiết cùng một ảnh.
  for (const s of sp) {
    if (moi.has(s.id)) continue;
    const dau = s.anh[0];
    const lech = s.anh.some((a) => a.isPrimary !== (a.id === dau.id));
    if (lech && (s.anh.length === 1 || soi[s.id]?.currentOk)) moi.set(s.id, dau.id);
  }
  console.log(`Đổi ảnh chính: ${doi.length} · đồng bộ cờ ảnh chính: ${moi.size - doi.length}`);
  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS ${BANG_SAO_LUU} (
        image_id text PRIMARY KEY, product_id text NOT NULL, display_order integer NOT NULL,
        is_primary boolean NOT NULL, luc timestamptz NOT NULL DEFAULT now())`);
      for (const s of sp) {
        const chon = moi.get(s.id);
        if (!chon) continue;
        for (const a of s.anh) {
          await tx.$executeRawUnsafe(
            `INSERT INTO ${BANG_SAO_LUU} (image_id, product_id, display_order, is_primary) VALUES ($1,$2,$3,$4) ON CONFLICT (image_id) DO NOTHING`,
            a.id, s.id, a.displayOrder, a.isPrimary,
          );
        }
        const thuTu = [s.anh.find((a) => a.id === chon), ...s.anh.filter((a) => a.id !== chon)];
        for (const [k, a] of thuTu.entries()) {
          await tx.$executeRawUnsafe(
            `UPDATE koi_free_style.koi_product_images SET "displayOrder" = $1, "isPrimary" = $2, "updatedAt" = now() WHERE id = $3 AND "productId" = $4`,
            k, a.id === chon, a.id, s.id,
          );
        }
      }
    },
    { timeout: 600_000 },
  );
  console.log('ĐÃ GHI. Sao lưu ở', BANG_SAO_LUU);
}

if (co('--hoan')) {
  const n = await prisma.$executeRawUnsafe(`
    UPDATE koi_free_style.koi_product_images i
    SET "displayOrder" = b.display_order, "isPrimary" = b.is_primary, "updatedAt" = now()
    FROM ${BANG_SAO_LUU} b WHERE i.id = b.image_id`);
  console.log(`Đã trả ${n} ảnh về thứ tự + cờ cũ.`);
}

await prisma.$disconnect();
