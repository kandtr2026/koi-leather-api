import Link from 'next/link';
import Image from 'next/image';
import { phoneLink, prettyPhone } from '@/lib/contact';
import { menuCategories } from '@/lib/queries';

export async function SiteHeader() {
  const cats = await menuCategories(6);

  return (
    <header className="sticky top-0 z-30 border-b border-koi-line bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-4 lg:px-8">
        <Link href="/" className="shrink-0">
          <Image
            src="/KOILOGO.png"
            alt="KOI Leather"
            width={200}
            height={117}
            priority
            className="h-9 w-auto"
          />
        </Link>

        <nav className="hidden items-center gap-7 lg:flex">
          {cats.map((c) => (
            <Link
              key={c.id}
              href={`/san-pham/${c.slug}/`}
              className="text-[13px] uppercase tracking-[0.12em] text-koi-gray transition-colors hover:text-koi-orange-dark"
            >
              {c.name}
            </Link>
          ))}
          <Link
            href="/blog/"
            className="text-[13px] uppercase tracking-[0.12em] text-koi-gray transition-colors hover:text-koi-orange-dark"
          >
            Bài viết
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-4">
          <form action="/tim-kiem/" className="hidden md:block">
            <input
              type="search"
              name="q"
              placeholder="Tìm sản phẩm…"
              aria-label="Tìm sản phẩm"
              className="w-44 border-b border-koi-line bg-transparent pb-1 text-sm outline-none transition-colors focus:border-koi-ink lg:w-52"
            />
          </form>

          <a
            href={phoneLink}
            className="hidden text-sm tracking-wide text-koi-ink transition-colors hover:text-koi-orange-dark lg:block"
          >
            {prettyPhone()}
          </a>
        </div>
      </div>
    </header>
  );
}
