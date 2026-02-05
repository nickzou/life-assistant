import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WrikeService } from '@wrike/wrike.service';
import { ClickUpService } from '@clickup/clickup.service';
import { TaskMapping } from '@database/entities/task-mapping.entity';
import { SyncLog } from '@database/entities/sync-log.entity';
import { WrikeTask } from '@wrike/types/wrike-api.types';

@Injectable()
export class SyncService {
  private readonly logger = new Logger(SyncService.name);
  private wrikeStatusMap: Map<string, string> = new Map(); // customStatusId -> status name
  private clickUpStatusMap: Map<string, string> = new Map(); // lowercase status name -> actual status name

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
   * @returns The ClickUp task ID that was created/updated
   */
  async syncWrikeToClickUp(wrikeTask: WrikeTask): Promise<string> {
    this.logger.log(`Starting sync: Wrike task ${wrikeTask.id} -> ClickUp`);

    try {
      // Check if mapping already exists
      const existingMapping = await this.taskMappingRepository.findOne({
        where: { wrike_id: wrikeTask.id },
      });

      let clickUpTaskId: string;

      if (existingMapping) {
        // Update existing ClickUp task
        this.logger.log(
          `Found existing mapping: Wrike ${wrikeTask.id} <-> ClickUp ${existingMapping.clickup_id}`,
        );
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
        this.logger.log(
          `Saved new mapping: Wrike ${wrikeTask.id} <-> ClickUp ${clickUpTaskId}`,
        );
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
      return clickUpTaskId;
    } catch (error) {
      this.logger.error(
        `❌ Sync failed for Wrike task ${wrikeTask.id}:`,
        error.message,
      );

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

    const taskData: any = {
      name: wrikeTask.title,
      description: `View in Wrike: ${wrikeTask.permalink}`,
      tags: ['touchbistro', 'from wrike', 'work'],
    };

    // Auto-assign to current user
    const assigneeId = this.clickUpService.getCurrentUserId();
    if (assigneeId) {
      taskData.assignees = [assigneeId];
      this.logger.log(`Auto-assigning to user: ${assigneeId}`);
    }

    // Add due date if present (convert ISO string to Unix timestamp in milliseconds)
    if (wrikeTask.dates?.due) {
      taskData.due_date = new Date(wrikeTask.dates.due).getTime().toString();
      this.logger.log(
        `Setting due date: ${wrikeTask.dates.due} -> ${taskData.due_date}`,
      );
    }

    // Add start date if present
    if (wrikeTask.dates?.start) {
      taskData.start_date = new Date(wrikeTask.dates.start)
        .getTime()
        .toString();
      this.logger.log(
        `Setting start date: ${wrikeTask.dates.start} -> ${taskData.start_date}`,
      );
    }

    // Map Wrike status to ClickUp status
    const mappedStatus = await this.mapWrikeStatusToClickUp(wrikeTask);
    if (mappedStatus) {
      taskData.status = mappedStatus;
      this.logger.log(`Setting status: ${mappedStatus}`);
    }

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
  private async updateClickUpTask(
    clickUpTaskId: string,
    wrikeTask: WrikeTask,
  ): Promise<void> {
    this.logger.log(`Updating ClickUp task: ${clickUpTaskId}`);

    const taskData: any = {
      name: wrikeTask.title,
      description: `View in Wrike: ${wrikeTask.permalink}`,
    };

    // Auto-assign to current user
    const assigneeId = this.clickUpService.getCurrentUserId();
    if (assigneeId) {
      taskData.assignees = [assigneeId];
      this.logger.log(`Auto-assigning to user: ${assigneeId}`);
    }

    // Add due date if present
    if (wrikeTask.dates?.due) {
      taskData.due_date = new Date(wrikeTask.dates.due).getTime().toString();
      this.logger.log(
        `Updating due date: ${wrikeTask.dates.due} -> ${taskData.due_date}`,
      );
    }

    // Add start date if present
    if (wrikeTask.dates?.start) {
      taskData.start_date = new Date(wrikeTask.dates.start)
        .getTime()
        .toString();
      this.logger.log(
        `Updating start date: ${wrikeTask.dates.start} -> ${taskData.start_date}`,
      );
    }

    // Map Wrike status to ClickUp status
    const mappedStatus = await this.mapWrikeStatusToClickUp(wrikeTask);
    if (mappedStatus) {
      taskData.status = mappedStatus;
      this.logger.log(`Updating status: ${mappedStatus}`);
    }

    await this.clickUpService.updateTask(clickUpTaskId, taskData);
    this.logger.log(`Updated ClickUp task: ${clickUpTaskId}`);
  }

  /**
   * Delete a ClickUp task when Wrike task is deleted or user is unassigned
   */
  async deleteTaskFromClickUp(wrikeTaskId: string): Promise<void> {
    this.logger.log(`Looking up mapping for Wrike task: ${wrikeTaskId}`);

    try {
      // Find the mapping
      const mapping = await this.taskMappingRepository.findOne({
        where: { wrike_id: wrikeTaskId },
      });

      if (!mapping) {
        this.logger.warn(
          `No mapping found for Wrike task ${wrikeTaskId}, nothing to delete`,
        );
        return;
      }

      const clickUpTaskId = mapping.clickup_id;
      this.logger.log(`Found ClickUp task ${clickUpTaskId}, deleting...`);

      // Delete the ClickUp task
      await this.clickUpService.deleteTask(clickUpTaskId);

      // Delete the mapping
      await this.taskMappingRepository.remove(mapping);

      // Log the deletion
      await this.logSync({
        source_platform: 'wrike',
        target_platform: 'clickup',
        source_task_id: wrikeTaskId,
        target_task_id: clickUpTaskId,
        action: 'delete',
        status: 'success',
      });

      this.logger.log(
        `✅ Successfully deleted ClickUp task ${clickUpTaskId} and mapping`,
      );
    } catch (error) {
      this.logger.error(
        `❌ Failed to delete task for Wrike ${wrikeTaskId}:`,
        error.message,
      );

      await this.logSync({
        source_platform: 'wrike',
        target_platform: 'clickup',
        source_task_id: wrikeTaskId,
        target_task_id: '',
        action: 'delete',
        status: 'failed',
        error_message: error.message,
      });
    }
  }

  /**
   * Sync a ClickUp task to Wrike (reverse sync)
   * - Checks if mapping exists
   * - Updates existing Wrike task (no creation in reverse sync)
   * - Logs sync operation
   * @returns The Wrike task ID that was updated, or undefined if no mapping found
   */
  async syncClickUpToWrike(clickUpTask: any): Promise<string | undefined> {
    this.logger.log(
      `Starting reverse sync: ClickUp task ${clickUpTask.id} -> Wrike`,
    );

    try {
      // Check if mapping exists
      const existingMapping = await this.taskMappingRepository.findOne({
        where: { clickup_id: clickUpTask.id },
      });

      if (!existingMapping) {
        this.logger.warn(
          `No mapping found for ClickUp task ${clickUpTask.id}, skipping reverse sync`,
        );
        return undefined;
      }

      this.logger.log(
        `Found existing mapping: ClickUp ${clickUpTask.id} <-> Wrike ${existingMapping.wrike_id}`,
      );

      // Update existing Wrike task
      await this.updateWrikeTask(existingMapping.wrike_id, clickUpTask);

      // Log successful sync
      await this.logSync({
        source_platform: 'clickup',
        target_platform: 'wrike',
        source_task_id: clickUpTask.id,
        target_task_id: existingMapping.wrike_id,
        action: 'update',
        status: 'success',
      });

      this.logger.log(
        `✅ Reverse sync completed successfully: ${clickUpTask.name}`,
      );
      return existingMapping.wrike_id;
    } catch (error) {
      this.logger.error(
        `❌ Reverse sync failed for ClickUp task ${clickUpTask.id}:`,
        error.message,
      );

      await this.logSync({
        source_platform: 'clickup',
        target_platform: 'wrike',
        source_task_id: clickUpTask.id,
        target_task_id: '',
        action: 'update',
        status: 'failed',
        error_message: error.message,
      });

      throw error;
    }
  }

  /**
   * Update an existing Wrike task with data from ClickUp task
   */
  private async updateWrikeTask(
    wrikeTaskId: string,
    clickUpTask: any,
  ): Promise<void> {
    this.logger.log(`Updating Wrike task: ${wrikeTaskId}`);

    const taskData: any = {
      title: clickUpTask.name,
    };

    // Add due date if present (convert Unix timestamp ms to ISO string)
    if (clickUpTask.due_date) {
      const dueDate = new Date(parseInt(clickUpTask.due_date));
      taskData.dates = taskData.dates || {};
      taskData.dates.due = dueDate.toISOString().slice(0, 19); // Remove 'Z' for Wrike format
      this.logger.log(
        `Updating due date: ${clickUpTask.due_date} -> ${taskData.dates.due}`,
      );
    }

    // Add start date if present
    if (clickUpTask.start_date) {
      const startDate = new Date(parseInt(clickUpTask.start_date));
      taskData.dates = taskData.dates || {};
      taskData.dates.start = startDate.toISOString().slice(0, 19);
      this.logger.log(
        `Updating start date: ${clickUpTask.start_date} -> ${taskData.dates.start}`,
      );
    }

    // Map ClickUp status to Wrike status
    // Note: Parameter name is 'customStatus' (not 'customStatusId')
    const mappedStatusId = await this.mapClickUpStatusToWrike(clickUpTask);
    if (mappedStatusId) {
      taskData.customStatus = mappedStatusId;
      this.logger.log(`Updating status: ${mappedStatusId}`);
    }

    await this.wrikeService.updateTask(wrikeTaskId, taskData);
    this.logger.log(`Updated Wrike task: ${wrikeTaskId}`);
  }

  /**
   * Map ClickUp status to Wrike customStatusId
   */
  private async mapClickUpStatusToWrike(
    clickUpTask: any,
  ): Promise<string | undefined> {
    // Load statuses if not already loaded
    await this.loadWrikeStatuses();
    await this.loadClickUpStatuses();

    const clickUpStatusName = clickUpTask.status?.status;
    if (!clickUpStatusName) {
      this.logger.warn(`ClickUp task has no status`);
      return undefined;
    }

    // Find matching Wrike status by name (case-insensitive)
    for (const [statusId, statusName] of this.wrikeStatusMap.entries()) {
      if (statusName.toLowerCase() === clickUpStatusName.toLowerCase()) {
        this.logger.log(
          `Mapped status: ${clickUpStatusName} (ClickUp) -> ${statusName} (Wrike) [${statusId}]`,
        );
        return statusId;
      }
    }

    this.logger.warn(
      `No Wrike status matches ClickUp status: ${clickUpStatusName}`,
    );
    return undefined;
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

  /**
   * Load Wrike statuses into the map (customStatusId -> status name)
   */
  private async loadWrikeStatuses(): Promise<void> {
    if (this.wrikeStatusMap.size > 0) {
      return; // Already loaded
    }

    this.logger.log('Loading Wrike statuses...');
    const workflows = await this.wrikeService.getCustomStatuses();

    for (const workflow of workflows.data) {
      for (const status of workflow.customStatuses) {
        this.wrikeStatusMap.set(status.id, status.name);
      }
    }

    this.logger.log(`Loaded ${this.wrikeStatusMap.size} Wrike statuses`);
  }

  /**
   * Load ClickUp statuses into the map (lowercase name -> actual name)
   */
  private async loadClickUpStatuses(): Promise<void> {
    if (this.clickUpStatusMap.size > 0) {
      return; // Already loaded
    }

    const listId = this.configService.get<string>('CLICKUP_LIST_ID');
    if (!listId) {
      this.logger.warn('CLICKUP_LIST_ID not configured, cannot load statuses');
      return;
    }

    this.logger.log('Loading ClickUp statuses...');
    const list = await this.clickUpService.getList(listId);

    if (list.statuses && Array.isArray(list.statuses)) {
      for (const status of list.statuses) {
        this.clickUpStatusMap.set(status.status.toLowerCase(), status.status);
      }
      this.logger.log(`Loaded ${this.clickUpStatusMap.size} ClickUp statuses`);
    }
  }

  /**
   * Map Wrike status to ClickUp status name
   */
  private async mapWrikeStatusToClickUp(
    wrikeTask: WrikeTask,
  ): Promise<string | undefined> {
    // Load statuses if not already loaded
    await this.loadWrikeStatuses();
    await this.loadClickUpStatuses();

    // Get Wrike status name from customStatusId
    const wrikeStatusName = this.wrikeStatusMap.get(wrikeTask.customStatusId);
    if (!wrikeStatusName) {
      this.logger.warn(
        `Could not find Wrike status name for ID: ${wrikeTask.customStatusId}`,
      );
      return undefined;
    }

    // Find matching ClickUp status (case-insensitive)
    const clickUpStatusName = this.clickUpStatusMap.get(
      wrikeStatusName.toLowerCase(),
    );
    if (!clickUpStatusName) {
      this.logger.warn(
        `No ClickUp status matches Wrike status: ${wrikeStatusName}`,
      );
      return undefined;
    }

    this.logger.log(
      `Mapped status: ${wrikeStatusName} (Wrike) -> ${clickUpStatusName} (ClickUp)`,
    );
    return clickUpStatusName;
  }
}
