import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Ghi ảnh sản phẩm lên Supabase Storage (thay Cloudinary).
 *
 * XÁC THỰC: dùng service_role key — bỏ qua RLS, ghi thẳng, KHÔNG phải đăng nhập
 * lại mỗi cold-start như cơ chế anon+admin của koi-leather-data. Key CHỈ tồn tại
 * phía server (env SUPABASE_SERVICE_ROLE_KEY), không endpoint nào trả ra.
 *
 * BẢN NHỎ TĨNH: mỗi ảnh đẩy kèm w400/w800/w1200 vào cùng bucket dưới tiền tố
 * w{N}/. Loader next/image (koi-storefront/src/lib/image-loader.ts) chèn /w{N}/
 * vào URL để lấy đúng bản nhỏ — KHÔNG dùng Supabase Image Transform on-the-fly
 * (thứ tính tiền theo số ảnh gốc, từng vỡ hạn mức 12/08). Ba mức PHẢI khớp WIDTHS
 * bên loader và scripts/55-tao-anh-nho.mjs của kho koi-leather-data.
 */
const BUCKET = "products";
export const VARIANT_WIDTHS = [400, 800, 1200] as const;

let cachedClient: SupabaseClient | null | undefined;

/** URL dự án Supabase: lấy từ SUPABASE_URL, hoặc suy từ DATABASE_URL (postgres.<ref>). */
function supabaseBaseUrl(): string | null {
  const explicit = process.env.SUPABASE_URL?.trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  // Pooler username có dạng postgres.<projectRef> → https://<ref>.supabase.co
  const m = process.env.DATABASE_URL?.match(/postgres\.([a-z0-9]{16,}):/);
  return m ? `https://${m[1]}.supabase.co` : null;
}

function getClient(): SupabaseClient | null {
  if (cachedClient !== undefined) return cachedClient;
  const url = supabaseBaseUrl();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    cachedClient = null;
    return null;
  }
  cachedClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}

/** Có đủ cấu hình để ghi Supabase Storage chưa. */
export function isSupabaseStorageConfigured(): boolean {
  return getClient() !== null;
}

/** URL công khai của một key trong bucket products. */
export function publicUrl(key: string): string {
  const base = supabaseBaseUrl() ?? "";
  return `${base}/storage/v1/object/public/${BUCKET}/${key}`;
}

/** URL này có phải ảnh trong bucket products của Supabase không. */
export function isSupabaseProductUrl(url: string): boolean {
  return /\/storage\/v1\/object\/public\/products\//.test(url);
}

/** Bóc key (tương đối bucket) từ URL công khai; null nếu không phải URL products. */
export function keyFromPublicUrl(url: string): string | null {
  const m = url.match(/\/storage\/v1\/object\/public\/products\/(.+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}

/**
 * Đẩy ảnh gốc + các bản nhỏ. `key` là đường dẫn tương đối bucket
 * (vd "<productId>/<ts>.webp"). Bản nhỏ nằm ở "w{N}/<key>". upsert:true để
 * chạy lại không lỗi trùng.
 */
export async function uploadImageWithVariants(opts: {
  key: string;
  base: Buffer;
  variants: { width: number; buf: Buffer }[];
}): Promise<{ url: string }> {
  const client = getClient();
  if (!client) {
    throw new Error(
      "Supabase Storage chưa cấu hình (thiếu SUPABASE_SERVICE_ROLE_KEY).",
    );
  }
  const jobs = [
    client.storage
      .from(BUCKET)
      .upload(opts.key, opts.base, {
        contentType: "image/webp",
        upsert: true,
      }),
    ...opts.variants.map((v) =>
      client.storage
        .from(BUCKET)
        .upload(`w${v.width}/${opts.key}`, v.buf, {
          contentType: "image/webp",
          upsert: true,
        }),
    ),
  ];
  const results = await Promise.all(jobs);
  const bad = results.find((r) => r.error);
  if (bad?.error) throw new Error(`Upload Supabase lỗi: ${bad.error.message}`);
  return { url: publicUrl(opts.key) };
}

/** Xoá ảnh gốc + mọi bản nhỏ theo key. Bỏ qua êm nếu chưa cấu hình. */
export async function removeImageWithVariants(key: string): Promise<boolean> {
  const client = getClient();
  if (!client) return false;
  const keys = [key, ...VARIANT_WIDTHS.map((w) => `w${w}/${key}`)];
  const { error } = await client.storage.from(BUCKET).remove(keys);
  if (error) throw new Error(`Xoá Supabase lỗi: ${error.message}`);
  return true;
}
