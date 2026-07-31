'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { phoneLink, prettyPhone } from '@/lib/contact';
import type { Category } from '@/lib/types';

/**
 * Ngăn kéo menu cho điện thoại. Tách thành client component vì cần trạng thái
 * đóng/mở; phần header còn lại vẫn là server component để lấy danh mục.
 */
export function MobileMenu({ cats }: { cats: Category[] }) {
  const [open, setOpen] = useState(false);

  // Khoá cuộn nền khi ngăn kéo mở, và đóng bằng phím Esc.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label="Mở menu"
        onClick={() => setOpen(true)}
        className="press flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-koi-ink lg:hidden"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
        Menu
      </button>

      {/* Màn che */}
      <div
        onClick={() => setOpen(false)}
        aria-hidden
        className={`fixed inset-0 z-[80] bg-koi-ink/40 transition-opacity duration-300 lg:hidden ${
          open ? 'visible opacity-100' : 'invisible opacity-0'
        }`}
      />

      {/* Ngăn kéo */}
      <aside
        className={`fixed inset-y-0 right-0 z-[90] flex w-[min(84vw,340px)] flex-col bg-koi-bg px-6 pb-10 pt-6 shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] lg:hidden ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="mb-7 flex items-center justify-between">
          <span className="text-[12px] uppercase tracking-[0.16em] text-koi-etain-deep">Menu</span>
          <button
            type="button"
            aria-label="Đóng menu"
            onClick={() => setOpen(false)}
            className="press text-lg text-koi-ink"
          >
            ✕
          </button>
        </div>

        <nav className="flex flex-col gap-5 font-serif text-[22px] text-koi-ink">
          {cats.map((c) => (
            <Link key={c.id} href={`/san-pham/${c.slug}/`} onClick={() => setOpen(false)}>
              {c.name}
            </Link>
          ))}
          <Link href="/cua-hang/" onClick={() => setOpen(false)}>
            Tất cả sản phẩm
          </Link>
          <Link href="/blog/" onClick={() => setOpen(false)}>
            Bài viết
          </Link>
        </nav>

        <a
          href={phoneLink}
          className="press mt-auto flex items-center justify-center border border-koi-orange px-6 py-3.5 text-[13px] uppercase tracking-[0.16em] text-koi-orange-dark hover:bg-koi-orange hover:text-koi-white"
        >
          Gọi {prettyPhone()}
        </a>
      </aside>
    </>
  );
}
