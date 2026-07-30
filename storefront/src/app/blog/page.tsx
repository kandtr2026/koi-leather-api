import Link from 'next/link';
import type { Metadata } from 'next';
import { getPosts } from '@/lib/api';
import { ContactBar } from '@/components/contact-bar';
import { PostList } from '@/components/post-list';

const PER_PAGE = 12;

export const metadata: Metadata = {
  title: 'Bài viết',
  description: 'Kiến thức về da thật, cách bảo quản đồ da, quà tặng doanh nghiệp và nghề thủ công.',
  alternates: { canonical: '/blog/' },
};

export default async function BlogPage(props: PageProps<'/blog'>) {
  const { page: pageParam } = await props.searchParams;
  const page = Math.max(1, Number(Array.isArray(pageParam) ? pageParam[0] : pageParam) || 1);

  const res = await getPosts(page, PER_PAGE);
  const posts = res.data;
  const categories = res.categories;
  const count = res.total;
  const totalPages = res.totalPages;

  return (
    <>
      <div className="mx-auto max-w-4xl px-5 py-10 lg:px-8 lg:py-14">
        <nav className="mb-6 text-xs tracking-wide text-koi-gray-light">
          <Link href="/" className="hover:text-koi-orange-dark">Trang chủ</Link>
          <span className="mx-2">/</span>
          <span className="text-koi-gray">Bài viết</span>
        </nav>

        <h1 className="font-serif text-3xl text-koi-ink sm:text-4xl">Bài viết</h1>
        <p className="mt-2 text-[13px] tracking-wide text-koi-gray-light">{count} bài</p>

        {/* Chuyên mục là ba cụm nội dung lớn nhất site — đưa lên đầu
            để khách và Google thấy được cấu trúc. */}
        {categories.length ? (
          <div className="mt-7 flex flex-wrap gap-2">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/category/${c.slug}/`}
                className="border border-koi-line px-4 py-2 text-[13px] text-koi-gray transition-colors hover:border-koi-ink hover:text-koi-ink"
              >
                {c.name}
                <span className="ml-1.5 text-koi-gray-light">{c.post_count}</span>
              </Link>
            ))}
          </div>
        ) : null}

        <PostList posts={posts} />

        {totalPages > 1 ? (
          <nav className="mt-12 flex flex-wrap justify-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <Link
                key={n}
                href={n === 1 ? '/blog/' : `/blog/?page=${n}`}
                className={`min-w-10 border px-3 py-2 text-center text-sm transition-colors ${
                  n === page
                    ? 'border-koi-ink bg-koi-ink text-white'
                    : 'border-koi-line text-koi-gray hover:border-koi-ink hover:text-koi-ink'
                }`}
              >
                {n}
              </Link>
            ))}
          </nav>
        ) : null}
      </div>

      <ContactBar />
    </>
  );
}
