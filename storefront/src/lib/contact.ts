// Bon kenh chot don. Site khong ban online - moi duong dan deu dan ve
// mot cuoc tro chuyen, nen tin nhan phai kem san ten san pham,
// khong bat khach phai go lai.

export const PHONE = process.env.NEXT_PUBLIC_PHONE ?? '0901678999';
export const ZALO = process.env.NEXT_PUBLIC_ZALO ?? '0901678999';
export const MESSENGER = process.env.NEXT_PUBLIC_MESSENGER ?? 'koileather';
export const EMAIL = process.env.NEXT_PUBLIC_EMAIL ?? 'koi.leather19@gmail.com';
export const ADDRESS = process.env.NEXT_PUBLIC_ADDRESS ?? 'Số 2/16 Nguyễn Bặc, Tân Sơn Hòa, TP. HCM';

export const SITE_URL = 'https://koileather.com';

export function zaloLink(productName?: string, productUrl?: string) {
  if (!productName) return `https://zalo.me/${ZALO}`;
  const msg = `Chào shop, mình quan tâm sản phẩm: ${productName}${productUrl ? ` (${productUrl})` : ''}`;
  return `https://zalo.me/${ZALO}?text=${encodeURIComponent(msg)}`;
}

export function messengerLink(productName?: string) {
  if (!productName) return `https://m.me/${MESSENGER}`;
  return `https://m.me/${MESSENGER}?text=${encodeURIComponent(
    `Chào shop, mình quan tâm sản phẩm: ${productName}`
  )}`;
}

export const phoneLink = `tel:${PHONE.replace(/\s/g, '')}`;

/** "0899899888" -> "0899 899 888" cho de doc */
export function prettyPhone(p = PHONE) {
  return p.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');
}
