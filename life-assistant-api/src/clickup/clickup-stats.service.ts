import { Injectable, Logger } from '@nestjs/common';
import { ClickUpService } from './clickup.service';
import { getNowInTimezone, formatDateString } from '../utils/date';
import {
  filterExcludedStatuses,
  countAffirmativeCompletions,
  calculateCompletionRate,
  isTaskCompleted,
} from '../utils/completion-stats';

export interface DayStats {
  date: string;
  total: number;
  affirmativeCompletions: number;
  completionRate: number;
}

export interface TodayStats {
  total: number;
  completed: number;
  remaining: number;
  overdue: number;
  affirmativeCompletions: number;
  completionRate: number;
}

@Injectable()
export class ClickUpStatsService {
  private readonly logger = new Logger(ClickUpStatsService.name);

  constructor(private readonly clickUpService: ClickUpService) {}

  /**
   * Get completion stats for a specific date
   */
  async getCompletionStatsForDate(
    workspaceId: string,
    date: Date,
  ): Promise<DayStats> {
    const startOfDay = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      0,
      0,
      0,
      0,
    );
    const endOfDay = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      23,
      59,
      59,
      999,
    );

    const tasks = await this.clickUpService.getTasksByDateRange(
      workspaceId,
      startOfDay.getTime(),
      endOfDay.getTime(),
      { includeClosed: true },
    );

    const filteredTasks = filterExcludedStatuses(tasks);
    const affirmativeCompletions = countAffirmativeCompletions(filteredTasks);
    const completionRate = calculateCompletionRate(
      affirmativeCompletions,
      filteredTasks.length,
    );

    return {
      date: formatDateString(startOfDay),
      total: filteredTasks.length,
      affirmativeCompletions,
      completionRate,
    };
  }

  /**
   * Get completion stats for the last N days
   */
  async getCompletionStatsHistory(
    workspaceId: string,
    days: number,
  ): Promise<DayStats[]> {
    this.logger.log(`Fetching completion stats for last ${days} days`);
    const today = getNowInTimezone();

    const datePromises = Array.from({ length: days }, (_, i) => {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      return this.getCompletionStatsForDate(workspaceId, date);
    });

    return Promise.all(datePromises);
  }

  /**
   * Get tasks due today summary for the workspace
   */
  async getTasksDueToday(workspaceId: string): Promise<TodayStats> {
    this.logger.log(`Fetching tasks due today for workspace: ${workspaceId}`);

    const now = getNowInTimezone();
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      0,
      0,
      0,
      0,
    );
    const endOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      23,
      59,
      59,
      999,
    );

    // Fetch tasks due today and overdue tasks in parallel
    const [todayTasks, overdueTasks] = await Promise.all([
      this.clickUpService.getTasksByDateRange(
        workspaceId,
        startOfDay.getTime(),
        endOfDay.getTime(),
      ),
      this.clickUpService.getOverdueTasks(workspaceId, startOfDay.getTime()),
    ]);

    const filteredTodayTasks = filterExcludedStatuses(todayTasks);

    const completed = filteredTodayTasks.filter((task: any) =>
      isTaskCompleted(task),
    ).length;

    const affirmativeCompletions =
      countAffirmativeCompletions(filteredTodayTasks);
    const completionRate = calculateCompletionRate(
      affirmativeCompletions,
      filteredTodayTasks.length,
    );

    return {
      total: filteredTodayTasks.length,
      completed,
      remaining: filteredTodayTasks.length - completed,
      overdue: overdueTasks.length,
      affirmativeCompletions,
      completionRate,
    };
  }
}
