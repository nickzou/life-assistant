import { Injectable, Logger } from '@nestjs/common';
import { WrikeService } from '../wrike/wrike.service';
import { ClickUpService } from '../clickup/clickup.service';
import { SyncService } from '../sync/sync.service';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly wrikeService: WrikeService,
    private readonly clickUpService: ClickUpService,
    private readonly syncService: SyncService,
  ) {}

  /**
   * Process incoming Wrike webhook event
   */
  async handleWrikeWebhook(payload: any): Promise<void> {
    this.logger.log('Received Wrike webhook event');
    this.logger.log('Full webhook payload:', JSON.stringify(payload, null, 2));

    // Wrike sends an array of events
    const events = Array.isArray(payload) ? payload : [payload];

    // Event types we care about:
    const SYNC_EVENT_TYPES = [
      'TaskResponsiblesAdded',    // When someone is assigned
      'TaskResponsiblesRemoved',  // When someone is unassigned
      'TaskStatusChanged',        // When status changes
      'TaskTitleChanged',         // When title changes
      'TaskDescriptionChanged',   // When description changes
      'TaskDatesChanged',         // When dates change
      'TaskDeleted',              // When task is deleted
    ];

    const currentUserId = this.wrikeService.getCurrentUserId();
    if (!currentUserId) {
      this.logger.error('Current user ID not initialized - cannot process webhooks');
      return;
    }

    // Process each event
    for (const event of events) {
      const { eventType, taskId, addedResponsibles, removedResponsibles, eventAuthorId } = event;

      this.logger.log(`Processing event: ${eventType} for task ${taskId} (author: ${eventAuthorId})`);

      // Skip events we don't care about
      if (!SYNC_EVENT_TYPES.includes(eventType)) {
        this.logger.log(`Skipping event type: ${eventType}`);
        continue;
      }

      // Skip events triggered by our own sync (prevents infinite loops)
      if (eventAuthorId === currentUserId) {
        this.logger.log(`Skipping event - triggered by sync bot (self)`);
        continue;
      }

      // For TaskResponsiblesAdded, check if current user was added
      if (eventType === 'TaskResponsiblesAdded') {
        const userWasAdded = addedResponsibles?.includes(currentUserId);
        if (!userWasAdded) {
          this.logger.log(`Task ${taskId} assigned to someone else, skipping`);
          continue;
        }
        this.logger.log(`Task ${taskId} assigned to current user!`);
      }

      // For TaskResponsiblesRemoved, check if current user was removed
      if (eventType === 'TaskResponsiblesRemoved') {
        const userWasRemoved = removedResponsibles?.includes(currentUserId);
        if (!userWasRemoved) {
          this.logger.log(`Task ${taskId} - someone else was unassigned, skipping`);
          continue;
        }
        this.logger.log(`Task ${taskId} - current user was unassigned, will delete from ClickUp`);
        await this.syncService.deleteTaskFromClickUp(taskId);
        continue;
      }

      // For TaskDeleted, delete from ClickUp
      if (eventType === 'TaskDeleted') {
        this.logger.log(`Task ${taskId} was deleted in Wrike, deleting from ClickUp`);
        await this.syncService.deleteTaskFromClickUp(taskId);
        continue;
      }

      try {
        // Fetch full task details from Wrike API
        this.logger.log(`Fetching task details for: ${taskId}`);
        const taskResponse = await this.wrikeService.getTask(taskId);

        if (!taskResponse.data || taskResponse.data.length === 0) {
          this.logger.warn(`No task data found for taskId: ${taskId}`);
          continue;
        }

        const task = taskResponse.data[0];

        // Double-check assignment (for non-TaskResponsiblesAdded events)
        if (eventType !== 'TaskResponsiblesAdded') {
          const isAssignedToMe = task.responsibleIds?.includes(currentUserId);
          if (!isAssignedToMe) {
            this.logger.log(`Task ${taskId} not assigned to current user, skipping`);
            continue;
          }
        }

        this.logger.log(`Syncing task ${taskId}: ${task.title}`);

        // Sync the task to ClickUp
        await this.syncService.syncWrikeToClickUp(task);

      } catch (error) {
        this.logger.error(`Error processing event ${eventType} for task ${taskId}:`, error.message);
      }
    }
  }

  /**
   * Process incoming ClickUp webhook event
   */
  async handleClickUpWebhook(payload: any): Promise<void> {
    this.logger.log('Received ClickUp webhook event');
    this.logger.log('Full webhook payload:', JSON.stringify(payload, null, 2));

    const { event, task_id, history_items } = payload;

    // Event types we care about for reverse sync
    const SYNC_EVENT_TYPES = [
      'taskUpdated',
      'taskStatusUpdated',
      'taskDueDateUpdated',
      'taskStartDateUpdated',
    ];

    this.logger.log(`Processing event: ${event} for task ${task_id}`);

    // Skip events we don't care about
    if (!SYNC_EVENT_TYPES.includes(event)) {
      this.logger.log(`Skipping event type: ${event}`);
      return;
    }

    // Skip events triggered by our own sync (prevents infinite loops)
    const currentUserId = this.clickUpService.getCurrentUserId();
    if (currentUserId && history_items?.length > 0) {
      const triggeredBySelf = history_items.some(
        (item: any) => item.user?.id === currentUserId,
      );
      if (triggeredBySelf) {
        this.logger.log(`Skipping event - triggered by sync bot (self)`);
        return;
      }
    }

    try {
      // Fetch full task details from ClickUp API
      this.logger.log(`Fetching task details for: ${task_id}`);
      const clickUpTask = await this.clickUpService.getTask(task_id);

      this.logger.log(`Syncing task ${task_id}: ${clickUpTask.name}`);

      // Sync the task to Wrike (reverse sync)
      await this.syncService.syncClickUpToWrike(clickUpTask);

    } catch (error) {
      this.logger.error(`Error processing event ${event} for task ${task_id}:`, error.message);
    }
  }
}
