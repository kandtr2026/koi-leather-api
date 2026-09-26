/**
 * Loại traffic "người nhà" (IP đã đăng nhập quản trị) khỏi thống kê.
 *
 * A Khoa đặt hàng 26/09/2026: "Loại ra các traffic mà có IP có đính kèm quyền
 * Admin login đi. Vì đó là người nhà, bỏ vào sợ nó sai số."
 *
 * CÁCH LÀM. Storefront hỏi /api/gop-y/phien mỗi lần một trang quản trị hoặc
 * trang khách mở ra — route đó vốn đã nhận ra CẢ HAI kiểu đăng nhập (cookie
 * trang Next, JWT của SPA cũ). Xác nhận là quản trị thì nó báo IP về đây
 * (POST /analytics/nguoi-nha). Từ đó:
 *   - IP đó bị loại TRONG CẢ NGÀY HÔM ĐÓ (lịch Việt Nam): lượt mới không ghi,
 *     lượt đã ghi từ đầu ngày được dời sang bảng lưu riêng.
 *   - Chỉ theo NGÀY, không vĩnh viễn: A Khoa vào admin bằng 4G thì IP đó là IP
 *     dùng chung của nhà mạng (CGNAT) — hôm sau có thể là IP của một khách
 *     thật. Loại vĩnh viễn là âm thầm nuốt khách.
 *
 * Dời chứ KHÔNG xoá: bảng koi_luot_nguoi_nha giữ nguyên dòng (dạng JSON), trả
 * lại được bằng tools/loai-nguoi-nha.mjs --hoan.
 *
 * MỌI HÀM Ở ĐÂY LÀ HÀM THUẦN — không Prisma, không đồng hồ thật.
 */
import { isIP } from "node:net";

/**
 * Chuẩn hoá IP trước khi lưu / so. Trả null khi không phải IP.
 *
 * "::ffff:1.2.3.4" (IPv4 bọc trong IPv6, có máy chủ trả dạng này) quy về
 * "1.2.3.4" — không quy thì cùng một người ra hai khoá và lọc hụt.
 */
export function chuanHoaIp(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let s = raw.trim().toLowerCase();
  if (s.startsWith("::ffff:") && isIP(s.slice(7)) === 4) s = s.slice(7);
  return isIP(s) ? s : null;
}

/** Ngày lịch Việt Nam "YYYY-MM-DD" của một thời điểm. VN cố định UTC+7. */
export function ngayVNCua(luc: Date): string {
  return new Date(+luc + 7 * 3_600_000).toISOString().slice(0, 10);
}

/**
 * Mốc [đầu, cuối) của một ngày lịch VN, dạng Date mang giá trị UTC — để so
 * thẳng với cột createdAt. 00:00 giờ ta = 17:00 UTC hôm trước.
 */
export function mocNgayVN(ngay: string): { tu: Date; den: Date } {
  const [y, m, d] = ngay.split("-").map(Number);
  const tu = new Date(Date.UTC(y, m - 1, d) - 7 * 3_600_000);
  return { tu, den: new Date(+tu + 24 * 3_600_000) };
}

/** Khoá bộ nhớ đệm / khoá bảng: một IP trong một ngày. */
export function khoaNguoiNha(ip: string, ngay: string): string {
  return `${ip}|${ngay}`;
}

/**
 * Bộ nhớ đệm "IP này hôm nay có phải người nhà không" cho đường ghi lượt xem.
 *
 * Mỗi lượt xem / nhịp tim đều hỏi, nên không thể lần nào cũng xuống cơ sở dữ
 * liệu. "Có" giữ tới hết ngày (một khi đã là người nhà thì cả ngày là người
 * nhà). "Không" chỉ giữ `hanKhongMs` — A Khoa vừa đăng nhập ở máy khác thì chậm
 * nhất chừng đó là máy chủ này biết; lượt lọt trong khoảng đó vẫn bị lượt dời
 * lúc đăng nhập quét đi.
 */
export class DemNguoiNha {
  private readonly nho = new Map<string, { la: boolean; het: number }>();

  constructor(
    private readonly hanKhongMs = 15_000,
    private readonly tran = 5_000,
  ) {}

  doc(khoa: string, bayGio: number): boolean | undefined {
    const o = this.nho.get(khoa);
    if (!o) return undefined;
    if (o.het <= bayGio) {
      this.nho.delete(khoa);
      return undefined;
    }
    return o.la;
  }

  ghi(khoa: string, la: boolean, bayGio: number, hetNgayLuc: number): void {
    // Chặn phình bộ nhớ khi bị dội IP lạ: đầy thì xoá sạch, rẻ hơn LRU và
    // đúng nghĩa — mất đệm chỉ tốn thêm vài lượt hỏi cơ sở dữ liệu.
    if (this.nho.size >= this.tran) this.nho.clear();
    this.nho.set(khoa, { la, het: la ? hetNgayLuc : bayGio + this.hanKhongMs });
  }
}
