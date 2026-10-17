/**
 * TỆP TẠM — hoàn tác đợt vá thân bài loại da. Xoá sau Giai đoạn 0.
 *
 *   node scripts/_tam-hoan-tac.mjs _hoan-tac-loai-da-<mã>.json          # thử
 *   node scripts/_tam-hoan-tac.mjs _hoan-tac-loai-da-<mã>.json --ghi    # ghi
 *
 * Đưa description về ĐÚNG chuỗi gốc đã chụp trước khi vá. Không so sánh với
 * trạng thái hiện tại: nếu có người sửa tay sau đó thì hoàn tác sẽ đè lên,
 * nên đọc kỹ trước khi chạy.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const req = createRequire(path.join(GOC, "package.json"));
const { Client } = req("pg");
const GHI = process.argv.includes("--ghi");
const tep = process.argv.slice(2).find((a) => !a.startsWith("--"));
if (!tep) {
  console.error("Cần tên tệp hoàn tác.");
  process.exit(1);
}

for (const d of fs.readFileSync(path.join(GOC, ".env"), "utf8").split(/\r?\n/)) {
  const m = d.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}
const u = new URL(process.env.DATABASE_URL);
u.searchParams.delete("sslmode");

const ds = JSON.parse(
  fs.readFileSync(path.resolve(GOC, "scripts", path.basename(tep)), "utf8"),
);
const c = new Client({ connectionString: u.toString(), ssl: { rejectUnauthorized: false } });
await c.connect();

for (const m of ds) {
  if (GHI) {
    const r = await c.query(
      `UPDATE koi_free_style.koi_products SET description = $1, "updatedAt" = now() WHERE id = $2`,
      [m.goc, m.id],
    );
    console.log(`${r.rowCount === 1 ? "✓" : "✗"} ${m.slug}`);
  } else {
    console.log(`· ${m.slug} — sẽ đưa về ${m.goc.length} ký tự`);
  }
}
console.log(`\n${GHI ? "ĐÃ HOÀN TÁC" : "CHƯA GHI (thêm --ghi)"} · ${ds.length} sản phẩm`);
await c.end();
