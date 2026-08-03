/**
 * Vị từ tìm kiếm sản phẩm — DÙNG CHUNG cho mặt tiền (ShopService) và trang admin
 * (ProductService).
 *
 * Ở src/common vì hai đường cùng cần y một cách hiểu từ khoá. Trước đây mỗi bên
 * tự viết một `OR` riêng và CẢ HAI đều sai giống nhau:
 *
 *  1. Cột `name` (và `technicalSpecs`) là cột TEXT chứa nguyên văn JSON
 *     `{"vi":"Ví da..."}` — Prisma chỉ parse ở middleware, trong DB vẫn là chuỗi.
 *     Nên `name contains 'vi'` khớp CÁI KHOÁ ở cả 324 dòng: ?search=vi trả về
 *     TOÀN BỘ shop. Mà "vi" đúng là cách khách gõ "ví" — nhóm hàng bán chạy thứ
 *     3 và 4 (vi-da-cho-nu 29 mẫu, vi-da-cho-nam 27 mẫu).
 *
 *  2. Cả chuỗi từ khoá bị nhét vào MỘT `contains` duy nhất, nên mọi truy vấn
 *     nhiều từ không dấu đều ra 0 dù hàng có thật. Đã đo trên dữ liệu thật:
 *     "vi da nam"=0, "tui nu"=0, "day dong ho"=0, "ca sau"=0, "vi da"=0.
 *     Khách Việt gõ không dấu là chuyện thường, tức là ô tìm kiếm gần như chỉ
 *     hoạt động khi gõ đủ dấu và đúng một từ.
 *
 * Không dùng extension `unaccent`: Supabase có sẵn để cài nhưng CHƯA cài, mà tài
 * khoản `postgres` ở đây không phải superuser; hơn nữa unaccent() là STABLE chứ
 * không phải IMMUTABLE nên Postgres từ chối dùng nó cho cột sinh. Bỏ dấu bằng
 * translate() trong DB + normalize() trong JavaScript, cùng một bảng chữ.
 *
 * Lỗ hổng slug đã LẤP bằng cột `searchText`: Postgres tự tính bản không dấu của
 * `name` (GENERATED ALWAYS AS … STORED, xem migration 20260803150000). Trước khi
 * có nó, 51 sản phẩm (16%) gõ đủ tên không dấu vẫn không ra, vì bộ sinh slug cũ
 * làm rụng chữ hoa có dấu và 120/324 slug đang có bị sai — mà slug là URL Google
 * đã đánh chỉ mục nên KHÔNG viết lại. Đo sau khi thêm cột: "op lung" 0 → 19,
 * "vi dung the" 0 → 10, "do den" 0 → 2.
 */
import { Prisma } from "@prisma/client";

/**
 * Token KHÔNG được dò vào các cột chứa JSON (`technicalSpecs`).
 *
 * Chặn ĐÍCH DANH từng chuỗi, KHÔNG dùng quy tắc "token ngắn thì bỏ": đã đo, kiểu
 * đó làm "ốp lưng" tụt từ 19 kết quả xuống 0 vì token "op" bị chặn oan.
 * `name` không còn bị dò trực tiếp nữa (đã có searchText) nên danh sách này giờ
 * chỉ còn dùng cho technicalSpecs — vẫn là cột TEXT chứa JSON.
 */
const TOKEN_TRUNG_KHOA_JSON = new Set(["v", "i", "vi", "e", "n", "en"]);

/** Khách dán cả đoạn văn thì đừng dựng 50 điều kiện AND. */
const TOI_DA_TOKEN = 6;

/** Bỏ dấu tiếng Việt. đ/Đ không phải dấu tổ hợp nên phải xử riêng. */
export function boDauTiengViet(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

/**
 * Cắt từ khoá thành token, mỗi token giữ 2 dạng:
 *  - `tho`: nguyên văn, CÒN dấu — để dò cột `name` (bắt được chữ mà slug làm
 *    rụng, ví dụ "Ốp" → slug chỉ còn "p").
 *  - `sach`: bỏ dấu, chỉ còn a-z0-9 — để dò `slug`, `sku`, slug danh mục, vốn
 *    đều đã ở dạng không dấu.
 */
export function tachTuKhoa(raw: string): { tho: string; sach: string }[] {
  const tokens: { tho: string; sach: string }[] = [];
  for (const tho of String(raw ?? "").split(/\s+/)) {
    const sach = boDauTiengViet(tho)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "");
    if (sach) tokens.push({ tho: tho.trim(), sach });
  }
  return tokens.slice(0, TOI_DA_TOKEN);
}

/**
 * Dựng danh sách điều kiện tìm kiếm để gán vào `where.AND`.
 *
 * Trả `undefined` khi từ khoá không còn token nào dùng được (khách gõ toàn
 * khoảng trắng, "{}", "%%%"…). Bên gọi PHẢI coi `undefined` là "không lọc gì" —
 * biến nó thành lọc rỗng thì khách nhận trang trắng.
 *
 * Mỗi token phải khớp ở ÍT NHẤT một đường (OR trong token), và các token AND với
 * nhau. Đường khớp:
 *  - `searchText`: bản không dấu của tên, do Postgres tự tính. Đây là đường
 *    CHÍNH — nó bắt được cả chữ mà slug làm rụng ("op lung", "vi dung the").
 *  - `slug`, `sku`: mã hàng và đường dẫn khách có thể dán thẳng vào ô tìm.
 *  - slug DANH MỤC: khách hay gõ tên khu hàng vào ô tìm. Đo được "tui da cho nu"
 *    0 → 48, "day lung nam" 0 → 20, "day da dong ho" 1 → 43, trong khi "epsom"
 *    và "ca sau" không đổi — thêm đúng hàng, không thêm nhiễu.
 *
 * KHÔNG dò cột `name` nữa: nó là TEXT chứa JSON `{"vi":…}` nên vừa khớp cái khoá
 * (gõ "vi" ra cả shop), vừa còn dấu nên gõ không dấu không ăn. searchText thay
 * nó ở cả hai mặt.
 *
 * `themTechnicalSpecs` chỉ bật cho admin: khách không cần tìm theo thông số kỹ
 * thuật, mà cột đó cũng là JSON nên mở ra ở mặt tiền chỉ tăng nhiễu.
 */
export function dieuKienTimSanPham(
  raw: string,
  themTechnicalSpecs = false,
): Prisma.KoiProductWhereInput[] | undefined {
  const tokens = tachTuKhoa(raw);
  if (!tokens.length) return undefined;

  return tokens.map(({ tho, sach }) => {
    const nhanh: Prisma.KoiProductWhereInput[] = [
      { searchText: { contains: sach } },
      { slug: { contains: sach, mode: "insensitive" } },
      { sku: { contains: sach, mode: "insensitive" } },
      {
        categoryLinks: {
          some: {
            category: { slug: { contains: sach, mode: "insensitive" } },
          },
        },
      },
    ];
    if (themTechnicalSpecs && !TOKEN_TRUNG_KHOA_JSON.has(sach)) {
      nhanh.push({ technicalSpecs: { contains: tho, mode: "insensitive" } });
    }
    return { OR: nhanh };
  });
}

/**
 * Gộp điều kiện vào `where.AND` mà KHÔNG đè cái đã có.
 *
 * ProductService đã dùng `where.AND` cho lọc loại da và cho nhóm "thiếu thông
 * tin"; gán thẳng `where.AND = ...` ở đó là âm thầm xoá bộ lọc khách đang bật.
 */
export function gopVaoAnd(
  where: Prisma.KoiProductWhereInput,
  themVao: Prisma.KoiProductWhereInput[],
): void {
  if (!themVao.length) return;
  const dangCo = Array.isArray(where.AND)
    ? where.AND
    : where.AND
      ? [where.AND]
      : [];
  where.AND = [...dangCo, ...themVao];
}
