/**
 * Cắt mốc thời gian theo giờ Việt Nam.
 *
 * Máy chủ Vercel chạy giờ UTC, cửa hàng bán ở Việt Nam. Cắt ngày theo giờ máy
 * chủ thì "hôm nay" bắt đầu lúc 7 giờ sáng giờ ta — mọi đơn/lượt xem từ nửa
 * đêm tới 7h sáng bị tính sang hôm qua. Mọi phép cắt ngày đều phải đi qua đây.
 *
 * Để ở src/common vì hai trang admin cùng đọc: /admin/traffic (analytics) và
 * /admin/ads. Trước đây trang ads cắt bằng `Date.now() - days * 86_400_000`
 * (24 giờ trượt) còn trang traffic cắt theo ngày lịch, nên cùng bấm "7 ngày"
 * mà hai trang đếm trên hai khoảng khác nhau — không đối chiếu được với nhau.
 */

/** Múi giờ để cắt ngày. */
export const MUI_GIO = "Asia/Ho_Chi_Minh";

/**
 * Mốc 00:00 của (hôm nay - luiNgay) theo giờ Việt Nam, trả về Date mang giá trị
 * UTC để so sánh thẳng với cột createdAt/clickedAt.
 *
 * Không dùng setHours(0,0,0,0): hàm đó cắt theo giờ CỦA MÁY CHỦ. Trên Vercel
 * (UTC) nó cho 00:00 UTC = 07:00 giờ ta, nên "hôm nay" mất trắng 7 tiếng đầu
 * ngày và mọi lượt xem sáng sớm bị đẩy sang hôm qua. Máy lập trình chạy giờ
 * Việt Nam nên bản địa lại đúng — lỗi chỉ hiện ra khi lên production.
 */
export function dauNgayVN(luiNgay = 0): Date {
  const now = new Date();
  // Đọc số ngày/tháng/năm mà ĐỒNG HỒ VIỆT NAM đang chỉ, bất kể máy chủ ở đâu.
  const [{ value: d }, , { value: m }, , { value: y }] = new Intl.DateTimeFormat(
    "en-GB",
    { timeZone: MUI_GIO, year: "numeric", month: "2-digit", day: "2-digit" },
  ).formatToParts(now);

  // 00:00 giờ VN = 17:00 UTC hôm trước. Việt Nam cố định UTC+7, không có giờ
  // mùa hè, nên trừ thẳng 7 tiếng là đủ — không cần thư viện múi giờ.
  const mocUTC = Date.UTC(Number(y), Number(m) - 1, Number(d)) - 7 * 60 * 60 * 1000;
  return new Date(mocUTC - luiNgay * 24 * 60 * 60 * 1000);
}

/**
 * Giờ hiện tại theo đồng hồ Việt Nam, 0..23.
 *
 * Đếm số giờ trọn đã trôi từ 00:00 hôm nay thay vì hỏi Intl: một số bản ICU trả
 * "24" thay vì "00" cho nửa đêm khi dùng hour12:false, đủ để cột giờ cuối rơi
 * ra ngoài mảng 24 phần tử.
 */
export function gioHienTaiVN(): number {
  const troi = Math.floor((Date.now() - +dauNgayVN(0)) / 3_600_000);
  return Math.min(Math.max(troi, 0), 23);
}

/**
 * Ngày (hôm nay - luiNgay) theo đồng hồ Việt Nam, dạng chuỗi "YYYY-MM-DD".
 *
 * Dùng cho mệnh đề GAQL `segments.date BETWEEN ...` — câu truy vấn gửi sang
 * Google Ads phải là NGÀY LỊCH dạng chuỗi. KHÔNG dùng toISOString().slice(0,10):
 * dauNgayVN() trả Date mang giá trị UTC (00:00 VN = 17:00 UTC hôm trước) nên
 * cắt chuỗi ISO sẽ lệch đúng một ngày.
 */
export function ngayVNString(luiNgay = 0): string {
  return ngayVNCuaDate(new Date(Date.now() - luiNgay * 24 * 60 * 60 * 1000));
}

/**
 * Ngày lịch Việt Nam của một Date bất kỳ, dạng chuỗi "YYYY-MM-DD".
 *
 * Tách khỏi ngayVNString vì có chỗ cần ngày của một thời điểm CỤ THỂ (ví dụ
 * clickedAt của cú bấm) chứ không phải của "hôm nay trừ N ngày".
 */
export function ngayVNCuaDate(d: Date): string {
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: MUI_GIO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const lay = (k: string) => (p.find((x) => x.type === k) || {}).value || "";
  return `${lay("year")}-${lay("month")}-${lay("day")}`;
}
