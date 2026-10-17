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
const seen = new Map();
let m;
while ((m = re.exec(c)) !== null) {
  const src = m[1];
  if (!seen.has(src)) seen.set(src, 0);
  seen.set(src, seen.get(src) + 1);
}
console.log('Tổng ảnh duy nhất:', seen.size);
let i = 0;
for (const [src, n] of seen) {
  i++;
  console.log(`${i}. [${n}x] ${src.slice(0, 150)}`);
  if (i >= 30) { console.log('...'); break; }
}
await db.$disconnect();