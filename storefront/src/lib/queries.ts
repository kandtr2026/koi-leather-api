import { getAllCategories } from './api';
import { EXCLUDED_CATEGORY_SLUGS, MIN_PRODUCTS_FOR_HOME } from './config';
import type { Category } from './types';

/**
 * Danh mục cho menu/trang chủ — nay lấy từ API /shop/categories của KoiBack.
 * Backend đã ẩn sẵn danh mục không hoạt động và danh mục ẩn (ban-rap…),
 * nhưng vẫn lọc thêm EXCLUDED_CATEGORY_SLUGS ở đây để mặt tiền toàn quyền
 * quyết định hiển thị.
 */
async function visibleCategories(): Promise<Category[]> {
  const cats = await getAllCategories();
  return cats.filter((c) => !EXCLUDED_CATEGORY_SLUGS.includes(c.slug));
}

/** Danh mục cấp 1 dùng cho menu. */
export async function menuCategories(limit = 6): Promise<Category[]> {
  const cats = await visibleCategories();
  return cats.slice(0, limit);
}

/** Danh mục hiện ở trang chủ — bỏ những danh mục quá ít hàng. */
export async function homeCategories(limit = 6): Promise<Category[]> {
  const cats = await visibleCategories();
  return cats
    .filter((c) => c.product_count >= MIN_PRODUCTS_FOR_HOME)
    .slice(0, limit);
}

/**
 * Đường lui: trước đây dùng để loại sản phẩm thuộc danh mục ẩn khỏi trang chủ.
 * Giờ backend đã tự loại (notHidden) nên trả rỗng, giữ chữ ký để không phải
 * sửa các trang đang import.
 */
export async function excludedProductIds(): Promise<string[]> {
  return [];
}
