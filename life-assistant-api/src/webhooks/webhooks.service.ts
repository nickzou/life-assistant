import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WrikeService } from '../wrike/wrike.service';
import { ClickUpService } from '../clickup/clickup.service';
import { SyncService } from '../sync/sync.service';

export interface WebhookStatusItem {
  id: string;
  source: 'wrike' | 'clickup';
  url: string;
  status: 'active' | 'suspended' | 'unknown';
  events?: string[];
}

export interface WebhookStatusResponse {
  webhooks: WebhookStatusItem[];
  summary: {
    total: number;
    active: number;
    suspended: number;
  };
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly wrikeService: WrikeService,
    private readonly clickUpService: ClickUpService,
    private readonly syncService: SyncService,
    private readonly configService: ConfigService,
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
   *
   * NOTE: ClickUp → Wrike sync is currently disabled to prevent issues on the Wrike side.
   */
  async handleClickUpWebhook(payload: any): Promise<void> {
    this.logger.log('Received ClickUp webhook event');
    this.logger.debug('Full webhook payload:', JSON.stringify(payload, null, 2));

    const { event, task_id } = payload;
    this.logger.log(`Event: ${event} for task ${task_id} - reverse sync disabled, no action taken`);
  }

  /**
   * Get status of all registered webhooks from both platforms
   */
  async getWebhookStatus(): Promise<WebhookStatusResponse> {
    const webhooks: WebhookStatusItem[] = [];

    // Fetch Wrike webhooks
    try {
      this.logger.log('Fetching Wrike webhooks...');
      const wrikeWebhooks = await this.wrikeService.listWebhooks();

      for (const webhook of wrikeWebhooks.data) {
        webhooks.push({
          id: webhook.id,
          source: 'wrike',
          url: webhook.hookUrl,
          status: webhook.status === 'Active' ? 'active' : 'suspended',
        });
      }
      this.logger.log(`Found ${wrikeWebhooks.data.length} Wrike webhooks`);
    } catch (error) {
      this.logger.error('Failed to fetch Wrike webhooks:', error.message);
    }

    // Fetch ClickUp webhooks
    try {
      const workspaceId = this.configService.get<string>('CLICKUP_WORKSPACE_ID');
      if (workspaceId) {
        this.logger.log('Fetching ClickUp webhooks...');
        const clickUpWebhooks = await this.clickUpService.listWebhooks(workspaceId);

        for (const webhook of clickUpWebhooks.webhooks || []) {
          webhooks.push({
            id: webhook.id,
            source: 'clickup',
            url: webhook.endpoint,
            status: webhook.health?.status === 'active' ? 'active' : 'suspended',
            events: webhook.events,
          });
        }
        this.logger.log(`Found ${clickUpWebhooks.webhooks?.length || 0} ClickUp webhooks`);
      }
    } catch (error) {
      this.logger.error('Failed to fetch ClickUp webhooks:', error.message);
    }

    const summary = {
      total: webhooks.length,
      active: webhooks.filter((w) => w.status === 'active').length,
      suspended: webhooks.filter((w) => w.status === 'suspended').length,
    };

    return { webhooks, summary };
  }

  /**
   * Delete a webhook by source and ID
   */
  async deleteWebhook(source: 'wrike' | 'clickup', id: string): Promise<void> {
    if (source === 'wrike') {
      await this.wrikeService.deleteWebhook(id);
    } else if (source === 'clickup') {
      await this.clickUpService.deleteWebhook(id);
    } else {
      throw new Error(`Unknown webhook source: ${source}`);
    }
  }
}
