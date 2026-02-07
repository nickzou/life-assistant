import { Injectable, Logger } from '@nestjs/common';
import { WrikeService } from '@wrike/wrike.service';
import { WrikeStatusService } from '@wrike/wrike-status.service';
import { WrikeTask } from '@wrike/types/wrike-api.types';
import { getNowInTimezone, formatDateString } from '@utils/date';
import {
  filterExcludedStatuses,
  countAffirmativeCompletions,
  calculateCompletionRate,
  isTaskCompleted,
} from '@utils/completion-stats';
import {
  TaskSource,
  TaskSourceResult,
  TaskSourceStats,
  UnifiedTaskItem,
} from '../interfaces/task-source.interface';

const WRIKE_COLOR_MAP: Record<string, string> = {
  None: '#9e9e9e',
  Person: '#4caf50',
  Purple1: '#9c27b0',
  Purple2: '#7b1fa2',
  Purple3: '#6a1b9a',
  Purple4: '#4a148c',
  Indigo1: '#3f51b5',
  Indigo2: '#303f9f',
  Indigo3: '#283593',
  Indigo4: '#1a237e',
  DarkBlue1: '#1565c0',
  DarkBlue2: '#0d47a1',
  DarkBlue3: '#01579b',
  DarkBlue4: '#002171',
  Blue1: '#2196f3',
  Blue2: '#1976d2',
  Blue3: '#1565c0',
  Blue4: '#0d47a1',
  Turquoise1: '#00bcd4',
  Turquoise2: '#0097a7',
  Turquoise3: '#00838f',
  Turquoise4: '#006064',
  DarkCyan1: '#009688',
  DarkCyan2: '#00796b',
  DarkCyan3: '#00695c',
  DarkCyan4: '#004d40',
  Green1: '#4caf50',
  Green2: '#388e3c',
  Green3: '#2e7d32',
  Green4: '#1b5e20',
  YellowGreen1: '#8bc34a',
  YellowGreen2: '#689f38',
  YellowGreen3: '#558b2f',
  YellowGreen4: '#33691e',
  Yellow1: '#ffeb3b',
  Yellow2: '#fdd835',
  Yellow3: '#f9a825',
  Yellow4: '#f57f17',
  Orange1: '#ff9800',
  Orange2: '#f57c00',
  Orange3: '#ef6c00',
  Orange4: '#e65100',
  Red1: '#f44336',
  Red2: '#e53935',
  Red3: '#c62828',
  Red4: '#b71c1c',
  Pink1: '#e91e63',
  Pink2: '#c2185b',
  Pink3: '#ad1457',
  Pink4: '#880e4f',
  Gray1: '#9e9e9e',
  Gray2: '#757575',
  Gray3: '#616161',
};

function wrikeColorToHex(color: string): string {
  return WRIKE_COLOR_MAP[color] || '#9e9e9e';
}

function mapGroupToType(
  group: 'Active' | 'Completed' | 'Deferred' | 'Cancelled',
): string {
  switch (group) {
    case 'Completed':
      return 'done';
    case 'Cancelled':
      return 'closed';
    default:
      return 'custom';
  }
}

@Injectable()
export class WrikeTaskSourceService implements TaskSource {
  private readonly logger = new Logger(WrikeTaskSourceService.name);
  readonly sourceName = 'wrike' as const;

  constructor(
    private readonly wrikeService: WrikeService,
    private readonly wrikeStatusService: WrikeStatusService,
  ) {}

  async getTasksDueToday(): Promise<TaskSourceResult> {
    this.logger.log('Fetching Wrike tasks due today');

    if (!this.wrikeService.getCurrentUserId()) {
      this.logger.warn('Wrike user ID not available, cannot fetch tasks');
      return { tasks: [], overdueTasks: [] };
    }

    const now = getNowInTimezone();
    const todayStr = formatDateString(now);

    const [todayResponse, overdueResponse] = await Promise.all([
      this.wrikeService.getTasksByDateRange(todayStr, todayStr),
      this.wrikeService.getOverdueTasks(todayStr),
    ]);

    const allTasks = [...todayResponse.data, ...overdueResponse.data];
    const parentNames = await this.fetchParentNames(allTasks);

    const todayTasks = await Promise.all(
      todayResponse.data.map((task) => this.mapWrikeTask(task, parentNames)),
    );
    const overdueTasks = await Promise.all(
      overdueResponse.data.map((task) => this.mapWrikeTask(task, parentNames)),
    );

    return {
      tasks: todayTasks.filter((t) => t !== null),
      overdueTasks: overdueTasks.filter((t) => t !== null),
    };
  }

  async getStatsForToday(): Promise<TaskSourceStats> {
    this.logger.log('Computing Wrike stats for today');

    if (!this.wrikeService.getCurrentUserId()) {
      this.logger.warn('Wrike user ID not available, cannot compute stats');
      return {
        total: 0,
        completed: 0,
        remaining: 0,
        overdue: 0,
        affirmativeCompletions: 0,
        completionRate: 0,
      };
    }

    const now = getNowInTimezone();
    const todayStr = formatDateString(now);

    const [todayResponse, overdueResponse] = await Promise.all([
      this.wrikeService.getTasksByDateRange(todayStr, todayStr),
      this.wrikeService.getOverdueTasks(todayStr),
    ]);

    const todayMapped = await Promise.all(
      todayResponse.data.map((task) => this.mapWrikeTask(task)),
    );
    const validTasks = todayMapped.filter((t) => t !== null);

    const filteredTasks = filterExcludedStatuses(validTasks);
    const completed = filteredTasks.filter((task) =>
      isTaskCompleted(task),
    ).length;
    const affirmativeCompletions = countAffirmativeCompletions(filteredTasks);
    const completionRate = calculateCompletionRate(
      affirmativeCompletions,
      filteredTasks.length,
    );

    return {
      total: filteredTasks.length,
      completed,
      remaining: filteredTasks.length - completed,
      overdue: overdueResponse.data.length,
      affirmativeCompletions,
      completionRate,
    };
  }

  /**
   * Enrich tasks with full details (superTaskIds, parentIds) from batch fetch,
   * then resolve parent names from super tasks or folders.
   */
  private async fetchParentNames(
    tasks: WrikeTask[],
  ): Promise<Map<string, string>> {
    const parentNames = new Map<string, string>();
    if (tasks.length === 0) return parentNames;

    // Batch-fetch full task details to get superTaskIds and parentIds
    // (the list endpoint doesn't return these fields)
    let enrichedTasks: WrikeTask[];
    try {
      const taskIds = tasks.map((t) => t.id);
      const response = await this.wrikeService.getTasks(taskIds);
      enrichedTasks = response.data;
    } catch (error) {
      this.logger.warn(
        `Failed to batch-fetch task details: ${error.message}`,
      );
      return parentNames;
    }

    // Copy superTaskIds and parentIds back to original tasks
    const enrichedMap = new Map(enrichedTasks.map((t) => [t.id, t]));
    for (const task of tasks) {
      const enriched = enrichedMap.get(task.id);
      if (enriched) {
        task.superTaskIds = enriched.superTaskIds;
        task.parentIds = enriched.parentIds;
      }
    }

    // Collect unique super task IDs (parent tasks)
    const superTaskIds = [
      ...new Set(
        tasks
          .filter((task) => task.superTaskIds?.length)
          .map((task) => task.superTaskIds[0]),
      ),
    ];

    // Collect unique folder IDs for tasks without a super task
    const folderIds = [
      ...new Set(
        tasks
          .filter(
            (task) => !task.superTaskIds?.length && task.parentIds?.length,
          )
          .map((task) => task.parentIds[0]),
      ),
    ];

    // Fetch super task names (batch if possible)
    if (superTaskIds.length > 0) {
      try {
        const response = await this.wrikeService.getTasks(superTaskIds);
        for (const parent of response.data) {
          parentNames.set(parent.id, parent.title);
        }
      } catch (error) {
        this.logger.warn(
          `Failed to fetch super task names: ${error.message}`,
        );
      }
    }

    // Fetch folder names as fallback
    if (folderIds.length > 0) {
      const folderResults = await Promise.allSettled(
        folderIds.map(async (id) => {
          const response = await this.wrikeService.getFolder(id);
          return { id, name: response.data?.[0]?.title || null };
        }),
      );
      for (const result of folderResults) {
        if (result.status === 'fulfilled' && result.value.name) {
          parentNames.set(result.value.id, result.value.name);
        }
      }
    }

    return parentNames;
  }

  private async mapWrikeTask(
    task: WrikeTask,
    parentNames: Map<string, string> = new Map(),
  ): Promise<UnifiedTaskItem | null> {
    if (!task.dates?.due) {
      return null;
    }

    const statusInfo = await this.wrikeStatusService.getStatusInfo(
      task.customStatusId,
    );

    const dueDate = task.dates.due.endsWith('Z')
      ? task.dates.due
      : task.dates.due.includes('T')
        ? task.dates.due + 'Z'
        : task.dates.due + 'T00:00:00.000Z';

    const startDate = task.dates.start
      ? task.dates.start.endsWith('Z')
        ? task.dates.start
        : task.dates.start.includes('T')
          ? task.dates.start + 'Z'
          : task.dates.start + 'T00:00:00.000Z'
      : null;

    return {
      id: task.id,
      name: task.title,
      parentName: task.superTaskIds?.length
        ? parentNames.get(task.superTaskIds[0]) || null
        : task.parentIds?.length
          ? parentNames.get(task.parentIds[0]) || null
          : null,
      listId: '',
      status: {
        status: statusInfo?.name || task.status,
        type: statusInfo ? mapGroupToType(statusInfo.group) : 'custom',
        color: statusInfo ? wrikeColorToHex(statusInfo.color) : '#9e9e9e',
      },
      startDate,
      hasStartTime: false,
      dueDate,
      hasDueTime: false,
      tags: ['work'],
      timeOfDay: null,
      url: task.permalink,
      source: 'wrike',
      readOnly: true,
    };
  }
}
