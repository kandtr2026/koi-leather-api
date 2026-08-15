/**
 * Bóc và bọc lại lớp JSON hai thứ tiếng của bảng koi_products.
 *
 * VÌ SAO PHẢI CÓ: `name` và `description` của sản phẩm KHÔNG lưu chữ trần. Cả
 * 336/336 dòng trên dữ liệu thật đang ở dạng {"vi":"<p>..."} — đã đếm. Còn
 * metaTitle/metaDescription thì lưu chữ trần (0/336 dạng JSON), và các bảng
 * posts/pages/tags/post_terms cũng chữ trần cả.
 *
 * Hai việc bắt buộc, sai một trong hai là hỏng:
 *
 *  1. LÚC HIỆN cho chủ shop và lúc gửi cho AI: phải BÓC ra. Không bóc thì AI
 *     nhận vào cả dấu ngoặc với khoá "vi" rồi viết lại nguyên khối đó theo cách
 *     của nó — hỏng JSON, và shop.service.ts:30 gặp chuỗi mở đầu bằng { mà parse
 *     không được sẽ in ra nguyên văn dấu ngoặc trên trang bán hàng.
 *
 *  2. LÚC GHI: phải BỌC LẠI đúng hình cũ. Ghi chữ trần vào thì hiện tại vẫn hiện
 *     đúng (hàm text() có đường lui cho chuỗi thường), nhưng dòng đó thành khác
 *     hình so với 335 dòng còn lại; chỗ nào về sau parse chặt là vỡ, mà lúc đó
 *     không ai lần ra vì sao chỉ đúng một sản phẩm bị.
 *
 * Hình cũ đọc từ GIÁ TRỊ ĐANG NẰM TRONG DB ngay lúc ghi, không tin theo thứ
 * trình duyệt gửi lên — client sửa được, DB thì không.
 *
 * VÌ SAO HAI HÀM NÀY NHẬN `unknown`, KHÔNG CHỈ CHUỖI:
 * PrismaService có middleware $use (prisma.service.ts:58) TỰ PARSE JSON thành
 * object lúc đọc và tự stringify lúc ghi, cho đúng danh sách JSON_FIELDS — trong
 * đó có KoiProduct.name và KoiProduct.description, tức hai trường chính của mọi
 * trang sản phẩm. Nên `prisma.koiProduct.findUnique()` trả về { vi: "..." }
 * chứ không phải chuỗi '{"vi":"..."}'.
 *
 * Ép String() một object như thế ra đúng "[object Object]", và đó là lỗi đã lên
 * tới production: trang sửa hiện "[object Object]" thay cho tên sản phẩm. Tệ hơn
 * phần hiện sai: "[object Object]" không mở đầu bằng { nên bocLai() coi là chữ
 * trần và ghi chữ trần vào cột đang là JSON — đúng cái sai mà cả tệp này sinh ra
 * để chặn. Test cũ không bắt được vì chúng chỉ truyền chuỗi, và bản quét 2301
 * trường dùng SQL thô — SQL thô trả chuỗi, middleware trả object.
 *
 * Nên nhận `unknown`: đúng cả khi giá trị đi qua PrismaService (object) lẫn khi
 * đi qua $queryRaw hay các bảng không nằm trong JSON_FIELDS (chuỗi).
 */

/** Bóc lớp JSON nếu có. Chuỗi thường trả về y nguyên. */
export function goBoc(v: unknown): string | null {
  if (v == null) return null;

  // Object do middleware của PrismaService parse sẵn. Đọc thẳng, không String().
  if (typeof v === "object") {
    if (Array.isArray(v)) return JSON.stringify(v);
    const o = v as Record<string, unknown>;
    const chu = o.vi ?? o.en;
    if (typeof chu === "string") return chu;
    // Cùng lý do với nhánh chuỗi bên dưới: object rỗng hay không có khoá chữ
    // thì site đang hiện rỗng — trả "" cho nhất quán.
    return "";
  }

  const s = String(v);
  if (!s.trim().startsWith("{")) return s;
  try {
    const o = JSON.parse(s) as Record<string, unknown>;
    // Giữ đúng thứ tự ưu tiên của shop.service.ts:33 — vi trước, en sau.
    const chu = o.vi ?? o.en;
    if (typeof chu === "string") return chu;
    // JSON hợp lệ nhưng không có chữ nào bên trong. Có thật: 7 sản phẩm đang có
    // description đúng bằng "{}". Trả về chuỗi RỖNG, không trả nguyên văn "{}",
    // vì đó chính xác là điều site đang làm (shop.service.ts:33 → o.vi || o.en
    // || ""). Trả "{}" thì admin hiện dấu ngoặc như thể đó là nội dung, và AI
    // được giao viết lại hai ký tự dấu ngoặc.
    return "";
  } catch {
    // Không phải JSON hợp lệ, chỉ tình cờ mở đầu bằng {. Trả nguyên văn.
    return s;
  }
}

/**
 * Bọc chữ mới theo hình của chữ cũ.
 *
 * `cu` là giá trị đang nằm trong DB. JSON (chuỗi hoặc object qua middleware) thì
 * trả chuỗi JSON (giữ nguyên các khoá khác như "en" nếu dòng đó có). Chữ trần
 * thì trả chữ trần. Luôn trả CHUỖI — không trả object, để không phụ thuộc vào
 * middleware khi ghi.
 */
export function bocLai(cu: unknown, moi: string | null): string | null {
  if (moi == null) return null;

  // Object (giá trị đã qua middleware PrismaService). Giữ các khoá khác, ghi vào
  // khoá đang có chữ, trả về chuỗi JSON.
  if (typeof cu === "object" && cu !== null && !Array.isArray(cu)) {
    const o = cu as Record<string, unknown>;
    const khoa =
      typeof o.vi === "string" ? "vi" : typeof o.en === "string" ? "en" : "vi";
    return JSON.stringify({ ...o, [khoa]: moi });
  }

  const s = cu == null ? "" : String(cu);
  if (!s.trim().startsWith("{")) return moi;
  try {
    const o = JSON.parse(s) as Record<string, unknown>;
    if (typeof o !== "object" || o === null || Array.isArray(o)) return moi;
    // Ghi vào đúng khoá đang có chữ. Dòng chỉ có "en" thì sửa "en", không tự
    // dựng thêm "vi" rồi để hai bản chõi nhau.
    const khoa =
      typeof o.vi === "string" ? "vi" : typeof o.en === "string" ? "en" : "vi";
    return JSON.stringify({ ...o, [khoa]: moi });
  } catch {
    return moi;
  }
}
