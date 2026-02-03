import { Module } from '@nestjs/common';
import { ClickUpService } from './clickup.service';
import { ClickUpStatsService } from './clickup-stats.service';
import { ClickUpController } from './clickup.controller';

@Module({
  controllers: [ClickUpController],
  providers: [ClickUpService, ClickUpStatsService],
  exports: [ClickUpService, ClickUpStatsService],
})
export class ClickUpModule {}
