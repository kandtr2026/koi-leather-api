'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';

/**
 * Lớp đăng nhập admin cho storefront công khai.
 *
 * Tái dụng đúng luồng của admin dashboard (public/index.html):
 *   Google Identity Services → POST /auth/google → JWT lưu sessionStorage
 *   → gửi kèm Authorization: Bearer cho các thao tác ghi (thay ảnh).
 *
 * Đây CHỈ là lớp tiện lợi để ẩn/hiện nút. Hàng rào thật nằm ở backend:
 * mọi route /products/* đều bị AuthGuard chặn nếu không có token hợp lệ.
 */

const API =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/+$/, '') || 'http://localhost:3000';
const TOKEN_KEY = 'koi_admin_token';

type AdminUser = { email: string; name?: string; picture?: string };

type AdminCtx = {
  token: string | null;
  user: AdminUser | null;
  isAdmin: boolean;
  ready: boolean;
  apiBase: string;
  logout: () => void;
};

const Ctx = createContext<AdminCtx | null>(null);

export function useAdmin(): AdminCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAdmin phải nằm trong <AdminProvider>');
  return v;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    google?: any;
  }
}

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AdminUser | null>(null);
  const [ready, setReady] = useState(false);
  const [clientId, setClientId] = useState<string>('');

  // Khôi phục phiên: đọc token trong sessionStorage, xác minh qua /auth/me.
  useEffect(() => {
    const saved = sessionStorage.getItem(TOKEN_KEY);
    if (!saved) {
      setReady(true);
      return;
    }
    fetch(`${API}/auth/me`, {
      headers: { Authorization: `Bearer ${saved}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (d?.authenticated) {
          setToken(saved);
          setUser(d.user);
        } else {
          sessionStorage.removeItem(TOKEN_KEY);
        }
      })
      .catch(() => sessionStorage.removeItem(TOKEN_KEY))
      .finally(() => setReady(true));
  }, []);

  // Lấy googleClientId công khai để dựng nút đăng nhập khi cần.
  useEffect(() => {
    fetch(`${API}/auth/config`)
      .then((r) => r.json())
      .then((d) => setClientId(d?.googleClientId || ''))
      .catch(() => {});
  }, []);

  const onCredential = useCallback(async (resp: { credential: string }) => {
    try {
      const r = await fetch(`${API}/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: resp.credential }),
      });
      const d = await r.json();
      if (d?.accessToken) {
        sessionStorage.setItem(TOKEN_KEY, d.accessToken);
        setToken(d.accessToken);
        setUser(d.user);
      } else {
        alert(d?.message || 'Đăng nhập thất bại — email không có quyền admin?');
      }
    } catch {
      alert('Không kết nối được máy chủ đăng nhập.');
    }
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    try {
      window.google?.accounts?.id?.disableAutoSelect();
    } catch {}
  }, []);

  const value: AdminCtx = {
    token,
    user,
    isAdmin: !!token,
    ready,
    apiBase: API,
    logout,
  };

  return (
    <Ctx.Provider value={value}>
      {children}
      <AdminBar clientId={clientId} onCredential={onCredential} />
    </Ctx.Provider>
  );
}

/**
 * Thanh admin nhỏ, cố định góc dưới-trái. Chưa đăng nhập: nút mở panel chứa
 * nút Google Sign-In. Đã đăng nhập: email + nút thoát. Ẩn hoàn toàn với khách
 * cho tới khi họ tự bấm "Admin" (không lộ gì với người xem bình thường).
 */
function AdminBar({
  clientId,
  onCredential,
}: {
  clientId: string;
  onCredential: (r: { credential: string }) => void;
}) {
  const { isAdmin, user, ready, logout } = useAdmin();
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLDivElement>(null);
  const initialized = useRef(false);

  // Nạp script GIS một lần khi cần dựng nút đăng nhập.
  useEffect(() => {
    if (isAdmin || !open || !clientId) return;
    const render = () => {
      const g = window.google?.accounts?.id;
      if (!g || !btnRef.current) return;
      if (!initialized.current) {
        g.initialize({ client_id: clientId, callback: onCredential });
        initialized.current = true;
      }
      btnRef.current.innerHTML = '';
      g.renderButton(btnRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
      });
    };
    if (window.google?.accounts?.id) {
      render();
      return;
    }
    const existing = document.getElementById('gsi-script');
    if (existing) {
      existing.addEventListener('load', render);
      return;
    }
    const s = document.createElement('script');
    s.id = 'gsi-script';
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.defer = true;
    s.onload = render;
    document.head.appendChild(s);
  }, [isAdmin, open, clientId, onCredential]);

  if (!ready) return null;

  return (
    <div className="fixed bottom-3 left-3 z-[200] print:hidden">
      {isAdmin ? (
        <div className="flex items-center gap-3 rounded-full border border-koi-line bg-koi-bg/95 px-4 py-2 text-[12px] shadow-lg backdrop-blur">
          <span className="text-koi-orange-dark">● Admin</span>
          <span className="hidden text-koi-gray sm:inline">{user?.email}</span>
          <button
            type="button"
            onClick={logout}
            className="uppercase tracking-[0.14em] text-koi-ink hover:text-koi-orange-dark"
          >
            Thoát
          </button>
        </div>
      ) : open ? (
        <div className="flex flex-col gap-2 rounded-xl border border-koi-line bg-koi-bg/95 p-3 shadow-lg backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <span className="text-[12px] uppercase tracking-[0.14em] text-koi-etain-deep">
              Đăng nhập admin
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
          <div ref={btnRef} />
          {!clientId ? (
            <span className="text-[11px] text-koi-gray">Đang tải cấu hình…</span>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-full border border-koi-line bg-koi-bg/80 px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-koi-gray shadow-sm backdrop-blur hover:text-koi-ink"
        >
          Admin
        </button>
      )}
    </div>
  );
}
