import { Module } from '@nestjs/common';
import { WrikeService } from './wrike.service';
import { WrikeStatusService } from './wrike-status.service';
import { WrikeController } from './wrike.controller';

@Module({
  controllers: [WrikeController],
  providers: [WrikeService, WrikeStatusService],
  exports: [WrikeService, WrikeStatusService],
})
export class WrikeModule {}
