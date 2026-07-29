import { readFileSync } from 'node:fs';
import pg from 'pg';
const raw = readFileSync(new URL('../.env', import.meta.url),'utf8')
  .split(/\r?\n/).find(l=>l.startsWith('DATABASE_URL='))
  .replace(/^DATABASE_URL="?/,'').replace(/"$/,'');
const c = new pg.Client({connectionString: raw.replace(/[?&]sslmode=[^&]*/,''), ssl:{rejectUnauthorized:false}});
await c.connect();
const q = async s => (await c.query(s)).rows;

console.log('=== public (site koi-leather) ===');
for (const t of ['categories','products','product_categories','product_images','product_variants','posts','pages','tags','product_tags','post_terms','post_term_links','redirects','leads'])
  console.log(`  ${t.padEnd(20)}`, (await q(`select count(*)::int n from public.${t}`))[0].n);

console.log('\n=== koi_free_style (Koi Backend) ===');
for (const t of ['koi_categories','koi_products','koi_product_categories','koi_product_images','koi_product_variants','koi_image_categories'])
  console.log(`  ${t.padEnd(24)}`, (await q(`select count(*)::int n from koi_free_style.${t}`))[0].n);

console.log('\n=== doi chieu public vs koi_free_style ===');
const pairs = [['products','koi_products'],['categories','koi_categories'],['product_images','koi_product_images'],['product_variants','koi_product_variants'],['product_categories','koi_product_categories']];
for (const [a,b] of pairs) {
  const x=(await q(`select count(*)::int n from public.${a}`))[0].n;
  const y=(await q(`select count(*)::int n from koi_free_style.${b}`))[0].n;
  console.log(`  ${a.padEnd(20)} ${String(x).padStart(5)} -> ${String(y).padStart(5)} ${x===y?'OK':'LECH'}`);
}

console.log('\n=== chat luong du lieu ===');
console.log('  sp thieu anh dai dien :', (await q(`select count(*)::int n from koi_free_style.koi_products p where not exists (select 1 from koi_free_style.koi_product_images i where i."productId"=p.id and i."isPrimary")`))[0].n);
console.log('  sp khong co anh       :', (await q(`select count(*)::int n from koi_free_style.koi_products p where not exists (select 1 from koi_free_style.koi_product_images i where i."productId"=p.id)`))[0].n);
console.log('  sp khong danh muc chinh:', (await q(`select count(*)::int n from koi_free_style.koi_products where "categoryId" is null`))[0].n);
console.log('  name khong phai JSON  :', (await q(`select count(*)::int n from koi_free_style.koi_products where name not like '{%'`))[0].n);
console.log('  desc rong             :', (await q(`select count(*)::int n from koi_free_style.koi_products where description is null or description='' or description='{"vi":""}'`))[0].n);
console.log('  canonicalUrl thieu    :', (await q(`select count(*)::int n from koi_free_style.koi_products where "canonicalUrl" is null`))[0].n);
console.log('  externalId thieu      :', (await q(`select count(*)::int n from koi_free_style.koi_products where "externalId" is null`))[0].n);
console.log('  variant sku trung     :', (await q(`select count(*)::int n from (select sku from koi_free_style.koi_product_variants group by sku having count(*)>1) t`))[0].n);
console.log('  imageType != STUDIO   :', (await q(`select count(*)::int n from koi_free_style.koi_product_images where "imageType"<>'STUDIO'`))[0].n);
console.log('  status ACTIVE         :', (await q(`select count(*)::int n from koi_free_style.koi_products where status='ACTIVE'`))[0].n);

console.log('\n  sp khong danh muc chinh la:');
for (const r of await q(`select name, slug from koi_free_style.koi_products where "categoryId" is null`))
  console.log('   ', r.slug, '|', r.name);

await c.end();
