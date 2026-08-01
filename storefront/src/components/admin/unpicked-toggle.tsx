'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useAdmin } from './admin-auth';

/**
 * Nút admin trên /cua-hang: chỉ hiện sản phẩm CHƯA pick màu, để quét cho hết.
 * Ẩn hoàn toàn với khách. Bật/tắt qua query ?unpicked=1 (server đọc và lọc).
 */
export function UnpickedToggle() {
  const { isAdmin } = useAdmin();
  const router = useRouter();
  const searchParams = useSearchParams();

  if (!isAdmin) return null;

  const on = searchParams.get('unpicked') === '1';

  function toggle() {
    const params = new URLSearchParams(searchParams.toString());
    if (on) params.delete('unpicked');
    else params.set('unpicked', '1');
    params.delete('page');
    const qs = params.toString();
    router.push(qs ? `/cua-hang/?${qs}` : '/cua-hang/');
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`mt-4 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[11px] uppercase tracking-[0.14em] transition-colors ${
        on
          ? 'border-koi-orange bg-koi-orange text-white'
          : 'border-koi-line text-koi-gray hover:border-koi-ink hover:text-koi-ink'
      }`}
    >
      <span
        aria-hidden
        className="inline-block h-3 w-3 rounded-full border border-current"
        style={{ borderStyle: 'dashed' }}
      />
      {on ? 'Đang lọc: chưa pick màu' : 'Chỉ hiện chưa pick màu'}
    </button>
  );
}
