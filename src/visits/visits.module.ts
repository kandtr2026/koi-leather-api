import { Module } from '@nestjs/common';
import { VisitsService } from './visits.service';
import { VisitsController } from './visits.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [VisitsService],
  controllers: [VisitsController],
  exports: [VisitsService], // Export if other modules need to use it
})
export class VisitsModule {}
