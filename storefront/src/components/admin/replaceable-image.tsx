'use client';

import { useRef, useState } from 'react';
import { useAdmin } from './admin-auth';

/**
 * Bọc quanh một <Image> sản phẩm để admin thay ảnh tại chỗ.
 *
 * Luồng: Bấm "Thay ảnh" → chọn file → xem trước → bấm "Lưu" để upload thật.
 * Ảnh cũ KHÔNG bị đụng chạm cho tới khi bấm Lưu thành công.
 *
 * Với khách (isAdmin=false hoặc imageId=null): render wrapper y nguyên, không
 * thêm gì (nút, overlay, preview đều không dựng).
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

  // null = chưa chọn; File = đang xem trước
  const [pending, setPending] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canReplace = isAdmin && !!imageId;

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Chỉ nhận file ảnh.');
      return;
    }
    // Giải phóng ObjectURL cũ nếu có
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPending(file);
    setPreviewUrl(URL.createObjectURL(file));
  }

  function onCancel() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPending(null);
    setPreviewUrl(null);
  }

  async function onSave() {
    if (!pending) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', pending);
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
        alert(`Lưu ảnh thất bại (${res.status}). ${msg}`);
        return;
      }
      // Ảnh mới đã vào DB — reload để lấy URL mới từ server.
      URL.revokeObjectURL(previewUrl!);
      window.location.reload();
    } catch {
      alert('Không kết nối được máy chủ khi lưu ảnh.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={`group/rep ${className ?? ''}`}>
      {/* Ảnh hiện tại (luôn render để layout không vỡ) */}
      <div className={pending ? 'opacity-30' : ''}>{children}</div>

      {/* XEM TRƯỚC: phủ lên ảnh cũ khi đã chọn file */}
      {previewUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={previewUrl}
          alt="Xem trước ảnh mới"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : null}

      {canReplace ? (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={onPick}
          />

          {pending ? (
            /* Panel xác nhận */
            <div className="absolute inset-x-2 bottom-2 z-30 flex gap-2">
              <button
                type="button"
                onClick={onSave}
                disabled={busy}
                className="flex-1 rounded-full bg-koi-orange px-3 py-2 text-[11px] uppercase tracking-[0.12em] text-white shadow-md disabled:cursor-wait disabled:opacity-70"
              >
                {busy ? 'Đang lưu…' : '✓ Lưu'}
              </button>
              <button
                type="button"
                onClick={onCancel}
                disabled={busy}
                className="flex-1 rounded-full bg-koi-ink/80 px-3 py-2 text-[11px] uppercase tracking-[0.12em] text-white shadow-md backdrop-blur disabled:opacity-70"
              >
                ✕ Hủy
              </button>
            </div>
          ) : (
            /* Nút chọn ảnh — chỉ hiện khi rê chuột */
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                inputRef.current?.click();
              }}
              className="absolute right-2 top-2 z-20 rounded-full bg-koi-ink/85 px-3 py-1.5 text-[11px] uppercase tracking-[0.12em] text-koi-white opacity-0 shadow-md backdrop-blur transition-opacity duration-150 group-hover/rep:opacity-100 focus:opacity-100"
            >
              ↻ Thay ảnh
            </button>
          )}
        </>
      ) : null}
    </div>
  );
}
