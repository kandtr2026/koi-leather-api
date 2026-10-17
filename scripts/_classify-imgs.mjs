import { PrismaClient } from '@prisma/client';
import fs from 'node:fs';
const env = fs.readFileSync('E:/Claude A Khoa Processing/koi-leather-api/.env', 'utf8');
for (const l of env.split(/\r?\n/)) {
  const m = /^([A-Z_]+)=(.*)$/.exec(l.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
const db = new PrismaClient();
const p = await db.pages.findUnique({ where: { slug: 'day-da-dong-ho' } });
const c = p.content ?? '';
const re = /<img[^>]*src="([^"]*)"/g;
const stats = { wp: 0, supabase: 0, other: 0, total: 0 };
const wpSamples = new Set();
const supaSamples = new Set();
let m;
while ((m = re.exec(c)) !== null) {
  const src = m[1];
  stats.total++;
  if (src.includes('wp-content')) { stats.wp++; wpSamples.add(src); }
  else if (src.includes('supabase.co/storage')) { stats.supabase++; supaSamples.add(src); }
  else { stats.other++; }
}
console.log('=== THỐNG KÊ NGUỒN ẢNH content day-da-dong-ho ===');
console.log('Tổng <img>:', stats.total);
console.log('Trỏ wp-content (WP cũ):', stats.wp);
console.log('Trỏ supabase storage:', stats.supabase);
console.log('Khác:', stats.other);
console.log('\nMẫu wp-content:', [...wpSamples].slice(0, 8));
console.log('\nMẫu supabase:', [...supaSamples].slice(0, 8));
await db.$disconnect();