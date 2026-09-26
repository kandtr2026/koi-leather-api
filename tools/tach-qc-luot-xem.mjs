#!/usr/bin/env node
/**
 * Quy lại NGUỒN của những lượt xem / cú bấm liên hệ cũ đến từ quảng cáo Google.
 *
 * VÌ SAO (tìm ra 26/09/2026, lúc dựng biểu đồ "Khách đến từ đâu"): storefront
 * gửi đường dẫn KHÔNG kèm query — lượt xem dùng usePathname(), cú bấm Zalo/Gọi
 * dùng location.pathname — nên máy chủ không lần nào thấy `?gclid=` và không
 * lần nào xếp được khách vào Google Ads. Hai bảng koi_page_views và
 * koi_contact_clicks ghi Google Ads = 0 từ ngày đầu; lượt quảng cáo thật nằm
 * lẫn trong "Google tự nhiên" (hoặc mã cũ "google", hoặc "Gõ thẳng"). Bộ đo đã
 * sửa ở koi-storefront/src/lib/dau-quang-cao.ts; tool này sửa phần ĐÃ GHI.
 *
 * CÁCH NHẬN RA — cùng định nghĩa "lần vào" với dau-quang-cao.ts để số cũ và số
 * mới đo một kiểu:
 *   1. Mỗi cú bấm quảng cáo đã được ghi riêng ở koi_ad_clicks (lúc khách vừa
 *      đáp xuống, kèm trang đáp). Lượt xem GẦN NHẤT cùng đường dẫn, lệch không
 *      quá 20 giây là lượt đáp. Đo 26/09: 96% cú bấm khớp được.
 *   2. Đi tiếp chuỗi trang cùng khách, cùng ngày, mỗi bước cách nhau ≤ 30 phút
 *      (luật cắt phiên của hanh-vi.ts) mà vẫn mang nguồn lúc vào — vì
 *      document.referrer không đổi khi điều hướng nội bộ. Gặp nguồn ngoài KHÁC
 *      (khách mở lại từ Facebook…) là dừng.
 *   3. Cú bấm Zalo/Gọi: lượt xem gần nhất TRƯỚC nó (cùng khách, cùng ngày, trong
 *      30 phút) là quảng cáo thì cú bấm đó cũng là của khách quảng cáo.
 *   4. Mã cũ "google" (trước 16/08, hồi chưa tách Ads) còn lại quy về
 *      "google_organic" — đúng cách nguon() xếp referrer Google không có gclid.
 *
 * CHẠY LẠI KHÔNG ĐỔI GÌ THÊM. Lượt đáp đã là google_ads thì tính là đã khớp và
 * bỏ qua — KHÔNG lùi sang ứng viên kế tiếp, vì ứng viên kế tiếp trong 20 giây
 * cùng trang thường là một khách KHÁC, bắt nhầm là kéo cả chuỗi của người đó
 * sang quảng cáo. Nên chạy lại sau khi bản sửa lên production để vá khoảng hở
 * giữa lần chạy đầu và lúc deploy là an toàn.
 *
 * AN TOÀN. Ghi SAO LƯU trước (id + nguồn cũ), cùng một giao dịch với lệnh sửa.
 * ON CONFLICT DO NOTHING: chạy lại không đè nguồn GỐC bằng nguồn đã sửa.
 *
 *   node tools/tach-qc-luot-xem.mjs          # CHỈ XEM: đếm sẽ đổi bao nhiêu, không ghi
 *   node tools/tach-qc-luot-xem.mjs --ghi    # sao lưu rồi ghi
 *   node tools/tach-qc-luot-xem.mjs --hoan   # trả nguồn cũ từ bản sao lưu (cả hai bảng)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const goc = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dongEnv = fs
  .readFileSync(path.join(goc, '.env'), 'utf8')
  .split(/\r?\n/)
  .find((l) => l.startsWith('DATABASE_URL='));
if (!dongEnv) {
  console.error('Không thấy DATABASE_URL trong .env');
  process.exit(1);
}
process.env.DATABASE_URL = dongEnv.slice('DATABASE_URL='.length).replace(/^["']|["']$/g, '');

const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

const argv = process.argv.slice(2);
const GHI = argv.includes('--ghi');
const HOAN = argv.includes('--hoan');

/** Bảng dữ liệu → bảng sao lưu của nó. */
const BANG = [
  {
    ten: 'koi_free_style.koi_page_views',
    saoLuu: 'koi_free_style.koi_page_views_nguon_backup_20260926',
  },
  {
    ten: 'koi_free_style.koi_contact_clicks',
    saoLuu: 'koi_free_style.koi_contact_clicks_nguon_backup_20260926',
  },
];

/** Lệch tối đa giữa cú bấm quảng cáo và lượt xem trang đáp. */
const LECH_DAP_MS = 20_000;
/** Cắt phiên: khớp KHOANG_CAT_PHIEN_MS ở src/analytics/hanh-vi.ts. */
const CAT_PHIEN_MS = 30 * 60 * 1000;
/**
 * Nguồn mà lượt xem trang đáp của quảng cáo CÓ THỂ đang mang (vì lỗi đo):
 * referrer Google (mã mới hoặc cũ), không referrer, hoặc referrer lạ (mạng
 * hiển thị của Google đi qua doubleclick/googlesyndication rơi vào 'other').
 * Lượt gần nhất mà là mạng xã hội thì chỉ là một người khác vào cùng lúc.
 */
const NGUON_SAI_CO_THE = new Set(['google_organic', 'google', 'direct', 'internal', 'other']);

const so = (n) => Number(n).toLocaleString('vi-VN');

if (HOAN) {
  for (const b of BANG) {
    const coBang = await prisma.$queryRawUnsafe(`SELECT to_regclass('${b.saoLuu}') IS NOT NULL AS co`);
    if (!coBang[0].co) {
      console.log(`${b.ten}: chưa có bản sao lưu, bỏ qua.`);
      continue;
    }
    const n = await prisma.$executeRawUnsafe(`
      UPDATE ${b.ten} v SET source = s.source_cu
      FROM ${b.saoLuu} s
      WHERE v.id = s.id AND v.source IS DISTINCT FROM s.source_cu
    `);
    console.log(`${b.ten}: đã trả nguồn cũ cho ${so(n)} dòng.`);
  }
  await prisma.$disconnect();
  process.exit(0);
}

const cuBam = await prisma.$queryRawUnsafe(`
  SELECT split_part("landingPath", '?', 1) AS duong, "clickedAt" AS luc
  FROM koi_free_style.koi_ad_clicks
  WHERE "landingPath" IS NOT NULL
`);

// Ngày lịch VN cắt trong SQL — phiên không vắt qua nửa đêm vì visitorHash đổi
// muối mỗi ngày (cùng luật với hanhVi()).
const NGAY_VN = `to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD')`;
const luot = await prisma.$queryRawUnsafe(`
  SELECT id, "visitorHash" AS khach, path, source, "createdAt" AS luc, ${NGAY_VN} AS ngay
  FROM koi_free_style.koi_page_views
  ORDER BY "createdAt" ASC
`);
const lienHe = await prisma.$queryRawUnsafe(`
  SELECT id, "visitorHash" AS khach, source, "createdAt" AS luc, ${NGAY_VN} AS ngay
  FROM koi_free_style.koi_contact_clicks
  ORDER BY "createdAt" ASC
`);

// --- 1. Lượt xem trang đáp của từng cú bấm ---
const theoDuong = new Map();
for (const l of luot) {
  const ds = theoDuong.get(l.path);
  if (ds) ds.push(l);
  else theoDuong.set(l.path, [l]);
}

const dap = new Set();
let khop = 0;
let daDungSan = 0;
for (const c of cuBam) {
  let gan = null;
  for (const l of theoDuong.get(c.duong) || []) {
    const lech = Math.abs(+l.luc - +c.luc);
    if (lech <= LECH_DAP_MS && (!gan || lech < gan.lech)) gan = { l, lech };
  }
  if (!gan) continue;
  khop += 1;
  // Đã đúng sẵn (chạy lần hai, hoặc lượt ghi sau khi bản sửa lên): khớp rồi,
  // KHÔNG lùi sang ứng viên khác — xem đầu tệp.
  if (gan.l.source === 'google_ads') {
    daDungSan += 1;
    continue;
  }
  if (NGUON_SAI_CO_THE.has(gan.l.source)) dap.add(gan.l.id);
}

// --- 2. Đi tiếp chuỗi trang của cùng lần vào ---
const theoKhachNgay = new Map();
for (const l of luot) {
  const k = `${l.khach}|${l.ngay}`;
  const ds = theoKhachNgay.get(k);
  if (ds) ds.push(l);
  else theoKhachNgay.set(k, [l]);
}

const doiThanhQc = new Set();
for (const ds of theoKhachNgay.values()) {
  for (let i = 0; i < ds.length; i += 1) {
    if (!dap.has(ds[i].id)) continue;
    const nguonVao = ds[i].source;
    doiThanhQc.add(ds[i].id);
    for (let j = i + 1; j < ds.length; j += 1) {
      if (+ds[j].luc - +ds[j - 1].luc > CAT_PHIEN_MS) break;
      const s = ds[j].source;
      // 'internal' = tải lại cứng trong web (referrer là chính koileather.com)
      // — vẫn là lần vào đó. Nguồn ngoài KHÁC là lần vào mới: dừng.
      if (s !== nguonVao && s !== 'internal' && s !== 'google_ads') break;
      if (s !== 'google_ads') doiThanhQc.add(ds[j].id);
    }
  }
}

const moiCuaLuot = (l) =>
  doiThanhQc.has(l.id)
    ? 'google_ads'
    : l.source === 'google'
      ? 'google_organic'
      : l.source;

// --- 3. Cú bấm Zalo/Gọi theo lượt xem gần nhất trước nó ---
const doiLienHe = new Map(); // id -> nguồn mới
for (const c of lienHe) {
  const ds = theoKhachNgay.get(`${c.khach}|${c.ngay}`) || [];
  let truoc = null;
  // Cho lệch 5 giây về sau: beacon cú bấm và beacon lượt xem có thể về lộn thứ tự.
  for (const l of ds) {
    if (+l.luc <= +c.luc + 5_000) truoc = l;
    else break;
  }
  let moi = c.source;
  if (
    truoc &&
    +c.luc - +truoc.luc <= CAT_PHIEN_MS &&
    moiCuaLuot(truoc) === 'google_ads' &&
    NGUON_SAI_CO_THE.has(c.source)
  ) {
    moi = 'google_ads';
  } else if (c.source === 'google') {
    moi = 'google_organic';
  }
  if (moi !== c.source) doiLienHe.set(c.id, moi);
}

// --- Báo cáo ---
const dem = (ds, lay) => {
  const m = {};
  for (const x of ds) m[lay(x)] = (m[lay(x)] || 0) + 1;
  return m;
};
const bang = (ds, moi) => {
  const truoc = dem(ds, (x) => x.source);
  const sau = dem(ds, moi);
  const ma = [...new Set([...Object.keys(truoc), ...Object.keys(sau)])].sort(
    (a, b) => (sau[b] || 0) - (sau[a] || 0),
  );
  for (const m of ma) {
    const t = truoc[m] || 0;
    const s = sau[m] || 0;
    const d = s - t;
    console.log(
      `  ${m.padEnd(15)} ${so(t).padStart(7)} → ${so(s).padStart(7)}  ${d ? (d > 0 ? '+' : '') + so(d) : ''}`,
    );
  }
};
const moiCuaLienHe = (c) => doiLienHe.get(c.id) || c.source;
const doiLuot = luot.filter((l) => moiCuaLuot(l) !== l.source);

console.log(
  `Cú bấm quảng cáo: ${so(cuBam.length)} · khớp lượt xem trang đáp: ${so(khop)} (đã đúng sẵn ${so(daDungSan)})`,
);
console.log(`Lượt xem → google_ads: ${so(doiThanhQc.size)} (trang đáp ${so(dap.size)})`);
console.log(`Lượt xem mã cũ "google" → google_organic: ${so(doiLuot.length - doiThanhQc.size)}`);
console.log('google_ads lấy từ:', dem(luot.filter((l) => doiThanhQc.has(l.id)), (l) => l.source));

console.log('\nLƯỢT XEM, toàn bảng (trước → sau):');
bang(luot, moiCuaLuot);
const moc30 = Date.now() - 30 * 86_400_000;
console.log('\nLƯỢT XEM, 30 ngày gần nhất (trước → sau):');
bang(luot.filter((l) => +l.luc >= moc30), moiCuaLuot);
console.log('\nCÚ BẤM ZALO/GỌI, toàn bảng (trước → sau):');
bang(lienHe, moiCuaLienHe);

if (!GHI) {
  console.log('\n(CHỈ XEM — chưa ghi gì. Thêm --ghi để sao lưu rồi ghi.)');
  await prisma.$disconnect();
  process.exit(0);
}

/** Nhóm id theo nguồn mới để mỗi nguồn một lệnh UPDATE. */
const gomTheoMoi = (pairs) => {
  const m = new Map();
  for (const [id, moi] of pairs) {
    if (!m.has(moi)) m.set(moi, []);
    m.get(moi).push(id);
  }
  return m;
};
const viec = [
  { b: BANG[0], nhom: gomTheoMoi(doiLuot.map((l) => [l.id, moiCuaLuot(l)])), cu: new Map(luot.map((l) => [l.id, l.source])) },
  { b: BANG[1], nhom: gomTheoMoi([...doiLienHe.entries()]), cu: new Map(lienHe.map((c) => [c.id, c.source])) },
];

await prisma.$transaction(
  async (tx) => {
    for (const { b, nhom, cu } of viec) {
      await tx.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS ${b.saoLuu} (
          id text PRIMARY KEY,
          source_cu text NOT NULL,
          luc timestamptz NOT NULL DEFAULT now()
        )
      `);
      for (const [moi, ids] of nhom) {
        for (let i = 0; i < ids.length; i += 1000) {
          const lo = ids.slice(i, i + 1000);
          await tx.$executeRawUnsafe(
            `INSERT INTO ${b.saoLuu} (id, source_cu)
             SELECT id, source FROM ${b.ten} WHERE id = ANY($1::text[])
             ON CONFLICT (id) DO NOTHING`,
            lo,
          );
          // Chỉ đổi dòng còn ĐÚNG nguồn lúc đọc: dòng nào bị ai sửa chen vào
          // giữa lúc đọc và lúc ghi thì số đổi lệch và cả giao dịch lùi lại.
          let n = 0;
          for (const [cuMa, idCu] of gomTheoMoi(lo.map((id) => [id, cu.get(id)]))) {
            n += await tx.$executeRawUnsafe(
              `UPDATE ${b.ten} SET source = $1 WHERE id = ANY($2::text[]) AND source = $3`,
              moi,
              idCu,
              cuMa,
            );
          }
          if (n !== lo.length) {
            throw new Error(`${b.ten}: đổi được ${n}/${lo.length} dòng sang ${moi} — dừng, không ghi gì.`);
          }
        }
        console.log(`${b.ten}: ${so(ids.length)} dòng → ${moi}`);
      }
    }
  },
  { timeout: 180_000 },
);
console.log('\nĐÃ GHI. Sao lưu ở', BANG.map((b) => b.saoLuu).join(', '));
await prisma.$disconnect();
