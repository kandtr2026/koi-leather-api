import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';

interface SyncPayload {
  materialId: string;
  externalId: string;
  quantity: number;
  action: 'UPDATE' | 'DEDUCT' | 'RESTOCK';
}

interface WebhookPayload {
  event: 'stock.updated' | 'stock.received' | 'product.updated';
  data: {
    externalId: string;
    quantity: number;
    unitCost?: number;
    name?: string;
    [key: string]: any;
  };
  timestamp: string;
  signature?: string;
}

@Injectable()
export class InventorySyncService {
  private readonly logger = new Logger(InventorySyncService.name);
  private readonly apiBaseUrl: string;
  private readonly apiKey: string;

  constructor(
    private prisma: PrismaService,
    private inventoryService: InventoryService,
  ) {
    this.apiBaseUrl = process.env.KITLEATHER_API_BASE_URL || 'https://kitleather.vn/api';
    this.apiKey = process.env.KITLEATHER_API_KEY || '';
  }

  /**
   * Push inventory update to kitleather.vn
   */
  async pushUpdate(materialId: string): Promise<boolean> {
    const material = await this.prisma.koiRawMaterial.findUnique({
      where: { id: materialId },
    });
    if (!material) {
      this.logger.warn(`Material ${materialId} not found, cannot sync`);
      return false;
    }

    if (!material.externalId) {
      this.logger.warn(`Material ${material.name} has no externalId, skipping sync`);
      await this.markSyncStatus(materialId, 'FAILED');
      return false;
    }

    const payload: SyncPayload = {
      materialId: material.id,
      externalId: material.externalId,
      quantity: Number(material.totalQuantity),
      action: 'UPDATE',
    };

    try {
      // In production, this would be an HTTP call to kitleather.vn API
      // const response = await fetch(`${this.apiBaseUrl}/inventory/sync`, {
      //   method: 'POST',
      //   headers: { 'Authorization': `Bearer ${this.apiKey}`, 'Content-Type': 'application/json' },
      //   body: JSON.stringify(payload),
      // });

      this.logger.log(`[MOCK] Synced ${material.name} to kitleather.vn: ${payload.quantity} ${material.unit}`);
      await this.markSyncStatus(materialId, 'SYNCED');
      return true;
    } catch (error) {
      this.logger.error(`Failed to sync ${material.name} to kitleather.vn`, error.message);
      await this.markSyncStatus(materialId, 'FAILED');
      return false;
    }
  }

  /**
   * Handle incoming webhook from kitleather.vn
   */
  async handleWebhook(payload: WebhookPayload): Promise<{ received: boolean }> {
    this.logger.log(`Received webhook: ${payload.event}`);

    switch (payload.event) {
      case 'stock.updated':
      case 'stock.received':
        await this.handleStockUpdate(payload);
        break;
      case 'product.updated':
        await this.handleProductUpdate(payload);
        break;
      default:
        this.logger.warn(`Unknown webhook event: ${payload.event}`);
    }

    return { received: true };
  }

  private async handleStockUpdate(payload: WebhookPayload) {
    const { externalId, quantity, unitCost } = payload.data;
    if (!externalId) return;

    const material = await this.prisma.koiRawMaterial.findFirst({
      where: { externalId },
    });
    if (!material) {
      this.logger.warn(`Unknown externalId: ${externalId}`);
      return;
    }

    const updateData: any = {
      lastSyncedAt: new Date(),
      syncStatus: 'SYNCED',
    };

    if (quantity !== undefined) {
      const newTotal = Number(material.totalQuantity) + quantity;
      updateData.totalQuantity = Math.max(0, newTotal);
      updateData.availableQuantity = Math.max(0, newTotal - Number(material.reservedQuantity));
    }
    if (unitCost !== undefined) {
      updateData.unitCost = unitCost;
    }

    await this.prisma.koiRawMaterial.update({
      where: { id: material.id },
      data: updateData,
    });

    // Record transaction
    if (quantity !== undefined && quantity > 0) {
      await this.prisma.koiInventoryTransaction.create({
        data: {
          materialId: material.id,
          transactionType: 'RECEIPT',
          quantity,
          costAtTransaction: material.unitCost,
          notes: `Synced from kitleather.vn (${payload.event})`,
        },
      });
    }

    this.logger.log(`Updated stock for ${material.name} from kitleather.vn webhook`);
  }

  private async handleProductUpdate(payload: WebhookPayload) {
    const { externalId, name, unitCost } = payload.data;
    if (!externalId) return;

    const material = await this.prisma.koiRawMaterial.findFirst({
      where: { externalId },
    });
    if (!material) return;

    await this.prisma.koiRawMaterial.update({
      where: { id: material.id },
      data: {
        ...(name ? { name } : {}),
        ...(unitCost ? { unitCost } : {}),
        lastSyncedAt: new Date(),
        syncStatus: 'SYNCED',
      },
    });
  }

  /**
   * Auto-deduct raw materials when a production order is completed
   */
  async onOrderCompleted(orderId: string) {
    this.logger.log(`Order ${orderId} completed — auto-deducting raw materials`);

    const order = await this.prisma.koiProductionOrder.findUnique({
      where: { id: orderId },
    });
    if (!order) return;

    const allocations = order.materialsAllocated as unknown as any[];
    for (const alloc of allocations) {
      if (!alloc.material_id) continue;

      const material = await this.prisma.koiRawMaterial.findUnique({
        where: { id: alloc.material_id },
      });
      if (!material || !material.externalId) continue;

      const deductPayload: SyncPayload = {
        materialId: alloc.material_id,
        externalId: material.externalId,
        quantity: -alloc.qty_consumed,
        action: 'DEDUCT',
      };

      try {
        // In production: POST to kitleather.vn
        this.logger.log(`[MOCK] Deducted ${alloc.qty_consumed} ${alloc.unit} of ${material.name} from kitleather.vn`);
      } catch (error) {
        this.logger.error(`Failed to sync deduction to kitleather.vn`, error.message);
      }
    }
  }

  private async markSyncStatus(materialId: string, status: string) {
    await this.prisma.koiRawMaterial.update({
      where: { id: materialId },
      data: {
        syncStatus: status,
        lastSyncedAt: status === 'SYNCED' ? new Date() : undefined,
      },
    });
  }

  /**
   * Deduct hardware (brass tag) inventory when a variant with hardwareOption='brass_tag' is ordered.
   * Looks up a KoiRawMaterial with materialType='HARDWARE' matching the hardware SKU keyword.
   */
  async deductHardwareForVariant(variantId: string, quantity = 1) {
    const variant = await this.prisma.koiProductVariant.findUnique({
      where: { id: variantId },
    });
    if (!variant || variant.hardwareOption !== 'brass_tag') return false;

    const hardwareMaterial = await this.prisma.koiRawMaterial.findFirst({
      where: {
        materialType: 'HARDWARE',
        name: { contains: 'Tag' },
      },
    });
    if (!hardwareMaterial) {
      this.logger.warn(`No HARDWARE material found for brass_tag deduction (variant ${variantId})`);
      return false;
    }

    const newTotal = Math.max(0, Number(hardwareMaterial.totalQuantity) - quantity);
    const newAvailable = Math.max(0, Number(hardwareMaterial.availableQuantity) - quantity);

    await this.prisma.koiRawMaterial.update({
      where: { id: hardwareMaterial.id },
      data: {
        totalQuantity: newTotal,
        availableQuantity: newAvailable,
        lastSyncedAt: new Date(),
        syncStatus: 'PENDING',
      },
    });

    await this.prisma.koiInventoryTransaction.create({
      data: {
        materialId: hardwareMaterial.id,
        orderId: `variant-${variantId}`,
        transactionType: 'CONSUMPTION',
        quantity: -quantity,
        costAtTransaction: hardwareMaterial.unitCost,
        notes: `Auto-deduct brass_tag for variant ${variant.sku}`,
      },
    });

    this.logger.log(`Deducted ${quantity}x ${hardwareMaterial.name} for variant ${variant.sku}`);

    if (hardwareMaterial.externalId) {
      await this.pushUpdate(hardwareMaterial.id);
    }
    return true;
  }

  /**
   * Sync all pending materials
   */
  async syncPending() {
    const pending = await this.prisma.koiRawMaterial.findMany({
      where: { syncStatus: 'PENDING', externalId: { not: null } },
    });

    const results = await Promise.allSettled(
      pending.map(m => this.pushUpdate(m.id)),
    );

    const succeeded = results.filter(r => r.status === 'fulfilled' && r.value).length;
    const failed = results.filter(r => r.status === 'rejected' || !r.value).length;

    return { total: pending.length, succeeded, failed };
  }
}
