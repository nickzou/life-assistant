import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Res,
  UseGuards,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { GrocyService } from './grocy.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { getTodayString } from '../utils/date.utils';
import {
  GenerateShoppingListRequest,
  EnrichedShoppingListItem,
  ShoppingList,
  SmartGenerateShoppingListResponse,
  AddItemsToShoppingListRequest,
} from './grocy.types';

@Controller('grocy')
export class GrocyController {
  private readonly logger = new Logger(GrocyController.name);

  constructor(private readonly grocyService: GrocyService) {}

  /**
   * Get today's meal plan
   * GET /grocy/meal-plan/today
   */
  @UseGuards(JwtAuthGuard)
  @Get('meal-plan/today')
  async getTodaysMealPlan() {
    const today = getTodayString();
    const mealPlan = await this.grocyService.getMealPlanForDate(today);

    // Enrich with recipe details
    const enrichedMealPlan = await Promise.all(
      mealPlan.map(async (meal: any) => {
        if (meal.recipe_id) {
          const recipe = await this.grocyService.getRecipe(meal.recipe_id);
          if (recipe.picture_file_name) {
            recipe.picture_url = `/grocy/recipes/${meal.recipe_id}/picture`;
          }
          return { ...meal, recipe };
        }
        return meal;
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
    const mealPlan = await this.grocyService.getMealPlanForDate(date);

    const enrichedMealPlan = await Promise.all(
      mealPlan.map(async (meal: any) => {
        if (meal.recipe_id) {
          const recipe = await this.grocyService.getRecipe(meal.recipe_id);
          if (recipe.picture_file_name) {
            recipe.picture_url = `/grocy/recipes/${meal.recipe_id}/picture`;
          }
          return { ...meal, recipe };
        }
        return meal;
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
    const mealPlan = await this.grocyService.getMealPlanForDateRange(
      startDate,
      endDate,
    );

    const enrichedMealPlan = await Promise.all(
      mealPlan.map(async (meal: any) => {
        if (meal.recipe_id) {
          const recipe = await this.grocyService.getRecipe(meal.recipe_id);
          if (recipe.picture_file_name) {
            recipe.picture_url = `/grocy/recipes/${meal.recipe_id}/picture`;
          }
          return { ...meal, recipe };
        }
        return meal;
      }),
    );

    return {
      startDate,
      endDate,
      meals: enrichedMealPlan,
    };
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
