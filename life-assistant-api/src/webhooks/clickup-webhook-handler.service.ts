import { Injectable, Logger } from '@nestjs/common';
import { ClickUpService } from '@clickup/clickup.service';
import { GrocyService } from '@grocy/grocy.service';
import { getTodayString } from '@utils/date';

const GROCY_RECIPE_ID_FIELD_NAME = 'grocy recipe id';
const GROCY_PRODUCT_ID_FIELD_NAME = 'grocy product id';

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
   * - Task completed with "Grocy ID" custom field: Consumes recipe and marks meal as done
   * - Task completed with "Grocy Product ID" custom field: Consumes product from stock
   */
  async handleClickUpWebhook(payload: any): Promise<void> {
    this.logger.log('Received ClickUp webhook event');
    this.logger.debug(
      'Full webhook payload:',
      JSON.stringify(payload, null, 2),
    );

    const { event, task_id, history_items } = payload;
    this.logger.log(`Event: ${event} for task ${task_id}`);

    // Handle task completion - consume recipe
    if (event === 'taskStatusUpdated' && task_id) {
      await this.handleTaskStatusUpdate(task_id, history_items);
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

    this.logger.log(`Task ${taskId} was completed, checking for Grocy fields...`);

    try {
      // Fetch full task details to get custom fields and name
      const task = await this.clickUpService.getTask(taskId);

      // Check for Grocy Product ID (direct product consumption)
      await this.handleProductConsumption(task);

      // Then check for Grocy ID (recipe consumption)
      const grocyIdField = task.custom_fields?.find(
        (field) => field.name.toLowerCase() === GROCY_RECIPE_ID_FIELD_NAME,
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
   * Handle product consumption when task has "Grocy Product ID" custom field
   */
  private async handleProductConsumption(task: any): Promise<void> {
    const productIdField = task.custom_fields?.find(
      (field: any) => field.name.toLowerCase() === GROCY_PRODUCT_ID_FIELD_NAME,
    );

    if (!productIdField?.value) {
      this.logger.debug(
        `Task ${task.id} has no Grocy Product ID field set - skipping product consumption`,
      );
      return;
    }

    const grocyProductId = parseInt(productIdField.value, 10);
    if (isNaN(grocyProductId)) {
      this.logger.warn(
        `Task ${task.id} has invalid Grocy Product ID value: ${productIdField.value}`,
      );
      return;
    }

    this.logger.log(
      `Task "${task.name}" completed with Grocy Product ID ${grocyProductId} - consuming product`,
    );

    try {
      await this.grocyService.consumeProduct(grocyProductId);
      this.logger.log(
        `✅ Consumed 1 of product ${grocyProductId} from Grocy stock`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to consume product ${grocyProductId}: ${error.message}`,
      );
    }
  }

  /**
   * Consume a meal: deduct from stock and mark today's meal plan entry as done.
   * Skips consumption if all matching meals for today are already done (prevents double-consume).
   */
  private async consumeMeal(recipeId: number, taskName: string): Promise<void> {
    const today = getTodayString();

    try {
      // 1. Check if there's an unmarked meal plan entry for this recipe today
      const todayMeals = await this.grocyService.getMealPlanForDate(today);
      const mealPlanItem = todayMeals.find(
        (meal) => meal.recipe_id === recipeId && !meal.done,
      );

      if (!mealPlanItem) {
        this.logger.log(
          `All meal plan entries for recipe ${recipeId} on ${today} are already done - skipping consume to prevent double-deduction`,
        );
        return;
      }

      // 2. Consume the recipe (deduct from stock)
      this.logger.log(`Consuming recipe ${recipeId}`);
      await this.grocyService.consumeRecipe(recipeId);
      this.logger.log(`Recipe ${recipeId} consumed`);

      // 3. Mark the meal plan entry as done
      this.logger.log(`Marking meal plan item ${mealPlanItem.id} as done`);
      await this.grocyService.updateMealPlanItemDone(mealPlanItem.id, true);

      this.logger.log(`✅ Consumed "${taskName}" (recipe ${recipeId})`);
    } catch (error) {
      this.logger.error(
        `Failed to consume recipe ${recipeId}: ${error.message}`,
      );
      throw error;
    }
  }
}
