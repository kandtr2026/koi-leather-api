import { removeDiacritics, plainText } from './format';

/**
 * Dựng lại chuỗi tìm kiếm cho một sản phẩm.
 *
 * Phải khớp đúng cách script seed tạo ra (scripts/lib/text.mjs), nếu không
 * thì sản phẩm sửa trong trang quản trị sẽ tìm kiếm khác với sản phẩm nhập
 * từ WordPress. Chứa cả bản có dấu lẫn bản bỏ dấu để khách gõ kiểu nào
 * cũng ra.
 */
export function buildSearchText(...parts: (string | null | undefined)[]): string {
  const joined = parts.filter(Boolean).map((p) => plainText(p, 10000)).join(' ');
  const plain = removeDiacritics(joined);
  return `${joined.toLowerCase()} ${plain}`.slice(0, 4000);
}
