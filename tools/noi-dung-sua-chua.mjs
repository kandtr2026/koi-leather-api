#!/usr/bin/env node
/**
 * Dựng danh sách "Những ca KOI đã sửa" cho trang /sua-chua-do-da/ từ các thư mục
 * ảnh sửa đồ của khách trong lô D:\7.2026_HEre (A Khoa 27/09/2026: "Làm thêm 1
 * trang Spa - Sửa chữa đồ da và gom all các listing sửa chữa này về").
 *
 * Đầu vào: tools/_tmp/anh-moi/dich-vu.json (anh-moi-dang.mjs gom các đơn sửa).
 * Mỗi ca: Gemini xem ảnh → tiêu đề, mô tả, việc đã làm, alt từng ảnh. Ảnh đẩy lên
 * Supabase qua POST /media/noi-dung/upload (thư mục sua-chua-do-da). Ra tệp
 * koi-storefront/src/content/ca-sua-chua.ts — trang đọc thẳng tệp này.
 *
 * Tên hãng của món đồ khách mang tới ĐƯỢC ghi (thợ sửa nói mình sửa túi Louis
 * Vuitton là chỗ hợp lệ — ghi chú viec-can-lam-data.ts của storefront). Tên KHÁCH
 * và chữ dập trên đồ thì KHÔNG bao giờ.
 *
 *   node tools/noi-dung-sua-chua.mjs          viết + tải ảnh (chạy lại được, nhớ kết quả)
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
const TOKEN_GHI = docEnv(path.join(goc, '..', 'koi-storefront', '.env.local'), 'KOI_ADMIN_WRITE_TOKEN');
const KEY_MODEL = fs.readFileSync(path.join(goc, '..', '_secrets', '9router.key'), 'utf8').trim();
const API = 'https://koi-leather-api.vercel.app';
const ROUTER = 'https://khoa.tailc2d856.ts.net/v1/chat/completions';
const MODEL = 'ag/gemini-3.8-flash-high';
const RA = path.join(goc, 'tools', '_tmp', 'anh-moi');
const TEP_KQ = path.join(RA, 'ca-sua-chua.json');
const TEP_TS = path.join(goc, '..', 'koi-storefront', 'src', 'content', 'ca-sua-chua.ts');

const dv = JSON.parse(fs.readFileSync(path.join(RA, 'dich-vu.json'), 'utf8'));
const kq = fs.existsSync(TEP_KQ) ? JSON.parse(fs.readFileSync(TEP_KQ, 'utf8')) : {};
const ghi = () => fs.writeFileSync(TEP_KQ, JSON.stringify(kq, null, 1));

// Ép nhũ tên lên tag là cá nhân hoá (trang /dau-an-rieng/), không phải sửa đồ —
// và ảnh có tên khách in rõ.
const BO = [/[\\/]Tag Da[\\/]/];

const CHU_CAM = ['tinh tế', 'tỉ mỉ', 'tinh xảo', 'cao cấp', 'đẳng cấp', 'sang trọng', 'thượng lưu', 'hoàn hảo', 'hoàn mỹ', 'tuyệt đẹp', 'tuyệt tác', 'tuyệt vời', 'đỉnh cao', 'tuyên ngôn', 'lựa chọn lý tưởng', 'nâng tầm', 'nổi bật', 'độc đáo', 'xa xỉ', 'sành điệu', 'quý phái', 'thời thượng', 'nhập khẩu', 'bền bỉ', 'như mới', 'tái sinh', 'hồi sinh', 'bạn '];
const HANG_MUC = ['tui-xach', 'vi', 'that-lung', 'tai-nghe', 'giay-dep', 'khac'];

const dataUrl = async (f) => 'data:image/jpeg;base64,' + (await sharp(f, { failOn: 'none' }).rotate().resize(1024, 1024, { fit: 'inside' }).jpeg({ quality: 80 }).toBuffer()).toString('base64');

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
        const m = String(d.choices?.[0]?.message?.content ?? '').match(/\{[\s\S]*\}/);
        if (m) return JSON.parse(m[0]);
      } else if (r.status < 500 && r.status !== 429) throw new Error(`${r.status}`);
    } catch (e) { if (lan === 4) throw e; }
    await new Promise((res) => setTimeout(res, 5000 * lan));
  }
  throw new Error('model không trả JSON');
}

const HUONG_DAN = (goiY, soAnh, sua) => `Đây là ảnh một ca SỬA / SPA đồ da của khách tại xưởng KOI Leather (TP.HCM). Ghi chú của thợ lúc nhận ảnh: "${goiY}".
Viết nội dung cho một thẻ trong mục "Những ca KOI đã sửa" trên trang dịch vụ sửa chữa đồ da. Trả DUY NHẤT JSON:
{
 "id": "slug ascii không dấu, 3–7 từ, gạch ngang (vd thay-quai-tui-louis-vuitton-keepall)",
 "hangMuc": một trong ${JSON.stringify(HANG_MUC)},
 "tieuDe": "≤ 75 ký tự, nói VIỆC ĐÃ LÀM + món đồ, vd 'Thay quai da vachetta cho túi Louis Vuitton Keepall'",
 "moTa": "2–3 câu tiếng Việt: tình trạng lúc nhận (nếu ảnh cho thấy), KOI đã làm gì, kết quả nhìn thấy trong ảnh",
 "viecDaLam": ["3–5 gạch đầu dòng ngắn, mỗi dòng một việc cụ thể"],
 "thuTuAnh": [số thứ tự ảnh 1..${soAnh}, ảnh đẹp/rõ nhất đứng đầu; bỏ ảnh mờ hoặc trùng],
 "alt": {"<số ảnh>": "alt text ≤ 110 ký tự mô tả đúng ảnh đó"}
}
LUẬT:
- ĐƯỢC ghi tên hãng của món đồ khách mang tới (Louis Vuitton, Burberry, Bally…) khi nhận ra chắc chắn từ logo/hoạ tiết. Không chắc thì không ghi.
- TUYỆT ĐỐI không ghi tên người, tên khách, chữ/tên dập trên đồ.
- Chỉ nói điều ảnh cho thấy hoặc ghi chú của thợ nói. Không bịa thời gian làm, giá, bảo hành, số năm kinh nghiệm.
- Giọng mộc, cụ thể như thợ kể lại việc. CẤM các chữ: ${CHU_CAM.map((c) => c.trim()).join(', ')}. Không xưng "bạn", không "chúng tôi".
${sua ? `- Bản trước còn phạm: ${sua}. Viết lại cho sạch.` : ''}`;

const soat = (x) => {
  const chu = [x.tieuDe, x.moTa, ...(x.viecDaLam || []), ...Object.values(x.alt || {})].join(' ').toLowerCase() + ' ';
  const pham = CHU_CAM.filter((w) => chu.includes(w));
  if (!HANG_MUC.includes(x.hangMuc)) pham.push('hangMuc lạ');
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(x.id || '')) pham.push('id không phải slug');
  return pham;
};

async function taiAnh(f) {
  const buf = await sharp(f, { failOn: 'none' }).rotate().resize(2000, 2000, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer();
  for (let lan = 1; lan <= 3; lan++) {
    try {
      const form = new FormData();
      form.append('file', new Blob([buf], { type: 'image/jpeg' }), path.basename(f));
      form.append('thuMuc', 'sua-chua-do-da');
      const r = await fetch(API + '/media/noi-dung/upload', { method: 'POST', headers: { Authorization: `Bearer ${TOKEN_GHI}` }, body: form, signal: AbortSignal.timeout(120_000) });
      const t = await r.text();
      if (!r.ok) throw new Error(`${r.status} ${t.slice(0, 160)}`);
      return JSON.parse(t);
    } catch (e) { if (lan === 3) throw e; await new Promise((res) => setTimeout(res, 4000 * lan)); }
  }
}

for (const [khoa, v] of Object.entries(dv)) {
  if (BO.some((re) => v.thuMuc.some((t) => re.test(t)))) continue;
  const ten = path.basename(v.thuMuc[0]);
  const ngay = ten.match(/^(\d{2})(\d{2})\d{2}_/);
  if (!kq[khoa]?.noiDung) {
    const anh = v.anh.slice(0, 8);
    let x = null, sua = '';
    for (let lan = 1; lan <= 3; lan++) {
      const content = [{ type: 'text', text: HUONG_DAN(v.moTa || '', anh.length, sua) }];
      for (const [i, f] of anh.entries()) {
        content.push({ type: 'text', text: `Ảnh ${i + 1}:` });
        content.push({ type: 'image_url', image_url: { url: await dataUrl(f) } });
      }
      x = await goiModel(content);
      const pham = soat(x);
      if (!pham.length) break;
      sua = pham.join(', ');
      if (lan === 3) { console.log(`BỎ ${ten}: còn phạm ${sua}`); x = null; }
    }
    if (!x) continue;
    kq[khoa] = { noiDung: x, anhGoc: anh, ngay: ngay ? `${ngay[2]}/20${ngay[1]}` : null, thuMuc: ten };
    ghi();
  }
  const c = kq[khoa];
  const thuTu = [...new Set((c.noiDung.thuTuAnh || []).map(Number).filter((n) => n >= 1 && n <= c.anhGoc.length))];
  const chon = (thuTu.length ? thuTu : c.anhGoc.map((_, i) => i + 1)).slice(0, 6);
  c.anhWeb = c.anhWeb || {};
  for (const n of chon) {
    if (c.anhWeb[n]) continue;
    c.anhWeb[n] = await taiAnh(c.anhGoc[n - 1]);
    ghi();
  }
  c.chon = chon;
  ghi();
  console.log(`✓ ${ten} → ${c.noiDung.tieuDe} · ${chon.length} ảnh`);
}

// ---------- ghi tệp nội dung cho storefront ----------
const ca = Object.values(kq).filter((c) => c.noiDung && c.chon?.length && c.chon.every((n) => c.anhWeb?.[n]))
  // Mới nhất lên đầu (thư mục đặt tên YYMMDD_…).
  .sort((a, b) => b.thuMuc.localeCompare(a.thuMuc));
const idDaDung = new Set();
const ra = ca.map((c) => {
  let id = c.noiDung.id;
  for (let k = 2; idDaDung.has(id); k++) id = `${c.noiDung.id}-${k}`;
  idDaDung.add(id);
  return {
    id,
    hangMuc: c.noiDung.hangMuc,
    tieuDe: c.noiDung.tieuDe,
    moTa: c.noiDung.moTa,
    viecDaLam: c.noiDung.viecDaLam || [],
    thang: c.ngay,
    anh: c.chon.map((n) => ({ url: c.anhWeb[n].url, w: c.anhWeb[n].width, h: c.anhWeb[n].height, alt: String(c.noiDung.alt?.[n] || c.noiDung.alt?.[String(n)] || c.noiDung.tieuDe).slice(0, 140) })),
  };
});
const ts = `/**
 * Những ca sửa / spa đồ da KOI đã làm — trang /sua-chua-do-da/ đọc tệp này.
 *
 * SINH TỰ ĐỘNG bởi koi-leather-api/tools/noi-dung-sua-chua.mjs từ ảnh thư mục
 * D:\\7.2026_HEre (Gemini viết chữ theo ảnh, ảnh nằm ở Supabase bucket products,
 * khoá noi-dung/sua-chua-do-da/…). Sửa tay được; chạy lại tool thì tệp bị ghi đè.
 *
 * Tên hãng của món đồ khách mang tới được ghi (thợ sửa nói mình sửa túi Louis
 * Vuitton là hợp lệ). Tên khách, chữ dập trên đồ: không bao giờ.
 */
export type HangMucSuaChua = ${HANG_MUC.map((h) => `'${h}'`).join(' | ')};

export type CaSuaChua = {
  /** Neo #id trên trang. */
  id: string;
  hangMuc: HangMucSuaChua;
  tieuDe: string;
  moTa: string;
  viecDaLam: string[];
  /** Tháng nhận ảnh, dạng MM/YYYY. */
  thang: string | null;
  /** Ảnh gốc Supabase (≤1600px) — loader next/image tự chèn /w{N}/. */
  anh: { url: string; w: number; h: number; alt: string }[];
};

export const NHAN_HANG_MUC: Record<HangMucSuaChua, string> = {
  'tui-xach': 'Túi xách',
  vi: 'Ví',
  'that-lung': 'Thắt lưng',
  'tai-nghe': 'Tai nghe',
  'giay-dep': 'Giày dép',
  khac: 'Khác',
};

export const CA_SUA_CHUA: CaSuaChua[] = ${JSON.stringify(ra, null, 2)};
`;
fs.writeFileSync(TEP_TS, ts);
console.log(`\nĐã ghi ${ra.length} ca → ${TEP_TS}`);
