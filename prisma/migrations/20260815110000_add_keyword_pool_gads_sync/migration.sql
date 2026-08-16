-- Keyword Pool + Google Ads Sync — 4 bang moi + SyncJobLog
-- AN TOAN: chi CREATE TABLE/INDEX moi, khong cham bang hien co.
-- Moi bang deu co IF NOT EXISTS de idempotent khi chay lai.

CREATE TABLE IF NOT EXISTS "koi_free_style"."keyword_pool" (
  "id"         TEXT NOT NULL,
  "text"       TEXT NOT NULL,
  "source"     TEXT NOT NULL DEFAULT 'manual',
  "projectTag" TEXT,
  "notes"      TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "keyword_pool_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "keyword_pool_text_projectTag_key"
  ON "koi_free_style"."keyword_pool" ("text", "projectTag");

CREATE INDEX IF NOT EXISTS "keyword_pool_projectTag_idx"
  ON "koi_free_style"."keyword_pool" ("projectTag");

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "koi_free_style"."gads_campaign" (
  "id"                     TEXT NOT NULL,
  "customerId"             TEXT NOT NULL,
  "name"                   TEXT NOT NULL,
  "status"                 TEXT NOT NULL,
  "advertisingChannelType" TEXT,
  "budgetMicros"           BIGINT,
  "syncedAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "gads_campaign_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "gads_campaign_customerId_idx"
  ON "koi_free_style"."gads_campaign" ("customerId");

CREATE INDEX IF NOT EXISTS "gads_campaign_status_idx"
  ON "koi_free_style"."gads_campaign" ("status");

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "koi_free_style"."gads_ad_group" (
  "id"         TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "name"       TEXT NOT NULL,
  "status"     TEXT NOT NULL,
  "type"       TEXT NOT NULL DEFAULT 'custom',
  "syncedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "gads_ad_group_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "gads_ad_group_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "koi_free_style"."gads_campaign" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "gads_ad_group_campaignId_idx"
  ON "koi_free_style"."gads_ad_group" ("campaignId");

CREATE INDEX IF NOT EXISTS "gads_ad_group_type_idx"
  ON "koi_free_style"."gads_ad_group" ("type");

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "koi_free_style"."keyword_campaign_link" (
  "id"              TEXT NOT NULL,
  "keywordId"       TEXT NOT NULL,
  "campaignId"      TEXT NOT NULL,
  "adGroupId"       TEXT NOT NULL,
  "matchType"       TEXT NOT NULL DEFAULT 'broad',
  "isNegative"      BOOLEAN NOT NULL DEFAULT false,
  "negativeScope"   TEXT,
  "syncStatus"      TEXT NOT NULL DEFAULT 'pending',
  "adsResourceName" TEXT,
  "lastSyncAt"      TIMESTAMP(3),
  "lastError"       TEXT,
  "retryCount"      INTEGER NOT NULL DEFAULT 0,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "keyword_campaign_link_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "keyword_campaign_link_keywordId_fkey"
    FOREIGN KEY ("keywordId") REFERENCES "koi_free_style"."keyword_pool" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "keyword_campaign_link_campaignId_fkey"
    FOREIGN KEY ("campaignId") REFERENCES "koi_free_style"."gads_campaign" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "keyword_campaign_link_adGroupId_fkey"
    FOREIGN KEY ("adGroupId") REFERENCES "koi_free_style"."gads_ad_group" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "keyword_campaign_link_keywordId_adGroupId_matchType_isNegative_key"
  ON "koi_free_style"."keyword_campaign_link" ("keywordId", "adGroupId", "matchType", "isNegative");

CREATE INDEX IF NOT EXISTS "keyword_campaign_link_syncStatus_idx"
  ON "koi_free_style"."keyword_campaign_link" ("syncStatus");

CREATE INDEX IF NOT EXISTS "keyword_campaign_link_adGroupId_idx"
  ON "koi_free_style"."keyword_campaign_link" ("adGroupId");

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "koi_free_style"."sync_job_log" (
  "id"             TEXT NOT NULL,
  "jobType"        TEXT NOT NULL,
  "triggeredBy"    TEXT NOT NULL DEFAULT 'cron',
  "status"         TEXT NOT NULL DEFAULT 'running',
  "totalItems"     INTEGER,
  "succeededItems" INTEGER,
  "failedItems"    INTEGER,
  "errorSummary"   TEXT,
  "startedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt"     TIMESTAMP(3),
  CONSTRAINT "sync_job_log_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "sync_job_log_status_idx"
  ON "koi_free_style"."sync_job_log" ("status");

CREATE INDEX IF NOT EXISTS "sync_job_log_jobType_startedAt_idx"
  ON "koi_free_style"."sync_job_log" ("jobType", "startedAt");
