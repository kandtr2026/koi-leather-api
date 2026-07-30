import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { PAGE_SIZE } from '@/lib/config';
import { getCategoryPage, type CategoryPage as CategoryPageData } from '@/lib/api';
import { plainText } from '@/lib/format';
import { ProductCard } from '@/components/product-card';
import { ContactBar } from '@/components/contact-bar';

/**
 * URL cũ của WordPress lồng theo danh mục cha:
 *   /san-pham/phu-kien-bang-da/ban-rap-thiet-ke/
 * Nên dùng catch-all và chỉ lấy đoạn CUỐI làm slug danh mục — mọi địa chỉ cũ
 * (một cấp hay nhiều cấp) đều còn sống.
 */
async function fetchCategory(
  path: string[],
  page: number,
): Promise<CategoryPageData | null> {
  const slug = path[path.length - 1];
  if (!slug) return null;
  try {
    return await getCategoryPage(slug, page);
  } catch {
    return null;
  }
}

export async function generateMetadata(props: PageProps<'/san-pham/[...path]'>): Promise<Metadata> {
  const { path } = await props.params;
  const res = await fetchCategory(path, 1);
  if (!res) return { title: 'Không tìm thấy danh mục' };
  const cat = res.category;

  return {
    title: cat.name,
    description: plainText(cat.description, 160) || `${cat.name} — đồ da thủ công KOI Leather.`,
    alternates: { canonical: `/san-pham/${path.join('/')}/` },
  };
}

export default async function CategoryPage(props: PageProps<'/san-pham/[...path]'>) {
  const { path } = await props.params;
  const { page: pageParam } = await props.searchParams;
  const page = Math.max(1, Number(Array.isArray(pageParam) ? pageParam[0] : pageParam) || 1);

  const res = await fetchCategory(path, page);
  if (!res) notFound();

  const cat = res.category;
  const products = res.data;
  const total = res.total;
  const totalPages = res.totalPages;
  const basePath = `/san-pham/${path.join('/')}/`;

  return (
    <>
      <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-14">
        <nav className="mb-6 text-xs tracking-wide text-koi-gray-light">
          <Link href="/" className="hover:text-koi-orange-dark">Trang chủ</Link>
          <span className="mx-2">/</span>
          <span className="text-koi-gray">{cat.name}</span>
        </nav>

        <h1 className="font-serif text-3xl text-koi-ink sm:text-4xl">{cat.name}</h1>
        <p className="mt-2 text-[13px] tracking-wide text-koi-gray-light">{total} sản phẩm</p>

        {cat.description ? (
          <div className="prose-koi mt-5 max-w-2xl text-sm" dangerouslySetInnerHTML={{ __html: cat.description }} />
        ) : null}

        {products.length ? (
          <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        ) : (
          <p className="mt-10 text-koi-gray">Chưa có sản phẩm trong danh mục này.</p>
        )}

        {totalPages > 1 ? (
          <nav className="mt-14 flex justify-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <Link
                key={n}
                href={n === 1 ? basePath : `${basePath}?page=${n}`}
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
