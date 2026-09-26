/**
 * Luật "ẢNH CHÍNH = TẤM ĐỨNG ĐẦU" cho ảnh của một sản phẩm.
 *
 * VÌ SAO (A Khoa cho sửa 26/09/2026). Mặt tiền đọc ảnh chính ở HAI chỗ: thẻ sản
 * phẩm lấy tấm mang cờ `isPrimary`, còn trang chi tiết lấy tấm có `displayOrder`
 * nhỏ nhất. Bốn thao tác admin cũ làm hai chỗ đó lệch nhau:
 *   - "đặt bìa" chỉ đổi cờ, không đưa tấm đó lên đầu;
 *   - sắp thứ tự đưa tấm khác lên đầu nhưng cờ vẫn nằm ở tấm cũ;
 *   - tải ảnh lên có tick "ảnh chính" thì tấm mới nằm CUỐI mà mang cờ;
 *   - xoá đúng tấm mang cờ thì sản phẩm hết ảnh chính.
 * Đo 26/09: 194/519 sản phẩm đang bán bị lệch — thẻ một ảnh, trang chi tiết một
 * ảnh khác. Nay mọi thao tác đều đi qua hàm dưới đây nên luôn giữ được một bất
 * biến: đúng MỘT tấm mang cờ, và tấm đó đứng đầu thứ tự.
 *
 * HÀM THUẦN — không Prisma, test được không cần cơ sở dữ liệu.
 */

export interface AnhThuTu {
  id: string;
  displayOrder: number;
  isPrimary: boolean;
  createdAt?: Date | string | null;
}

/**
 * Chọn tấm nào làm ảnh chính:
 *   { chon: id }          — tấm được chỉ định (bấm "đặt bìa", tải lên có tick chính);
 *   { uuTien: "dau" }     — tấm đang đứng đầu thứ tự (sau khi sắp lại bằng ←/→);
 *   { uuTien: "co-san" }  — giữ tấm đang mang cờ; không có thì tấm đứng đầu
 *                           (sau khi tải thêm ảnh thường, sau khi xoá ảnh).
 */
export type CachChonAnhChinh = { chon: string } | { uuTien: "dau" | "co-san" };

export interface CapNhatAnh {
  id: string;
  displayOrder: number;
  isPrimary: boolean;
}

/**
 * Thứ tự đang hiện trên trang chi tiết: displayOrder, hoà thì tấm tạo trước,
 * hoà nữa thì theo id — để hai tấm trùng displayOrder không đổi chỗ ngẫu nhiên
 * giữa hai lần đọc.
 */
export function xepThuTu<T extends AnhThuTu>(anh: readonly T[]): T[] {
  const moc = (v: AnhThuTu["createdAt"]) => (v ? +new Date(v) : 0);
  return [...anh].sort(
    (a, b) =>
      a.displayOrder - b.displayOrder ||
      moc(a.createdAt) - moc(b.createdAt) ||
      a.id.localeCompare(b.id),
  );
}

/**
 * Trả về những tấm CẦN GHI để: tấm được chọn đứng đầu mang cờ, các tấm còn lại
 * giữ nguyên trình tự cũ phía sau, thứ tự đánh lại liền mạch 0..n-1. Tấm nào
 * đã đúng thì không nằm trong danh sách — gọi lại lần hai là không ghi gì.
 *
 * Id chỉ định không thuộc sản phẩm thì coi như "giữ tấm có sẵn": không bao giờ
 * để sản phẩm rơi vào trạng thái không có ảnh chính.
 */
export function sapAnhChinh(
  anh: readonly AnhThuTu[],
  cach: CachChonAnhChinh,
): CapNhatAnh[] {
  if (!anh.length) return [];
  const thuTu = xepThuTu(anh);

  let chon: AnhThuTu | undefined;
  if ("chon" in cach) chon = thuTu.find((a) => a.id === cach.chon);
  if (!chon && "uuTien" in cach && cach.uuTien === "dau") chon = thuTu[0];
  if (!chon) chon = thuTu.find((a) => a.isPrimary) ?? thuTu[0];

  const moi = [chon, ...thuTu.filter((a) => a.id !== chon!.id)];
  const doi: CapNhatAnh[] = [];
  moi.forEach((a, k) => {
    const laChinh = k === 0;
    if (a.displayOrder !== k || a.isPrimary !== laChinh) {
      doi.push({ id: a.id, displayOrder: k, isPrimary: laChinh });
    }
  });
  return doi;
}
