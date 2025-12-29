import { Injectable, Logger } from '@nestjs/common';
import { WrikeService } from '../wrike/wrike.service';
import { SyncService } from '../sync/sync.service';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly wrikeService: WrikeService,
    private readonly syncService: SyncService,
  ) {}

  /**
   * Process incoming Wrike webhook event
   */
  async handleWrikeWebhook(payload: any): Promise<void> {
    this.logger.log('Received Wrike webhook event');
    this.logger.debug('Wrike webhook payload:', JSON.stringify(payload, null, 2));

    // Extract task ID from webhook payload
    // Wrike webhooks typically have a structure like: { taskId: "...", ... }
    const taskId = payload.taskId;
    if (!taskId) {
      this.logger.warn('No taskId found in Wrike webhook payload');
      return;
    }

    try {
      // Fetch full task details from Wrike API
      this.logger.log(`Fetching task details for: ${taskId}`);
      const taskResponse = await this.wrikeService.getTask(taskId);

      if (!taskResponse.data || taskResponse.data.length === 0) {
        this.logger.warn(`No task data found for taskId: ${taskId}`);
        return;
      }

      const task = taskResponse.data[0];

      // Check if task is assigned to the current user
      const currentUserId = this.wrikeService.getCurrentUserId();
      if (!currentUserId) {
        this.logger.error('Current user ID not initialized - cannot filter by assignment');
        return;
      }

      const isAssignedToMe = task.responsibleIds?.includes(currentUserId);

      if (!isAssignedToMe) {
        this.logger.log(`Task ${taskId} is not assigned to current user (${currentUserId}), skipping sync`);
        return;
      }

      this.logger.log(`Task ${taskId} is assigned to current user - proceeding with sync`);
      this.logger.debug(`Task details: ${task.title}`);

      // Sync the task to ClickUp
      await this.syncService.syncWrikeToClickUp(task);

    } catch (error) {
      this.logger.error(`Error processing Wrike webhook for task ${taskId}:`, error.message);
    }
  }

  /**
   * Process incoming ClickUp webhook event
   */
  async handleClickUpWebhook(payload: any): Promise<void> {
    this.logger.log('Received ClickUp webhook event');
    this.logger.debug('ClickUp webhook payload:', JSON.stringify(payload, null, 2));

    // TODO: Implement sync logic
    // For now, just log the event
  }
}
