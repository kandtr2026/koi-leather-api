import Link from 'next/link';
import type { Metadata } from 'next';
import { getProducts } from '@/lib/api';
import { ProductCard } from '@/components/product-card';
import { ContactBar } from '@/components/contact-bar';
import type { ProductWithImages } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Tìm kiếm',
  robots: { index: false }, // trang kết quả không nên vào chỉ mục Google
};

export default async function SearchPage(props: PageProps<'/tim-kiem'>) {
  const { q } = await props.searchParams;
  const query = (Array.isArray(q) ? q[0] : q ?? '').trim();

  let products: ProductWithImages[] = [];

  if (query.length >= 2) {
    const res = await getProducts({ search: query, limit: 48 });
    products = res.data;
  }

  return (
    <>
      <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-14">
        <nav className="mb-6 text-xs tracking-wide text-koi-gray-light">
          <Link href="/" className="hover:text-koi-orange-dark">Trang chủ</Link>
          <span className="mx-2">/</span>
          <span className="text-koi-gray">Tìm kiếm</span>
        </nav>

        <h1 className="font-serif text-3xl text-koi-ink sm:text-4xl">Tìm kiếm</h1>

        <form action="/tim-kiem/" className="mt-6 flex max-w-xl gap-2">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Ví da nam, dây đồng hồ, túi cá sấu…"
            aria-label="Từ khoá tìm kiếm"
            className="flex-1 border border-koi-line px-4 py-3 text-sm outline-none transition-colors focus:border-koi-ink"
          />
          <button
            type="submit"
            className="bg-koi-ink px-6 text-[13px] uppercase tracking-[0.12em] text-white transition-colors hover:bg-koi-orange-dark"
          >
            Tìm
          </button>
        </form>

        {query.length >= 2 ? (
          <>
            <p className="mt-6 text-[13px] tracking-wide text-koi-gray-light">
              {products.length} kết quả cho “{query}”
            </p>

            {products.length ? (
              <div className="mt-8 grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
                {products.map((p) => (
                  <ProductCard key={p.id} p={p} />
                ))}
              </div>
            ) : (
              <div className="mt-8 max-w-xl">
                <p className="text-koi-gray">
                  Không tìm thấy sản phẩm nào. Thử từ khoá ngắn hơn, hoặc nhắn Zalo để được tư vấn —
                  nhiều mẫu làm theo yêu cầu chưa lên website.
                </p>
                <Link
                  href="/cua-hang/"
                  className="mt-5 inline-block border border-koi-ink px-6 py-3 text-[13px] uppercase tracking-[0.12em] text-koi-ink transition-colors hover:bg-koi-ink hover:text-white"
                >
                  Xem tất cả sản phẩm
                </Link>
              </div>
            )}
          </>
        ) : (
          <p className="mt-6 text-sm text-koi-gray">Nhập ít nhất 2 ký tự để tìm.</p>
        )}
      </div>

      <ContactBar />
    </>
  );
}
