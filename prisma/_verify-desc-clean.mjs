/**
 * Kiểm chứng bộ dọn mô tả trên TOÀN BỘ dữ liệu thật trước khi cho ghi vào DB.
 *
 * Cách kiểm: so chữ trần (đã bỏ hết thẻ) TRƯỚC và SAU khi dọn. Mọi đoạn chữ
 * biến mất đều bị in ra kèm slug. Chỉ được phép mất đúng các thứ đã chủ ý bỏ:
 * tiêu đề <h1> lặp tên sản phẩm, nút "LIÊN HỆ ĐỂ TƯ VẤN", danh thiếp cuối bài
 * (KOI LEATHER / Địa chỉ / Hotline / email). Mất bất cứ câu mô tả thật nào là
 * lỗi của bộ dọn, không phải "chấp nhận được".
 *
 *   node prisma/_verify-desc-clean.mjs          → tóm tắt + phần mất bất thường
 *   node prisma/_verify-desc-clean.mjs --all    → in mọi đoạn mất, kể cả đã dự kiến
 */
import { PrismaClient } from "@prisma/client";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
require("ts-node/register");
const {
  htmlToBlocks,
  blocksToHtml,
  blocksToPlainText,
  auditHtml,
  removedText,
  stripBareCss,
} = require("../src/product/description-blocks.ts");

const SHOW_ALL = process.argv.includes("--all");
const prisma = new PrismaClient();

function descOf(d) {
  if (typeof d === "string") {
    try {
      const j = JSON.parse(d);
      return j && typeof j === "object" ? j.vi ?? j.en ?? "" : d;
    } catch {
      return d;
    }
  }
  return d ? d.vi ?? d.en ?? "" : "";
}
function nameOf(n) {
  return descOf(n);
}

/**
 * Chữ trần, gộp khoảng trắng, giải mã thực thể để so cho công bằng.
 *
 * Bỏ luôn CSS trần: 3 mô tả có CSS Flatsome nằm thẳng trong thân bài, không bọc
 * <style>. Bộ dọn loại nó khỏi nội dung (đúng), nên nếu ở đây vẫn tính nó là
 * "chữ" thì mỗi khối CSS mất đi lại bị báo là "ăn mất nội dung".
 */
function plain(html) {
  return stripBareCss(
    String(html || "")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  )
    // Giải mã MỌI thực thể số (&#8220; &#x201C; …) — bộ dọn giải mã hết nên nếu
    // ở đây không giải mã thì chữ có dấu ngoặc kép cong nào cũng bị coi là mất.
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[\s ]+/g, " ")
    .trim();
}

/** Chuỗi con của `before` không còn trong `after`, cắt theo câu/dòng. */
function missingChunks(before, after) {
  const hay = norm(after);
  const out = [];
  for (const raw of before.split(/(?<=[.!?:])\s+|\n+|\s{2,}/)) {
    const piece = raw.trim();
    if (piece.length < 12) continue;
    const needle = norm(piece);
    if (!needle || needle.length < 12) continue;
    if (!hay.includes(needle)) out.push(piece);
  }
  return out;
}

const EXPECTED =
  /(KOI\s*LEATHER\s*[–—-]\s*ĐỒ\s*DA|Địa\s*chỉ\s*:|Hotline\s*:|koi\.leather19@gmail\.com|LIÊN\s*HỆ\s*ĐỂ\s*TƯ\s*VẤN)/i;

/**
 * Rác đã kiểm chứng bằng mắt trên HTML gốc (xem prisma/_probe-rest.mjs,
 * _probe-testi.mjs) — chủ ý bỏ, không phải nội dung mô tả sản phẩm:
 *   · thẻ liên hệ cuối bài (địa chỉ / hotline / email / fanpage / Zalo / FB),
 *   · CSS Flatsome lọt vào nội dung (#text-box-… { width: 100% } …),
 *   · widget "Đánh giá" của theme cũ: 3 sản phẩm, trong đó có cả chữ mẫu của
 *     Flatsome ("created my first ever website Punsteronline.com") — đánh giá
 *     khách phải nằm ở mục đánh giá, không nhét trong mô tả,
 *   · dải sản phẩm liên quan (mỗi ảnh đều trỏ /wp-content đang 403),
 *   · nhãn tab của theme ("Thông tin sản phẩm", "Đánh giá").
 */
const JUNK_OK =
  /(TƯ\s*VẤN\s*QUA\s*ZALO|Fanpage|facebook\.com\/koileathercraft|hello@koileather\.com|0901|0909|Hồ\s*Chí\s*Minh|Nguyễn\s*Bặc|Thông\s*[Tt]in\s*[Ll]iên\s*[Hh]ệ|#text-box-|#gap-|padding-top|font-size:|width:\s*100%|@media|flatsome|Punsteronline|Thông\s*tin\s*sản\s*phẩm\s*Đánh\s*giá|Kẹp\s*Tiền\s*Đính\s*Nametag|July\s*Dang|Ly\s*Pham|\/\s*Facebook|Liên\s*hệ\s*để\s*(được\s*tư\s*vấn|đặt\s*làm))/i;

/** So chữ theo dạng đã chuẩn hoá (bỏ dấu câu, hạ chữ thường). */
function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const rows = await prisma.koiProduct.findMany({
  where: { isDeleted: false },
  select: { id: true, slug: true, name: true, description: true },
  orderBy: { slug: "asc" },
});

let checked = 0,
  emptyAfter = 0,
  emptyOnlyTitle = 0,
  shrinkBytes = 0,
  origBytes = 0,
  cleanBytes = 0,
  h1Removed = 0,
  deadImgs = 0,
  suspicious = 0,
  expectedOnly = 0;
const blockTally = {};
const problems = [];

for (const r of rows) {
  const html = descOf(r.description);
  if (!html || !html.trim()) continue;
  checked++;

  const name = nameOf(r.name);
  const { blocks, deadImages } = htmlToBlocks(html, name);
  const cleaned = blocksToHtml(blocks);
  deadImgs += deadImages.length;

  for (const b of blocks) blockTally[b.type] = (blockTally[b.type] || 0) + 1;
  origBytes += html.length;
  cleanBytes += cleaned.length;

  if (!cleaned.trim()) {
    emptyAfter++;
    // Rỗng là ĐÚNG khi mô tả gốc chỉ có đúng cái tiêu đề lặp tên sản phẩm
    // (1 sản phẩm: mô tả vỏn vẹn 77 ký tự, chỉ một thẻ <h1>). Bộ dọn phải BÁO
    // cho người bán chứ không được im lặng xoá — chỗ ghi sẽ bỏ qua ca này.
    const onlyTitle = plain(html).length <= 120;
    if (!onlyTitle) {
      problems.push({ slug: r.slug, why: "RỖNG SAU KHI DỌN", detail: html.slice(0, 200) });
    } else {
      emptyOnlyTitle++;
    }
    continue;
  }

  // Chữ trần: trước vs sau
  const before = plain(html);
  const after = plain(cleaned);
  const viaBlocks = blocksToPlainText(blocks);
  if (plain(viaBlocks) !== after) {
    problems.push({
      slug: r.slug,
      why: "blocksToPlainText ≠ blocksToHtml (lệch giữa hai đường in)",
      detail: `${plain(viaBlocks).length} vs ${after.length}`,
    });
  }

  const lost = missingChunks(before, after);
  const h1 = (html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i) || [])[1];
  if (h1) h1Removed++;

  // Chữ mà bộ dọn tự khai là đã chủ ý bỏ (h1 lặp tên, vỏ builder, CTA, danh
  // thiếp). Đoạn mất nào nằm trong đây là đúng ý; nằm ngoài mới là ăn mất chữ.
  const dropped = norm(removedText(html, name));

  const unexpected = lost.filter((p) => {
    const needle = norm(p);
    if (needle && dropped.includes(needle)) return false;
    if (EXPECTED.test(p)) return false;
    if (JUNK_OK.test(p)) return false;
    // Tiêu đề h1 bỏ có chủ ý: khớp tên sản phẩm.
    if (h1 && plain(h1) && plain(p).includes(plain(h1).slice(0, 20))) return false;
    if (name && plain(p) && plain(name).slice(0, 18) && plain(p).includes(plain(name).slice(0, 18)))
      return false;
    return true;
  });

  if (unexpected.length) {
    suspicious++;
    problems.push({
      slug: r.slug,
      why: `MẤT ${unexpected.length} đoạn chữ ngoài dự kiến`,
      detail: unexpected.slice(0, 4).map((x) => "· " + x.slice(0, 160)).join("\n      "),
    });
  } else if (lost.length) {
    expectedOnly++;
    if (SHOW_ALL) {
      console.log(`  (ok) ${r.slug}: bỏ ${lost.length} đoạn đã dự kiến`);
    }
  }

  // Dọn lần hai phải ra y hệt lần một (idempotent) — nếu không thì mỗi lần mở
  // modal lại sinh ra một bản HTML khác, sản phẩm bị "sửa" dù không ai bấm gì.
  const twice = blocksToHtml(htmlToBlocks(cleaned, name).blocks);
  if (twice !== cleaned) {
    problems.push({
      slug: r.slug,
      why: "KHÔNG BẤT BIẾN — dọn lần 2 ra kết quả khác",
      detail: `len ${cleaned.length} → ${twice.length}`,
    });
  }

  // HTML sạch không được còn rác nào.
  const a = auditHtml(cleaned);
  if (a.isLegacy) {
    problems.push({
      slug: r.slug,
      why: "HTML SAU KHI DỌN VẪN CÒN RÁC",
      detail: JSON.stringify({
        h1: a.duplicateH1,
        shell: a.builderShell,
        style: a.inlineStyle,
        attrs: a.authoringAttrs,
        cta: a.ctaButton,
        img: a.brokenImages,
      }),
    });
  }
}

shrinkBytes = origBytes - cleanBytes;

console.log("\n================ KẾT QUẢ KIỂM CHỨNG ================");
console.log(`Đã kiểm            : ${checked} mô tả`);
console.log(`Bỏ <h1> lặp tên    : ${h1Removed}`);
console.log(`Bỏ ảnh chết 403    : ${deadImgs} thẻ`);
console.log(
  `Dung lượng         : ${(origBytes / 1024).toFixed(0)}KB → ${(cleanBytes / 1024).toFixed(0)}KB (giảm ${((shrinkBytes / origBytes) * 100).toFixed(0)}%)`,
);
console.log(`Khối sinh ra        : ${JSON.stringify(blockTally)}`);
console.log(`Chỉ mất phần dự kiến: ${expectedOnly}`);
console.log(
  `Rỗng sau khi dọn    : ${emptyAfter} (trong đó ${emptyOnlyTitle} cái mô tả gốc chỉ có tiêu đề → giữ nguyên bản cũ, báo người bán tự viết)`,
);
console.log(`CẦN XEM LẠI         : ${suspicious}`);

if (problems.length) {
  console.log(`\n---------------- ${problems.length} MỤC CẦN XEM ----------------`);
  for (const p of problems.slice(0, 40)) {
    console.log(`\n[${p.why}] ${p.slug}\n      ${p.detail}`);
  }
  if (problems.length > 40) console.log(`\n… và ${problems.length - 40} mục nữa`);
} else {
  console.log("\nKhông có mục nào cần xem lại. Bộ dọn an toàn để chạy hàng loạt.");
}

await prisma.$disconnect();
process.exit(problems.length ? 1 : 0);
