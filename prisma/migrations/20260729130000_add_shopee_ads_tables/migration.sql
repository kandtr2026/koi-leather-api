-- Bảng snapshot số liệu Shopee Ads đã sync (module src/shopee-ads).
-- Chỉ thêm bảng mới, không sửa/xoá gì của schema cũ.

-- CreateTable
CREATE TABLE "koi_free_style"."koi_shopee_ads_daily" (
    "id" TEXT NOT NULL,
    "shopId" BIGINT NOT NULL,
    "date" DATE NOT NULL,
    "campaignId" BIGINT NOT NULL,
    "name" TEXT,
    "adType" TEXT,
    "status" TEXT,
    "dailyBudget" DOUBLE PRECISION,
    "expense" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "impression" INTEGER NOT NULL DEFAULT 0,
    "click" INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    "gmv" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "directOrder" INTEGER NOT NULL DEFAULT 0,
    "directGmv" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "koi_shopee_ads_daily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "koi_free_style"."koi_shopee_ads_shop_daily" (
    "id" TEXT NOT NULL,
    "shopId" BIGINT NOT NULL,
    "date" DATE NOT NULL,
    "expense" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "impression" INTEGER NOT NULL DEFAULT 0,
    "click" INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL DEFAULT 0,
    "gmv" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "directOrder" INTEGER NOT NULL DEFAULT 0,
    "directGmv" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "koi_shopee_ads_shop_daily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "koi_free_style"."koi_shopee_ads_sync_state" (
    "id" TEXT NOT NULL,
    "shopId" BIGINT NOT NULL,
    "lastSyncAt" TIMESTAMP(3),
    "lastSyncStatus" TEXT,
    "lastSyncMessage" TEXT,
    "lastDateSynced" DATE,
    "rowsWritten" INTEGER NOT NULL DEFAULT 0,
    "balance" DOUBLE PRECISION,
    "autoTopUp" BOOLEAN,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "koi_shopee_ads_sync_state_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "koi_shopee_ads_daily_shopId_date_idx" ON "koi_free_style"."koi_shopee_ads_daily"("shopId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "koi_shopee_ads_daily_shopId_date_campaignId_key" ON "koi_free_style"."koi_shopee_ads_daily"("shopId", "date", "campaignId");

-- CreateIndex
CREATE INDEX "koi_shopee_ads_shop_daily_shopId_date_idx" ON "koi_free_style"."koi_shopee_ads_shop_daily"("shopId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "koi_shopee_ads_shop_daily_shopId_date_key" ON "koi_free_style"."koi_shopee_ads_shop_daily"("shopId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "koi_shopee_ads_sync_state_shopId_key" ON "koi_free_style"."koi_shopee_ads_sync_state"("shopId");
