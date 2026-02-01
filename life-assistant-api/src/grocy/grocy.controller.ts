import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Res,
  UseGuards,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { GrocyService } from './grocy.service';
import { MealPrepService } from '../meal-prep/meal-prep.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { getTodayString } from '../utils/date.utils';
import {
  GenerateShoppingListRequest,
  EnrichedShoppingListItem,
  ShoppingList,
  SmartGenerateShoppingListResponse,
  AddItemsToShoppingListRequest,
  CreateMealPlanItemDto,
  RecipeSelectionItem,
  ConsumeRecipeRequest,
  MealPlanItem,
} from './grocy.types';
import { RecipePrepConfig } from '../database/entities/recipe-prep-config.entity';

@Controller('grocy')
export class GrocyController {
  private readonly logger = new Logger(GrocyController.name);

  constructor(
    private readonly grocyService: GrocyService,
    private readonly mealPrepService: MealPrepService,
  ) {}

  /**
   * Get today's meal plan
   * GET /grocy/meal-plan/today
   */
  @UseGuards(JwtAuthGuard)
  @Get('meal-plan/today')
  async getTodaysMealPlan() {
    const today = getTodayString();
    const [mealPlan, sections] = await Promise.all([
      this.grocyService.getMealPlanForDate(today),
      this.grocyService.getMealPlanSections(),
    ]);

    // Build section lookup map
    const sectionMap = new Map(sections.map((s) => [s.id, s.name]));

    // Enrich with recipe details and section names
    const enrichedMealPlan = await Promise.all(
      mealPlan.map(async (meal: any) => {
        const section_name = sectionMap.get(meal.section_id) || null;
        if (meal.recipe_id) {
          const recipe = await this.grocyService.getRecipe(meal.recipe_id);
          if (recipe.picture_file_name) {
            recipe.picture_url = `/grocy/recipes/${meal.recipe_id}/picture`;
          }
          return { ...meal, recipe, section_name };
        }
        return { ...meal, section_name };
      }),
    );

    return {
      date: today,
      meals: enrichedMealPlan,
    };
  }

  /**
   * Get meal plan for a specific date
   * GET /grocy/meal-plan/date/:date
   */
  @UseGuards(JwtAuthGuard)
  @Get('meal-plan/date/:date')
  async getMealPlanByDate(@Param('date') date: string) {
    const [mealPlan, sections] = await Promise.all([
      this.grocyService.getMealPlanForDate(date),
      this.grocyService.getMealPlanSections(),
    ]);

    // Build section lookup map
    const sectionMap = new Map(sections.map((s) => [s.id, s.name]));

    const enrichedMealPlan = await Promise.all(
      mealPlan.map(async (meal: any) => {
        const section_name = sectionMap.get(meal.section_id) || null;
        if (meal.recipe_id) {
          const recipe = await this.grocyService.getRecipe(meal.recipe_id);
          if (recipe.picture_file_name) {
            recipe.picture_url = `/grocy/recipes/${meal.recipe_id}/picture`;
          }
          return { ...meal, recipe, section_name };
        }
        return { ...meal, section_name };
      }),
    );

    return {
      date,
      meals: enrichedMealPlan,
    };
  }

  /**
   * Get meal plan for a date range
   * GET /grocy/meal-plan/range/:startDate/:endDate
   */
  @UseGuards(JwtAuthGuard)
  @Get('meal-plan/range/:startDate/:endDate')
  async getMealPlanByDateRange(
    @Param('startDate') startDate: string,
    @Param('endDate') endDate: string,
  ) {
    const [mealPlan, sections] = await Promise.all([
      this.grocyService.getMealPlanForDateRange(startDate, endDate),
      this.grocyService.getMealPlanSections(),
    ]);

    // Build section lookup map
    const sectionMap = new Map(sections.map((s) => [s.id, s.name]));

    const enrichedMealPlan = await Promise.all(
      mealPlan.map(async (meal: any) => {
        const section_name = sectionMap.get(meal.section_id) || null;
        if (meal.recipe_id) {
          const recipe = await this.grocyService.getRecipe(meal.recipe_id);
          if (recipe.picture_file_name) {
            recipe.picture_url = `/grocy/recipes/${meal.recipe_id}/picture`;
          }
          return { ...meal, recipe, section_name };
        }
        return { ...meal, section_name };
      }),
    );

    return {
      startDate,
      endDate,
      meals: enrichedMealPlan,
    };
  }

  /**
   * Create a new meal plan item with optional ClickUp tasks
   * POST /grocy/meal-plan
   */
  @UseGuards(JwtAuthGuard)
  @Post('meal-plan')
  async createMealPlanItem(@Body() body: CreateMealPlanItemDto): Promise<{
    mealPlanItem: MealPlanItem;
    clickUpTasks: string[];
  }> {
    this.logger.log(
      `Creating meal plan item for ${body.day} (createClickUpTasks: ${body.createClickUpTasks ?? true})`,
    );

    const createClickUpTasks = body.createClickUpTasks ?? true;
    const recipeName = body.recipeName || `Recipe ${body.recipe_id}`;

    return this.mealPrepService.createMealWithTasks(
      body,
      createClickUpTasks,
      recipeName,
    );
  }

  /**
   * Delete a meal plan item and associated ClickUp tasks
   * DELETE /grocy/meal-plan/:id
   */
  @UseGuards(JwtAuthGuard)
  @Delete('meal-plan/:id')
  async deleteMealPlanItem(@Param('id') id: string): Promise<{
    grocyDeleted: boolean;
    clickUpTasksDeleted: number;
    clickUpTasksSkipped: number;
  }> {
    this.logger.log(
      `Deleting meal plan item ${id} with associated ClickUp tasks`,
    );
    return this.mealPrepService.deleteMealWithTasks(parseInt(id, 10));
  }

  /**
   * Update meal plan item done status
   * PATCH /grocy/meal-plan/:id/done
   */
  @UseGuards(JwtAuthGuard)
  @Patch('meal-plan/:id/done')
  async updateMealPlanItemDone(
    @Param('id') id: string,
    @Body() body: { done: boolean },
  ): Promise<{ success: boolean }> {
    this.logger.log(`Updating meal plan item ${id} done status`);
    await this.grocyService.updateMealPlanItemDone(parseInt(id, 10), body.done);
    return { success: true };
  }

  /**
   * Consume a recipe (deduct ingredients from stock)
   * POST /grocy/recipes/:recipeId/consume
   */
  @UseGuards(JwtAuthGuard)
  @Post('recipes/:recipeId/consume')
  async consumeRecipe(
    @Param('recipeId') recipeId: string,
    @Body() body: ConsumeRecipeRequest,
  ): Promise<{ success: boolean }> {
    this.logger.log(`Consuming recipe ${recipeId}`);
    await this.grocyService.consumeRecipe(
      parseInt(recipeId, 10),
      body.servings,
    );
    return { success: true };
  }

  /**
   * Get prep config for a recipe
   * GET /grocy/recipes/:recipeId/prep-config
   */
  @UseGuards(JwtAuthGuard)
  @Get('recipes/:recipeId/prep-config')
  async getRecipePrepConfig(
    @Param('recipeId') recipeId: string,
  ): Promise<RecipePrepConfig | null> {
    return this.mealPrepService.getPrepConfig(parseInt(recipeId, 10));
  }

  /**
   * Save/update prep config for a recipe
   * PUT /grocy/recipes/:recipeId/prep-config
   */
  @UseGuards(JwtAuthGuard)
  @Put('recipes/:recipeId/prep-config')
  async saveRecipePrepConfig(
    @Param('recipeId') recipeId: string,
    @Body()
    body: {
      requires_defrost?: boolean;
      defrost_item?: string;
    },
  ): Promise<RecipePrepConfig> {
    this.logger.log(`Saving prep config for recipe ${recipeId}`);
    return this.mealPrepService.savePrepConfig(parseInt(recipeId, 10), body);
  }

  /**
   * Get all prep configs
   * GET /grocy/prep-configs
   */
  @UseGuards(JwtAuthGuard)
  @Get('prep-configs')
  async getAllPrepConfigs(): Promise<RecipePrepConfig[]> {
    return this.mealPrepService.getAllPrepConfigs();
  }

  /**
   * Get recipes for selection dropdown
   * GET /grocy/recipes/selection
   */
  @UseGuards(JwtAuthGuard)
  @Get('recipes/selection')
  async getRecipesForSelection(): Promise<RecipeSelectionItem[]> {
    return this.grocyService.getRecipesForSelection();
  }

  /**
   * Get meal plan sections
   * GET /grocy/meal-plan/sections
   */
  @UseGuards(JwtAuthGuard)
  @Get('meal-plan/sections')
  async getMealPlanSections() {
    return this.grocyService.getMealPlanSections();
  }

  /**
   * Get current shopping list
   * GET /grocy/shopping-list
   */
  @UseGuards(JwtAuthGuard)
  @Get('shopping-list')
  async getShoppingList(): Promise<{
    lists: ShoppingList[];
    items: EnrichedShoppingListItem[];
  }> {
    const [lists, items] = await Promise.all([
      this.grocyService.getShoppingLists(),
      this.grocyService.getEnrichedShoppingListItems(),
    ]);

    return { lists, items };
  }

  /**
   * Update shopping list item done status
   * PATCH /grocy/shopping-list/items/:itemId
   */
  @UseGuards(JwtAuthGuard)
  @Patch('shopping-list/items/:itemId')
  async updateShoppingListItem(
    @Param('itemId') itemId: string,
    @Body() body: { done: boolean },
  ): Promise<{ success: boolean }> {
    await this.grocyService.updateShoppingListItemDone(
      parseInt(itemId, 10),
      body.done,
    );
    return { success: true };
  }

  /**
   * Generate smart shopping list from meal plan for a date range
   * Recursively resolves homemade products to base purchasable ingredients
   * POST /grocy/shopping-list/generate
   */
  @UseGuards(JwtAuthGuard)
  @Post('shopping-list/generate')
  async generateShoppingList(
    @Body() body: GenerateShoppingListRequest,
  ): Promise<SmartGenerateShoppingListResponse> {
    const { startDate, endDate } = body;
    this.logger.log(
      `Generating smart shopping list for meal plan: ${startDate} to ${endDate}`,
    );

    return this.grocyService.generateSmartShoppingList(startDate, endDate);
  }

  /**
   * Add calculated items to Grocy's shopping list
   * POST /grocy/shopping-list/add-items
   */
  @UseGuards(JwtAuthGuard)
  @Post('shopping-list/add-items')
  async addItemsToShoppingList(
    @Body() body: AddItemsToShoppingListRequest,
  ): Promise<{ added: number; failed: number }> {
    this.logger.log(`Adding ${body.items.length} items to Grocy shopping list`);
    return this.grocyService.addItemsToShoppingList(body.items);
  }

  /**
   * Add products below their minimum stock amount to the shopping list
   * POST /grocy/shopping-list/add-missing-products
   */
  @UseGuards(JwtAuthGuard)
  @Post('shopping-list/add-missing-products')
  async addMissingProductsToShoppingList(
    @Body() body: { listId?: number },
  ): Promise<{ success: boolean }> {
    this.logger.log('Adding products below min stock to shopping list');
    await this.grocyService.addMissingProductsToShoppingList(body.listId);
    return { success: true };
  }

  /**
   * Test endpoint - get system info
   */
  @Get('test/info')
  async getSystemInfo() {
    return this.grocyService.getSystemInfo();
  }

  /**
   * Test endpoint - get all products
   */
  @Get('test/products')
  async getProducts() {
    return this.grocyService.getProducts();
  }

  /**
   * Test endpoint - get current stock
   */
  @Get('test/stock')
  async getStock() {
    return this.grocyService.getStock();
  }

  /**
   * Test endpoint - get stock for a specific product
   */
  @Get('test/stock/:productId')
  async getProductStock(@Param('productId') productId: string) {
    return this.grocyService.getProductStock(parseInt(productId, 10));
  }

  /**
   * Test endpoint - get meal plan
   */
  @Get('test/meal-plan')
  async getMealPlan() {
    return this.grocyService.getMealPlan();
  }

  /**
   * Test endpoint - get meal plan for a specific date
   */
  @Get('test/meal-plan/:date')
  async getMealPlanForDate(@Param('date') date: string) {
    return this.grocyService.getMealPlanForDate(date);
  }

  /**
   * Test endpoint - get all recipes
   */
  @Get('test/recipes')
  async getRecipes() {
    return this.grocyService.getRecipes();
  }

  /**
   * Test endpoint - get a specific recipe
   */
  @Get('test/recipes/:recipeId')
  async getRecipe(@Param('recipeId') recipeId: string) {
    return this.grocyService.getRecipe(parseInt(recipeId, 10));
  }

  /**
   * Test endpoint - get recipe ingredients
   */
  @Get('test/recipes/:recipeId/ingredients')
  async getRecipeIngredients(@Param('recipeId') recipeId: string) {
    const ingredients = await this.grocyService.getRecipeIngredients();
    const recipeIdNum = parseInt(recipeId, 10);
    return ingredients.filter((i) => i.recipe_id === recipeIdNum);
  }

  /**
   * Test endpoint - list all homemade products (products produced by recipes)
   */
  @Get('test/homemade-products')
  async getHomemadeProducts() {
    return this.grocyService.getHomemadeProducts();
  }

  /**
   * Test endpoint - generate smart shopping list for a date range
   */
  @Get('test/shopping-list/:startDate/:endDate')
  async testGenerateShoppingList(
    @Param('startDate') startDate: string,
    @Param('endDate') endDate: string,
  ) {
    return this.grocyService.generateSmartShoppingList(startDate, endDate);
  }

  /**
   * Test endpoint - get all recipe nestings (included recipes)
   */
  @Get('test/recipe-nestings')
  async getRecipeNestings() {
    return this.grocyService.getRecipeNestings();
  }

  /**
   * Test endpoint - get all chores
   */
  @Get('test/chores')
  async getChores() {
    return this.grocyService.getChores();
  }

  /**
   * Test endpoint - get all tasks
   */
  @Get('test/tasks')
  async getTasks() {
    return this.grocyService.getTasks();
  }

  /**
   * Proxy endpoint for recipe pictures
   * GET /grocy/recipes/:recipeId/picture
   */
  @UseGuards(JwtAuthGuard)
  @Get('recipes/:recipeId/picture')
  async getRecipePicture(
    @Param('recipeId') recipeId: string,
    @Res() res: Response,
  ) {
    try {
      const recipe = await this.grocyService.getRecipe(parseInt(recipeId, 10));

      if (!recipe.picture_file_name) {
        res.status(404).send('No picture available');
        return;
      }

      const { data, contentType } = await this.grocyService.getRecipePicture(
        recipe.picture_file_name,
      );

      res.set('Content-Type', contentType);
      res.set('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
      res.send(data);
    } catch {
      // Picture not found or Grocy error - return 404
      res.status(404).send('Picture not available');
    }
  }
}
