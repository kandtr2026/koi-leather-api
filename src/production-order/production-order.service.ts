import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateProductionOrderDto } from "./dto/create-production-order.dto";

interface SnapshotItem {
  material_id: string | null;
  material_name: string;
  qty_per_unit: number;
  qty_consumed: number;
  unit: string;
  cost_at_snapshot: number;
}

@Injectable()
export class ProductionOrderService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateProductionOrderDto) {
    const variant = await this.prisma.koiProductVariant.findUnique({
      where: { id: dto.variantId },
      include: { product: true, craftingSpec: true },
    });
    if (!variant) throw new NotFoundException("Product variant not found");
    if (dto.quantity < 1)
      throw new BadRequestException("Quantity must be >= 1");

    const count = await this.prisma.koiProductionOrder.count();
    const orderId = `PO-${String(count + 1).padStart(3, "0")}`;

    const materialsAllocated = await this.buildMaterialSnapshot(
      dto.variantId,
      dto.materials,
      dto.quantity,
    );

    const totalCost = materialsAllocated.reduce(
      (sum, m) => sum + m.cost_at_snapshot * m.qty_consumed,
      0,
    );

    return this.prisma.koiProductionOrder.create({
      data: {
        id: orderId,
        variantId: dto.variantId,
        quantity: dto.quantity,
        status: "PENDING",
        craftsman: dto.craftsman,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        materialsAllocated: materialsAllocated as any,
        totalCostSnapshot: totalCost,
        notes: dto.notes,
      },
      include: {
        variant: { include: { product: true } },
      },
    });
  }

  private async buildMaterialSnapshot(
    variantId: string,
    manualMaterials: any[] | undefined,
    quantity: number,
  ): Promise<SnapshotItem[]> {
    const snapshots: SnapshotItem[] = [];

    if (manualMaterials && manualMaterials.length > 0) {
      for (const mat of manualMaterials) {
        const material = await this.prisma.koiRawMaterial.findUnique({
          where: { id: mat.materialId },
        });
        const currentPrice = material ? Number(material.unitCost) : 0;
        snapshots.push({
          material_id: mat.materialId,
          material_name: mat.materialName,
          qty_per_unit: mat.qtyPerUnit,
          qty_consumed: mat.qtyPerUnit * quantity,
          unit: mat.unit,
          cost_at_snapshot: currentPrice,
        });
      }
      return snapshots;
    }

    const craftingSpec = await this.prisma.koiCraftingSpec.findFirst({
      where: { variants: { some: { id: variantId } } },
    });

    if (!craftingSpec) {
      throw new BadRequestException(
        "No CraftingSpec found for this variant. Please provide manual materials.",
      );
    }

    const specs = craftingSpec as any;

    if (specs.outerLeather?.sqft) {
      const material = await this.findMaterialByType(
        "OUTER_LEATHER",
        specs.outerLeather,
      );
      const price = material ? Number(material.unitCost) : 0;
      snapshots.push({
        material_id: material?.id || null,
        material_name: specs.outerLeather.material_name || "Outer Leather",
        qty_per_unit:
          Number(specs.outerLeather.sqft) *
          (1 + (specs.outerLeather.wastage_rate || 0)),
        qty_consumed:
          Number(specs.outerLeather.sqft) *
          quantity *
          (1 + (specs.outerLeather.wastage_rate || 0)),
        unit: "sqft",
        cost_at_snapshot: price,
      });
    }

    if (specs.liningLeather?.sqft) {
      const material = await this.findMaterialByType(
        "LINING_LEATHER",
        specs.liningLeather,
      );
      const price = material ? Number(material.unitCost) : 0;
      snapshots.push({
        material_id: material?.id || null,
        material_name: specs.liningLeather.material_name || "Lining Leather",
        qty_per_unit: Number(specs.liningLeather.sqft),
        qty_consumed: Number(specs.liningLeather.sqft) * quantity,
        unit: "sqft",
        cost_at_snapshot: price,
      });
    }

    if (specs.interlining?.sqft) {
      const material = await this.findMaterialByType(
        "INTERLINING",
        specs.interlining,
      );
      const price = material ? Number(material.unitCost) : 0;
      snapshots.push({
        material_id: material?.id || null,
        material_name: specs.interlining.material_name || "Interlining",
        qty_per_unit: Number(specs.interlining.sqft),
        qty_consumed: Number(specs.interlining.sqft) * quantity,
        unit: "sqft",
        cost_at_snapshot: price,
      });
    }

    return snapshots;
  }

  private async findMaterialByType(type: string, spec: any) {
    if (spec.material_id) {
      return this.prisma.koiRawMaterial.findUnique({
        where: { id: spec.material_id },
      });
    }
    if (spec.material_name) {
      return this.prisma.koiRawMaterial.findFirst({
        where: { name: { contains: spec.material_name } },
      });
    }
    return this.prisma.koiRawMaterial.findFirst({
      where: { materialType: type as any },
    });
  }

  async findAll(status?: string, page = 1, limit = 50) {
    const where: any = {};
    if (status) where.status = status;

    const [data, total] = await Promise.all([
      this.prisma.koiProductionOrder.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        // Tiebreaker so paging is stable: orders created in the same batch share
        // a createdAt, and equal sort keys have no guaranteed order, which lets
        // a row show up on two pages while another is skipped.
        orderBy: [{ createdAt: "desc" }, { id: "asc" }],
        select: {
          id: true,
          quantity: true,
          status: true,
          craftsman: true,
          dueDate: true,
          totalCostSnapshot: true,
          notes: true,
          createdAt: true,
          variantId: true,
          variant: {
            select: {
              id: true,
              sku: true,
              product: { select: { id: true, name: true, sku: true } },
            },
          },
        },
      }),
      this.prisma.koiProductionOrder.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string) {
    const order = await this.prisma.koiProductionOrder.findUnique({
      where: { id },
      include: {
        variant: {
          include: {
            product: { include: { images: { where: { isPrimary: true } } } },
            craftingSpec: true,
          },
        },
      },
    });
    if (!order) throw new NotFoundException("Production order not found");
    return order;
  }

  async updateStatus(id: string, status: string) {
    await this.findById(id);
    return this.prisma.koiProductionOrder.update({
      where: { id },
      data: { status: status as any },
    });
  }

  async getStats() {
    const [total, snapped, costAgg] = await Promise.all([
      this.prisma.koiProductionOrder.count(),
      this.prisma.koiProductionOrder.count({
        where: { status: { not: "PENDING" } },
      }),
      this.prisma.koiProductionOrder.aggregate({
        _sum: { totalCostSnapshot: true },
        where: { totalCostSnapshot: { not: null } },
      }),
    ]);
    return {
      totalOrders: total,
      snappedOrders: snapped,
      totalProductionCost: costAgg._sum.totalCostSnapshot || 0,
    };
  }
}
