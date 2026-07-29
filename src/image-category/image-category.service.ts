import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateImageCategoryDto } from "./dto/create-image-category.dto";
import { UpdateImageCategoryDto } from "./dto/update-image-category.dto";

@Injectable()
export class ImageCategoryService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.koiImageCategory.findMany({
      orderBy: { sortOrder: "asc" },
    });
  }

  async findById(id: string) {
    const category = await this.prisma.koiImageCategory.findUnique({
      where: { id },
    });
    if (!category) throw new NotFoundException("Image category not found");
    return category;
  }

  async findByCode(code: string) {
    const category = await this.prisma.koiImageCategory.findUnique({
      where: { code },
    });
    if (!category) throw new NotFoundException("Image category not found");
    return category;
  }

  private nameToCode(name: string): string {
    return name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "_");
  }

  async create(dto: CreateImageCategoryDto) {
    const code = dto.code || this.nameToCode(dto.name);
    const existing = await this.prisma.koiImageCategory.findUnique({
      where: { code },
    });
    if (existing)
      throw new ConflictException(
        `Image category with code "${code}" already exists`,
      );

    return this.prisma.koiImageCategory.create({
      data: { code, name: dto.name },
    });
  }

  async update(id: string, dto: UpdateImageCategoryDto) {
    const category = await this.prisma.koiImageCategory.findUnique({
      where: { id },
    });
    if (!category) throw new NotFoundException("Image category not found");

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;

    return this.prisma.koiImageCategory.update({ where: { id }, data });
  }

  async remove(id: string) {
    const category = await this.prisma.koiImageCategory.findUnique({
      where: { id },
    });
    if (!category) throw new NotFoundException("Image category not found");

    return this.prisma.koiImageCategory.delete({ where: { id } });
  }
}
