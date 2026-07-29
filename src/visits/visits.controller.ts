import { Controller, Get, Res } from "@nestjs/common";
import { VisitsService } from "./visits.service";
import { Response } from "express";

@Controller("visits")
export class VisitsController {
  constructor(private readonly visitsService: VisitsService) {}

  @Get("kitleather.vn")
  async trackVisit(@Res() res: Response): Promise<void> {
    const newCount = await this.visitsService.incrementVisitCount();
    res.status(200).json({ count: newCount });
  }

  @Get("kitleather.vn/count")
  async getCount(): Promise<{ count: number }> {
    const count = await this.visitsService.getVisitCount();
    return { count };
  }
}
