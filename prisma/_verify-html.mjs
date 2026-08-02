/** Kiểm cấu trúc public/index.html sau khi sửa modal + thêm trình dựng khối. */
import fs from "fs";

const h = fs.readFileSync("public/index.html", "utf8");

const openDiv = (h.match(/<div\b/g) || []).length;
const closeDiv = (h.match(/<\/div>/g) || []).length;
console.log(
  "div mở:", openDiv, "| div đóng:", closeDiv,
  openDiv === closeDiv ? "✓ khớp" : "✗ LỆCH " + (openDiv - closeDiv),
);

// Mọi id mới phải xuất hiện đúng một lần trong markup
const ids = [
  "productModal", "ppanel-info", "ppanel-desc", "pDescBlocks", "pDescPreview",
  "pDescAddBar", "pDescPreviewBtn", "cleanDescModal", "cleanDescBody",
  "cleanDescApplyBtn", "cleanDescApplyText", "cleanDescNote",
  "pDescCleanNotice", "pDescCleanDetail", "pDescRemovedText", "pDescDirtyDot",
  "pBlockCount", "pModalHint", "editProductId", "pNameVi", "pPrice",
  "imageGallery", "processingOverlay",
];
let bad = 0;
for (const id of ids) {
  const n = (h.match(new RegExp('id="' + id + '"', "g")) || []).length;
  if (n !== 1) { console.log("✗ id", id, "xuất hiện", n, "lần"); bad++; }
}
console.log(bad ? `✗ ${bad} id sai` : `✓ ${ids.length} id đều đúng 1 lần`);

// Mọi hàm được gọi trong onclick/oninput/onblur… phải thật sự được định nghĩa
const handlers = new Set();
for (const m of h.matchAll(/\bon(?:click|input|change|blur|focus|paste|keydown)="([^"]*)"/g)) {
  for (const f of m[1].matchAll(/([A-Za-z_$][\w$]*)\s*\(/g)) handlers.add(f[1]);
}
const builtins = new Set([
  "if", "return", "for", "while", "Object", "Array", "String", "Number",
  "document", "window", "console", "JSON", "Math", "setTimeout", "esc",
  "createElement", "assign", "getElementById", "querySelector", "closest",
  "add", "remove", "toggle", "contains", "replaceWith", "focus", "blur",
  "scrollIntoView", "preventDefault", "stopPropagation", "click", "trim",
  "indexOf",
]);
const missing = [];
for (const fn of handlers) {
  if (builtins.has(fn)) continue;
  const defined =
    new RegExp(`function\\s+${fn}\\s*\\(`).test(h) ||
    new RegExp(`(?:const|let|var)\\s+${fn}\\s*=`).test(h) ||
    new RegExp(`\\b${fn}\\s*[:=]\\s*(?:async\\s*)?(?:function|\\()`).test(h);
  if (!defined) missing.push(fn);
}
console.log(
  missing.length
    ? "✗ gọi mà chưa định nghĩa: " + missing.join(", ")
    : `✓ ${handlers.size} hàm trong thuộc tính on* đều có định nghĩa`,
);

// Không được dùng lại .tab-btn/.panel trong modal — applyRoute() quét toàn trang
// bằng querySelectorAll('.tab-btn') / ('.panel'), nên mọi phần tử mang class đó
// đều bị bật/tắt theo route. Chỉ soi phần MARKUP của modal, không soi khối
// <script> (ở đó .tab-btn xuất hiện hợp lệ trong chuỗi selector).
const mStart = h.indexOf('<div class="modal-overlay" id="productModal">');
const mEnd = h.indexOf('<!-- MATERIAL MODAL -->');
const modal = h.slice(mStart, mEnd);
const clash = [...modal.matchAll(/class="([^"]*)"/g)].filter((m) =>
  /(^|\s)(tab-btn|panel)(\s|$)/.test(m[1]),
);
console.log(
  clash.length
    ? "✗ modal dùng lại class của trang: " + clash.map((c) => c[1]).join(" | ")
    : "✓ thẻ trong modal dùng class riêng (.pmodal-tab/.pmodal-panel)",
);
console.log("  (khoảng markup modal:", mStart, "→", mEnd, ")");
