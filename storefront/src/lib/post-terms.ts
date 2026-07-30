import { getBlogTerm } from './api';
import { slugVariants } from './slug';
import type { Post } from './types';

export type PostTerm = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  taxonomy: 'category' | 'tag';
  post_count: number;
};

/**
 * Chuyên mục / tag blog + bài viết thuộc nó — nay lấy qua API /shop/blog-terms.
 * Thử lần lượt biến thể slug: một số slug WordPress lưu ở dạng đã mã hoá.
 */
export async function getBlogTermWithPosts(
  taxonomy: 'category' | 'tag',
  slug: string,
): Promise<{ term: PostTerm; posts: Post[] } | null> {
  for (const s of slugVariants(slug)) {
    const found = await getBlogTerm(taxonomy, s);
    if (found) return found;
  }
  return null;
}
