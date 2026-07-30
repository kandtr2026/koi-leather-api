import type { Product } from './types';

/** 1350000 -> "1.350.000 ₫" */
export function formatPrice(v: number | null | undefined): string {
  if (v === null || v === undefined) return 'Liên hệ';
  return v.toLocaleString('vi-VN') + ' ₫';
}

/**
 * San pham co bien the thi gia la mot khoang.
 * Khi min = max thi hien mot gia, khong hien "X - X".
 */
export function priceLabel(p: Pick<Product, 'price' | 'price_min' | 'price_max' | 'has_variants'>): string {
  if (p.has_variants && p.price_min !== null && p.price_max !== null && p.price_min !== p.price_max) {
    return `${formatPrice(p.price_min)} – ${formatPrice(p.price_max)}`;
  }
  return formatPrice(p.price ?? p.price_min);
}

/**
 * Bỏ dấu tiếng Việt để tìm kiếm: "Ví Da Nam" -> "vi da nam".
 * Cột search_text trong database chứa cả bản có dấu lẫn không dấu,
 * nên khách gõ kiểu nào cũng ra.
 */
export function removeDiacritics(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/** dd/mm/yyyy */
export function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Bo the HTML de dung lam mo ta ngan / the meta. */
export function plainText(html: string | null | undefined, max = 300): string {
  if (!html) return '';
  const t = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  return t.length > max ? t.slice(0, max - 1).trimEnd() + '…' : t;
}
