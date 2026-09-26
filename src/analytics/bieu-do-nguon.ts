/**
 * Chia lượt xem theo NGUỒN KHÁCH trên trục thời gian — biểu đồ "Khách đến từ
 * đâu" ở tab Thống kê traffic.
 *
 * A Khoa đặt hàng 26/09/2026: "Bổ sung chart traffic, theo organic, theo google
 * hay theo các nguồn khác để trực quan hơn".
 *
 * MỌI HÀM Ở ĐÂY LÀ HÀM THUẦN. Phần cắt múi giờ (ngày/giờ theo giờ Việt Nam) đã
 * làm trong SQL — xem noiDung() ở analytics.service.ts. Ở đây chỉ nhận chuỗi
 * ngày/giờ đã cắt sẵn rồi xếp vào cột, nên test được không cần cơ sở dữ liệu.
 *
 * Đơn vị là LƯỢT XEM, không phải khách: lượt cộng theo nguồn, theo cột bao
 * nhiêu lần cũng khớp với thẻ "Tổng lượt xem" ngay phía trên. Khách riêng thì
 * không cộng được qua các cột (một người vào sáng và chiều bị đếm hai lần).
 */

/** Cột theo giờ (khoảng 1 ngày), theo ngày (tới 90 ngày), hay theo tuần (1 năm). */
export type DonViCot = "gio" | "ngay" | "tuan";

/**
 * Chọn độ mịn của trục thời gian.
 *
 * Một ngày mà vẽ theo ngày thì chỉ ra MỘT cột — không trả lời được "hôm nay
 * khách vào lúc nào". Một năm mà vẽ theo ngày thì 365 cột mảnh hơn sợi chỉ,
 * rê chuột trúng cột nào cũng là may. 90 cột theo ngày vẫn còn rê được.
 */
export function donViCot(soNgay: number): DonViCot {
  if (soNgay <= 1) return "gio";
  if (soNgay <= 90) return "ngay";
  return "tuan";
}

/** Một dòng SQL đã gom theo (mốc × nguồn). */
export interface DongCotTho {
  /** "0".."23" khi gom theo giờ; "YYYY-MM-DD" (ngày lịch VN) khi gom theo ngày. */
  moc: string;
  nguon: string;
  luot: number;
}

/** Một cột trên biểu đồ. */
export interface CotNguon {
  /** Khoá cột: "13" (giờ), "2026-09-26" (ngày), hoặc ngày thứ Hai đầu tuần. */
  moc: string;
  /** Ngày đầu và ngày cuối cột phủ — cột tuần đầu/cuối có thể hụt vài ngày. */
  tu: string;
  den: string;
  nguon: Record<string, number>;
  tong: number;
  /**
   * false = giờ CHƯA TỚI (chỉ có ở "hôm nay"). Không có cờ này thì 3 giờ chiều
   * nhìn xuống thấy chín cột 0 liền nhau và tưởng web chết.
   */
  daQua: boolean;
}

/**
 * Danh sách ngày lịch Việt Nam, dạng "YYYY-MM-DD", bắt đầu từ `tu`.
 *
 * `tu` là 00:00 giờ ta mang giá trị UTC (dauNgayVN), tức 17:00 UTC hôm trước —
 * cắt thẳng toISOString() là lùi đúng một ngày. Cộng 7 tiếng rồi mới cắt, cùng
 * mẹo với summary(). Việt Nam không có giờ mùa hè nên cộng thẳng là đủ.
 */
export function chuoiNgayVN(tu: Date, soNgay: number): string[] {
  const ra: string[] = [];
  for (let i = 0; i < soNgay; i++) {
    ra.push(
      new Date(+tu + (i * 24 + 7) * 3_600_000).toISOString().slice(0, 10),
    );
  }
  return ra;
}

/**
 * Ngày thứ Hai của tuần chứa `ngay` ("YYYY-MM-DD" → "YYYY-MM-DD").
 *
 * Tính trên NGÀY LỊCH thuần (Date.UTC, getUTCDay) nên không dính múi giờ máy
 * chủ. Tuần bắt đầu thứ Hai theo thói quen lịch Việt Nam, không theo Chủ Nhật
 * kiểu Mỹ.
 */
export function dauTuan(ngay: string): string {
  const [y, m, d] = ngay.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d);
  const thu = new Date(t).getUTCDay(); // 0 = Chủ Nhật
  const lui = (thu + 6) % 7; // số ngày lùi về thứ Hai
  return new Date(t - lui * 86_400_000).toISOString().slice(0, 10);
}

/**
 * Xếp các dòng SQL vào cột, ĐỦ mọi cột kể cả cột không có lượt nào.
 *
 * Thiếu cột là biểu đồ nối liền hai ngày cách xa nhau, nhìn như ngày nào cũng
 * có khách — nên điền 0 chứ không bỏ.
 *
 * `batDauDo`: ngày lịch VN của lượt xem ĐẦU TIÊN từng ghi (bảng bắt đầu đo từ
 * 02/08/2026). Cột ngày/tuần nằm trọn trước mốc đó bị cắt bỏ: chọn "1 năm" mà
 * vẽ mười tháng cột 0 thì ai nhìn cũng tưởng web từng chết cả năm, trong khi sự
 * thật là hồi đó chưa đo. Người gọi được báo lại qua `daCatDau` để ghi chú.
 * Cột giờ không bao giờ cắt.
 *
 * `gioHienTai`: giờ VN lúc này khi khoảng là "hôm nay"; null khi khoảng đã
 * khép (hôm qua) — mọi giờ đều đã qua.
 */
export function dungCot(o: {
  don: DonViCot;
  dong: readonly DongCotTho[];
  /** Ngày lịch VN của khoảng, theo thứ tự tăng dần. Không dùng khi don = "gio". */
  ngay: readonly string[];
  gioHienTai: number | null;
  batDauDo: string | null;
}): { cot: CotNguon[]; daCatDau: boolean } {
  const cong = (dich: Record<string, number>, nguon: string, luot: number) => {
    if (!nguon || !luot) return;
    dich[nguon] = (dich[nguon] ?? 0) + luot;
  };
  const tongCua = (n: Record<string, number>) =>
    Object.values(n).reduce((t, x) => t + x, 0);

  if (o.don === "gio") {
    const theoGio = Array.from(
      { length: 24 },
      () => ({}) as Record<string, number>,
    );
    for (const d of o.dong) {
      const h = Number(d.moc);
      // "07" -> 7. Giờ lạ (NaN, 24) thì bỏ chứ không nhét vào cột sai.
      if (Number.isInteger(h) && h >= 0 && h < 24)
        cong(theoGio[h], d.nguon, d.luot);
    }
    const ngay = o.ngay[0] ?? "";
    return {
      cot: theoGio.map((nguon, h) => ({
        moc: String(h),
        tu: ngay,
        den: ngay,
        nguon,
        tong: tongCua(nguon),
        daQua: o.gioHienTai === null || h <= o.gioHienTai,
      })),
      daCatDau: false,
    };
  }

  // So chuỗi "YYYY-MM-DD" theo thứ tự từ điển = so theo thời gian.
  const ngayCon = o.batDauDo
    ? o.ngay.filter((n) => n >= (o.batDauDo as string))
    : [...o.ngay];
  const daCatDau = ngayCon.length < o.ngay.length;

  const khoaCot = (n: string) => (o.don === "tuan" ? dauTuan(n) : n);
  const cot = new Map<string, CotNguon>();
  for (const n of ngayCon) {
    const k = khoaCot(n);
    const c = cot.get(k);
    if (c) c.den = n;
    else cot.set(k, { moc: k, tu: n, den: n, nguon: {}, tong: 0, daQua: true });
  }

  for (const d of o.dong) {
    // Dòng rơi ngoài các ngày còn giữ (trước mốc đo, hoặc lệch khoảng) thì bỏ:
    // cộng vào cột nào cũng là cộng sai chỗ.
    const c = cot.get(khoaCot(d.moc));
    if (c && d.moc >= c.tu && d.moc <= c.den) cong(c.nguon, d.nguon, d.luot);
  }
  for (const c of cot.values()) c.tong = tongCua(c.nguon);

  return { cot: [...cot.values()], daCatDau };
}
