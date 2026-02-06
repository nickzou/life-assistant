import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '@auth/guards/jwt-auth.guard';
import { TasksService } from './tasks.service';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('today')
  async getStatsToday() {
    return this.tasksService.getStatsForToday();
  }

  @Get('today/list')
  async getTasksToday() {
    return this.tasksService.getTasksDueToday();
  }
}
