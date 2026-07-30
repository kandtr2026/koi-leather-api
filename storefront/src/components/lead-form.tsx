'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { submitLead, type LeadState } from '@/app/actions';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="press w-full bg-koi-ink px-6 py-3.5 text-[13px] uppercase tracking-[0.15em] text-white hover:bg-koi-orange-dark disabled:opacity-50"
    >
      {pending ? 'Đang gửi…' : 'Gửi thông tin'}
    </button>
  );
}

export function LeadForm({ productId, productName }: { productId?: number; productName?: string }) {
  const [state, action] = useActionState<LeadState, FormData>(submitLead, null);

  if (state?.ok) {
    return (
      // Khách vừa để lại số điện thoại — khoảnh khắc này phải thấy được
      // ghi nhận, không phải giật một phát đổi nội dung.
      <div className="lead-success border border-koi-line bg-koi-cream p-6">
        <p className="text-koi-ink">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      {productId ? <input type="hidden" name="product_id" value={productId} /> : null}

      {/* Bẫy spam — ẩn với người, bot vẫn thấy và điền vào */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      <div>
        <label htmlFor="lead-name" className="mb-1.5 block text-[12px] uppercase tracking-[0.12em] text-koi-gray">
          Tên của bạn
        </label>
        <input
          id="lead-name"
          name="name"
          required
          autoComplete="name"
          className="w-full border border-koi-line px-4 py-3 text-sm outline-none transition-colors focus:border-koi-ink"
        />
      </div>

      <div>
        <label htmlFor="lead-phone" className="mb-1.5 block text-[12px] uppercase tracking-[0.12em] text-koi-gray">
          Số điện thoại
        </label>
        <input
          id="lead-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          required
          autoComplete="tel"
          placeholder="0912345678"
          className="w-full border border-koi-line px-4 py-3 text-sm outline-none transition-colors focus:border-koi-ink"
        />
      </div>

      <div>
        <label htmlFor="lead-message" className="mb-1.5 block text-[12px] uppercase tracking-[0.12em] text-koi-gray">
          Nội dung
        </label>
        <textarea
          id="lead-message"
          name="message"
          rows={4}
          defaultValue={productName ? `Mình quan tâm sản phẩm: ${productName}` : ''}
          className="w-full border border-koi-line px-4 py-3 text-sm outline-none transition-colors focus:border-koi-ink"
        />
      </div>

      {state && !state.ok ? (
        <p role="alert" className="text-sm text-koi-orange-dark">
          {state.message}
        </p>
      ) : null}

      <SubmitButton />

      <p className="text-xs leading-relaxed text-koi-gray-light">
        Thông tin chỉ dùng để shop liên hệ tư vấn, không chia sẻ cho bên thứ ba.
      </p>
    </form>
  );
}
