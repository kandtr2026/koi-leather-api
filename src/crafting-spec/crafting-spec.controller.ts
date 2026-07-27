import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CraftingSpecService } from './crafting-spec.service';

@ApiTags('Crafting Specs')
@Controller('crafting-specs')
export class CraftingSpecController {
  constructor(private readonly specService: CraftingSpecService) {}

  @Get()
  @ApiOperation({ summary: 'List all crafting specs with product info (no N+1)' })
  findAll() {
    return this.specService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get crafting spec by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.specService.findById(id);
  }
}
