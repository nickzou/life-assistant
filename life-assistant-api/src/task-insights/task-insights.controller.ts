import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TaskInsightsService } from './task-insights.service';

@Controller('task-insights')
@UseGuards(JwtAuthGuard)
export class TaskInsightsController {
  constructor(private readonly taskInsightsService: TaskInsightsService) {}

  /**
   * Get the reschedule leaderboard
   * Returns tasks that have been rescheduled 3+ times, sorted by frequency
   */
  @Get('reschedule-leaderboard')
  async getRescheduleLeaderboard(
    @Query('min') min?: string,
    @Query('limit') limit?: string,
  ) {
    const minReschedules = min ? parseInt(min, 10) : 3;
    const resultLimit = limit ? parseInt(limit, 10) : 20;

    const leaderboard = await this.taskInsightsService.getRescheduleLeaderboard(
      minReschedules,
      resultLimit,
    );

    const totalChanges = await this.taskInsightsService.getTotalChangesCount();

    return {
      leaderboard,
      meta: {
        total_tasks: leaderboard.length,
        total_tracked_changes: totalChanges,
        min_reschedules: minReschedules,
      },
    };
  }
}
