/**
 * Migrate the WooCommerce catalog (schema `public`, seeded from koi-leather)
 * into the Koi Backend app schema (`koi_free_style`).
 *
 * Source of truth is the `public` tables rather than data/*.json: those tables
 * are what the live catalog site serves, so reading them keeps both apps
 * showing identical text, prices and image order.
 *
 * Shape differences handled here:
 *   bigint id        -> uuid            (Woo id kept in externalId)
 *   flat text name   -> {"vi": "..."}   (KoiProduct.name/description are
 *                                        stringified JSON in TEXT columns)
 *   storage filename -> absolute URL    (Supabase Storage public URL)
 *   free-form cat    -> productType enum (WALLET|BELT|WATCH_STRAP|BAG|ACCESSORY)
 *   variants w/o sku -> generated sku   (KoiProductVariant.sku is NOT NULL UNIQUE)
 *
 * Usage:
 *   node prisma/migrate-public-to-kfs.mjs           # dry run, ROLLBACK
 *   node prisma/migrate-public-to-kfs.mjs --apply   # COMMIT
 *
 * Re-runnable: keyed on slug / sku, so a second run updates instead of
 * duplicating. Nothing outside koi_free_style is written.
 *
 * Rows are written in multi-row batches: one INSERT per ~500 rows instead of
 * per row. Row-at-a-time meant ~3.200 round-trips to ap-south-1 and the run
 * exceeded ten minutes.
 */
import { readFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import pg from 'pg';

const APPLY = process.argv.includes('--apply');

const SUPABASE_URL = 'https://stdkeltylgakfvqejugz.supabase.co';
const BUCKET = 'products';
const publicImageUrl = (p) =>
  `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${encodeURIComponent(p)}`;

// ---------------------------------------------------------------- connection
function connString() {
  const raw = readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .find((l) => l.startsWith('DATABASE_URL='))
    .replace(/^DATABASE_URL="?/, '')
    .replace(/"$/, '');
  return raw.replace(/[?&]sslmode=[^&]*/, '');
}

// ------------------------------------------------------------ productType map
// Woo has 24 free-form categories; KoiProduct.productType is a fixed 5-value
// enum. Order matters: the first match wins, so the specific leaf categories
// are listed before anything broad.
const TYPE_BY_SLUG = [
  ['day-da-dong-ho', 'WATCH_STRAP'],
  ['vi-da-cho-nam', 'WALLET'],
  ['vi-da-cho-nu', 'WALLET'],
  ['card-holder', 'WALLET'],
  ['kep-tien-money-clip', 'WALLET'],
  ['day-lung-cho-nam', 'BELT'],
  ['day-lung-cho-nu', 'BELT'],
  ['tui-da-cho-nam', 'BAG'],
  ['tui-da-cho-nu', 'BAG'],
  ['clutch-cho-nam', 'BAG'],
  ['bao-da-ipad', 'BAG'],
];

// Categories that receive the canonical enum code, so the admin form's
// toProductType() resolves productType straight from category.code.
const CANONICAL_CODE = {
  'day-da-dong-ho': 'WATCH_STRAP',
  'vi-da-cho-nam': 'WALLET',
  'day-lung-cho-nam': 'BELT',
  'tui-da-cho-nu': 'BAG',
  'phu-kien-bang-da': 'ACCESSORY',
};

function codeFromSlug(slug) {
  return (
    CANONICAL_CODE[slug] ||
    slug.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '')
  );
}

function productTypeFor(slugs) {
  for (const [needle, type] of TYPE_BY_SLUG) {
    if (slugs.includes(needle)) return type;
  }
  return 'ACCESSORY';
}

// Woo variant SKUs are all empty but KoiProductVariant.sku is NOT NULL UNIQUE.
// Derive a stable one from the Woo ids so re-runs produce the same value.
const skuFor = (wooProductId, wooVariantId) => `KOI-${wooProductId}-${wooVariantId}`;

// ------------------------------------------------------------------- batching
/**
 * Run one INSERT per chunk of rows.
 * `rows` is an array of value-arrays; `tail` carries ON CONFLICT / RETURNING.
 * Returns all RETURNING rows.
 */
async function insertBatched(client, table, cols, rows, tail = '', chunk = 500) {
  const out = [];
  const quoted = cols.map((c) => `"${c}"`).join(', ');
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk);
    const params = [];
    const tuples = slice.map((r) => {
      const ph = r.map((v) => {
        params.push(v);
        return `$${params.length}`;
      });
      return `(${ph.join(',')})`;
    });
    const sql = `insert into ${table} (${quoted}) values ${tuples.join(',')} ${tail}`;
    const res = await client.query(sql, params);
    out.push(...res.rows);
  }
  return out;
}

// ---------------------------------------------------------------------- main
const client = new pg.Client({
  connectionString: connString(),
  ssl: { rejectUnauthorized: false },
  statement_timeout: 120000,
});
await client.connect();

const q = async (sql, params) => (await client.query(sql, params)).rows;
const stats = {};
const t0 = Date.now();
const step = (m) => console.log(`  [${String(Date.now() - t0).padStart(6)}ms] ${m}`);

try {
  await client.query('BEGIN');

  // ---------------------------------------------------- 0. image categories
  // The admin's image-type dropdown reads these; imageType on each image must
  // match one of the codes.
  const IMAGE_CATS = [
    ['STUDIO', 'Studio', 'Ảnh nền trơn, chụp trong studio', 0],
    ['LIFESTYLE', 'Lifestyle', 'Ảnh sử dụng thực tế', 1],
    ['CRAFTING', 'Crafting', 'Ảnh quá trình chế tác', 2],
    ['TEXTURE', 'Texture', 'Ảnh cận vân da', 3],
  ];
  await insertBatched(
    client,
    'koi_free_style.koi_image_categories',
    ['id', 'code', 'name', 'description', 'sortOrder', 'createdAt', 'updatedAt'],
    IMAGE_CATS.map(([code, name, description, sortOrder]) => [
      randomUUID(), code, name, description, sortOrder, new Date(), new Date(),
    ]),
    `on conflict (code) do update set name = excluded.name,
                                      description = excluded.description,
                                      "sortOrder" = excluded."sortOrder",
                                      "updatedAt" = now()`,
  );
  stats.imageCategories = IMAGE_CATS.length;
  step('image categories');

  // ------------------------------------------------------------ 1. categories
  const srcCats = await q(`
    select id::text, name, slug, description, parent_id::text, sort_order, is_hidden
    from public.categories
    order by sort_order, id
  `);

  // KoiCategory has no parentId column, so the Woo parent/child tree is
  // flattened. The hierarchy is not lost: the parent stays its own category and
  // KoiProductCategory keeps every product<->category pair, so a product under
  // "vi-da-cho-nam" is still linked to "do-da-nam" too.
  const catRows = srcCats.map((c) => [
    randomUUID(),
    codeFromSlug(c.slug),
    c.name,
    c.slug,
    c.description,
    '{}',
    c.name,
    c.description ? String(c.description).slice(0, 300) : null,
    c.sort_order ?? 0,
    !c.is_hidden,
    new Date(),
    new Date(),
  ]);
  const catOut = await insertBatched(
    client,
    'koi_free_style.koi_categories',
    ['id', 'code', 'name', 'slug', 'description', 'specsSchema',
     'metaTitle', 'metaDescription', 'displayOrder', 'isActive',
     'createdAt', 'updatedAt'],
    catRows,
    `on conflict (slug) do update set name           = excluded.name,
                                      description    = excluded.description,
                                      "displayOrder" = excluded."displayOrder",
                                      "isActive"     = excluded."isActive",
                                      "updatedAt"    = now()
     returning id, slug`,
  );
  // RETURNING order is not guaranteed to match input order, so key by slug.
  const catIdBySlug = new Map(catOut.map((r) => [r.slug, r.id]));
  stats.categories = catIdBySlug.size;
  step('categories');

  // -------------------------------------------------------------- 2. products
  const srcProducts = await q(`
    select id::text, name, slug, sku, short_description, description,
           price::text, price_min::text, price_max::text,
           has_variants, is_available, is_published,
           meta_title, meta_description, sort_order
    from public.products
    order by id
  `);

  const pcPairs = await q(`
    select pc.product_id::text pid, c.slug
    from public.product_categories pc
    join public.categories c on c.id = pc.category_id
  `);
  const catsByProduct = new Map();
  for (const r of pcPairs) {
    if (!catsByProduct.has(r.pid)) catsByProduct.set(r.pid, []);
    catsByProduct.get(r.pid).push(r.slug);
  }

  const num = (v) => (v === null || v === undefined ? null : Number(v));
  const wooIdBySlug = new Map(srcProducts.map((p) => [p.slug, p.id]));

  const prodRows = srcProducts.map((p) => {
    const slugs = catsByProduct.get(p.id) ?? [];
    // Primary category = the most specific one (a leaf, not a top-level
    // parent) so the admin shows a meaningful label.
    const primarySlug =
      slugs.find((s) => CANONICAL_CODE[s]) ??
      slugs.find((s) => TYPE_BY_SLUG.some(([n]) => n === s)) ??
      slugs[0] ??
      null;
    return [
      randomUUID(),
      JSON.stringify({ vi: p.name }),
      p.slug,
      productTypeFor(slugs),
      primarySlug ? catIdBySlug.get(primarySlug) : null,
      JSON.stringify({ vi: p.description ?? p.short_description ?? '' }),
      num(p.price),
      num(p.price_min),
      num(p.price_max),
      p.has_variants,
      p.is_published ? 'ACTIVE' : 'DRAFT',
      p.sku || null,
      p.id, // externalId: the WooCommerce id, for traceability
      '{}',
      p.meta_title,
      p.meta_description,
      `/cua-hang/${p.slug}/`, // keep the indexed WordPress URL
      false,
      new Date(),
      new Date(),
    ];
  });

  const prodOut = await insertBatched(
    client,
    'koi_free_style.koi_products',
    ['id', 'name', 'slug', 'productType', 'categoryId', 'description',
     'basePrice', 'priceMin', 'priceMax', 'hasVariants', 'status',
     'sku', 'externalId', 'technicalSpecs',
     'metaTitle', 'metaDescription', 'canonicalUrl',
     'isDeleted', 'createdAt', 'updatedAt'],
    prodRows,
    `on conflict (slug) do update set name             = excluded.name,
                                      "productType"    = excluded."productType",
                                      "categoryId"     = excluded."categoryId",
                                      description      = excluded.description,
                                      "basePrice"      = excluded."basePrice",
                                      "priceMin"       = excluded."priceMin",
                                      "priceMax"       = excluded."priceMax",
                                      "hasVariants"    = excluded."hasVariants",
                                      status           = excluded.status,
                                      "externalId"     = excluded."externalId",
                                      "metaTitle"      = excluded."metaTitle",
                                      "metaDescription"= excluded."metaDescription",
                                      "canonicalUrl"   = excluded."canonicalUrl",
                                      "updatedAt"      = now()
     returning id, slug`,
  );
  const kfsIdByWoo = new Map();
  for (const r of prodOut) {
    const woo = wooIdBySlug.get(r.slug);
    if (woo) kfsIdByWoo.set(woo, r.id);
  }
  stats.products = kfsIdByWoo.size;
  step('products');

  // --------------------------------------------- 3. product <-> category (n-n)
  const linkRows = [];
  for (const r of pcPairs) {
    const pid = kfsIdByWoo.get(r.pid);
    const cid = catIdBySlug.get(r.slug);
    if (pid && cid) linkRows.push([pid, cid, new Date()]);
  }
  await insertBatched(
    client,
    'koi_free_style.koi_product_categories',
    ['productId', 'categoryId', 'createdAt'],
    linkRows,
    'on conflict do nothing',
  );
  stats.productCategories = linkRows.length;
  step('product_categories');

  // -------------------------------------------------------------- 4. variants
  const srcVariants = await q(`
    select id::text, product_id::text, name, sku, price::text,
           attributes, is_available, sort_order
    from public.product_variants
    order by product_id, sort_order
  `);

  const varRows = [];
  for (const v of srcVariants) {
    const pid = kfsIdByWoo.get(v.product_id);
    if (!pid) continue;
    varRows.push([
      randomUUID(),
      pid,
      v.sku || skuFor(v.product_id, v.id),
      v.name,
      num(v.price),
      'none',
      v.is_available === false ? 'OUT_OF_STOCK' : 'IN_STOCK',
      (v.sort_order ?? 0) === 0,
      JSON.stringify(v.attributes ?? {}),
      new Date(),
      new Date(),
    ]);
  }
  await insertBatched(
    client,
    'koi_free_style.koi_product_variants',
    ['id', 'productId', 'sku', 'title', 'price', 'hardwareOption',
     'stockStatus', 'isDefault', 'options', 'createdAt', 'updatedAt'],
    varRows,
    `on conflict (sku) do update set "productId"   = excluded."productId",
                                     title        = excluded.title,
                                     price        = excluded.price,
                                     "stockStatus"= excluded."stockStatus",
                                     "isDefault"  = excluded."isDefault",
                                     options      = excluded.options,
                                     "updatedAt"  = now()`,
  );
  stats.variants = varRows.length;
  step('variants');

  // ---------------------------------------------------------------- 5. images
  const srcImages = await q(`
    select product_id::text pid, storage_path, alt, is_primary, sort_order
    from public.product_images
    order by product_id, sort_order
  `);

  // koi_product_images has no natural unique key, so clear the set first rather
  // than accumulating duplicates on re-run.
  await client.query(`delete from koi_free_style.koi_product_images`);

  const imgRows = [];
  for (const im of srcImages) {
    const pid = kfsIdByWoo.get(im.pid);
    if (!pid) continue;
    const url = publicImageUrl(im.storage_path);
    imgRows.push([
      randomUUID(),
      pid,
      url,
      url, // thumbnailUrl is NOT NULL; the files are already compressed webp
      url,
      im.alt,
      'STUDIO',
      im.is_primary,
      im.sort_order ?? 0,
      'image/webp',
      new Date(),
      new Date(),
    ]);
  }
  await insertBatched(
    client,
    'koi_free_style.koi_product_images',
    ['id', 'productId', 'url', 'thumbnailUrl', 'mediumUrl', 'altText',
     'imageType', 'isPrimary', 'displayOrder', 'mimeType',
     'createdAt', 'updatedAt'],
    imgRows,
  );
  stats.images = imgRows.length;
  step('images');

  // ------------------------------------------------------------------ report
  console.log('\n=== MIGRATE public -> koi_free_style ===');
  for (const [k, v] of Object.entries(stats)) {
    console.log(`  ${k.padEnd(20)} ${v}`);
  }

  const typeDist = await q(`
    select "productType", count(*)::int n
    from koi_free_style.koi_products group by 1 order by 2 desc
  `);
  console.log('\n  productType:', typeDist.map((r) => `${r.productType}=${r.n}`).join(' '));

  const orphan = await q(`
    select count(*)::int n from koi_free_style.koi_products where "categoryId" is null
  `);
  console.log('  san pham khong danh muc chinh:', orphan[0].n);

  if (APPLY) {
    await client.query('COMMIT');
    console.log('\n=== COMMITTED ===');
  } else {
    await client.query('ROLLBACK');
    console.log('\n=== DRY RUN (rolled back) — thêm --apply để ghi thật ===');
  }
} catch (e) {
  await client.query('ROLLBACK').catch(() => {});
  console.error('FAILED:', e.code || '', e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
