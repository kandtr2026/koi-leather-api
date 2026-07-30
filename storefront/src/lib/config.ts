/**
 * Danh mục bị loại khỏi mặt tiền (menu, trang chủ, sản phẩm liên quan).
 *
 * QUAN TRỌNG: loại khỏi giao diện, KHÔNG xoá khỏi database và KHÔNG chặn
 * trang chi tiết. Các địa chỉ /cua-hang/{slug}/ và /san-pham/{slug}/ vẫn
 * phải truy cập được, vì Google đang lập chỉ mục chúng. Xoá là mất uy tín
 * đã tích luỹ. Khi site bán rập riêng lên sóng, chuyển 301 sang đó.
 */
export const EXCLUDED_CATEGORY_SLUGS = ['ban-rap-thiet-ke'];

/** Danh mục ít hơn ngần này sản phẩm thì không hiện ở trang chủ — trông hụt hẫng. */
export const MIN_PRODUCTS_FOR_HOME = 3;

/** Số sản phẩm mỗi trang danh mục. */
export const PAGE_SIZE = 24;

export const PRODUCT_SELECT =
  'id,name,slug,sku,short_description,description,price,regular_price,price_min,price_max,' +
  'on_sale,has_variants,is_available,is_featured,meta_title,meta_description,' +
  'product_images(storage_path,alt,is_primary,sort_order)';
