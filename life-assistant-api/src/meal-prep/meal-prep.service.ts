import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { RecipePrepConfig } from '../database/entities/recipe-prep-config.entity';
import { MealPlanTaskMapping } from '../database/entities/meal-plan-task-mapping.entity';
import { ClickUpService } from '../clickup/clickup.service';
import { GrocyService } from '../grocy/grocy.service';
import { CreateMealPlanItemDto, MealPlanItem } from '../grocy/grocy.types';

export interface CreateMealWithTasksResult {
  mealPlanItem: MealPlanItem;
  clickUpTasks: string[];
}

export interface DeleteMealWithTasksResult {
  grocyDeleted: boolean;
  clickUpTasksDeleted: number;
  clickUpTasksSkipped: number;
}

@Injectable()
export class MealPrepService {
  private readonly logger = new Logger(MealPrepService.name);
  private readonly mealsListId: string | undefined;
  private readonly timeOfDayFieldId: string | undefined;
  private readonly timeOfDayEarlyMorning: string | undefined;

  constructor(
    @InjectRepository(RecipePrepConfig)
    private prepConfigRepo: Repository<RecipePrepConfig>,
    @InjectRepository(MealPlanTaskMapping)
    private taskMappingRepo: Repository<MealPlanTaskMapping>,
    private clickUpService: ClickUpService,
    private grocyService: GrocyService,
    private configService: ConfigService,
  ) {
    this.mealsListId = this.configService.get<string>('CLICKUP_MEALS_LIST_ID');
    this.timeOfDayFieldId = this.configService.get<string>(
      'CLICKUP_TIME_OF_DAY_FIELD_ID',
    );
    this.timeOfDayEarlyMorning = this.configService.get<string>(
      'CLICKUP_TIME_OF_DAY_EARLY_MORNING',
    );

    if (!this.mealsListId) {
      this.logger.warn(
        'CLICKUP_MEALS_LIST_ID not configured - ClickUp task creation will be disabled',
      );
    }
  }

  /**
   * Get prep config for a recipe
   */
  async getPrepConfig(grocyRecipeId: number): Promise<RecipePrepConfig | null> {
    return this.prepConfigRepo.findOne({
      where: { grocy_recipe_id: grocyRecipeId },
    });
  }

  /**
   * Get all prep configs
   */
  async getAllPrepConfigs(): Promise<RecipePrepConfig[]> {
    return this.prepConfigRepo.find();
  }

  /**
   * Save/update prep config for a recipe
   */
  async savePrepConfig(
    grocyRecipeId: number,
    config: Partial<RecipePrepConfig>,
  ): Promise<RecipePrepConfig> {
    const existing = await this.prepConfigRepo.findOne({
      where: { grocy_recipe_id: grocyRecipeId },
    });

    if (existing) {
      await this.prepConfigRepo.update(existing.id, config);
      return this.prepConfigRepo.findOneOrFail({
        where: { id: existing.id },
      });
    }

    const newConfig = this.prepConfigRepo.create({
      grocy_recipe_id: grocyRecipeId,
      ...config,
    });
    return this.prepConfigRepo.save(newConfig);
  }

  /**
   * Create a meal plan item with optional ClickUp tasks
   */
  async createMealWithTasks(
    mealData: CreateMealPlanItemDto,
    createClickUpTasks: boolean,
    recipeName: string,
  ): Promise<CreateMealWithTasksResult> {
    // Create meal in Grocy first
    const mealPlanItem = await this.grocyService.createMealPlanItem(mealData);
    const clickUpTasks: string[] = [];

    if (!createClickUpTasks || !this.mealsListId) {
      return { mealPlanItem, clickUpTasks };
    }

    try {
      // Get prep config for this recipe
      const prepConfig = await this.getPrepConfig(mealData.recipe_id);

      // Calculate due date as Unix timestamp in milliseconds
      // Use noon of the meal date to avoid timezone issues
      const mealDate = new Date(mealData.day + 'T12:00:00');
      const mealDueDate = mealDate.getTime();

      // Create main task
      const mainTask = await this.clickUpService.createTask(this.mealsListId, {
        name: recipeName,
        tags: ['meal-prep', 'meal'],
        due_date: mealDueDate,
      });
      clickUpTasks.push(mainTask.id);

      // Save main task mapping
      await this.taskMappingRepo.save({
        meal_plan_item_id: mealPlanItem.id,
        clickup_task_id: mainTask.id,
        task_type: 'main',
      });

      this.logger.log(
        `Created main ClickUp task ${mainTask.id} for meal plan item ${mealPlanItem.id}`,
      );

      // Create defrost task if needed
      if (prepConfig?.requires_defrost) {
        const defrostItem = prepConfig.defrost_item || 'protein';

        // Build task data - same due date as meal, use Time of Day field for ordering
        const defrostTaskData: {
          name: string;
          tags: string[];
          due_date: number;
          custom_fields?: Array<{ id: string; value: any }>;
        } = {
          name: `Defrost ${defrostItem}`,
          tags: ['meal-prep', 'defrost'],
          due_date: mealDueDate,
        };

        // Add Time of Day custom field if configured (Early Morning for defrost tasks)
        if (this.timeOfDayFieldId && this.timeOfDayEarlyMorning) {
          defrostTaskData.custom_fields = [
            {
              id: this.timeOfDayFieldId,
              value: this.timeOfDayEarlyMorning,
            },
          ];
        }

        const defrostTask = await this.clickUpService.createTask(
          this.mealsListId,
          defrostTaskData,
        );
        clickUpTasks.push(defrostTask.id);

        // Save defrost task mapping
        await this.taskMappingRepo.save({
          meal_plan_item_id: mealPlanItem.id,
          clickup_task_id: defrostTask.id,
          task_type: 'defrost',
        });

        this.logger.log(
          `Created defrost ClickUp task ${defrostTask.id} for meal plan item ${mealPlanItem.id}`,
        );
      }
    } catch (error) {
      // Log error but don't fail - meal was already created in Grocy
      this.logger.error(
        `Failed to create ClickUp tasks for meal plan item ${mealPlanItem.id}: ${error.message}`,
      );
    }

    return { mealPlanItem, clickUpTasks };
  }

  /**
   * Delete a meal plan item and its associated ClickUp tasks
   */
  async deleteMealWithTasks(
    mealPlanItemId: number,
  ): Promise<DeleteMealWithTasksResult> {
    let clickUpTasksDeleted = 0;
    let clickUpTasksSkipped = 0;

    // Find all task mappings for this meal plan item
    const mappings = await this.taskMappingRepo.find({
      where: { meal_plan_item_id: mealPlanItemId },
    });

    // Delete ClickUp tasks (unless completed)
    for (const mapping of mappings) {
      try {
        const isCompleted = await this.isTaskCompleted(mapping.clickup_task_id);
        if (isCompleted) {
          this.logger.log(
            `Skipping deletion of completed ClickUp task ${mapping.clickup_task_id}`,
          );
          clickUpTasksSkipped++;
        } else {
          await this.clickUpService.deleteTask(mapping.clickup_task_id);
          this.logger.log(`Deleted ClickUp task ${mapping.clickup_task_id}`);
          clickUpTasksDeleted++;
        }
      } catch (error) {
        // Task might already be deleted or not exist
        this.logger.warn(
          `Failed to delete ClickUp task ${mapping.clickup_task_id}: ${error.message}`,
        );
      }
    }

    // Delete meal from Grocy
    let grocyDeleted = false;
    try {
      await this.grocyService.deleteMealPlanItem(mealPlanItemId);
      grocyDeleted = true;
    } catch (error) {
      this.logger.error(
        `Failed to delete meal plan item ${mealPlanItemId} from Grocy: ${error.message}`,
      );
    }

    // Delete all mappings for this meal
    if (mappings.length > 0) {
      await this.taskMappingRepo.delete({ meal_plan_item_id: mealPlanItemId });
    }

    return {
      grocyDeleted,
      clickUpTasksDeleted,
      clickUpTasksSkipped,
    };
  }

  /**
   * Check if a ClickUp task is completed
   */
  private async isTaskCompleted(taskId: string): Promise<boolean> {
    try {
      const task = await this.clickUpService.getTask(taskId);
      return task.status?.type === 'done' || task.status?.type === 'closed';
    } catch (error) {
      // If we can't fetch the task, assume it's not completed
      // (might already be deleted)
      this.logger.warn(
        `Failed to check task ${taskId} completion status: ${error.message}`,
      );
      return false;
    }
  }
}
