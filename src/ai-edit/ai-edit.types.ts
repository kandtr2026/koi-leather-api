/**
 * Bản đồ giữa ĐƯỜNG DẪN công khai và BẢN GHI trong cơ sở dữ liệu.
 *
 * Đây là tệp dễ gây tai hoạ nhất của cả module, nên nó đứng riêng một chỗ: dán
 * link vào mà tra ra sai bản ghi thì AI viết lại đè lên một trang KHÁC, và chủ
 * shop không thấy gì bất thường cho tới khi trang kia hỏng. Hai cái bẫy có thật
 * trên site này:
 *
 *  · /cua-hang/<slug>/ là TRANG SẢN PHẨM, còn /san-pham/<slug>/ là TRANG DANH
 *    MỤC. Đọc tên thì tưởng ngược lại. Nhầm hai cái là sửa mô tả danh mục trong
 *    khi tưởng đang sửa sản phẩm.
 *  · Đường dẫn ở GỐC tên miền (/<slug>/) có thể là bài viết HOẶC trang tĩnh —
 *    hai bảng khác nhau. Phải thử `posts` trước rồi mới tới `pages`, giống
 *    contentBySlug ở shop-content.service.ts, để một slug có ở cả hai bảng thì
 *    hai bên chọn cùng một bản ghi.
 */

/** Loại nội dung sửa được. Ghi vào KoiContentRevision.kind. */
export type LoaiNoiDung =
  "post" | "page" | "product" | "category" | "product_tag" | "blog_term";

export interface TruongChu {
  /** Tên cột trong DB. */
  ten: string;
  /** Nhãn tiếng Việt hiện trên admin. */
  nhan: string;
  /** Nội dung hiện tại. null = trường đang trống. */
  giaTri: string | null;
  /**
   * true = trường này là HTML (thân bài viết, mô tả sản phẩm). AI phải được dặn
   * giữ nguyên thẻ; và admin hiện nó trong khung cuộn thay vì một dòng.
   */
  html?: boolean;
  /**
   * Độ dài nên nhắm tới, cho các trường SEO. Vượt quá thì Google cắt giữa câu.
   * null = không giới hạn (thân bài).
   */
  soKyTuNen?: number | null;
}

export interface BanGhiDaTra {
  kind: LoaiNoiDung;
  /** Khoá chính, luôn ép về chuỗi (bảng public dùng BigInt, koi dùng UUID). */
  id: string;
  /** Nhãn để chủ shop nhận ra mình đang sửa cái gì. */
  tieuDe: string;
  slug: string;
  /** Đường dẫn công khai đã chuẩn hoá. */
  path: string;
  /** Tên bảng, hiện trên admin để không ai phải đoán. */
  bang: string;
  truong: TruongChu[];
  /** Số lần AI đã sửa bản ghi này trước đây. Admin cảnh báo nếu > 0. */
  soLanDaSua: number;
}

/**
 * Trường ĐƯỢC PHÉP sửa, theo từng loại. Danh sách allowlist chứ không phải
 * blocklist: thêm bảng mới về sau mà quên khai thì nó KHÔNG sửa được gì, đó là
 * hướng sai an toàn. Blocklist thì ngược lại — quên chặn là cho sửa.
 *
 * KHÔNG BAO GIỜ có `slug` trong đây. Slug là URL công khai Google đã đánh chỉ
 * mục suốt 7 năm; đổi nó là gãy link, mất thứ hạng, và khách bấm từ Google vào
 * trang 404. Cũng không có giá, trạng thái xuất bản, hay khoá chính.
 */
export const TRUONG_CHO_PHEP: Record<
  LoaiNoiDung,
  Array<{
    ten: string;
    nhan: string;
    html?: boolean;
    soKyTuNen?: number | null;
  }>
> = {
  post: [
    { ten: "title", nhan: "Tiêu đề bài" },
    { ten: "excerpt", nhan: "Đoạn dẫn (excerpt)" },
    { ten: "content", nhan: "Thân bài", html: true },
    { ten: "meta_title", nhan: "Thẻ tiêu đề SEO", soKyTuNen: 60 },
    { ten: "meta_description", nhan: "Thẻ mô tả SEO", soKyTuNen: 160 },
  ],
  page: [
    { ten: "title", nhan: "Tiêu đề trang" },
    { ten: "content", nhan: "Nội dung trang", html: true },
    { ten: "meta_title", nhan: "Thẻ tiêu đề SEO", soKyTuNen: 60 },
    { ten: "meta_description", nhan: "Thẻ mô tả SEO", soKyTuNen: 160 },
  ],
  product: [
    { ten: "name", nhan: "Tên sản phẩm" },
    { ten: "description", nhan: "Mô tả sản phẩm", html: true },
    { ten: "metaTitle", nhan: "Thẻ tiêu đề SEO", soKyTuNen: 60 },
    { ten: "metaDescription", nhan: "Thẻ mô tả SEO", soKyTuNen: 160 },
  ],
  category: [
    { ten: "name", nhan: "Tên danh mục" },
    { ten: "description", nhan: "Mô tả danh mục", html: true },
    { ten: "metaTitle", nhan: "Thẻ tiêu đề SEO", soKyTuNen: 60 },
    { ten: "metaDescription", nhan: "Thẻ mô tả SEO", soKyTuNen: 160 },
  ],
  product_tag: [{ ten: "description", nhan: "Mô tả từ khoá", html: true }],
  blog_term: [{ ten: "description", nhan: "Mô tả chuyên mục", html: true }],
};

/** Tên bảng hiện trên admin — để chủ shop biết chữ mình sửa nằm ở đâu. */
export const TEN_BANG: Record<LoaiNoiDung, string> = {
  post: "public.posts",
  page: "public.pages",
  product: "koi_free_style.koi_products",
  category: "koi_free_style.koi_categories",
  product_tag: "public.tags",
  blog_term: "public.post_terms",
};
