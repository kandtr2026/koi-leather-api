/**
 * TỆP TẠM — vá thân bài 15 SP lệch loại da, MỔ ĐÚNG CHỖ. Xoá sau Giai đoạn 0.
 *
 *   node scripts/_tam-va-loai-da.mjs            # thử: in diff, KHÔNG ghi
 *   node scripts/_tam-va-loai-da.mjs --ghi      # ghi thật + xuất tệp hoàn tác
 *
 * VÌ SAO KHÔNG DÙNG RUNNER AI: thân bài của 15 món này là bài SEO viết tay,
 * 0-7 khối <h2> và 1-3 liên kết nội bộ. Cho AI viết lại cả bài thì mất 62%
 * độ dài và mất hết liên kết (đã đo thật trên vi-nu-da-da-clemence-…).
 * Ở đây chỉ đổi phần nói về CHẤT DA, phần còn lại giữ nguyên từng ký tự.
 *
 * MỌI CHUỖI TÌM PHẢI KHỚP ĐÚNG MỘT LẦN. Không khớp, hay khớp nhiều lần, là
 * DỪNG cả lô — dữ liệu đã đổi so với lúc soạn thì không được đoán.
 *
 * ĐÃ CHẠY PROD 30/08/2026 (15/15 sản phẩm). Vì vậy chạy lại bây giờ sẽ báo
 * "khớp 0 lần" cho cả 15 món — ĐÓ LÀ ĐÚNG, không phải script hỏng: chuỗi cũ
 * đã bị thay rồi nên không còn tìm thấy. Script này cố ý không chạy lại được
 * hai lần. Muốn quay về bản gốc thì dùng va-than-bai-loai-da.hoan-tac.mjs.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { DS } from "./va-than-bai-loai-da.data.mjs";

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const req = createRequire(path.join(GOC, "package.json"));
const { Client } = req("pg");
const GHI = process.argv.includes("--ghi");

for (const d of fs.readFileSync(path.join(GOC, ".env"), "utf8").split(/\r?\n/)) {
  const m = d.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const u = new URL(process.env.DATABASE_URL);
u.searchParams.delete("sslmode");

/** Thay đúng một lần. Đếm trước, ném lỗi nếu không phải 1. */
function thayMotLan(chu, tim, the, nhan) {
  const so = chu.split(tim).length - 1;
  if (so !== 1) {
    throw new Error(
      `${nhan}: chuỗi tìm khớp ${so} lần (phải đúng 1).\n  TÌM: ${tim.slice(0, 120)}…`,
    );
  }
  return chu.split(tim).join(the);
}

const c = new Client({ connectionString: u.toString(), ssl: { rejectUnauthorized: false } });
await c.connect();

const HOAN_TAC = [];
let soXong = 0;
let soLoi = 0;

for (const m of DS) {
  const nhan = m.slug;
  const { rows } = await c.query(
    `SELECT id, description FROM koi_free_style.koi_products WHERE slug = $1 AND "isDeleted" = false`,
    [m.slug],
  );
  if (!rows.length) {
    console.error(`✗ ${nhan}: không có trong DB`);
    soLoi++;
    continue;
  }
  const goc = rows[0].description;
  let html;
  try {
    html = JSON.parse(goc)?.vi ?? goc;
  } catch {
    html = goc;
  }
  const truoc = html;

  try {
    for (const [tim, the] of m.thay ?? []) html = thayMotLan(html, tim, the, nhan);
    for (const [tim, the] of m.chung ?? []) html = html.split(tim).join(the);
    for (const [tim, the] of m.chot ?? []) html = html.split(tim).join(the);

    // Cửa chặn: sau khi vá, tên loại da SAI không được còn sót chữ nào.
    const sot = (m.camSot ?? []).filter((t) => new RegExp(t, "i").test(html));
    if (sot.length) throw new Error(`${nhan}: còn sót tên da sai: ${sot.join(", ")}`);
    // Cửa chặn: không được mất liên kết, không được ngắn đi quá 15%.
    const laA = (s) => (s.match(/<a\s/gi) || []).length;
    if (laA(html) !== laA(truoc)) {
      throw new Error(`${nhan}: số liên kết đổi ${laA(truoc)} → ${laA(html)}`);
    }
    if (html.length < truoc.length * 0.85) {
      throw new Error(`${nhan}: ngắn đi ${Math.round((1 - html.length / truoc.length) * 100)}%`);
    }
  } catch (e) {
    console.error(`✗ ${e.message}`);
    soLoi++;
    continue;
  }

  console.log(
    `✓ ${nhan.padEnd(50)} ${String(truoc.length).padStart(4)} → ${String(html.length).padStart(4)} ký tự` +
      `  (${(m.thay ?? []).length} chỗ mổ, ${(m.chung ?? []).length} chỗ đổi tên)`,
  );

  const xem = process.argv.find((a) => a.startsWith("--xem="));
  if (xem && m.slug.includes(xem.slice(6))) {
    console.log(`\n${"─".repeat(78)}\n${html.replace(/></g, ">\n<")}\n${"─".repeat(78)}\n`);
  }

  if (GHI) {
    const moi = JSON.stringify({ vi: html });
    await c.query(
      `UPDATE koi_free_style.koi_products SET description = $1, "updatedAt" = now() WHERE id = $2`,
      [moi, rows[0].id],
    );
    HOAN_TAC.push({ slug: m.slug, id: rows[0].id, goc });
    soXong++;
  }
}

if (GHI && HOAN_TAC.length) {
  const tep = path.join(GOC, "scripts", `_hoan-tac-loai-da-${Date.now()}.json`);
  fs.writeFileSync(tep, JSON.stringify(HOAN_TAC, null, 1), "utf8");
  console.log(`\nTệp hoàn tác: ${path.relative(GOC, tep)}`);
  console.log(`  node scripts/va-than-bai-loai-da.hoan-tac.mjs ${path.basename(tep)}`);
}

console.log(
  `\n${GHI ? "ĐÃ GHI" : "CHƯA GHI (thêm --ghi)"} · xong ${GHI ? soXong : DS.length - soLoi}/${DS.length} · lỗi ${soLoi}`,
);
await c.end();
if (soLoi) process.exitCode = 1;
