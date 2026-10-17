import fs from 'node:fs';
const l = fs.readFileSync('.env','utf8').split(/\r?\n/).find(x=>x.startsWith('DATABASE_URL='));
process.env.DATABASE_URL = l.slice(13).replace(/^["']|["']$/g,'');
const { PrismaClient } = await import('@prisma/client');
const p = new PrismaClient();
const q = (s)=>p.$queryRawUnsafe(s);
console.log('BUCKET:');
console.table(await q(`select id, name, public from storage.buckets order by 1`));
console.log('\nFILE .md HOẶC TÊN DÍNH mon:');
const r = await q(`select bucket_id, name, (metadata->>'size')::bigint as bytes, updated_at
  from storage.objects
  where name ilike '%.md' or name ilike '%mon%'
  order by updated_at desc limit 40`);
console.table(r.map(x=>({bucket:x.bucket_id, ten:x.name, bytes:Number(x.bytes), sua:x.updated_at})));
await p.$disconnect();
