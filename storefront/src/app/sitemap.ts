import type { MetadataRoute } from 'next';
import { getSitemapData } from '@/lib/api';
import { SITE_URL } from '@/lib/contact';

/**
 * Sitemap gồm mọi địa chỉ công khai, giữ nguyên dạng đường dẫn cũ của
 * WordPress. Sản phẩm + danh mục lấy từ hệ mới (koi_free_style); blog, trang,
 * tag lấy từ nội dung cũ (public) — tất cả qua API /shop/sitemap-data.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { products, categories, posts, pages, productTags, blogTerms } =
    await getSitemapData();

  // Trang tĩnh nào đã được chuyển hướng thì không đưa vào sitemap nữa
  const redirected = new Set([
    'shop', 'blogs', 'tin-tuc-su-kien', 'gio-hang', 'thanh-toan',
    'tai-khoan', 'huong-dan-thanh-toan', 'cua-hang',
  ]);

  return [
    { url: `${SITE_URL}/`, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/cua-hang/`, changeFrequency: 'daily', priority: 0.9 },
    { url: `${SITE_URL}/blog/`, changeFrequency: 'weekly', priority: 0.6 },

    ...products.map((p) => ({
      url: `${SITE_URL}/cua-hang/${p.slug}/`,
      lastModified: p.updated_at ? new Date(p.updated_at) : undefined,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),

    ...categories.map((c) => ({
      url: `${SITE_URL}/san-pham/${c.slug}/`,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    })),

    ...posts.map((p) => ({
      url: `${SITE_URL}/${p.slug}/`,
      lastModified: p.published_at ? new Date(p.published_at) : undefined,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),

    // Chỉ khai báo tag có từ 3 sản phẩm trở lên. Tag mỏng hơn vẫn truy cập
    // được (không mất liên kết cũ) nhưng không đẩy vào chỉ mục.
    ...productTags
      .filter((t) => t.product_count >= 3)
      .map((t) => ({
        url: `${SITE_URL}/tu-khoa-san-pham/${t.slug}/`,
        changeFrequency: 'monthly' as const,
        priority: 0.3,
      })),

    // Chuyên mục blog: cụm nội dung lớn, ưu tiên cao
    ...blogTerms
      .filter((t) => t.taxonomy === 'category' && t.post_count > 0)
      .map((t) => ({
        url: `${SITE_URL}/category/${t.slug}/`,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      })),

    // Tag blog: chỉ khai báo cái từ 3 bài trở lên
    ...blogTerms
      .filter((t) => t.taxonomy === 'tag' && t.post_count >= 3)
      .map((t) => ({
        url: `${SITE_URL}/tag/${t.slug}/`,
        changeFrequency: 'monthly' as const,
        priority: 0.3,
      })),

    ...pages
      .filter((p) => !redirected.has(p.slug))
      .map((p) => ({
        url: `${SITE_URL}/${p.slug}/`,
        changeFrequency: 'yearly' as const,
        priority: 0.4,
      })),
  ];
}
