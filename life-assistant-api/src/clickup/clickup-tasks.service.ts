import { Injectable, Logger } from '@nestjs/common';
import { ClickUpService } from './clickup.service';
import { getNowInTimezone } from '../utils/date.utils';

export interface TaskItem {
  id: string;
  name: string;
  status: {
    status: string;
    type: string;
    color: string;
  };
  dueDate: string | null;
  tags: string[];
  timeOfDay: string | null;
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

    return {
      tasks: todayTasks.map((task) => this.mapTaskToItem(task)),
      overdueTasks: overdueTasks.map((task) => this.mapTaskToItem(task)),
    };
  }

  /**
   * Map a ClickUp task to our TaskItem format
   */
  private mapTaskToItem(task: any): TaskItem {
    // Find Time of Day custom field
    const timeOfDayField = task.custom_fields?.find(
      (field: any) =>
        field.name?.toLowerCase() === this.TIME_OF_DAY_FIELD_NAME,
    );

    // Get the selected option name for dropdown fields
    let timeOfDay: string | null = null;
    if (timeOfDayField?.value !== undefined && timeOfDayField.type_config?.options) {
      const selectedOption = timeOfDayField.type_config.options.find(
        (opt: any) => opt.orderindex === timeOfDayField.value,
      );
      timeOfDay = selectedOption?.name || null;
    }

    return {
      id: task.id,
      name: task.name,
      status: {
        status: task.status?.status || 'unknown',
        type: task.status?.type || 'unknown',
        color: task.status?.color || '#gray',
      },
      dueDate: task.due_date
        ? new Date(parseInt(task.due_date, 10)).toISOString()
        : null,
      tags: task.tags?.map((tag: any) => tag.name) || [],
      timeOfDay,
      url: task.url,
    };
  }
}
