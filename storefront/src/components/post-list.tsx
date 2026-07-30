import Link from 'next/link';
import { plainText, formatDate } from '@/lib/format';
import type { Post } from '@/lib/types';

/** Danh sách bài viết — dùng chung cho trang blog, chuyên mục và tag. */
export function PostList({ posts }: { posts: Post[] }) {
  if (!posts.length) {
    return <p className="mt-10 text-koi-gray">Chưa có bài viết nào.</p>;
  }

  return (
    <div className="mt-10 divide-y divide-koi-line border-t border-koi-line">
      {posts.map((p) => (
        <article key={p.id} className="py-7">
          <Link href={`/${p.slug}/`} className="group block">
            <time className="text-xs tracking-wide text-koi-gray-light">
              {formatDate(p.published_at)}
            </time>
            <h2 className="mt-1.5 text-xl leading-snug text-koi-ink transition-colors group-hover:text-koi-orange-dark">
              {p.title}
            </h2>
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-koi-gray">
              {plainText(p.excerpt ?? p.content, 200)}
            </p>
          </Link>
        </article>
      ))}
    </div>
  );
}
