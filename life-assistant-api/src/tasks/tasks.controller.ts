import { Controller, Get, Put, Param, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { TasksService } from './tasks.service';
import { TaskAnnotationService } from './task-annotation.service';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly taskAnnotationService: TaskAnnotationService,
  ) {}

  @Get('today')
  async getStatsToday() {
    return this.tasksService.getStatsForToday();
  }

  @Get('today/list')
  async getTasksToday() {
    return this.tasksService.getTasksDueToday();
  }

  @Put(':source/:taskId/time-of-day')
  async setTimeOfDay(
    @Param('source') source: string,
    @Param('taskId') taskId: string,
    @Body() body: { timeOfDay: string | null },
  ) {
    await this.taskAnnotationService.setTimeOfDay(
      taskId,
      source,
      body.timeOfDay,
    );
    return { success: true };
  }
}
