import { Injectable, Logger } from '@nestjs/common';
import { ClickUpService } from './clickup.service';
import { getNowInTimezone } from '@utils/date';
import { sortByTimeOfDay } from '@utils/task-sorting';
import { TaskItem, ClickUpTask, mapTaskToItem } from '@utils/task-mappers';

// Re-export TaskItem for consumers
export { TaskItem } from '@utils/task-mappers';

export interface TodayTasksResponse {
  tasks: TaskItem[];
  overdueTasks: TaskItem[];
}

@Injectable()
export class ClickUpTasksService {
  private readonly logger = new Logger(ClickUpTasksService.name);

  constructor(private readonly clickUpService: ClickUpService) {}

  /**
   * Get all tasks due today with full details
   */
  async getTasksDueToday(workspaceId: string): Promise<TodayTasksResponse> {
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
        { includeClosed: true },
      ),
      this.clickUpService.getOverdueTasks(workspaceId, startOfDay.getTime()),
    ]);

    // Collect all parent IDs
    const allTasks = [...todayTasks, ...overdueTasks];
    const parentIds = [
      ...new Set(
        allTasks
          .filter((task) => task.parent != null)
          .map((task) => task.parent),
      ),
    ];

    // Fetch parent task names
    const parentNames = await this.fetchParentNames(parentIds);

    const mappedTasks = todayTasks.map((task: ClickUpTask) =>
      mapTaskToItem(task, parentNames),
    );
    const mappedOverdue = overdueTasks.map((task: ClickUpTask) =>
      mapTaskToItem(task, parentNames),
    );

    return {
      tasks: sortByTimeOfDay(mappedTasks),
      overdueTasks: sortByTimeOfDay(mappedOverdue),
    };
  }

  /**
   * Fetch parent task names for given parent IDs
   */
  private async fetchParentNames(
    parentIds: string[],
  ): Promise<Map<string, string>> {
    const parentNames = new Map<string, string>();

    if (parentIds.length === 0) {
      return parentNames;
    }

    // Fetch parent tasks in parallel
    const parentTasks = await Promise.all(
      parentIds.map(async (id) => {
        try {
          const task = await this.clickUpService.getTask(id);
          return { id, name: task.name };
        } catch (error) {
          this.logger.warn(
            `Failed to fetch parent task ${id}: ${error.message}`,
          );
          return { id, name: null };
        }
      }),
    );

    for (const { id, name } of parentTasks) {
      if (name) {
        parentNames.set(id, name);
      }
    }

    return parentNames;
  }
}
