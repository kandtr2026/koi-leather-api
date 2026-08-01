'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { ShopFilters } from '@/lib/api';

/**
 * Sidebar lọc sản phẩm cho trang /cua-hang.
 *
 * Ba nhóm: Danh mục sản phẩm (slug), Loại da (code), Loại ảnh (code). Mỗi lần
 * chọn/bỏ chọn sẽ cập nhật query string và điều hướng — trang server đọc lại
 * searchParams để lọc. Reset về trang 1 mỗi khi đổi bộ lọc.
 */
export function ShopFilters({
  filters,
  active,
}: {
  filters: ShopFilters;
  active: { category?: string; material?: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const activeCount =
    (active.category ? 1 : 0) +
    (active.material ? 1 : 0);

  function setParam(key: 'category' | 'material', value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (params.get(key) === value) {
      params.delete(key); // bấm lại mục đang chọn = bỏ lọc
    } else {
      params.set(key, value);
    }
    params.delete('page'); // đổi bộ lọc → về trang 1
    const qs = params.toString();
    router.push(qs ? `/cua-hang/?${qs}` : '/cua-hang/');
  }

  function clearAll() {
    router.push('/cua-hang/');
  }

  const body = (
    <div className="space-y-8">
      {activeCount > 0 ? (
        <button
          onClick={clearAll}
          className="text-[12px] font-medium text-koi-orange-dark underline underline-offset-4 hover:text-koi-ink"
        >
          Xoá bộ lọc ({activeCount})
        </button>
      ) : null}

      <FilterGroup
        title="Danh mục sản phẩm"
        items={filters.categories.map((c) => ({
          key: c.slug,
          label: c.name,
          count: c.count,
        }))}
        activeKey={active.category}
        onSelect={(k) => setParam('category', k)}
      />

      <FilterGroup
        title="Loại da"
        items={filters.materials.map((m) => ({
          key: m.code,
          label: m.name,
          count: m.count,
        }))}
        activeKey={active.material}
        onSelect={(k) => setParam('material', k)}
      />
    </div>
  );

  return (
    <>
      {/* Nút mở bộ lọc trên mobile */}
      <button
        onClick={() => setOpen(true)}
        className="mb-6 inline-flex items-center gap-2 border border-koi-line px-4 py-2 text-[13px] text-koi-gray lg:hidden"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M3 5h18M6 12h12M10 19h4" strokeLinecap="round" />
        </svg>
        Lọc{activeCount > 0 ? ` (${activeCount})` : ''}
      </button>

      {/* Sidebar cố định trên desktop */}
      <aside className="hidden lg:block">{body}</aside>

      {/* Drawer trên mobile */}
      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-koi-ink/40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[82%] max-w-sm overflow-y-auto bg-koi-white p-6 shadow-2xl">
            <div className="mb-6 flex items-center justify-between">
              <span className="font-serif text-lg text-koi-ink">Bộ lọc</span>
              <button
                onClick={() => setOpen(false)}
                className="text-koi-gray hover:text-koi-ink"
                aria-label="Đóng"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            {body}
          </div>
        </div>
      ) : null}
    </>
  );
}

function FilterGroup({
  title,
  items,
  activeKey,
  onSelect,
}: {
  title: string;
  items: { key: string; label: string; count: number }[];
  activeKey?: string;
  onSelect: (key: string) => void;
}) {
  if (!items.length) return null;
  return (
    <div>
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-koi-gray-light">
        {title}
      </h3>
      <ul className="space-y-1.5">
        {items.map((it) => {
          const on = activeKey === it.key;
          return (
            <li key={it.key}>
              <button
                onClick={() => onSelect(it.key)}
                className={`flex w-full items-center justify-between gap-2 text-left text-[13px] transition-colors ${
                  on
                    ? 'font-semibold text-koi-orange-dark'
                    : 'text-koi-gray hover:text-koi-ink'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`inline-block h-3 w-3 shrink-0 rounded-sm border transition-colors ${
                      on
                        ? 'border-koi-orange-dark bg-koi-orange-dark'
                        : 'border-koi-line'
                    }`}
                  />
                  {it.label}
                </span>
                <span className="text-[11px] text-koi-gray-light">{it.count}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
