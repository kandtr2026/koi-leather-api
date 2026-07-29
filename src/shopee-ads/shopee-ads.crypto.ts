/**
 * Mã hoá credential Shopee trước khi ghi DB.
 *
 * TẠI SAO: partner_key là bí mật dài hạn — có nó là ký được request thay shop,
 * và access_token/refresh_token đọc được toàn bộ dữ liệu đơn hàng. DB này là
 * Supabase dùng chung với dữ liệu sản phẩm, ai xem được bảng cũng xem được cột.
 * Nên cột chỉ chứa ciphertext AES-256-GCM; muốn dùng phải có key ở env.
 *
 * GCM (không phải CBC) để có sẵn authentication tag: ciphertext bị sửa sẽ ném
 * lỗi khi giải mã thay vì trả ra rác âm thầm.
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12; // GCM chuẩn 96-bit
const PREFIX = 'v1'; // đánh phiên bản để sau này đổi thuật toán vẫn đọc được dữ liệu cũ

/** Salt cố định: key phái sinh phải tái lập được giữa các lần chạy serverless. */
const SALT = 'koi-shopee-cred-v1';

let cachedKey: Buffer | null = null;

/**
 * Key mã hoá lấy từ SHOPEE_CRED_KEY, không có thì dùng JWT_SECRET.
 *
 * Dùng lại JWT_SECRET là đánh đổi có ý thức: nó đã là bí mật bắt buộc của app,
 * đỡ cho admin phải quản thêm một biến. Đổi JWT_SECRET sẽ làm credential đã lưu
 * không giải mã được — khi đó chỉ cần uỷ quyền lại shop.
 */
function getKey(): Buffer {
  if (cachedKey) return cachedKey;
  const secret = process.env.SHOPEE_CRED_KEY || process.env.JWT_SECRET || '';
  if (secret.length < 16) {
    throw new Error(
      'Cần JWT_SECRET (hoặc SHOPEE_CRED_KEY) dài tối thiểu 16 ký tự để mã hoá credential Shopee.',
    );
  }
  cachedKey = scryptSync(secret, SALT, 32);
  return cachedKey;
}

/** Chỉ dùng trong test: xoá key đã cache khi env thay đổi. */
export function resetCredKeyCache(): void {
  cachedKey = null;
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [PREFIX, iv.toString('base64'), tag.toString('base64'), enc.toString('base64')].join(':');
}

export function decryptSecret(stored: string): string {
  const parts = stored.split(':');
  if (parts.length !== 4 || parts[0] !== PREFIX) {
    throw new Error('Credential Shopee trong DB sai định dạng — cần uỷ quyền lại shop.');
  }
  const [, ivB64, tagB64, dataB64] = parts;
  const decipher = createDecipheriv(ALGO, getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

/** Che giá trị để hiển thị/ghi log: chỉ để lại 4 ký tự cuối. */
export function maskSecret(v: string | null | undefined): string {
  if (!v) return '';
  const s = String(v);
  if (s.length <= 4) return '****';
  return '****' + s.slice(-4);
}
