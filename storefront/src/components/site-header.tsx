import Link from 'next/link';
import { phoneLink, prettyPhone, zaloLink } from '@/lib/contact';
import { menuCategories } from '@/lib/queries';
import { MobileMenu } from './mobile-menu';

export async function SiteHeader() {
  const cats = await menuCategories(6);
  // Cột trái của mega menu — chia làm đôi cho cân.
  const half = Math.ceil(cats.length / 2);

  return (
    <>
      {/* THANH THÔNG BÁO */}
      <div className="bg-koi-ink px-4 py-2.5 text-center text-[12px] uppercase tracking-[0.14em] text-koi-white">
        Giao nội thành 48h · Bảo hành đường chỉ trọn đời · Nhắn Zalo {prettyPhone()}
      </div>

      <header className="sticky top-0 z-[60] border-b border-koi-line bg-koi-bg">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center px-[clamp(18px,4vw,56px)] py-4">
          {/* NAV TRÁI (desktop) */}
          <nav className="hidden items-center gap-7 text-[12.5px] lg:flex">
            <Link href="/cua-hang/" className="k-underline uppercase tracking-[0.16em]">
              Mới về
            </Link>

            {/* Mega menu: hiện panel toàn chiều rộng khi rê chuột */}
            <div className="group/mega static">
              <Link href="/cua-hang/" className="k-underline uppercase tracking-[0.16em]">
                Sản phẩm
              </Link>
              <div className="invisible absolute inset-x-0 top-full z-[70] translate-y-[-6px] border-y border-koi-line bg-koi-bg px-[clamp(18px,4vw,56px)] py-9 opacity-0 transition-all duration-200 group-hover/mega:visible group-hover/mega:translate-y-0 group-hover/mega:opacity-100">
                <div className="mx-auto grid max-w-5xl grid-cols-2 gap-9 md:grid-cols-3">
                  <div>
                    <p className="mb-3.5 text-[11px] uppercase tracking-[0.16em] text-koi-orange-dark">
                      Danh mục
                    </p>
                    <div className="flex flex-col gap-2.5 text-[13.5px]">
                      {cats.slice(0, half).map((c) => (
                        <Link
                          key={c.id}
                          href={`/san-pham/${c.slug}/`}
                          className="k-underline self-start"
                        >
                          {c.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-3.5 text-[11px] uppercase tracking-[0.16em] text-koi-orange-dark">
                      &nbsp;
                    </p>
                    <div className="flex flex-col gap-2.5 text-[13.5px]">
                      {cats.slice(half).map((c) => (
                        <Link
                          key={c.id}
                          href={`/san-pham/${c.slug}/`}
                          className="k-underline self-start"
                        >
                          {c.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-3.5 text-[11px] uppercase tracking-[0.16em] text-koi-orange-dark">
                      Khám phá
                    </p>
                    <div className="flex flex-col gap-2.5 text-[13.5px]">
                      <Link href="/cua-hang/" className="k-underline self-start">
                        Tất cả sản phẩm
                      </Link>
                      <Link href="/lookbook/" className="k-underline self-start">
                        Lookbook
                      </Link>
                      <Link href="/blog/" className="k-underline self-start">
                        Bài viết &amp; chế tác
                      </Link>
                      <a href={zaloLink()} target="_blank" rel="noopener noreferrer" className="k-underline self-start">
                        Tư vấn Zalo
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Link href="/lookbook/" className="k-underline uppercase tracking-[0.16em]">
              Lookbook
            </Link>

            <Link href="/blog/" className="k-underline uppercase tracking-[0.16em]">
              Chế tác
            </Link>
          </nav>

          {/* LOGO GIỮA */}
          <Link href="/" className="justify-self-center text-center">
            <span className="block font-serif text-[28px] uppercase leading-none tracking-[0.2em] text-koi-ink">
              KOI
            </span>
            <span className="mt-[3px] block text-[9.5px] uppercase tracking-[0.42em] text-koi-etain-deep">
              Leather · Saigon
            </span>
          </Link>

          {/* ACTIONS PHẢI */}
          <div className="flex items-center justify-self-end gap-5 text-[12.5px]">
            <form action="/tim-kiem/" className="hidden md:block">
              <input
                type="search"
                name="q"
                placeholder="Tìm sản phẩm…"
                aria-label="Tìm sản phẩm"
                className="w-40 border-b border-koi-line bg-transparent pb-1 text-sm outline-none transition-colors focus:border-koi-ink lg:w-48"
              />
            </form>
            <a
              href={phoneLink}
              className="k-underline hidden uppercase tracking-[0.16em] text-koi-orange-dark lg:block"
            >
              {prettyPhone()}
            </a>
            <MobileMenu cats={cats} />
          </div>
        </div>
      </header>
    </>
  );
}
