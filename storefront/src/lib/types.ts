// Lưu ý: koi_free_style dùng id kiểu UUID (chuỗi), khác bản WordPress cũ (số).
export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  product_count: number;
  is_hidden: boolean;
  cover_image?: string | null;
};

export type ProductImage = {
  // id của record ảnh — dùng để admin thay ảnh tại chỗ. null cho ảnh cũ / đường lui.
  id: string | null;
  storage_path: string;
  alt: string | null;
  is_primary: boolean;
  sort_order: number;
  // Loại ảnh: STUDIO | LIFESTYLE | CRAFTING | TEXTURE. null cho ảnh chưa gắn loại.
  image_type: string | null;
};

export type ProductVariant = {
  id: number;
  name: string | null;
  attributes: Record<string, string>;
};

export type Product = {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  short_description: string | null;
  description: string | null;
  price: number | null;
  price_min: number | null;
  price_max: number | null;
  on_sale: boolean;
  regular_price: number | null;
  has_variants: boolean;
  is_available: boolean;
  is_featured: boolean;
  meta_title: string | null;
  meta_description: string | null;
  // Màu: color_family (nhóm để lọc) + color_hex (mã màu thật cho chấm màu trên thẻ).
  color_family: string | null;
  color_hex: string | null;
};

export type ProductWithImages = Product & {
  product_images: ProductImage[];
};

export type Post = {
  id: number;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string | null;
  meta_title: string | null;
  meta_description: string | null;
  published_at: string | null;
};
