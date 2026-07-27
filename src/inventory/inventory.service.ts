import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async getTransactions(materialId?: string, limit = 50) {
    const where: any = {};
    if (materialId) where.materialId = materialId;

    return this.prisma.koiInventoryTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { material: { select: { id: true, name: true, unit: true } } },
    });
  }

  async reserveMaterials(orderId: string) {
    const order = await this.prisma.koiProductionOrder.findUnique({
      where: { id: orderId },
      include: { variant: true },
    });
    if (!order) throw new NotFoundException('Order not found');

    const allocations = order.materialsAllocated as unknown as any[];
    if (!allocations || allocations.length === 0) {
      throw new BadRequestException('No materials allocated in this order');
    }

    return this.prisma.$transaction(async (tx) => {
      const results: any[] = [];
      for (const alloc of allocations) {
        if (!alloc.material_id) continue;

        const material = await tx.koiRawMaterial.findUnique({
          where: { id: alloc.material_id },
        });
        if (!material) continue;

        const qtyToReserve = alloc.qty_consumed;
        const available = Number(material.availableQuantity);
        if (available < qtyToReserve) {
          throw new BadRequestException(
            `Insufficient stock for ${material.name}: available ${available}, need ${qtyToReserve}`,
          );
        }

        await tx.koiRawMaterial.update({
          where: { id: alloc.material_id },
          data: {
            reservedQuantity: Number(material.reservedQuantity) + qtyToReserve,
            availableQuantity: available - qtyToReserve,
          },
        });

        const txn = await tx.koiInventoryTransaction.create({
          data: {
            materialId: alloc.material_id,
            orderId,
            transactionType: 'RESERVATION',
            quantity: -qtyToReserve,
            costAtTransaction: alloc.cost_at_snapshot,
          },
        });
        results.push(txn);
      }
      return results;
    });
  }

  async releaseMaterials(orderId: string) {
    const order = await this.prisma.koiProductionOrder.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Order not found');

    const allocations = order.materialsAllocated as unknown as any[];
    if (!allocations || allocations.length === 0) return [];

    return this.prisma.$transaction(async (tx) => {
      const results: any[] = [];
      for (const alloc of allocations) {
        if (!alloc.material_id) continue;

        const material = await tx.koiRawMaterial.findUnique({
          where: { id: alloc.material_id },
        });
        if (!material) continue;

        const qtyToRelease = alloc.qty_consumed;

        await tx.koiRawMaterial.update({
          where: { id: alloc.material_id },
          data: {
            reservedQuantity: Math.max(0, Number(material.reservedQuantity) - qtyToRelease),
            availableQuantity: Number(material.availableQuantity) + qtyToRelease,
          },
        });

        const txn = await tx.koiInventoryTransaction.create({
          data: {
            materialId: alloc.material_id,
            orderId,
            transactionType: 'RELEASE',
            quantity: qtyToRelease,
          },
        });
        results.push(txn);
      }
      return results;
    });
  }

  async consumeMaterials(orderId: string) {
    const order = await this.prisma.koiProductionOrder.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Order not found');

    const allocations = order.materialsAllocated as unknown as any[];
    if (!allocations || allocations.length === 0) return [];

    return this.prisma.$transaction(async (tx) => {
      const results: any[] = [];
      for (const alloc of allocations) {
        if (!alloc.material_id) continue;

        const material = await tx.koiRawMaterial.findUnique({
          where: { id: alloc.material_id },
        });
        if (!material) continue;

        const qtyToConsume = alloc.qty_consumed;

        await tx.koiRawMaterial.update({
          where: { id: alloc.material_id },
          data: {
            totalQuantity: Math.max(0, Number(material.totalQuantity) - qtyToConsume),
            reservedQuantity: Math.max(0, Number(material.reservedQuantity) - qtyToConsume),
          },
        });

        const txn = await tx.koiInventoryTransaction.create({
          data: {
            materialId: alloc.material_id,
            orderId,
            transactionType: 'CONSUMPTION',
            quantity: -qtyToConsume,
            costAtTransaction: alloc.cost_at_snapshot,
          },
        });
        results.push(txn);
      }
      return results;
    });
  }

  async getInventorySummary() {
    const materials = await this.prisma.koiRawMaterial.findMany();
    const totalValue = materials.reduce((sum, m) => sum + Number(m.unitCost) * Number(m.totalQuantity), 0);
    const lowStock = materials.filter(m => Number(m.totalQuantity) < 10);
    const syncedCount = materials.filter(m => m.syncStatus === 'SYNCED').length;

    return {
      totalMaterials: materials.length,
      totalInventoryValue: totalValue,
      lowStockCount: lowStock.length,
      lowStockItems: lowStock.map(m => ({ id: m.id, name: m.name, stock: Number(m.totalQuantity), unit: m.unit })),
      syncedCount,
      pendingSync: materials.length - syncedCount,
    };
  }
}
