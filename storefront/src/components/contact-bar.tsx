import { zaloLink, messengerLink, phoneLink } from '@/lib/contact';

/**
 * Thanh liên hệ dính đáy màn hình trên điện thoại.
 * Site không bán online nên đây chính là nút "mua hàng" —
 * phải luôn trong tầm ngón cái, ở mọi trang.
 */
export function ContactBar({ productName }: { productName?: string }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-3 border-t border-koi-line bg-white/95 backdrop-blur md:hidden">
      <a
        href={phoneLink}
        className="press flex flex-col items-center gap-0.5 py-2.5 text-[11px] tracking-wide text-koi-gray active:bg-koi-cream"
      >
        <PhoneIcon />
        Gọi
      </a>
      <a
        href={zaloLink(productName)}
        target="_blank"
        rel="noopener noreferrer"
        className="press flex flex-col items-center gap-0.5 border-x border-koi-line py-2.5 text-[11px] tracking-wide text-koi-gray active:bg-koi-cream"
      >
        <ChatIcon />
        Zalo
      </a>
      <a
        href={messengerLink(productName)}
        target="_blank"
        rel="noopener noreferrer"
        className="press flex flex-col items-center gap-0.5 py-2.5 text-[11px] tracking-wide text-koi-gray active:bg-koi-cream"
      >
        <MessengerIcon />
        Messenger
      </a>
    </div>
  );
}

function PhoneIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.4 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.4 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.9 8.9 0 0 1-3.8-.9L3 20.5l1.6-4.9A8.4 8.4 0 0 1 12 3.1a8.4 8.4 0 0 1 9 8.4Z" />
    </svg>
  );
}

function MessengerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
      <path d="M12 2C6.5 2 2 6.1 2 11.2c0 2.9 1.4 5.5 3.7 7.2V22l3.4-1.9c.9.3 1.9.4 2.9.4 5.5 0 10-4.1 10-9.3S17.5 2 12 2Z" />
      <path d="m6.8 13.6 3.1-3.3 2 2.1 2.9-2.1-3 3.3-2-2.1-3 2.1Z" fill="currentColor" stroke="none" />
    </svg>
  );
}
