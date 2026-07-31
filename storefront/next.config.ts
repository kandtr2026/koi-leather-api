import type { NextConfig } from 'next';
import path from 'node:path';

// Ten may chu Supabase, dung cho danh sach nguon anh duoc phep.
//
// Phai co duong lui: next.config.ts duoc nap RAT SOM trong qua trinh build,
// va neu bien moi truong thieu thi `new URL(undefined)` nem loi lam
// SAP CA LAN BUILD voi thong bao "Invalid URL" - khong he chi ra
// bien nao thieu. Da dinh dung mot lan tren Vercel.
const FALLBACK_SUPABASE_HOST = 'stdkeltylgakfvqejugz.supabase.co';

function supabaseHostname(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) {
    console.warn('[next.config] Thieu NEXT_PUBLIC_SUPABASE_URL, dung ten may chu mac dinh.');
    return FALLBACK_SUPABASE_HOST;
  }
  try {
    return new URL(raw).hostname;
  } catch {
    console.warn(`[next.config] NEXT_PUBLIC_SUPABASE_URL khong hop le (${raw}), dung mac dinh.`);
    return FALLBACK_SUPABASE_HOST;
  }
}

const supabaseHost = supabaseHostname();

// Thoi diem build va ma commit, chot lai NGAY LUC BUILD.
// Phai lam o day chu khong phai trong trang: trang duoc render theo tung
// yeu cau nen new Date() trong do se ra gio xem trang, khong phai gio deploy.
const BUILD_TIME = new Date().toISOString();

// Dung || chu KHONG dung ??: Vercel dat VERCEL_GIT_COMMIT_SHA thanh
// CHUOI RONG khi deploy bang CLI (khong qua tich hop Git). Toan tu ??
// chi bat null/undefined nen chuoi rong loi qua, ra tem trong tron.
//
// DEPLOY_SHA la duong truyen tay khi deploy bang CLI:
//   vercel --prod --build-env DEPLOY_SHA=$(git rev-parse HEAD)
const COMMIT_SHA = (
  process.env.DEPLOY_SHA ||
  process.env.VERCEL_GIT_COMMIT_SHA ||
  'local'
).slice(0, 7);

const nextConfig: NextConfig = {
  // Chot cung goc workspace vao thu muc web nay.
  // koi-leather/ co package-lock.json rieng (cho scripts xu ly anh), nen
  // Next 16 quet thay HAI lockfile va chon nham thu muc cha lam root ->
  // output file tracing / Turbopack gom nham pham vi. Ghim ve __dirname
  // de root luon xac dinh, khong phu thuoc lockfile nao ton tai.
  turbopack: {
    root: __dirname,
  },
  outputFileTracingRoot: path.join(__dirname),

  env: {
    NEXT_PUBLIC_BUILD_TIME: BUILD_TIME,
    NEXT_PUBLIC_COMMIT_SHA: COMMIT_SHA,
  },

  // URL cu cua WordPress deu co dau / o cuoi (/cua-hang/charm-capricorn/).
  // Giu nguyen de khong sinh mot lan chuyen huong thua tren MOI dia chi -
  // site 7 nam tuoi, khong duoc phep lam xao tron duong dan.
  trailingSlash: true,

  images: {
    // images.domains da bi bo o Next 16, phai dung remotePatterns
    remotePatterns: [
      {
        protocol: 'https',
        hostname: supabaseHost,
        pathname: '/storage/v1/object/public/**',
      },
      // Anh thay qua nut admin duoc upload len Cloudinary. Khong khai bao o day
      // thi Next 16 chan (anh vo, chi hien alt text) du URL tai duoc binh thuong.
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
    ],
    // Next 16 mac dinh chi cho phep quality 75. Anh do da can net hon
    // de thay duoc van da, nen mo them muc 85.
    qualities: [75, 85],
  },

  async redirects() {
    return [
      // Tàn dư của WooCommerce: giỏ hàng, thanh toán, tài khoản.
      // Site không bán online nên ba trang này vô nghĩa, nhưng địa chỉ
      // vẫn đang được Google lập chỉ mục -> chuyển hướng thay vì để 404.
      { source: '/gio-hang', destination: '/cua-hang/', permanent: true },
      { source: '/thanh-toan', destination: '/cua-hang/', permanent: true },
      { source: '/tai-khoan', destination: '/lien-he/', permanent: true },
      { source: '/huong-dan-thanh-toan', destination: '/lien-he/', permanent: true },

      // Trang "shop" và "blogs" cũ trùng vai trò với route mới
      { source: '/shop', destination: '/cua-hang/', permanent: true },
      { source: '/blogs', destination: '/blog/', permanent: true },
      { source: '/tin-tuc-su-kien', destination: '/blog/', permanent: true },
    ];
  },
};

export default nextConfig;
