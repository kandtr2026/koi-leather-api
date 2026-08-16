/**
 * Gom lượt xem thô thành danh sách khách gần đây kèm IP và khu vực.
 *
 * MỘT DÒNG MỘT KHÁCH TRONG NGÀY: khoá gom là visitorHash, mà hash đổi mỗi
 * ngày (xem visitorHash() ở analytics.service.ts) nên cùng một người xem
 * hôm nay và hôm qua thành hai dòng — đúng nghĩa "khách trong kỳ", không
 * phải lỗi gom.
 *
 * Các trường path/source/ip/khuVuc lấy từ lượt ĐẦU TIÊN của khách (bấm từ
 * đâu vào). Lượt sau referrer là chính koileather.com nên source thành
 * 'internal' — lấy lượt sau là mất dấu khách đến từ Facebook/Google.
 *
 * MỌI HÀM TRONG FILE NÀY LÀ HÀM THUẦN TUÝ: không Prisma, không Date.now().
 * Service chỉ kéo dòng về rồi gọi gomKhachIp().
 */

/** Một lượt xem thô, đã kèm IP và khu vực từ lúc ghi. */
export interface LuotKhachIp {
  /** Khoá gom phía server. TUYỆT ĐỐI không trả ra ngoài. */
  visitorHash: string;
  /** IP thô lúc ghi. null cho dòng ghi trước 2026-08. */
  ip: string | null;
  /** Khu vực dịch từ IP lúc ghi. null khi không tra được. */
  khuVuc: string | null;
  path: string;
  source: string;
  device: string;
  /** Mốc thời gian, milli giây. */
  luc: number;
}

/** Một khách gom xong — trả ra ngoài. */
export interface DongKhachIp {
  ip: string | null;
  khuVuc: string | null;
  /** Trang khách vào ĐẦU TIÊN (xem ghi chú đầu file). */
  path: string;
  source: string;
  device: string;
  /** Số lượt xem của khách trong kỳ. */
  luot: number;
  /** Lượt đầu tiên, milli giây. */
  dauTien: number;
  /** Lượt gần nhất, milli giây — dùng làm cột sắp xếp. */
  ganNhat: number;
}

/**
 * Gom lượt thô thành danh sách khách, mới nhất lên đầu.
 *
 * Bỏ lượt thiếu visitorHash (không gom được) và thiếu ip (dòng trước
 * 2026-08 — xem tab này thì không có gì để xem). Sắp theo ganNhat giảm dần,
 * hoà thì theo ip tăng; cắt còn `gioiHan` dòng (tối thiểu 1).
 */
export function gomKhachIp(
  luot: readonly LuotKhachIp[],
  gioiHan: number,
): DongKhachIp[] {
  const nhom = new Map<string, LuotKhachIp[]>();
  for (const l of luot) {
    if (!l.visitorHash || !l.ip) continue;
    const co = nhom.get(l.visitorHash);
    if (co) co.push(l);
    else nhom.set(l.visitorHash, [l]);
  }

  const ra: DongKhachIp[] = [];
  for (const dong of nhom.values()) {
    dong.sort((a, b) => a.luc - b.luc);
    const dau = dong[0];
    ra.push({
      ip: dau.ip,
      khuVuc: dau.khuVuc,
      path: dau.path,
      source: dau.source,
      device: dau.device,
      luot: dong.length,
      dauTien: dau.luc,
      ganNhat: dong[dong.length - 1].luc,
    });
  }

  ra.sort(
    (a, b) =>
      b.ganNhat - a.ganNhat ||
      String(a.ip).localeCompare(String(b.ip)) ||
      String(a.dauTien).localeCompare(String(b.dauTien)),
  );
  return ra.slice(0, Math.max(1, Math.trunc(gioiHan) || 1));
}

/** Một dòng gom theo khu vực — dữ liệu cho bản đồ trên Heoiu. */
export interface DongTheoKhuVuc {
  /** Tên khu vực ("Hà Nội", "Mỹ"...). Không tra được thì "Không biết". */
  ten: string;
  /** Số khách KHÁC NHAU (visitorHash) của khu vực trong kỳ. */
  khach: number;
  /** Tổng lượt xem của khu vực trong kỳ. */
  luot: number;
}

/**
 * Gom lượt thô theo khu vực để vẽ bản đồ khách xem.
 *
 * KHÁC gomKhachIp: hàm kia gom theo KHÁCH (một dòng một khách), hàm này gom theo
 * KHU VỰC (một dòng một tỉnh/nước) — hai câu hỏi khác nhau, hai chiều gom khác
 * nhau, không thay thế được nhau.
 *
 * khach đếm theo visitorHash riêng (không đếm lượt) vì bản đồ trả lời "khu vực
 * nào có nhiều KHÁCH", lượt chỉ là phụ. Lượt thiếu visitorHash thì bỏ hẳn (không
 * gom được, đếm vào chỉ làm sai tỉ lệ). khuVuc null/hụt -> gom vào "Không biết"
 * để con số không biến mất khỏi tổng.
 */
export function gomTheoKhuVuc(
  luot: readonly LuotKhachIp[],
): DongTheoKhuVuc[] {
  const nhom = new Map<string, { khach: Set<string>; luot: number }>();
  for (const l of luot) {
    if (!l.visitorHash) continue;
    const ten = l.khuVuc || "Không biết";
    const co = nhom.get(ten);
    if (co) {
      co.khach.add(l.visitorHash);
      co.luot += 1;
    } else {
      nhom.set(ten, { khach: new Set([l.visitorHash]), luot: 1 });
    }
  }

  const ra: DongTheoKhuVuc[] = [];
  for (const [ten, v] of nhom) {
    ra.push({ ten, khach: v.khach.size, luot: v.luot });
  }
  ra.sort(
    (a, b) =>
      b.khach - a.khach ||
      b.luot - a.luot ||
      a.ten.localeCompare(b.ten, "vi"),
  );
  return ra;
}