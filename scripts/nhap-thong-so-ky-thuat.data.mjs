/**
 * BẢNG QUY ĐỔI cho scripts/nhap-thong-so-ky-thuat.mjs.
 *
 * Tách khỏi script để lần sau muốn thêm/bớt một tiêu chí thì sửa ở đây, không
 * phải đọc lại phần logic.
 */

/**
 * Nhãn trong khối "thông tin ngắn" của WordPress → tên tiêu chí sẽ hiện cho
 * khách. Nhiều nhãn WP đổ về một tiêu chí vì người soạn hồi đó gõ mỗi bài một
 * kiểu ("Chất liệu da", "Chất liệu", "Animal Skin" cùng nói về một thứ).
 *
 * Nhãn nào KHÔNG có ở đây thì bị bỏ, có chủ ý — xem CO_Y_BO bên dưới.
 */
export const NHAN_WP = {
  'Kích thước': 'Kích thước',
  'Kích thước lọt lòng': 'Kích thước lọt lòng',
  'Kích thước bản ngang': 'Bản ngang',
  'Trọng lượng sản phẩm': 'Trọng lượng',
  'Trọng lượng': 'Trọng lượng',
  'Chất liệu da': 'Chất liệu',
  'Chất liệu': 'Chất liệu',
  'Animal Skin': 'Chất liệu',
  'Chất liệu lớp lót': 'Lớp lót',
  'Da lót': 'Lớp lót',
  'Loại vân da': 'Vân da',
  'Nhà thuộc': 'Nhà thuộc da',
  'Xuất xứ da': 'Nhà thuộc da',
  'Animal Skin': 'Chất liệu',
  'Animal skin': 'Chất liệu',
  'Loại chế tác': 'Chế tác',
  'Chế tác': 'Chế tác',
  'Màu phụ kiện': 'Màu phụ kiện',
  'Phụ kiện': 'Màu phụ kiện',
  Khoá: 'Phần cứng',
  'Cơ chế khóa': 'Phần cứng',
  'Cơ chế khoá': 'Phần cứng',
  'Độ dày da thích hợp': 'Độ dày da',
  'Quy cách': 'Quy cách',
};

/**
 * Nhãn WP có sẵn nhưng CỐ Ý không nhập, kèm lý do. Đừng thêm lại mà không đọc.
 *
 *   Bảo hành          — bản xuất ghi "6 tháng" cho 246 món, nhưng toàn site nay
 *                       cam kết 12 tháng (ProductTrust: "Bảo hành 1 năm", đợt
 *                       sửa 26/08 đã thống nhất). Nhập vào là tự bẻ lời mình.
 *   Tình trạng stock  — "Order 7 ngày", "Sẵn hàng"… là dữ liệu vận hành từ
 *   / đặt hàng          08/2026, hàng bán rồi là sai. Bảng thông số không phải
 *                       chỗ nói tồn kho.
 *   Thương hiệu       — "Koi Bespoke Leather" cho mọi món; brand đã nằm trong
 *                       JSON-LD và trong header. Một dòng lặp 200 lần.
 *   Loại thiết kế     — "Koi Leather Developed" 161/170 món. Chữ tiếp thị.
 *   Màu sắc chủ đạo   — trang đã có chấm màu bấm được (colorLinks) ngay dưới
 *   / Màu sắc phối      giá. Nhắc lại bằng chữ là nhiễu.
 *   Đối tượng sử dụng — "Nam"/"Nữ"/"Nam/Nữ": đã nằm trong tên danh mục
 *                       (vi-da-cho-nam, tui-da-cho-nu) hiện ngay trên H1.
 *   Cá nhân hoá       — câu chào hàng dài, thuộc thân bài chứ không phải thông số.
 *   Thời gian đặt hàng— cùng lý do với Tình trạng stock.
 */
export const CO_Y_BO = [
  'Bảo hành',
  'Tình trạng stock/đặt hàng',
  'Tình trạng stock / đặt hàng',
  'Tình trạng stock',
  'Tình trạng đặt hàng',
  'Tình trạng',
  'Thương hiệu',
  'Loại thiết kế',
  'Màu sắc chủ đạo',
  'Màu sắc phối',
  'Màu sắc',
  'Đối tượng sử dụng',
  'Đối tượng',
  'Dành cho',
  'Cá nhân hoá',
  'Cá nhân hóa',
  'Tùy chọn cá nhân hóa',
  'Tuỳ chọn cá nhân hoá',
  'Thời gian đặt hàng',
  'Mẫu thiết kế',
  'Thiết kế',
  'Tên sản phẩm',
  'Công dụng',
  'Sức chứa',
  'Xuất xứ',
  'Loại sản phẩm',
  'Premium Leathercraft',
  // Đường dẫn bán hàng trong khối thông tin của 9 bài bản rập — không phải thông số.
  'Shopify',
  'Etsy',
  'Fanpage',
  'Nhắn tin ngay',
  'Video YouTube hướng dẫn',
];

/**
 * Chuẩn hoá giá trị "Vân da" — bản xuất có 16 cách nói cho 3 ý.
 */
export const VAN_DA = {
  'da vân hạt': 'Da vân hạt',
  'vân hạt': 'Da vân hạt',
  'da vân tự nhiên': 'Da vân tự nhiên',
  'vân tự nhiên': 'Da vân tự nhiên',
  'vân tự nhiên cao cấp, bền đẹp theo thời gian': 'Da vân tự nhiên',
  'da trơn': 'Da trơn',
  'trơn': 'Da trơn',
};

/**
 * Giá trị "Kích thước" KHÔNG phải số đo. Giữ lại vì nó vẫn trả lời đúng câu hỏi
 * của khách ("bao to?" → "đặt theo yêu cầu"), chỉ cần viết cho ra tiếng Việt.
 */
export const KICH_THUOC_CHU = {
  'freestyle – có thể customised': 'Đặt theo số đo yêu cầu',
  'freestyle - có thể customised': 'Đặt theo số đo yêu cầu',
  'tùy chỉnh': 'Đặt theo số đo yêu cầu',
  'tuỳ chỉnh': 'Đặt theo số đo yêu cầu',
  'thiết kế chuẩn form cho từng dòng iphone': 'Chuẩn form theo từng dòng iPhone',
};
