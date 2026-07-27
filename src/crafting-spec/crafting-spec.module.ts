import { Module } from '@nestjs/common';
import { CraftingSpecService } from './crafting-spec.service';
import { CraftingSpecController } from './crafting-spec.controller';

@Module({
  controllers: [CraftingSpecController],
  providers: [CraftingSpecService],
  exports: [CraftingSpecService],
})
export class KoiCraftingSpecModule {}
