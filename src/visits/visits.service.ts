import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class VisitsService {
  constructor(private prisma: PrismaService) {}

  async incrementVisitCount(): Promise<number> {
    // Find the single visit record or create it if it doesn't exist
    const visitRecord = await this.prisma.visit.upsert({
      where: { id: 1 }, // Assuming a single record with ID 1
      update: { count: { increment: 1 } },
      create: { id: 1, count: 1 },
    });
    return Number(visitRecord.count);
  }

  async getVisitCount(): Promise<number> {
    const visitRecord = await this.prisma.visit.findUnique({
      where: { id: 1 },
    });
    return Number(visitRecord?.count || 0);
  }
}
