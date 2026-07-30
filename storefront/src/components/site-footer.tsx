import Link from 'next/link';
import { phoneLink, prettyPhone, zaloLink, messengerLink } from '@/lib/contact';
import { menuCategories } from '@/lib/queries';

export async function SiteFooter() {
  const cats = await menuCategories(8);

  return (
    <footer className="mt-24 border-t border-koi-line bg-koi-cream">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div>
          <h3 className="font-serif text-2xl text-koi-ink">KOI Leather</h3>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-koi-gray">
            Đồ da thủ công cao cấp. Da nhập châu Âu, hoàn thiện bằng tay bởi nghệ nhân Việt.
          </p>
        </div>

        <div>
          <h4 className="text-[12px] uppercase tracking-[0.15em] text-koi-ink">Danh mục</h4>
          <ul className="mt-4 space-y-2">
            {cats.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/san-pham/${c.slug}/`}
                  className="text-sm text-koi-gray transition-colors hover:text-koi-orange-dark"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-[12px] uppercase tracking-[0.15em] text-koi-ink">Liên hệ</h4>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <a href={phoneLink} className="text-koi-gray hover:text-koi-orange-dark">
                {prettyPhone()}
              </a>
            </li>
            <li>
              <a
                href={zaloLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="text-koi-gray hover:text-koi-orange-dark"
              >
                Nhắn Zalo
              </a>
            </li>
            <li>
              <a
                href={messengerLink()}
                target="_blank"
                rel="noopener noreferrer"
                className="text-koi-gray hover:text-koi-orange-dark"
              >
                Messenger
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="text-[12px] uppercase tracking-[0.15em] text-koi-ink">Khám phá</h4>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              <Link href="/blog/" className="text-koi-gray hover:text-koi-orange-dark">
                Bài viết
              </Link>
            </li>
            <li>
              <Link href="/cua-hang/" className="text-koi-gray hover:text-koi-orange-dark">
                Toàn bộ sản phẩm
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-koi-line py-6 text-center text-xs tracking-wide text-koi-gray-light">
        © {new Date().getFullYear()} KOI Leather
      </div>
    </footer>
  );
}
