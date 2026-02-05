import { Injectable, Logger } from '@nestjs/common';
import { ClickUpService } from './clickup.service';
import { getNowInTimezone } from '../utils/date.utils';

export interface TaskItem {
  id: string;
  name: string;
  parentName: string | null;
  listId: string;
  status: {
    status: string;
    type: string;
    color: string;
  };
  dueDate: string | null;
  hasDueTime: boolean;
  tags: string[];
  timeOfDay: {
    name: string;
    color: string;
  } | null;
  url: string;
}

export interface TodayTasksResponse {
  tasks: TaskItem[];
  overdueTasks: TaskItem[];
}

@Injectable()
export class ClickUpTasksService {
  private readonly logger = new Logger(ClickUpTasksService.name);

  // Custom field name for Time of Day
  private readonly TIME_OF_DAY_FIELD_NAME = 'time of day';

  // Sort order for Time of Day values
  private readonly TIME_OF_DAY_ORDER: Record<string, number> = {
    'early morning': 1,
    morning: 2,
    'mid day': 3,
    evening: 4,
    'before bed': 5,
  };

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

    const mappedTasks = todayTasks.map((task) =>
      this.mapTaskToItem(task, parentNames),
    );
    const mappedOverdue = overdueTasks.map((task) =>
      this.mapTaskToItem(task, parentNames),
    );

    return {
      tasks: this.sortByTimeOfDay(mappedTasks),
      overdueTasks: this.sortByTimeOfDay(mappedOverdue),
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

  /**
   * Sort tasks by Time of Day field
   */
  private sortByTimeOfDay(tasks: TaskItem[]): TaskItem[] {
    return tasks.sort((a, b) => {
      const aOrder = a.timeOfDay
        ? this.TIME_OF_DAY_ORDER[a.timeOfDay.name.toLowerCase()] || 99
        : 99;
      const bOrder = b.timeOfDay
        ? this.TIME_OF_DAY_ORDER[b.timeOfDay.name.toLowerCase()] || 99
        : 99;
      return aOrder - bOrder;
    });
  }

  /**
   * Map a ClickUp task to our TaskItem format
   */
  private mapTaskToItem(
    task: any,
    parentNames: Map<string, string> = new Map(),
  ): TaskItem {
    // Find Time of Day custom field
    const timeOfDayField = task.custom_fields?.find(
      (field: any) => field.name?.toLowerCase() === this.TIME_OF_DAY_FIELD_NAME,
    );

    // Get the selected option name and color for dropdown fields
    let timeOfDay: { name: string; color: string } | null = null;
    if (
      timeOfDayField?.value !== undefined &&
      timeOfDayField.type_config?.options
    ) {
      const selectedOption = timeOfDayField.type_config.options.find(
        (opt: any) => opt.orderindex === timeOfDayField.value,
      );
      if (selectedOption) {
        timeOfDay = {
          name: selectedOption.name,
          color: selectedOption.color,
        };
      }
    }

    return {
      id: task.id,
      name: task.name,
      parentName: task.parent ? parentNames.get(task.parent) || null : null,
      listId: task.list?.id || '',
      status: {
        status: task.status?.status || 'unknown',
        type: task.status?.type || 'unknown',
        color: task.status?.color || '#gray',
      },
      dueDate: task.due_date
        ? new Date(parseInt(task.due_date, 10)).toISOString()
        : null,
      hasDueTime: task.due_date_time === true,
      tags: task.tags?.map((tag: any) => tag.name) || [],
      timeOfDay,
      url: task.url,
    };
  }
}
