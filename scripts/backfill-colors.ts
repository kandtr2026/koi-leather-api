import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "@prisma/client";
import { COLOR_FAMILY_HEX } from "../src/common/enums";

// Nạp .env thủ công (script chạy bằng ts-node, không qua Nest ConfigModule).
if (!process.env.DATABASE_URL) {
  const envPath = path.join(__dirname, "..", ".env");
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*([\w.]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  }
}

/**
 * Điền màu (colorFamily + colorHex) cho sản phẩm dựa trên TÊN.
 *
 * Tên KOI gần như luôn kèm màu (Việt lẫn Anh: "Đen", "Black", "Gold",
 * "DarkBlue", "Navi"...). Ta bắt từ khoá theo thứ tự ƯU TIÊN CỤ THỂ → CHUNG
 * (vd "nâu đỏ" trước "nâu", "navy" trước "xanh") và lấy màu ĐẦU TIÊN khớp —
 * hàng phối nhiều màu ("Red x Yellow x Green") thì lấy màu chính (đứng trước).
 *
 * Chạy:  npx ts-node scripts/backfill-colors.ts          (chỉ điền SP đang trống)
 *        npx ts-node scripts/backfill-colors.ts --force  (ghi đè tất cả)
 *        npx ts-node scripts/backfill-colors.ts --dry     (chỉ in, không ghi)
 *
 * KHÔNG ghi đè SP đã có colorFamily (trừ --force) để không đè chỉnh tay của admin.
 */
const prisma = new PrismaClient();

/** Bỏ dấu tiếng Việt + đ→d, viết thường — để bắt cả "đen" lẫn "den". */
function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase();
}

/** name là JSON {vi,en} (đôi khi dạng chuỗi) — gộp vi + en để dò. */
function nameText(raw: any): string {
  if (raw == null) return "";
  if (typeof raw === "object") return `${raw.vi ?? ""} ${raw.en ?? ""}`;
  const s = String(raw).trim();
  if (s.startsWith("{")) {
    try {
      const o = JSON.parse(s);
      return `${o.vi ?? ""} ${o.en ?? ""}`;
    } catch {
      return s;
    }
  }
  return s;
}

// Thứ tự QUAN TRỌNG: cụ thể trước, chung sau. Từ khoá đã bỏ dấu.
// Dùng \b để tránh khớp nhầm (vd "cam" trong "camel", "be" trong "da be").
const RULES: { code: string; keywords: string[] }[] = [
  { code: "NAU_DO", keywords: ["nau do", "cognac", "hat de", "chestnut", "havane", "bo rung", "saddlebrown", "saddle brown", "mahogany"] },
  { code: "NAU_DAM", keywords: ["nau dam", "socola", "chocolate", "choco", "ca phe", "moka", "dark brown", "brown", "brow", "nau"] },
  { code: "GOLD", keywords: ["gold"] },
  { code: "NAVY", keywords: ["navy", "navi", "xanh navy", "xanh den", "xanh than", "dark ?blue", "darkblue", "midnight"] },
  { code: "XANH_LA", keywords: ["xanh la", "xanh reu", "olive", "green", "reu", "teal", "emerald"] },
  { code: "XANH_DUONG", keywords: ["xanh duong", "xanh bien", "xanh da troi", "xanh bich", "blue", "steelblue", "turquoise", "aqua", "xanh"] },
  { code: "VANG_BO", keywords: ["vang bo", "tan", "natural", "camel", "bo nhat", "khaki", "burlywood", "wheat", "bisque", "yellow", "vang"] },
  { code: "KEM", keywords: ["kem", "cream", "beige", "ivory", "navajowhite", "himalaya", "bach tang"] },
  { code: "TRANG", keywords: ["trang", "white", "whitesmoke"] },
  { code: "DEN", keywords: ["den", "black", "onyx", "noir"] },
  { code: "XAM", keywords: ["xam", "ghi", "gray", "grey", "slate gray", "slategray", "lightslategray", "taupe", "etoup", "etoupe", "silver", "sliver"] },
  { code: "DO", keywords: ["do do", "bordeaux", "burgundy", "ruou vang", "darkred", "red", "wine", "\\bdo\\b"] },
  { code: "CAM", keywords: ["cam", "orange"] },
  { code: "HONG", keywords: ["hong", "pink", "rose"] },
  { code: "TIM", keywords: ["tim", "purple", "violet", "lavender"] },
];

/** Trả về mã nhóm màu ĐẦU TIÊN khớp trong tên, theo thứ tự ưu tiên; null nếu không. */
function detectColor(name: string): string | null {
  const n = normalize(name);
  // Duyệt theo VỊ TRÍ xuất hiện: với hàng phối nhiều màu, màu đứng trước là
  // màu chính. Nên chọn rule có vị trí khớp nhỏ nhất; hoà thì theo thứ tự ưu tiên.
  let bestCode: string | null = null;
  let bestPos = Number.POSITIVE_INFINITY;
  for (let rank = 0; rank < RULES.length; rank++) {
    const rule = RULES[rank];
    for (const kw of rule.keywords) {
      const re = new RegExp(`\\b${kw}\\b`);
      const m = n.match(re);
      if (m && m.index !== undefined) {
        // Vị trí khớp nhỏ hơn = màu chính (đứng trước); hoà thì rule ưu tiên hơn
        // (rank nhỏ) đã duyệt trước nên giữ nguyên.
        if (m.index < bestPos) {
          bestPos = m.index;
          bestCode = rule.code;
        }
        break;
      }
    }
  }
  return bestCode;
}

async function main() {
  const force = process.argv.includes("--force");
  const dry = process.argv.includes("--dry");

  const products = await prisma.koiProduct.findMany({
    where: { isDeleted: false, ...(force ? {} : { colorFamily: null }) },
    select: { id: true, name: true, colorFamily: true },
  });

  console.log(`Đang xử lý ${products.length} sản phẩm${force ? " (force)" : " (chỉ SP trống)"}${dry ? " [DRY RUN]" : ""}`);

  const tally: Record<string, number> = {};
  let matched = 0;
  let unmatched = 0;

  for (const p of products) {
    const name = nameText(p.name);
    const code = detectColor(name);
    if (!code) {
      unmatched++;
      if (dry) console.log(`  ? KHÔNG rõ màu: ${name}`);
      continue;
    }
    matched++;
    tally[code] = (tally[code] || 0) + 1;
    if (!dry) {
      await prisma.koiProduct.update({
        where: { id: p.id },
        data: { colorFamily: code, colorHex: COLOR_FAMILY_HEX[code] ?? null },
      });
    }
  }

  console.log(`\nKhớp: ${matched} · Không rõ: ${unmatched}`);
  console.log("Phân bố nhóm màu:");
  Object.entries(tally)
    .sort((a, b) => b[1] - a[1])
    .forEach(([code, n]) => console.log(`  ${code.padEnd(12)} ${n}`));
  if (dry) console.log("\n(DRY RUN — chưa ghi gì vào DB)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
