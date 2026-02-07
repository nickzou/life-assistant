import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClickUpModule } from '@clickup/clickup.module';
import { WrikeModule } from '@wrike/wrike.module';
import { TaskAnnotation } from '../database/entities/task-annotation.entity';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TaskAnnotationService } from './task-annotation.service';
import { ClickUpTaskSourceService } from './sources/clickup-task-source.service';
import { WrikeTaskSourceService } from './sources/wrike-task-source.service';
import { TASK_SOURCE } from './interfaces/task-source.interface';

@Module({
  imports: [
    ClickUpModule,
    WrikeModule,
    TypeOrmModule.forFeature([TaskAnnotation]),
  ],
  controllers: [TasksController],
  providers: [
    TasksService,
    TaskAnnotationService,
    ClickUpTaskSourceService,
    WrikeTaskSourceService,
    {
      provide: TASK_SOURCE,
      useFactory: (
        clickup: ClickUpTaskSourceService,
        wrike: WrikeTaskSourceService,
      ) => [clickup, wrike],
      inject: [ClickUpTaskSourceService, WrikeTaskSourceService],
    },
  ],
})
export class TasksModule {}
