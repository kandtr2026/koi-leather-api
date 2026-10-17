const { Pool } = require("pg");
const fs = require("fs");

const envLine = fs.readFileSync(".env", "utf8").split(/\r?\n/).find((l) => l.startsWith("DATABASE_URL"));
const url = envLine.split("=").slice(1).join("=").trim().replace(/^"|"$/g, "");
const pool = new Pool({ connectionString: url.replace(/\?.*$/, ""), ssl: { rejectUnauthorized: false } });

(async () => {
  try {
    const b = await pool.query(
      "SELECT bucket_id, count(*)::int AS objects, sum((metadata->>'size')::bigint) AS bytes FROM storage.objects GROUP BY bucket_id ORDER BY bytes DESC"
    );
    console.log("== storage buckets ==");
    for (const r of b.rows) console.log(`  ${r.bucket_id.padEnd(16)} ${r.objects} objects  ${(r.bytes / 1048576).toFixed(1)} MB`);

    const pi = await pool.query("SELECT count(*)::int AS n FROM product_images");
    console.log("\nproduct_images rows:", pi.rows[0].n);

    const pib = await pool.query("SELECT storage_path FROM product_images WHERE storage_path IS NOT NULL LIMIT 8");
    console.log("samples:", pib.rows.map((r) => JSON.stringify(r.storage_path)).join("\n  "));

    const piFull = await pool.query(
      "SELECT count(*)::int AS absolute, count(*) FILTER (WHERE storage_path LIKE 'http%') AS http, count(*) FILTER (WHERE storage_path NOT LIKE 'http%') AS relative FROM product_images"
    );
    console.log("abs/relative:", piFull.rows[0]);

    const koiPi = await pool.query("SELECT to_regclass('public.koi_product_images') AS t, to_regclass('public.koi_products') AS p, to_regclass('public.koi_categories') AS c");
    console.log("koi_* tables exist:", koiPi.rows[0]);

    const blogObjs = await pool.query(
      "SELECT count(*)::int AS n FROM storage.objects WHERE bucket_id = 'blog'"
    );
    console.log("blog bucket objects total:", blogObjs.rows[0].n);
  } catch (e) {
    console.error("FATAL:", e.message);
  } finally {
    await pool.end();
  }
})();