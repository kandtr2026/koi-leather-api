'use client';

import { useRef, useState } from 'react';
import { useAdmin } from './admin-auth';

/**
 * Bọc quanh một <Image> sản phẩm. Với khách: render children y nguyên, không
 * thêm gì. Với admin đã đăng nhập: phủ một nút nhỏ ở góc để thay file ảnh tại
 * chỗ (giữ nguyên vị trí + cờ primary) qua PUT /products/:productId/images/:id/file.
 *
 * imageId có thể null (ảnh cũ / đường lui không có id) — khi đó không cho thay.
 */
export function ReplaceableImage({
  productId,
  imageId,
  className,
  children,
}: {
  productId: string;
  imageId: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  const { isAdmin, token, apiBase } = useAdmin();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const canReplace = isAdmin && !!imageId;

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // cho phép chọn lại cùng file
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Chỉ nhận file ảnh.');
      return;
    }
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(
        `${apiBase}/products/${productId}/images/${imageId}/file`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        },
      );
      if (!res.ok) {
        const msg = await res.text().catch(() => '');
        alert(`Thay ảnh thất bại (${res.status}). ${msg}`);
        return;
      }
      // Ảnh mới đã vào DB — làm mới trang để lấy URL mới.
      // (Cache /shop revalidate 60s; router.refresh kéo lại dữ liệu server.)
      window.location.reload();
    } catch {
      alert('Không kết nối được máy chủ khi thay ảnh.');
    } finally {
      setBusy(false);
    }
  }

  // ReplaceableImage thay thế đúng div-container của ảnh: nó nhận className của
  // container gốc (relative aspect-… overflow-hidden …) nên <Image fill> bên
  // trong hiển thị y như cũ. Với khách chỉ khác thêm class 'group/rep' vô hại;
  // nút chỉ dựng khi đủ quyền.
  return (
    <div className={`group/rep ${className ?? ''}`}>
      {children}
      {canReplace ? (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={onPick}
          />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              inputRef.current?.click();
            }}
            disabled={busy}
            className="absolute right-2 top-2 z-20 rounded-full bg-koi-ink/85 px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] text-koi-white opacity-0 shadow-md backdrop-blur transition-opacity duration-150 group-hover/rep:opacity-100 focus:opacity-100 disabled:cursor-wait"
          >
            {busy ? 'Đang tải…' : '↻ Thay ảnh'}
          </button>
        </>
      ) : null}
    </div>
  );
}
