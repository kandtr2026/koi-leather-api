#!/usr/bin/env node
/**
 * Viết bài blog từ các thư mục ảnh HẬU TRƯỜNG của lô D:\7.2026_HEre — những thư
 * mục không đăng thành sản phẩm được (ảnh bàn cắt, ảnh thợ làm, tép mẫu da).
 *
 * A Khoa 27/09/2026: "20 thư mục này thì cho nó vào Blog, kiu con Gemini viết.
 * Tết 2026 thì bỏ ra đi, Making Movi thì xứng đáng 1 bài blog… Các thư mục chụp
 * phụ kiện thì bỏ qua." → bỏ Tết 2026 + 5 thư mục chỉ chụp ngũ kim/phụ kiện
 * (khoá Whoop, ổ khoá số, đầu hổ, khung kim loại, lưới hạt cườm găng tay). Thư
 * mục lẻ 1–3 ảnh gom theo chủ đề để mỗi bài đủ ảnh.
 *
 * Gemini xem ảnh → trả KHỐI (h2 / đoạn / ảnh); HTML do tool tự dựng từ khối, nên
 * không có thẻ lạ hay style lọt vào. Ảnh đẩy lên Supabase qua POST
 * /media/noi-dung/upload (thư mục = slug bài). Ghi thẳng bảng public.posts (cùng
 * chỗ bài blog cũ và bài Mon viết) + gắn chuyên mục.
 *
 *   node tools/blog-anh-moi.mjs            viết + tải ảnh + in bản xem trước (không ghi DB)
 *   node tools/blog-anh-moi.mjs --ghi      đăng các bài chưa đăng
 *   node tools/blog-anh-moi.mjs --go       gỡ (is_published=false) các bài tool này đã đăng
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
const RA = path.join(goc, 'tools', '_tmp', 'anh-moi');
const TEP_KQ = path.join(RA, 'blog.json');

const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();
const argv = process.argv.slice(2);

const kiemKe = JSON.parse(fs.readFileSync(path.join(RA, 'kiem-ke.json'), 'utf8'));
const duongCua = (ten) => {
  const x = Object.values(kiemKe).find((v) => v.ten === ten);
  if (!x) throw new Error('không thấy thư mục ' + ten);
  return x.duong;
};
const laAnh = (f) => /\.(jpe?g|png)$/i.test(f) && !f.startsWith('._');
const tepAnh = (d) => {
  const r = [];
  for (const x of fs.readdirSync(d, { withFileTypes: true })) {
    const q = path.join(d, x.name);
    if (x.isFile() && laAnh(x.name)) r.push(q);
    else if (x.isDirectory()) for (const y of fs.readdirSync(q)) if (laAnh(y)) r.push(path.join(q, y));
  }
  return r.sort();
};
const rai = (a, n) => { if (a.length <= n) return a; const b = a.length / n; return Array.from({ length: n }, (_, i) => a[Math.floor(i * b)]); };

// Chuyên mục blog có sẵn (public.post_terms, taxonomy category).
const KY_THUAT = 'ky-thuat-nghe-da-thu-cong';
const KIEN_THUC = 'kien-thuc-ve-da';

const BAI = [
  {
    khoa: 'making-movi',
    thuMuc: ['260204_Making Movi_649'],
    toiDa: 20,
    chuyenMuc: KY_THUAT,
    goiY: 'Bộ ảnh xưởng KOI làm một đơn đặt SỐ LƯỢNG cho một thương hiệu: nhiều thợ cùng làm, rập giấy hồng, dây đeo da đen có dập logo thương hiệu đặt hàng. KHÔNG ghi tên thương hiệu đặt hàng (chữ dập trên dây) — gọi chung là "một thương hiệu đặt gia công". Chỉ tả món đồ theo đúng ảnh cho thấy, không đoán số lượng.',
    lienKet: ['/qua-tang-doanh-nghiep-bang-da/', '/do-da-theo-yeu-cau/', '/khac-ten-len-do-da/'],
  },
  {
    khoa: 'hau-truong-ban-cat',
    thuMuc: ['240920_Clutch_Bao da nâu đỏ', '260105_Ví Da_Ví da nâu', '250307_Túi Da_Túi da hồng', '250508_Phụ Kiện Khác_Vật da mạ vàng', '241129_Phụ Kiện Khác_Sản phẩm da bạc'],
    toiDa: 16,
    chuyenMuc: KY_THUAT,
    goiY: 'Ảnh hậu trường từ nhiều ngày ở xưởng KOI: các chi tiết của một chiếc túi nắp gập da nâu đỏ bày trên bàn cắt trước khi ráp, chồng chi tiết da đã cắt, thợ xử lý một tấm vật liệu màu hồng, chi tiết kim loại mạ vàng, đan hạt. Bài kể một món đồ da đi qua những bước nào trước khi thành hình.',
    lienKet: ['/do-da-theo-yeu-cau/', '/dich-vu-lam-tui-da-theo-yeu-cau/', '/cam-nang-loai-da/'],
  },
  {
    khoa: 'chi-tiet-hoan-thien',
    thuMuc: ['241010_Phụ Kiện Khác_Sổ tay da xanh', '251001_Cuộn Da_Cuộn da đựng đồ navy', '260527_Dap ten vi Snap', '250425_Ví Da_Ví da đen'],
    toiDa: 12,
    chuyenMuc: KY_THUAT,
    goiY: 'Những chi tiết hoàn thiện cuối cùng: thợ sơn màu lên cạnh các chữ cái bằng da, quai/khoá/góc của một chiếc cặp da navy, chữ dập nhiệt trên ví và bao thẻ. KHÔNG chép lại chữ/tên dập trên đồ (đó là tên riêng của khách).',
    lienKet: ['/dau-an-rieng/', '/khac-ten-len-do-da/', '/do-da-theo-yeu-cau/'],
  },
  {
    khoa: 'chon-mau-da',
    thuMuc: ['241028_Ví Da_Ví da nâu', '251205_Ví Da_Ví da xanh lá'],
    toiDa: 12,
    chuyenMuc: KIEN_THUC,
    goiY: 'Tép mẫu da các sắc nâu (bò, nâu đỏ, nâu socola, nâu vàng…) xếp chồng, và hai ảnh phối nhiều món cùng một màu (bộ đỏ, bộ xanh lá). Bài giúp người đặt làm chọn màu da: xem tép mẫu thật, màu thay đổi theo ánh sáng, phối cả bộ cùng tông.',
    lienKet: ['/cam-nang-loai-da/', '/do-da-theo-yeu-cau/', '/dat-lam-vi-da-theo-yeu-cau/'],
  },
];

const CHU_CAM = ['tinh tế', 'tỉ mỉ', 'tinh xảo', 'cao cấp', 'đẳng cấp', 'sang trọng', 'thượng lưu', 'hoàn hảo', 'hoàn mỹ', 'tuyệt đẹp', 'tuyệt tác', 'tuyệt vời', 'đỉnh cao', 'tuyên ngôn', 'lựa chọn lý tưởng', 'nâng tầm', 'nổi bật', 'độc đáo', 'xa xỉ', 'sành điệu', 'quý phái', 'thời thượng', 'nhập khẩu', 'bền bỉ', 'thổi hồn', 'linh hồn', 'kiệt tác', 'nghệ nhân', 'đỉnh cao'];

const dataUrl = async (f) => 'data:image/jpeg;base64,' + (await sharp(f, { failOn: 'none' }).rotate().resize(1024, 1024, { fit: 'inside' }).jpeg({ quality: 78 }).toBuffer()).toString('base64');

async function goiModel(content) {
  for (let lan = 1; lan <= 4; lan++) {
    try {
      const r = await fetch(ROUTER, {
        method: 'POST',
        headers: { Authorization: `Bearer ${KEY_MODEL}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: MODEL, messages: [{ role: 'user', content }], max_tokens: 12000, stream: false }),
        signal: AbortSignal.timeout(300_000),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok) {
        const m = String(d.choices?.[0]?.message?.content ?? '').match(/\{[\s\S]*\}/);
        if (m) return JSON.parse(m[0]);
      } else if (r.status < 500 && r.status !== 429) throw new Error(`${r.status}`);
    } catch (e) { if (lan === 4) throw e; }
    await new Promise((res) => setTimeout(res, 5000 * lan));
  }
  throw new Error('model không trả JSON');
}

const HUONG_DAN = (b, soAnh, sua) => `Viết một bài blog tiếng Việt cho website xưởng đồ da thủ công KOI Leather (TP.HCM), dựa trên ${soAnh} ảnh chụp tại xưởng đánh số bên dưới.
Bối cảnh bộ ảnh: ${b.goiY}
Trả DUY NHẤT JSON:
{
 "title": "tiêu đề 50–75 ký tự, cụ thể, có từ khoá người ta hay tìm",
 "slug": "slug ascii không dấu 4–9 từ",
 "excerpt": "1–2 câu tóm tắt ≤ 200 ký tự",
 "metaTitle": "≤ 60 ký tự, KHÔNG thêm '| KOI' hay tên thương hiệu ở cuối",
 "metaDescription": "140–160 ký tự",
 "khoi": [
   {"loai":"p","chu":"đoạn văn 2–4 câu"},
   {"loai":"h2","chu":"tiêu đề mục"},
   {"loai":"anh","so":<số ảnh>,"alt":"alt ≤ 110 ký tự tả đúng ảnh","chuThich":"chú thích ngắn ≤ 90 ký tự"}
 ]
}
YÊU CẦU:
- 600–1000 chữ. Mở bài 1–2 đoạn, rồi 3–5 mục h2. Xen ảnh vào đúng chỗ nội dung nói tới; dùng 6–${Math.min(14, soAnh)} ảnh, bỏ ảnh mờ/trùng; mỗi ảnh dùng tối đa một lần.
- Chỉ tả điều ảnh cho thấy và kiến thức nghề da phổ thông, đúng. KHÔNG bịa số liệu (số năm, số thợ, số lượng, giá, thời gian), không bịa tên khách, không chép chữ/tên dập trên đồ.
- Được chèn liên kết nội bộ trong đoạn văn bằng cú pháp [chữ neo](đường-dẫn), CHỈ dùng các đường dẫn: ${b.lienKet.join(', ')}. Dùng 1–3 liên kết, chữ neo tự nhiên.
- Giọng mộc, cụ thể như người trong xưởng kể. CẤM các chữ: ${CHU_CAM.join(', ')}. Không dùng emoji, không dùng dấu "!".
${sua ? `- Bản trước còn lỗi: ${sua}. Viết lại cho sạch.` : ''}`;

const tatCaChu = (x) => [x.title, x.excerpt, x.metaTitle, x.metaDescription, ...(x.khoi || []).map((k) => [k.chu, k.alt, k.chuThich].join(' '))].join(' ').toLowerCase();
function soat(x, b, soAnh) {
  const loi = CHU_CAM.filter((w) => tatCaChu(x).includes(w));
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(x.slug || '')) loi.push('slug sai dạng');
  if (/[|｜]|koi\s*leather\s*$/i.test(x.metaTitle || '')) loi.push('metaTitle có đuôi thương hiệu');
  const anh = (x.khoi || []).filter((k) => k.loai === 'anh').map((k) => Number(k.so));
  if (anh.length < 4) loi.push('dùng quá ít ảnh');
  if (anh.some((n) => !(n >= 1 && n <= soAnh))) loi.push('số ảnh ngoài phạm vi');
  if (new Set(anh).size !== anh.length) loi.push('một ảnh dùng hai lần');
  for (const m of tatCaChu(x).matchAll(/\]\(([^)]+)\)/g)) if (!b.lienKet.includes(m[1])) loi.push(`liên kết lạ ${m[1]}`);
  if (/!/.test(tatCaChu(x))) loi.push('có dấu "!"');
  return loi;
}

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// [chữ](/duong-dan/) → <a>; chỉ nhận đường dẫn trong danh sách của bài.
const dongChu = (s, ok) => esc(s).replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, neo, href) => (ok.includes(href) ? `<a href="${href}">${neo}</a>` : neo));

async function taiAnh(f, thuMuc) {
  const buf = await sharp(f, { failOn: 'none' }).rotate().resize(2000, 2000, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer();
  for (let lan = 1; lan <= 3; lan++) {
    try {
      const form = new FormData();
      form.append('file', new Blob([buf], { type: 'image/jpeg' }), path.basename(f));
      form.append('thuMuc', thuMuc);
      const r = await fetch(API + '/media/noi-dung/upload', { method: 'POST', headers: { Authorization: `Bearer ${TOKEN_GHI}` }, body: form, signal: AbortSignal.timeout(120_000) });
      const t = await r.text();
      if (!r.ok) throw new Error(`${r.status} ${t.slice(0, 160)}`);
      return JSON.parse(t);
    } catch (e) { if (lan === 3) throw e; await new Promise((res) => setTimeout(res, 4000 * lan)); }
  }
}

const kq = fs.existsSync(TEP_KQ) ? JSON.parse(fs.readFileSync(TEP_KQ, 'utf8')) : {};
const ghi = () => fs.writeFileSync(TEP_KQ, JSON.stringify(kq, null, 1));

if (argv.includes('--go')) {
  const ids = Object.values(kq).filter((b) => b.postId).map((b) => BigInt(b.postId));
  const n = await prisma.posts.updateMany({ where: { id: { in: ids } }, data: { is_published: false } });
  console.log(`Đã gỡ ${n.count} bài`);
  await prisma.$disconnect();
  process.exit(0);
}

// Slug không được đè route tĩnh của storefront, trang cũ hay bài khác.
const routeTinh = new Set(fs.readdirSync(path.join(goc, '..', 'koi-storefront', 'src', 'app', '(vi)')));

for (const b of BAI) {
  const anh = rai(b.thuMuc.flatMap((t) => tepAnh(duongCua(t))), b.toiDa);
  if (!kq[b.khoa]?.bai) {
    let x = null, sua = '';
    for (let lan = 1; lan <= 3; lan++) {
      const content = [{ type: 'text', text: HUONG_DAN(b, anh.length, sua) }];
      for (const [i, f] of anh.entries()) {
        content.push({ type: 'text', text: `Ảnh ${i + 1}:` });
        content.push({ type: 'image_url', image_url: { url: await dataUrl(f) } });
      }
      x = await goiModel(content);
      const loi = soat(x, b, anh.length);
      if (!loi.length) break;
      sua = loi.join('; ');
      console.log(`  ${b.khoa} lượt ${lan}: ${sua}`);
      if (lan === 3) x = null;
    }
    if (!x) { console.log(`BỎ ${b.khoa}: viết 3 lượt vẫn lỗi`); continue; }
    let slug = x.slug;
    for (let k = 2; ; k++) {
      const trung = routeTinh.has(slug) ||
        (await prisma.posts.findUnique({ where: { slug } })) ||
        (await prisma.pages.findUnique({ where: { slug } }));
      if (!trung) break;
      slug = `${x.slug}-${k}`;
    }
    x.slug = slug;
    kq[b.khoa] = { bai: x, anhGoc: anh };
    ghi();
  }
  const c = kq[b.khoa];
  c.anhWeb = c.anhWeb || {};
  for (const k of c.bai.khoi.filter((k) => k.loai === 'anh')) {
    if (c.anhWeb[k.so]) continue;
    c.anhWeb[k.so] = await taiAnh(c.anhGoc[k.so - 1], c.bai.slug);
    ghi();
  }
  // Dựng HTML: ảnh trong bài dùng bản w1200 (bản gốc 1600 để làm ảnh bìa).
  const w1200 = (u) => u.replace('/public/products/', '/public/products/w1200/');
  c.html = c.bai.khoi.map((k) => {
    if (k.loai === 'h2') return `<h2>${esc(k.chu)}</h2>`;
    if (k.loai === 'anh') {
      const a = c.anhWeb[k.so];
      const h = a.width >= 1200 ? Math.round((a.height * 1200) / a.width) : a.height;
      return `<figure><img src="${w1200(a.url)}" alt="${esc(k.alt)}" width="${Math.min(1200, a.width)}" height="${h}" loading="lazy" decoding="async" />${k.chuThich ? `<figcaption>${esc(k.chuThich)}</figcaption>` : ''}</figure>`;
    }
    return `<p>${dongChu(k.chu, b.lienKet)}</p>`;
  }).join('\n');
  c.anhBia = c.anhWeb[c.bai.khoi.find((k) => k.loai === 'anh').so].url;
  ghi();
  const soChu = c.html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  console.log(`✓ ${b.khoa} → /${c.bai.slug}/ · "${c.bai.title}" · ${Object.keys(c.anhWeb).length} ảnh · ~${soChu} chữ${c.postId ? ' · ĐÃ ĐĂNG ' + c.postId : ''}`);
}

if (argv.includes('--ghi')) {
  for (const b of BAI) {
    const c = kq[b.khoa];
    if (!c?.html || c.postId) continue;
    const term = await prisma.post_terms.findFirst({ where: { taxonomy: 'category', slug: b.chuyenMuc } });
    const id = await prisma.$transaction(async (tx) => {
      // posts.id không tự tăng (id WordPress cũ) → lấy max+1 trong cùng giao dịch.
      const [{ mx }] = await tx.$queryRawUnsafe('SELECT COALESCE(max(id), 0) + 1 AS mx FROM public.posts');
      const bai = await tx.posts.create({
        data: {
          id: BigInt(mx),
          title: c.bai.title,
          slug: c.bai.slug,
          excerpt: c.bai.excerpt,
          content: c.html,
          cover_image: c.anhBia,
          meta_title: c.bai.metaTitle,
          meta_description: c.bai.metaDescription,
          is_published: true,
          published_at: new Date(),
        },
      });
      if (term) {
        await tx.post_term_links.create({ data: { post_id: bai.id, term_id: term.id } });
        await tx.post_terms.update({ where: { id: term.id }, data: { post_count: { increment: 1 } } });
      }
      return bai.id;
    });
    c.postId = String(id);
    ghi();
    console.log(`ĐĂNG ${b.khoa} → id ${id} /${c.bai.slug}/`);
  }
}
await prisma.$disconnect();
