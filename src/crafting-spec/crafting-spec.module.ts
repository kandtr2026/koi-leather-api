import { Module } from '@nestjs/common';
import { CraftingSpecService } from './crafting-spec.service';

@Module({
  providers: [CraftingSpecService],
  exports: [CraftingSpecService],
})
export class CraftingSpecModule {}
