/**
 * Restore the standard Supabase role grants.
 *
 * DROP SCHEMA public + CREATE SCHEMA public wipes every GRANT that Supabase
 * ships by default, so PostgREST (which connects as authenticator -> anon /
 * authenticated) loses even USAGE and every request fails with
 * "permission denied for schema public" (SQLSTATE 42501).
 *
 * RLS still governs row visibility: these grants only restore table-level
 * access so the policies can be evaluated at all.
 *
 * Usage:
 *   node prisma/_restore-grants.mjs            # dry run, ROLLBACK
 *   node prisma/_restore-grants.mjs --apply    # COMMIT
 */
import { readFileSync } from 'node:fs';
import pg from 'pg';

const APPLY = process.argv.includes('--apply');

const raw = readFileSync(new URL('../.env', import.meta.url), 'utf8')
  .split(/\r?\n/)
  .find((l) => l.startsWith('DATABASE_URL='))
  .replace(/^DATABASE_URL="?/, '')
  .replace(/"$/, '');

const client = new pg.Client({
  connectionString: raw.replace(/[?&]sslmode=[^&]*/, ''),
  ssl: { rejectUnauthorized: false },
});

// Mirrors what a fresh Supabase project sets up.
const sql = `
-- public: readable/writable through PostgREST, gated by RLS
grant usage on schema public to postgres, anon, authenticated, service_role;
grant all on all tables    in schema public to postgres, anon, authenticated, service_role;
grant all on all routines  in schema public to postgres, anon, authenticated, service_role;
grant all on all sequences in schema public to postgres, anon, authenticated, service_role;

alter default privileges in schema public grant all on tables    to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on routines  to postgres, anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to postgres, anon, authenticated, service_role;

-- koi_free_style is reached only by Prisma over a direct postgres connection.
-- service_role is granted so the Supabase dashboard / admin tooling can read it;
-- anon and authenticated are deliberately left out so the schema is not exposed
-- through the public PostgREST API.
grant usage on schema koi_free_style to postgres, service_role;
grant all on all tables    in schema koi_free_style to postgres, service_role;
grant all on all routines  in schema koi_free_style to postgres, service_role;
grant all on all sequences in schema koi_free_style to postgres, service_role;

alter default privileges in schema koi_free_style grant all on tables    to postgres, service_role;
alter default privileges in schema koi_free_style grant all on routines  to postgres, service_role;
alter default privileges in schema koi_free_style grant all on sequences to postgres, service_role;
`;

await client.connect();
try {
  await client.query('BEGIN');
  await client.query(sql);
  if (APPLY) {
    await client.query('COMMIT');
    console.log('=== GRANTS COMMITTED ===');
  } else {
    await client.query('ROLLBACK');
    console.log('=== DRY RUN OK (rolled back) ===');
  }
} catch (e) {
  await client.query('ROLLBACK');
  console.log(`FAIL [${e.code}] ${e.message}`);
  process.exitCode = 1;
} finally {
  await client.end();
}
