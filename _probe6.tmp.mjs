import fs from 'fs'; import pg from 'pg';
const env = fs.readFileSync('.env','utf8').replace(/\r/g,'');
const url = env.match(/^DATABASE_URL=(.*)$/m)[1].trim().replace(/^["']|["']$/g,'').replace(/[?&]sslmode=[^&]*/,'');
const c = new pg.Client({ connectionString: url, ssl:{rejectUnauthorized:false} }); await c.connect();
const r = await c.query(`select url from koi_free_style.koi_product_images where "imageType"='STAMPING' and url like '%supabase%' order by random() limit 5`);
for (const row of r.rows) console.log(row.url.split('/public/products/')[1]);
await c.end();
