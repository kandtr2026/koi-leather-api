import type { Category, ProductWithImages, ProductVariant, Post } from './types';
import type { PostTerm } from './post-terms';

/**
 * Tầng dữ liệu của storefront (KoiFront).
 *
 * Trước đây đọc thẳng Supabase; giờ gọi API công khai của KoiBack
 * (koi-leather-api) nhóm /shop/*. Backend đã định hình sẵn dữ liệu theo đúng
 * các type bên dưới nên phần giao diện gần như giữ nguyên.
 */
const API =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') || 'http://localhost:3000';

async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { next: { revalidate: 60 } });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

export type CategoryWithCover = Category & { cover_image: string | null };

export type ProductList = {
  data: ProductWithImages[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type ProductDetail = ProductWithImages & {
  description: string | null;
  categories: Category[];
  variants: ProductVariant[];
  related: ProductWithImages[];
};

export type HomeData = {
  featured: ProductWithImages[];
  categories: CategoryWithCover[];
};

export const getHome = () => apiGet<HomeData>('/shop/home');

export const getAllCategories = () =>
  apiGet<CategoryWithCover[]>('/shop/categories');

export function getProducts(params: {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  material?: string;
  imageType?: string;
}): Promise<ProductList> {
  const q = new URLSearchParams();
  if (params.page) q.set('page', String(params.page));
  if (params.limit) q.set('limit', String(params.limit));
  if (params.category) q.set('category', params.category);
  if (params.search) q.set('search', params.search);
  if (params.material) q.set('material', params.material);
  if (params.imageType) q.set('imageType', params.imageType);
  const qs = q.toString();
  return apiGet<ProductList>(`/shop/products${qs ? `?${qs}` : ''}`);
}

export type ShopFilters = {
  categories: { name: string; slug: string; count: number }[];
  materials: { name: string; code: string; count: number }[];
  imageTypes: { name: string; code: string; count: number }[];
};

export const getShopFilters = () => apiGet<ShopFilters>('/shop/filters');

export type LookbookShot = {
  src: string;
  alt: string;
  slug: string;
  name: string;
  typeName: string;
};

/**
 * Ảnh cho trang Lookbook: gom các ảnh MANG TÍNH BỐI CẢNH của sản phẩm
 * (Lifestyle, Chế tác/Stamping…) — bỏ ảnh Studio (nền sạch) và Texture (vân da)
 * vì chúng không kể chuyện. Mỗi tấm dẫn thẳng về trang sản phẩm.
 *
 * Data-driven theo bảng loại ảnh của backend, không hardcode mã loại.
 */
export async function getLookbook(): Promise<LookbookShot[]> {
  const filters = await getShopFilters();
  const editorial = filters.imageTypes.filter(
    (t) => !/studio|texture|vân da/i.test(`${t.name} ${t.code}`),
  );
  if (!editorial.length) return [];

  const lists = await Promise.all(
    editorial.map((t) =>
      getProducts({ imageType: t.code, limit: 48 }).then((l) => ({ t, l })),
    ),
  );

  const shots: LookbookShot[] = [];
  const seen = new Set<string>();
  for (const { t, l } of lists) {
    for (const p of l.data) {
      for (const img of p.product_images) {
        if (img.image_type === t.code && img.storage_path && !seen.has(img.storage_path)) {
          seen.add(img.storage_path);
          shots.push({
            src: img.storage_path,
            alt: img.alt ?? p.name,
            slug: p.slug,
            name: p.name,
            typeName: t.name,
          });
        }
      }
    }
  }
  return shots;
}

export type CategoryPage = ProductList & { category: Category };

export function getCategoryPage(slug: string, page = 1): Promise<CategoryPage> {
  return apiGet<CategoryPage>(
    `/shop/categories/${encodeURIComponent(slug)}?page=${page}`,
  );
}

/** Chi tiết 1 slug; trả null nếu backend 404 (để trang gọi notFound()). */
export async function getProductBySlug(
  slug: string,
): Promise<ProductDetail | null> {
  const res = await fetch(
    `${API}/shop/products/${encodeURIComponent(slug)}`,
    { next: { revalidate: 60 } },
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API /shop/products/${slug} → ${res.status}`);
  return res.json() as Promise<ProductDetail>;
}

// ----- Nội dung cũ: blog / trang tĩnh / tag (schema public) -----

async function apiGetOrNull<T>(path: string): Promise<T | null> {
  const res = await fetch(`${API}${path}`, { next: { revalidate: 120 } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

export type PostList = {
  data: Post[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  categories: PostTerm[];
};

export function getPosts(page = 1, limit = 12): Promise<PostList> {
  return apiGet<PostList>(`/shop/posts?page=${page}&limit=${limit}`);
}

export type ContentDoc =
  | { kind: 'post'; doc: Post & { meta_title: string | null } }
  | {
      kind: 'page';
      doc: {
        id: number;
        title: string;
        slug: string;
        content: string | null;
        meta_title: string | null;
        meta_description: string | null;
      };
    };

export const getContent = (slug: string) =>
  apiGetOrNull<ContentDoc>(`/shop/content/${encodeURIComponent(slug)}`);

export type BlogTermResult = { term: PostTerm; posts: Post[] };

export const getBlogTerm = (taxonomy: 'category' | 'tag', slug: string) =>
  apiGetOrNull<BlogTermResult>(
    `/shop/blog-terms/${taxonomy}/${encodeURIComponent(slug)}`,
  );

export type ProductTagResult = {
  tag: { id: number; name: string; slug: string; product_count: number };
  products: ProductWithImages[];
};

export const getProductTag = (slug: string) =>
  apiGetOrNull<ProductTagResult>(
    `/shop/product-tags/${encodeURIComponent(slug)}`,
  );

export type SitemapData = {
  products: { slug: string; updated_at: string | null }[];
  categories: { slug: string }[];
  posts: { slug: string; published_at: string | null }[];
  pages: { slug: string }[];
  productTags: { slug: string; product_count: number }[];
  blogTerms: { slug: string; taxonomy: string; post_count: number }[];
};

export const getSitemapData = () => apiGet<SitemapData>('/shop/sitemap-data');
