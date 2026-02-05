import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WrikeService } from '../wrike/wrike.service';
import { ClickUpService } from '../clickup/clickup.service';
import { SyncService } from '../sync/sync.service';
import { GrocyService } from '../grocy/grocy.service';
import { getTodayString } from '../utils/date';

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

  // Custom field name for Grocy recipe ID auto-consume
  private readonly GROCY_ID_FIELD_NAME = 'grocy id';

  constructor(
    private readonly wrikeService: WrikeService,
    private readonly clickUpService: ClickUpService,
    private readonly syncService: SyncService,
    private readonly configService: ConfigService,
    private readonly grocyService: GrocyService,
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
      'TaskResponsiblesAdded', // When someone is assigned
      'TaskResponsiblesRemoved', // When someone is unassigned
      'TaskStatusChanged', // When status changes
      'TaskTitleChanged', // When title changes
      'TaskDescriptionChanged', // When description changes
      'TaskDatesChanged', // When dates change
      'TaskDeleted', // When task is deleted
    ];

    const currentUserId = this.wrikeService.getCurrentUserId();
    if (!currentUserId) {
      this.logger.error(
        'Current user ID not initialized - cannot process webhooks',
      );
      return;
    }

    // Process each event
    for (const event of events) {
      const {
        eventType,
        taskId,
        addedResponsibles,
        removedResponsibles,
        eventAuthorId,
      } = event;

      this.logger.log(
        `Processing event: ${eventType} for task ${taskId} (author: ${eventAuthorId})`,
      );

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
          this.logger.log(
            `Task ${taskId} - someone else was unassigned, skipping`,
          );
          continue;
        }
        this.logger.log(
          `Task ${taskId} - current user was unassigned, will delete from ClickUp`,
        );
        await this.syncService.deleteTaskFromClickUp(taskId);
        continue;
      }

      // For TaskDeleted, delete from ClickUp
      if (eventType === 'TaskDeleted') {
        this.logger.log(
          `Task ${taskId} was deleted in Wrike, deleting from ClickUp`,
        );
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
            this.logger.log(
              `Task ${taskId} not assigned to current user, skipping`,
            );
            continue;
          }
        }

        this.logger.log(`Syncing task ${taskId}: ${task.title}`);

        // Sync the task to ClickUp
        await this.syncService.syncWrikeToClickUp(task);
      } catch (error) {
        this.logger.error(
          `Error processing event ${eventType} for task ${taskId}:`,
          error.message,
        );
      }
    }
  }

  /**
   * Process incoming ClickUp webhook event
   *
   * Handles:
   * - Task created with "Grocy ID" custom field: Creates meal plan entry
   * - Task completed with "Grocy ID" custom field: Consumes recipe and marks meal as done
   *
   * NOTE: ClickUp → Wrike sync is currently disabled to prevent issues on the Wrike side.
   */
  async handleClickUpWebhook(payload: any): Promise<void> {
    this.logger.log('Received ClickUp webhook event');
    this.logger.debug(
      'Full webhook payload:',
      JSON.stringify(payload, null, 2),
    );

    const { event, task_id, history_items } = payload;
    this.logger.log(`Event: ${event} for task ${task_id}`);

    // Handle task creation - add to meal plan
    if (event === 'taskCreated' && task_id) {
      await this.handleTaskCreated(task_id);
    }

    // Handle taskUpdated when Grocy ID custom field is set - also add to meal plan
    if (event === 'taskUpdated' && task_id && history_items) {
      const grocyIdFieldChange = history_items.find(
        (item: any) =>
          item.field === 'custom_field' &&
          item.custom_field?.name?.toLowerCase() === this.GROCY_ID_FIELD_NAME &&
          item.after && // Field was set to a value
          !item.before, // Field was not previously set (new value)
      );
      if (grocyIdFieldChange) {
        this.logger.log(
          `Grocy ID field set on task ${task_id}, adding to meal plan...`,
        );
        await this.handleTaskCreated(task_id);
      }
    }

    // Handle task completion - consume recipe
    if (event === 'taskStatusUpdated' && task_id) {
      await this.handleTaskStatusUpdate(task_id, history_items);
    }
  }

  /**
   * Handle task creation - check for Grocy ID and add to meal plan
   */
  private async handleTaskCreated(taskId: string): Promise<void> {
    this.logger.log(`Task ${taskId} created, checking for Grocy ID...`);

    try {
      const task = await this.clickUpService.getTask(taskId);
      const grocyIdField = task.custom_fields?.find(
        (field) => field.name.toLowerCase() === this.GROCY_ID_FIELD_NAME,
      );

      if (!grocyIdField?.value) {
        this.logger.debug(
          `Task ${taskId} has no Grocy ID custom field set - skipping`,
        );
        return;
      }

      const grocyRecipeId = parseInt(grocyIdField.value, 10);
      if (isNaN(grocyRecipeId)) {
        this.logger.warn(
          `Task ${taskId} has invalid Grocy ID value: ${grocyIdField.value}`,
        );
        return;
      }

      this.logger.log(
        `Task ${taskId} created with Grocy ID ${grocyRecipeId} - adding to meal plan`,
      );

      await this.addToMealPlan(grocyRecipeId, task.name);
    } catch (error) {
      this.logger.error(
        `Failed to process task creation for ${taskId}: ${error.message}`,
      );
    }
  }

  /**
   * Add a recipe to today's meal plan
   */
  private async addToMealPlan(
    recipeId: number,
    taskName: string,
  ): Promise<void> {
    const today = getTodayString();

    try {
      this.logger.log(
        `Creating meal plan entry for recipe ${recipeId} on ${today}`,
      );
      const mealPlanItem = await this.grocyService.createMealPlanItem({
        day: today,
        recipe_id: recipeId,
        servings: 1,
      });
      this.logger.log(
        `✅ Added "${taskName}" (recipe ${recipeId}) to meal plan as item ${mealPlanItem.id}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to add recipe ${recipeId} to meal plan: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Handle task status update - check if task was completed and has Grocy ID
   */
  private async handleTaskStatusUpdate(
    taskId: string,
    historyItems?: any[],
  ): Promise<void> {
    // Check if the status change was to a "done" or "closed" type
    const statusChange = historyItems?.find(
      (item: any) => item.field === 'status',
    );

    if (!statusChange) {
      this.logger.debug('No status change found in history items');
      return;
    }

    // ClickUp sends after.type for the new status type
    const newStatusType = statusChange.after?.type;
    if (newStatusType !== 'done' && newStatusType !== 'closed') {
      this.logger.debug(
        `Status changed to ${newStatusType}, not a completion - skipping`,
      );
      return;
    }

    this.logger.log(`Task ${taskId} was completed, checking for Grocy ID...`);

    try {
      // Fetch full task details to get custom fields
      const task = await this.clickUpService.getTask(taskId);

      // Find the "Grocy ID" custom field
      const grocyIdField = task.custom_fields?.find(
        (field) => field.name.toLowerCase() === this.GROCY_ID_FIELD_NAME,
      );

      if (!grocyIdField?.value) {
        this.logger.debug(
          `Task ${taskId} has no Grocy ID custom field set - skipping auto-consume`,
        );
        return;
      }

      const grocyRecipeId = parseInt(grocyIdField.value, 10);
      if (isNaN(grocyRecipeId)) {
        this.logger.warn(
          `Task ${taskId} has invalid Grocy ID value: ${grocyIdField.value}`,
        );
        return;
      }

      this.logger.log(
        `Task ${taskId} completed with Grocy ID ${grocyRecipeId} - consuming recipe`,
      );

      await this.consumeMeal(grocyRecipeId, task.name);
    } catch (error) {
      this.logger.error(
        `Failed to process auto-consume for task ${taskId}: ${error.message}`,
      );
    }
  }

  /**
   * Consume a meal: deduct from stock and mark today's meal plan entry as done
   */
  private async consumeMeal(recipeId: number, taskName: string): Promise<void> {
    const today = getTodayString();

    try {
      // 1. Consume the recipe (deduct from stock)
      this.logger.log(`Consuming recipe ${recipeId}`);
      await this.grocyService.consumeRecipe(recipeId);
      this.logger.log(`Recipe ${recipeId} consumed`);

      // 2. Find and mark today's meal plan entry as done
      const todayMeals = await this.grocyService.getMealPlanForDate(today);
      const mealPlanItem = todayMeals.find(
        (meal) => meal.recipe_id === recipeId && !meal.done,
      );

      if (mealPlanItem) {
        this.logger.log(`Marking meal plan item ${mealPlanItem.id} as done`);
        await this.grocyService.updateMealPlanItemDone(mealPlanItem.id, true);
      } else {
        this.logger.warn(
          `No unmarked meal plan entry found for recipe ${recipeId} on ${today}`,
        );
      }

      this.logger.log(`✅ Consumed "${taskName}" (recipe ${recipeId})`);
    } catch (error) {
      this.logger.error(
        `Failed to consume recipe ${recipeId}: ${error.message}`,
      );
      throw error;
    }
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
      const workspaceId = this.configService.get<string>(
        'CLICKUP_WORKSPACE_ID',
      );
      if (workspaceId) {
        this.logger.log('Fetching ClickUp webhooks...');
        const clickUpWebhooks =
          await this.clickUpService.listWebhooks(workspaceId);

        for (const webhook of clickUpWebhooks.webhooks || []) {
          webhooks.push({
            id: webhook.id,
            source: 'clickup',
            url: webhook.endpoint,
            status:
              webhook.health?.status === 'active' ? 'active' : 'suspended',
            events: webhook.events,
          });
        }
        this.logger.log(
          `Found ${clickUpWebhooks.webhooks?.length || 0} ClickUp webhooks`,
        );
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
