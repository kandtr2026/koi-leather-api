import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { InventorySyncService } from './inventory-sync.service';

@ApiTags('Inventory Sync (kitleather.vn)')
@Controller('sync')
export class InventorySyncController {
  private readonly logger = new Logger(InventorySyncController.name);

  constructor(private readonly syncService: InventorySyncService) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Receive inventory webhook from kitleather.vn' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        event: { type: 'string', example: 'stock.updated' },
        data: {
          type: 'object',
          properties: {
            externalId: { type: 'string' },
            quantity: { type: 'number' },
            unitCost: { type: 'number' },
          },
        },
        timestamp: { type: 'string' },
        signature: { type: 'string' },
      },
    },
  })
  handleWebhook(@Body() body: any) {
    // In production: validate signature
    // const expectedSig = crypto.createHmac('sha256', process.env.KITLEATHER_WEBHOOK_SECRET)
    //   .update(JSON.stringify(body.data))
    //   .digest('hex');
    // if (body.signature !== expectedSig) throw new UnauthorizedException('Invalid signature');

    return this.syncService.handleWebhook(body);
  }

  @Post('push-all')
  @ApiOperation({ summary: 'Push all pending inventory changes to kitleather.vn' })
  syncPending() {
    return this.syncService.syncPending();
  }
}
