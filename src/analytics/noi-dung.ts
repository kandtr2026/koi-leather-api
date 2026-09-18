/**
 * Đọc lượt xem trang thành "khách đang đọc SẢN PHẨM nào, BÀI VIẾT nào".
 *
 * Vì sao cần tách riêng khỏi `summary().topPages`: topPages trả về đường dẫn
 * thô, mà đường dẫn trên koileather.com không tự nói nó là cái gì —
 *
 *   /cua-hang/tui-loom-tui-xach-da-bo/   → TRANG CHI TIẾT SẢN PHẨM
 *   /san-pham/tui-da-cho-nu/             → trang DANH MỤC (không phải sản phẩm!)
 *   /dich-vu-lam-tui-da-theo-yeu-cau/    → BÀI VIẾT (WordPress đặt ngay gốc)
 *   /lookbook/                           → trang tĩnh
 *
 * Hai dòng giữa dễ đọc nhầm nhất: tiền tố `/san-pham/` nghe như sản phẩm nhưng
 * là danh mục, còn bài viết thì KHÔNG có tiền tố nào — nằm trần ở gốc tên miền
 * vì bản WordPress cũ để vậy và storefront giữ nguyên đường dẫn để khỏi mất thứ
 * hạng (xem route bắt-tất `src/app/(vi)/[slug]/page.tsx` bên koi-storefront).
 *
 * Nên không thể đoán loại nội dung từ mỗi đường dẫn: hàm ở đây chỉ bóc ra
 * *ứng viên* slug, còn kết luận "đây là bài viết" phải do người gọi đối chiếu
 * với bảng `posts` thật. Đoán bằng tên là cách chắc chắn nhất để một ngày nào
 * đó thêm trang tĩnh mới rồi thấy nó hiện trong bảng "bài viết".
 */

/**
 * `san-pham` là kết luận chắc chắn (đường dẫn có tiền tố riêng).
 * `trang-goc` mới chỉ là ỨNG VIÊN bài viết — phải soi bảng posts mới biết.
 */
export type LoaiKhoa = "san-pham" | "trang-goc";

export interface KhoaNoiDung {
  loai: LoaiKhoa;
  slug: string;
  /** Bản tiếng Việt hay bản tiếng Anh của cùng một sản phẩm. */
  ngonNgu: "vi" | "en";
}

/** Một dòng đã gom sẵn theo đường dẫn, lấy từ SQL. */
export interface LuotTheoTrang {
  path: string;
  luot: number;
  khach: number;
  moiNhat: Date | null;
}

/** Một nội dung (sản phẩm hoặc bài viết) sau khi gộp mọi đường dẫn của nó. */
export interface CumNoiDung {
  slug: string;
  loai: LoaiKhoa;
  luot: number;
  khach: number;
  moiNhat: Date | null;
  /** Mọi đường dẫn đã gộp vào cụm này — để hiện tooltip khi số trông lạ. */
  duongDan: string[];
}

/**
 * Bóc slug ra khỏi một đường dẫn lượt xem.
 *
 * Trả null khi đường dẫn không phải chi tiết sản phẩm cũng không phải trang một
 * tầng ở gốc (ví dụ `/san-pham/vi-da-cho-nam/`, `/en/bespoke/`, `/`).
 */
export function docKhoa(duongDan: string): KhoaNoiDung | null {
  // Bỏ query/hash phòng khi dòng cũ lọt qua trước lúc chuanHoa() ra đời, rồi
  // cắt gạch chéo hai đầu để `/blog` và `/blog/` ra cùng một khoá.
  const sach = (duongDan || "").split("?")[0].split("#")[0];
  const doan = sach.split("/").filter(Boolean);
  if (!doan.length) return null;

  // /cua-hang/<slug> — chi tiết sản phẩm bản tiếng Việt.
  // ĐÚNG hai đoạn: /cua-hang/ (một đoạn) là trang danh sách, không phải sản phẩm.
  if (doan.length === 2 && doan[0] === "cua-hang") {
    return { loai: "san-pham", slug: doan[1], ngonNgu: "vi" };
  }

  // /en/shop/<slug> — cùng sản phẩm đó, bản tiếng Anh.
  if (doan.length === 3 && doan[0] === "en" && doan[1] === "shop") {
    return { loai: "san-pham", slug: doan[2], ngonNgu: "en" };
  }

  // Một đoạn ở gốc: có thể là bài viết, có thể là trang tĩnh. Người gọi phân xử.
  if (doan.length === 1) {
    return { loai: "trang-goc", slug: doan[0], ngonNgu: "vi" };
  }

  return null;
}

/**
 * Gộp các dòng theo-đường-dẫn thành các cụm theo-nội-dung.
 *
 * ⚠️ `khach` là TỔNG khách riêng của từng đường dẫn cộng lại, không phải số
 * khách riêng của cụm. Một người xem cả `/cua-hang/x/` lẫn `/en/shop/x/` trong
 * cùng ngày sẽ được đếm hai lần. Cố ý chấp nhận: đếm đúng tuyệt đối đòi hỏi kéo
 * nguyên danh sách visitorHash của từng cụm về, tốn gấp bội cho một sai số mà đo
 * trên dữ liệu thật chỉ rơi vào vài sản phẩm có bản tiếng Anh (cao nhất 6 lượt).
 * `luot` thì luôn chính xác.
 *
 * Trả về cả `khac` — những đường dẫn không bóc được slug — để người gọi không
 * âm thầm đánh rơi lưu lượng. Trang danh mục `/san-pham/*` nằm hết ở đây.
 */
export function gomNoiDung(dong: LuotTheoTrang[]): {
  cum: Map<string, CumNoiDung>;
  khac: LuotTheoTrang[];
} {
  const cum = new Map<string, CumNoiDung>();
  const khac: LuotTheoTrang[] = [];

  for (const d of dong) {
    const khoa = docKhoa(d.path);
    if (!khoa) {
      khac.push(d);
      continue;
    }
    // Khoá phải kèm loại: một slug sản phẩm và một slug bài viết trùng tên là
    // chuyện có thật (sản phẩm "day-dong-ho-da-ca-sau" và bài viết cùng chủ đề).
    const k = `${khoa.loai}:${khoa.slug}`;
    const co = cum.get(k);
    if (co) {
      co.luot += d.luot;
      co.khach += d.khach;
      co.duongDan.push(d.path);
      if (d.moiNhat && (!co.moiNhat || d.moiNhat > co.moiNhat))
        co.moiNhat = d.moiNhat;
    } else {
      cum.set(k, {
        slug: khoa.slug,
        loai: khoa.loai,
        luot: d.luot,
        khach: d.khach,
        moiNhat: d.moiNhat,
        duongDan: [d.path],
      });
    }
  }

  return { cum, khac };
}

/**
 * Tính mốc ĐẦU và mốc CUỐI của khoảng thời gian cần đọc.
 *
 * A Khoa đặt hàng 18/09/2026 (góp ý #5): "Cho khung ngày hôm nay, với ngày hôm
 * qua đi. Để biết khách đang xem gì trong hôm nay để mà tiếp đón."
 *
 * Vì sao phải có hàm riêng chứ không cộng trừ tại chỗ: mọi khoảng cũ đều là "N
 * ngày tính tới BÂY GIỜ" nên chỉ cần một mốc đầu. "Hôm qua" là khoảng đầu tiên
 * có mốc cuối thật — bỏ mốc cuối thì nó lặng lẽ biến thành "hôm qua tới giờ",
 * tức là gộp luôn hôm nay vào và A Khoa đọc ra một con số không sai rõ ràng,
 * chỉ hơi to. Lỗi kiểu đó không ai phát hiện được bằng mắt.
 *
 * `luiCuoi` = khoảng kết thúc lúc đầu của ngày (luiCuoi) ngày trước; 0 nghĩa là
 * chạy tới bây giờ. `dauNgay`/`bayGio` truyền vào để test được không cần đồng hồ
 * thật.
 *
 *   hôm nay          soNgay=1  luiCuoi=0 -> [đầu hôm nay, bây giờ)
 *   hôm qua          soNgay=1  luiCuoi=1 -> [đầu hôm qua, đầu hôm nay)
 *   7 ngày gần nhất  soNgay=7  luiCuoi=0 -> [đầu ngày thứ 7 trước, bây giờ)
 */
export function mocThoiGian(
  soNgay: number,
  luiCuoi: number,
  dauNgay: (luiNgay: number) => Date,
  bayGio: () => Date = () => new Date(),
): { tu: Date; den: Date } {
  return {
    tu: dauNgay(luiCuoi + soNgay - 1),
    den: luiCuoi > 0 ? dauNgay(luiCuoi - 1) : bayGio(),
  };
}

/**
 * Khoá định danh MỘT dòng trên mặt bảng, dùng chung cho cả ba nhóm.
 *
 * Sản phẩm/bài viết gộp theo slug (nhiều đường dẫn về một dòng), còn "Trang
 * khác" thì mỗi đường dẫn là một dòng nên lấy luôn đường dẫn làm khoá. Tiền tố
 * `trang:` để một trang tĩnh tên "x" không đụng khoá với bài viết slug "x".
 */
export function khoaDong(duongDan: string): string {
  const k = docKhoa(duongDan);
  return k ? `${k.loai}:${k.slug}` : `trang:${duongDan}`;
}

/**
 * Một dòng trong nhóm "Trang khác" (trang chủ, danh mục, trang tĩnh).
 *
 * Khai ở tầng module chứ KHÔNG trong thân noiDung(): kiểu khai trong hàm không
 * đặt tên được khi sinh .d.ts, `tsc --noEmit` cho qua nhưng `nest build` (có
 * declaration) gãy với TS4053/TS4055 — tức là lỗi chỉ lộ ra lúc build deploy.
 */
export interface DongTrangKhac {
  duongDan: string;
  luot: number;
  khach: number;
  nguon: Record<string, number>;
  thietBi: Record<string, number>;
}

/** Một dòng thô đã gom theo (đường dẫn × một chiều nào đó: nguồn, thiết bị…). */
export interface LuotChiaNho {
  path: string;
  /** Giá trị của chiều đang bóc: "google_organic", "mobile"… */
  nhom: string;
  luot: number;
}

/**
 * Bóc lượt xem của từng dòng theo một chiều (nguồn khách, thiết bị…).
 *
 * A Khoa đặt hàng 15/09/2026 (góp ý #4, gửi ngay tại màn Thống kê traffic):
 * "Khi rê chuột lên trên thì hiện lên Organic bao nhiu, Ads bao nhiu… Để t xem
 * nhanh cần chỉnh cái gì."
 *
 * Chỉ đếm LƯỢT, không đếm khách riêng: khách riêng cộng theo chiều thì một
 * người vào hai lần từ hai nguồn bị đếm hai lần, mà tổng các phần lại không
 * bằng con số khách in trên dòng — hai số đá nhau ngay trước mắt người đọc.
 * Lượt thì cộng bao nhiêu chiều cũng luôn khớp với tổng.
 */
export function gomChieu(
  dong: LuotChiaNho[],
): Map<string, Record<string, number>> {
  const ra = new Map<string, Record<string, number>>();
  for (const d of dong) {
    if (!d.nhom) continue;
    const k = khoaDong(d.path);
    const o = ra.get(k) ?? {};
    o[d.nhom] = (o[d.nhom] ?? 0) + d.luot;
    ra.set(k, o);
  }
  return ra;
}

/**
 * Lấy chữ hiển thị từ một trường có thể là chuỗi trần HOẶC khối song ngữ.
 *
 * `KoiProduct.name` khai `String` trong schema Prisma nhưng cột thật là JSON
 * `{"vi":"…","en":"…"}` — đọc thẳng ra `[object Object]` trên mặt bảng. Bảng
 * `posts.title` thì là chuỗi trần. Hai kiểu cùng chảy vào một bảng nên phải có
 * chỗ quy về một mối. Cùng luật với `textOf()` ở product.service.ts:117.
 */
export function docChu(v: unknown): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object") {
    const o = v as { vi?: unknown; en?: unknown };
    if (typeof o.vi === "string" && o.vi) return o.vi;
    if (typeof o.en === "string" && o.en) return o.en;
  }
  return "";
}
