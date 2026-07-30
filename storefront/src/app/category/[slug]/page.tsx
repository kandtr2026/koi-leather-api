import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getBlogTermWithPosts } from '@/lib/post-terms';
import { PostList } from '@/components/post-list';
import { ContactBar } from '@/components/contact-bar';

/**
 * Chuyên mục blog: /category/{slug}/ — giữ nguyên đường dẫn WordPress.
 * Đây là ba cụm nội dung lớn nhất site (57, 53, 39 bài), không phải trang mỏng.
 */
export async function generateMetadata(props: PageProps<'/category/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params;
  const res = await getBlogTermWithPosts('category', slug);
  if (!res) return { title: 'Không tìm thấy chuyên mục' };
  const term = res.term;

  return {
    title: term.name,
    description: term.description || `Bài viết thuộc chuyên mục ${term.name} — KOI Leather.`,
    alternates: { canonical: `/category/${term.slug}/` },
  };
}

export default async function BlogCategoryPage(props: PageProps<'/category/[slug]'>) {
  const { slug } = await props.params;
  const res = await getBlogTermWithPosts('category', slug);
  if (!res) notFound();
  const { term, posts } = res;

  return (
    <>
      <div className="mx-auto max-w-4xl px-5 py-10 lg:px-8 lg:py-14">
        <nav className="mb-6 text-xs tracking-wide text-koi-gray-light">
          <Link href="/" className="hover:text-koi-orange-dark">Trang chủ</Link>
          <span className="mx-2">/</span>
          <Link href="/blog/" className="hover:text-koi-orange-dark">Bài viết</Link>
          <span className="mx-2">/</span>
          <span className="text-koi-gray">{term.name}</span>
        </nav>

        <p className="text-[12px] uppercase tracking-[0.2em] text-koi-gray-light">Chuyên mục</p>
        <h1 className="mt-1 font-serif text-3xl text-koi-ink sm:text-4xl">{term.name}</h1>
        <p className="mt-2 text-[13px] tracking-wide text-koi-gray-light">{posts.length} bài</p>

        {term.description ? (
          <p className="mt-4 max-w-2xl leading-relaxed text-koi-gray">{term.description}</p>
        ) : null}

        <PostList posts={posts} />
      </div>

      <ContactBar />
    </>
  );
}
