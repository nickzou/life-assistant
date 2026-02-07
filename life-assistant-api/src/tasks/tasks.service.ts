import { Inject, Injectable, Logger } from '@nestjs/common';
import { sortByTimeOfDay } from '@utils/task-sorting';
import { calculateCompletionRate } from '@utils/completion-stats';
import {
  TASK_SOURCE,
  TaskSource,
  TaskSourceType,
  UnifiedTaskItem,
} from './interfaces/task-source.interface';
import { TaskAnnotationService } from './task-annotation.service';

export interface AggregatedTasksResult {
  tasks: UnifiedTaskItem[];
  overdueTasks: UnifiedTaskItem[];
}

export interface AggregatedStats {
  total: number;
  completed: number;
  remaining: number;
  overdue: number;
  affirmativeCompletions: number;
  completionRate: number;
}

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @Inject(TASK_SOURCE)
    private readonly taskSources: TaskSource[],
    private readonly taskAnnotationService: TaskAnnotationService,
  ) {}

  async getTasksDueToday(): Promise<AggregatedTasksResult> {
    this.logger.log(`Fetching tasks from ${this.taskSources.length} source(s)`);

    const results = await Promise.allSettled(
      this.taskSources.map((source) => source.getTasksDueToday()),
    );

    const allTasks: UnifiedTaskItem[] = [];
    const allOverdue: UnifiedTaskItem[] = [];

    results.forEach((result, index) => {
      const sourceName = this.taskSources[index].sourceName;
      if (result.status === 'fulfilled') {
        allTasks.push(...result.value.tasks);
        allOverdue.push(...result.value.overdueTasks);
        this.logger.log(
          `${sourceName}: ${result.value.tasks.length} tasks, ${result.value.overdueTasks.length} overdue`,
        );
      } else {
        this.logger.warn(
          `Failed to fetch tasks from ${sourceName}: ${result.reason?.message || result.reason}`,
        );
      }
    });

    // Enrich tasks that don't have timeOfDay with DB annotations
    await this.enrichTimeOfDay([...allTasks, ...allOverdue]);

    return {
      tasks: sortByTimeOfDay(allTasks),
      overdueTasks: sortByTimeOfDay(allOverdue),
    };
  }

  private async enrichTimeOfDay(tasks: UnifiedTaskItem[]): Promise<void> {
    // Group tasks without timeOfDay by source
    const tasksBySource = new Map<TaskSourceType, UnifiedTaskItem[]>();
    for (const task of tasks) {
      if (task.timeOfDay === null) {
        const list = tasksBySource.get(task.source) || [];
        list.push(task);
        tasksBySource.set(task.source, list);
      }
    }

    // Skip ClickUp since it has native timeOfDay support
    tasksBySource.delete('clickup');

    // Batch-fetch annotations for each source
    for (const [source, sourceTasks] of tasksBySource) {
      const taskIds = sourceTasks.map((t) => t.id);
      const annotations =
        await this.taskAnnotationService.getTimeOfDayAnnotations(
          taskIds,
          source,
        );

      for (const task of sourceTasks) {
        const annotation = annotations.get(task.id);
        if (annotation) {
          task.timeOfDay = annotation;
        }
      }
    }
  }

  async getStatsForToday(): Promise<AggregatedStats> {
    this.logger.log(`Fetching stats from ${this.taskSources.length} source(s)`);

    const results = await Promise.allSettled(
      this.taskSources.map((source) => source.getStatsForToday()),
    );

    let total = 0;
    let completed = 0;
    let remaining = 0;
    let overdue = 0;
    let affirmativeCompletions = 0;

    results.forEach((result, index) => {
      const sourceName = this.taskSources[index].sourceName;
      if (result.status === 'fulfilled') {
        total += result.value.total;
        completed += result.value.completed;
        remaining += result.value.remaining;
        overdue += result.value.overdue;
        affirmativeCompletions += result.value.affirmativeCompletions;
      } else {
        this.logger.warn(
          `Failed to fetch stats from ${sourceName}: ${result.reason?.message || result.reason}`,
        );
      }
    });

    return {
      total,
      completed,
      remaining,
      overdue,
      affirmativeCompletions,
      completionRate: calculateCompletionRate(affirmativeCompletions, total),
    };
  }
}
