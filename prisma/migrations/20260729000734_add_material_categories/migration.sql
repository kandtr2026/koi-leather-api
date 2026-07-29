-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "koi_free_style";

-- CreateTable
CREATE TABLE "public"."categories" (
    "id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "parent_id" BIGINT,
    "image_url" TEXT,
    "product_count" INTEGER NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_hidden" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."leads" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "message" TEXT,
    "product_id" BIGINT,
    "source" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "note" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pages" (
    "id" BIGINT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT,
    "meta_title" TEXT,
    "meta_description" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."post_term_links" (
    "post_id" BIGINT NOT NULL,
    "term_id" BIGINT NOT NULL,

    CONSTRAINT "post_term_links_pkey" PRIMARY KEY ("post_id","term_id")
);

-- CreateTable
CREATE TABLE "public"."post_terms" (
    "id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "taxonomy" TEXT NOT NULL,
    "post_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "post_terms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."posts" (
    "id" BIGINT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "content" TEXT,
    "cover_image" TEXT,
    "meta_title" TEXT,
    "meta_description" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."product_categories" (
    "product_id" BIGINT NOT NULL,
    "category_id" BIGINT NOT NULL,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("product_id","category_id")
);

-- CreateTable
CREATE TABLE "public"."product_images" (
    "id" BIGSERIAL NOT NULL,
    "product_id" BIGINT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "alt" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."product_tags" (
    "product_id" BIGINT NOT NULL,
    "tag_id" BIGINT NOT NULL,

    CONSTRAINT "product_tags_pkey" PRIMARY KEY ("product_id","tag_id")
);

-- CreateTable
CREATE TABLE "public"."product_variants" (
    "id" BIGINT NOT NULL,
    "product_id" BIGINT NOT NULL,
    "name" TEXT,
    "sku" TEXT,
    "price" BIGINT,
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "image_url" TEXT,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."products" (
    "id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sku" TEXT,
    "short_description" TEXT,
    "description" TEXT,
    "price" BIGINT,
    "regular_price" BIGINT,
    "sale_price" BIGINT,
    "price_min" BIGINT,
    "price_max" BIGINT,
    "on_sale" BOOLEAN NOT NULL DEFAULT false,
    "has_variants" BOOLEAN NOT NULL DEFAULT false,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "is_published" BOOLEAN NOT NULL DEFAULT true,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "meta_title" TEXT,
    "meta_description" TEXT,
    "search_text" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."redirects" (
    "id" BIGSERIAL NOT NULL,
    "from_path" TEXT NOT NULL,
    "to_path" TEXT NOT NULL,
    "status_code" INTEGER NOT NULL DEFAULT 301,

    CONSTRAINT "redirects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."tags" (
    "id" BIGINT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "product_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "koi_free_style"."koi_categories" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "specsSchema" TEXT NOT NULL DEFAULT '{}',
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "koi_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "koi_free_style"."koi_product_categories" (
    "productId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "koi_product_categories_pkey" PRIMARY KEY ("productId","categoryId")
);

-- CreateTable
CREATE TABLE "koi_free_style"."koi_products" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "productType" TEXT NOT NULL,
    "categoryId" TEXT,
    "description" TEXT,
    "basePrice" DOUBLE PRECISION,
    "priceMin" DOUBLE PRECISION,
    "priceMax" DOUBLE PRECISION,
    "hasVariants" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "sku" TEXT,
    "externalId" TEXT,
    "technicalSpecs" TEXT NOT NULL DEFAULT '{}',
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "canonicalUrl" TEXT,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "koi_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "koi_free_style"."koi_product_images" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT,
    "url" TEXT NOT NULL,
    "thumbnailUrl" TEXT NOT NULL,
    "mediumUrl" TEXT,
    "altText" TEXT,
    "imageType" TEXT NOT NULL DEFAULT 'STUDIO',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "width" INTEGER,
    "height" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "koi_product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "koi_free_style"."koi_product_variants" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "title" TEXT,
    "price" DOUBLE PRECISION,
    "hardwareOption" TEXT NOT NULL DEFAULT 'none',
    "stockStatus" TEXT NOT NULL DEFAULT 'IN_STOCK',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "options" TEXT NOT NULL DEFAULT '{}',
    "images" TEXT,
    "craftingSpecId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "koi_product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "koi_free_style"."koi_crafting_specs" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "patternFiles" TEXT NOT NULL DEFAULT '[]',
    "outerLeather" TEXT NOT NULL DEFAULT '{}',
    "liningLeather" TEXT NOT NULL DEFAULT '{}',
    "interlining" TEXT NOT NULL DEFAULT '{}',
    "dimensions" TEXT NOT NULL DEFAULT '{}',
    "craftingDetails" TEXT NOT NULL DEFAULT '{}',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "koi_crafting_specs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "koi_free_style"."koi_raw_materials" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "materialType" TEXT NOT NULL,
    "supplier" TEXT,
    "unit" TEXT NOT NULL,
    "color" TEXT,
    "thicknessMm" DOUBLE PRECISION,
    "totalQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reservedQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "availableQuantity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'VND',
    "externalId" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "syncStatus" TEXT DEFAULT 'SYNCED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "materialCategoryId" TEXT,

    CONSTRAINT "koi_raw_materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "koi_free_style"."koi_inventory_transactions" (
    "id" TEXT NOT NULL,
    "materialId" TEXT NOT NULL,
    "orderId" TEXT,
    "transactionType" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "batchRef" TEXT,
    "costAtTransaction" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "koi_inventory_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "koi_free_style"."koi_production_orders" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "craftsman" TEXT,
    "dueDate" TIMESTAMP(3),
    "materialsAllocated" TEXT NOT NULL DEFAULT '[]',
    "totalCostSnapshot" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "koi_production_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "koi_free_style"."koi_seo_records" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "slugHistory" TEXT NOT NULL DEFAULT '[]',
    "jsonLd" TEXT NOT NULL DEFAULT '{}',
    "ogTitle" TEXT,
    "ogDescription" TEXT,
    "ogImage" TEXT,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "noIndex" BOOLEAN NOT NULL DEFAULT false,
    "sitemapPriority" DOUBLE PRECISION,
    "sitemapChangeFreq" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "koi_seo_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "koi_free_style"."koi_image_categories" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "koi_image_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "koi_free_style"."koi_material_categories" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "koi_material_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "public"."categories"("slug");

-- CreateIndex
CREATE INDEX "categories_parent_id_idx" ON "public"."categories"("parent_id");

-- CreateIndex
CREATE INDEX "categories_slug_idx" ON "public"."categories"("slug");

-- CreateIndex
CREATE INDEX "leads_status_created_at_idx" ON "public"."leads"("status", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "pages_slug_key" ON "public"."pages"("slug");

-- CreateIndex
CREATE INDEX "post_term_links_term_id_idx" ON "public"."post_term_links"("term_id");

-- CreateIndex
CREATE INDEX "post_terms_taxonomy_post_count_idx" ON "public"."post_terms"("taxonomy", "post_count" DESC);

-- CreateIndex
CREATE INDEX "post_terms_taxonomy_slug_idx" ON "public"."post_terms"("taxonomy", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "post_terms_taxonomy_slug_key" ON "public"."post_terms"("taxonomy", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "posts_slug_key" ON "public"."posts"("slug");

-- CreateIndex
CREATE INDEX "posts_is_published_published_at_idx" ON "public"."posts"("is_published", "published_at" DESC);

-- CreateIndex
CREATE INDEX "product_categories_category_id_idx" ON "public"."product_categories"("category_id");

-- CreateIndex
CREATE INDEX "product_images_product_id_sort_order_idx" ON "public"."product_images"("product_id", "sort_order");

-- CreateIndex
CREATE INDEX "product_tags_tag_id_idx" ON "public"."product_tags"("tag_id");

-- CreateIndex
CREATE INDEX "product_variants_product_id_idx" ON "public"."product_variants"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "public"."products"("slug");

-- CreateIndex
CREATE INDEX "products_is_published_sort_order_idx" ON "public"."products"("is_published", "sort_order");

-- CreateIndex
CREATE INDEX "products_slug_idx" ON "public"."products"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "redirects_from_path_key" ON "public"."redirects"("from_path");

-- CreateIndex
CREATE UNIQUE INDEX "tags_slug_key" ON "public"."tags"("slug");

-- CreateIndex
CREATE INDEX "tags_product_count_idx" ON "public"."tags"("product_count" DESC);

-- CreateIndex
CREATE INDEX "tags_slug_idx" ON "public"."tags"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "koi_categories_code_key" ON "koi_free_style"."koi_categories"("code");

-- CreateIndex
CREATE UNIQUE INDEX "koi_categories_slug_key" ON "koi_free_style"."koi_categories"("slug");

-- CreateIndex
CREATE INDEX "koi_categories_isActive_idx" ON "koi_free_style"."koi_categories"("isActive");

-- CreateIndex
CREATE INDEX "koi_categories_displayOrder_idx" ON "koi_free_style"."koi_categories"("displayOrder");

-- CreateIndex
CREATE INDEX "koi_product_categories_categoryId_idx" ON "koi_free_style"."koi_product_categories"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "koi_products_slug_key" ON "koi_free_style"."koi_products"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "koi_products_sku_key" ON "koi_free_style"."koi_products"("sku");

-- CreateIndex
CREATE INDEX "koi_products_productType_idx" ON "koi_free_style"."koi_products"("productType");

-- CreateIndex
CREATE INDEX "koi_products_status_idx" ON "koi_free_style"."koi_products"("status");

-- CreateIndex
CREATE INDEX "koi_products_slug_idx" ON "koi_free_style"."koi_products"("slug");

-- CreateIndex
CREATE INDEX "koi_products_categoryId_idx" ON "koi_free_style"."koi_products"("categoryId");

-- CreateIndex
CREATE INDEX "koi_products_createdAt_idx" ON "koi_free_style"."koi_products"("createdAt");

-- CreateIndex
CREATE INDEX "koi_products_categoryId_status_idx" ON "koi_free_style"."koi_products"("categoryId", "status");

-- CreateIndex
CREATE INDEX "koi_product_images_productId_idx" ON "koi_free_style"."koi_product_images"("productId");

-- CreateIndex
CREATE INDEX "koi_product_images_variantId_idx" ON "koi_free_style"."koi_product_images"("variantId");

-- CreateIndex
CREATE INDEX "koi_product_images_isPrimary_idx" ON "koi_free_style"."koi_product_images"("isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "koi_product_variants_sku_key" ON "koi_free_style"."koi_product_variants"("sku");

-- CreateIndex
CREATE INDEX "koi_product_variants_productId_idx" ON "koi_free_style"."koi_product_variants"("productId");

-- CreateIndex
CREATE INDEX "koi_product_variants_sku_idx" ON "koi_free_style"."koi_product_variants"("sku");

-- CreateIndex
CREATE INDEX "koi_product_variants_stockStatus_idx" ON "koi_free_style"."koi_product_variants"("stockStatus");

-- CreateIndex
CREATE INDEX "koi_crafting_specs_productId_idx" ON "koi_free_style"."koi_crafting_specs"("productId");

-- CreateIndex
CREATE INDEX "koi_raw_materials_materialType_idx" ON "koi_free_style"."koi_raw_materials"("materialType");

-- CreateIndex
CREATE INDEX "koi_raw_materials_externalId_idx" ON "koi_free_style"."koi_raw_materials"("externalId");

-- CreateIndex
CREATE INDEX "koi_raw_materials_supplier_idx" ON "koi_free_style"."koi_raw_materials"("supplier");

-- CreateIndex
CREATE INDEX "koi_raw_materials_materialCategoryId_idx" ON "koi_free_style"."koi_raw_materials"("materialCategoryId");

-- CreateIndex
CREATE INDEX "koi_inventory_transactions_materialId_idx" ON "koi_free_style"."koi_inventory_transactions"("materialId");

-- CreateIndex
CREATE INDEX "koi_inventory_transactions_orderId_idx" ON "koi_free_style"."koi_inventory_transactions"("orderId");

-- CreateIndex
CREATE INDEX "koi_inventory_transactions_transactionType_idx" ON "koi_free_style"."koi_inventory_transactions"("transactionType");

-- CreateIndex
CREATE INDEX "koi_inventory_transactions_createdAt_idx" ON "koi_free_style"."koi_inventory_transactions"("createdAt");

-- CreateIndex
CREATE INDEX "koi_production_orders_variantId_idx" ON "koi_free_style"."koi_production_orders"("variantId");

-- CreateIndex
CREATE INDEX "koi_production_orders_status_idx" ON "koi_free_style"."koi_production_orders"("status");

-- CreateIndex
CREATE INDEX "koi_production_orders_createdAt_idx" ON "koi_free_style"."koi_production_orders"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "koi_seo_records_slug_key" ON "koi_free_style"."koi_seo_records"("slug");

-- CreateIndex
CREATE INDEX "koi_seo_records_entityType_entityId_idx" ON "koi_free_style"."koi_seo_records"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "koi_seo_records_slug_idx" ON "koi_free_style"."koi_seo_records"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "koi_image_categories_code_key" ON "koi_free_style"."koi_image_categories"("code");

-- CreateIndex
CREATE INDEX "koi_image_categories_code_idx" ON "koi_free_style"."koi_image_categories"("code");

-- CreateIndex
CREATE UNIQUE INDEX "koi_material_categories_code_key" ON "koi_free_style"."koi_material_categories"("code");

-- CreateIndex
CREATE INDEX "koi_material_categories_code_idx" ON "koi_free_style"."koi_material_categories"("code");

-- AddForeignKey
ALTER TABLE "public"."categories" ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."leads" ADD CONSTRAINT "leads_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."post_term_links" ADD CONSTRAINT "post_term_links_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."post_term_links" ADD CONSTRAINT "post_term_links_term_id_fkey" FOREIGN KEY ("term_id") REFERENCES "public"."post_terms"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."product_categories" ADD CONSTRAINT "product_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."product_categories" ADD CONSTRAINT "product_categories_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."product_images" ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."product_tags" ADD CONSTRAINT "product_tags_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."product_tags" ADD CONSTRAINT "product_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "public"."product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "koi_free_style"."koi_product_categories" ADD CONSTRAINT "koi_product_categories_productId_fkey" FOREIGN KEY ("productId") REFERENCES "koi_free_style"."koi_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "koi_free_style"."koi_product_categories" ADD CONSTRAINT "koi_product_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "koi_free_style"."koi_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "koi_free_style"."koi_products" ADD CONSTRAINT "koi_products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "koi_free_style"."koi_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "koi_free_style"."koi_product_images" ADD CONSTRAINT "koi_product_images_productId_fkey" FOREIGN KEY ("productId") REFERENCES "koi_free_style"."koi_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "koi_free_style"."koi_product_images" ADD CONSTRAINT "koi_product_images_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "koi_free_style"."koi_product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "koi_free_style"."koi_product_variants" ADD CONSTRAINT "koi_product_variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "koi_free_style"."koi_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "koi_free_style"."koi_product_variants" ADD CONSTRAINT "koi_product_variants_craftingSpecId_fkey" FOREIGN KEY ("craftingSpecId") REFERENCES "koi_free_style"."koi_crafting_specs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "koi_free_style"."koi_crafting_specs" ADD CONSTRAINT "koi_crafting_specs_productId_fkey" FOREIGN KEY ("productId") REFERENCES "koi_free_style"."koi_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "koi_free_style"."koi_raw_materials" ADD CONSTRAINT "koi_raw_materials_materialCategoryId_fkey" FOREIGN KEY ("materialCategoryId") REFERENCES "koi_free_style"."koi_material_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "koi_free_style"."koi_inventory_transactions" ADD CONSTRAINT "koi_inventory_transactions_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "koi_free_style"."koi_raw_materials"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "koi_free_style"."koi_production_orders" ADD CONSTRAINT "koi_production_orders_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "koi_free_style"."koi_product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "koi_free_style"."koi_seo_records" ADD CONSTRAINT "koi_seo_records_entityId_fkey" FOREIGN KEY ("entityId") REFERENCES "koi_free_style"."koi_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
