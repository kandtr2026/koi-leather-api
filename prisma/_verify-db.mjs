// Read-only verification of the rebuilt database.
import { readFileSync } from 'node:fs';
import pg from 'pg';

const raw = readFileSync(new URL('../.env', import.meta.url), 'utf8')
  .split(/\r?\n/)
  .find((l) => l.startsWith('DATABASE_URL='))
  .replace(/^DATABASE_URL="?/, '')
  .replace(/"$/, '');

const c = new pg.Client({
  connectionString: raw.replace(/[?&]sslmode=[^&]*/, ''),
  ssl: { rejectUnauthorized: false },
});
await c.connect();
const q = async (s) => (await c.query(s)).rows;

const pub = (await q(`select table_name from information_schema.tables where table_schema='public' order by 1`)).map(r => r.table_name);
const kfs = (await q(`select table_name from information_schema.tables where table_schema='koi_free_style' order by 1`)).map(r => r.table_name);

console.log(`public (${pub.length}):`, pub.join(', '));
console.log(`koi_free_style (${kfs.length}):`, kfs.join(', '));
console.log('RLS tables   :', (await q(`select count(*)::int n from pg_tables where schemaname='public' and rowsecurity`))[0].n);
console.log('policies     :', (await q(`select count(*)::int n from pg_policies where schemaname='public'`))[0].n);
console.log('pg_trgm      :', (await q(`select count(*)::int n from pg_extension where extname='pg_trgm'`))[0].n);
console.log('trgm index   :', (await q(`select count(*)::int n from pg_indexes where indexname='products_search_trgm'`))[0].n);
console.log('products_touch trigger:', (await q(`select count(*)::int n from pg_trigger where tgname='products_touch'`))[0].n);

await c.end();
