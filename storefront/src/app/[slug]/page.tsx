import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getContent, type ContentDoc } from '@/lib/api';
import { plainText, formatDate } from '@/lib/format';
import { slugVariants } from '@/lib/slug';
import { ContactBar } from '@/components/contact-bar';
import { LeadForm } from '@/components/lead-form';
import { zaloLink, messengerLink, phoneLink, prettyPhone } from '@/lib/contact';

/** Trang liên hệ cũ của WordPress chỉ có chữ — gắn thêm form vào. */
const CONTACT_SLUG = 'lien-he';

/**
 * WordPress đặt cả bài viết lẫn trang tĩnh ngay gốc: /shop-do-da-tphcm/
 * Route bắt-tất ở gốc này gọi API resolve bài viết → trang. Các đoạn cố định
 * (/cua-hang, /san-pham, /blog) luôn được Next ưu tiên trước route động.
 */
async function resolve(slug: string): Promise<ContentDoc | null> {
  // Thử lần lượt các biến thể slug: bài viết tiếng Hàn và vài tiêu đề dùng
  // ký tự Unicode đặc biệt được WordPress lưu ở dạng đã mã hoá.
  for (const s of slugVariants(slug)) {
    const found = await getContent(s);
    if (found) return found;
  }
  return null;
}

export async function generateMetadata(props: PageProps<'/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params;
  const found = await resolve(slug);
  if (!found) return { title: 'Không tìm thấy trang' };

  const d = found.doc as { title: string; meta_title?: string | null; meta_description?: string | null; content?: string | null };
  return {
    title: d.meta_title ?? d.title,
    description: d.meta_description ?? plainText(d.content, 160),
    alternates: { canonical: `/${slug}/` },
  };
}

export default async function SlugPage(props: PageProps<'/[slug]'>) {
  const { slug } = await props.params;
  const found = await resolve(slug);
  if (!found) notFound();

  const isPost = found.kind === 'post';
  const d = found.doc as {
    title: string;
    content: string | null;
    published_at?: string | null;
  };

  return (
    <>
      <article className="mx-auto max-w-3xl px-5 py-10 lg:px-8 lg:py-14">
        <nav className="mb-6 text-xs tracking-wide text-koi-gray-light">
          <Link href="/" className="hover:text-koi-orange-dark">Trang chủ</Link>
          <span className="mx-2">/</span>
          {isPost ? (
            <>
              <Link href="/blog/" className="hover:text-koi-orange-dark">Bài viết</Link>
              <span className="mx-2">/</span>
            </>
          ) : null}
          <span className="text-koi-gray">{d.title}</span>
        </nav>

        {isPost && d.published_at ? (
          <time className="text-xs tracking-wide text-koi-gray-light">{formatDate(d.published_at)}</time>
        ) : null}

        <h1 className="mt-2 font-serif text-3xl leading-tight text-koi-ink sm:text-4xl">{d.title}</h1>

        {d.content ? (
          <div className="prose-koi mt-8" dangerouslySetInnerHTML={{ __html: d.content }} />
        ) : null}

        {slug === CONTACT_SLUG ? (
          <section className="mt-12 border-t border-koi-line pt-10">
            <h2 className="text-2xl text-koi-ink">Để lại thông tin</h2>
            <p className="mt-2 text-sm text-koi-gray">
              Hoặc nhắn nhanh qua{' '}
              <a href={zaloLink()} target="_blank" rel="noopener noreferrer" className="text-koi-orange-dark underline">
                Zalo
              </a>
              ,{' '}
              <a href={messengerLink()} target="_blank" rel="noopener noreferrer" className="text-koi-orange-dark underline">
                Messenger
              </a>{' '}
              hay gọi{' '}
              <a href={phoneLink} className="text-koi-orange-dark underline">
                {prettyPhone()}
              </a>
              .
            </p>
            <div className="mt-6 max-w-md">
              <LeadForm />
            </div>
          </section>
        ) : null}
      </article>

      <ContactBar />
    </>
  );
}
