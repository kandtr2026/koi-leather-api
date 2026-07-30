import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { imageUrl } from '@/lib/supabase';
import { getProductBySlug, type ProductDetail } from '@/lib/api';
import { slugVariants } from '@/lib/slug';
import { priceLabel, plainText } from '@/lib/format';
import { zaloLink, messengerLink, phoneLink, prettyPhone, SITE_URL } from '@/lib/contact';
import { ProductGallery } from '@/components/product-gallery';
import { ProductCard } from '@/components/product-card';
import { ContactBar } from '@/components/contact-bar';

async function getProduct(slug: string): Promise<ProductDetail | null> {
  // Thử lần lượt các biến thể slug: một số slug WordPress cũ lưu ở dạng
  // đã mã hoá (xem lib/slug.ts).
  for (const s of slugVariants(slug)) {
    const p = await getProductBySlug(s);
    if (p) return p;
  }
  return null;
}

export async function generateMetadata(props: PageProps<'/cua-hang/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params;
  const p = await getProduct(slug);
  if (!p) return { title: 'Không tìm thấy sản phẩm' };

  const desc = p.meta_description ?? plainText(p.description, 160);
  const cover = p.product_images?.find((i) => i.is_primary) ?? p.product_images?.[0];

  return {
    title: p.meta_title ?? p.name,
    description: desc,
    // Giữ nguyên địa chỉ cũ của WordPress làm canonical — đây là thứ
    // báo cho Google biết trang này vẫn là trang cũ, không phải bản sao.
    alternates: { canonical: `/cua-hang/${p.slug}/` },
    openGraph: {
      title: p.name,
      description: desc,
      url: `/cua-hang/${p.slug}/`,
      images: cover ? [{ url: imageUrl(cover.storage_path)! }] : undefined,
    },
  };
}

export default async function ProductPage(props: PageProps<'/cua-hang/[slug]'>) {
  const { slug } = await props.params;
  const p = await getProduct(slug);
  if (!p) notFound();

  const images = [...(p.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const variants = p.variants ?? [];
  const cats = p.categories ?? [];
  const related = p.related ?? [];

  const url = `${SITE_URL}/cua-hang/${p.slug}/`;

  // Dữ liệu có cấu trúc cho Google — giúp hiện giá và ảnh ngay trên kết quả tìm kiếm
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: plainText(p.description, 500),
    image: images.slice(0, 5).map((i) => imageUrl(i.storage_path)),
    sku: p.sku ?? undefined,
    brand: { '@type': 'Brand', name: 'KOI Leather' },
    offers: {
      '@type': 'Offer',
      price: p.price ?? p.price_min ?? undefined,
      priceCurrency: 'VND',
      availability: p.is_available
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      url,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8 lg:py-12">
        <nav className="mb-6 text-xs tracking-wide text-koi-gray-light">
          <Link href="/" className="hover:text-koi-orange-dark">Trang chủ</Link>
          <span className="mx-2">/</span>
          <Link href="/cua-hang/" className="hover:text-koi-orange-dark">Sản phẩm</Link>
          <span className="mx-2">/</span>
          <span className="text-koi-gray">{p.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
          <ProductGallery images={images} name={p.name} />

          <div className="lg:pt-4">
            <h1 className="font-serif text-3xl leading-tight text-koi-ink sm:text-4xl">{p.name}</h1>

            <p className="mt-4 text-xl tracking-wide text-koi-ink">{priceLabel(p)}</p>

            {variants.length ? (
              <div className="mt-7">
                <p className="text-[12px] uppercase tracking-[0.15em] text-koi-ink">Tuỳ chọn</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {variants.map((v) => (
                    <span
                      key={v.id}
                      className="border border-koi-line px-3 py-1.5 text-[13px] text-koi-gray"
                    >
                      {v.name ?? Object.values(v.attributes ?? {}).join(' / ')}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-xs text-koi-gray-light">
                  Nhắn tin để được tư vấn tuỳ chọn phù hợp.
                </p>
              </div>
            ) : null}

            {/* Không bán online — đây là nơi chốt đơn */}
            <div className="mt-9 space-y-3">
              <a
                href={zaloLink(p.name, url)}
                target="_blank"
                rel="noopener noreferrer"
                className="press flex w-full items-center justify-center bg-koi-orange px-6 py-4 text-[13px] uppercase tracking-[0.15em] text-white hover:bg-koi-orange-dark"
              >
                Nhắn Zalo hỏi mẫu này
              </a>

              <div className="grid grid-cols-2 gap-3">
                <a
                  href={messengerLink(p.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="press flex items-center justify-center border border-koi-ink px-4 py-3.5 text-[13px] uppercase tracking-[0.12em] text-koi-ink hover:bg-koi-ink hover:text-white"
                >
                  Messenger
                </a>
                <a
                  href={phoneLink}
                  className="press flex items-center justify-center border border-koi-ink px-4 py-3.5 text-[13px] uppercase tracking-[0.12em] text-koi-ink hover:bg-koi-ink hover:text-white"
                >
                  {prettyPhone()}
                </a>
              </div>
            </div>

            {cats.length ? (
              <div className="mt-8 border-t border-koi-line pt-5">
                <p className="text-[12px] uppercase tracking-[0.15em] text-koi-gray-light">Danh mục</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                  {cats.map((c) => (
                    <Link
                      key={c.id}
                      href={`/san-pham/${c.slug}/`}
                      className="text-sm text-koi-gray hover:text-koi-orange-dark"
                    >
                      {c.name}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        {p.description ? (
          <section className="mt-16 max-w-3xl border-t border-koi-line pt-10">
            <h2 className="mb-5 text-2xl text-koi-ink">Mô tả sản phẩm</h2>
            <div className="prose-koi" dangerouslySetInnerHTML={{ __html: p.description }} />
          </section>
        ) : null}

        {related.length ? (
          <section className="mt-20 border-t border-koi-line pt-12">
            <h2 className="mb-8 text-2xl text-koi-ink">Có thể bạn quan tâm</h2>
            <div className="grid grid-cols-2 gap-x-5 gap-y-9 lg:grid-cols-4">
              {related.map((r) => (
                <ProductCard key={r.id} p={r} />
              ))}
            </div>
          </section>
        ) : null}
      </div>

      {/* Thanh liên hệ mang sẵn tên sản phẩm này */}
      <ContactBar productName={p.name} />
    </>
  );
}
