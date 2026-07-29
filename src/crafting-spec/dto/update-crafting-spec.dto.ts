import { PartialType } from "@nestjs/swagger";
import { CreateCraftingSpecDto } from "./create-crafting-spec.dto";

export class UpdateCraftingSpecDto extends PartialType(CreateCraftingSpecDto) {}
