import fs from 'node:fs';
const l = fs.readFileSync('.env','utf8').split(/\r?\n/).find(x=>x.startsWith('DATABASE_URL='));
process.env.DATABASE_URL = l.slice(13).replace(/^["']|["']$/g,'');
const { PrismaClient } = await import('@prisma/client');
const p = new PrismaClient();
const r = await p.$queryRawUnsafe(`select * from koi_free_style.koi_content_revisions order by "createdAt" desc limit 5`);
console.log('koi_content_revisions:', r.length, 'bản ghi gần nhất');
for (const x of r) console.log(' ', JSON.stringify(x).slice(0, 300));
await p.$disconnect();
