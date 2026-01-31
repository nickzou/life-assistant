import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DueDateChange } from '../database/entities/due-date-change.entity';
import { ClickUpService } from '../clickup/clickup.service';

export interface RescheduleLeaderboardItem {
  clickup_task_id: string;
  reschedule_count: number;
  task_name: string;
  current_due_date: string | null;
  tags: string[];
}

@Injectable()
export class TaskInsightsService {
  private readonly logger = new Logger(TaskInsightsService.name);

  constructor(
    @InjectRepository(DueDateChange)
    private dueDateChangeRepository: Repository<DueDateChange>,
    @Inject(forwardRef(() => ClickUpService))
    private clickUpService: ClickUpService,
  ) {}

  /**
   * Record a due date change for a task
   */
  async trackDueDateChange(
    clickupTaskId: string,
    previousDueDate: number | null,
    newDueDate: number | null,
  ): Promise<void> {
    this.logger.log(
      `Tracking due date change for task ${clickupTaskId}: ${previousDueDate} -> ${newDueDate}`,
    );

    const change = this.dueDateChangeRepository.create({
      clickup_task_id: clickupTaskId,
      previous_due_date: previousDueDate,
      new_due_date: newDueDate,
    });

    await this.dueDateChangeRepository.save(change);
    this.logger.log(`Recorded due date change for task ${clickupTaskId}`);
  }

  /**
   * Get the reschedule leaderboard - tasks with 3+ due date changes
   */
  async getRescheduleLeaderboard(
    minReschedules: number = 3,
    limit: number = 20,
  ): Promise<RescheduleLeaderboardItem[]> {
    this.logger.log(
      `Fetching reschedule leaderboard (min: ${minReschedules}, limit: ${limit})`,
    );

    // Query to get task IDs with their reschedule counts
    const results = await this.dueDateChangeRepository
      .createQueryBuilder('change')
      .select('change.clickup_task_id', 'clickup_task_id')
      .addSelect('COUNT(*)', 'reschedule_count')
      .groupBy('change.clickup_task_id')
      .having('COUNT(*) >= :minReschedules', { minReschedules })
      .orderBy('COUNT(*)', 'DESC')
      .limit(limit)
      .getRawMany();

    this.logger.log(
      `Found ${results.length} tasks with ${minReschedules}+ reschedules`,
    );

    // Fetch task details from ClickUp for each task
    const leaderboard: RescheduleLeaderboardItem[] = [];

    for (const result of results) {
      try {
        const task = await this.clickUpService.getTask(result.clickup_task_id);

        // Skip completed tasks
        if (task.status?.type === 'done' || task.status?.type === 'closed') {
          this.logger.debug(
            `Skipping completed task ${result.clickup_task_id}`,
          );
          continue;
        }

        leaderboard.push({
          clickup_task_id: result.clickup_task_id,
          reschedule_count: parseInt(result.reschedule_count, 10),
          task_name: task.name,
          current_due_date: task.due_date
            ? new Date(parseInt(task.due_date, 10)).toISOString().split('T')[0]
            : null,
          tags: task.tags?.map((tag: any) => tag.name) || [],
        });
      } catch (error) {
        // Task might have been deleted - skip it
        this.logger.warn(
          `Could not fetch task ${result.clickup_task_id}: ${error.message}`,
        );
      }
    }

    return leaderboard;
  }

  /**
   * Get the total count of tracked due date changes
   */
  async getTotalChangesCount(): Promise<number> {
    return this.dueDateChangeRepository.count();
  }

  /**
   * Get reschedule count for a specific task
   */
  async getTaskRescheduleCount(clickupTaskId: string): Promise<number> {
    return this.dueDateChangeRepository.count({
      where: { clickup_task_id: clickupTaskId },
    });
  }
}
