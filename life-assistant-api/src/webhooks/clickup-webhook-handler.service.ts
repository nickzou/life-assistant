import { Injectable, Logger } from '@nestjs/common';
import { ClickUpService } from '@clickup/clickup.service';
import { GrocyService } from '@grocy/grocy.service';
import { getTodayString } from '@utils/date';

const GROCY_ID_FIELD_NAME = 'grocy id';

@Injectable()
export class ClickUpWebhookHandlerService {
  private readonly logger = new Logger(ClickUpWebhookHandlerService.name);

  constructor(
    private readonly clickUpService: ClickUpService,
    private readonly grocyService: GrocyService,
  ) {}

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
          item.custom_field?.name?.toLowerCase() === GROCY_ID_FIELD_NAME &&
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
        (field) => field.name.toLowerCase() === GROCY_ID_FIELD_NAME,
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
        (field) => field.name.toLowerCase() === GROCY_ID_FIELD_NAME,
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
}
