import { Module } from '@nestjs/common';
import { ClickUpService } from './clickup.service';
import { ClickUpStatsService } from './clickup-stats.service';
import { ClickUpTasksService } from './clickup-tasks.service';
import { ClickUpController } from './clickup.controller';

@Module({
  controllers: [ClickUpController],
  providers: [ClickUpService, ClickUpStatsService, ClickUpTasksService],
  exports: [ClickUpService, ClickUpStatsService, ClickUpTasksService],
})
export class ClickUpModule {}
