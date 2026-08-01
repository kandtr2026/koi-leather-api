import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { getLookbook } from '@/lib/api';
import { imageUrl } from '@/lib/supabase';
import { ContactBar } from '@/components/contact-bar';

export const metadata: Metadata = {
  title: 'Lookbook',
  description:
    'Đồ da thủ công KOI Leather trong đời sống và quá trình chế tác. Chạm vào mỗi tấm ảnh để xem sản phẩm.',
  alternates: { canonical: '/lookbook/' },
};

/**
 * Lookbook: gallery ảnh bối cảnh/chế tác (Lifestyle, Stamping…), KHÔNG phải bộ
 * lọc trong trang bán hàng. Mỗi tấm ảnh dẫn thẳng về sản phẩm — đây là cách
 * "xem bằng hình" đúng nghĩa, tránh ngõ cụt như khi nhét loại ảnh vào /cua-hang.
 */
export default async function LookbookPage() {
  const shots = await getLookbook();

  return (
    <>
      <div className="mx-auto max-w-7xl px-5 py-10 lg:px-8 lg:py-14">
        <nav className="mb-6 text-xs tracking-wide text-koi-gray-light">
          <Link href="/" className="hover:text-koi-orange-dark">Trang chủ</Link>
          <span className="mx-2">/</span>
          <span className="text-koi-gray">Lookbook</span>
        </nav>

        <h1 className="font-serif text-3xl text-koi-ink sm:text-4xl">Lookbook</h1>
        <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-koi-gray">
          Đồ da KOI trong đời sống và trên bàn chế tác. Chạm vào tấm ảnh bạn thích
          để xem sản phẩm.
        </p>

        {shots.length ? (
          <div className="mt-10 grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3">
            {shots.map((s) => {
              const src = imageUrl(s.src);
              if (!src) return null;
              return (
                <Link
                  key={s.src}
                  href={`/cua-hang/${s.slug}/`}
                  className="group relative block aspect-[4/5] overflow-hidden bg-koi-cream"
                >
                  <Image
                    src={src}
                    alt={s.alt}
                    fill
                    sizes="(max-width: 640px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.05]"
                  />
                  {/* Lớp phủ hiện tên sản phẩm khi rê chuột / trên mobile luôn mờ nhẹ */}
                  <div className="absolute inset-0 flex items-end bg-gradient-to-t from-koi-ink/70 via-koi-ink/0 to-transparent opacity-100 transition-opacity duration-300 lg:opacity-0 lg:group-hover:opacity-100">
                    <div className="p-4">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-white/70">
                        {s.typeName}
                      </p>
                      <p className="mt-1 text-[14px] leading-snug text-white">
                        {s.name}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <p className="py-20 text-center text-[13px] text-koi-gray-light">
            Chưa có ảnh lookbook.
          </p>
        )}
      </div>

      <ContactBar />
    </>
  );
}
