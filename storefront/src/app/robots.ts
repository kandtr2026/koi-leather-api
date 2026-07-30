import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/contact';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Trang kết quả tìm kiếm và khu quản trị không nên vào chỉ mục
      disallow: ['/tim-kiem/', '/quan-tri/'],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
