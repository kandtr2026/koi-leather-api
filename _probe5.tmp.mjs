import fs from 'fs'; import pg from 'pg';
const env = fs.readFileSync('.env','utf8').replace(/\r/g,'');
const url = env.match(/^DATABASE_URL=(.*)$/m)[1].trim().replace(/^["']|["']$/g,'').replace(/[?&]sslmode=[^&]*/,'');
const c = new pg.Client({ connectionString: url, ssl:{rejectUnauthorized:false} }); await c.connect();
const r = await c.query(`select i."imageType" t, i.url, p.name, p.slug from koi_free_style.koi_product_images i join koi_free_style.koi_products p on p.id=i."productId" where i."imageType" in ('STAMPING','LIFESTYLE') order by i."imageType", random() limit 8`);
console.log(JSON.stringify(r.rows,null,1));
const r2 = await c.query(`select i.url, p.name from koi_free_style.koi_product_images i join koi_free_style.koi_products p on p.id=i."productId" where i."imageType"='STUDIO' order by random() limit 4`);
console.log(JSON.stringify(r2.rows,null,1));
await c.end();
