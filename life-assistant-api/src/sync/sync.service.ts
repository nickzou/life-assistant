import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WrikeService } from '../wrike/wrike.service';
import { ClickUpService } from '../clickup/clickup.service';
import { TaskMapping } from '../database/entities/task-mapping.entity';
import { SyncLog } from '../database/entities/sync-log.entity';
import { WrikeTask } from '../wrike/types/wrike-api.types';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);

  constructor(
    private readonly wrikeService: WrikeService,
    private readonly clickUpService: ClickUpService,
    private readonly configService: ConfigService,
    @InjectRepository(TaskMapping)
    private readonly taskMappingRepository: Repository<TaskMapping>,
    @InjectRepository(SyncLog)
    private readonly syncLogRepository: Repository<SyncLog>,
  ) {}

  /**
   * Sync a Wrike task to ClickUp
   * - Checks if mapping exists
   * - Creates new ClickUp task or updates existing one
   * - Saves/updates mapping
   * - Logs sync operation
   */
  async syncWrikeToClickUp(wrikeTask: WrikeTask): Promise<void> {
    this.logger.log(`Starting sync: Wrike task ${wrikeTask.id} -> ClickUp`);

    try {
      // Check if mapping already exists
      const existingMapping = await this.taskMappingRepository.findOne({
        where: { wrike_id: wrikeTask.id },
      });

      let clickUpTaskId: string;

      if (existingMapping) {
        // Update existing ClickUp task
        this.logger.log(`Found existing mapping: Wrike ${wrikeTask.id} <-> ClickUp ${existingMapping.clickup_id}`);
        await this.updateClickUpTask(existingMapping.clickup_id, wrikeTask);
        clickUpTaskId = existingMapping.clickup_id;
      } else {
        // Create new ClickUp task
        this.logger.log(`No mapping found, creating new ClickUp task`);
        clickUpTaskId = await this.createClickUpTask(wrikeTask);

        // Save new mapping
        const newMapping = this.taskMappingRepository.create({
          wrike_id: wrikeTask.id,
          clickup_id: clickUpTaskId,
          integration_type: 'wrike-clickup',
        });
        await this.taskMappingRepository.save(newMapping);
        this.logger.log(`Saved new mapping: Wrike ${wrikeTask.id} <-> ClickUp ${clickUpTaskId}`);
      }

      // Log successful sync
      await this.logSync({
        source_platform: 'wrike',
        target_platform: 'clickup',
        source_task_id: wrikeTask.id,
        target_task_id: clickUpTaskId,
        action: existingMapping ? 'update' : 'create',
        status: 'success',
      });

      this.logger.log(`✅ Sync completed successfully: ${wrikeTask.title}`);
    } catch (error) {
      this.logger.error(`❌ Sync failed for Wrike task ${wrikeTask.id}:`, error.message);

      // Log failed sync
      await this.logSync({
        source_platform: 'wrike',
        target_platform: 'clickup',
        source_task_id: wrikeTask.id,
        target_task_id: '',
        action: 'create',
        status: 'failed',
        error_message: error.message,
      });

      throw error;
    }
  }

  /**
   * Create a new ClickUp task from a Wrike task
   */
  private async createClickUpTask(wrikeTask: WrikeTask): Promise<string> {
    const listId = this.configService.get<string>('CLICKUP_LIST_ID');
    if (!listId) {
      throw new Error('CLICKUP_LIST_ID not configured');
    }

    this.logger.log(`Creating ClickUp task: ${wrikeTask.title}`);

    const taskData = {
      name: wrikeTask.title,
      description: wrikeTask.description || '',
      // Map Wrike status to ClickUp status
      // TODO: Implement proper status mapping
      // status: this.mapWrikeStatusToClickUp(wrikeTask.status),
    };

    const response = await this.clickUpService.createTask(listId, taskData);

    if (!response.id) {
      throw new Error('ClickUp task creation failed - no task ID returned');
    }

    this.logger.log(`Created ClickUp task: ${response.id}`);
    return response.id;
  }

  /**
   * Update an existing ClickUp task with data from Wrike task
   */
  private async updateClickUpTask(clickUpTaskId: string, wrikeTask: WrikeTask): Promise<void> {
    this.logger.log(`Updating ClickUp task: ${clickUpTaskId}`);

    const taskData = {
      name: wrikeTask.title,
      description: wrikeTask.description || '',
      // TODO: Map status, dates, priority, etc.
    };

    await this.clickUpService.updateTask(clickUpTaskId, taskData);
    this.logger.log(`Updated ClickUp task: ${clickUpTaskId}`);
  }

  /**
   * Log a sync operation to the database
   */
  private async logSync(data: {
    source_platform: string;
    target_platform: string;
    source_task_id: string;
    target_task_id: string;
    action: string;
    status: string;
    error_message?: string;
  }): Promise<void> {
    const log = this.syncLogRepository.create(data);
    await this.syncLogRepository.save(log);
  }
}
