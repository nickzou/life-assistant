import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClickUpTasksService } from '@clickup/clickup-tasks.service';
import { ClickUpStatsService } from '@clickup/clickup-stats.service';
import {
  TaskSource,
  TaskSourceResult,
  TaskSourceStats,
  UnifiedTaskItem,
} from '../interfaces/task-source.interface';
import { TaskItem } from '@utils/task-mappers';

@Injectable()
export class ClickUpTaskSourceService implements TaskSource {
  private readonly logger = new Logger(ClickUpTaskSourceService.name);
  readonly sourceName = 'clickup' as const;
  private readonly workspaceId: string;

  constructor(
    private readonly clickUpTasksService: ClickUpTasksService,
    private readonly clickUpStatsService: ClickUpStatsService,
    private readonly configService: ConfigService,
  ) {
    this.workspaceId = this.configService.get<string>('CLICKUP_WORKSPACE_ID');
  }

  async getTasksDueToday(): Promise<TaskSourceResult> {
    this.logger.log('Fetching ClickUp tasks due today');
    const result = await this.clickUpTasksService.getTasksDueToday(
      this.workspaceId,
    );
    return {
      tasks: result.tasks.map((task) => this.toUnifiedTask(task)),
      overdueTasks: result.overdueTasks.map((task) => this.toUnifiedTask(task)),
    };
  }

  async getStatsForToday(): Promise<TaskSourceStats> {
    this.logger.log('Fetching ClickUp stats for today');
    return this.clickUpStatsService.getTasksDueToday(this.workspaceId);
  }

  private toUnifiedTask(task: TaskItem): UnifiedTaskItem {
    return {
      ...task,
      source: 'clickup',
      readOnly: false,
    };
  }
}
