#!/usr/bin/env node
/**
 * Loại traffic "người nhà" khỏi thống kê — phần CŨ và phần dựng bảng.
 *
 * A Khoa đặt hàng 26/09/2026: loại traffic của IP đã đăng nhập quản trị, và
 * của các agent (Claude, Mon/Hermes). Phần tự động từ nay nằm ở backend
 * (src/analytics/nguoi-nha.ts + /api/gop-y/phien bên storefront). Tool này lo
 * những việc máy chủ không tự làm:
 *
 *   --tao-bang   Tạo hai bảng koi_ip_nguoi_nha + koi_luot_nguoi_nha (chạy MỘT
 *                lần trước khi deploy backend; khớp model trong schema.prisma).
 *   (mặc định)   CHỈ XEM: đếm lượt cũ sẽ bị dời —
 *                  (a) mọi lượt từ IP trong data/ip-noi-bo.txt, MỌI ngày (danh
 *                      sách chỉ chặn từ lúc được thêm vào; lượt trước đó vẫn
 *                      nằm trong bảng — ví dụ máy chủ của Mon thêm ngày 26/09);
 *                  (b) lượt của các cặp (IP, ngày) đã ghi ở koi_ip_nguoi_nha.
 *   --ghi        Dời thật (sang koi_luot_nguoi_nha, nguyên dòng dạng JSON).
 *   --hoan <tiền tố ly_do>   Trả các dòng đã dời về bảng chính. Ví dụ:
 *                --hoan tinh:   (chỉ phần theo danh sách tĩnh)
 *                --hoan nguoi-nha:  (phần theo đăng nhập quản trị)
 *                --hoan ""      (tất cả)
 *
 * Không xoá gì: mọi dòng dời đi đều nằm ở koi_luot_nguoi_nha.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const goc = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const dongEnv = fs
  .readFileSync(path.join(goc, '.env'), 'utf8')
  .split(/\r?\n/)
  .find((l) => l.startsWith('DATABASE_URL='));
if (!dongEnv) {
  console.error('Không thấy DATABASE_URL trong .env');
  process.exit(1);
}
process.env.DATABASE_URL = dongEnv.slice('DATABASE_URL='.length).replace(/^["']|["']$/g, '');

const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

const argv = process.argv.slice(2);
const so = (n) => Number(n).toLocaleString('vi-VN');
const NGAY_VN = (c) =>
  `to_char((${c} AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD')`;

if (argv.includes('--tao-bang')) {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS koi_free_style.koi_ip_nguoi_nha (
      ip       text NOT NULL,
      ngay     text NOT NULL,
      nguon    text NOT NULL,
      lan_dau  timestamptz(6) NOT NULL DEFAULT now(),
      lan_cuoi timestamptz(6) NOT NULL DEFAULT now(),
      so_lan   integer NOT NULL DEFAULT 1,
      CONSTRAINT koi_ip_nguoi_nha_pkey PRIMARY KEY (ip, ngay)
    )`);
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS koi_free_style.koi_luot_nguoi_nha (
      bang       text NOT NULL,
      id         text NOT NULL,
      du_lieu    jsonb NOT NULL,
      ly_do      text,
      chuyen_luc timestamptz(6) NOT NULL DEFAULT now(),
      CONSTRAINT koi_luot_nguoi_nha_pkey PRIMARY KEY (bang, id)
    )`);
  console.log('Đã có hai bảng koi_ip_nguoi_nha, koi_luot_nguoi_nha.');
  await prisma.$disconnect();
  process.exit(0);
}

const iHoan = argv.indexOf('--hoan');
if (iHoan !== -1) {
  const tienTo = argv[iHoan + 1];
  if (tienTo === undefined || tienTo.startsWith('--')) {
    console.error('Thiếu tiền tố ly_do. Ví dụ: --hoan tinh:   --hoan nguoi-nha:   --hoan TAT-CA');
    process.exit(1);
  }
  const mau = tienTo === 'TAT-CA' ? '%' : `${tienTo}%`;
  // Trả dòng mà vẫn giữ cặp (IP, ngày) đã học thì lần quét kế tiếp (mỗi lần
  // admin mở trang) lại dời đi ngay — hoàn tác âm thầm mất tác dụng. Gỡ cặp
  // trước. Dòng theo danh sách tĩnh thì phải tự bỏ IP khỏi data/ip-noi-bo.txt,
  // không thì --ghi lần sau dời lại.
  const goCap = await prisma.$executeRawUnsafe(
    `DELETE FROM koi_free_style.koi_ip_nguoi_nha n
     USING koi_free_style.koi_luot_nguoi_nha a
     WHERE a.bang = 'koi_page_views' AND coalesce(a.ly_do, '') LIKE $1
       AND n.ip = a.du_lieu->>'ip'
       AND n.ngay = ${NGAY_VN(`(a.du_lieu->>'createdAt')::timestamp`)}`,
    mau,
  );
  console.log(`Gỡ ${so(goCap)} cặp (IP, ngày) người nhà để lần quét sau không dời lại.`);
  for (const bang of ['koi_page_views', 'koi_contact_clicks']) {
    const n = await prisma.$transaction(async (tx) => {
      const tra = await tx.$executeRawUnsafe(
        `INSERT INTO koi_free_style.${bang}
         SELECT (jsonb_populate_record(NULL::koi_free_style.${bang}, a.du_lieu)).*
         FROM koi_free_style.koi_luot_nguoi_nha a
         WHERE a.bang = $1 AND coalesce(a.ly_do, '') LIKE $2
         ON CONFLICT (id) DO NOTHING`,
        bang,
        mau,
      );
      await tx.$executeRawUnsafe(
        `DELETE FROM koi_free_style.koi_luot_nguoi_nha a
         WHERE a.bang = $1 AND coalesce(a.ly_do, '') LIKE $2
           AND EXISTS (SELECT 1 FROM koi_free_style.${bang} v WHERE v.id = a.id)`,
        bang,
        mau,
      );
      return tra;
    });
    console.log(`${bang}: trả về ${so(n)} dòng.`);
  }
  await prisma.$disconnect();
  process.exit(0);
}

const GHI = argv.includes('--ghi');

// (a) danh sách tĩnh — cùng file backend đọc lúc khởi động.
const danhSach = fs
  .readFileSync(path.join(goc, 'data', 'ip-noi-bo.txt'), 'utf8')
  .split(/\r?\n/)
  .flatMap((l) => l.split('#')[0].split(/[\s,;]+/))
  .map((x) => x.trim())
  .filter(Boolean);

const DIEU_KIEN_TINH = `v.ip IS NOT NULL AND v.ip::inet <<= ANY($1::inet[])`;
// (b) cặp (IP, ngày) đã học từ đăng nhập quản trị.
const DIEU_KIEN_HOC = `EXISTS (
  SELECT 1 FROM koi_free_style.koi_ip_nguoi_nha n
  WHERE n.ip = v.ip AND n.ngay = ${NGAY_VN('v."createdAt"')})`;

const demTinh = await prisma.$queryRawUnsafe(
  `SELECT count(*)::int n, count(DISTINCT v.ip)::int ip, min(v."createdAt") a, max(v."createdAt") b
   FROM koi_free_style.koi_page_views v WHERE ${DIEU_KIEN_TINH}`,
  danhSach,
);
const demHoc = await prisma.$queryRawUnsafe(
  `SELECT count(*)::int n, count(DISTINCT v.ip)::int ip
   FROM koi_free_style.koi_page_views v WHERE ${DIEU_KIEN_HOC}`,
);
console.log(`Danh sách tĩnh (${danhSach.length} mục): ${so(demTinh[0].n)} lượt xem từ ${demTinh[0].ip} IP`);
console.log(`IP đã đăng nhập quản trị (theo ngày): ${so(demHoc[0].n)} lượt xem từ ${demHoc[0].ip} IP`);

if (!GHI) {
  console.log('\n(CHỈ XEM — chưa dời gì. Thêm --ghi để dời.)');
  await prisma.$disconnect();
  process.exit(0);
}

/**
 * Dời lượt xem thoả điều kiện, rồi dời cú bấm liên hệ CÙNG visitorHash CÙNG
 * ngày (bảng cú bấm không lưu IP). Một giao dịch cho mỗi nhóm.
 */
async function doi(dieuKien, thamSo, lyDo) {
  return prisma.$transaction(
    async (tx) => {
      const [xem] = await tx.$queryRawUnsafe(
        `WITH doi AS (
           DELETE FROM koi_free_style.koi_page_views v WHERE ${dieuKien} RETURNING v.*
         ), luu AS (
           INSERT INTO koi_free_style.koi_luot_nguoi_nha (bang, id, du_lieu, ly_do)
           SELECT 'koi_page_views', doi.id, to_jsonb(doi), $${thamSo.length + 1} FROM doi
           ON CONFLICT (bang, id) DO NOTHING RETURNING 1
         )
         SELECT (SELECT count(*) FROM luu)::int n,
                (SELECT count(*) FROM doi)::int xoa`,
        ...thamSo,
        lyDo,
      );
      if (xem.n !== xem.xoa) {
        throw new Error(`Lượt xem: dời ${xem.xoa} mà lưu được ${xem.n} — dừng, không đổi gì.`);
      }
      // Cú bấm liên hệ không lưu IP: dời theo (visitorHash, ngày) của MỌI lượt
      // xem đã từng dời — không riêng lần này — nên chạy lại vẫn vớt được cú
      // bấm lọt giữa hai lần quét.
      const [c] = await tx.$queryRawUnsafe(
        `WITH khoa AS (
           SELECT DISTINCT (a.du_lieu->>'visitorHash') || '|' || ${NGAY_VN(`(a.du_lieu->>'createdAt')::timestamp`)} AS k
           FROM koi_free_style.koi_luot_nguoi_nha a WHERE a.bang = 'koi_page_views'
         ), doi AS (
           DELETE FROM koi_free_style.koi_contact_clicks c
           WHERE (c."visitorHash" || '|' || ${NGAY_VN('c."createdAt"')}) IN (SELECT k FROM khoa)
           RETURNING c.*
         ), luu AS (
           INSERT INTO koi_free_style.koi_luot_nguoi_nha (bang, id, du_lieu, ly_do)
           SELECT 'koi_contact_clicks', doi.id, to_jsonb(doi), $1 FROM doi
           ON CONFLICT (bang, id) DO NOTHING RETURNING 1
         )
         SELECT (SELECT count(*) FROM luu)::int n, (SELECT count(*) FROM doi)::int xoa`,
        lyDo,
      );
      if (c.n !== c.xoa) throw new Error(`Cú bấm liên hệ: dời ${c.xoa} mà lưu ${c.n} — dừng.`);
      const lienHe = c.n;
      return { luotXem: xem.n, lienHe };
    },
    { timeout: 120_000 },
  );
}

const a = await doi(DIEU_KIEN_TINH, [danhSach], 'tinh:data/ip-noi-bo.txt');
console.log(`Danh sách tĩnh: dời ${so(a.luotXem)} lượt xem, ${so(a.lienHe)} cú bấm liên hệ.`);
const b = await doi(DIEU_KIEN_HOC, [], 'nguoi-nha:quet-lai');
console.log(`Theo đăng nhập quản trị: dời ${so(b.luotXem)} lượt xem, ${so(b.lienHe)} cú bấm liên hệ.`);
await prisma.$disconnect();
