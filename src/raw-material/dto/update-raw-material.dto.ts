import { PartialType, OmitType } from "@nestjs/swagger";
import { CreateRawMaterialDto } from "./create-raw-material.dto";

export class UpdateRawMaterialDto extends PartialType(
  OmitType(CreateRawMaterialDto, ["externalId"] as const),
) {}
