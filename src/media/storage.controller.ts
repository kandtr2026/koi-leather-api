import { Controller, Get, Header } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";

// Lazy Cloudinary — only loads when env has real keys (mirrors media.controller).
function getCloudinary() {
  const name = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!name || name === "your_cloud_name" || !key || !secret) return null;
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const cloudinary = require("cloudinary").v2;
  cloudinary.config({ cloud_name: name, api_key: key, api_secret: secret });
  return { cloudinary, cloudName: name };
}

function pct(used: number, limit: number): number {
  if (!limit || limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 1000) / 10);
}

@ApiTags("Storage")
@Controller("storage")
export class StorageController {
  @Get("usage")
  @Header("Cache-Control", "public, max-age=300")
  @ApiOperation({
    summary: "Cloudinary account usage (storage, credits, bandwidth)",
  })
  async usage() {
    const cfg = getCloudinary();
    if (!cfg) {
      return {
        configured: false,
        reason: "Cloudinary chưa cấu hình (thiếu CLOUDINARY_* env)",
      };
    }

    try {
      const u = await cfg.cloudinary.api.usage();

      // Free plan is metered in "credits" (1 credit ≈ 1GB storage OR 1GB bandwidth
      // OR 1000 transformations). Paid plans expose direct byte limits instead.
      const creditsUsed = u?.credits?.usage ?? null;
      const creditsLimit = u?.credits?.limit ?? null;
      const storageBytes = u?.storage?.usage ?? 0;
      const bandwidthBytes = u?.bandwidth?.usage ?? 0;
      const storageLimitBytes = u?.storage?.limit ?? null; // present on paid plans

      return {
        configured: true,
        cloudName: cfg.cloudName,
        plan: u?.plan ?? "Unknown",
        lastUpdated: u?.last_updated ?? null,
        storage: {
          usedBytes: storageBytes,
          limitBytes: storageLimitBytes,
          usedPct: storageLimitBytes
            ? pct(storageBytes, storageLimitBytes)
            : null,
        },
        bandwidth: { usedBytes: bandwidthBytes },
        credits:
          creditsLimit != null
            ? {
                used: creditsUsed,
                limit: creditsLimit,
                usedPct: pct(creditsUsed, creditsLimit),
              }
            : null,
        objects: u?.objects?.usage ?? null,
        transformations: u?.transformations?.usage ?? null,
      };
    } catch (e: any) {
      return {
        configured: true,
        error: e?.message || "Không lấy được usage từ Cloudinary",
      };
    }
  }
}
