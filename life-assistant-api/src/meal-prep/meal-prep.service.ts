import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { RecipePrepConfig } from '@database/entities/recipe-prep-config.entity';
import { MealPlanTaskMapping } from '@database/entities/meal-plan-task-mapping.entity';
import { ClickUpService } from '@clickup/clickup.service';
import { GrocyService } from '@grocy/grocy.service';
import { CreateMealPlanItemDto, MealPlanItem } from '@grocy/grocy.types';

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

  // Cached custom field info (fetched lazily)
  private timeOfDayFieldId: string | null = null;
  private timeOfDayOptions: Map<string, string> = new Map(); // name -> id
  private grocyRecipeIdFieldId: string | null = null;
  private customFieldsFetched = false;

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

    if (!this.mealsListId) {
      this.logger.warn(
        'CLICKUP_MEALS_LIST_ID not configured - ClickUp task creation will be disabled',
      );
    }
  }

  /**
   * Lazily fetch and cache custom field info for the meals list
   */
  private async ensureCustomFieldsCached(): Promise<void> {
    if (this.customFieldsFetched || !this.mealsListId) {
      return;
    }

    try {
      const fields = await this.clickUpService.getListCustomFields(
        this.mealsListId,
      );

      // Find "Time of Day" field by name
      const timeOfDayField = fields.find(
        (f: any) => f.name.toLowerCase() === 'time of day',
      );

      if (timeOfDayField) {
        this.timeOfDayFieldId = timeOfDayField.id;

        // Cache all options by lowercase name
        const options = timeOfDayField.type_config?.options || [];
        for (const option of options) {
          this.timeOfDayOptions.set(option.name.toLowerCase(), option.id);
        }

        this.logger.log(
          `Found Time of Day field (${this.timeOfDayFieldId}) with ${this.timeOfDayOptions.size} options`,
        );
      } else {
        this.logger.warn('No "Time of Day" custom field found on Meals list');
      }

      // Find "Grocy Recipe ID" field by name
      const grocyRecipeIdField = fields.find(
        (f: any) => f.name.toLowerCase() === 'grocy recipe id',
      );

      if (grocyRecipeIdField) {
        this.grocyRecipeIdFieldId = grocyRecipeIdField.id;
        this.logger.log(
          `Found Grocy Recipe ID field (${this.grocyRecipeIdFieldId})`,
        );
      } else {
        this.logger.warn(
          'No "Grocy Recipe ID" custom field found on Meals list',
        );
      }
    } catch (error) {
      this.logger.error(`Failed to fetch custom fields: ${error.message}`);
    }

    this.customFieldsFetched = true;
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

      // Build tags for main task
      const mainTags = ['meal prep', 'meal'];
      if (mealData.sectionName) {
        // Add section name as tag (lowercase to match existing tags)
        mainTags.push(mealData.sectionName.toLowerCase());
      }

      // Ensure custom fields are cached for Time of Day
      await this.ensureCustomFieldsCached();

      // Map section to Time of Day value
      const sectionToTimeOfDay: Record<string, string> = {
        breakfast: 'morning',
        lunch: 'mid day',
        dinner: 'evening',
      };

      // Build main task data
      const mainTaskData: {
        name: string;
        tags: string[];
        due_date: number;
        custom_fields?: Array<{ id: string; value: any }>;
      } = {
        name: recipeName,
        tags: mainTags,
        due_date: mealDueDate,
      };

      // Build custom fields array
      const customFields: Array<{ id: string; value: any }> = [];

      // Add Grocy Recipe ID custom field
      if (this.grocyRecipeIdFieldId) {
        customFields.push({
          id: this.grocyRecipeIdFieldId,
          value: mealData.recipe_id.toString(),
        });
      }

      // Add Time of Day custom field based on section
      if (this.timeOfDayFieldId && mealData.sectionName) {
        const timeOfDayName =
          sectionToTimeOfDay[mealData.sectionName.toLowerCase()];
        const timeOfDayOptionId = timeOfDayName
          ? this.timeOfDayOptions.get(timeOfDayName)
          : null;

        if (timeOfDayOptionId) {
          customFields.push({
            id: this.timeOfDayFieldId,
            value: timeOfDayOptionId,
          });
        }
      }

      // Set custom fields if any
      if (customFields.length > 0) {
        mainTaskData.custom_fields = customFields;
      }

      // Create main task
      const mainTask = await this.clickUpService.createTask(
        this.mealsListId,
        mainTaskData,
      );
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
          tags: ['meal prep'],
          due_date: mealDueDate,
        };

        // Add Time of Day custom field (Early Morning for defrost tasks)
        const earlyMorningId = this.timeOfDayOptions.get('early morning');
        if (this.timeOfDayFieldId && earlyMorningId) {
          defrostTaskData.custom_fields = [
            { id: this.timeOfDayFieldId, value: earlyMorningId },
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

  /**
   * Update a meal plan item with optional ClickUp task updates
   */
  async updateMealWithTasks(
    mealPlanItemId: number,
    updates: {
      section_id?: number;
      sectionName?: string;
      servings?: number;
      day?: string;
    },
    oldSectionName?: string,
  ): Promise<void> {
    // 1. Update meal in Grocy
    const grocyUpdates: {
      section_id?: number;
      recipe_servings?: number;
      day?: string;
    } = {};
    if (updates.section_id !== undefined) {
      grocyUpdates.section_id = updates.section_id;
    }
    if (updates.servings !== undefined) {
      grocyUpdates.recipe_servings = updates.servings;
    }
    if (updates.day !== undefined) {
      grocyUpdates.day = updates.day;
    }

    if (Object.keys(grocyUpdates).length > 0) {
      await this.grocyService.updateMealPlanItem(mealPlanItemId, grocyUpdates);
    }

    // 2. Update ClickUp tasks if needed
    const sectionChanged =
      updates.sectionName &&
      oldSectionName &&
      updates.sectionName !== oldSectionName;
    const dayChanged = updates.day !== undefined;

    if (sectionChanged || dayChanged) {
      const mappings = await this.taskMappingRepo.find({
        where: { meal_plan_item_id: mealPlanItemId },
      });

      for (const mapping of mappings) {
        try {
          // Update section tags on main tasks only
          if (sectionChanged && mapping.task_type === 'main') {
            await this.clickUpService.removeTag(
              mapping.clickup_task_id,
              oldSectionName.toLowerCase(),
            );
            await this.clickUpService.addTag(
              mapping.clickup_task_id,
              updates.sectionName.toLowerCase(),
            );
            await this.updateTimeOfDayField(
              mapping.clickup_task_id,
              updates.sectionName,
            );
          }

          // Update due date on all associated tasks (main + defrost)
          if (dayChanged) {
            const newDueDate = new Date(updates.day + 'T12:00:00').getTime();
            await this.clickUpService.updateTask(mapping.clickup_task_id, {
              due_date: newDueDate,
            });
          }
        } catch (error) {
          this.logger.warn(
            `Failed to update ClickUp task ${mapping.clickup_task_id}: ${error.message}`,
          );
        }
      }
    }
  }

  /**
   * Complete the ClickUp task associated with a meal plan item.
   * Finds the 'main' task mapping and marks it as complete in ClickUp.
   */
  async completeClickUpTaskForMeal(mealPlanItemId: number): Promise<void> {
    const mapping = await this.taskMappingRepo.findOne({
      where: { meal_plan_item_id: mealPlanItemId, task_type: 'main' },
    });

    if (!mapping) {
      this.logger.debug(
        `No ClickUp task mapping found for meal plan item ${mealPlanItemId}`,
      );
      return;
    }

    try {
      await this.clickUpService.updateTask(mapping.clickup_task_id, {
        status: 'complete',
      });
      this.logger.log(
        `Completed ClickUp task ${mapping.clickup_task_id} for meal plan item ${mealPlanItemId}`,
      );
    } catch (error) {
      this.logger.warn(
        `Failed to complete ClickUp task ${mapping.clickup_task_id}: ${error.message}`,
      );
    }
  }

  /**
   * Update the Time of Day custom field on a ClickUp task
   */
  private async updateTimeOfDayField(
    taskId: string,
    sectionName: string,
  ): Promise<void> {
    await this.ensureCustomFieldsCached();

    if (!this.timeOfDayFieldId) return;

    const sectionToTimeOfDay: Record<string, string> = {
      breakfast: 'morning',
      lunch: 'mid day',
      dinner: 'evening',
    };

    const timeOfDayName = sectionToTimeOfDay[sectionName.toLowerCase()];
    const timeOfDayOptionId = timeOfDayName
      ? this.timeOfDayOptions.get(timeOfDayName)
      : null;

    if (timeOfDayOptionId) {
      await this.clickUpService.setCustomField(
        taskId,
        this.timeOfDayFieldId,
        timeOfDayOptionId,
      );
    }
  }
}
