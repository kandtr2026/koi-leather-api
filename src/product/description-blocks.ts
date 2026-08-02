import { parse, HTMLElement, Node, NodeType } from "node-html-parser";

/**
 * MÔ TẢ SẢN PHẨM DẠNG KHỐI (block) — nguồn sự thật duy nhất.
 *
 * Vì sao có file này: 324/325 mô tả cũ là HTML thô kéo từ WordPress + Flatsome
 * (UX Builder), lẫn cả rác do ChatGPT sinh khi soạn bài. Đo trên DB thật:
 *   255 bản có <h1> lặp lại đúng tên sản phẩm (storefront đã tự in <h1> riêng
 *       → khách và Google thấy tiêu đề hai lần trên cùng một trang),
 *   212 bản còn khung UX Builder (div.row slider rỗng + div.box danh thiếp),
 *   228 bản có style="" trỏ vào CSS Flatsome KHÔNG còn tồn tại trên web mới,
 *   208 bản có data-start/data-end,
 *   235 bản còn thực thể HTML thô (&#8211; &#8217; &nbsp;),
 *   196 bản có nút Facebook "LIÊN HỆ ĐỂ TƯ VẤN" (web mới đã có nút Zalo riêng),
 *   38 thẻ <img> trên 14 sản phẩm trỏ về /wp-content — đã kiểm tra HTTP: 403
 *       (thử cả khi có Referer, không phải chặn hotlink → đường dẫn chết thật).
 *
 * Cách chữa: KHÔNG sửa HTML bằng chuỗi/regex. Phân tích một lần ra mảng khối
 * có cấu trúc (htmlToBlocks), rồi in lại HTML sạch từ mảng đó (blocksToHtml).
 * Trình soạn thảo trong admin và nút "dọn hàng loạt" dùng CHUNG hai hàm này —
 * không có hai đường code để lệch nhau.
 *
 * `description` trong DB vẫn tiếp tục lưu HTML (do blocksToHtml in ra) nên
 * koi-storefront không phải sửa gì; `descriptionBlocks` lưu thêm mảng khối để
 * lần mở sau soạn lại đúng cái người bán đã thấy.
 */

// ---------------------------------------------------------------------------
// Kiểu dữ liệu khối
// ---------------------------------------------------------------------------

export type InlineHtml = string;

export type DescriptionBlock =
  | { type: "paragraph"; html: InlineHtml }
  | { type: "heading"; level: 2 | 3; html: InlineHtml }
  | { type: "list"; ordered: boolean; items: ListItem[] }
  | { type: "quote"; html: InlineHtml }
  | { type: "image"; url: string; alt?: string; caption?: InlineHtml };

/** level 0 = gạch đầu dòng chính, 1 = gạch đầu dòng con (tối đa 2 cấp). */
export type ListItem = { html: InlineHtml; level: 0 | 1 };

export type DescriptionAudit = {
  /** Có phải HTML cũ chưa dọn (còn ít nhất một loại rác)? */
  isLegacy: boolean;
  duplicateH1: number;
  builderShell: number;
  inlineStyle: number;
  authoringAttrs: number;
  htmlEntities: number;
  ctaButton: number;
  brokenImages: number;
  /** URL ảnh chết bị bỏ — trả về để báo cho người bán biết mất cái gì. */
  brokenImageUrls: string[];
};

// ---------------------------------------------------------------------------
// Cấu hình dọn
// ---------------------------------------------------------------------------

/** Thẻ inline được giữ. Ngoài danh sách này thì bóc vỏ, giữ chữ bên trong. */
const INLINE_KEEP = new Set(["strong", "b", "em", "i", "u", "a", "br"]);

/**
 * Thẻ phải bỏ CẢ RUỘT, không được bóc vỏ giữ chữ.
 *
 * Bắt buộc phải có vì luật mặc định của inlineOf là "thẻ lạ thì bóc vỏ, giữ
 * chữ" — với <script> thì cái "chữ" đó chính là mã JS, nên nó hiện nguyên
 * `alert(1)` ra trang. Kiểm thử gửi `<script>alert(1)</script>Sau script` từng
 * ra `<p>alert(1)Sau script</p>`.
 */
const DROP_CONTENT = new Set([
  "script",
  "style",
  "iframe",
  "noscript",
  "template",
  "svg",
  "object",
  "embed",
]);

/** Class đặc trưng khung UX Builder / Flatsome — cắt cả cụm, không giữ chữ. */
const BUILDER_CLASS =
  /\b(row|row-slider|row-small|slider|slider-nav-\w+|large-columns-\d|medium-columns-\d|small-columns-\d|box|box-image|box-image-inner|box-text|box-text-inner|box-text-bottom|image-cover|has-hover|person-name|person-title|is-bevel|is-xlarge|box-shadow-\d|thin-font|op-\d|expand|icon-facebook)\b/;

/** Nút CTA của theme cũ: <a class="button alert …">LIÊN HỆ ĐỂ TƯ VẤN</a>. */
const CTA_CLASS = /\bbutton\b/;

/**
 * Thanh điều hướng thẻ của Flatsome — 3 mô tả có nó.
 *
 * Là <ul class="nav nav-outline …" role="tablist"> chứa link "#tab_…" trỏ vào
 * panel nằm ngay dưới. Đây là bộ điều khiển của giao diện cũ, không phải nội
 * dung: đưa vào trình dựng khối thì ra một danh sách gạch đầu dòng với hai link
 * chết ("Thông tin sản phẩm", "Đánh giá") nằm ngay đầu mô tả.
 */
const TAB_NAV_CLASS = /\bnav-(outline|uppercase|left|tabs)\b/;

/** Ảnh trỏ về WordPress cũ — toàn bộ đang trả 403. */
const DEAD_IMAGE = /\/wp-content\//i;

/** Danh thiếp cuối bài: tên xưởng + địa chỉ + hotline + email. */
const CONTACT_CARD =
  /(KOI\s*LEATHER\s*[–—-]\s*ĐỒ\s*DA|Địa\s*chỉ\s*:|Hotline\s*:|koi\.leather19@gmail\.com)/i;

const ATTR_NOISE = /^(style|class|data-start|data-end|data-flickity-options|aria-hidden|target|rel|width|height|loading|decoding|srcset|sizes|id)$/i;

// ---------------------------------------------------------------------------
// Tiện ích chữ
// ---------------------------------------------------------------------------

function escapeText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Gộp mọi loại khoảng trắng (kể cả NBSP đã giải mã) về một dấu cách. */
function collapse(s: string): string {
  return s.replace(/[\s ​]+/g, " ");
}

/**
 * Bỏ CSS trần khỏi chuỗi.
 *
 * 3 mô tả có CSS Flatsome nằm THẲNG trong thân bài, không hề bọc <style> — đo
 * được `</div>\n\n#gap-595012054 { padding-top: 30px; }` giữa hai đoạn văn. Vì
 * không phải thẻ nên walk() không loại được: nó đi vào khối như một đoạn văn
 * bình thường và khách đọc thấy đúng chữ `#gap-595012054 { padding-top: 30px; }`
 * trên trang sản phẩm.
 *
 * Chỉ khớp khối có ngoặc nhọn kèm `thuộc-tính: giá-trị` — câu văn bình thường
 * không có hình dạng đó nên không sợ ăn mất chữ thật.
 */
export function stripBareCss(s: string): string {
  return s
    .replace(/@media[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/gi, " ")
    .replace(/[#.@]?[\w-]+(?:\s*[>+~,:.][\s\w-]*)*\s*\{[^{}]*:[^{}]*\}/g, " ");
}

function isBlank(html: string): boolean {
  return (
    collapse(html.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, " "))
      .replace(/&nbsp;/gi, " ")
      .trim().length === 0
  );
}

function el(node: Node): HTMLElement | null {
  return node.nodeType === NodeType.ELEMENT_NODE ? (node as HTMLElement) : null;
}

function tagOf(node: Node): string {
  const e = el(node);
  return e ? (e.rawTagName || "").toLowerCase() : "";
}

function classOf(node: Node): string {
  const e = el(node);
  return e ? e.getAttribute("class") || "" : "";
}

/**
 * Cụm này có đúng là danh thiếp cuối bài, chứ không phải một cái vỏ to đang
 * bọc cả bài viết mà tình cờ có danh thiếp ở cuối?
 *
 * Cần thiết vì 6 mô tả được dán thẳng từ giao diện ChatGPT: toàn bộ nội dung
 * nằm trong MỘT <div> lớn, danh thiếp nằm ở cuối cũng trong div đó. Nếu chỉ
 * xét `text` có chứa "Địa chỉ:" thì cái div ngoài cùng khớp → mất trắng cả mô
 * tả (đúng 6 sản phẩm đã dọn ra rỗng).
 */
function isContactCardOnly(e: HTMLElement): boolean {
  // Danh thiếp thật chỉ có chữ + <br> + <h4>. Có tiêu đề, danh sách, ảnh hay
  // thẻ bài viết bên trong nghĩa là đây là vỏ chứa nội dung, không phải thiếp.
  if (e.querySelector("h1, h2, h3, ul, ol, img, article, blockquote, table")) {
    return false;
  }
  // Thiếp dài nhất trong DB khoảng 250 ký tự; bài viết ngắn nhất đã hơn 1700.
  return collapse(e.text || "").trim().length <= 600;
}

/** Cụm này có phải vỏ UX Builder / danh thiếp / CTA — bỏ cả cụm? */
function isJunkContainer(node: Node): boolean {
  const tag = tagOf(node);
  if (!tag) return false;
  const cls = classOf(node);

  if (tag === "a" && CTA_CLASS.test(cls)) return true;
  if (BUILDER_CLASS.test(cls)) return true;

  // Thanh điều hướng thẻ: nhận bằng role="tablist" của thẻ bọc, hoặc bằng class
  // nav-* cộng thêm điều kiện có link "#tab_" bên trong cho chắc — tránh trùng
  // với danh sách nội dung thật tình cờ mang class "nav".
  const role = (el(node)?.getAttribute("role") || "").toLowerCase();
  if (role === "tablist") return true;
  if ((tag === "ul" || tag === "ol") && TAB_NAV_CLASS.test(cls)) {
    const e = el(node);
    if (e && /href\s*=\s*["']#tab/i.test(e.innerHTML || "")) return true;
  }

  // Danh thiếp cuối bài: 212/212 thẻ h4 trong DB đều là khối này (188 nằm
  // trong div.box, 24 nằm trơ ngoài nên phải nhận thêm bằng nội dung chữ).
  if (!CONTACT_CARD.test(node.text || "")) return false;
  // <h4> không bao giờ bọc nội dung → khớp chữ là bỏ được ngay.
  if (tag === "h4") return true;
  if (tag === "div") {
    const e = el(node);
    return e ? isContactCardOnly(e) : false;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Inline: dựng lại HTML gọn từ các node con
// ---------------------------------------------------------------------------

/**
 * Chuyển node con thành HTML inline chỉ gồm strong/em/u/a/br.
 *
 * Text lấy qua `.text` (đã giải mã &#8211; → –) rồi escape lại đúng ba ký tự
 * &<> — nhờ vậy 235 bản còn thực thể thô ra chữ Việt sạch, không phải dò
 * bảng entity bằng regex.
 */
function inlineOf(nodes: Node[]): string {
  let out = "";
  for (const n of nodes) {
    if (n.nodeType === NodeType.TEXT_NODE) {
      out += escapeText(collapse(n.text));
      continue;
    }
    const e = el(n);
    if (!e) continue; // bỏ comment
    if (isJunkContainer(e)) continue;

    const tag = (e.rawTagName || "").toLowerCase();

    if (DROP_CONTENT.has(tag)) {
      continue; // bỏ cả ruột — xem chú thích ở DROP_CONTENT
    }
    if (tag === "br") {
      out += "<br>";
      continue;
    }
    if (tag === "img") {
      continue; // ảnh là khối riêng, không nhúng trong đoạn văn
    }
    if (!INLINE_KEEP.has(tag)) {
      // span/font/div lạc trong đoạn: bóc vỏ, giữ chữ. `text-decoration:
      // underline` của theme cũ được nâng thành <u> để không mất ý nhấn.
      const underlined = /text-decoration\s*:\s*underline/i.test(
        e.getAttribute("style") || "",
      );
      const inner = inlineOf(e.childNodes);
      out += underlined && inner.trim() ? `<u>${inner}</u>` : inner;
      continue;
    }

    const norm = tag === "b" ? "strong" : tag === "i" ? "em" : tag;
    const inner = inlineOf(e.childNodes);
    if (!inner.trim()) continue;

    if (norm === "a") {
      const href = (e.getAttribute("href") || "").trim();
      // Link rỗng hoặc javascript: thì chỉ giữ chữ.
      if (!href || /^javascript:/i.test(href)) {
        out += inner;
      } else {
        out += `<a href="${escapeText(href).replace(/"/g, "&quot;")}">${inner}</a>`;
      }
    } else {
      out += `<${norm}>${inner}</${norm}>`;
    }
  }
  return out;
}

function tidyInline(html: string): string {
  // stripBareCss trước: 3 mô tả có CSS Flatsome nằm THẲNG trong thân bài, không
  // bọc <style> — `</div>\n\n#gap-595012054 { padding-top: 30px; }`. Không phải
  // thẻ nên walk() không loại được, nó đi vào khối như một đoạn văn và khách
  // đọc thấy đúng chữ "#gap-595012054 { padding-top: 30px; }" trên trang.
  return collapse(stripBareCss(html))
    .replace(/(<br>\s*)+$/gi, "")
    .replace(/^(\s*<br>)+/gi, "")
    .trim();
}

// ---------------------------------------------------------------------------
// HTML cũ  →  mảng khối
// ---------------------------------------------------------------------------

type Ctx = {
  blocks: DescriptionBlock[];
  deadImages: string[];
  /** Tên sản phẩm — để nhận ra <h1> lặp tên mà bỏ, chứ không bỏ mọi <h1>. */
  productName: string;
};

/**
 * <h1> này có phải tiêu đề lặp tên sản phẩm (bỏ), hay là tiêu đề mục thật (giữ,
 * hạ xuống h2)?
 *
 * Đo trên DB: 258 thẻ <h1>, 245 khớp đúng tên. Trong 13 cái còn lại, 10 là tên
 * sản phẩm viết lệch một chữ (typo "Cavier"/"Caviar", thiếu chữ trong tên) và 3
 * là tiêu đề mục thật của bài ("Thiết kế nổi bật và chuẩn xác", "100% Thủ công
 * …", "Dành cho ai?" — đều của day-ong-ho-da-bo-black). Bỏ sạch mọi <h1> là ăn
 * mất 3 tiêu đề đó, nên so theo tỉ lệ từ trùng thay vì so nguyên văn.
 */
function isDuplicateTitle(headingText: string, productName: string): boolean {
  const words = (s: string) =>
    collapse(s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " "))
      .trim()
      .split(" ")
      .filter(Boolean);
  const h = words(headingText);
  if (!h.length) return true; // <h1> rỗng: bỏ
  const name = new Set(words(productName));
  if (!name.size) return false;
  const hit = h.filter((w) => name.has(w)).length;
  return hit / h.length >= 0.6;
}

function pushList(
  ctx: Ctx,
  listEl: HTMLElement,
  ordered: boolean,
  level: 0 | 1,
  into?: ListItem[],
) {
  const items: ListItem[] = into ?? [];
  const nested = into !== undefined;

  /**
   * Chữ trần và thẻ inline lọt THẲNG vào <ul> (không qua <li>) — gặp thật ở
   * mô tả cũ vì theme đóng thẻ sai. Gom lại thành một gạch đầu dòng; bỏ qua
   * như trước là ăn mất chữ.
   */
  let stray: Node[] = [];
  const flushStray = () => {
    if (!stray.length) return;
    const html = tidyInline(inlineOf(stray));
    stray = [];
    if (html && !isBlank(html)) items.push({ html, level });
  };
  /** Chốt danh sách đang gom lại thành một khối, nhường chỗ cho khối khác. */
  const flushList = () => {
    flushStray();
    if (!nested && items.length) {
      ctx.blocks.push({ type: "list", ordered, items: [...items] });
      items.length = 0;
    }
  };

  for (const child of listEl.childNodes) {
    const t = tagOf(child);

    if (t === "li") {
      flushStray();
      const liEl = child as HTMLElement;

      // 3843/4680 thẻ <li> trong DB bọc chữ trong <p> (rác do soạn bằng
      // ChatGPT). Lấy phần chữ TRỰC TIẾP, chừa các <ul>/<ol> con ra.
      const own = liEl.childNodes.filter((c) => {
        const ct = tagOf(c);
        return ct !== "ul" && ct !== "ol";
      });
      const html = tidyInline(inlineOf(own));
      if (html && !isBlank(html)) items.push({ html, level });

      // Gạch đầu dòng con: 20 sản phẩm có cấu trúc 2 cấp thật (không phải rác).
      // Sâu hơn 2 cấp thì kẹp về cấp 1 — đọc trên web không phân biệt được nữa.
      for (const sub of liEl.childNodes) {
        const st = tagOf(sub);
        if (st === "ul" || st === "ol") {
          pushList(ctx, sub as HTMLElement, ordered, 1, items);
        }
      }
      continue;
    }

    if (t === "ul" || t === "ol") {
      // <ul> nằm ngay dưới <ul>, không qua <li>: đã có gạch đầu dòng phía trên
      // thì đây là danh sách con, chưa có gì thì coi như cùng cấp.
      flushStray();
      pushList(
        ctx,
        child as HTMLElement,
        ordered,
        items.length ? 1 : level,
        items,
      );
      continue;
    }

    if (child.nodeType === NodeType.TEXT_NODE) {
      stray.push(child);
      continue;
    }
    const e = el(child);
    if (!e || !t) continue;
    if (isJunkContainer(e)) continue;

    if (INLINE_KEEP.has(t) || t === "span" || t === "font") {
      stray.push(child);
      continue;
    }

    // Khối thật (h2/p/blockquote/div…) lọt vào giữa <ul> vì HTML cũ đóng thẻ
    // sai: chốt danh sách lại rồi xử lý khối đó ở ngoài để giữ đúng thứ tự đọc.
    flushList();
    walk([child], ctx);
  }

  flushStray();
  if (!nested && items.length) {
    ctx.blocks.push({ type: "list", ordered, items: [...items] });
    items.length = 0;
  }
}

function walk(nodes: Node[], ctx: Ctx) {
  for (const n of nodes) {
    if (n.nodeType === NodeType.TEXT_NODE) {
      // Chữ trần nằm ngoài mọi thẻ (hay gặp ở phần đuôi Flatsome) → thành đoạn.
      // Qua stripBareCss vì chính ở đây CSS trần lọt vào: Flatsome in luật CSS
      // như chữ thường ngay trong <div id="gap-…">, không bọc <style>, nên nó
      // thành một "đoạn văn" `#gap-765080616 { padding-top: 30px; }`.
      const t = collapse(stripBareCss(n.text)).trim();
      if (t) ctx.blocks.push({ type: "paragraph", html: escapeText(t) });
      continue;
    }
    const e = el(n);
    if (!e) continue;
    if (isJunkContainer(e)) continue;

    const tag = (e.rawTagName || "").toLowerCase();

    switch (tag) {
      // <h1>: 245/258 thẻ lặp đúng tên sản phẩm — storefront đã tự in <h1>
      // riêng ở cua-hang/[slug]/page.tsx nên giữ lại là lặp tiêu đề. Nhưng có
      // 3 thẻ là tiêu đề mục thật giữa bài → hạ xuống <h2>, không bỏ.
      case "h1": {
        const html = tidyInline(inlineOf(e.childNodes));
        if (!html || isBlank(html)) break;
        if (isDuplicateTitle(stripInline(html), ctx.productName)) break;
        ctx.blocks.push({ type: "heading", level: 2, html });
        break;
      }

      case "h2":
      case "h3":
      case "h4":
      case "h5":
      case "h6": {
        const html = tidyInline(inlineOf(e.childNodes));
        if (html && !isBlank(html)) {
          ctx.blocks.push({
            type: "heading",
            level: tag === "h2" ? 2 : 3,
            html,
          });
        }
        break;
      }

      case "ul":
      case "ol":
        pushList(ctx, e, tag === "ol", 0);
        break;

      case "blockquote": {
        // 79 bản dùng blockquote cho dòng "Xem thêm: <link nội bộ>" — nội dung
        // thật, giữ lại (link trỏ sang trang storefront đang sống).
        const html = tidyInline(inlineOf(e.childNodes));
        if (html && !isBlank(html)) ctx.blocks.push({ type: "quote", html });
        break;
      }

      case "img": {
        const src = (e.getAttribute("src") || "").trim();
        if (!src) break;
        if (DEAD_IMAGE.test(src)) {
          ctx.deadImages.push(src);
          break; // 403 — bỏ hẳn, khách đang thấy ảnh vỡ vì mấy thẻ này
        }
        ctx.blocks.push({
          type: "image",
          url: src,
          alt: (e.getAttribute("alt") || "").trim() || undefined,
        });
        break;
      }

      case "figure": {
        walk(e.childNodes, ctx);
        break;
      }

      case "p": {
        // 35 thẻ <p> chứa cả khối con (HTML hỏng do theme cũ tự đóng thẻ sai).
        // Có khối con thì đi xuyên xuống, không coi <p> là lá.
        const hasBlockChild = e.childNodes.some((c) => {
          const t = tagOf(c);
          return (
            t === "div" ||
            t === "ul" ||
            t === "ol" ||
            t === "blockquote" ||
            t === "table" ||
            /^h[1-6]$/.test(t)
          );
        });
        if (hasBlockChild) {
          walk(e.childNodes, ctx);
          break;
        }
        // 12/14 ảnh nằm trong <p>: tách ảnh ra thành khối riêng trước.
        const imgs = e.querySelectorAll("img");
        const html = tidyInline(inlineOf(e.childNodes));
        if (html && !isBlank(html)) ctx.blocks.push({ type: "paragraph", html });
        for (const im of imgs) walk([im], ctx);
        break;
      }

      case "br":
      case "hr":
      case "script":
      case "style":
      case "iframe":
      case "noscript":
        break;

      default:
        // div/section/span/table… : chỉ là vỏ, đi xuyên xuống lấy nội dung.
        walk(e.childNodes, ctx);
        break;
    }
  }
}

/** Gộp hai khối danh sách liền nhau cùng kiểu (do vỏ div cắt rời). */
function mergeAdjacentLists(blocks: DescriptionBlock[]): DescriptionBlock[] {
  const out: DescriptionBlock[] = [];
  for (const b of blocks) {
    const prev = out[out.length - 1];
    if (
      b.type === "list" &&
      prev &&
      prev.type === "list" &&
      prev.ordered === b.ordered
    ) {
      prev.items.push(...b.items);
      continue;
    }
    out.push(b);
  }
  return out;
}

/**
 * HTML mô tả cũ → mảng khối sạch.
 *
 * `productName` dùng để phân biệt <h1> lặp tên sản phẩm (bỏ) với <h1> là tiêu
 * đề mục thật giữa bài (giữ, hạ thành h2). Không truyền tên thì mọi <h1> đều
 * được coi là tiêu đề mục và giữ lại — thà thừa tiêu đề hơn mất nội dung.
 */
export function htmlToBlocks(
  html: string | null | undefined,
  productName?: string | null,
): {
  blocks: DescriptionBlock[];
  deadImages: string[];
} {
  if (!html || !String(html).trim()) return { blocks: [], deadImages: [] };
  const root = parse(String(html), {
    // Cho phép thẻ tự đóng sai kiểu WordPress vẫn dựng được cây.
    lowerCaseTagName: true,
    comment: false,
  });
  const ctx: Ctx = {
    blocks: [],
    deadImages: [],
    productName: String(productName || ""),
  };
  walk(root.childNodes, ctx);
  return { blocks: mergeAdjacentLists(ctx.blocks), deadImages: ctx.deadImages };
}

// ---------------------------------------------------------------------------
// Mảng khối  →  HTML sạch cho storefront
// ---------------------------------------------------------------------------

/**
 * In HTML tối giản: chỉ p / h2 / h3 / ul / ol / li / blockquote / img và thẻ
 * inline. Không class, không style — đúng bộ thẻ mà .prose-koi trong
 * koi-storefront/src/app/globals.css đã định kiểu sẵn.
 */
export function blocksToHtml(blocks: DescriptionBlock[] | null | undefined): string {
  if (!blocks || !blocks.length) return "";
  const parts: string[] = [];

  for (const b of blocks) {
    switch (b.type) {
      case "paragraph": {
        const h = tidyInline(b.html || "");
        if (h) parts.push(`<p>${h}</p>`);
        break;
      }
      case "heading": {
        const h = tidyInline(b.html || "");
        const lv = b.level === 3 ? 3 : 2;
        if (h) parts.push(`<h${lv}>${h}</h${lv}>`);
        break;
      }
      case "list": {
        const tag = b.ordered ? "ol" : "ul";
        const rows: string[] = [];
        // Gạch đầu dòng con phải nằm TRONG <li> cha (<li>cha<ul>…</ul></li>).
        // Đặt <ul> con làm em ruột của <li> là HTML sai: khi mở lại, bước phân
        // tích chỉ đọc <li> con trực tiếp nên toàn bộ dòng cấp 2 bay mất —
        // 20 sản phẩm có danh sách 2 cấp sẽ rụng hết dòng con ở lần lưu sau.
        let openSub = false;
        let liOpen = false;
        const closeSub = () => {
          if (openSub) {
            rows.push(`</${tag}>`);
            openSub = false;
          }
        };
        const closeLi = () => {
          if (liOpen) {
            rows.push(`</li>`);
            liOpen = false;
          }
        };

        for (const it of b.items || []) {
          const h = tidyInline(it.html || "");
          if (!h) continue;
          const lv = it.level === 1 ? 1 : 0;

          if (lv === 0) {
            closeSub();
            closeLi();
            rows.push(`<li>${h}`);
            liOpen = true;
            continue;
          }
          // Dòng con mà chưa có dòng cha (dữ liệu cũ lệch cấp): mở một <li>
          // rỗng làm cha để cây vẫn hợp lệ, không nuốt chữ.
          if (!liOpen) {
            rows.push(`<li>`);
            liOpen = true;
          }
          if (!openSub) {
            rows.push(`<${tag}>`);
            openSub = true;
          }
          rows.push(`<li>${h}</li>`);
        }
        closeSub();
        closeLi();
        if (rows.length) parts.push(`<${tag}>${rows.join("")}</${tag}>`);
        break;
      }
      case "quote": {
        const h = tidyInline(b.html || "");
        if (h) parts.push(`<blockquote><p>${h}</p></blockquote>`);
        break;
      }
      case "image": {
        const url = (b.url || "").trim();
        if (!url) break;
        const alt = escapeText(b.caption ? stripInline(b.caption) : b.alt || "")
          .replace(/"/g, "&quot;");
        const img = `<img src="${escapeText(url).replace(/"/g, "&quot;")}" alt="${alt}">`;
        const cap = b.caption ? tidyInline(b.caption) : "";
        parts.push(
          cap ? `<figure>${img}<figcaption>${cap}</figcaption></figure>` : img,
        );
        break;
      }
    }
  }
  return parts.join("\n");
}

/**
 * Chữ trần từ HTML inline: bỏ thẻ VÀ giải mã thực thể.
 *
 * Phải giải mã, vì `caption` được lưu dưới dạng HTML (dấu & đã escape thành
 * `&amp;`). Nếu chỉ bỏ thẻ rồi đưa qua escapeText để dựng thuộc tính alt thì
 * dấu & bị escape lần hai: chú thích "Mặt da thật & đường may" đo được
 * `alt="Mặt da thật &amp;amp; đường may"`, trình đọc màn hình và phần chữ thay
 * ảnh lỗi đọc thành đúng chữ "&amp;".
 */
function stripInline(html: string): string {
  return collapse(decodeEntities(html.replace(/<[^>]+>/g, " "))).trim();
}

/** Giải mã thực thể HTML về ký tự thật — chỉ dùng cho đường ra chữ trần. */
function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) =>
      String.fromCodePoint(parseInt(h, 16)),
    )
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    // &amp; sau cùng: giải mã trước thì "&amp;lt;" thành "<" — chuỗi người bán
    // gõ đúng chữ "&lt;" lại biến thành thẻ.
    .replace(/&amp;/gi, "&");
}

/** Chữ trần của mảng khối — dùng để so sánh "có mất nội dung không". */
export function blocksToPlainText(blocks: DescriptionBlock[]): string {
  const out: string[] = [];
  for (const b of blocks) {
    if (b.type === "list") {
      for (const it of b.items || []) out.push(stripInline(it.html || ""));
    } else if (b.type === "image") {
      if (b.caption) out.push(stripInline(b.caption));
    } else {
      out.push(stripInline((b as any).html || ""));
    }
  }
  return collapse(out.join(" ")).trim();
}

// ---------------------------------------------------------------------------
// Chuẩn hoá khối do client gửi lên (admin có quyền, nhưng HTML này sẽ được
// storefront render bằng dangerouslySetInnerHTML → vẫn phải lọc)
// ---------------------------------------------------------------------------

/** Lọc HTML inline do client gửi về đúng bộ thẻ cho phép. */
function sanitizeInline(html: unknown): string {
  if (typeof html !== "string" || !html.trim()) return "";
  const root = parse(html, { lowerCaseTagName: true, comment: false });
  return tidyInline(inlineOf(root.childNodes));
}

export function normalizeBlocks(input: unknown): DescriptionBlock[] {
  if (!Array.isArray(input)) return [];
  const out: DescriptionBlock[] = [];

  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const type = (raw as any).type;

    if (type === "paragraph") {
      const html = sanitizeInline((raw as any).html);
      if (html) out.push({ type: "paragraph", html });
    } else if (type === "heading") {
      const html = sanitizeInline((raw as any).html);
      const level = Number((raw as any).level) === 3 ? 3 : 2;
      if (html) out.push({ type: "heading", level, html });
    } else if (type === "list") {
      const items: ListItem[] = [];
      for (const it of Array.isArray((raw as any).items) ? (raw as any).items : []) {
        const html = sanitizeInline(it?.html);
        if (html) items.push({ html, level: Number(it?.level) === 1 ? 1 : 0 });
      }
      if (items.length) {
        out.push({ type: "list", ordered: !!(raw as any).ordered, items });
      }
    } else if (type === "quote") {
      const html = sanitizeInline((raw as any).html);
      if (html) out.push({ type: "quote", html });
    } else if (type === "image") {
      const url = String((raw as any).url || "").trim();
      // Chỉ nhận http(s). Chặn luôn ảnh /wp-content vì đang 403 — không cho
      // dựng lại đúng cái lỗi vừa dọn.
      if (!/^https?:\/\//i.test(url) || DEAD_IMAGE.test(url)) continue;
      const alt = String((raw as any).alt || "").trim() || undefined;
      const caption = sanitizeInline((raw as any).caption) || undefined;
      out.push({ type: "image", url, alt, caption });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Kiểm kê rác — cho nhãn "cần dọn" và báo cáo dọn hàng loạt
// ---------------------------------------------------------------------------

/**
 * Chữ mà bộ dọn CHỦ Ý bỏ đi: tiêu đề <h1> lặp tên, vỏ UX Builder, nút CTA
 * Facebook, danh thiếp cuối bài. Dùng cho hai việc:
 *   1. báo cáo "dọn hàng loạt" cho người bán xem trước sẽ mất chữ gì,
 *   2. kiểm chứng: mọi đoạn chữ biến mất phải nằm trong chuỗi này, nếu không
 *      là bộ dọn ăn mất nội dung thật.
 */
export function removedText(
  html: string | null | undefined,
  productName?: string | null,
): string {
  if (!html || !String(html).trim()) return "";
  const root = parse(String(html), { lowerCaseTagName: true, comment: false });
  const name = String(productName || "");
  const out: string[] = [];

  /**
   * Lấy chữ của một cụm bị bỏ, TRỪ phần mã máy nằm bên trong.
   *
   * Không dùng thẳng `e.text` được: <style> hay <script> thường nằm LỌT TRONG
   * vỏ UX Builder, nên `.text` của cái vỏ kéo theo cả CSS. Thực tế đo được:
   * `#text-box-2139779447 { width: 82%; }` chen vào giữa báo cáo, đẩy lời cảm
   * nhận thật của khách xuống dưới.
   */
  const proseOf = (e: HTMLElement): string => {
    const parts: string[] = [];
    const gather = (nodes: Node[]) => {
      for (const n of nodes) {
        if (n.nodeType === NodeType.TEXT_NODE) {
          parts.push(n.text || "");
          continue;
        }
        const c = el(n);
        if (!c) continue;
        if (DROP_CONTENT.has((c.rawTagName || "").toLowerCase())) continue;
        gather(c.childNodes);
      }
    };
    gather(e.childNodes);
    return parts.join(" ");
  };

  const visit = (nodes: Node[]) => {
    for (const n of nodes) {
      const e = el(n);
      if (!e) continue;
      const tag = (e.rawTagName || "").toLowerCase();
      if (tag === "h1") {
        // Chỉ tiêu đề lặp tên bị bỏ; tiêu đề mục thật được giữ (hạ thành h2).
        if (isDuplicateTitle(stripInline(e.text || ""), name)) {
          out.push(e.text || "");
        }
        continue;
      }
      // Mã máy (CSS/JS) cũng bị bỏ, nhưng KHÔNG kể vào báo cáo: người bán đọc
      // báo cáo để biết "mình mất câu chữ nào", còn một khối CSS thì không phải
      // câu chữ — kể vào chỉ làm loãng, che mất đoạn cần cứu.
      if (DROP_CONTENT.has(tag)) {
        continue;
      }
      if (isJunkContainer(e)) {
        out.push(proseOf(e));
        continue; // cả cụm bị bỏ, không cần đi sâu thêm
      }
      visit(e.childNodes);
    }
  };
  visit(root.childNodes);
  return collapse(stripBareCss(out.join(" "))).trim();
}

export function auditHtml(html: string | null | undefined): DescriptionAudit {
  const empty: DescriptionAudit = {
    isLegacy: false,
    duplicateH1: 0,
    builderShell: 0,
    inlineStyle: 0,
    authoringAttrs: 0,
    htmlEntities: 0,
    ctaButton: 0,
    brokenImages: 0,
    brokenImageUrls: [],
  };
  if (!html || !String(html).trim()) return empty;
  const s = String(html);

  const count = (re: RegExp) => (s.match(re) || []).length;
  const brokenImageUrls = [
    ...s.matchAll(/<img\b[^>]*src\s*=\s*["']([^"']*\/wp-content\/[^"']*)["']/gi),
  ].map((m) => m[1]);

  const a: DescriptionAudit = {
    isLegacy: false,
    duplicateH1: count(/<h1\b/gi),
    builderShell: count(
      /class\s*=\s*["'][^"']*\b(row-slider|large-columns-\d|box-text-inner|person-name|has-hover)\b/gi,
    ),
    inlineStyle: count(/\sstyle\s*=\s*["']/gi),
    authoringAttrs: count(/\sdata-(start|end|flickity-options)\s*=/gi),
    htmlEntities: count(/&(#\d+|nbsp|amp|#x[0-9a-f]+);/gi),
    ctaButton: count(/class\s*=\s*["'][^"']*\bbutton\b/gi),
    brokenImages: brokenImageUrls.length,
    brokenImageUrls,
  };
  a.isLegacy =
    a.duplicateH1 +
      a.builderShell +
      a.inlineStyle +
      a.authoringAttrs +
      a.ctaButton +
      a.brokenImages >
    0;
  return a;
}

/**
 * Dọn một mô tả: HTML cũ → khối → HTML sạch. Trả cả hai để lưu một lượt.
 * Đây là hàm mà cả "dọn khi mở modal" và "dọn hàng loạt" đều gọi.
 */
export function cleanDescriptionHtml(
  html: string | null | undefined,
  productName?: string | null,
) {
  const { blocks, deadImages } = htmlToBlocks(html, productName);
  return {
    blocks,
    html: blocksToHtml(blocks),
    deadImages,
    audit: auditHtml(html),
  };
}
