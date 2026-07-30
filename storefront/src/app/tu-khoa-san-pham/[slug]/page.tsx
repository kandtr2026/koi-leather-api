import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getProductTag, type ProductTagResult } from '@/lib/api';
import { slugVariants } from '@/lib/slug';
import { ProductCard } from '@/components/product-card';
import { ContactBar } from '@/components/contact-bar';

async function getTagWithProducts(slug: string): Promise<ProductTagResult | null> {
  for (const s of slugVariants(slug)) {
    const found = await getProductTag(s);
    if (found) return found;
  }
  return null;
}

export async function generateMetadata(props: PageProps<'/tu-khoa-san-pham/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params;
  const res = await getTagWithProducts(slug);
  if (!res) return { title: 'Không tìm thấy' };
  const tag = res.tag;

  return {
    title: tag.name,
    description: `Sản phẩm da thủ công KOI Leather theo từ khoá ${tag.name}.`,
    alternates: { canonical: `/tu-khoa-san-pham/${tag.slug}/` },
    // Tag ít sản phẩm thì nội dung mỏng, không nên vào chỉ mục Google —
    // nhưng địa chỉ vẫn sống để không mất liên kết đã có.
    robots: tag.product_count < 3 ? { index: false, follow: true } : undefined,
  };
}

export default async function TagPage(props: PageProps<'/tu-khoa-san-pham/[slug]'>) {
  const { slug } = await props.params;
  const res = await getTagWithProducts(slug);
  if (!res) notFound();
  const { tag, products } = res;

  return (
    <>
      <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-14">
        <nav className="mb-6 text-xs tracking-wide text-koi-gray-light">
          <Link href="/" className="hover:text-koi-orange-dark">Trang chủ</Link>
          <span className="mx-2">/</span>
          <Link href="/cua-hang/" className="hover:text-koi-orange-dark">Sản phẩm</Link>
          <span className="mx-2">/</span>
          <span className="text-koi-gray">{tag.name}</span>
        </nav>

        <p className="text-[12px] uppercase tracking-[0.2em] text-koi-gray-light">Từ khoá</p>
        <h1 className="mt-1 font-serif text-3xl text-koi-ink sm:text-4xl">{tag.name}</h1>
        <p className="mt-2 text-[13px] tracking-wide text-koi-gray-light">{products.length} sản phẩm</p>

        {products.length ? (
          <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-10 lg:grid-cols-4">
            {products.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        ) : (
          <div className="mt-10">
            <p className="text-koi-gray">Chưa có sản phẩm nào với từ khoá này.</p>
            <Link
              href="/cua-hang/"
              className="mt-5 inline-block border border-koi-ink px-6 py-3 text-[13px] uppercase tracking-[0.12em] text-koi-ink transition-colors hover:bg-koi-ink hover:text-white"
            >
              Xem tất cả sản phẩm
            </Link>
          </div>
        )}
      </div>

      <ContactBar />
    </>
  );
}
