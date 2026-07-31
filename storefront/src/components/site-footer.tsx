import Link from 'next/link';
import { phoneLink, prettyPhone, zaloLink, messengerLink } from '@/lib/contact';
import { menuCategories } from '@/lib/queries';

export async function SiteFooter() {
  const cats = await menuCategories(4);

  return (
    <footer className="mt-24 bg-koi-etain-deep px-[clamp(18px,4vw,56px)] pb-10 pt-[clamp(48px,6vw,80px)] text-[#ddddd8]">
      <div className="mx-auto grid max-w-6xl gap-[clamp(28px,4vw,64px)] sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <p className="font-serif text-[22px] uppercase tracking-[0.2em] text-white">KOI</p>
          <p className="mt-4 max-w-[34ch] text-[13.5px] leading-relaxed text-[#b9b9b3]">
            Đồ da thủ công cao cấp. Da nhập châu Âu, hoàn thiện bằng tay bởi nghệ nhân Việt.
          </p>
        </div>

        <div>
          <p className="mb-4 text-[11px] uppercase tracking-[0.16em] text-[#9a9a94]">Bộ sưu tập</p>
          <div className="flex flex-col gap-2.5 text-[13.5px]">
            {cats.map((c) => (
              <Link key={c.id} href={`/san-pham/${c.slug}/`} className="k-underline self-start">
                {c.name}
              </Link>
            ))}
            <Link href="/cua-hang/" className="k-underline self-start">
              Tất cả sản phẩm
            </Link>
          </div>
        </div>

        <div>
          <p className="mb-4 text-[11px] uppercase tracking-[0.16em] text-[#9a9a94]">Về KOI</p>
          <div className="flex flex-col gap-2.5 text-[13.5px]">
            <Link href="/blog/" className="k-underline self-start">
              Câu chuyện &amp; chế tác
            </Link>
            <Link href="/blog/" className="k-underline self-start">
              Bài viết
            </Link>
          </div>
        </div>

        <div>
          <p className="mb-4 text-[11px] uppercase tracking-[0.16em] text-[#9a9a94]">Liên hệ</p>
          <div className="flex flex-col gap-2.5 text-[13.5px]">
            <a href={phoneLink} className="k-underline self-start">
              {prettyPhone()}
            </a>
            <a href={zaloLink()} target="_blank" rel="noopener noreferrer" className="k-underline self-start">
              Zalo
            </a>
            <a href={messengerLink()} target="_blank" rel="noopener noreferrer" className="k-underline self-start">
              Messenger
            </a>
          </div>
        </div>
      </div>

      <div className="mx-auto mt-[clamp(36px,4vw,56px)] flex max-w-6xl flex-wrap justify-between gap-2.5 border-t border-white/15 pt-6 text-[12px] text-[#9a9a94]">
        <span>© {new Date().getFullYear()} KOI Leather. Đã đăng ký bản quyền.</span>
        <span>Sài Gòn · Việt Nam</span>
      </div>
    </footer>
  );
}
