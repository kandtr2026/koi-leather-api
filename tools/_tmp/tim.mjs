import fs from 'node:fs';
const l = fs.readFileSync('.env','utf8').split(/\r?\n/).find(x=>x.startsWith('DATABASE_URL='));
process.env.DATABASE_URL = l.slice(13).replace(/^["']|["']$/g,'');
const { PrismaClient } = await import('@prisma/client');
const p = new PrismaClient();
const q = (s)=>p.$queryRawUnsafe(s);
console.log('BẢNG CÓ TÊN DÍNH mon / md / koi_md:');
console.table(await q(`
  select table_schema||'.'||table_name as bang
  from information_schema.tables
  where table_type='BASE TABLE'
    and (table_name ilike '%mon%' or table_name ilike '%_md%' or table_name ilike '%md_%' or table_name ilike '%van_phong%' or table_name ilike '%markdown%')
  order by 1`));
console.log('\nTOÀN BỘ BẢNG (schema public + koi_free_style):');
const t = await q(`select table_schema, table_name from information_schema.tables where table_type='BASE TABLE' and table_schema in ('public','koi_free_style') order by 1,2`);
console.log(t.map(x=>`${x.table_schema}.${x.table_name}`).join('\n'));
await p.$disconnect();
