import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getBlogTermWithPosts } from '@/lib/post-terms';
import { PostList } from '@/components/post-list';
import { ContactBar } from '@/components/contact-bar';

/** Tag blog: /tag/{slug}/ — giữ nguyên đường dẫn WordPress. */
export async function generateMetadata(props: PageProps<'/tag/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params;
  const res = await getBlogTermWithPosts('tag', slug);
  if (!res) return { title: 'Không tìm thấy' };
  const term = res.term;

  return {
    title: term.name,
    description: `Bài viết theo từ khoá ${term.name} — KOI Leather.`,
    alternates: { canonical: `/tag/${term.slug}/` },
    // Tag ít bài thì nội dung mỏng, không đẩy vào chỉ mục — nhưng địa chỉ
    // vẫn sống để không đứt liên kết nào đang trỏ tới.
    robots: term.post_count < 3 ? { index: false, follow: true } : undefined,
  };
}

export default async function BlogTagPage(props: PageProps<'/tag/[slug]'>) {
  const { slug } = await props.params;
  const res = await getBlogTermWithPosts('tag', slug);
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

        <p className="text-[12px] uppercase tracking-[0.2em] text-koi-gray-light">Từ khoá</p>
        <h1 className="mt-1 font-serif text-3xl text-koi-ink sm:text-4xl">{term.name}</h1>
        <p className="mt-2 text-[13px] tracking-wide text-koi-gray-light">{posts.length} bài</p>

        <PostList posts={posts} />
      </div>

      <ContactBar />
    </>
  );
}
