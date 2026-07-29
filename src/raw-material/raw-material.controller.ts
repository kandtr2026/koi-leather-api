import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery } from "@nestjs/swagger";
import { RawMaterialService } from "./raw-material.service";
import { CreateRawMaterialDto } from "./dto/create-raw-material.dto";
import { UpdateRawMaterialDto } from "./dto/update-raw-material.dto";

@ApiTags("Raw Materials")
@Controller("raw-materials")
export class RawMaterialController {
  constructor(private readonly materialService: RawMaterialService) {}

  @Post()
  @ApiOperation({ summary: "Create a new raw material" })
  create(@Body() dto: CreateRawMaterialDto) {
    return this.materialService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: "List all raw materials (filterable by type/supplier)",
  })
  @ApiQuery({
    name: "type",
    required: false,
    enum: [
      "OUTER_LEATHER",
      "LINING_LEATHER",
      "INTERLINING",
      "THREAD",
      "BUCKLE",
      "HARDWARE",
    ],
  })
  @ApiQuery({ name: "supplier", required: false })
  findAll(@Query("type") type?: string, @Query("supplier") supplier?: string) {
    return this.materialService.findAll(type, supplier);
  }

  @Get(":id")
  @ApiOperation({
    summary: "Get raw material details with recent transactions",
  })
  findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.materialService.findById(id);
  }

  @Patch(":id")
  @ApiOperation({
    summary: "Update raw material (can change price — affects NEW orders only)",
  })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateRawMaterialDto,
  ) {
    return this.materialService.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete a raw material" })
  remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.materialService.remove(id);
  }
}
