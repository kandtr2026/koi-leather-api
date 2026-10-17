/**
 * Viết meta_description cho bài blog (posts) còn thiếu mô tả tử tế.
 *
 *   node scripts/viet-meta-mo-ta-bai-viet.mjs              # chạy thử, in bảng
 *   node scripts/viet-meta-mo-ta-bai-viet.mjs --ghi        # ghi thật
 *   node scripts/viet-meta-mo-ta-bai-viet.mjs --hoan-tac=M  # hoàn tác đợt M
 *   node scripts/viet-meta-mo-ta-bai-viet.mjs --giup       # help
 *
 * DÙNG OpenAiClient CỦA BACKEND (src/ai-edit/openai.client.ts) qua ts-node, giống
 * viet-mo-ta-hang-loat.mjs: không cài SDK openai, tái dùng lớp xử lý lỗi/hạn chờ.
 *
 * BA LỚP CHẶN:
 *  1. Chụp bản gốc + SQL hoàn tác TRƯỚC khi ghi.
 *  2. ĐỘ DÀI 120–160 ký tự. Dưới 120 là bỏ trống; trên 160 Google cắt.
 *  3. Bỏ qua bài đã có mô tả viết tay.
 *  4. Bỏ qua bài đã từng được ghi ở đợt trước (đọc log).
 */
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const GOC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const GIOI_HAN_DUOI = 120;
const GIOI_HAN_TREN = 160;

// ----- Cờ -----
const PARAMS = new Map();
for (const arg of process.argv.slice(2)) {
  if (!arg.startsWith('--')) {
    console.error(`Tham số lạ "${arg}". Xem --giup.`);
    process.exit(1);
  }
  const [k, ...v] = arg.slice(2).split('=');
  PARAMS.set(k, v.length ? v.join('=') : true);
}
if (PARAMS.has('giup') || PARAMS.has('help')) {
  console.log(`Viết meta_description cho bài blog (posts) còn thiếu mô tả tử tế.

  (không cờ)      Chạy thử, in bảng + đo độ dài
  --ghi           Ghi thật vào DB
  --hoan-tac=M    Hoàn tác đợt M (mã batch từ tệp log)
  --giup          Help này`);
  process.exit(0);
}

const GHI = PARAMS.has('ghi');
const HOAN_TAC = PARAMS.get('hoan-tac');
const GIOI_HAN = Math.max(0, Math.floor(Number(PARAMS.get('gioi-han') || 0) || 0));
const TEP_LOG = path.join(GOC, 'scripts/_log-viet-meta-bai-viet.jsonl');
const DOT = randomUUID();

// ----- .env (không ghi đè biến shell) -----
const envPath = path.join(GOC, '.env');
if (fs.existsSync(envPath)) {
  for (const l of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
if (!process.env.OPENAI_API_KEY) {
  console.error('Thiếu OPENAI_API_KEY. Đặt vào môi trường hoặc .env.');
  process.exit(1);
}

// ----- Nạp Prisma + OpenAiClient qua ts-node -----
const req = createRequire(path.join(GOC, 'package.json'));
req('reflect-metadata');
req('ts-node').register({ project: path.join(GOC, 'tsconfig.json'), transpileOnly: true, compilerOptions: { module: 'commonjs' } });
const { PrismaService } = req(path.join(GOC, 'src/prisma/prisma.service.ts'));
const { OpenAiClient } = req(path.join(GOC, 'src/ai-edit/openai.client.ts'));

const db = new PrismaService();
const gpt = new OpenAiClient();

// ----- Helper -----
function phang(s) {
  return String(s ?? '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}
function daTuTe(md, content) {
  const m = phang(md);
  if (!m) return false;
  if (m.length > GIOI_HAN_TREN) return false;
  if (phang(content).slice(0, 400).includes(m.slice(0, 60))) return false;
  if (m.length >= 150 && !/[.!?…]$/.test(m)) return false;
  return true;
}
function q(s) {
  return s === null || s === undefined ? 'NULL' : `'${String(s).replace(/'/g, "''")}'`;
}
function docLog() {
  if (!fs.existsSync(TEP_LOG)) return [];
  return fs.readFileSync(TEP_LOG, 'utf8').split(/\r?\n/).filter(Boolean).map(d => { try { return JSON.parse(d); } catch { return null; } }).filter(Boolean);
}
function ghiLog(ban) {
  fs.mkdirSync(path.dirname(TEP_LOG), { recursive: true });
  // id Prisma trả BigInt, JSON.stringify chết. Chuyển mọi BigInt thành chuỗi.
  fs.appendFileSync(TEP_LOG, JSON.stringify(ban, (_k, v) => (typeof v === 'bigint' ? v.toString() : v)) + '\n', 'utf8');
}

// ----- Hoàn tác -----
if (HOAN_TAC) {
  const log = docLog().filter(d => d.dot === HOAN_TAC && d.cheDo === 'ghi');
  if (!log.length) { console.error(`Không có đợt "${HOAN_TAC}" trong log.`); process.exit(1); }
  for (const ban of log) {
    await db.posts.update({ where: { id: ban.id }, data: { meta_description: ban.gocRaw } });
    console.log(`✓ hoàn tác ${ban.slug}`);
  }
  console.log(`Đã hoàn tác ${log.length} bài.`);
  await db.$disconnect();
  process.exit(0);
}

// ----- Lô: bài còn thiếu meta mô tả tử tế -----
const tatCa = await db.posts.findMany({
  where: { is_published: true },
  select: { id: true, slug: true, title: true, meta_description: true, content: true },
  orderBy: { id: 'asc' },
});
console.log(`Tổng posts: ${tatCa.length}`);

const lo = [];
const boQua = [];
const daXong = new Set(docLog().filter(d => d.cheDo === 'ghi' && d.trangThai === 'xong').map(d => d.slug));

for (const p of tatCa) {
  if (daXong.has(p.slug)) { boQua.push(`${p.slug}: đã ghi ở đợt trước`); continue; }
  if (daTuTe(p.meta_description, p.content)) { boQua.push(`${p.slug}: DB đã có mô tả viết tay → BỎ QUA`); continue; }
  lo.push({ id: p.id, slug: p.slug, title: p.title, content: p.content, mdCu: p.meta_description });
}
console.log(`Bỏ qua: ${boQua.length}`);
console.log(`Cần viết: ${lo.length}`);
if (GIOI_HAN > 0) { lo.splice(GIOI_HAN); console.log(`Giới hạn: ${GIOI_HAN} bài`); }

if (!lo.length) { console.log('Không còn bài nào cần viết.'); await db.$disconnect(); process.exit(0); }

// ----- Lời dặn -----
const HE_THONG = `Bạn viết thẻ meta description cho bài viết blog của xưởng đồ da thủ công KOI Leather (koileather.com) tại TP.HCM.

Mỗi meta description phải:
- Dài ĐÚNG 120-160 ký tự (KHÔNG dưới 120, KHÔNG trên 160).
- Nói ngay bài viết về cái gì, bằng cụm khách có thể gõ tìm.
- Nhắc "tại TP.HCM" nếu hợp.
- Kết thúc bằng dấu chấm câu. Không viết tắt, không dùng icon, không ký tự đặc biệt.
- KHÔNG lặp tiêu đề bài. KHÔNG nói "bài viết này", "trong bài viết".
- Không chép mô tả cũ.

Trả về JSON đúng khuôn: {"moTa": "nội dung meta description"}.`;

// ----- Gọi AI cho từng bài -----
const chuanBi = [];
let loi = 0;

for (let i = 0; i < lo.length; i++) {
  const p = lo[i];
  process.stdout.write(`\n[${i + 1}/${lo.length}] ${p.slug}... `);

  try {
    const nd = `Tiêu đề: ${p.title}\n\nNội dung (đầu bài):\n${phang(p.content).slice(0, 1500)}`;
    const { dulieu } = await gpt.sinhJson(HE_THONG, nd, 300);
    const text = String((dulieu && dulieu.moTa) || '').trim().replace(/^["']|["']$/g, '');
    const len = text.length;

    if (len < GIOI_HAN_DUOI || len > GIOI_HAN_TREN) {
      console.log(`DÀI ${len} — ngoài khoảng ${GIOI_HAN_DUOI}-${GIOI_HAN_TREN}`);
      process.stdout.write(`  "${text.slice(0, 100)}..."\n`);
      loi++;
      continue;
    }

    chuanBi.push({ id: p.id, slug: p.slug, title: p.title, cu: p.mdCu || '(TRỐNG)', moi: text, dai: len });
    console.log(`OK ${len} ký tự`);
  } catch (e) {
    console.log(`LỖI: ${String(e.message || e).slice(0, 120)}`);
    loi++;
  }

  if (i < lo.length - 1) await new Promise(r => setTimeout(r, 800));
}

console.log(`\n=== KẾT QUẢ ===`);
console.log(`OK: ${chuanBi.length} · Lỗi: ${loi}`);

if (!chuanBi.length) { console.log('Không có bài nào đạt yêu cầu.'); await db.$disconnect(); process.exit(1); }

for (const c of chuanBi) {
  console.log(`\n/${c.slug}/`);
  console.log(`  cũ  (${c.cu.length}): ${c.cu.slice(0, 120)}`);
  console.log(`  mới (${c.dai}): ${c.moi}`);
}

if (!GHI) {
  console.log(`\nSẽ ghi ${chuanBi.length} bài. Chạy lại với --ghi để ghi thật.`);
  await db.$disconnect();
  process.exit(0);
}

// Backup + ghi
const tep = path.join(GOC, `scripts/_goc-meta-bai-viet-${DOT.slice(0, 8)}.sql`);
fs.writeFileSync(tep, chuanBi.map(c => `UPDATE public.posts SET meta_description=${q(c.cu)} WHERE id=${c.id}; -- ${c.slug}`).join('\n') + '\n', 'utf8');
console.log(`\nĐã chụp SQL hoàn tác → ${path.basename(tep)}`);

for (const c of chuanBi) {
  await db.posts.update({ where: { id: c.id }, data: { meta_description: c.moi } });
  ghiLog({ cheDo: 'ghi', trangThai: 'xong', dot: DOT, id: c.id, slug: c.slug, gocRaw: c.cu, moi: c.moi, dai: c.dai });
  console.log(`✓ ${c.slug}`);
}
console.log(`\nĐã ghi ${chuanBi.length} thẻ mô tả. Mã đợt: ${DOT}`);
console.log(`Hoàn tác: node scripts/viet-meta-mo-ta-bai-viet.mjs --hoan-tac=${DOT}`);
await db.$disconnect();