import { TaskItem } from '@utils/task-mappers';

export const TASK_SOURCE_TYPES = ['clickup', 'wrike', 'openproject'] as const;
export type TaskSourceType = (typeof TASK_SOURCE_TYPES)[number];

export interface UnifiedTaskItem extends TaskItem {
  source: TaskSourceType;
  readOnly: boolean;
}

export interface TaskSourceResult {
  tasks: UnifiedTaskItem[];
  overdueTasks: UnifiedTaskItem[];
}

export interface TaskSourceStats {
  total: number;
  completed: number;
  remaining: number;
  overdue: number;
  affirmativeCompletions: number;
  completionRate: number;
}

export interface TaskSource {
  readonly sourceName: TaskSourceType;
  getTasksDueToday(): Promise<TaskSourceResult>;
  getStatsForToday(): Promise<TaskSourceStats>;
}

export const TASK_SOURCE = Symbol('TASK_SOURCE');
