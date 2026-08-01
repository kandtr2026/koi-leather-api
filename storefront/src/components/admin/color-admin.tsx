'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from './admin-auth';
import { getColorFamilies, type ColorFamily } from '@/lib/api';

/**
 * Pick màu cho MỘT sản phẩm, ngay tại thẻ trên trang cửa hàng (chỉ admin).
 *
 * Không nội suy: màu chỉ có khi admin bấm chọn. Chọn nhóm màu (bắt buộc — dùng
 * để lọc) và có thể tinh chỉnh mã hex thật (chấm màu trên thẻ). "Xoá màu" đưa
 * SP về trạng thái chưa pick.
 *
 * Với khách (không đăng nhập): render null — chấm màu do product-card lo.
 */

// Danh sách nhóm màu ít khi đổi → cache ở module cho mọi thẻ dùng chung.
let familiesCache: ColorFamily[] | null = null;

export function ColorAdmin({
  productId,
  colorFamily,
  colorHex,
}: {
  productId: string;
  colorFamily: string | null;
  colorHex: string | null;
}) {
  const { isAdmin, token, apiBase } = useAdmin();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [families, setFamilies] = useState<ColorFamily[]>(familiesCache ?? []);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isAdmin || familiesCache) return;
    getColorFamilies()
      .then((f) => {
        familiesCache = f;
        setFamilies(f);
      })
      .catch(() => {});
  }, [isAdmin]);

  if (!isAdmin) return null;

  const current = families.find((f) => f.code === colorFamily) ?? null;

  async function save(body: { colorFamily: string | null; colorHex: string | null }) {
    setBusy(true);
    try {
      const res = await fetch(`${apiBase}/products/${productId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const msg = await res.text().catch(() => '');
        alert(`Lưu màu thất bại (${res.status}). ${msg}`);
        return;
      }
      // router.refresh() làm mới dữ liệu server (chấm màu + số đếm) nhưng GIỮ
      // trạng thái mở của popover, để pick nhiều SP liên tục cho nhanh.
      router.refresh();
    } catch {
      alert('Không kết nối được máy chủ khi lưu màu.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 text-left">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-koi-gray transition-colors hover:text-koi-ink"
      >
        <span
          aria-hidden
          className="inline-block h-3 w-3 shrink-0 rounded-full border border-koi-line"
          style={colorHex ? { backgroundColor: colorHex } : { borderStyle: 'dashed' }}
        />
        {current ? current.name : 'Chưa pick màu'}
        <span className="text-koi-gray-light">✎</span>
      </button>

      {open ? (
        <div className="mt-2 rounded-lg border border-koi-line bg-koi-white p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.14em] text-koi-gray-light">
              Chọn nhóm màu
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Đóng"
              className="text-koi-gray hover:text-koi-ink"
            >
              ✕
            </button>
          </div>

          <div className="grid grid-cols-6 gap-2">
            {families.map((f) => {
              const on = f.code === colorFamily;
              return (
                <button
                  key={f.code}
                  type="button"
                  disabled={busy}
                  title={f.name}
                  aria-label={f.name}
                  aria-pressed={on}
                  onClick={() => save({ colorFamily: f.code, colorHex: f.hex })}
                  className="flex items-center justify-center disabled:opacity-50"
                >
                  <span
                    className={`h-6 w-6 rounded-full border border-koi-line transition-shadow ${
                      on ? 'ring-2 ring-koi-ink ring-offset-1 ring-offset-koi-white' : ''
                    }`}
                    style={{ backgroundColor: f.hex }}
                  />
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 border-t border-koi-line pt-3">
            <label className="flex items-center gap-1.5 text-[11px] text-koi-gray">
              Hex thật
              <input
                type="color"
                defaultValue={colorHex ?? current?.hex ?? '#1a1a1a'}
                disabled={busy || !colorFamily}
                onBlur={(e) => save({ colorFamily, colorHex: e.target.value })}
                title={colorFamily ? 'Chỉnh mã màu thật' : 'Chọn nhóm màu trước'}
                className="h-6 w-9 cursor-pointer border border-koi-line bg-transparent p-0 disabled:cursor-not-allowed"
              />
            </label>
            {colorFamily ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => save({ colorFamily: null, colorHex: null })}
                className="text-[11px] text-koi-orange-dark underline underline-offset-2 hover:text-koi-ink"
              >
                Xoá màu
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
