const { Pool } = require("pg");
const fs = require("fs");

const envLine = fs
  .readFileSync(".env", "utf8")
  .split(/\r?\n/)
  .find((l) => l.startsWith("DATABASE_URL"));
const url = envLine.split("=").slice(1).join("=").trim().replace(/^"|"$/g, "");
const pool = new Pool({ connectionString: url.replace(/\?.*$/, ""), ssl: { rejectUnauthorized: false } });

async function q(sql) {
  try { return await pool.query(sql); } catch (e) { return { error: e.message.slice(0, 160) }; }
}

(async () => {
  try {
    console.log("== tables with 'revision' ==");
    console.log((await q(`SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename ILIKE '%revision%'`)).rows);

    console.log("\n== products columns ==");
    console.log((await q(`SELECT column_name FROM information_schema.columns WHERE table_name='products'`)).rows.map(r => r.column_name).join(", "));

    console.log("\n== product_images link ==");
    console.log((await q(`SELECT column_name FROM information_schema.columns WHERE table_name='product_images'`)).rows.map(r => r.column_name).join(", "));

    const supabaseLike = `'%supabase.co%'`;

    console.log("\n== rows containing supabase URLs ==");
    for (const [t, w] of [
      ["posts", `content ILIKE ${supabaseLike} OR cover_image ILIKE ${supabaseLike} OR excerpt ILIKE ${supabaseLike}`],
      ["pages", `content ILIKE ${supabaseLike}`],
      ["product_images", `url ILIKE ${supabaseLike} OR thumbnail_url ILIKE ${supabaseLike} OR medium_url ILIKE ${supabaseLike}`],
    ]) {
      const r = await q(`SELECT count(*)::int AS n FROM ${t} WHERE ${w}`);
      console.log(`${t}: ${r.error ?? r.rows?.[0]?.n ?? r}`);
    }

    console.log("\n== storage buckets in THIS project (storage.objects) ==");
    const buckets = await q(`SELECT bucket_id, count(*)::int AS objects, sum(metadata->>'size')::bigint AS bytes
                             FROM storage.objects GROUP BY bucket_id ORDER BY bytes DESC`);
    if (buckets.error) console.log("ERR:", buckets.error);
    else {
      for (const b of buckets.rows) console.log(`  ${b.bucket_id.padEnd(16)} ${b.objects} objects  ${(b.bytes/1048576).toFixed(1)} MB`);
    }

    console.log("\n== unique blog object keys (posts.content + cover_image) ==");
    const keys = await q(`
      WITH blob AS (
        SELECT regexp_matches(
          COALESCE(content,'') || ' ' || COALESCE(cover_image,''),
          'storage/v1/object/public/([a-z0-9_-]+)/([^"''\\s<>)]+)', 'gi'
        ) AS m
        FROM posts
        UNION ALL
        SELECT regexp_matches(COALESCE(content,''), 'storage/v1/object/public/([a-z0-9_-]+)/([^"''\\s<>)]+)', 'gi')
        FROM pages
      )
      SELECT m[1] AS bucket, count(DISTINCT m[2]) AS unique_keys, count(*) AS occurrences
      FROM blob GROUP BY m[1] ORDER BY unique_keys DESC`);
    if (keys.error) console.log("ERR:", keys.error);
    else keys.rows.forEach((r) => console.log(`  bucket=${r.bucket}  unique=${r.unique_keys}  occ=${r.occurrences}`));

    console.log("\n== product_images URL provider breakdown ==");
    const prov = await q(`SELECT
        count(*) FILTER (WHERE url ILIKE '%cloudinary%') AS cloudinary,
        count(*) FILTER (WHERE url ILIKE '%supabase%' OR thumbnail_url ILIKE '%supabase%' OR medium_url ILIKE '%supabase%') AS any_supabase,
        count(*) FILTER (WHERE url LIKE '/uploads/%') AS local_rel,
        count(*) AS total FROM product_images`);
    console.log(prov.rows[0] ?? prov);

    console.log("\n== pages with supabase + their slugs ==");
    const pages = await q(`SELECT id, slug, length(content) AS len FROM pages WHERE content ILIKE '%supabase.co%' LIMIT 30`);
    console.log(pages.rows ?? pages);

    console.log("\n== hosts seen (any supabase subdomain) ==");
    const hosts = await q(`
      WITH blob AS (
        SELECT regexp_matches(content, 'https://([a-z0-9]+)\.supabase\.co', 'gi') AS m FROM posts
        UNION ALL SELECT regexp_matches(content, 'https://([a-z0-9]+)\.supabase\.co', 'gi') FROM pages
      )
      SELECT DISTINCT m[1] AS ref FROM blob`);
    console.log(hosts.rows ?? hosts.error);
  } catch (e) {
    console.error("FATAL:", e.message);
  } finally {
    await pool.end();
  }
})();