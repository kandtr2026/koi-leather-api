import Link from 'next/link';
import type { Metadata } from 'next';
import { PAGE_SIZE } from '@/lib/config';
import { getProducts, getShopFilters } from '@/lib/api';
import { ProductCard } from '@/components/product-card';
import { ShopFilters } from '@/components/shop-filters';
import { ContactBar } from '@/components/contact-bar';

export const metadata: Metadata = {
  title: 'Tất cả sản phẩm',
  description: 'Toàn bộ đồ da thủ công KOI Leather: túi, ví, dây lưng, dây đồng hồ, phụ kiện da.',
  alternates: { canonical: '/cua-hang/' },
};

const one = (v: string | string[] | undefined): string | undefined =>
  (Array.isArray(v) ? v[0] : v) || undefined;

export default async function ShopPage(props: PageProps<'/cua-hang'>) {
  const sp = await props.searchParams;
  const page = Math.max(1, Number(one(sp.page)) || 1);
  const category = one(sp.category);
  const material = one(sp.material);
  const imageType = one(sp.imageType);

  const [filters, list] = await Promise.all([
    getShopFilters(),
    getProducts({ page, limit: PAGE_SIZE, category, material, imageType }),
  ]);

  const products = list.data;
  const total = list.total;
  const totalPages = list.totalPages;

  // Giữ nguyên bộ lọc khi bấm phân trang.
  const pageHref = (n: number) => {
    const q = new URLSearchParams();
    if (category) q.set('category', category);
    if (material) q.set('material', material);
    if (imageType) q.set('imageType', imageType);
    if (n > 1) q.set('page', String(n));
    const qs = q.toString();
    return qs ? `/cua-hang/?${qs}` : '/cua-hang/';
  };

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

        <div className="mt-8 lg:grid lg:grid-cols-[220px_1fr] lg:gap-10">
          <ShopFilters filters={filters} active={{ category, material, imageType }} />

          <div>
            {products.length ? (
              <div className="grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-3 xl:grid-cols-4">
                {products.map((p) => (
                  <ProductCard key={p.id} p={p} />
                ))}
              </div>
            ) : (
              <p className="py-20 text-center text-[13px] text-koi-gray-light">
                Không có sản phẩm nào khớp bộ lọc.
              </p>
            )}

            {totalPages > 1 ? (
              <nav className="mt-14 flex flex-wrap justify-center gap-2">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <Link
                    key={n}
                    href={pageHref(n)}
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
        </div>
      </div>

      <ContactBar />
    </>
  );
}
