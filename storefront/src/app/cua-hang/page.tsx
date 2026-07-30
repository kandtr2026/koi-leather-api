import Link from 'next/link';
import type { Metadata } from 'next';
import { PAGE_SIZE } from '@/lib/config';
import { getProducts } from '@/lib/api';
import { menuCategories } from '@/lib/queries';
import { ProductCard } from '@/components/product-card';
import { ContactBar } from '@/components/contact-bar';

export const metadata: Metadata = {
  title: 'Tất cả sản phẩm',
  description: 'Toàn bộ đồ da thủ công KOI Leather: túi, ví, dây lưng, dây đồng hồ, phụ kiện da.',
  alternates: { canonical: '/cua-hang/' },
};

export default async function ShopPage(props: PageProps<'/cua-hang'>) {
  const { page: pageParam } = await props.searchParams;
  const page = Math.max(1, Number(Array.isArray(pageParam) ? pageParam[0] : pageParam) || 1);

  const [cats, list] = await Promise.all([
    menuCategories(10),
    getProducts({ page, limit: PAGE_SIZE }),
  ]);

  const products = list.data;
  const total = list.total;
  const totalPages = list.totalPages;

  return (
    <>
      <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-14">
        <nav className="mb-6 text-xs tracking-wide text-koi-gray-light">
          <Link href="/" className="hover:text-koi-orange-dark">Trang chủ</Link>
          <span className="mx-2">/</span>
          <span className="text-koi-gray">Sản phẩm</span>
        </nav>

        <h1 className="font-serif text-3xl text-koi-ink sm:text-4xl">Tất cả sản phẩm</h1>
        <p className="mt-2 text-[13px] tracking-wide text-koi-gray-light">{total} sản phẩm</p>

        <div className="mt-7 flex flex-wrap gap-2">
          {cats.map((c) => (
            <Link
              key={c.id}
              href={`/san-pham/${c.slug}/`}
              className="border border-koi-line px-4 py-2 text-[13px] text-koi-gray transition-colors hover:border-koi-ink hover:text-koi-ink"
            >
              {c.name}
            </Link>
          ))}
        </div>

        <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>

        {totalPages > 1 ? (
          <nav className="mt-14 flex flex-wrap justify-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <Link
                key={n}
                href={n === 1 ? '/cua-hang/' : `/cua-hang/?page=${n}`}
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
