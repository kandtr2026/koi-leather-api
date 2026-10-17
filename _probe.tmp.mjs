import fs from 'fs';
import pg from 'pg';
const env = fs.readFileSync('.env','utf8').replace(/\r/g,'');
const m = env.match(/^DATABASE_URL=(.*)$/m);
const url = m[1].trim().replace(/^["']|["']$/g,'');
const u = new URL(url);
console.log('DB host:', u.hostname, 'db:', u.pathname);
const c = new pg.Client({ connectionString: url.replace(/[?&]sslmode=[^&]*/,''), ssl: { rejectUnauthorized: false } });
await c.connect();
const q = async (label, sql) => {
  try { const r = await c.query(sql); console.log('##', label); console.log(JSON.stringify(r.rows, null, 1)); }
  catch(e){ console.log('##', label, 'ERR', e.message); }
};
await q('product_images tong', `select count(*)::int n, count(width)::int co_wh, count(distinct product_id)::int sp from public.product_images`);
await q('nguon anh', `select case when storage_path like 'http%cloudinary%' then 'cloudinary' when storage_path like 'http%' then 'http-khac' else 'supabase-path' end nguon, count(*)::int n from public.product_images group by 1 order by 2 desc`);
await q('mau storage_path', `select storage_path, width, height, alt, is_primary from public.product_images order by random() limit 5`);
await q('posts co anh', `select count(*)::int n from public.posts`);
await c.end();
