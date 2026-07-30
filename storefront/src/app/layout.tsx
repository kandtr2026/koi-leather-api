import type { Metadata } from 'next';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import './globals.css';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { DeployBadge } from '@/components/deploy-badge';
import { SITE_URL } from '@/lib/contact';

const cormorant = Cormorant_Garamond({
  variable: '--font-cormorant',
  subsets: ['latin', 'vietnamese'],
  weight: ['300', '400', '500'],
  display: 'swap',
});

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'KOI Leather — Đồ da thủ công cao cấp',
    template: '%s | KOI Leather',
  },
  description:
    'Đồ da thủ công cao cấp: túi, ví, dây lưng, dây đồng hồ, phụ kiện da. Da nhập châu Âu, hoàn thiện bằng tay.',
  icons: {
    icon: [
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/apple-touch-180.png',
  },
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    siteName: 'KOI Leather',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={`${cormorant.variable} ${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <SiteHeader />
        {/* pb-16 chừa chỗ cho thanh liên hệ dính đáy trên điện thoại */}
        <main className="flex-1 pb-16 md:pb-0">{children}</main>
        <SiteFooter />
        <DeployBadge />
      </body>
    </html>
  );
}
