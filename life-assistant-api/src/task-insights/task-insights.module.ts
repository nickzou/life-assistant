import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DueDateChange } from '../database/entities/due-date-change.entity';
import { TaskInsightsService } from './task-insights.service';
import { TaskInsightsController } from './task-insights.controller';
import { ClickUpModule } from '../clickup/clickup.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([DueDateChange]),
    forwardRef(() => ClickUpModule),
  ],
  controllers: [TaskInsightsController],
  providers: [TaskInsightsService],
  exports: [TaskInsightsService],
})
export class TaskInsightsModule {}
