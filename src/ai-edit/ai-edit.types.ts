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

/**
 * Một tấm ảnh gửi cho AI xem.
 *
 * `url` là ảnh GỐC trên Cloudinary. Việc thu nhỏ để tiết kiệm token nằm ở
 * openai.client.ts, không làm ở đây: resolver trả dữ liệu thật, còn thu nhỏ bao
 * nhiêu là chuyện của bên gọi AI và đổi được không cần sửa tầng dữ liệu.
 */
export interface AnhSanPham {
  url: string;
  /**
   * Bản nhỏ có sẵn, để admin vẽ ô xem trước 40px.
   *
   * Vì sao cần cột riêng chứ không thu nhỏ trên URL như phía gửi cho AI: cách thu
   * nhỏ đó chỉ chạy cho Cloudinary, mà 2169/3269 tấm nằm trên Supabase Storage và
   * ở đó URL giữ nguyên. Không có cột này thì admin tải ảnh 230KB về vẽ trong ô
   * 40px, nhân với số ảnh mỗi lần tra link.
   *
   * Với ảnh Cloudinary đây là tệp bản nhỏ đã tạo sẵn lúc tải lên (~57KB). Với ảnh
   * Supabase nó bằng chính `url` — không tệ hơn hiện tại, và tự tốt lên nếu về sau
   * có sinh bản nhỏ cho chúng.
   */
  urlNho: string;
  /**
   * Chữ thay ảnh. Trên dữ liệu thật nó theo MẪU SẴN
   * ("Tên - Loại da - Màu - KOI Leather"), tức mô tả định danh chứ không mô tả
   * những gì thực sự nhìn thấy trong ảnh. Nên nó hữu ích để xác nhận loại da và
   * màu, nhưng KHÔNG thay được việc cho model nhìn ảnh.
   */
  altText: string | null;
  /** STUDIO, LIFESTYLE, DETAIL… Ảnh DETAIL là chỗ thấy đường chỉ và khoá. */
  imageType: string;
  isPrimary: boolean;
}

/**
 * NGỮ CẢNH: những gì đã biết chắc về bản ghi, ngoài mấy ô chữ sửa được.
 *
 * VÌ SAO CÓ TỆP DỮ LIỆU RIÊNG CHO VIỆC NÀY: quy tắc xương sống của công cụ là
 * "không bịa". Trước đây AI chỉ nhận 4 ô chữ, nên khi chủ shop viết "dựa vào
 * hình ảnh sản phẩm mà nâng SEO" thì nó KHÔNG có ảnh nào và phần nào nó nói về
 * ảnh đều là tự nghĩ ra. Cách chữa đúng không phải là nới quy tắc, mà là ĐƯA
 * THÊM SỰ THẬT vào rồi cho phép dùng ĐÚNG những sự thật đó.
 *
 * Mọi trường ở đây đọc từ DB. Không suy diễn, không mặc định, không điền bừa —
 * trường nào DB trống thì để trống và prompt sẽ không nhắc tới nó.
 */
export interface NguCanh {
  /** Danh mục chính trước, rồi các danh mục phụ từ bảng nối. */
  danhMuc: string[];
  /** Loại da. Nhiều được: thân Epsom + lót Swift là một sản phẩm hai loại da. */
  loaiDa: Array<{ ten: string; moTa: string | null }>;
  /** Nhóm màu chuẩn (dùng để lọc ở cửa hàng), không phải mã hex. */
  mau: string[];
  /** productType trong DB — WALLET, BAG… */
  loaiSanPham: string | null;
  /**
   * Có biến thể hay không, và khoảng giá. KHÔNG gồm con số giá: prompt cấm viết
   * số vào chữ, vì giá đổi theo thời gian mà câu chữ thì nằm lại trong DB.
   */
  coBienThe: boolean;
  /** Ảnh, đã xếp ảnh chính lên đầu. */
  anh: AnhSanPham[];
  /** Tổng số ảnh trong DB, kể cả phần không gửi cho AI. */
  tongSoAnh: number;
  /** Bản ghi SEO riêng (koi_seo_records), nếu có. */
  seo: {
    ogTitle: string | null;
    ogDescription: string | null;
    noIndex: boolean;
    coJsonLd: boolean;
  } | null;
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
  /**
   * Ngữ cảnh. null với bài viết, trang tĩnh, tag — những loại không có danh mục,
   * loại da hay ảnh sản phẩm để đọc. Bên gọi phải chịu được null, đừng giả định
   * loại nào cũng có.
   */
  nguCanh?: NguCanh | null;
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
