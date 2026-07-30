import Link from 'next/link';
import Image from 'next/image';
import { imageUrl } from '@/lib/supabase';
import { getHome } from '@/lib/api';
import { homeCategories } from '@/lib/queries';
import { ProductCard } from '@/components/product-card';
import { ContactBar } from '@/components/contact-bar';
import { zaloLink } from '@/lib/contact';

export default async function HomePage() {
  // featured: sản phẩm nổi bật (giá cao nhất — thể hiện tay nghề rõ nhất).
  // categories: danh mục cho khối "Danh mục" (đã lọc danh mục ít hàng).
  const [home, categories] = await Promise.all([getHome(), homeCategories(6)]);
  const products = home.featured;

  return (
    <>
      {/* Mở đầu bằng chữ, không bằng ảnh băng rôn:
          329 sản phẩm thì việc của trang chủ là dẫn khách vào đúng ngách. */}
      <section className="mx-auto max-w-7xl px-5 pt-16 pb-14 lg:px-8 lg:pt-24 lg:pb-20">
        <p className="text-[12px] uppercase tracking-[0.25em] text-koi-orange-dark">
          Thủ công · Hơn 7 năm
        </p>
        <h1 className="mt-5 max-w-3xl font-serif text-4xl leading-[1.15] text-koi-ink sm:text-5xl lg:text-6xl">
          Đồ da làm bằng tay,
          <br />
          để dùng cả đời
        </h1>
        <p className="mt-6 max-w-xl leading-relaxed text-koi-gray">
          Da nhập từ châu Âu, hoàn thiện bởi nghệ nhân Việt. Mỗi món một dáng vẻ riêng,
          càng dùng càng đẹp.
        </p>
        <div className="mt-9 flex flex-wrap gap-3">
          <Link
            href="/cua-hang/"
            className="press bg-koi-ink px-8 py-3.5 text-[13px] uppercase tracking-[0.15em] text-white hover:bg-koi-orange-dark"
          >
            Xem sản phẩm
          </Link>
          <a
            href={zaloLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="press border border-koi-ink px-8 py-3.5 text-[13px] uppercase tracking-[0.15em] text-koi-ink hover:bg-koi-ink hover:text-white"
          >
            Tư vấn qua Zalo
          </a>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 lg:px-8">
        <h2 className="mb-8 text-2xl text-koi-ink">Danh mục</h2>
        <div className="grid grid-cols-2 gap-x-5 gap-y-8 lg:grid-cols-3">
          {categories.map((c) => {
            const cover = imageUrl(c.cover_image);
            return (
              <Link key={c.id} href={`/san-pham/${c.slug}/`} className="group block">
                <div className="relative aspect-[4/3] overflow-hidden bg-koi-cream">
                  {cover ? (
                    <Image
                      src={cover}
                      alt={c.name}
                      fill
                      sizes="(max-width: 1024px) 50vw, 33vw"
                      className="object-cover transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.04]"
                    />
                  ) : null}
                </div>
                <h3 className="mt-3 text-lg text-koi-ink transition-colors group-hover:text-koi-orange-dark">
                  {c.name}
                </h3>
                <p className="text-[13px] text-koi-gray-light">{c.product_count} sản phẩm</p>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-7xl px-5 lg:px-8">
        <h2 className="mb-8 text-2xl text-koi-ink">Tuyển chọn</h2>
        <div className="grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      </section>

      <ContactBar />
    </>
  );
}
