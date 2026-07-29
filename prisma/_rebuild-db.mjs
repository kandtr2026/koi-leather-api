/**
 * Rebuild the wiped Supabase database.
 *
 *   public          <- koi-leather/supabase/01-schema.sql + 02-tags.sql + 03-post-terms.sql
 *                      (NOT from the Prisma baseline: that file omits pg_trgm,
 *                       every RLS policy, and the touch_updated_at trigger)
 *   koi_free_style  <- the koi_free_style half of the Prisma baseline migration
 *
 * Each .sql file is sent as ONE multi-statement query. Splitting it by hand
 * silently dropped the `as $$ ... $$` body of touch_updated_at last time, so
 * the parsing is left to Postgres.
 *
 * Safety: refuses to run unless the target schemas are empty.
 *
 *   node prisma/_rebuild-db.mjs            # dry run, ROLLBACK
 *   node prisma/_rebuild-db.mjs --apply    # COMMIT
 */
import { readFileSync } from 'node:fs';
import pg from 'pg';

const APPLY = process.argv.includes('--apply');
const LEATHER = 'E:/Claude A Khoa Processing/koi-leather/supabase';
const MIGRATION_DIR = '20260729000734_add_material_categories';
const MIGRATION = `E:/Claude A Khoa Processing/Koi Backend/prisma/migrations/${MIGRATION_DIR}/migration.sql`;

const conn = readFileSync(new URL('../.env', import.meta.url), 'utf8')
  .split(/\r?\n/)
  .find((l) => l.startsWith('DATABASE_URL='))
  .replace(/^DATABASE_URL="?/, '')
  .replace(/"$/, '')
  .replace(/[?&]sslmode=[^&]*/, '');

/**
 * koi_free_style DDL only. Statement-level split is safe here: the Prisma
 * baseline is machine-generated CREATE TABLE / INDEX / ALTER, no function
 * bodies and no dollar quoting.
 */
function koiFreeStyleSql() {
  const stmts = readFileSync(MIGRATION, 'utf8')
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    // drop fragments that are only comments, without regex backtracking
    .filter((s) => s.split('\n').some((l) => l.trim() && !l.trim().startsWith('--')))
    .filter((s) => {
      if (/CREATE\s+SCHEMA/i.test(s)) return true;
      if (/"public"\./.test(s)) return false;
      return /koi_free_style/.test(s);
    });
  return stmts.join(';\n') + ';';
}

const batches = [
  ['public: 01-schema.sql', readFileSync(`${LEATHER}/01-schema.sql`, 'utf8')],
  ['public: 02-tags.sql', readFileSync(`${LEATHER}/02-tags.sql`, 'utf8')],
  ['public: 03-post-terms.sql', readFileSync(`${LEATHER}/03-post-terms.sql`, 'utf8')],
  ['koi_free_style: prisma baseline', koiFreeStyleSql()],
];

const c = new pg.Client({ connectionString: conn, ssl: { rejectUnauthorized: false } });
await c.connect();

const existing = (
  await c.query(
    `select count(*)::int n from information_schema.tables
     where table_schema in ('public','koi_free_style')
       and table_name <> '_prisma_migrations'`,
  )
).rows[0].n;

if (existing > 0) {
  console.log(`ABORT: ${existing} table(s) already present. Refusing to touch a non-empty database.`);
  await c.end();
  process.exit(1);
}

let ok = true;
try {
  await c.query('BEGIN');

  for (const [label, sql] of batches) {
    try {
      await c.query(sql);
      console.log(`ok   ${label}`);
    } catch (e) {
      ok = false;
      console.log(`FAIL ${label}: [${e.code}] ${e.message}`);
      if (e.position) {
        const p = Number(e.position);
        console.log('near:', JSON.stringify(sql.slice(Math.max(0, p - 120), p + 120)));
      }
      break;
    }
  }

  // Defuse the landmine: the baseline sits in _prisma_migrations with
  // finished_at = null. Prisma treats a failed migration as grounds to reset
  // the whole database, which is what wiped it twice. Record it as applied.
  if (ok) {
    try {
      await c.query(`
        create table if not exists public._prisma_migrations (
          id                      varchar(36) primary key,
          checksum                varchar(64) not null,
          finished_at             timestamptz,
          migration_name          varchar(255) not null,
          logs                    text,
          rolled_back_at          timestamptz,
          started_at              timestamptz not null default now(),
          applied_steps_count     integer not null default 0
        )`);
      await c.query(`delete from public._prisma_migrations where migration_name = $1`, [MIGRATION_DIR]);
      await c.query(
        `insert into public._prisma_migrations
           (id, checksum, finished_at, migration_name, started_at, applied_steps_count)
         values (gen_random_uuid()::text, $1, now(), $2, now(), 1)`,
        [
          // checksum of the migration file, same algorithm Prisma uses (sha256 hex)
          (await import('node:crypto'))
            .createHash('sha256')
            .update(readFileSync(MIGRATION))
            .digest('hex'),
          MIGRATION_DIR,
        ],
      );
      console.log('ok   _prisma_migrations marked applied');
    } catch (e) {
      ok = false;
      console.log(`FAIL _prisma_migrations: [${e.code}] ${e.message}`);
    }
  }

  if (ok && APPLY) {
    await c.query('COMMIT');
    console.log('\n=== COMMITTED ===');
  } else {
    await c.query('ROLLBACK');
    console.log(ok ? '\n=== DRY RUN OK (rolled back) ===' : '\n=== ROLLED BACK (errors) ===');
  }
} finally {
  await c.end();
}

process.exit(ok ? 0 : 1);
