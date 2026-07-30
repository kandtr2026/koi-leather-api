import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// KoiFront đã chuyển sang đọc dữ liệu qua API /shop/* của KoiBack. Client
// Supabase chỉ còn là đường lui cho vài trang chưa chuyển (blog/trang tĩnh).
// Tạo có điều kiện để KHÔNG ném lỗi lúc import khi thiếu biến môi trường —
// các trang đã chuyển sang API không đụng tới client này.
export const supabase = (
  url && key
    ? createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : (undefined as never)
);

const BUCKET = 'products';

/**
 * Chuyen ket qua truy van sang kieu mong muon.
 *
 * Can den vi ta truyen chuoi cot dong vao .select() - supabase-js khong
 * suy ra duoc kieu nen tra ve GenericStringError[]. Gom mot cho de khoi
 * rai rac ep kieu khap noi.
 */
export function rows<T>(data: unknown): T[] {
  return (data ?? []) as T[];
}

/**
 * Đổi tên file trong Storage thành địa chỉ ảnh đầy đủ.
 *
 * API /shop/* đã trả URL đầy đủ (Supabase Storage/Cloudinary) → cho đi thẳng.
 * Chỉ ghép prefix bucket khi nhận vào là tên file trần (đường lui cũ).
 */
export function imageUrl(storagePath: string | null | undefined): string | null {
  if (!storagePath) return null;
  if (/^https?:\/\//i.test(storagePath)) return storagePath;
  if (!url) return null;
  return `${url}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(storagePath)}`;
}
