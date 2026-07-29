-- Bảng lưu credential Shopee (partner_key / access_token / refresh_token).
-- Các cột *Enc chứa ciphertext AES-256-GCM, không phải giá trị thô.
-- Chỉ một dòng duy nhất, id = 'default'.
CREATE TABLE "koi_free_style"."koi_shopee_credential" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "partnerId" BIGINT NOT NULL,
    "shopId" BIGINT NOT NULL,
    "partnerKeyEnc" TEXT NOT NULL,
    "accessTokenEnc" TEXT,
    "refreshTokenEnc" TEXT,
    "env" TEXT NOT NULL DEFAULT 'live',
    "tokenExpiresAt" TIMESTAMP(3),
    "authorizedAt" TIMESTAMP(3),
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "koi_shopee_credential_pkey" PRIMARY KEY ("id")
);
